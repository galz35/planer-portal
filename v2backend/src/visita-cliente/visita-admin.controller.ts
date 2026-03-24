import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Put,
  Delete,
  Query,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  FeatureFlagGuard,
  AllowedCarnets,
  AllowedEmails,
} from '../common/guards/feature-flag.guard';
import { VisitaAdminService } from './visita-admin.service';
import { ImportarClientesDto } from './dto/importar-clientes.dto';

@Controller('visita-admin')
@UseGuards(AuthGuard('jwt'), FeatureFlagGuard)
@AllowedCarnets('500708')
@AllowedEmails('gustavo.lira@claro.com.ni')
export class VisitaAdminController {
  constructor(private readonly adminSvc: VisitaAdminService) {}

  @Post('importar-clientes')
  async importarClientes(@Body() payload: ImportarClientesDto) {
    return this.adminSvc.importarClientes(payload.clientes);
  }

  // ==========================================
  // CRUD CLIENTES INDIVIDUAL
  // ==========================================

  @Post('clientes')
  async crearCliente(@Body() body: any) {
    return this.adminSvc.crearCliente(body);
  }

  @Put('clientes/:id')
  async actualizarCliente(@Param('id') id: string, @Body() body: any) {
    return this.adminSvc.actualizarCliente(+id, body);
  }

  @Delete('clientes/:id')
  async eliminarCliente(@Param('id') id: string) {
    return this.adminSvc.eliminarCliente(+id);
  }

  @Get('visitas')
  async getVisitas(@Query('fecha') fecha?: string) {
    return this.adminSvc.obtenerVisitas(fecha);
  }

  @Get('dashboard')
  async getDashboard(@Query('fecha') fecha?: string) {
    return this.adminSvc.obtenerDashboard(fecha);
  }

  // ==========================================
  // REPORTES
  // ==========================================

  @Get('reportes/km')
  async getReporteKm(
    @Query('fecha_inicio') fecha_inicio: string,
    @Query('fecha_fin') fecha_fin: string,
  ) {
    return this.adminSvc.generarReporteKm(fecha_inicio, fecha_fin);
  }

  // ==========================================
  // TRACKING POR CARNET
  // ==========================================

  /**
   * GET /api/visita-admin/tracking/:carnet?fecha=YYYY-MM-DD
   * Ver el tracking GPS de cualquier usuario
   */
  @Get('tracking/:carnet')
  async getTrackingUsuario(
    @Param('carnet') carnet: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.adminSvc.obtenerTrackingUsuario(carnet, fecha);
  }

  // ==========================================
  // CRUD AGENDA
  // ==========================================

  /**
   * GET /api/visita-admin/agenda/:carnet?fecha=YYYY-MM-DD
   * Listar agenda de un técnico para una fecha
   */
  @Get('agenda/:carnet')
  async listarAgenda(
    @Param('carnet') carnet: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.adminSvc.listarAgenda(carnet, fecha);
  }

  /**
   * POST /api/visita-admin/agenda
   * Asignar un cliente a la agenda de un técnico
   */
  @Post('agenda')
  async crearAgenda(
    @Body()
    body: {
      carnet: string;
      cliente_id: number;
      fecha: string;
      orden?: number;
      notas?: string;
    },
  ) {
    return this.adminSvc.crearAgenda(
      body.carnet,
      body.cliente_id,
      body.fecha,
      body.orden,
      body.notas,
    );
  }

  /**
   * PUT /api/visita-admin/agenda/:id/reordenar
   * Cambiar orden de una visita en la agenda
   */
  @Put('agenda/:id/reordenar')
  async reordenarAgenda(
    @Param('id') id: string,
    @Body() body: { nuevo_orden: number },
  ) {
    return this.adminSvc.reordenarAgenda(+id, body.nuevo_orden);
  }

  /**
   * DELETE /api/visita-admin/agenda/:id
   * Quitar un cliente de la agenda (solo si PENDIENTE)
   */
  @Delete('agenda/:id')
  async eliminarAgenda(@Param('id') id: string) {
    return this.adminSvc.eliminarAgenda(+id);
  }

  // ==========================================
  // METAS
  // ==========================================

  /**
   * GET /api/visita-admin/metas?carnet=XXX
   * Listar metas activas (todas o por carnet)
   */
  @Get('metas')
  async listarMetas(@Query('carnet') carnet?: string) {
    return this.adminSvc.listarMetas(carnet);
  }

  /**
   * POST /api/visita-admin/metas
   * Establecer/actualizar meta para un usuario
   */
  @Post('metas')
  async setMeta(
    @Body()
    body: {
      carnet: string;
      meta_visitas: number;
      costo_km: number;
      vigente_desde?: string;
      vigente_hasta?: string;
    },
  ) {
    return this.adminSvc.setMeta(
      body.carnet,
      body.meta_visitas,
      body.costo_km,
      body.vigente_desde,
      body.vigente_hasta,
    );
  }
}
