import { Injectable } from '@nestjs/common';
import {
  ejecutarSP,
  ejecutarQuery,
  Decimal,
  Int,
  NVarChar,
  DateTime,
} from '../../db/base.repo';
import { CheckinDto } from '../dto/checkin.dto';
import { CheckoutDto } from '../dto/checkout.dto';

@Injectable()
export class VisitaRepo {
  async checkin(carnet: string, dto: CheckinDto) {
    return await ejecutarSP(
      'sp_vc_checkin',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        cliente_id: { valor: dto.cliente_id, tipo: Int },
        lat: { valor: dto.lat, tipo: Decimal(10, 7) },
        lon: { valor: dto.lon, tipo: Decimal(10, 7) },
        accuracy:
          dto.accuracy != null
            ? { valor: dto.accuracy, tipo: Decimal(10, 2) }
            : null,
        timestamp: dto.timestamp
          ? { valor: new Date(dto.timestamp), tipo: DateTime }
          : null,
        agenda_id:
          dto.agenda_id != null ? { valor: dto.agenda_id, tipo: Int } : null,
        offline_id: dto.offline_id
          ? { valor: dto.offline_id, tipo: NVarChar(100) }
          : null,
      },
      undefined,
      'VisitaRepo.checkin',
    );
  }

  async checkout(carnet: string, dto: CheckoutDto) {
    return await ejecutarSP(
      'sp_vc_checkout',
      {
        visita_id: { valor: dto.visita_id, tipo: Int },
        carnet: { valor: carnet, tipo: NVarChar(20) },
        lat: dto.lat != null ? { valor: dto.lat, tipo: Decimal(10, 7) } : null,
        lon: dto.lon != null ? { valor: dto.lon, tipo: Decimal(10, 7) } : null,
        accuracy:
          dto.accuracy != null
            ? { valor: dto.accuracy, tipo: Decimal(10, 2) }
            : null,
        timestamp: dto.timestamp
          ? { valor: new Date(dto.timestamp), tipo: DateTime }
          : null,
        observacion: dto.observacion
          ? { valor: dto.observacion, tipo: NVarChar }
          : null,
        foto_path: dto.foto_path
          ? { valor: dto.foto_path, tipo: NVarChar(500) }
          : null,
        firma_path: dto.firma_path
          ? { valor: dto.firma_path, tipo: NVarChar(500) }
          : null,
      },
      undefined,
      'VisitaRepo.checkout',
    );
  }

  async agendaHoy(carnet: string, lat?: number, lon?: number) {
    return await ejecutarSP(
      'sp_vc_agenda_hoy',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        lat_actual: lat != null ? { valor: lat, tipo: Decimal(10, 7) } : null,
        lon_actual: lon != null ? { valor: lon, tipo: Decimal(10, 7) } : null,
      },
      undefined,
      'VisitaRepo.agendaHoy',
    );
  }

  async resumenDia(carnet: string, fecha?: string) {
    return await ejecutarSP(
      'sp_vc_resumen_dia',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
      },
      undefined,
      'VisitaRepo.resumenDia',
    );
  }

  // --- Admin Endpoints ---

  // Validar formato de fecha para prevenir SQL injection
  private sanitizeFecha(fecha?: string): string | null {
    if (!fecha) return null;
    const match = fecha.match(/^\d{4}-\d{2}-\d{2}$/);
    return match ? fecha : null;
  }

  async adminGetVisitas(fecha?: string) {
    const fechaLimpia = this.sanitizeFecha(fecha);
    let q = `
            SELECT TOP 500 v.*, c.nombre as cliente_nombre, c.codigo as cliente_codigo, c.zona
            FROM vc_visitas v
            LEFT JOIN vc_clientes c ON c.id = v.cliente_id
        `;
    if (fechaLimpia) {
      q += ` WHERE CAST(v.timestamp_inicio AS DATE) = '${fechaLimpia}'`;
    }
    q += ` ORDER BY v.timestamp_inicio DESC`;
    return await ejecutarQuery(q, undefined, 'VisitaRepo.adminGetVisitas');
  }

  async adminGetDashboard(fecha?: string) {
    const f =
      this.sanitizeFecha(fecha) || new Date().toISOString().slice(0, 10);
    const q = `
            SELECT 
                (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = '${f}') as visitas_hoy,
                (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = '${f}' AND estado = 'FINALIZADA') as completadas_hoy,
                (SELECT COUNT(*) FROM vc_clientes WHERE activo = 1) as clientes_activos,
                (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = '${f}' AND valido_inicio = 0) as alertas_fuera_zona
        `;
    const res = await ejecutarQuery(
      q,
      undefined,
      'VisitaRepo.adminGetDashboard',
    );
    return res[0] || {};
  }
}
