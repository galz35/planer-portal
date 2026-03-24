import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';

@Controller('planning')
@UseGuards(AuthGuard('jwt'))
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ============================
  // Helpers
  // ============================
  private getUserId(req: any): number {
    const id = req?.user?.userId ?? req?.user?.idUsuario ?? req?.user?.id;
    const num = Number(id);
    if (!num || Number.isNaN(num)) {
      throw new BadRequestException('Token inválido: no existe userId.');
    }
    return num;
  }

  @Post('check-permission')
  async checkPermission(
    @Request() req: any,
    @Body() body: { idTarea: number },
  ) {
    const userId = this.getUserId(req);
    const idTarea = Number(body?.idTarea);
    if (!idTarea || Number.isNaN(idTarea)) {
      throw new BadRequestException('idTarea inválido.');
    }
    return await this.planningService.checkEditPermission(idTarea, userId);
  }

  @Post('request-change')
  async requestChange(
    @Request() req: any,
    @Body()
    body: { idTarea: number; campo: string; valorNuevo: any; motivo: string },
  ) {
    const userId = this.getUserId(req);

    const idTarea = Number(body?.idTarea);
    if (!idTarea || Number.isNaN(idTarea))
      throw new BadRequestException('idTarea inválido.');

    const campo = String(body?.campo || '').trim();
    const motivo = String(body?.motivo || '').trim();

    if (!campo) throw new BadRequestException('campo requerido.');
    if (!motivo || motivo.length < 5)
      throw new BadRequestException('motivo muy corto.');

    return await this.planningService.solicitarCambio(
      userId,
      idTarea,
      campo,
      body?.valorNuevo,
      motivo,
    );
  }

  @Get('pending')
  async getPendingRequests(@Request() req: any) {
    return await this.planningService.getSolicitudesPendientes(
      this.getUserId(req),
    );
  }

  @Get('approvals')
  @ApiOperation({ summary: 'Alias para pending requests (usado por frontend)' })
  async getApprovals(@Request() req: any) {
    return await this.planningService.getSolicitudesPendientes(
      this.getUserId(req),
    );
  }

  @Post('resolve')
  async resolveRequest(
    @Request() req: any,
    @Body()
    body: {
      idSolicitud: number;
      accion: 'Aprobar' | 'Rechazar';
      comentario?: string;
    },
  ) {
    const userId = this.getUserId(req);

    const idSolicitud = Number(body?.idSolicitud);
    if (!idSolicitud || Number.isNaN(idSolicitud))
      throw new BadRequestException('idSolicitud inválido.');

    const accion = body?.accion;
    if (accion !== 'Aprobar' && accion !== 'Rechazar') {
      throw new BadRequestException('accion debe ser Aprobar o Rechazar.');
    }

    return await this.planningService.resolverSolicitud(
      userId,
      idSolicitud,
      accion,
      body?.comentario,
    );
  }

  @Post('approvals/:idSolicitud/resolve')
  @ApiOperation({
    summary: 'Resolver solicitud de cambio (ruta usada por frontend)',
  })
  async resolveApproval(
    @Request() req: any,
    @Param('idSolicitud', ParseIntPipe) idSolicitud: number,
    @Body() body: { accion: 'Aprobar' | 'Rechazar'; comentario?: string },
  ) {
    const userId = this.getUserId(req);

    const accion = body?.accion;
    if (accion !== 'Aprobar' && accion !== 'Rechazar') {
      throw new BadRequestException('accion debe ser Aprobar o Rechazar.');
    }

    return await this.planningService.resolverSolicitud(
      userId,
      idSolicitud,
      accion,
      body?.comentario,
    );
  }

  @Post('update-operative')
  async updateOperative(
    @Request() req: any,
    @Body() body: { idTarea: number; updates: any },
  ) {
    const userId = this.getUserId(req);
    const idTarea = Number(body?.idTarea);
    if (!idTarea || Number.isNaN(idTarea))
      throw new BadRequestException('idTarea inválido.');
    return await this.planningService.updateTareaOperativa(
      userId,
      idTarea,
      body?.updates,
    );
  }

  @Get('plans')
  async getPlans(
    @Request() req: any,
    @Query('idUsuario') idUsuario: any,
    @Query('mes') mes: any,
    @Query('anio') anio: any,
  ) {
    const solicitante = this.getUserId(req);

    const objetivo = idUsuario ? Number(idUsuario) : solicitante;
    const m = Number(mes);
    const a = Number(anio);

    if (!objetivo || Number.isNaN(objetivo))
      throw new BadRequestException('idUsuario inválido.');
    if (!m || Number.isNaN(m)) throw new BadRequestException('mes inválido.');
    if (!a || Number.isNaN(a)) throw new BadRequestException('anio inválido.');

    return await this.planningService.getPlans(solicitante, objetivo, m, a);
  }

  @Post('plans')
  async upsertPlan(@Request() req: any, @Body() body: any) {
    return await this.planningService.upsertPlan(this.getUserId(req), body);
  }

  @Get('stats')
  async getStats(
    @Request() req: any,
    @Query('mes') mes: any,
    @Query('anio') anio: any,
  ) {
    const userId = this.getUserId(req);
    const m = Number(mes);
    const a = Number(anio);
    return await this.analyticsService.getDashboardStats(userId, m, a);
  }

  @Get('stats/compliance')
  async getGlobalCompliance(@Query('mes') mes: any, @Query('anio') anio: any) {
    return await this.analyticsService.getGlobalCompliance(
      Number(mes),
      Number(anio),
    );
  }

  @Get('stats/performance')
  async getAreaPerformance(@Query('mes') mes: any, @Query('anio') anio: any) {
    return await this.analyticsService.getAreaPerformance(
      Number(mes),
      Number(anio),
    );
  }

  @Get('stats/bottlenecks')
  async getBottlenecks() {
    return await this.analyticsService.getBottlenecks();
  }

  @Get('team')
  async getMyTeam(@Request() req: any) {
    return await this.planningService.getMyTeam(this.getUserId(req));
  }

  @Get('my-projects')
  @ApiOperation({
    summary: 'Obtiene proyectos visibles según jerarquía del usuario',
  })
  async getMyProjects(@Request() req: any) {
    return await this.planningService.getMyProjects(this.getUserId(req));
  }

  @Post('tasks/:id/clone')
  async cloneTask(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return await this.planningService.cloneTask(this.getUserId(req), id);
  }

  @Post('reassign')
  async reassignTasks(@Body() body: any, @Request() req: any) {
    const userId = this.getUserId(req);
    const fromUserId = Number(body?.fromUserId);
    const toUserId = Number(body?.toUserId);
    const taskIds = Array.isArray(body?.taskIds)
      ? body.taskIds.map((x: any) => Number(x))
      : [];

    if (!fromUserId || Number.isNaN(fromUserId))
      throw new BadRequestException('fromUserId inválido.');
    if (!toUserId || Number.isNaN(toUserId))
      throw new BadRequestException('toUserId inválido.');
    if (!taskIds.length || taskIds.some((x: number) => !x || Number.isNaN(x))) {
      throw new BadRequestException('taskIds inválido.');
    }

    return await this.planningService.reassignTasks(
      userId,
      fromUserId,
      toUserId,
      taskIds,
    );
  }

  @Get('tasks/:id/history')
  async getTaskHistory(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    // importante: service valida visibilidad/permiso
    return await this.planningService.getTaskHistory(id, this.getUserId(req));
  }

  @Post('plans/:id/close')
  async closePlan(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return await this.planningService.closePlan(this.getUserId(req), id);
  }

  // ==========================================
  // AVANCE MENSUAL (Solo Plan de Trabajo)
  // ==========================================
  @Post('tasks/:id/avance-mensual')
  @ApiOperation({ summary: 'Registrar avance mensual de tarea larga' })
  async registrarAvanceMensual(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      anio: number;
      mes: number;
      porcentajeMes: number;
      comentario?: string;
    },
    @Request() req: any,
  ) {
    return await this.planningService.registrarAvanceMensual(
      id,
      Number(body?.anio),
      Number(body?.mes),
      Number(body?.porcentajeMes),
      body?.comentario ? String(body.comentario) : null,
      this.getUserId(req),
    );
  }

  @Get('tasks/:id/avance-mensual')
  @ApiOperation({ summary: 'Obtener historial de avance mensual' })
  async obtenerHistorialMensual(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    return await this.planningService.obtenerHistorialMensual(
      id,
      this.getUserId(req),
    );
  }

  // ==========================================
  // GRUPOS / FASES (Solo Plan de Trabajo)
  // ==========================================
  @Post('tasks/:id/crear-grupo')
  @ApiOperation({ summary: 'Convertir tarea en grupo/contenedor de fases' })
  async crearGrupo(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return await this.planningService.crearGrupo(id, this.getUserId(req));
  }

  @Post('tasks/:id/agregar-fase')
  @ApiOperation({ summary: 'Agregar tarea como fase de un grupo' })
  async agregarFase(
    @Param('id', ParseIntPipe) idGrupo: number,
    @Body() body: { idTareaNueva: number },
    @Request() req: any,
  ) {
    const idTareaNueva = Number(body?.idTareaNueva);
    if (!idTareaNueva || Number.isNaN(idTareaNueva))
      throw new BadRequestException('idTareaNueva inválido.');
    return await this.planningService.agregarFase(
      idGrupo,
      idTareaNueva,
      this.getUserId(req),
    );
  }

  @Get('grupos/:idGrupo')
  @ApiOperation({ summary: 'Obtener todas las fases de un grupo' })
  async obtenerGrupo(
    @Param('idGrupo', ParseIntPipe) idGrupo: number,
    @Request() req: any,
  ) {
    // service valida visibilidad
    return await this.planningService.obtenerGrupo(
      idGrupo,
      this.getUserId(req),
    );
  }

  @Get('dashboard/alerts')
  @ApiOperation({
    summary: 'Obtener alertas de dashboard (atrasos y entregas hoy)',
  })
  async getDashboardAlerts(@Request() req: any) {
    return await this.planningService.getDashboardAlerts(this.getUserId(req));
  }

  // ==========================================
  // MI ASIGNACIÓN - Vista Unificada
  // ==========================================
  @Get('mi-asignacion')
  @ApiOperation({
    summary: 'Obtener proyectos y tareas asignadas al usuario actual',
  })
  async getMiAsignacion(@Request() req: any, @Query('estado') estado?: string) {
    return await this.planningService.getMiAsignacion(req.user.carnet, {
      estado,
    });
  }

  @Get('supervision')
  @ApiOperation({
    summary:
      'Obtener métricas de supervisión (Usuarios sin carga o Proyectos vacíos) - Solo Admin',
  })
  async getSupervision(@Request() req: any) {
    return await this.planningService.getSupervision(this.getUserId(req));
  }

  @Get('debug')
  async debugTasks(@Query('name') name: string) {
    return await this.planningService.debugTasksByUser(name);
  }
}
