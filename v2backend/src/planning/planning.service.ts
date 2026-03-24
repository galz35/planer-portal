import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import * as planningRepo from './planning.repo';
import * as authRepo from '../auth/auth.repo';
import * as avanceMensualRepo from './avance-mensual.repo';
import * as grupoRepo from './grupo.repo';
import * as colaboradoresRepo from '../colaboradores/colaboradores.repo';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import * as tasksRepo from '../clarity/tasks.repo';
import * as clarityRepo from '../clarity/clarity.repo';
import { isAdminRole, isLeaderRole } from '../common/role-utils';

@Injectable()
export class PlanningService {
  constructor(
    private auditService: AuditService,
    private visibilidadService: VisibilidadService,
  ) { }

  // ============================
  // Helpers (validación/sanitizado)
  // ============================
  private async isAdminUser(idUsuario: number): Promise<boolean> {
    const u = await authRepo.obtenerUsuarioPorId(idUsuario);
    return isAdminRole(u?.rolGlobal);
  }

  private ensureMonthYear(mes: number, anio: number) {
    if (!mes || Number.isNaN(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException('mes inválido (1-12).');
    }
    if (!anio || Number.isNaN(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException('anio inválido (2000-2100).');
    }
  }

  private ensurePercent(p: number) {
    if (p === null || p === undefined || Number.isNaN(p) || p < 0 || p > 100) {
      throw new BadRequestException('porcentajeMes inválido (0-100).');
    }
  }

  // Campos permitidos para request-change (evita que te actualicen cualquier columna)
  private readonly CAMPOS_PERMITIDOS_SOLICITUD = new Set<string>([
    'titulo',
    'nombre',
    'descripcion',
    'progreso',
    'porcentaje',
    'fechaObjetivo',
    'fechaInicioPlanificada',
    'fechaFinPlanificada',
    'prioridad',
    'estado',
  ]);

  // Mapeo frontend -> DB
  private mapCampoToDb(campo: string): string {
    const c = String(campo || '').trim();
    if (c === 'titulo') return 'nombre';
    if (c === 'progreso') return 'porcentaje';
    return c;
  }

  // Normalización básica de valores (según campo)
  private normalizeValorNuevo(campoDb: string, valor: any): any {
    // Fechas: deja ISO string / Date string (tu repo decide)
    if (
      campoDb === 'fechaObjetivo' ||
      campoDb === 'fechaInicioPlanificada' ||
      campoDb === 'fechaFinPlanificada'
    ) {
      if (valor === null || valor === undefined || valor === '') return null;
      const s = String(valor).trim();
      if (!s) return null;
      // no parseo agresivo: solo validación mínima
      const d = new Date(s);
      if (Number.isNaN(d.getTime()))
        throw new BadRequestException(`Fecha inválida para ${campoDb}.`);
      return s;
    }

    if (campoDb === 'porcentaje') {
      const n = Number(valor);
      if (Number.isNaN(n) || n < 0 || n > 100)
        throw new BadRequestException('porcentaje inválido.');
      return n;
    }

    // Default: string
    if (valor === null || valor === undefined) return null;
    return String(valor);
  }

  private async assertPuedeVerUsuario(
    idSolicitante: number,
    idObjetivo: number,
  ) {
    if (idSolicitante === idObjetivo) return true;
    if (await this.isAdminUser(idSolicitante)) return true;

    const ok = await this.visibilidadService.verificarAccesoPorId(
      idSolicitante,
      idObjetivo,
    );
    if (!ok) throw new ForbiddenException('No tienes acceso a este usuario.');
    return true;
  }

  public async verificarAccesoTarea(idSolicitante: number, tarea: any) {
    // [EMERGENCY FLAG] Solo para producción: SET BYPASS_ACCESS_CHECK=true para revertir rápido
    if (process.env.BYPASS_ACCESS_CHECK === 'true') return true;

    // Si el usuario es el mismo que el dueño/asignado
    const idOwner =
      tarea?.idUsuario ?? tarea?.idUsuarioAsignado ?? tarea?.planIdUsuario;
    if (idOwner === idSolicitante) return true;

    // Validar también contra tabla p_TareaAsignados (Asignación Múltiple)
    const esAsignado = await planningRepo.esAsignado(
      tarea.idTarea,
      idSolicitante,
    );
    if (esAsignado) return true;

    // Admin siempre puede
    if (await this.isAdminUser(idSolicitante)) return true;

    // 1. Visibilidad Jerárquica
    if (idOwner && typeof idOwner === 'number') {
      const jerarquiaOk = await this.visibilidadService.verificarAccesoPorId(
        idSolicitante,
        idOwner,
      );
      if (jerarquiaOk) return true;
    }

    // 2. Visibilidad por Proyecto (Colaboración)
    const user = await authRepo.obtenerUsuarioPorId(idSolicitante);
    if (tarea.idProyecto) {
      const proyectos = await planningRepo.obtenerProyectosVisibles(
        idSolicitante,
        user,
      );
      const accesoProyecto = proyectos.some(
        (p: any) => p.idProyecto === tarea.idProyecto,
      );
      if (accesoProyecto) return true;

      // 2.5 Permisos Granulares (Colaborador invitado al proyecto)
      try {
        const esColab = await colaboradoresRepo.esColaborador(
          tarea.idProyecto,
          idSolicitante,
        );
        if (esColab) return true;
      } catch (e) {
        console.warn('[PlanningService] Error checking collaborator status', e);
      }

      // 3. Fallback Estructural (Gerencia/Subgerencia)
      try {
        const proyecto = await planningRepo.obtenerProyectoPorId(
          tarea.idProyecto,
        );
        if (proyecto && user) {
          const rol = (user.rolGlobal || '').trim();

          // A. Gerentes/Directores ven todo lo de su Gerencia
          if (
            (rol === 'Gerente' || rol === 'Director') &&
            user.gerencia &&
            proyecto.gerencia === user.gerencia
          ) {
            return true;
          }

          // B. Jefes ven todo lo de su Subgerencia/Area
          if (isLeaderRole(rol)) {
            if (user.subgerencia && proyecto.subgerencia === user.subgerencia)
              return true;
            if (user.area && proyecto.area === user.area) return true;
          }
        }
      } catch (e) {
        console.warn(
          '[PlanningService] Error checking project structure visibility',
          e,
        );
      }
    }

    // 4. Tareas sin dueño y sin proyecto -> acceso permitido (tareas huérfanas/públicas)
    if (!idOwner && !tarea.idProyecto) return true;

    // Si falló todo -> Denegar
    console.warn(
      `[Access Denied] User #${idSolicitante} (${user?.carnet || 'N/A'}) tried to access Task ${tarea.idTarea} (Project ${tarea.idProyecto ?? 'N/A'}). Role: ${user?.rolGlobal}`,
    );
    throw new ForbiddenException(
      `No tienes permisos para ver/editar esta tarea.`,
    );
  }

  // ============================
  // Core
  // ============================

  async checkEditPermission(
    idTarea: number,
    idUsuario: number,
  ): Promise<{
    puedeEditar: boolean;
    requiereAprobacion: boolean;
    tipoProyecto: string;
  }> {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    // Seguridad: si es tarea de alguien más, debo poder verlo (jerarquía o admin)
    await this.verificarAccesoTarea(idUsuario, tarea);

    // Si no tiene proyecto, tarea personal -> Libre
    if (!tarea.idProyecto) {
      return {
        puedeEditar: true,
        requiereAprobacion: false,
        tipoProyecto: 'Personal',
      };
    }

    // Proyectos estratégicos requieren aprobación
    if (
      tarea.proyectoTipo === 'Estrategico' ||
      tarea.proyectoRequiereAprobacion
    ) {
      const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);

      // 1. Admin siempre libre
      if (isAdminRole(usuario?.rolGlobal)) {
        return {
          puedeEditar: true,
          requiereAprobacion: false,
          tipoProyecto: tarea.proyectoTipo || 'Estrategico',
        };
      }

      // 2. Si soy el CREADOR de la tarea, puedo editarla libremente (agilidad para "cosa vieja")
      if (tarea.idCreador === idUsuario) {
        return {
          puedeEditar: true,
          requiereAprobacion: false,
          tipoProyecto: tarea.proyectoTipo || 'Estrategico',
        };
      }

      // 3. Si soy el DUEÑO o RESPONSABLE del proyecto completo
      const proyecto = await planningRepo.obtenerProyectoPorId(
        tarea.idProyecto,
      );
      if (proyecto) {
        const esDuenio =
          (proyecto.idCreador && proyecto.idCreador === idUsuario) ||
          (proyecto.responsableCarnet &&
            proyecto.responsableCarnet === usuario?.carnet);
        if (esDuenio) {
          return {
            puedeEditar: true,
            requiereAprobacion: false,
            tipoProyecto: tarea.proyectoTipo || 'Estrategico',
          };
        }
      }

      // 4. [FIX] Si soy el ASIGNADO de la tarea, puedo trabajarla (Operational freedom)
      const esAsignado = await planningRepo.esAsignado(idTarea, idUsuario);
      if (esAsignado) {
        return {
          puedeEditar: true,
          requiereAprobacion: false,
          tipoProyecto: tarea.proyectoTipo || 'Estrategico',
        };
      }

      // Permitimos editar pero con flujo de aprobación para otros
      return {
        puedeEditar: true,
        requiereAprobacion: true,
        tipoProyecto: tarea.proyectoTipo || 'Estrategico',
      };
    }

    // Operativo / Táctico -> Libre
    return {
      puedeEditar: true,
      requiereAprobacion: false,
      tipoProyecto: tarea.proyectoTipo || 'General',
    };
  }

  async solicitarCambio(
    idUsuario: number,
    idTarea: number,
    campo: string,
    valorNuevo: any,
    motivo: string,
  ) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    await this.verificarAccesoTarea(idUsuario, tarea);

    const campoRaw = String(campo || '').trim();
    if (!this.CAMPOS_PERMITIDOS_SOLICITUD.has(campoRaw)) {
      throw new BadRequestException(
        `Campo no permitido para solicitud: ${campoRaw}`,
      );
    }

    const campoDb = this.mapCampoToDb(campoRaw);
    const user = await authRepo.obtenerUsuarioPorId(idUsuario);
    if (!user) throw new ForbiddenException('Usuario inválido.');

    const valorAnterior =
      tarea[campoDb] !== undefined && tarea[campoDb] !== null
        ? String(tarea[campoDb])
        : '';

    const valorNormalizado = this.normalizeValorNuevo(campoDb, valorNuevo);

    // Importante: guardamos el campo ORIGINAL que pidió el front + el DB
    return await planningRepo.crearSolicitudCambio({
      idTarea,
      idUsuario,
      campo: campoRaw,
      valorAnterior,
      valorNuevo: valorNormalizado === null ? '' : String(valorNormalizado),
      motivo: String(motivo || '').trim(),
    });
  }

  async getSolicitudesPendientes(idUsuario: number) {
    const user = await authRepo.obtenerUsuarioPorId(idUsuario);
    if (!user) return [];

    // Admin ve todas
    if (isAdminRole(user.rolGlobal)) {
      return await planningRepo.obtenerSolicitudesPendientes();
    }

    // Líder: ve solicitudes de su equipo (por carnets)
    if (user.carnet) {
      const team = await planningRepo.obtenerEquipoDirecto(user.carnet);
      const teamCarnets = (team || [])
        .map((u: any) => u.carnet)
        .filter((c: any) => c);
      if (teamCarnets.length > 0) {
        return await planningRepo.obtenerSolicitudesPorCarnets(teamCarnets);
      }
    }

    // No es admin ni líder: por defecto no tiene bandeja de aprobaciones
    return [];
  }

  async resolverSolicitud(
    idUsuarioResolutor: number,
    idSolicitud: number,
    accion: 'Aprobar' | 'Rechazar',
    comentario?: string,
  ) {
    const user = await authRepo.obtenerUsuarioPorId(idUsuarioResolutor);
    if (!user) throw new ForbiddenException('Usuario inválido.');

    const solicitud = await planningRepo.obtenerSolicitudPorId(idSolicitud);
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

    // ✅ Permisos: Admin O superior del solicitante (visibilidad)
    const esAdmin = isAdminRole(user.rolGlobal);
    if (!esAdmin) {
      const solicitanteId = Number(solicitud.idUsuarioSolicitante);
      if (!solicitanteId || Number.isNaN(solicitanteId)) {
        throw new ForbiddenException(
          'No se puede validar jerarquía del solicitante.',
        );
      }
      const esSuperior = await this.visibilidadService.verificarAccesoPorId(
        idUsuarioResolutor,
        solicitanteId,
      );
      if (!esSuperior) {
        throw new ForbiddenException(
          'No tienes permisos para resolver esta solicitud.',
        );
      }
    }

    const comentarioFinal = comentario ? String(comentario).trim() : '';

    if (accion === 'Rechazar') {
      await planningRepo.resolverSolicitud(
        idSolicitud,
        'Rechazado',
        idUsuarioResolutor,
        comentarioFinal || 'Rechazado por superior',
      );
      return { mensaje: 'Solicitud rechazada' };
    }

    // Aprobar: aplicar cambio con whitelist/mapeo
    const campoRaw = String(solicitud.campo || '').trim();
    if (!this.CAMPOS_PERMITIDOS_SOLICITUD.has(campoRaw)) {
      throw new BadRequestException(
        `Campo no permitido en solicitud: ${campoRaw}`,
      );
    }

    const campoDb = this.mapCampoToDb(campoRaw);
    const valorDb = this.normalizeValorNuevo(campoDb, solicitud.valorNuevo);

    // Seguridad extra: validar que resolutor puede ver la tarea (por dueño)
    const tarea = await planningRepo.obtenerTareaPorId(solicitud.idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idUsuarioResolutor, tarea);

    // MIGRACION v2.1: Usar tasksRepo para asegurar Roll-up
    await tasksRepo.actualizarTarea(solicitud.idTarea, { [campoDb]: valorDb });

    await planningRepo.resolverSolicitud(
      idSolicitud,
      'Aprobado',
      idUsuarioResolutor,
      comentarioFinal || 'Aprobado por superior',
    );

    await this.auditService.log({
      accion: 'CAMBIO_APROBADO',
      recurso: 'Tarea',
      recursoId: String(solicitud.idTarea),
      idUsuario: idUsuarioResolutor,
      detalles: { idSolicitud, campo: campoDb, valor: valorDb },
    });

    return { mensaje: 'Solicitud aprobada y cambio aplicado correctamente' };
  }

  async updateTareaOperativa(idUsuario: number, idTarea: number, updates: any) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    await this.verificarAccesoTarea(idUsuario, tarea);

    const permiso = await this.checkEditPermission(idTarea, idUsuario);

    if (!permiso.puedeEditar)
      throw new ForbiddenException('No tienes permiso para editar esta tarea');
    if (permiso.requiereAprobacion) {
      throw new BadRequestException(
        'Esta tarea requiere aprobación. Usa request-change.',
      );
    }

    // ✅ Sanitizar updates: solo campos operativos permitidos
    const allowed = new Set<string>([
      'nombre',
      'descripcion',
      'porcentaje',
      'estado',
      'prioridad',
      'fechaObjetivo',
      'fechaInicioPlanificada',
      'fechaFinPlanificada',
    ]);

    const safe: any = {};
    for (const k of Object.keys(updates || {})) {
      if (!allowed.has(k)) continue;
      safe[k] = this.normalizeValorNuevo(k, updates[k]);
    }

    if (Object.keys(safe).length === 0) {
      throw new BadRequestException('No hay campos válidos para actualizar.');
    }

    // MIGRACION v2.1: Blindaje de actualizaciones operativas
    await tasksRepo.actualizarTarea(idTarea, safe);

    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { tipo: 'UpdateOperativa', campos: Object.keys(safe) },
    });

    return { exito: true };
  }

  // ==========================================
  // PLANES DE TRABAJO
  // ==========================================
  async getPlans(
    idSolicitante: number,
    idObjetivo: number,
    mes: number,
    anio: number,
  ) {
    this.ensureMonthYear(mes, anio);
    await this.assertPuedeVerUsuario(idSolicitante, idObjetivo);

    const carnetObjetivo =
      await this.visibilidadService.obtenerCarnetPorId(idObjetivo);
    if (!carnetObjetivo)
      throw new NotFoundException('Carnet de usuario objetivo no encontrado');

    return await planningRepo.obtenerPlanes(carnetObjetivo, mes, anio);
  }

  async upsertPlan(idUsuario: number, body: any) {
    const targetUserId = Number(body?.idUsuario);
    const mes = Number(body?.mes);
    const anio = Number(body?.anio);

    if (!targetUserId || Number.isNaN(targetUserId))
      throw new BadRequestException('idUsuario inválido.');
    this.ensureMonthYear(mes, anio);

    // Si editas el plan de otro: debes poder verlo (jerarquía o admin)
    await this.assertPuedeVerUsuario(idUsuario, targetUserId);

    const objetivos = body?.objetivos ?? null;
    const estado = body?.estado ? String(body.estado) : 'Borrador';

    return await planningRepo.upsertPlan({
      idUsuario: targetUserId,
      mes,
      anio,
      objetivos,
      estado,
      idCreador: idUsuario,
    });
  }

  // ==========================================
  // DASHBOARD & TEAM
  // ==========================================
  async getMyTeam(idUsuario: number) {
    const user = await authRepo.obtenerUsuarioPorId(idUsuario);
    if (!user || !user.carnet) return [];
    const team = await this.visibilidadService.obtenerMiEquipo(user.carnet);

    // ✅ Garantizar que el usuario mismo esté en la lista para auto-asignarse
    const isSelfInTeam = (team || []).some(
      (m: any) =>
        String(m.carnet).trim() === String(user.carnet || '').trim() ||
        Number(m.idUsuario) === Number(idUsuario),
    );

    if (!isSelfInTeam) {
      team.unshift({
        ...user,
        nombre: user.nombreCompleto || user.nombre,
        nivel: 0,
        fuente: 'MISMO',
      });
    }

    return team;
  }

  async getMyProjects(idUsuario: number) {
    const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
    if (!carnet) return [];
    return await planningRepo.obtenerProyectosPorUsuario(carnet);
  }

  // ==========================================
  // Pendientes (igual que tenías, pero con firma segura)
  // ==========================================
  async cloneTask(idUsuario: number, idTarea: number) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idUsuario, tarea);

    const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
    if (!carnet)
      throw new ForbiddenException('No se pudo resolver el carnet del usuario');

    const idNueva = await planningRepo.clonarTarea(idTarea, carnet);

    await this.auditService.log({
      accion: 'TAREA_CREADA',
      recurso: 'Tarea',
      recursoId: String(idNueva),
      idUsuario,
      detalles: { origenId: idTarea, tipo: 'Clonacion' },
    });

    return { id: idNueva };
  }

  async reassignTasks(
    idUsuario: number,
    from: number,
    to: number,
    tasks: number[],
  ) {
    // Validar que el usuario pueda ver a ambos (jerarquía o admin)
    await this.assertPuedeVerUsuario(idUsuario, from);
    await this.assertPuedeVerUsuario(idUsuario, to);

    const toCarnet = await this.visibilidadService.obtenerCarnetPorId(to);
    if (!toCarnet)
      throw new BadRequestException('Usuario destino no tiene carnet válido');

    await planningRepo.reasignarTareas(tasks, toCarnet);

    await this.auditService.log({
      accion: 'TAREA_REASIGNADA',
      recurso: 'Tarea', // Podría ser una lista, pero simplificamos log
      recursoId: 'Multiple',
      idUsuario,
      detalles: { tasks, from, to },
    });

    return { exito: true };
  }

  async getTaskHistory(idTarea: number, idSolicitante: number) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idSolicitante, tarea);

    return await this.auditService.getHistorialEntidad(
      'Tarea',
      String(idTarea),
    );
  }

  async closePlan(idUsuario: number, idPlan: number) {
    const plan = await planningRepo.obtenerPlanPorId(idPlan);
    if (!plan) throw new NotFoundException('Plan no encontrado');

    await this.assertPuedeVerUsuario(idUsuario, plan.idUsuario);

    await planningRepo.cerrarPlan(idPlan);
    return { success: true };
  }

  // ==========================================
  // AVANCE MENSUAL
  // ==========================================
  async registrarAvanceMensual(
    idTarea: number,
    anio: number,
    mes: number,
    porcentajeMes: number,
    comentario: string | null,
    idUsuario: number,
  ) {
    this.ensureMonthYear(mes, anio);
    this.ensurePercent(porcentajeMes);

    // Validar que el usuario pueda ver la tarea
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idUsuario, tarea);

    await avanceMensualRepo.upsertAvanceMensual(
      idTarea,
      anio,
      mes,
      porcentajeMes,
      comentario,
      idUsuario,
    );

    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { tipo: 'AvanceMensual', anio, mes, porcentajeMes },
    });

    return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
  }

  async obtenerHistorialMensual(idTarea: number, idSolicitante: number) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idSolicitante, tarea);

    return await avanceMensualRepo.obtenerHistorialMensual(idTarea);
  }

  // ==========================================
  // GRUPOS / FASES
  // ==========================================
  async crearGrupo(idTarea: number, idUsuario: number) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');
    await this.verificarAccesoTarea(idUsuario, tarea);

    await grupoRepo.crearGrupoInicial(idTarea);

    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { tipo: 'CrearGrupo' },
    });

    return { idGrupo: idTarea, message: 'Grupo creado' };
  }

  async agregarFase(idGrupo: number, idTareaNueva: number, idUsuario: number) {
    // Validar visibilidad sobre ambas tareas
    const grupo = await planningRepo.obtenerTareaPorId(idGrupo);
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    await this.verificarAccesoTarea(idUsuario, grupo);

    const fase = await planningRepo.obtenerTareaPorId(idTareaNueva);
    if (!fase) throw new NotFoundException('Tarea fase no encontrada');
    await this.verificarAccesoTarea(idUsuario, fase);

    await grupoRepo.agregarFase(idGrupo, idTareaNueva);

    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTareaNueva),
      idUsuario,
      detalles: { tipo: 'AgregarFase', idGrupo },
    });

    return await grupoRepo.obtenerTareasGrupo(idGrupo);
  }

  async obtenerGrupo(idGrupo: number, idSolicitante: number) {
    const grupo = await planningRepo.obtenerTareaPorId(idGrupo);
    if (!grupo) throw new NotFoundException('Grupo no encontrado');
    await this.verificarAccesoTarea(idSolicitante, grupo);

    return await grupoRepo.obtenerTareasGrupo(idGrupo);
  }

  // ==========================================
  // DASHBOARD ALERTS
  // ==========================================
  async getDashboardAlerts(idUsuario: number) {
    const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
    if (!carnet) return { today: [], overdue: [] };

    // 1. Obtener mi equipo completo (jerarquía + delegaciones)
    const equipo = await this.visibilidadService.obtenerMiEquipo(carnet);
    const carnetsEquipo = equipo
      .map((u: any) => u.carnet)
      .filter((c: any) => c);

    // FIX: Incluir siempre al propio usuario para ver también SUS tareas,
    // ya que obtenerMiEquipo a veces retorna solo subordinados excluyendo al jefe.
    if (!carnetsEquipo.includes(carnet)) {
      carnetsEquipo.push(carnet);
    }

    if (carnetsEquipo.length === 0) return { today: [], overdue: [] };

    // 2. Obtener tareas críticas (Raw Data)
    const tareas = await planningRepo.obtenerTareasCriticas(carnetsEquipo);

    // 3. Clasificar en Servidor (consistente)
    const hoy = new Date().toISOString().split('T')[0]; // Fecha YYYY-MM-DD serv

    const overdue: any[] = [];
    const today: any[] = [];

    tareas.forEach((t: any) => {
      const fObj = t.fechaObjetivo
        ? new Date(t.fechaObjetivo).toISOString().split('T')[0]
        : null;
      const fComp = t.fechaCompletado
        ? new Date(t.fechaCompletado).toISOString().split('T')[0]
        : null;
      const fFin = t.fechaFinReal
        ? new Date(t.fechaFinReal).toISOString().split('T')[0]
        : null;

      if (t.estado === 'Hecha' || t.estado === 'Completada') {
        // Si fue completada HOY (por cualquiera de los dos campos), va a la columna de éxitos del día
        if (fComp === hoy || fFin === hoy) today.push(t);
      } else {
        // Si está pendiente y es del pasado -> Atrasada
        if (fObj && fObj < hoy) overdue.push(t);
        // Si está pendiente y es de hoy -> Para entregar hoy
        else if (fObj === hoy) today.push(t);
      }
    });

    return { overdue, today };
  }

  // ==========================================
  // MI ASIGNACIÓN - Vista Unificada
  // ==========================================
  async getMiAsignacion(carnet: string, filtros?: { estado?: string }) {
    return await planningRepo.obtenerMiAsignacion(carnet, filtros);
  }

  // ==========================================
  // AGENDA / MI DÍA (Mobile App Support)
  // ==========================================
  async getMiDia(idUsuario: number, fecha: string) {
    const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
    if (!carnet)
      return {
        bloqueosActivos: [],
        tareasSugeridas: [],
        backlog: [],
        checkinHoy: null,
      };

    const targetDate = fecha ? new Date(fecha) : new Date();
    const checkinHoy = await clarityRepo.obtenerCheckinPorFecha(
      carnet,
      targetDate,
    );

    const result = await planningRepo.obtenerMiAsignacion(carnet);
    const tareas: any[] = (result as any).proyectos
      ? []
      : (result as any).tareas || [];
    // Si result es lista de proyectos, aplanar tareas
    if ((result as any).proyectos) {
      (result as any).proyectos.forEach((p: any) => {
        const wrap = (list: any[]) =>
          (list || []).map((t) => ({
            ...t,
            idProyecto: t.idProyecto || p.idProyecto,
            proyectoNombre: t.proyectoNombre || p.nombre,
          }));

        if (p.tareas) tareas.push(...wrap(p.tareas));
        if (p.misTareas) tareas.push(...wrap(p.misTareas));
      });
    }

    // 0. Auxiliar para fechas seguras (YYYY-MM-DD)
    const toISODate = (d: any) => {
      if (!d) return null;
      const date = new Date(d);
      if (isNaN(date.getTime())) return null;
      // Usamos el offset para obtener la fecha local real si es objeto Date,
      // o simplemente toISOString si ya es UTC
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const hoy = fecha ? toISODate(fecha) : toISODate(new Date());

    // Mapear y DEDUPLICAR
    const seen = new Set<number>();
    const allTasks = tareas
      .map((t: any) => {
        const projName = t.proyectoNombre || t.Proyecto;
        let finalTitle = t.titulo || t.Nombre || t.nombre;

        if (t.responsableCarnet && String(t.responsableCarnet).trim() !== String(carnet).trim()) {
          const shortName = t.responsableNombre ? t.responsableNombre.split(' ').slice(0, 2).join(' ') : 'Otro';
          finalTitle = `${finalTitle} (Asig: ${shortName})`;
        }

        return {
          ...t,
          idTarea: t.idTarea || t.ID || t.id,
          titulo: finalTitle,
          estado: t.estado || t.Estado,
          prioridad: t.prioridad || t.Prioridad || 'Media',
          proyectoNombre: projName,
          proyecto: t.proyecto || (projName ? { nombre: projName } : null),
          fechaObjetivo: t.fechaObjetivo || t.FechaFin,
        };
      })
      .filter((t) => {
        if (!t.idTarea || seen.has(t.idTarea)) return false;
        seen.add(t.idTarea);
        return true;
      });

    const bloqueosActivos = allTasks.filter(
      (t: any) => t.estado === 'Bloqueada',
    );

    // Auxiliar para determinar si es atrasada
    const isOverdue = (t: any) => {
      if (!t.fechaObjetivo) return false;
      const fObj = toISODate(t.fechaObjetivo);
      return fObj && hoy && fObj < hoy;
    };

    const backlog = allTasks.filter((t: any) => {
      if (
        [
          'Bloqueada',
          'Hecha',
          'Completada',
          'Terminada',
          'Inactiva',
          'Descartada',
        ].includes(t.estado)
      )
        return false;
      // Toda tarea atrasada va exclusivamente al backlog
      return isOverdue(t);
    });

    const tareasSugeridas = allTasks.filter((t: any) => {
      if (
        [
          'Bloqueada',
          'Hecha',
          'Completada',
          'Terminada',
          'Inactiva',
          'Descartada',
        ].includes(t.estado)
      )
        return false;

      // Si ya está en backlog, no duplicar
      if (isOverdue(t)) return false;

      // Prioridad a lo que ya se está trabajando (que no sea vieja/atrasada)
      if (t.estado === 'En Curso' || t.estado === 'En Proceso') return true;

      // Si no tiene fecha, es candidata para hoy (Inbox)
      if (!t.fechaObjetivo) return true;

      const fObj = toISODate(t.fechaObjetivo);
      if (!fObj || !hoy) return false;

      // Si es hoy o futura, sugerirla (para que se pueda elegir hoy)
      return true;
    });

    return {
      bloqueosActivos,
      bloqueosMeCulpan: [],
      tareasSugeridas,
      backlog,
      checkinHoy,
    };
  }

  async saveCheckin(idUsuario: number, data: any) {
    const carnet = await this.visibilidadService.obtenerCarnetPorId(idUsuario);
    if (!carnet)
      throw new BadRequestException(
        'Usuario sin carnet asociado para Check-in.',
      );

    // 1. Construir lista de tareas para TVP
    const tareasParaCheckin: { idTarea: number; tipo: string }[] = [];

    // Manejar arrays de IDs (Móvil manda listas de IDs)
    if (data.entrego && Array.isArray(data.entrego)) {
      data.entrego.forEach((id: number) =>
        tareasParaCheckin.push({ idTarea: id, tipo: 'Entrego' }),
      );
    }
    if (data.avanzo && Array.isArray(data.avanzo)) {
      data.avanzo.forEach((id: number) =>
        tareasParaCheckin.push({ idTarea: id, tipo: 'Avanzo' }),
      );
    }
    if (data.extras && Array.isArray(data.extras)) {
      data.extras.forEach((id: number) =>
        tareasParaCheckin.push({ idTarea: id, tipo: 'Extra' }),
      );
    }

    // 2. Persistir Checkin Real (BD)
    await clarityRepo.checkinUpsert({
      usuarioCarnet: carnet,
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
      entregableTexto: data.entregableTexto || 'Objetivo del día',
      estadoAnimo: data.estadoAnimo || 'Neutral',
      nota: data.nota || '',
      entrego: data.entrego || [],
      avanzo: data.avanzo || [],
      extras: data.extras || [],
    });

    const fecha = data.fecha || new Date().toISOString().split('T')[0];

    // LOG
    await this.auditService.log({
      accion: 'CHECKIN_DIARIO',
      recurso: 'Agenda',
      recursoId: fecha,
      idUsuario,
      detalles: {
        totalTareas: (data.entrego?.length || 0) + (data.avanzo?.length || 0),
      },
    });

    // 3. Auto-Start (Lógica original de conveniencia)
    // Pone en curso las tareas que se prometen entregar
    const idsEntrego = data.entrego || [];
    for (const idRaw of idsEntrego) {
      try {
        const id = Number(idRaw);
        const t = await planningRepo.obtenerTareaPorId(id);
        // Si está Pendiente/Nueva -> En Curso
        if (
          t &&
          (t.estado === 'Pendiente' ||
            t.estado === 'Nueva' ||
            t.estado === 'Por Hacer')
        ) {
          // Update directo a DB
          await tasksRepo.actualizarTarea(id, {
            estado: 'En Curso',
            fechaInicioReal: new Date(),
          });
        }
      } catch (e) {
        console.warn('[Agenda] Ignore task start error', idRaw);
      }
    }

    return { success: true, message: 'Checkin guardado correctamente' };
  }
  // ==========================================
  // SUPERVISION
  // ==========================================
  async getSupervision(idUsuario: number) {
    const isAdmin = await this.isAdminUser(idUsuario);
    if (!isAdmin) {
      throw new ForbiddenException(
        'Acceso denegado: Solo Administradores pueden ver el panel de Supervisión.',
      );
    }
    return await planningRepo.obtenerSupervision();
  }

  async debugTasksByUser(name: string) {
    return await planningRepo.debugTasksByUser(name);
  }
}
