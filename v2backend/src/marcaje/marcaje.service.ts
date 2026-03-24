/**
 * MarcajeService — Lógica de negocio del módulo Marcaje Web
 *
 * Flujo principal:
 *   1. Controller recibe request con JWT → extrae carnet
 *   2. Service valida payload y delega a SPs
 *   3. SPs hacen toda la validación pesada (geofence, anti-spam, IP, staleShift)
 *   4. Service mapea resultado y retorna al Controller
 *
 * PRINCIPIO: Los SPs nunca rechazan marcajes. Si hay problemas → WARN en motivo.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  ejecutarSP,
  ejecutarSPMulti,
  ejecutarQuery,
  NVarChar,
  Int,
  Decimal,
  DateTime,
} from '../db/base.repo';

// ==========================================
// TYPES
// ==========================================

export interface MarkAttendanceDto {
  tipo_marcaje:
  | 'ENTRADA'
  | 'SALIDA'
  | 'INICIO_EXTRA'
  | 'FIN_EXTRA'
  | 'INICIO_COMPENSADA'
  | 'FIN_COMPENSADA';
  tipo_device: 'MOBILE' | 'DESKTOP';
  lat?: number;
  lon?: number;
  accuracy?: number;
  ip?: string;
  user_agent?: string;
  device_uuid?: string;
  timestamp?: string; // ISO 8601 — para offline sync
  offline_id?: string; // Para idempotencia
}

export interface GpsPointDto {
  lat: number;
  lon: number;
  accuracy?: number;
  timestamp: string;
  fuente?: string;
}

export interface RequestCorrectionDto {
  asistencia_id?: number;
  tipo_solicitud: 'CORRECCION_ASISTENCIA' | 'ELIMINAR_SALIDA';
  motivo: string;
}

export interface AttendanceSummary {
  dailyHistory: any[];
  flags: {
    isClockedIn: boolean;
    isOvertimeActive: boolean;
    isCompensatedActive: boolean;
    staleShift: boolean;
    lastCheckIn: string | null;
    lastCheckOut: string | null;
    lastRecordTimestamp: string | null;
    lastRecordType: string | null;
  };
}

// ==========================================
// SERVICE
// ==========================================

@Injectable()
export class MarcajeService {
  private readonly logger = new Logger('MarcajeService');

  /**
   * Registrar un marcaje (entrada/salida/extras/compensada)
   * El SP nunca rechaza — solo agrega WARN si hay irregularidades
   */
  async registrarMarcaje(
    carnet: string,
    dto: MarkAttendanceDto,
    requestIp?: string,
  ) {
    this.logger.log(
      `[MARK] carnet=${carnet} tipo=${dto.tipo_marcaje} device=${dto.tipo_device}`,
    );

    const ip = dto.ip || requestIp || null;

    const result = await ejecutarSP(
      'sp_marcaje_registrar',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        tipo_marcaje: { valor: dto.tipo_marcaje, tipo: NVarChar(30) },
        tipo_device: { valor: dto.tipo_device, tipo: NVarChar(20) },
        lat: dto.lat != null ? { valor: dto.lat, tipo: Decimal(10, 7) } : null,
        lon: dto.lon != null ? { valor: dto.lon, tipo: Decimal(10, 7) } : null,
        accuracy:
          dto.accuracy != null
            ? { valor: dto.accuracy, tipo: Decimal(10, 2) }
            : null,
        ip: ip ? { valor: ip, tipo: NVarChar(50) } : null,
        user_agent: dto.user_agent
          ? { valor: dto.user_agent.substring(0, 500), tipo: NVarChar(500) }
          : null,
        device_uuid: dto.device_uuid
          ? { valor: dto.device_uuid, tipo: NVarChar(100) }
          : null,
        timestamp_marca: dto.timestamp
          ? { valor: new Date(dto.timestamp), tipo: DateTime }
          : null,
        offline_id: dto.offline_id
          ? { valor: dto.offline_id, tipo: NVarChar(100) }
          : null,
      },
      undefined,
      'MarcajeService.registrarMarcaje',
    );

    if (!result || result.length === 0) {
      throw new Error('SP sp_marcaje_registrar no retornó resultado');
    }

    const record = result[0];

    // Log si tiene warnings
    if (record.motivo) {
      this.logger.warn(`[MARK] carnet=${carnet} WARNINGS: ${record.motivo}`);
    }

    return {
      id: record.id,
      tipo_marcaje: record.tipo_marcaje,
      tipo_device: record.tipo_device,
      fecha: record.fecha,
      estado: record.estado,
      motivo: record.motivo,
      lat: record.lat,
      long: record.long,
      hasWarnings: !!record.motivo,
    };
  }

  /**
   * Obtener resumen diario (historial + flags de estado)
   * Usa SP con múltiple result sets
   */
  async obtenerResumen(carnet: string): Promise<AttendanceSummary> {
    const resultSets = await ejecutarSPMulti(
      'sp_marcaje_resumen_diario',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
      },
      undefined,
      'MarcajeService.obtenerResumen',
    );

    const dailyHistory = resultSets[0] || [];
    const flagsRow = resultSets[1]?.[0] || {};

    return {
      dailyHistory: dailyHistory.map((r: any) => ({
        id: r.id,
        tipo_marcaje: r.tipo_marcaje,
        tipo_device: r.tipo_device,
        fecha: r.fecha,
        estado: r.estado,
        motivo: r.motivo,
        lat: r.lat,
        long: r.long,
        accuracy: r.accuracy,
        ip: r.ip,
        offline_id: r.offline_id,
      })),
      flags: {
        isClockedIn: !!flagsRow.isClockedIn,
        isOvertimeActive: !!flagsRow.isOvertimeActive,
        isCompensatedActive: !!flagsRow.isCompensatedActive,
        staleShift: !!flagsRow.staleShift,
        lastCheckIn: flagsRow.lastCheckIn || null,
        lastCheckOut: flagsRow.lastCheckOut || null,
        lastRecordTimestamp: flagsRow.lastRecordTimestamp || null,
        lastRecordType: flagsRow.lastRecordType || null,
      },
    };
  }

  /**
   * Deshacer último checkout (solo salidas)
   */
  async deshacerUltimoCheckout(carnet: string) {
    const result = await ejecutarSP(
      'sp_marcaje_deshacer_ultimo',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
      },
      undefined,
      'MarcajeService.deshacerUltimoCheckout',
    );

    const row = result[0] || { ok: false, mensaje: 'Sin resultado' };
    return {
      ok: !!row.ok,
      mensaje: row.mensaje,
      tipo_eliminado: row.tipo_eliminado || row.tipo_actual,
    };
  }

  /**
   * Solicitar corrección de asistencia
   */
  async solicitarCorreccion(carnet: string, dto: RequestCorrectionDto) {
    const result = await ejecutarSP(
      'sp_marcaje_solicitar_correccion',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        asistencia_id: dto.asistencia_id
          ? { valor: dto.asistencia_id, tipo: Int }
          : null,
        tipo_solicitud: { valor: dto.tipo_solicitud, tipo: NVarChar(50) },
        motivo: { valor: dto.motivo, tipo: NVarChar },
      },
      undefined,
      'MarcajeService.solicitarCorreccion',
    );

    return result[0];
  }

  /**
   * Registrar punto GPS de tracking
   */
  async registrarGps(carnet: string, punto: GpsPointDto) {
    await ejecutarSP(
      'sp_marcaje_gps_batch',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        puntos: { valor: JSON.stringify([punto]), tipo: NVarChar },
      },
      undefined,
      'MarcajeService.registrarGps',
    );

    return { ok: true };
  }

  /**
   * Registrar lote de puntos GPS (sync offline)
   */
  async registrarGpsBatch(carnet: string, puntos: GpsPointDto[]) {
    if (!puntos || puntos.length === 0) {
      return { insertados: 0 };
    }

    this.logger.log(`[GPS-BATCH] carnet=${carnet} puntos=${puntos.length}`);

    const result = await ejecutarSP(
      'sp_marcaje_gps_batch',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        puntos: { valor: JSON.stringify(puntos), tipo: NVarChar },
      },
      undefined,
      'MarcajeService.registrarGpsBatch',
    );

    return { insertados: result[0]?.insertados || 0 };
  }

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================

  async adminGetSolicitudes() {
    try {
      return await ejecutarQuery(
        `
                SELECT TOP 200 s.*, c.Colaborador as colaborador_nombre
                FROM marcaje_solicitudes s
                LEFT JOIN rrhh.Colaboradores c ON c.Carnet = s.carnet
                ORDER BY s.creado_en DESC
            `,
        undefined,
        'MarcajeService.adminGetSolicitudes',
      );
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetSolicitudes: ${e}`);
      return [];
    }
  }

  async adminGetSites() {
    try {
      return await ejecutarQuery(`SELECT * FROM marcaje_sites ORDER BY id ASC`);
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetSites: ${e}`);
      return [];
    }
  }

  async adminGetIps() {
    try {
      return await ejecutarQuery(`
                SELECT * FROM marcaje_ip_whitelist
                ORDER BY id ASC
            `);
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetIps: ${e}`);
      return [];
    }
  }

  async adminGetDevices() {
    try {
      return await ejecutarQuery(`
                SELECT TOP 200 d.*, c.Colaborador as colaborador_nombre 
                FROM marcaje_devices d
                LEFT JOIN rrhh.Colaboradores c ON c.Carnet = d.carnet
                ORDER BY d.last_login DESC
            `);
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetDevices: ${e}`);
      return [];
    }
  }

  async adminGetConfig() {
    try {
      // Retorna los carnets que tienen al menos 1 registro de marcaje
      // como proxy de "usuarios con módulo de marcaje activo"
      return await ejecutarQuery(`
                SELECT TOP 100 c.Carnet, c.Colaborador,
                    (SELECT COUNT(*) FROM marcaje_asistencias WHERE carnet = c.Carnet) as total_marcajes
                FROM rrhh.Colaboradores c
                WHERE EXISTS (SELECT 1 FROM marcaje_asistencias WHERE carnet = c.Carnet)
                ORDER BY c.Colaborador
            `);
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetConfig: ${e}`);
      return [];
    }
  }

  // ==========================================
  // ADMIN — MONITOR EN TIEMPO REAL
  // ==========================================

  async adminGetMonitor(fecha?: string) {
    try {
      return await ejecutarSP(
        'sp_marcaje_monitor_dia',
        {
          fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
        },
        undefined,
        'MarcajeService.adminGetMonitor',
      );
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetMonitor: ${e}`);
      return [];
    }
  }

  async adminGetDashboard(fecha?: string) {
    try {
      const result = await ejecutarSP(
        'sp_marcaje_dashboard_kpis',
        {
          fecha: fecha ? { valor: new Date(fecha), tipo: DateTime } : null,
        },
        undefined,
        'MarcajeService.adminGetDashboard',
      );
      return result[0] || {};
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetDashboard: ${e}`);
      return {};
    }
  }

  // ==========================================
  // ADMIN — RESOLVER SOLICITUDES
  // ==========================================

  async adminResolverSolicitud(
    solicitudId: number,
    accion: string,
    comentario: string | null,
    adminCarnet: string,
  ) {
    this.logger.log(
      `[ADMIN] Resolviendo solicitud ${solicitudId}: ${accion} por ${adminCarnet}`,
    );
    const result = await ejecutarSP(
      'sp_marcaje_resolver_solicitud',
      {
        solicitud_id: { valor: solicitudId, tipo: Int },
        accion: { valor: accion, tipo: NVarChar(20) },
        admin_comentario: comentario
          ? { valor: comentario, tipo: NVarChar(500) }
          : null,
        admin_carnet: { valor: adminCarnet, tipo: NVarChar(20) },
      },
      undefined,
      'MarcajeService.adminResolverSolicitud',
    );
    return result[0] || { ok: false, mensaje: 'Sin resultado' };
  }

  // ==========================================
  // ADMIN — ELIMINAR MARCAJE
  // ==========================================

  async adminEliminarMarcaje(
    asistenciaId: number,
    adminCarnet: string,
    motivo?: string,
  ) {
    this.logger.log(
      `[ADMIN] Eliminando marcaje ${asistenciaId} por ${adminCarnet}`,
    );
    const result = await ejecutarSP(
      'sp_marcaje_admin_eliminar',
      {
        asistencia_id: { valor: asistenciaId, tipo: Int },
        admin_carnet: { valor: adminCarnet, tipo: NVarChar(20) },
        motivo: motivo ? { valor: motivo, tipo: NVarChar(500) } : null,
      },
      undefined,
      'MarcajeService.adminEliminarMarcaje',
    );
    return result[0] || { ok: false, mensaje: 'Sin resultado' };
  }

  // ==========================================
  // ADMIN — REINICIAR ESTADO DE EMPLEADO
  // ==========================================

  async adminReiniciarEstado(
    carnet: string,
    adminCarnet: string,
    motivo?: string,
  ) {
    this.logger.log(
      `[ADMIN] Reiniciando estado de ${carnet} por ${adminCarnet}`,
    );
    const result = await ejecutarSP(
      'sp_marcaje_admin_reiniciar',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        admin_carnet: { valor: adminCarnet, tipo: NVarChar(20) },
        motivo: motivo ? { valor: motivo, tipo: NVarChar(500) } : null,
      },
      undefined,
      'MarcajeService.adminReiniciarEstado',
    );
    return result[0] || { ok: false, mensaje: 'Sin resultado' };
  }

  // ==========================================
  // ADMIN — REPORTES DE ASISTENCIA
  // ==========================================

  async adminGetReportes(
    fechaInicio: string,
    fechaFin: string,
    carnet?: string,
  ) {
    try {
      return await ejecutarSP(
        'sp_marcaje_reporte_asistencia',
        {
          fecha_inicio: { valor: new Date(fechaInicio), tipo: DateTime },
          fecha_fin: { valor: new Date(fechaFin), tipo: DateTime },
          carnet: carnet ? { valor: carnet, tipo: NVarChar(20) } : null,
        },
        undefined,
        'MarcajeService.adminGetReportes',
      );
    } catch (e) {
      this.logger.warn(`[ADMIN] Error en adminGetReportes: ${e}`);
      return [];
    }
  }

  // ==========================================
  // ADMIN — CRUD SITES (GEOCERCAS)
  // ==========================================

  async adminCrearSite(data: {
    nombre: string;
    lat: number;
    lon: number;
    radio_metros?: number;
    accuracy_max?: number;
  }) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_crud_site',
      {
        accion: { valor: 'CREAR', tipo: NVarChar(20) },
        nombre: { valor: data.nombre, tipo: NVarChar(200) },
        lat: { valor: data.lat, tipo: Decimal(10, 7) },
        lon: { valor: data.lon, tipo: Decimal(10, 7) },
        radio_metros: { valor: data.radio_metros || 200, tipo: Int },
        accuracy_max: { valor: data.accuracy_max || 100, tipo: Int },
      },
      undefined,
      'MarcajeService.adminCrearSite',
    );
    return result[0];
  }

  async adminEditarSite(
    id: number,
    data: {
      nombre?: string;
      lat?: number;
      lon?: number;
      radio_metros?: number;
      accuracy_max?: number;
      activo?: boolean;
    },
  ) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_crud_site',
      {
        accion: { valor: 'EDITAR', tipo: NVarChar(20) },
        id: { valor: id, tipo: Int },
        nombre: data.nombre
          ? { valor: data.nombre, tipo: NVarChar(200) }
          : null,
        lat:
          data.lat != null ? { valor: data.lat, tipo: Decimal(10, 7) } : null,
        lon:
          data.lon != null ? { valor: data.lon, tipo: Decimal(10, 7) } : null,
        radio_metros:
          data.radio_metros != null
            ? { valor: data.radio_metros, tipo: Int }
            : null,
        accuracy_max:
          data.accuracy_max != null
            ? { valor: data.accuracy_max, tipo: Int }
            : null,
        activo: { valor: data.activo !== false ? 1 : 0, tipo: Int },
      },
      undefined,
      'MarcajeService.adminEditarSite',
    );
    return result[0];
  }

  async adminEliminarSite(id: number) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_crud_site',
      {
        accion: { valor: 'ELIMINAR', tipo: NVarChar(20) },
        id: { valor: id, tipo: Int },
      },
      undefined,
      'MarcajeService.adminEliminarSite',
    );
    return result[0];
  }

  // ==========================================
  // ADMIN — CRUD IPs WHITELIST
  // ==========================================

  async adminCrearIp(data: { nombre: string; cidr: string }) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_crud_ip',
      {
        accion: { valor: 'CREAR', tipo: NVarChar(20) },
        nombre: { valor: data.nombre, tipo: NVarChar(200) },
        cidr: { valor: data.cidr, tipo: NVarChar(50) },
      },
      undefined,
      'MarcajeService.adminCrearIp',
    );
    return result[0];
  }

  async adminEliminarIp(id: number) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_crud_ip',
      {
        accion: { valor: 'ELIMINAR', tipo: NVarChar(20) },
        id: { valor: id, tipo: Int },
      },
      undefined,
      'MarcajeService.adminEliminarIp',
    );
    return result[0];
  }

  // ==========================================
  // ADMIN — GESTIÓN DE DISPOSITIVOS
  // ==========================================

  async adminActualizarDevice(uuid: string, estado: string) {
    const result = await ejecutarSP(
      'sp_marcaje_admin_device',
      {
        uuid: { valor: uuid, tipo: NVarChar(100) },
        estado: { valor: estado, tipo: NVarChar(20) },
      },
      undefined,
      'MarcajeService.adminActualizarDevice',
    );
    return result[0];
  }

  // ==========================================
  // GEOCERCAS POR USUARIO
  // ==========================================

  /**
   * Validar si un usuario está dentro de alguna geocerca asignada.
   * NUNCA bloquea el marcaje — solo informa para admin/jefe.
   */
  async validarGeocerca(carnet: string, lat: number, lon: number) {
    const result = await ejecutarSP(
      'sp_marcaje_validar_geocerca',
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        lat: { valor: lat, tipo: Decimal(10, 7) },
        lon: { valor: lon, tipo: Decimal(10, 7) },
      },
      undefined,
      'MarcajeService.validarGeocerca',
    );
    return result[0] || { dentro_geocerca: true, estado: 'SIN_RESTRICCION' };
  }

  /**
   * Listar geocercas asignadas a un usuario
   */
  async getGeocercasUsuario(carnet: string) {
    return ejecutarSP(
      'sp_marcaje_geocercas_usuario',
      { carnet: { valor: carnet, tipo: NVarChar(20) } },
      undefined,
      'MarcajeService.getGeocercasUsuario',
    );
  }

  /**
   * Asignar geocerca(s) a un usuario
   */
  async asignarGeocerca(carnet: string, idSite: number) {
    this.logger.log(`[GEOCERCA] Asignando site ${idSite} a ${carnet}`);
    await ejecutarQuery(
      `IF NOT EXISTS (
        SELECT 1 FROM marcaje_usuario_geocercas
        WHERE carnet = @carnet AND id_site = @site AND activo = 1
       )
       INSERT INTO marcaje_usuario_geocercas (carnet, id_site) VALUES (@carnet, @site)`,
      {
        carnet: { valor: carnet, tipo: NVarChar(20) },
        site: { valor: idSite, tipo: Int },
      },
      'MarcajeService.asignarGeocerca',
    );
    return { ok: true };
  }

  /**
   * Quitar geocerca de un usuario
   */
  async quitarGeocerca(id: number) {
    await ejecutarQuery(
      `UPDATE marcaje_usuario_geocercas SET activo = 0 WHERE id = @id`,
      { id: { valor: id, tipo: Int } },
      'MarcajeService.quitarGeocerca',
    );
    return { ok: true };
  }
}
