import { Injectable, Logger } from '@nestjs/common';
import { ClienteRepo } from './repos/cliente.repo';
import { VisitaRepo } from './repos/visita.repo';
import { TrackingRepo } from './repos/tracking.repo';
import { ejecutarSP, NVarChar, Int, DateTime, Decimal } from '../db/base.repo';

@Injectable()
export class VisitaAdminService {
  private readonly logger = new Logger('VisitaAdminService');

  constructor(
    private clienteRepo: ClienteRepo,
    private visitaRepo: VisitaRepo,
    private trackingRepo: TrackingRepo,
  ) {}

  async importarClientes(clientesJson: any[]) {
    this.logger.log(`[ADMIN-VC] Importando ${clientesJson.length} clientes`);
    const jsonStr = JSON.stringify(clientesJson);
    const result = await this.clienteRepo.importarClientes(jsonStr);
    return result[0];
  }

  // ==========================================
  // ADMIN — CRUD CLIENTES INDIVIDUAL
  // ==========================================

  async crearCliente(data: any) {
    const result = await this.clienteRepo.crearCliente(data);
    return result[0];
  }

  async actualizarCliente(id: number, data: any) {
    const result = await this.clienteRepo.actualizarCliente(id, data);
    return result[0];
  }

  async eliminarCliente(id: number) {
    const result = await this.clienteRepo.eliminarCliente(id);
    return result[0];
  }

  async obtenerVisitas(fecha?: string) {
    return this.visitaRepo.adminGetVisitas(fecha);
  }

  // ==========================================
  // ADMIN — REPORTES
  // ==========================================

  async generarReporteKm(fechaInicio: string, fechaFin: string) {
    // En lugar de iterar por técnico/día, simplificamos con un script SQL si es lento en JS,
    // pero la instrucción G4 indica "Ejecutar sp_vc_calculo_km_dia en loop para cada carnet + fecha".
    // Primero obtenemos a los técnicos:
    const usuarios = await this.trackingRepo.obtenerUsuariosConTracking();
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);

    // Calcular arreglo de fechas intermedias
    const fechas = [];
    const cur = new Date(start);
    while (cur <= end) {
      fechas.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }

    const reporteAcc: any[] = [];

    for (const user of usuarios) {
      const carnet = user.carnet;
      for (const f_str of fechas) {
        try {
          const statsDiario = await this.trackingRepo.calculoKmDia(
            carnet,
            f_str,
          );
          if (
            statsDiario &&
            statsDiario[0] &&
            (statsDiario[0].km_total > 0 || statsDiario[0].puntos_totales > 0)
          ) {
            reporteAcc.push({
              fecha: f_str,
              carnet: carnet,
              nombre: user.nombre_empleado || 'No registrado',
              km_total: Number(statsDiario[0].km_total || 0).toFixed(2),
              tramo_valido: statsDiario[0].segmentos_validos || 0,
              puntos_totales: statsDiario[0].puntos_totales || 0,
            });
          }
        } catch (e) {
          this.logger.error(
            `Error loop report km carnet=${carnet} fecha=${f_str}`,
            e,
          );
        }
      }
    }

    return reporteAcc;
  }

  async obtenerDashboard(fecha?: string) {
    return this.visitaRepo.adminGetDashboard(fecha);
  }

  // ==========================================
  // ADMIN — TRACKING POR CARNET
  // ==========================================

  async obtenerTrackingUsuario(carnet: string, fecha?: string) {
    return this.trackingRepo.obtenerTrackingRaw(carnet, fecha);
  }

  // ==========================================
  // ADMIN — CRUD AGENDA
  // ==========================================

  async crearAgenda(
    carnet: string,
    clienteId: number,
    fecha: string,
    orden?: number,
    notas?: string,
  ) {
    const result = await ejecutarSP(
      'sp_vc_agenda_crear',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        cliente_id: { valor: clienteId, tipo: Int },
        fecha: { valor: new Date(fecha), tipo: DateTime },
        orden: orden != null ? { valor: orden, tipo: Int } : null,
        notas: notas ? { valor: notas, tipo: NVarChar(500) } : null,
      },
      undefined,
      'VisitaAdminService.crearAgenda',
    );
    return result[0];
  }

  async listarAgenda(carnet: string, fecha?: string) {
    return await ejecutarSP(
      'sp_vc_agenda_listar',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
      },
      undefined,
      'VisitaAdminService.listarAgenda',
    );
  }

  async reordenarAgenda(agendaId: number, nuevoOrden: number) {
    const result = await ejecutarSP(
      'sp_vc_agenda_reordenar',
      {
        agenda_id: { valor: agendaId, tipo: Int },
        nuevo_orden: { valor: nuevoOrden, tipo: Int },
      },
      undefined,
      'VisitaAdminService.reordenarAgenda',
    );
    return result[0];
  }

  async eliminarAgenda(agendaId: number) {
    const result = await ejecutarSP(
      'sp_vc_agenda_eliminar',
      {
        agenda_id: { valor: agendaId, tipo: Int },
      },
      undefined,
      'VisitaAdminService.eliminarAgenda',
    );
    return result[0];
  }

  // ==========================================
  // ADMIN — METAS
  // ==========================================

  async setMeta(
    carnet: string,
    metaVisitas: number,
    costoKm: number,
    vigDesde?: string,
    vigHasta?: string,
  ) {
    const result = await ejecutarSP(
      'sp_vc_meta_set',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        meta_visitas: { valor: metaVisitas, tipo: Int },
        costo_km: { valor: costoKm, tipo: Decimal(10, 4) },
        vigente_desde: vigDesde
          ? { valor: new Date(vigDesde), tipo: DateTime }
          : null,
        vigente_hasta: vigHasta
          ? { valor: new Date(vigHasta), tipo: DateTime }
          : null,
      },
      undefined,
      'VisitaAdminService.setMeta',
    );
    return result[0];
  }

  async listarMetas(carnet?: string) {
    return await ejecutarSP(
      'sp_vc_meta_listar',
      {
        carnet: carnet ? { valor: carnet, tipo: NVarChar(20) } : null,
      },
      undefined,
      'VisitaAdminService.listarMetas',
    );
  }
}
