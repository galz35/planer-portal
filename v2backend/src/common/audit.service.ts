import { Injectable, Logger } from '@nestjs/common';
import * as auditRepo from './audit.repo';
import { LogSistemaDb, AuditLogDb } from '../db/tipos';

/**
 * Tipos de acciones que se pueden auditar
 */
export enum AccionAudit {
  // Tareas
  TAREA_CREADA = 'TAREA_CREADA',
  TAREA_ACTUALIZADA = 'TAREA_ACTUALIZADA',
  TAREA_ELIMINADA = 'TAREA_ELIMINADA',
  TAREA_COMPLETADA = 'TAREA_COMPLETADA',
  TAREA_ASIGNADA = 'TAREA_ASIGNADA',
  TAREA_REASIGNADA = 'TAREA_REASIGNADA',
  TAREA_MOVIDA = 'TAREA_MOVIDA',

  // Proyectos
  PROYECTO_CREADO = 'PROYECTO_CREADO',
  PROYECTO_ACTUALIZADO = 'PROYECTO_ACTUALIZADO',
  PROYECTO_ARCHIVADO = 'PROYECTO_ARCHIVADO',

  // Bloqueos
  BLOQUEO_CREADO = 'BLOQUEO_CREADO',
  BLOQUEO_RESUELTO = 'BLOQUEO_RESUELTO',

  // Check-ins
  CHECKIN_CREADO = 'CHECKIN_CREADO',
  CHECKIN_ACTUALIZADO = 'CHECKIN_ACTUALIZADO',

  // Usuarios
  USUARIO_LOGIN = 'USUARIO_LOGIN',
  USUARIO_LOGOUT = 'USUARIO_LOGOUT',
  USUARIO_CREADO = 'USUARIO_CREADO',
  USUARIO_ACTUALIZADO = 'USUARIO_ACTUALIZADO',
  USUARIO_DESACTIVADO = 'USUARIO_DESACTIVADO',

  // Permisos
  PERMISO_OTORGADO = 'PERMISO_OTORGADO',
  PERMISO_REVOCADO = 'PERMISO_REVOCADO',
  DELEGACION_CREADA = 'DELEGACION_CREADA',
  DELEGACION_REVOCADA = 'DELEGACION_REVOCADA',

  // Sistema
  ERROR_SISTEMA = 'ERROR_SISTEMA',
  IMPORTACION_DATOS = 'IMPORTACION_DATOS',
}

/**
 * Tipos de recursos
 */
export enum RecursoAudit {
  TAREA = 'Tarea',
  PROYECTO = 'Proyecto',
  USUARIO = 'Usuario',
  BLOQUEO = 'Bloqueo',
  CHECKIN = 'Checkin',
  PERMISO = 'Permiso',
  SISTEMA = 'Sistema',
}

export interface AuditLogDto {
  idUsuario?: number; // Opcional (legacy)
  carnet?: string; // Principal
  accion: AccionAudit | string;
  recurso: RecursoAudit | string;
  recursoId?: string;
  datosAnteriores?: any;
  datosNuevos?: any;
  detalles?: Record<string, any>;
  ip?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor() { }

  /**
   * Registra una acción de auditoría
   */
  async log(dto: AuditLogDto) {
    try {
      await auditRepo.crearAuditLog({
        idUsuario: dto.idUsuario,
        carnet: dto.carnet,
        accion: dto.accion,
        entidad: dto.recurso,
        entidadId: dto.recursoId,
        datosAnteriores: dto.datosAnteriores
          ? typeof dto.datosAnteriores === 'string'
            ? dto.datosAnteriores
            : JSON.stringify(dto.datosAnteriores)
          : undefined,
        datosNuevos: dto.datosNuevos
          ? typeof dto.datosNuevos === 'string'
            ? dto.datosNuevos
            : JSON.stringify(dto.datosNuevos)
          : dto.detalles
            ? JSON.stringify(dto.detalles)
            : undefined,
      });
      this.logger.debug(
        `Audit: ${dto.accion} - ${dto.recurso}:${dto.recursoId} by ${dto.carnet || dto.idUsuario}`,
      );
    } catch (error) {
      this.logger.error('Error guardando audit log', error);
    }
    return null;
  }

  /**
   * Registra un log del sistema
   */
  async logSistema(
    nivel: 'Error' | 'Warn' | 'Info',
    origen: string,
    mensaje: string,
    stack?: string,
    idUsuario?: number,
  ) {
    try {
      await auditRepo.crearLogSistema({
        idUsuario,
        accion: nivel,
        entidad: origen,
        datos: `${mensaje} ${stack ? ' | ' + stack : ''}`,
      });
    } catch (error) {
      this.logger.error('Error guardando log sistema', error);
    }
    return null;
  }

  async error(
    origen: string,
    mensaje: string,
    error?: Error,
    idUsuario?: number,
  ): Promise<void> {
    await this.logSistema('Error', origen, mensaje, error?.stack, idUsuario);
  }

  async warn(
    origen: string,
    mensaje: string,
    idUsuario?: number,
  ): Promise<void> {
    await this.logSistema('Warn', origen, mensaje, undefined, idUsuario);
  }

  async info(
    origen: string,
    mensaje: string,
    idUsuario?: number,
  ): Promise<void> {
    await this.logSistema('Info', origen, mensaje, undefined, idUsuario);
  }

  // ============ CONSULTAS ============

  async listarAudit(page: number = 1, limit: number = 50, filtros?: any) {
    const offset = (page - 1) * limit;
    const items = await auditRepo.listarAuditLogs(limit, offset, filtros);
    const total = await auditRepo.contarAuditLogs(filtros);

    // Mapear items a estructura esperada
    const mappedItems = items.map((i: any) => ({
      ...i,
      idAudit: i.id || i.idAudit,
      usuario: i.nombreUsuario || i.usuario || 'Sistema',
      correo: i.correoUsuario,
      recurso: i.entidad,
      recursoId: i.entidadId,
      datosAnteriores: i.datosAnteriores,
      datosNuevos: i.datosNuevos,
      detalles: i.datosNuevos, // Compatibilidad con frontend antiguo
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listarAuditPorCarnet(
    carnetSolicitante: string,
    page: number = 1,
    limit: number = 50,
    query?: string,
  ) {
    // Uso directo de SP Carnet-First
    const items = await auditRepo.listarAuditLogsPorCarnet(
      carnetSolicitante,
      page,
      limit,
      query,
    );
    const total = await auditRepo.contarAuditLogsPorCarnet(
      carnetSolicitante,
      query,
    );

    const mappedItems = items.map((i: any) => ({
      ...i,
      idAudit: i.idAuditLog,
      usuario: i.usuario || 'Desconocido',
      correo: i.correoUsuario,
      recurso: i.recurso,
      recursoId: i.recursoId,
      detalles: i.datosNuevos, // Compatibilidad
      // Sanitización preventiva anti-bloqueo
      datosNuevos:
        i.datosNuevos && i.datosNuevos.length > 5000
          ? i.datosNuevos.substring(0, 5000) + '... (Truncated)'
          : i.datosNuevos,
      datosAnteriores:
        i.datosAnteriores && i.datosAnteriores.length > 5000
          ? i.datosAnteriores.substring(0, 5000) + '... (Truncated)'
          : i.datosAnteriores,
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listarLogs(page: number = 1, limit: number = 100, filtros?: any) {
    const offset = (page - 1) * limit;
    const items = await auditRepo.listarLogsSistema(limit, offset, filtros);
    const total = await auditRepo.contarLogsSistema(filtros);

    const mappedItems = items.map((i: any) => ({
      ...i,
      idLog: i.id, // Frontend expects idLog
      nivel: i.accion,
      origen: i.entidad,
      mensaje: i.datos,
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      estadisticas: {
        errors: 0,
        warns: 0,
        infos: 0,
      },
    };
  }

  async getResumenActividad(dias: number = 7) {
    return auditRepo.obtenerResumenActividad(dias);
  }

  async getHistorialEntidad(entidad: string, entidadId: string) {
    const items = await auditRepo.listarAuditLogs(50, 0, {
      entidad,
      entidadId,
    });
    return items.map((i) => ({
      ...i,
      detalles: i.datosNuevos
        ? i.datosNuevos.startsWith('{')
          ? JSON.parse(i.datosNuevos)
          : i.datosNuevos
        : null,
    }));
  }

  async getAuditLogDetalle(id: number) {
    return await auditRepo.obtenerAuditLogPorId(id);
  }

  async getHistorialProyecto(
    idProyecto: number,
    page: number = 1,
    limit: number = 50,
  ) {
    const offset = (page - 1) * limit;
    const items = await auditRepo.listarAuditLogsProyecto(
      idProyecto,
      limit,
      offset,
    );
    const total = await auditRepo.contarAuditLogsProyecto(idProyecto);

    const mappedItems = items.map((i: any) => ({
      ...i,
      idAudit: i.id || i.idAudit,
      usuario: i.nombreUsuario || i.usuario || 'Sistema',
      correo: i.correoUsuario,
      recurso: i.entidad,
      recursoId: i.entidadId,
      tareaTitulo: i.tareaNombre, // Enriched info
      datosAnteriores: i.datosAnteriores,
      datosNuevos: i.datosNuevos,
      detalles: i.datosNuevos,
    }));

    return {
      items: mappedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
