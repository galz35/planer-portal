import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as colaboradoresRepo from './colaboradores.repo';
import * as planningRepo from '../planning/planning.repo';
import * as authRepo from '../auth/auth.repo';
import { AuditService } from '../common/audit.service';
import { isAdminRole } from '../common/role-utils';

// Permisos válidos del sistema
const PERMISOS_VALIDOS = new Set([
  'VIEW_PROJECT',
  'VIEW_TASKS',
  'CREATE_TASK',
  'EDIT_OWN_TASK',
  'EDIT_ANY_TASK',
  'DELETE_OWN_TASK',
  'DELETE_ANY_TASK',
  'ASSIGN_SELF',
  'ASSIGN_OTHERS',
  'REASSIGN',
  'INVITE',
  'MANAGE_COLLABORATORS',
  'EDIT_PROJECT',
  'DELETE_PROJECT',
  'EXPORT',
  'VIEW_HISTORY',
]);

const ROLES_VALIDOS = new Set([
  'Dueño',
  'Administrador',
  'Colaborador',
  'Editor',
  'Observador',
  'Revisor',
]);

// Orden de jerarquía de roles (mayor = más privilegios)
const ROL_JERARQUIA: Record<string, number> = {
  Observador: 1,
  Revisor: 2,
  Editor: 3,
  Colaborador: 4,
  Administrador: 5,
  Dueño: 6,
};

@Injectable()
export class ColaboradoresService {
  private readonly logger = new Logger(ColaboradoresService.name);

  constructor(private readonly auditService: AuditService) {}

  // ==========================================
  // TAREAS PROGRAMADAS (CRON)
  // ==========================================

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCronLimpiarExpirados() {
    this.logger.log('Iniciando limpieza de colaboradores expirados...');
    try {
      const removidos = await colaboradoresRepo.limpiarExpirados();
      this.logger.log(
        `Limpieza completada. Colaboradores expirados desactivados: ${removidos}`,
      );
    } catch (error) {
      this.logger.error('Error al limpiar colaboradores expirados', error);
    }
  }

  // ==========================================
  // LISTAR COLABORADORES
  // ==========================================

  async listarColaboradores(idProyecto: number, idSolicitante: number) {
    // Verificar que el proyecto existe
    const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    // Verificar que el solicitante tiene acceso al proyecto (al menos VIEW_PROJECT)
    await this.assertAccesoProyecto(idProyecto, idSolicitante, 'VIEW_PROJECT');

    const colaboradores =
      await colaboradoresRepo.listarColaboradores(idProyecto);
    const roles = await colaboradoresRepo.listarRolesColaboracion();

    return {
      data: colaboradores,
      rolesDisponibles: roles,
      proyecto: { idProyecto: proyecto.idProyecto, nombre: proyecto.nombre },
    };
  }

  // ==========================================
  // INVITAR COLABORADOR
  // ==========================================

  async invitarColaborador(
    idProyecto: number,
    idUsuarioInvitado: number,
    rolColaboracion: string,
    idInvitadoPor: number,
    fechaExpiracion?: string | null,
    notas?: string | null,
  ) {
    // Validar rol
    if (!ROLES_VALIDOS.has(rolColaboracion)) {
      throw new BadRequestException(
        `Rol de colaboración inválido: ${rolColaboracion}. Roles válidos: ${[...ROLES_VALIDOS].join(', ')}`,
      );
    }

    // Verificar que el proyecto existe
    const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    // Verificar que el invitador tiene permiso INVITE
    await this.assertAccesoProyecto(idProyecto, idInvitadoPor, 'INVITE');

    // No se puede asignar un rol superior al propio
    await this.assertNoEscalamiento(idProyecto, idInvitadoPor, rolColaboracion);

    // Solo Dueños pueden crear otros Dueños
    if (rolColaboracion === 'Dueño') {
      const rolActual = await this.obtenerMiRol(idProyecto, idInvitadoPor);
      if (rolActual !== 'Dueño' && !(await this.esAdminGlobal(idInvitadoPor))) {
        throw new ForbiddenException(
          'Solo el Dueño del proyecto puede crear otros Dueños',
        );
      }
    }

    const resultado = await colaboradoresRepo.invitarColaborador({
      idProyecto,
      idUsuario: idUsuarioInvitado,
      rolColaboracion,
      invitadoPor: idInvitadoPor,
      fechaExpiracion: fechaExpiracion ? new Date(fechaExpiracion) : null,
      notas,
    });

    // Auditoría
    await this.auditService.log({
      accion: 'COLABORADOR_INVITADO',
      recurso: 'ProyectoColaborador',
      recursoId: String(idProyecto),
      idUsuario: idInvitadoPor,
      detalles: { idUsuarioInvitado, rolColaboracion, fechaExpiracion },
    });

    return {
      success: true,
      message: 'Colaborador invitado exitosamente',
      colaborador: resultado,
    };
  }

  // ==========================================
  // ACTUALIZAR ROL/PERMISOS
  // ==========================================

  async actualizarColaborador(
    idProyecto: number,
    idUsuarioObjetivo: number,
    idSolicitante: number,
    rolColaboracion?: string,
    permisosCustom?: string[] | null,
    fechaExpiracion?: string | null,
  ) {
    // Verificar permisos de gestión
    await this.assertAccesoProyecto(
      idProyecto,
      idSolicitante,
      'MANAGE_COLLABORATORS',
    );

    // Validar rol si se cambia
    if (rolColaboracion && !ROLES_VALIDOS.has(rolColaboracion)) {
      throw new BadRequestException(`Rol inválido: ${rolColaboracion}`);
    }

    // Prevenir escalamiento
    if (rolColaboracion) {
      await this.assertNoEscalamiento(
        idProyecto,
        idSolicitante,
        rolColaboracion,
      );
    }

    // Validar permisos custom
    if (permisosCustom) {
      const invalidos = permisosCustom.filter(
        (p) => !PERMISOS_VALIDOS.has(p) && p !== '*',
      );
      if (invalidos.length > 0) {
        throw new BadRequestException(
          `Permisos inválidos: ${invalidos.join(', ')}`,
        );
      }
    }

    await colaboradoresRepo.actualizarColaborador({
      idProyecto,
      idUsuario: idUsuarioObjetivo,
      rolColaboracion,
      permisosCustom: permisosCustom ? JSON.stringify(permisosCustom) : null,
      fechaExpiracion: fechaExpiracion ? new Date(fechaExpiracion) : null,
    });

    await this.auditService.log({
      accion: 'COLABORADOR_ACTUALIZADO',
      recurso: 'ProyectoColaborador',
      recursoId: String(idProyecto),
      idUsuario: idSolicitante,
      detalles: { idUsuarioObjetivo, rolColaboracion, permisosCustom },
    });

    return { success: true, message: 'Colaborador actualizado' };
  }

  // ==========================================
  // REVOCAR ACCESO
  // ==========================================

  async revocarColaborador(
    idProyecto: number,
    idUsuarioObjetivo: number,
    idSolicitante: number,
  ) {
    // Verificar permisos
    await this.assertAccesoProyecto(
      idProyecto,
      idSolicitante,
      'MANAGE_COLLABORATORS',
    );

    // No puedo revocarme a mí mismo
    if (idUsuarioObjetivo === idSolicitante) {
      throw new BadRequestException(
        'No puedes revocarte a ti mismo. Contacta al Dueño del proyecto.',
      );
    }

    // No puedo revocar a alguien con rol superior
    const miRol = await this.obtenerMiRol(idProyecto, idSolicitante);
    const rolObjetivo = await this.obtenerMiRol(idProyecto, idUsuarioObjetivo);
    const miNivel = ROL_JERARQUIA[miRol || ''] || 0;
    const nivelObjetivo = ROL_JERARQUIA[rolObjetivo || ''] || 0;

    if (
      nivelObjetivo >= miNivel &&
      !(await this.esAdminGlobal(idSolicitante))
    ) {
      throw new ForbiddenException(
        'No puedes revocar a alguien con un rol igual o superior al tuyo',
      );
    }

    await colaboradoresRepo.revocarColaborador(idProyecto, idUsuarioObjetivo);

    await this.auditService.log({
      accion: 'COLABORADOR_REVOCADO',
      recurso: 'ProyectoColaborador',
      recursoId: String(idProyecto),
      idUsuario: idSolicitante,
      detalles: { idUsuarioRevocado: idUsuarioObjetivo },
    });

    return { success: true, message: 'Acceso revocado' };
  }

  // ==========================================
  // MIS PERMISOS
  // ==========================================

  async obtenerMisPermisos(idProyecto: number, idUsuario: number) {
    const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    // Admin global tiene todos los permisos
    if (await this.esAdminGlobal(idUsuario)) {
      return {
        rolColaboracion: 'Admin (Global)',
        permisos: ['*'],
        esDuenoProyecto: false,
        esAdminGlobal: true,
      };
    }

    // Dueño del proyecto
    const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
    if (
      proyecto.idCreador === idUsuario ||
      (usuario?.carnet && proyecto.responsableCarnet === usuario.carnet)
    ) {
      return {
        rolColaboracion: 'Dueño',
        permisos: ['*'],
        esDuenoProyecto: true,
        esAdminGlobal: false,
      };
    }

    // Buscar en tabla de colaboradores
    const { tienePermiso, rolColaboracion } =
      await colaboradoresRepo.verificarPermiso(
        idProyecto,
        idUsuario,
        'VIEW_PROJECT',
      );
    if (rolColaboracion) {
      const permisos =
        await colaboradoresRepo.obtenerPermisosPorRol(rolColaboracion);
      return {
        rolColaboracion,
        permisos,
        esDuenoProyecto: false,
        esAdminGlobal: false,
      };
    }

    // Acceso por jerarquía (fallback)
    return {
      rolColaboracion: 'Jerarquía',
      permisos: ['VIEW_PROJECT', 'VIEW_TASKS', 'VIEW_HISTORY'],
      esDuenoProyecto: false,
      esAdminGlobal: false,
    };
  }

  // ==========================================
  // ROLES DISPONIBLES
  // ==========================================

  async listarRoles() {
    return await colaboradoresRepo.listarRolesColaboracion();
  }

  // ==========================================
  // HELPERS INTERNOS
  // ==========================================

  private async assertAccesoProyecto(
    idProyecto: number,
    idUsuario: number,
    permisoRequerido: string,
  ) {
    // Admin global siempre tiene acceso
    if (await this.esAdminGlobal(idUsuario)) return;

    // Verificar si es dueño/creador del proyecto
    const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
    if (proyecto) {
      const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
      if (proyecto.idCreador === idUsuario) return;
      if (usuario?.carnet && proyecto.responsableCarnet === usuario.carnet)
        return;
    }

    // Verificar permiso granular
    const { tienePermiso } = await colaboradoresRepo.verificarPermiso(
      idProyecto,
      idUsuario,
      permisoRequerido,
    );
    if (!tienePermiso) {
      throw new ForbiddenException(
        `No tienes permiso '${permisoRequerido}' en este proyecto`,
      );
    }
  }

  private async assertNoEscalamiento(
    idProyecto: number,
    idUsuario: number,
    rolDeseado: string,
  ) {
    if (await this.esAdminGlobal(idUsuario)) return; // Admin global no tiene restricción

    const miRol = await this.obtenerMiRol(idProyecto, idUsuario);
    const miNivel = ROL_JERARQUIA[miRol || ''] || 0;
    const nivelDeseado = ROL_JERARQUIA[rolDeseado] || 0;

    if (nivelDeseado > miNivel) {
      throw new ForbiddenException(
        `No puedes asignar el rol '${rolDeseado}' porque es superior a tu rol actual '${miRol}'`,
      );
    }
  }

  private async obtenerMiRol(
    idProyecto: number,
    idUsuario: number,
  ): Promise<string | null> {
    // Primero verificar si es dueño/creador
    const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
    if (proyecto && proyecto.idCreador === idUsuario) return 'Dueño';

    const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
    if (
      proyecto &&
      usuario?.carnet &&
      proyecto.responsableCarnet === usuario.carnet
    )
      return 'Dueño';

    // Luego verificar en tabla de colaboradores
    const { rolColaboracion } = await colaboradoresRepo.verificarPermiso(
      idProyecto,
      idUsuario,
      'VIEW_PROJECT',
    );
    return rolColaboracion;
  }

  private async esAdminGlobal(idUsuario: number): Promise<boolean> {
    const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
    return isAdminRole(usuario?.rolGlobal);
  }
}
