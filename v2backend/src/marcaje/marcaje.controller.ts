/**
 * MarcajeController — Endpoints REST del módulo Marcaje Web
 *
 * Rutas de empleado: /api/marcaje/*
 * Rutas de admin: /api/marcaje/admin/*
 * Todas protegidas por JWT + FeatureFlagGuard (carnet 500708)
 */
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  FeatureFlagGuard,
  AllowedCarnets,
  AllowedEmails,
} from '../common/guards/feature-flag.guard';
import {
  MarcajeService,
  MarkAttendanceDto,
  GpsPointDto,
  RequestCorrectionDto,
} from './marcaje.service';

@Controller('marcaje')
@UseGuards(AuthGuard('jwt'), FeatureFlagGuard)
@AllowedCarnets('500708')
@AllowedEmails('gustavo.lira@claro.com.ni')
export class MarcajeController {
  private readonly logger = new Logger('MarcajeController');

  constructor(private readonly marcajeService: MarcajeService) { }

  // ==========================================
  // EMPLEADO ENDPOINTS
  // ==========================================

  /**
   * POST /api/marcaje/mark
   * Registrar marcaje (entrada/salida/extras/compensada)
   */
  @Post('mark')
  async mark(@Req() req: any, @Body() body: any) {
    const carnet = req.user.carnet;
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.connection?.remoteAddress ||
      null;

    // --- COMPATIBILIDAD MÓVIL ---
    // El app móvil envía 'tipo' instead of 'tipo_marcaje'
    // El app móvil envía 'source' (APP) instead of 'tipo_device' (MOBILE)
    const rawSource = (body.tipo_device || body.source || 'DESKTOP').toUpperCase();
    const tipoDevice = (rawSource === 'APP' || rawSource === 'MOBILE' || rawSource === 'MOVIL') ? 'MOBILE' : 'DESKTOP';

    const normalizedBody: MarkAttendanceDto = {
      ...body,
      tipo_marcaje: (body.tipo_marcaje || body.tipo || '').toUpperCase(),
      tipo_device: tipoDevice,
    };

    return this.marcajeService.registrarMarcaje(carnet, normalizedBody, ip);
  }

  /**
   * GET /api/marcaje/summary
   * Obtener resumen diario (historial + flags de estado)
   */
  @Get('summary')
  async summary(@Req() req: any) {
    const carnet = req.user.carnet;
    const summary = await this.marcajeService.obtenerResumen(carnet);

    // --- COMPATIBILIDAD MÓVIL ---
    // El app móvil espera 'hora_entrada', 'hora_salida' e 'historial' en la raíz
    return {
      ...summary,
      historial: summary.dailyHistory,
      hora_entrada: summary.flags?.lastCheckIn,
      hora_salida: summary.flags?.lastCheckOut,
    };
  }

  /**
   * POST /api/marcaje/undo-last-checkout
   * Deshacer último checkout
   */
  @Post(['undo-last-checkout', 'undo-last'])
  async undoLastCheckout(@Req() req: any) {
    const carnet = req.user.carnet;
    return this.marcajeService.deshacerUltimoCheckout(carnet);
  }

  /**
   * POST /api/marcaje/request-correction
   * Solicitar corrección de asistencia
   */
  @Post(['request-correction', 'correccion'])
  async requestCorrection(@Req() req: any, @Body() body: any) {
    const carnet = req.user.carnet;

    // --- COMPATIBILIDAD MÓVIL ---
    // El app móvil envía 'tipo' instead of 'tipo_solicitud'
    const normalizedBody: RequestCorrectionDto = {
      ...body,
      tipo_solicitud: body.tipo_solicitud || body.tipo || 'CORRECCION_ASISTENCIA',
    };

    return this.marcajeService.solicitarCorreccion(carnet, normalizedBody);
  }

  /**
   * POST /api/marcaje/gps-track
   * Enviar un punto GPS de tracking
   */
  @Post('gps-track')
  async gpsTrack(@Req() req: any, @Body() body: GpsPointDto) {
    const carnet = req.user.carnet;
    return this.marcajeService.registrarGps(carnet, body);
  }

  /**
   * POST /api/marcaje/gps-track-batch
   * Enviar lote de puntos GPS (sync offline)
   */
  @Post('gps-track-batch')
  async gpsTrackBatch(
    @Req() req: any,
    @Body() body: { puntos: GpsPointDto[] },
  ) {
    const carnet = req.user.carnet;
    return this.marcajeService.registrarGpsBatch(carnet, body.puntos);
  }

  // ==========================================
  // ADMIN ENDPOINTS — LECTURA
  // ==========================================

  @Get('admin/solicitudes')
  async getSolicitudes() {
    return this.marcajeService.adminGetSolicitudes();
  }

  @Get('admin/sites')
  async getSites() {
    return this.marcajeService.adminGetSites();
  }

  @Get('admin/ips')
  async getIps() {
    return this.marcajeService.adminGetIps();
  }

  @Get('admin/devices')
  async getDevices() {
    return this.marcajeService.adminGetDevices();
  }

  @Get('admin/config')
  async getConfig() {
    return this.marcajeService.adminGetConfig();
  }

  // ==========================================
  // ADMIN ENDPOINTS — MONITOR + DASHBOARD
  // ==========================================

  /**
   * GET /api/marcaje/admin/monitor?fecha=YYYY-MM-DD
   * Monitor en tiempo real: todos los marcajes del día con nombres
   */
  @Get('admin/monitor')
  async getMonitor(@Query('fecha') fecha?: string) {
    return this.marcajeService.adminGetMonitor(fecha);
  }

  /**
   * GET /api/marcaje/admin/dashboard?fecha=YYYY-MM-DD
   * KPIs agregados del día
   */
  @Get('admin/dashboard')
  async getDashboard(@Query('fecha') fecha?: string) {
    return this.marcajeService.adminGetDashboard(fecha);
  }

  // ==========================================
  // ADMIN ENDPOINTS — ACCIONES
  // ==========================================

  /**
   * PUT /api/marcaje/admin/solicitudes/:id/resolver
   * Aprobar o rechazar una solicitud de corrección
   */
  @Put('admin/solicitudes/:id/resolver')
  async resolverSolicitud(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { accion: 'APROBADA' | 'RECHAZADA'; comentario?: string },
  ) {
    return this.marcajeService.adminResolverSolicitud(
      +id,
      body.accion,
      body.comentario || null,
      req.user.carnet,
    );
  }

  /**
   * DELETE /api/marcaje/admin/asistencia/:id
   * Eliminar un marcaje específico (admin)
   */
  @Delete('admin/asistencia/:id')
  async eliminarMarcaje(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body?: { motivo?: string },
  ) {
    return this.marcajeService.adminEliminarMarcaje(
      +id,
      req.user.carnet,
      body?.motivo,
    );
  }

  /**
   * POST /api/marcaje/admin/reiniciar/:carnet
   * Forzar cierre de turno abierto de un empleado
   */
  @Post('admin/reiniciar/:carnet')
  async reiniciarEstado(
    @Req() req: any,
    @Param('carnet') carnet: string,
    @Body() body: { motivo?: string },
  ) {
    return this.marcajeService.adminReiniciarEstado(
      carnet,
      req.user.carnet,
      body?.motivo,
    );
  }

  // ==========================================
  // ADMIN ENDPOINTS — REPORTES
  // ==========================================

  /**
   * GET /api/marcaje/admin/reportes?fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&carnet=XXX
   * Reporte de asistencia por rango de fechas
   */
  @Get('admin/reportes')
  async getReportes(
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
    @Query('carnet') carnet?: string,
  ) {
    return this.marcajeService.adminGetReportes(fechaInicio, fechaFin, carnet);
  }

  // ==========================================
  // ADMIN ENDPOINTS — CRUD SITES
  // ==========================================

  /**
   * POST /api/marcaje/admin/sites
   * Crear una nueva geocerca
   */
  @Post('admin/sites')
  async crearSite(
    @Body()
    body: {
      nombre: string;
      lat: number;
      lon: number;
      radio_metros?: number;
      accuracy_max?: number;
    },
  ) {
    return this.marcajeService.adminCrearSite(body);
  }

  /**
   * PUT /api/marcaje/admin/sites/:id
   * Editar una geocerca existente
   */
  @Put('admin/sites/:id')
  async editarSite(@Param('id') id: string, @Body() body: any) {
    return this.marcajeService.adminEditarSite(+id, body);
  }

  /**
   * DELETE /api/marcaje/admin/sites/:id
   * Eliminar una geocerca
   */
  @Delete('admin/sites/:id')
  async eliminarSite(@Param('id') id: string) {
    return this.marcajeService.adminEliminarSite(+id);
  }

  // ==========================================
  // ADMIN ENDPOINTS — CRUD IPs
  // ==========================================

  /**
   * POST /api/marcaje/admin/ips
   * Agregar una IP a la whitelist
   */
  @Post('admin/ips')
  async crearIp(@Body() body: { nombre: string; cidr: string }) {
    return this.marcajeService.adminCrearIp(body);
  }

  /**
   * DELETE /api/marcaje/admin/ips/:id
   * Eliminar una IP de la whitelist
   */
  @Delete('admin/ips/:id')
  async eliminarIp(@Param('id') id: string) {
    return this.marcajeService.adminEliminarIp(+id);
  }

  // ==========================================
  // ADMIN ENDPOINTS — DEVICES
  // ==========================================

  /**
   * PUT /api/marcaje/admin/devices/:uuid
   * Aprobar o bloquear un dispositivo
   */
  @Put('admin/devices/:uuid')
  async actualizarDevice(
    @Param('uuid') uuid: string,
    @Body() body: { estado: 'ACTIVE' | 'BLOCKED' },
  ) {
    return this.marcajeService.adminActualizarDevice(uuid, body.estado);
  }

  // ==========================================
  // GEOCERCAS POR USUARIO
  // ==========================================

  /** Validar posición vs geocercas del usuario (no bloquea marcaje) */
  @Post('geocerca/validar')
  async validarGeocerca(
    @Req() req: any,
    @Body() body: { lat: number; lon: number },
  ) {
    return this.marcajeService.validarGeocerca(
      req.user.carnet,
      body.lat,
      body.lon,
    );
  }

  /** Listar geocercas asignadas a un usuario */
  @Get('admin/geocercas/:carnet')
  async getGeocercasUsuario(@Param('carnet') carnet: string) {
    return this.marcajeService.getGeocercasUsuario(carnet);
  }

  /** Asignar geocerca a un usuario */
  @Post('admin/geocercas')
  async asignarGeocerca(
    @Body() body: { carnet: string; id_site: number },
  ) {
    return this.marcajeService.asignarGeocerca(body.carnet, body.id_site);
  }

  /** Quitar geocerca de un usuario */
  @Delete('admin/geocercas/:id')
  async quitarGeocerca(@Param('id') id: string) {
    return this.marcajeService.quitarGeocerca(+id);
  }
}
