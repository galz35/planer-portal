import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import * as tasksRepo from './tasks.repo';
import * as authRepo from '../auth/auth.repo';
import * as accesoRepo from '../acceso/acceso.repo';
import * as colaboradoresRepo from '../colaboradores/colaboradores.repo';
import { ResourceNotFoundException } from '../common/exceptions';
import {
  TareaCrearRapidaDto,
  CheckinUpsertDto,
  BloqueoCrearDto,
  TareaRevalidarDto,
  TareaMasivaDto,
} from './dto/clarity.dtos';
import { AuditService, AccionAudit, RecursoAudit } from '../common/audit.service';
import { PlanningService } from '../planning/planning.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { RecurrenciaService } from './recurrencia.service';
import { ProyectoFilterDto, ProyectoCrearDto } from './dto/clarity.dtos';
import { NotificationService } from '../common/notification.service';
import { isAdminRole } from '../common/role-utils';

import { Int, NVarChar, ejecutarSP, ejecutarQuery } from '../db/base.repo';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private planningService: PlanningService,
    private auditService: AuditService,
    private visibilidadService: VisibilidadService,
    private recurrenciaService: RecurrenciaService,
    private notificationService: NotificationService,
  ) { }


  // ===============================================
  // API: Recordatorios CRUD
  // ===============================================

  async crearRecordatorio(
    idTarea: number,
    idUsuario: number,
    fechaHora: string,
    nota?: string,
  ) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    const fechaParsed = new Date(fechaHora);
    if (isNaN(fechaParsed.getTime()))
      throw new BadRequestException('Fecha/hora inválida');
    if (fechaParsed < new Date())
      throw new BadRequestException(
        'La fecha del recordatorio debe ser en el futuro',
      );

    const id = await tasksRepo.crearOActualizarRecordatorio(
      idTarea,
      idUsuario,
      fechaParsed,
      nota,
    );
    return {
      success: true,
      idRecordatorio: id,
      fechaHoraRecordatorio: fechaParsed,
    };
  }

  async eliminarRecordatorio(idRecordatorio: number, idUsuario: number) {
    await tasksRepo.eliminarRecordatorio(idRecordatorio, idUsuario);
    return { success: true };
  }

  async obtenerMisRecordatorios(idUsuario: number) {
    return await tasksRepo.obtenerRecordatoriosUsuario(idUsuario);
  }

  // ===============================================
  // COMPATIBILIDAD CON CONTROLLER (MÃ©todos mapeados)
  // ===============================================

  async resolveCarnet(idUsuario: number): Promise<string> {
    return (await this.visibilidadService.obtenerCarnetPorId(idUsuario)) || '';
  }

  async canManageUserByCarnet(
    managerCarnet: string,
    subordinateCarnet: string,
  ): Promise<boolean> {
    if (managerCarnet === subordinateCarnet) return true;
    return await this.visibilidadService.puedeVer(
      managerCarnet,
      subordinateCarnet,
    );
  }

  async canManageUser(
    managerId: number,
    subordinateId: number,
    requesterRole?: string,
  ): Promise<boolean> {
    // 1. Si es el mismo usuario, siempre puede
    if (managerId === subordinateId) return true;

    // 2. Si es Admin, siempre puede
    if (isAdminRole(requesterRole)) return true;

    // 3. Verificar visibilidad jerárquica
    const hasAccess = await this.visibilidadService.verificarAccesoPorId(
      managerId,
      subordinateId,
    );

    if (!hasAccess) {
      const mCarnet =
        await this.visibilidadService.obtenerCarnetPorId(managerId);
      const sCarnet =
        await this.visibilidadService.obtenerCarnetPorId(subordinateId);
      console.warn(
        `[TasksService] Access Denied: Manager #${managerId} (${mCarnet || 'N/A'}) -> Subordinate #${subordinateId} (${sCarnet || 'N/A'})`,
      );
    }

    return hasAccess;
  }

  async crearSolicitudCambio(
    idUsuario: number,
    idTarea: number,
    campo: string,
    valorNuevo: string,
    motivo?: string,
  ) {
    return await this.planningService.solicitarCambio(
      idUsuario,
      idTarea,
      campo,
      valorNuevo,
      motivo || '',
    );
  }

  async miDiaGet(
    carnet: string,
    fechaStr: string,
    startDate?: string,
    endDate?: string,
  ) {
    const fecha = fechaStr ? new Date(fechaStr) : new Date();

    // Obtener check-in del día (si existe)
    const checkinHoy = await clarityRepo.obtenerCheckinPorFecha(carnet, fecha);

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    let tareas = await clarityRepo.getTareasUsuario(
      carnet,
      undefined,
      undefined,
      start,
      end,
    );

    // 2026-02-13: Sanitizar estados y agregar info de responsable al título si no es el usuario actual
    if (tareas) {
      tareas.forEach((t) => {
        if (typeof t.estado === 'string') t.estado = t.estado.trim();
        // [FIX] Mostrar responsable en el título si es distinto al usuario actual
        if (t.responsableCarnet && t.responsableCarnet !== carnet && t.responsableNombre) {
          t.titulo = `${t.titulo} (Asig: ${t.responsableNombre})`;
        }
      });
    }

    // 2026-02-04: Filtro para evitar que tareas viejas completadas aparezcan en la bandeja de selecciÃ³n
    // Solo mostramos pendientes, en curso, bloqueadas o las terminadas dentro del rango solicitado.
    tareas = (tareas || []).filter((t) => {
      const estado = t.estado; // ya estÃ¡ trimado
      if (estado === 'Hecha' || estado === 'Completada') {
        const fComp = t.fechaCompletado || t.fechaHecha;
        if (!fComp) return false;
        const dComp = new Date(fComp);
        // ✅ FIX: Si hay rango de fechas (calendario), mostrar Hechas dentro del rango
        if (start && end) {
          return dComp >= start && dComp <= end;
        }
        // Sin rango: solo mostrar las completadas hoy
        return dComp.toDateString() === fecha.toDateString();
      }
      return !['Descartada', 'Eliminada', 'Archivada'].includes(estado);
    });

    // ✅ FIX: Normalizar progreso de tareas Hechas con progreso 0
    tareas.forEach((t) => {
      if (t.estado === 'Hecha' && (!t.porcentaje || t.porcentaje === 0)) {
        t.porcentaje = 100;
      }
    });

    // Obtener agenda recurrente
    const agendaRecurrente =
      await this.recurrenciaService.obtenerAgendaRecurrente(fecha, carnet);

    // Obtener Backlog (Tareas Vencidas)
    let backlog = await clarityRepo.obtenerBacklog(carnet);

    // Excluir tareas que YA están en el checkin de hoy para no duplicar visualmente + Adjuntar responsable a título
    if (checkinHoy && checkinHoy.tareas && checkinHoy.tareas.length > 0) {
      const tareasEnCheckin = new Set(checkinHoy.tareas.map((t) => t.idTarea));
      backlog = backlog.filter((t) => !tareasEnCheckin.has(t.idTarea));
    }

    if (backlog) {
      backlog.forEach((t) => {
        if (t.responsableNombre && t.responsableNombre !== carnet) {
          // Nota: obtenerBacklog no devuelve carnet de responsable, pero sí el nombre. 
          // Usamos el nombre para el check visual.
          // Si t.responsableNombre existe y el SP/Query lo devolvió es porque se unió bien.
          t.titulo = `${t.titulo} (Asig: ${t.responsableNombre})`;
        }
      });
    }

    return {
      checkinHoy,
      tareasSugeridas: tareas,
      agendaRecurrente,
      backlog: backlog || [],
      bloqueosActivos: [],
      bloqueosMeCulpan: [],
    };
  }

  async checkinUpsert(dto: CheckinUpsertDto, carnet: string) {
    return await clarityRepo.checkinUpsert({
      carnet: dto.usuarioCarnet || carnet,
      fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      entregableTexto: dto.entregableTexto,
      nota: dto.nota || null,
      linkEvidencia: dto.linkEvidencia || null,
      estadoAnimo: dto.estadoAnimo || null,
      idNodo: dto.idNodo || null,
      entrego: dto.entrego,
      avanzo: dto.avanzo,
      extras: dto.extras,
      prioridad1: dto.prioridad1,
      prioridad2: dto.prioridad2,
      prioridad3: dto.prioridad3,
    });
  }

  async tareaCrearRapida(dto: TareaCrearRapidaDto) {
    // Resolve carnet before creating
    const carnet = dto.idUsuario
      ? await this.visibilidadService.obtenerCarnetPorId(dto.idUsuario)
      : null;

    const idTarea = await tasksRepo.crearTarea({
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      idCreador: dto.idUsuario,
      creadorCarnet: carnet || undefined, // PASS CARNET HERE
      idProyecto: dto.idProyecto || undefined,
      prioridad: dto.prioridad,
      esfuerzo: dto.esfuerzo,
      tipo: dto.tipo,
      fechaInicioPlanificada: dto.fechaInicioPlanificada
        ? new Date(dto.fechaInicioPlanificada)
        : undefined,
      fechaObjetivo: dto.fechaObjetivo
        ? new Date(dto.fechaObjetivo)
        : undefined,
      comportamiento: dto.comportamiento,
      idResponsable: dto.idResponsable,
      idTareaPadre: dto.idTareaPadre,
    });

    // NOTIFICACIÓN: Si se asignó a otra persona
    if (dto.idResponsable && dto.idResponsable !== dto.idUsuario) {
      this.enviarNotificacionAsignacion(
        idTarea,
        dto.idUsuario,
        dto.idResponsable,
        dto.titulo,
        dto.descripcion,
      );
    }

    // CO-ASIGNADOS (Participantes / Tarea Compartida)
    if (dto.coasignados && dto.coasignados.length > 0) {
      for (const idColaborador of dto.coasignados) {
        // Evitar el responsable duplicado
        if (idColaborador === dto.idResponsable) continue;

        await ejecutarSP('sp_Tarea_AgregarColaborador', {
          idTarea: { valor: idTarea, tipo: Int },
          idUsuario: { valor: idColaborador, tipo: Int },
        });

        // Enviar notificaciÃ³n personalizada a co-asignado
        if (idColaborador !== dto.idUsuario) {
          // Push notification
          this.enviarNotificacionAsignacion(
            idTarea,
            dto.idUsuario,
            idColaborador,
            `[Compartida] ${dto.titulo}`,
            dto.descripcion,
          );

          // Email de tarea compartida (usando template específico)
          try {
            const creador = await authRepo.obtenerUsuarioPorId(dto.idUsuario);
            const destino = await authRepo.obtenerUsuarioPorId(idColaborador);
            if (destino?.correo) {
              const fechaLimite = dto.fechaObjetivo
                ? new Date(dto.fechaObjetivo).toLocaleDateString('es-NI', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
                : 'Sin definir';

              await this.notificationService.sendSharedTaskEmail(
                destino.correo,
                {
                  nombre: destino.nombre || 'Colaborador',
                  compartidoPor: creador?.nombre || 'Alguien',
                  titulo: dto.titulo,
                  descripcion: dto.descripcion || 'Sin descripción.',
                  fecha: fechaLimite,
                  proyecto: 'Agenda Personal',
                  enlace: process.env.FRONTEND_URL || 'https://www.rhclaroni.com',
                },
              );
            }
          } catch (emailErr) {
            console.warn(
              '[TasksService] Error sending shared task email:',
              emailErr,
            );
          }
        }
      }
    }

    return await planningRepo.obtenerTareaPorId(idTarea);
  }

  async syncParticipantes(
    idTarea: number,
    coasignadosIds: number[],
    requestUserId: number,
  ) {
    // Validar si la tarea existe
    const tareaActual = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tareaActual) throw new NotFoundException('Tarea no encontrada');

    const actuales =
      tareaActual.asignados
        ?.filter((a: any) => a.tipo === 'Colaborador')
        ?.map((a: any) => a.idUsuario) || [];

    // Los que hay que agregar (estÃ¡n en coasignadosIds pero no en actuales)
    const toAdd = coasignadosIds.filter((id) => !actuales.includes(id));
    // Los que hay que eliminar (estÃ¡n en actuales pero ya no en coasignadosIds)
    const toRemove = actuales.filter(
      (id: number) => !coasignadosIds.includes(id),
    );

    for (const idTarget of toAdd) {
      if (idTarget === tareaActual.idResponsable) continue;
      await ejecutarSP('sp_Tarea_AgregarColaborador', {
        idTarea: { valor: idTarea, tipo: Int },
        idUsuario: { valor: idTarget, tipo: Int },
      });
      if (idTarget !== requestUserId) {
        this.enviarNotificacionAsignacion(
          idTarea,
          requestUserId,
          idTarget,
          `[Añadido] ${tareaActual.titulo}`,
          'Has sido añadido como participante.',
        );
      }
    }

    for (const idTarget of toRemove) {
      await ejecutarSP('sp_Tarea_RemoverColaborador', {
        idTarea: { valor: idTarea, tipo: Int },
        idUsuario: { valor: idTarget, tipo: Int },
      });
    }

    // Devolver la tarea actualizada
    return await planningRepo.obtenerTareaPorId(idTarea);
  }

  async crearTareaMasiva(dto: TareaMasivaDto, idCreador: number) {
    const createdIds: number[] = [];

    for (const idTarget of dto.idUsuarios) {
      const canManage = await this.canManageUser(idCreador, idTarget);
      if (!canManage) continue;

      const idTarea = await tasksRepo.crearTarea({
        titulo: dto.tareaBase.titulo,
        descripcion: dto.tareaBase.descripcion,
        idCreador: idCreador,
        idProyecto: dto.tareaBase.idProyecto,
        prioridad: dto.tareaBase.prioridad,
        esfuerzo: dto.tareaBase.esfuerzo,
        tipo: dto.tareaBase.tipo,
        fechaInicioPlanificada: dto.tareaBase.fechaInicioPlanificada
          ? new Date(dto.tareaBase.fechaInicioPlanificada)
          : undefined,
        fechaObjetivo: dto.tareaBase.fechaObjetivo
          ? new Date(dto.tareaBase.fechaObjetivo)
          : undefined,
        comportamiento: dto.tareaBase.comportamiento,
        idResponsable: idTarget,
      });
      createdIds.push(idTarea);

      // NOTIFICACIÃ“N (Individual por cada miembro)
      if (idTarget !== idCreador) {
        this.enviarNotificacionAsignacion(
          idTarea,
          idCreador,
          idTarget,
          dto.tareaBase.titulo,
          dto.tareaBase.descripcion,
        );
      }
    }
    return { created: createdIds.length, ids: createdIds };
  }

  async getAgendaCompliance(
    userId: number,
    roles: string[],
    fechaStr?: string,
  ) {
    const carnet = await this.resolveCarnet(userId);
    const date = fechaStr ? fechaStr : new Date().toISOString();

    // 1. Obtener a quién puede ver este usuario
    let visibleCarnets: string[] = [];

    // Si es Admin, ve a todos (menos a inactivos)
    const isAdmin = roles.some((r) => isAdminRole(r));

    if (isAdmin) {
      visibleCarnets = (await accesoRepo.listarEmpleadosActivos())
        .map((u) => u.carnet)
        .filter(Boolean);
    } else {
      visibleCarnets =
        await this.visibilidadService.obtenerCarnetsVisibles(carnet);
    }

    // 2. Obtener reporte de hoy para esos usuarios
    return await clarityRepo.obtenerEquipoHoy(visibleCarnets, date);
  }

  async tareasMisTareas(
    carnet: string,
    estado?: string,
    idProyecto?: number,
    startDate?: string,
    endDate?: string,
    query?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const tasks = await clarityRepo.getTareasUsuario(
      carnet,
      estado,
      idProyecto,
      start,
      end,
      query,
    );

    return tasks.map((t: any) => {
      let finalTitle = t.titulo || t.nombre || 'Sin Título';

      // Si la tarea tiene responsable y no es el usuario actual, agregar sufijo
      if (t.responsableCarnet && String(t.responsableCarnet).trim() !== String(carnet).trim()) {
        const shortName = t.responsableNombre
          ? t.responsableNombre.split(' ').slice(0, 2).join(' ')
          : 'Otro';
        finalTitle = `${finalTitle} (Asig: ${shortName})`;
      }

      return {
        ...t,
        titulo: finalTitle,
        nombre: finalTitle, // Mantener consistencia
      };
    });
  }

  async tareasHistorico(carnet: string, dias: number) {
    return await clarityRepo.obtenerTareasHistorico(carnet, dias);
  }

  async tareaActualizar(idTarea: number, updates: any, idUsuario: number) {
    // 0. Obtener estado actual para auditoría y validación
    const tareaActual = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tareaActual) throw new NotFoundException('Tarea no encontrada');

    // Verificar permisos
    const permiso = await this.planningService.checkEditPermission(
      idTarea,
      idUsuario,
    );
    if (!permiso.puedeEditar) throw new ForbiddenException('No tienes permiso');

    // Extract special fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { alcance, comentario, motivoBloqueo, ...dbUpdates } = updates;

    // Map DTO fields to DB columns
    const mappedUpdates: any = {};

    // Mapeo explicito DTO -> DB
    if (dbUpdates.titulo) mappedUpdates.nombre = dbUpdates.titulo;
    if (dbUpdates.descripcion !== undefined)
      mappedUpdates.descripcion = dbUpdates.descripcion;
    if (dbUpdates.estado) mappedUpdates.estado = dbUpdates.estado;
    if (dbUpdates.prioridad) mappedUpdates.prioridad = dbUpdates.prioridad;
    if (dbUpdates.progreso !== undefined)
      mappedUpdates.porcentaje = dbUpdates.progreso;
    if (dbUpdates.linkEvidencia !== undefined)
      mappedUpdates.linkEvidencia = dbUpdates.linkEvidencia;
    if (dbUpdates.idTareaPadre !== undefined)
      mappedUpdates.idTareaPadre = dbUpdates.idTareaPadre;

    // Campos opcionales que asumimos existen en p_Tareas o fallaran si no (pero son enviados por el front)
    if (dbUpdates.esfuerzo) mappedUpdates.esfuerzo = dbUpdates.esfuerzo;
    if (dbUpdates.tipo) mappedUpdates.tipo = dbUpdates.tipo;

    // Fechas
    if (dbUpdates.fechaObjetivo) {
      mappedUpdates.fechaObjetivo =
        typeof dbUpdates.fechaObjetivo === 'string'
          ? new Date(dbUpdates.fechaObjetivo)
          : dbUpdates.fechaObjetivo;
    }
    if (dbUpdates.fechaInicioPlanificada) {
      mappedUpdates.fechaInicioPlanificada =
        typeof dbUpdates.fechaInicioPlanificada === 'string'
          ? new Date(dbUpdates.fechaInicioPlanificada)
          : dbUpdates.fechaInicioPlanificada;
    }

    // Calculate human-readable diff for auditing
    const diff: any = {};
    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = tareaActual[key];
      if (newVal !== undefined && newVal !== oldVal) {
        // Formatting dates for better readability in logs
        if (
          newVal instanceof Date ||
          (typeof newVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(newVal))
        ) {
          const oldStr = oldVal
            ? new Date(oldVal).toISOString().split('T')[0]
            : 'N/A';
          const newStr = new Date(newVal).toISOString().split('T')[0];
          if (oldStr !== newStr) diff[key] = { from: oldStr, to: newStr };
        } else {
          diff[key] = { from: oldVal ?? 'N/A', to: newVal };
        }
      }
    }

    // V2: Actualizar usando Repo Unificado
    const updateParams: any = {
      titulo: mappedUpdates.nombre,
      descripcion: mappedUpdates.descripcion,
      estado: mappedUpdates.estado,
      prioridad: mappedUpdates.prioridad,
      progreso: mappedUpdates.porcentaje,
      fechaObjetivo: mappedUpdates.fechaObjetivo,
      fechaInicioPlanificada: mappedUpdates.fechaInicioPlanificada,
      linkEvidencia: mappedUpdates.linkEvidencia,
      requiereEvidencia: updates.requiereEvidencia, // nuevo campo
      idTareaPadre: updates.idTareaPadre,
      idResponsable: updates.idResponsable,
    };

    // ✅ FIX: Cuando una tarea se marca como Hecha, forzar progreso a 100 y fecha
    if (mappedUpdates.estado === 'Hecha') {
      updateParams.progreso = 100;
      updateParams.fechaCompletado = new Date();
    }

    // Execute Update
    if (Object.keys(updateParams).length > 0) {
      await tasksRepo.actualizarTarea(idTarea, updateParams);

      // NOTIFICACIÃ“N: Si se reasignÃ³ a un nuevo responsable (diferente al creador/actor)
      if (
        updates.idResponsable &&
        updates.idResponsable !== tareaActual.idResponsable &&
        updates.idResponsable !== idUsuario
      ) {
        this.enviarNotificacionAsignacion(
          idTarea,
          idUsuario,
          updates.idResponsable,
          updates.titulo || tareaActual.titulo,
          updates.descripcion || tareaActual.descripcion,
        );
      }
    }

    // V3: Propagar cambios a la jerarquÃ­a (Roll-up)
    const padreCambio =
      updates.idTareaPadre !== undefined &&
      updates.idTareaPadre !== tareaActual.idTareaPadre;
    const metricsCambio =
      updates.porcentaje !== undefined || updates.estado !== undefined;

    if (padreCambio) {
      // 1. Recalcular Viejo Padre (directamente, porque ya perdimos el link)
      if (tareaActual.idTareaPadre) {
        await tasksRepo.recalcularJerarquia(
          undefined,
          tareaActual.idTareaPadre,
        );
      }
      // 2. Recalcular Nuevo Padre (via hijo, ahora ya estÃ¡ linkeado)
      if (updates.idTareaPadre) {
        await tasksRepo.recalcularJerarquia(idTarea);
      }
    } else if (metricsCambio && tareaActual.idTareaPadre) {
      // Solo mÃ©tricas, mismo padre -> Rollup standard
      await tasksRepo.recalcularJerarquia(idTarea);
    }

    // Registrar en auditorÃ­a si hubo cambios
    if (Object.keys(diff).length > 0) {
      await this.auditService.log({
        accion: 'TAREA_ACTUALIZADA',
        recurso: 'Tarea',
        recursoId: String(idTarea),
        idUsuario,
        datosAnteriores: tareaActual,
        datosNuevos: { ...tareaActual, ...updateParams },
        detalles: { diff, source: 'Bitácora/Modal' },
      });
    }

    // Handle Bloqueo logic
    if (updates.estado === 'Bloqueada' && motivoBloqueo) {
      await clarityRepo.bloquearTarea({
        idTarea,
        idOrigenUsuario: idUsuario,
        motivo: motivoBloqueo,
        destinoTexto: 'Bloqueo registrado desde Bitácora',
      });
    }

    return await planningRepo.obtenerTareaPorId(idTarea);
  }

  async assertCanManageTask(idTarea: number, carnet: string) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    // Dueño o ejecutor puede
    if (tarea.creadorCarnet === carnet || tarea.responsableCarnet === carnet) return;

    // Obtener info del usuario para ver ID
    const user = await authRepo.obtenerUsuarioPorIdentificador(carnet);
    if (!user) throw new ForbiddenException('Usuario no válido');

    if (tarea.idCreador === user.idUsuario || tarea.idResponsable === user.idUsuario) return;

    if (tarea.idProyecto) {
      const isColaborator = await colaboradoresRepo.esColaborador(tarea.idProyecto, user.idUsuario);
      if (isColaborator) return;
    }

    throw new ForbiddenException(
      'No tienes permiso para gestionar esta tarea (Se requiere ser Admin, Creador, Asignado o Colaborador del Proyecto vinculado).',
    );
  }

  async tareaEliminar(
    idTarea: number,
    carnet: string,
    motivo?: string,
    rolGlobal?: string,
  ) {
    if (isAdminRole(rolGlobal)) {
      await clarityRepo.eliminarTareaAdmin(
        idTarea,
        motivo || 'Eliminación Admin',
      );
    } else {
      await this.assertCanManageTask(idTarea, carnet);
      await clarityRepo.eliminarTarea(idTarea, carnet, motivo);
    }
    return { success: true };
  }

  async tareaDescartarRecursivo(
    idTarea: number,
    carnet: string,
    motivo: string = 'Descarte manual',
  ) {
    await this.assertCanManageTask(idTarea, carnet);
    await clarityRepo.descartarTareaRecursivo(idTarea, carnet, motivo);
    return { success: true, message: 'Tarea y subtareas descartadas' };
  }

  async tareaMoverAProyecto(
    idTarea: number,
    idProyectoDestino: number,
    idUsuarioEjecutor: number,
    moverSubtareas: boolean = true,
  ) {
    const carnet = await this.resolveCarnet(idUsuarioEjecutor);

    // Mover en Repositorio (Ya incluye validaciones y logs en SQL)
    const result = await clarityRepo.moverTareaAProyecto(idTarea, idProyectoDestino, idUsuarioEjecutor, moverSubtareas);
    const info = result[0];

    // Log adicional en AuditService para visibilidad en frontend de logs
    await this.auditService.log({
      idUsuario: idUsuarioEjecutor,
      carnet: carnet,
      accion: AccionAudit.TAREA_MOVIDA,
      recurso: RecursoAudit.TAREA,
      recursoId: idTarea.toString(),
      detalles: {
        tarea: info.nombreTarea,
        origen: info.proyectoOrigen,
        destino: info.proyectoDestino,
        moverSubtareas
      }
    });

    return { success: true, message: `Tarea movida a ${info.proyectoDestino}` };
  }

  async tareaObtener(idTarea: number, idSolicitante?: number) {
    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    // Validar acceso si se proporciona idSolicitante
    if (idSolicitante) {
      await this.planningService.verificarAccesoTarea(idSolicitante, tarea);
    }

    return tarea;
  }

  // Alias para compatibilidad interna
  async tareasUsuario(carnet: string) {
    return this.tareasMisTareas(carnet);
  }



  // ===============================================
  // NUEVOS ENDPOINTS: Avance, Workload, AuditLogs
  // ===============================================

  async registrarAvance(
    idTarea: number,
    progreso: number,
    comentario: string | undefined,
    idUsuario: number,
  ) {
    // Obtener tarea actual para verificar estado anterior
    const tareaActual = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tareaActual) throw new NotFoundException('Tarea no encontrada');

    const updates: any = { porcentaje: progreso };

    // Si es el primer avance (progreso anterior era 0 y ahora > 0), establecer fechaInicioReal
    if (
      (tareaActual.porcentaje === 0 || tareaActual.porcentaje === null) &&
      progreso > 0
    ) {
      updates.fechaInicioReal = new Date();
      updates.estado = 'EnCurso';
    }

    // Si llega a 100%, establecer fechaFinReal y estado Hecha
    if (progreso >= 100) {
      updates.fechaFinReal = new Date();
      updates.estado = 'Hecha';
      updates.porcentaje = 100;
    }

    await planningRepo.actualizarTarea(idTarea, updates);

    // Notificar Avance/Comentario a los interesados
    if (comentario) {
      const destinos = [
        tareaActual.idResponsable,
        tareaActual.idCreador,
      ].filter(Boolean) as number[];
      this.notificarActualizacionTarea(
        idTarea,
        idUsuario,
        destinos,
        'comentó en tu tarea',
        `"${comentario}" (Avance: ${updates.porcentaje || progreso}%)`,
      );
    }

    // Propagar al padre
    if (tareaActual.idTareaPadre) {
      await tasksRepo.recalcularJerarquia(idTarea);
    }

    // [2026-01-28] Persistir comentario como Avance real
    if (comentario) {
      await tasksRepo.crearAvance({
        idTarea,
        idUsuario,
        progreso: updates.porcentaje || progreso,
        comentario,
      });
    }

    // Registrar en auditoría
    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { progreso, comentario, tipo: 'Avance' },
    });

    return await planningRepo.obtenerTareaPorId(idTarea);
  }

  async eliminarAvance(idLog: number, idUsuario: number) {
    // TODO: Validate ownership if critical
    await tasksRepo.eliminarAvance(idLog);
    return { success: true };
  }

  /**
   * Motor de Inteligencia de Jerarquía (Roll-up)
   * Recalcula progreso y estado del padre basado en sus hijos de forma recursiva.
   */
  // Método privado recalcularJerarquia eliminado en favor de lógica en BD (tasksRepo.recalcularJerarquia)
  async getWorkload(carnet: string, startDate?: string, endDate?: string) {
    try {
      // 2. Obtener TODOS los empleados que este usuario tiene permiso de ver
      const allUsersList =
        await this.visibilidadService.obtenerEmpleadosVisibles(carnet);
      const allCarnets = allUsersList.map((u) => u.carnet).filter(Boolean);
      if (allCarnets.length === 0) return { users: [], tasks: [], agenda: [] };

      // 4. Obtener tareas usando CARNETS
      const allTasks =
        await clarityRepo.obtenerTareasMultiplesUsuarios(allCarnets);

      // 5. Obtener Agenda del Equipo (Checkins)
      const today = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
      const end = endDate
        ? new Date(endDate)
        : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
      const agenda = await clarityRepo.obtenerAgendaEquipo(
        allCarnets,
        start,
        end,
      );

      // 6. Formatear usuarios para la vista de Workload
      const formattedUsers = allUsersList.map((u: any) => ({
        idUsuario: u.idUsuario,
        nombre: u.nombre || u.nombreCompleto || 'Sin Nombre',
        correo: u.correo,
        carnet: u.carnet,
        rol: { nombre: u.subgerencia || u.gerencia || u.cargo || 'General' },
        tareasActivas: allTasks.filter(
          (t: any) =>
            t.usuarioCarnet === u.carnet &&
            ['Pendiente', 'EnCurso', 'Bloqueada'].includes(t.estado),
        ).length,
        tareasCompletadas: allTasks.filter(
          (t: any) => t.usuarioCarnet === u.carnet && t.estado === 'Hecha',
        ).length,
      }));

      return {
        users: formattedUsers,
        tasks: allTasks,
        agenda, // Add this property
      };
    } catch (error) {
      console.error('[TasksService] Error getting workload:', error);
      return { users: [], tasks: [], agenda: [] };
    }
  }

  async getAuditLogsByTask(idTarea: number) {
    return await this.auditService.getHistorialEntidad(
      'Tarea',
      String(idTarea),
    );
  }


  async getAuditLogById(id: number) {
    return await this.auditService.getAuditLogDetalle(id);
  }

  async tareaRevalidar(
    idTarea: number,
    body: TareaRevalidarDto,
    idUsuario: number,
  ) {
    const { accion, idUsuarioOtro, razon } = body;

    const tarea = await planningRepo.obtenerTareaPorId(idTarea);
    if (!tarea) throw new NotFoundException('Tarea no encontrada');

    switch (accion) {
      case 'Sigue':
        // Actualizar fecha objetivo a hoy para tareas arrastradas
        await planningRepo.actualizarTarea(idTarea, {
          fechaObjetivo: new Date(),
        });
        break;

      case 'HechaPorOtro':
        await planningRepo.actualizarTarea(idTarea, {
          estado: 'Hecha',
          fechaCompletado: new Date(),
          porcentaje: 100,
        });
        if (idUsuarioOtro) {
          await clarityRepo.asignarUsuarioTarea(
            idTarea,
            idUsuarioOtro,
            'Ejecutor',
          );
        }
        break;

      case 'NoAplica':
        await planningRepo.actualizarTarea(idTarea, { estado: 'Descartada' });
        break;

      case 'Reasignar':
        if (!idUsuarioOtro)
          throw new BadRequestException(
            'Se requiere idUsuarioOtro para reasignar',
          );
        await clarityRepo.reasignarResponsable(idTarea, idUsuarioOtro);

        // NOTIFICACIÓN
        if (idUsuarioOtro !== idUsuario) {
          this.enviarNotificacionAsignacion(
            idTarea,
            idUsuario,
            idUsuarioOtro,
            tarea.titulo,
            tarea.descripcion,
          );
        }
        break;
    }

    // Auditoría
    await this.auditService.log({
      accion: 'TAREA_REVALIDADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { accion, idUsuarioOtro, razon },
    });

    return { success: true };
  }

  // KPI Dashboard (Carnet-First)
  async getDashboardKPIs(carnet: string) {
    try {
      return await clarityRepo.obtenerKpisDashboard(carnet);
    } catch (error) {
      console.error(
        `[TasksService] Error fetching KPIs for carnet ${carnet}:`,
        error,
      );
      return {
        resumen: {
          total: 0,
          hechas: 0,
          pendientes: 0,
          bloqueadas: 0,
          promedioAvance: 0,
        },
        proyectos: [],
      };
    }
  }

  private async enviarNotificacionAsignacion(
    idTarea: number,
    idCreador: number,
    idDestino: number,
    titulo: string,
    descripcion?: string,
  ) {
    try {
      const creador = await authRepo.obtenerUsuarioPorId(idCreador);
      const nombreCreador = creador?.nombre || 'Alguien';
      const destino = await authRepo.obtenerUsuarioPorId(idDestino);
      const tarea = (await tasksRepo.obtenerTarea(idTarea)) as any;

      const tokens = await this.notificationService.getTokensForUser(idDestino);
      const body = descripcion
        ? `${descripcion.substring(0, 50)}${descripcion.length > 50 ? '...' : ''}`
        : 'Nueva tarea asignada';

      if (tokens && tokens.length > 0) {
        await this.notificationService.sendPushToUser(
          tokens,
          `ðŸ“ ${nombreCreador} te asignó³: ${titulo}`,
          body,
          {
            type: 'ASSIGNMENT',
            taskId: idTarea,
            creatorId: idCreador,
          },
        );
      }

      if (destino && destino.correo) {
        const fechaLimite = tarea?.fechaObjetivo
          ? new Date(tarea.fechaObjetivo).toLocaleDateString('es-NI', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
          : 'Sin definir';

        await this.notificationService.sendTaskAssignmentEmail(destino.correo, {
          nombre: destino.nombre || 'Colaborador',
          asignadoPor: nombreCreador,
          titulo: titulo,
          descripcion: descripcion || 'Sin descripción detallada.',
          prioridad: tarea?.prioridad || 'Normal',
          fechaLimite,
          proyecto: tarea?.proyectoNombre || 'Sin proyecto',
          enlace: process.env.FRONTEND_URL || 'https://www.rhclaroni.com',
        });
      }
    } catch (error) {
      console.error('[TasksService] Error enviando notificacion:', error);
    }
  }

  async notificarActualizacionTarea(
    idTarea: number,
    idOrigen: number,
    idDestinos: number[],
    accionTexto: string,
    descripcion: string,
  ) {
    try {
      const origen = await authRepo.obtenerUsuarioPorId(idOrigen);
      const nombreOrigen = origen?.nombre || 'Alguien';

      const cuerpoPush = descripcion
        ? `${descripcion.substring(0, 50)}${descripcion.length > 50 ? '...' : ''}`
        : 'Actualización en tarea';
      const tarea = await planningRepo.obtenerTareaPorId(idTarea);
      const tituloPush = tarea
        ? `💬 ${nombreOrigen} ${accionTexto}: ${tarea.titulo}`
        : `💬 ${nombreOrigen} ${accionTexto}`;

      for (const idDestino of new Set(idDestinos)) {
        if (idDestino === idOrigen) continue;

        const tokens =
          await this.notificationService.getTokensForUser(idDestino);
        if (tokens && tokens.length > 0) {
          await this.notificationService.sendPushToUser(
            tokens,
            tituloPush,
            cuerpoPush,
            {
              type: 'UPDATE',
              taskId: idTarea,
              creatorId: idOrigen,
            },
          );
        }
      }
    } catch (error) {
      console.error('[TasksService] Error notificar avance/bloqueo:', error);
    }
  }
}


