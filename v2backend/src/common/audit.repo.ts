/**
 * Audit Repository - Gestión de Logs y Auditoría
 */
import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  DateTime,
} from '../db/base.repo';
import { LogSistemaDb, AuditLogDb, ResultadoPaginado } from '../db/tipos';

// ==========================================
// ESCRITURA
// ==========================================

export async function crearLogSistema(log: Partial<LogSistemaDb>) {
  await ejecutarQuery(
    `
        INSERT INTO p_Logs (idUsuario, accion, entidad, datos, fecha)
        VALUES (@idUsuario, @accion, @entidad, @datos, GETDATE())
    `,
    {
      idUsuario: { valor: log.idUsuario || null, tipo: Int },
      accion: { valor: log.accion || 'UNKNOWN', tipo: NVarChar },
      entidad: { valor: log.entidad || null, tipo: NVarChar },
      datos: { valor: log.datos || null, tipo: NVarChar },
    },
  );
}

export async function crearAuditLog(audit: Partial<AuditLogDb>) {
  await ejecutarQuery(
    `
        INSERT INTO p_Auditoria (idUsuario, carnet, accion, entidad, entidadId, datosAnteriores, datosNuevos, fecha)
        VALUES (@idUsuario, @carnet, @accion, @entidad, @entidadId, @datosAnteriores, @datosNuevos, GETDATE())
    `,
    {
      idUsuario: { valor: audit.idUsuario || null, tipo: Int },
      carnet: { valor: (audit as any).carnet || null, tipo: NVarChar }, // Now supporting carnet directly
      accion: { valor: audit.accion, tipo: NVarChar },
      entidad: { valor: audit.entidad, tipo: NVarChar },
      entidadId: { valor: audit.entidadId, tipo: NVarChar },
      datosAnteriores: { valor: audit.datosAnteriores, tipo: NVarChar },
      datosNuevos: { valor: audit.datosNuevos, tipo: NVarChar },
    },
  );
}

// NUEVO: Lectura optimizada por equipo usando Carnet
export async function listarAuditLogsPorCarnet(
  carnetSolicitante: string,
  page: number = 1,
  limit: number = 50,
  searchTerm?: string,
) {
  console.log(
    `[AUDIT-REPO] Llamando sp_Auditoria_Equipo_PorCarnet_FAST. Carnet: ${carnetSolicitante}, Page: ${page}, Limit: ${limit}`,
  );

  // Safety check
  if (!carnetSolicitante) {
    console.warn(
      '[AUDIT-REPO] Carnet es null/undefined. Retornando vacío preventivo.',
    );
    return [];
  }

  try {
    const result = await ejecutarSP<any>('sp_Auditoria_Equipo_PorCarnet_FAST', {
      carnetSolicitante: { valor: String(carnetSolicitante), tipo: NVarChar },
      searchTerm: { valor: searchTerm || null, tipo: NVarChar },
      page: { valor: Number(page) || 1, tipo: Int },
      pageSize: { valor: Number(limit) || 50, tipo: Int },
    });
    console.log(`[AUDIT-REPO] SP Retornó ${result.length} filas.`);
    return result;
  } catch (err) {
    console.error('[AUDIT-REPO] Error crítico ejecutando SP:', err);
    throw err;
  }
}

export async function contarAuditLogsPorCarnet(
  carnetSolicitante: string,
  searchTerm?: string,
) {
  const res = await ejecutarSP<{ total: number }>(
    'sp_Auditoria_Equipo_PorCarnet_Contar',
    {
      carnetSolicitante: { valor: carnetSolicitante, tipo: NVarChar },
      searchTerm: { valor: searchTerm || null, tipo: NVarChar },
    },
  );
  return res[0]?.total || 0;
}

// ==========================================
// LECTURA
// ==========================================

export async function listarLogsSistema(
  limit: number,
  offset: number,
  filtros: any = {},
) {
  const whereClause = '1=1';
  // Implementar filtros simples si se requieren
  return await ejecutarQuery<LogSistemaDb>(`
        SELECT * FROM p_Logs 
        WHERE ${whereClause}
        ORDER BY fecha DESC
        OFFSET ${Math.floor(offset)} ROWS FETCH NEXT ${Math.floor(limit)} ROWS ONLY
    `);
}

export async function contarLogsSistema(filtros: any = {}) {
  const res = await ejecutarQuery<{ total: number }>(
    `SELECT COUNT(*) as total FROM p_Logs`,
  );
  return res[0].total;
}

export async function listarAuditLogs(
  limit: number,
  offset: number,
  filtros: any = {},
) {
  let whereClause = '1=1';
  const params: any = {};

  if (filtros.idUsuario) {
    whereClause += ' AND a.idUsuario = @idUsuario';
    params.idUsuario = { valor: filtros.idUsuario, tipo: Int };
  }

  if (
    filtros.idsUsuarios &&
    Array.isArray(filtros.idsUsuarios) &&
    filtros.idsUsuarios.length > 0
  ) {
    const ids = filtros.idsUsuarios.map(Number).join(',');
    whereClause += ` AND a.idUsuario IN (${ids})`;
  }

  if (filtros.recurso) {
    whereClause += ' AND a.entidad = @recurso';
    params.recurso = { valor: filtros.recurso, tipo: NVarChar };
  }

  if (filtros.query) {
    whereClause +=
      ' AND (a.entidadId LIKE @query OR a.accion LIKE @query OR u.nombre LIKE @query)';
    params.query = { valor: `%${filtros.query}%`, tipo: NVarChar };
  }

  if (filtros.entidad) {
    whereClause += ' AND a.entidad = @entidad';
    params.entidad = { valor: filtros.entidad, tipo: NVarChar };
  }

  if (filtros.entidadId) {
    whereClause += ' AND a.entidadId = @entidadId';
    params.entidadId = { valor: String(filtros.entidadId), tipo: NVarChar };
  }

  return await ejecutarQuery<any>(
    `
        SELECT a.*, u.nombre as nombreUsuario, u.correo as correoUsuario
        FROM p_Auditoria a
        LEFT JOIN p_Usuarios u ON a.idUsuario = u.idUsuario
        WHERE ${whereClause}
        ORDER BY a.fecha DESC
        OFFSET ${Math.floor(offset)} ROWS FETCH NEXT ${Math.floor(limit)} ROWS ONLY
    `,
    params,
  );
}

export async function contarAuditLogs(filtros: any = {}) {
  // Simplificado
  const res = await ejecutarQuery<{ total: number }>(
    `SELECT COUNT(*) as total FROM p_Auditoria`,
  );
  return res[0].total;
}

export async function obtenerResumenActividad(dias: number) {
  // Mock o implementación simple
  return {
    totalAcciones: 0,
    accionesPorTipo: [],
    accionesPorUsuario: [],
    erroresTotales: 0,
  };
}

export async function obtenerAuditLogPorId(id: number) {
  const res = await ejecutarQuery<any>(
    `
        SELECT 
            a.*, 
            u.nombreCompleto as nombreUsuario, 
            u.correo as correoUsuario,
            u.carnet as carnetUsuario
        FROM p_Auditoria a
        LEFT JOIN p_Usuarios u ON a.carnet = u.carnet
        WHERE a.id = @id
    `,
    { id: { valor: id, tipo: Int } },
  );
  return res[0] || null;
}

// Historial Completo de Proyecto (Timeline)
export async function listarAuditLogsProyecto(
  idProyecto: number,
  limit: number,
  offset: number,
) {
  return await ejecutarQuery<any>(
    `
        WITH Scope AS (
            SELECT CAST(@pid AS NVARCHAR(50)) as Id, 'Proyecto' as Tipo
            UNION ALL
            SELECT CAST(idTarea AS NVARCHAR(50)), 'Tarea'
            FROM p_Tareas WHERE idProyecto = TRY_CAST(@pid AS INT)
        )
        SELECT a.*, 
               u.nombre as nombreUsuario, 
               u.correo as correoUsuario,
               CASE WHEN a.entidad = 'Proyecto' THEN 'Proyecto' ELSE 'Tarea' END as tipoEntidad,
               t.nombre as tareaNombre
        FROM Scope s
        INNER JOIN p_Auditoria a ON a.entidadId = s.Id AND a.entidad = s.Tipo
        LEFT JOIN p_Usuarios u ON a.idUsuario = u.idUsuario
        LEFT JOIN p_Tareas t ON (a.entidad = 'Tarea' AND TRY_CAST(a.entidadId AS INT) = t.idTarea)
        ORDER BY a.fecha DESC
        OFFSET ${Math.floor(offset)} ROWS FETCH NEXT ${Math.floor(limit)} ROWS ONLY
    `,
    { pid: { valor: String(idProyecto), tipo: NVarChar } },
  );
}

export async function contarAuditLogsProyecto(idProyecto: number) {
  const res = await ejecutarQuery<{ total: number }>(
    `
        WITH Scope AS (
            SELECT CAST(@pid AS NVARCHAR(50)) as Id, 'Proyecto' as Tipo
            UNION ALL
            SELECT CAST(idTarea AS NVARCHAR(50)), 'Tarea'
            FROM p_Tareas WHERE idProyecto = TRY_CAST(@pid AS INT)
        )
        SELECT COUNT(*) as total
        FROM Scope s
        INNER JOIN p_Auditoria a ON a.entidadId = s.Id AND a.entidad = s.Tipo
    `,
    { pid: { valor: String(idProyecto), tipo: NVarChar } },
  );
  return res[0].total;
}
