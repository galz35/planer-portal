import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { AuditService } from '../common/audit.service';
import { BloqueosService } from './bloqueos.service';
import { ProyectoService } from './proyecto.service';
import { PlanningService } from '../planning/planning.service';
import * as clarityRepo from './clarity.repo';
import {
  TareaCrearRapidaDto,
  CheckinUpsertDto,
  FechaQueryDto,
  TareaActualizarDto,
  TareaRevalidarDto,
  BloqueoCrearDto,
  TaskFilterDto,
  TareaMasivaDto,
} from './dto/clarity.dtos';

@ApiTags('Clarity - Tareas Core')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class ClarityController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService,
    private readonly bloqueosService: BloqueosService,
    private readonly proyectoService: ProyectoService,
    private readonly planningService: PlanningService,
  ) { }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración usuario (Mock)' })
  async getConfig(@Request() req) {
    const agendaConfig = await clarityRepo.getAgendaConfig(req.user.userId);
    return { vistaPreferida: 'Cards', rutinas: '[]', agendaConfig };
  }

  @Post('config')
  @ApiOperation({ summary: 'Actualizar configuración usuario' })
  async setConfig(
    @Request() req,
    @Body() body: { agendaConfig?: any; vistaPreferida?: string },
  ) {
    if (body.agendaConfig) {
      await clarityRepo.setAgendaConfig(req.user.userId, body.agendaConfig);
    }
    return { success: true };
  }

  @Post('checkins')
  @ApiOperation({ summary: 'Registrar o actualizar check-in diario' })
  async upsertCheckin(@Body() dto: CheckinUpsertDto, @Request() req) {
    const carnet =
      req.user.carnet ||
      (await this.tasksService.resolveCarnet(req.user.userId));
    return this.tasksService.checkinUpsert(dto, carnet);
  }

  @Post(['tareas/rapida', 'tasks']) // Alias Sync Móvil
  @ApiOperation({ summary: 'Crear tarea rápida' })
  async crearTareaRapida(@Body() dto: TareaCrearRapidaDto, @Request() req) {
    const targetUserId = dto.idUsuario ? Number(dto.idUsuario) : req.user.userId;

    if (targetUserId && targetUserId !== req.user.userId) {
      const canManage = await this.tasksService.canManageUser(
        req.user.userId,
        targetUserId,
        req.user.rolGlobal,
      );
      if (!canManage)
        throw new ForbiddenException('No puedes crear tareas para este usuario.');
      dto.idUsuario = targetUserId;
    } else {
      dto.idUsuario = req.user.userId;
    }
    return this.tasksService.tareaCrearRapida(dto);
  }

  @Post('tareas/masiva')
  @ApiOperation({ summary: 'Crear tarea masiva (asignar a múltiples)' })
  async crearTareaMasiva(@Body() dto: TareaMasivaDto, @Request() req) {
    if (dto.idUsuarios && dto.idUsuarios.length > 50) {
      throw new ForbiddenException('Máximo 50 usuarios por creación masiva.');
    }
    return this.tasksService.crearTareaMasiva(dto, req.user.userId);
  }

  @Get(['tareas/mias', 'tasks/me']) // Alias Sync Móvil
  @ApiOperation({ summary: 'Obtener mis tareas' })
  async getTareasMias(@Request() req, @Query() filters: TaskFilterDto) {
    const carnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    return this.tasksService.tareasMisTareas(
      carnet,
      filters.estado,
      filters.idProyecto,
      filters.startDate,
      filters.endDate,
    );
  }

  @Get('tareas/:id')
  @ApiOperation({ summary: 'Obtener detalle de tarea (con subtasks)' })
  async getTarea(@Param('id') id: number, @Request() req) {
    return this.tasksService.tareaObtener(id, req.user.userId);
  }

  @Patch(['tareas/:id', 'tasks/:id']) // Compatibilidad
  @ApiOperation({ summary: 'Actualizar tarea' })
  async actualizarTarea(@Param('id') id: number, @Body() dto: TareaActualizarDto, @Request() req) {
    return this.tasksService.tareaActualizar(id, dto, req.user.userId);
  }

  @Post(['tareas/:id/clonar', 'tasks/:id/clone'])
  @ApiOperation({ summary: 'Clonar tarea' })
  async clonarTarea(@Param('id') id: number, @Request() req) {
    return this.planningService.cloneTask(req.user.userId, id);
  }

  @Post('tareas/:id/revalidar')
  @ApiOperation({ summary: 'Revalidar o reasignar tarea' })
  async revalidarTarea(@Param('id') id: number, @Body() body: TareaRevalidarDto, @Request() req) {
    return this.tasksService.tareaRevalidar(id, body, req.user.userId);
  }

  @Post('tareas/:id/participantes')
  @ApiOperation({ summary: 'Actualizar lista de participantes' })
  async syncParticipantes(@Param('id') id: number, @Body() body: { coasignados: number[] }, @Request() req) {
    return this.tasksService.syncParticipantes(id, body.coasignados, req.user.userId);
  }

  @Post('tareas/:id/recordatorio')
  async crearRecordatorio(@Param('id') id: number, @Body() body: { fechaHora: string; nota?: string }, @Request() req) {
    return this.tasksService.crearRecordatorio(id, req.user.userId, body.fechaHora, body.nota);
  }

  @Delete('recordatorios/:id')
  async eliminarRecordatorio(@Param('id') id: number, @Request() req) {
    return this.tasksService.eliminarRecordatorio(id, req.user.userId);
  }

  @Get('recordatorios')
  async obtenerRecordatorios(@Request() req) {
    return this.tasksService.obtenerMisRecordatorios(req.user.userId);
  }

  @Get('agenda/:targetCarnet')
  async getMemberAgenda(@Param('targetCarnet') targetCarnet: string, @Query() query: FechaQueryDto, @Request() req) {
    const requesterCarnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    if (requesterCarnet !== targetCarnet) {
      const hasAccess = await this.tasksService.canManageUserByCarnet(requesterCarnet, targetCarnet);
      if (!hasAccess) throw new ForbiddenException('No tienes permisos.');
    }
    return this.tasksService.miDiaGet(targetCarnet, query.fecha, query.startDate, query.endDate);
  }

  @Get('tareas/historico/:carnet')
  async getTareasHistorico(@Param('carnet') carnet: string, @Query('dias') dias: number = 30, @Request() req) {
    const requesterCarnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    if (requesterCarnet !== carnet) {
      const hasAccess = await this.tasksService.canManageUserByCarnet(requesterCarnet, carnet);
      if (!hasAccess) throw new ForbiddenException('No tienes permisos.');
    }
    return this.tasksService.tareasHistorico(carnet, dias);
  }

  @Delete('tareas/:id')
  async eliminarTarea(@Param('id') id: number, @Request() req) {
    const carnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    return this.tasksService.tareaEliminar(id, carnet, undefined, req.user.rolGlobal);
  }

  @Post('tareas/:id/descartar')
  async descartarTarea(@Param('id') id: number, @Body() body: { motivo?: string }, @Request() req) {
    const carnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    return this.tasksService.tareaDescartarRecursivo(id, carnet, body?.motivo || 'Descarte manual');
  }

  @Post('tareas/:id/mover')
  @ApiOperation({ summary: 'Mover tarea y sus subtareas a otro proyecto' })
  async moverTarea(
    @Param('id') id: number,
    @Body() body: { idProyectoDestino: number; moverSubtareas?: boolean },
    @Request() req,
  ) {
    return this.tasksService.tareaMoverAProyecto(
      id,
      body.idProyectoDestino,
      req.user.userId,
      body.moverSubtareas ?? true,
    );
  }

  @Post('tareas/:id/avance')
  async registrarAvance(@Param('id') id: number, @Body() body: { progreso: number; comentario?: string }, @Request() req) {
    return this.tasksService.registrarAvance(id, body.progreso, body.comentario, req.user.userId);
  }

  @Delete('tareas/avance/:id')
  async eliminarAvance(@Param('id') id: number, @Request() req) {
    return this.tasksService.eliminarAvance(id, req.user.userId);
  }

  @Get('planning/workload')
  async getWorkload(@Request() req, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const carnet = req.user.carnet || (await this.tasksService.resolveCarnet(req.user.userId));
    return this.tasksService.getWorkload(carnet, startDate, endDate);
  }

  @Get('audit-logs/task/:idTarea')
  async getAuditLogsByTask(@Param('idTarea') idTarea: number, @Request() req) {
    await this.tasksService.tareaObtener(idTarea, req.user.userId);
    return this.tasksService.getAuditLogsByTask(idTarea);
  }

  @Post('tareas/solicitud-cambio')
  async solicitarCambio(@Body() body: { idTarea: number; campo: string; valorNuevo: string; motivo: string }, @Request() req) {
    return this.tasksService.crearSolicitudCambio(req.user.userId, body.idTarea, body.campo, body.valorNuevo, body.motivo);
  }

  @Post('bloqueos')
  async crearBloqueo(@Body() dto: BloqueoCrearDto, @Request() req) {
    dto.idOrigenUsuario = req.user.userId;
    return this.bloqueosService.bloqueoCrear(dto);
  }

  @Get('tareas/:id/bloqueos')
  async getBloqueosByTask(@Param('id') id: number) {
    return this.bloqueosService.getBloqueosByTarea(id);
  }

  @Patch('bloqueos/:id/resolver')
  async resolverBloqueo(@Param('id') id: number, @Body() body: any, @Request() req) {
    return this.bloqueosService.bloqueoResolver(id, body, req.user.userId);
  }

  @Get('tareas/solicitud-cambio/pendientes')
  @ApiOperation({ summary: 'Obtener solicitudes de cambio pendientes para el líder' })
  async getSolicitudesPendientes(@Request() req) {
    return this.proyectoService.getSolicitudesPendientes(req.user.userId);
  }

  @Post('tareas/solicitud-cambio/:id/resolver')
  @ApiOperation({ summary: 'Resolver solicitud de cambio (Aprobar/Rechazar)' })
  async resolverSolicitud(
    @Param('id') id: number,
    @Body() body: { accion: 'Aprobar' | 'Rechazar'; comentario?: string },
    @Request() req,
  ) {
    return this.proyectoService.resolverSolicitud(
      id,
      body.accion,
      req.user.userId,
      body.comentario,
    );
  }

  @Post('asignaciones')
  @ApiOperation({ summary: 'Asignar un usuario a una tarea' })
  async asignarUsuario(
    @Body() body: { idTarea: number; idUsuarioAsignado: number },
    @Request() req,
  ) {
    await clarityRepo.asignarUsuarioTarea(
      body.idTarea,
      body.idUsuarioAsignado,
      'Responsable',
    );
    return { success: true, message: 'Usuario asignado correctamente' };
  }
}
