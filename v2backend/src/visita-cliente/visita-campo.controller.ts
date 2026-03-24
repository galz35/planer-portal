import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  FeatureFlagGuard,
  AllowedCarnets,
  AllowedEmails,
} from '../common/guards/feature-flag.guard';
import { VisitaCampoService } from './visita-campo.service';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { BatchTrackingDto } from './dto/batch-tracking.dto';

@Controller('visita-campo')
@UseGuards(AuthGuard('jwt'), FeatureFlagGuard)
@AllowedCarnets('500708')
@AllowedEmails('gustavo.lira@claro.com.ni')
export class VisitaCampoController {
  constructor(private readonly visitaSvc: VisitaCampoService) {}

  @Get('agenda')
  async getAgenda(
    @Req() req: any,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
  ) {
    return this.visitaSvc.obtenerAgenda(req.user.carnet, lat, lon);
  }

  @Get('clientes')
  async getTodosClientes() {
    return this.visitaSvc.obtenerClientes(); // Lista para buscar en caso de visita sin agenda
  }

  @Post('checkin')
  async checkin(@Req() req: any, @Body() dto: CheckinDto) {
    return this.visitaSvc.registrarCheckin(req.user.carnet, dto);
  }

  @Post('checkout')
  async checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.visitaSvc.registrarCheckout(req.user.carnet, dto);
  }

  @Get('resumen')
  async getResumen(@Req() req: any, @Query('fecha') fecha?: string) {
    return this.visitaSvc.obtenerResumen(req.user.carnet, fecha);
  }

  @Post('tracking-batch')
  async syncTracking(@Req() req: any, @Body() dto: BatchTrackingDto) {
    return this.visitaSvc.enviarTrackingBatch(req.user.carnet, dto.puntos);
  }

  @Get('stats/km')
  async calcKm(@Req() req: any, @Query('fecha') fecha?: string) {
    return this.visitaSvc.calcularKm(req.user.carnet, fecha);
  }

  /**
   * GET /api/visita-campo/tracking-raw?fecha=YYYY-MM-DD&carnet=XXX
   * Retorna puntos GPS limpios del día para dibujar polyline en mapa
   * Si no se pasa carnet, usa el del usuario autenticado
   */
  @Get('tracking-raw')
  async getTrackingRaw(
    @Req() req: any,
    @Query('fecha') fecha?: string,
    @Query('carnet') carnet?: string,
  ) {
    const targetCarnet = carnet || req.user.carnet;
    return this.visitaSvc.obtenerTrackingRaw(targetCarnet, fecha);
  }

  /**
   * GET /api/visita-campo/usuarios-tracking
   * Lista de usuarios que tienen datos de tracking GPS (para selector en mapa)
   */
  @Get('usuarios-tracking')
  async getUsuariosConTracking() {
    return this.visitaSvc.obtenerUsuariosConTracking();
  }
}
