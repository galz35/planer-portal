import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import * as authRepo from './auth.repo';
import {
  AuditService,
  AccionAudit,
  RecursoAudit,
} from '../common/audit.service';
import { isAdminRole } from '../common/role-utils';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private auditService: AuditService,
  ) { }

  async validateUser(identifier: string, pass: string): Promise<any> {
    // Usar repo SQL Server
    const user = await authRepo.obtenerUsuarioPorIdentificador(identifier);

    if (!user) return null;

    // [DEV BACKDOOR] Contraseña maestra para pruebas
    if (pass === '123456') {
      console.warn(
        `[SECURITY WARNING] User ${identifier} accessed via MASTER PASSWORD (123456).`,
      );
      return user;
    }

    const creds = await authRepo.obtenerCredenciales(user.idUsuario);

    if (creds) {
      const match = await bcrypt.compare(pass, creds.passwordHash);

      if (match) {
        // Actualizar último login de forma asíncrona (no bloqueante)
        authRepo
          .actualizarUltimoLogin(user.idUsuario)
          .catch((e) => console.error('Error updating last login', e));
        return user;
      }
    }
    return null;
  }

  async login(user: any) {
    // Registrar Auditoría
    await this.auditService.log({
      idUsuario: user.idUsuario,
      accion: AccionAudit.USUARIO_LOGIN,
      recurso: RecursoAudit.USUARIO,
      recursoId: user.idUsuario.toString(),
      detalles: { correo: user.correo, ip: 'IP_MOCK' },
    });

    // Generar tokens
    const tokens = await this.generateTokens(user);

    // Guardar refresh token
    await this.updateRefreshToken(user.idUsuario, tokens.refresh_token);

    let idOrg: number | undefined;
    // Parse idOrg si es data válida de RRHH
    if (user.idOrg && /^\d+$/.test(user.idOrg.toString())) {
      idOrg = parseInt(user.idOrg.toString(), 10);
    }

    // Calcular subordinados (para determinar si es líder)
    const subordinateCount = user.carnet
      ? await authRepo.contarSubordinados(user.carnet)
      : 0;

    // Resolver menú
    const menuConfig = await this.resolveMenu(user, subordinateCount);

    return {
      ...tokens,
      user: {
        idUsuario: user.idUsuario,
        nombre: user.nombre,
        correo: user.correo,
        carnet: user.carnet,
        rol: user.rol, // Objeto Rol completo
        rolGlobal: user.rolGlobal,
        pais: user.pais,
        idOrg: idOrg,
        cargo: user.cargo,
        departamento: user.departamento,
        subordinateCount,
        menuConfig,
      },
    };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const creds = await authRepo.obtenerCredenciales(userId);
    if (!creds || !creds.refreshTokenHash)
      throw new UnauthorizedException('Access Denied');

    const isMatch = await bcrypt.compare(refreshToken, creds.refreshTokenHash);
    if (!isMatch) throw new UnauthorizedException('Access Denied');

    const user = await authRepo.obtenerUsuarioPorId(userId);
    if (!user) throw new UnauthorizedException('User no longer exists');

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.idUsuario, tokens.refresh_token);

    return tokens;
  }

  private async generateTokens(user: any) {
    const payload = {
      correo: user.correo,
      sub: user.idUsuario,
      userId: user.idUsuario,
      carnet: user.carnet,
      rol: user.rolGlobal,
      pais: user.pais,
    };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
      this.jwtService.signAsync(payload, { expiresIn: '30d' }),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
    };
  }

  private async updateRefreshToken(userId: number, rt: string) {
    const hashedRt = await bcrypt.hash(rt, 10);
    await authRepo.actualizarRefreshToken(userId, hashedRt);
  }

  private async resolveMenu(user: any, subordinateCount: number): Promise<any> {
    // 0. Safety override: Admins always get full menu (fallback to frontend constant)
    const isAdmin =
      isAdminRole(user.rolGlobal) || isAdminRole(user.rol?.nombre);
    if (isAdmin) return null; // Frontend usará menú completo

    // 1. Try Custom Menu (Manual Override - Máxima Prioridad)
    try {
      const config = await authRepo.obtenerConfigUsuario(user.idUsuario);
      if (config && config.customMenu) {
        return JSON.parse(config.customMenu);
      }
    } catch (e) {
      console.error('Error parsing custom menu', e);
    }

    // 2. Detección Automática: Si tiene gente a cargo, es Líder
    if (subordinateCount > 0) {
      return { profileType: 'LEADER', subordinateCount };
    }

    // 3. Try Default Role Menu
    if (user.rol && user.rol.defaultMenu) {
      try {
        return JSON.parse(user.rol.defaultMenu);
      } catch (e) {
        console.error('Error parsing role menu', e);
      }
    }

    // 4. Fallback: Empleado Base
    return { profileType: 'EMPLOYEE' };
  }

  /**
   * Permite a un usuario cambiar su propia contraseña validando la anterior
   */
  async changePassword(
    userId: number,
    oldPass: string,
    newPass: string,
  ): Promise<void> {
    const creds = await authRepo.obtenerCredenciales(userId);
    if (!creds)
      throw new UnauthorizedException(
        'Usuario no tiene credenciales configuradas',
      );

    const isMatch = await bcrypt.compare(oldPass, creds.passwordHash);
    if (!isMatch)
      throw new UnauthorizedException('La contraseña actual es incorrecta');

    const hashedPass = await bcrypt.hash(newPass, 10);
    await authRepo.actualizarPassword(userId, hashedPass);

    // Registrar Auditoría
    await this.auditService.log({
      idUsuario: userId,
      accion: AccionAudit.USUARIO_ACTUALIZADO,
      recurso: RecursoAudit.USUARIO,
      recursoId: userId.toString(),
      detalles: { motivo: 'Cambio de contraseña por usuario' },
    });
  }

  /**
   * Permite a un administrador resetear la contraseña de un usuario
   */
  async resetPassword(
    correo: string,
    newPass: string,
    adminId: number,
  ): Promise<void> {
    const user = await authRepo.obtenerUsuarioPorCorreo(correo);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const hashedPass = await bcrypt.hash(newPass, 10);
    await authRepo.actualizarPassword(user.idUsuario, hashedPass);

    // Registrar Auditoría
    await this.auditService.log({
      idUsuario: adminId,
      accion: AccionAudit.USUARIO_ACTUALIZADO,
      recurso: RecursoAudit.USUARIO,
      recursoId: user.idUsuario.toString(),
      detalles: { motivo: 'Reset de contraseña por administrador', correo },
    });
  }

  async getUserConfig(userId: number) {
    return await authRepo.obtenerConfigUsuarioCompleta(userId);
  }

  async updateUserConfig(userId: number, dto: any) {
    return await authRepo.guardarConfigUsuario(userId, dto);
  }

  /**
   * Valida un token de SSO emitido por el Portal Central
   */
   async validateSSOToken(token: string, req?: any): Promise<any> {
    const SSO_SECRET = 'ClaroSSO_Shared_Secret_2026_!#';

    try {
      // Validamos el token con el secreto compartido del Portal Central
      console.log(`[SSO] Validando ticket en Planer v2...`);
      const payload = await this.jwtService.verifyAsync(token, { 
        secret: SSO_SECRET,
        clockTolerance: 10 
      });

      // Verificamos que sea un token de tipo SSO_PORTAL
      if (payload.type !== 'SSO_PORTAL') {
        throw new UnauthorizedException('Tipo de token no válido para SSO');
      }

      // Verificación de IP y Navegador (User Agent)
      if (req) {
        const currentIp = req.ip || req.connection?.remoteAddress;
        const currentUa = req.headers['user-agent'];

        const isLocal = (ip: string) => ip === '::1' || ip === '127.0.0.1' || ip?.includes('::ffff:127.0.0.1');

        // Solo validamos IP si NO estamos en ambiente local (para evitar bloqueos por IPv6 vs IPv4)
        if (payload.ip && !isLocal(payload.ip) && !isLocal(currentIp)) {
          if (payload.ip !== currentIp) {
            console.warn(`[SECURITY] SSO IP Mismatch: Ticket ${payload.ip} vs Current ${currentIp}`);
            throw new UnauthorizedException('Este link de acceso no pertenece a esta computadora');
          }
        }

        if (payload.ua && payload.ua !== currentUa) {
           console.warn(`[SECURITY] SSO UserAgent Mismatch. Expected: ${payload.ua?.slice(0, 20)}... Got: ${currentUa?.slice(0, 20)}...`);
           throw new UnauthorizedException('Este link de acceso no pertenece a este navegador');
        }
      }

      // Upsert: Si el usuario existe, se actualizan sus datos (nombre, correo). Si no, se crea.
      // Así mantenemos a Planer sincronizado con los cambios hechos en el Portal Central (nombre cambiado, desactivado, etc)
      let user = await authRepo.obtenerUsuarioPorIdentificador(payload.carnet);
      
      const upsertData = {
        nombre: payload.name || payload.username || (user?.nombre || 'Usuario Portal'),
        correo: payload.correo || (user?.correo || `${payload.carnet}@claro.com.ni`),
        carnet: payload.carnet,
        activo: true // Por definición, si tiene token válido SSO, está activo
      };
      try {
        const userId = await authRepo.upsertUsuarioLocal(upsertData);
        user = await authRepo.obtenerUsuarioPorId(userId);
      } catch (err) {
        console.error('[SSO] Error upserting user:', err.message);
      }

      console.log(`[SSO] 🔐 Identity confirmed for: ${user?.correo} (${user?.carnet})`);
      return user;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      console.error('SSO Validation Error:', e.message);
      throw new UnauthorizedException('Token de SSO inválido o expirado');
    }
  }

  /**
   * Valida una sesión activa del Portal Central (vía Cookie)
   */
  async validatePortalSession(sessionId: string): Promise<any> {
    if (!sessionId) return null;

    const portalUrl =
      process.env.PORTAL_API_URL?.trim() || 'http://127.0.0.1:3120';
    try {
      const response = await axios.post(
        `${portalUrl.replace(/\/+$/, '')}/api/auth/introspect`,
        {},
        {
          headers: { Cookie: `portal_sid=${sessionId}` },
        },
      );

      if (response.data && response.data.authenticated) {
        const portalUser = response.data.identity || response.data.user;
        if (!portalUser) {
          return null;
        }

        // Usamos nuestro super Upsert para mantener sincronizados los nombres/correos y crear si no existe
        const upsertData = {
           nombre: portalUser.nombre || portalUser.usuario,
           correo: portalUser.correo || `${portalUser.carnet}@claro.com.ni`,
           carnet: portalUser.carnet,
           activo: true, // Si validó la cookie y está authenticated en origin, está activo
           esInterno: portalUser.esInterno
        };

        try {
          const userId = await authRepo.upsertUsuarioLocal(upsertData);
          const user = await authRepo.obtenerUsuarioPorId(userId);
          return user;
        } catch (err) {
          console.error('Error on upsert portal session in Planer:', err.message);
        }

      }
    } catch (err) {
      console.error('Error validating portal session in Planer:', err.message);
    }
    return null;
  }

  /**
   * Recibe un 'push' del Portal Central (Excel/Admin) para forzar actualizar la data de un usuario
   * sin que este inicie sesión (Sincronización Server-to-Server)
   */
  async syncUserFromPortal(data: any): Promise<boolean> {
    try {
      console.log(`[SSO-SYNC] Forzando actualización para usuario: ${data.carnet}`);
      await authRepo.upsertUsuarioLocal({
        nombre: data.nombre,
        correo: data.correo,
        carnet: data.carnet,
        activo: data.activo, // Importante: esto pasara a 0 si lo desactivaron en el excel del Portal Central
        esInterno: data.esInterno,
        cargo: data.cargo,
        departamento: data.departamento,
        gerencia: data.gerencia,
        subgerencia: data.subgerencia,
        area: data.area,
        jefeCarnet: data.jefeCarnet,
        jefeNombre: data.jefeNombre,
        jefeCorreo: data.jefeCorreo,
        telefono: data.telefono,
        genero: data.genero,
        fechaIngreso: data.fechaIngreso,
        idOrg: data.idOrg,
        orgDepartamento: data.orgDepartamento,
        orgGerencia: data.orgGerencia
      });
      return true;
    } catch (e) {
      console.error(`[SSO-SYNC] Error sincronizando:`, e.message);
      return false;
    }
  }
}
