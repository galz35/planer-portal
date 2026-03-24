import { Injectable, Logger } from '@nestjs/common';
import { VisitaRepo } from './repos/visita.repo';
import { ClienteRepo } from './repos/cliente.repo';
import { TrackingRepo } from './repos/tracking.repo';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { GpsPointDto } from './dto/batch-tracking.dto';

@Injectable()
export class VisitaCampoService {
  private readonly logger = new Logger('VisitaCampoService');

  constructor(
    private visitaRepo: VisitaRepo,
    private clienteRepo: ClienteRepo,
    private trackingRepo: TrackingRepo,
  ) {}

  async obtenerAgenda(carnet: string, lat?: number, lon?: number) {
    return this.visitaRepo.agendaHoy(carnet, lat, lon);
  }

  async registrarCheckin(carnet: string, dto: CheckinDto) {
    const result = await this.visitaRepo.checkin(carnet, dto);
    return result[0]; // Retorna el resutado del SP
  }

  async registrarCheckout(carnet: string, dto: CheckoutDto) {
    const result = await this.visitaRepo.checkout(carnet, dto);
    return result[0];
  }

  async obtenerResumen(carnet: string, fecha?: string) {
    const result = await this.visitaRepo.resumenDia(carnet, fecha);
    return result[0];
  }

  async enviarTrackingBatch(carnet: string, puntos: GpsPointDto[]) {
    if (!puntos || puntos.length === 0) return { insertados: 0 };
    this.logger.log(`[VC-GPS-BATCH] carnet=${carnet} puntos=${puntos.length}`);
    const result = await this.trackingRepo.insertarLoteGps(carnet, puntos);
    return { insertados: result[0]?.insertados || 0 };
  }

  async calcularKm(carnet: string, fecha?: string) {
    const result = await this.trackingRepo.calculoKmDia(carnet, fecha);
    return result[0];
  }

  async obtenerClientes() {
    return this.clienteRepo.listarTodos();
  }

  async obtenerTrackingRaw(carnet: string, fecha?: string) {
    return this.trackingRepo.obtenerTrackingRaw(carnet, fecha);
  }

  async obtenerUsuariosConTracking() {
    return this.trackingRepo.obtenerUsuariosConTracking();
  }
}
