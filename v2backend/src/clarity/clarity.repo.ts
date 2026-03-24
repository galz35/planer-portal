
import {
  ejecutarQuery,
  ejecutarSP,
  ejecutarSPMulti,
  Int,
  NVarChar,
  Bit,
  DateTime,
  SqlDate,
  sql,
} from '../db/base.repo';
import { UsuarioDb, CheckinDb } from '../db/tipos';

export { ejecutarQuery };

// ==========================================
// TAREAS (Usan SP sp_Tarea_Crear)
// Migrado: 2026-01-21 02:05
// ==========================================

/**
 * @deprecated ELIMINADO (Deuda Técnica): Usar tasks.repo.crearTarea()
 */
export async function crearTarea(tarea: Partial<any>): Promise<number> {
  throw new Error('MÉTODO ELIMINADO. Usar tasks.repo.crearTarea()');
}

// Helper para resolver carnet (Solo para compatibilidad con datos viejos)
async function resolverCarnet(idOrCarnet: number | string): Promise<string> {
  if (typeof idOrCarnet === 'string' && idOrCarnet.length > 3)
    return idOrCarnet;
  if (!idOrCarnet) return '';
  const res = await ejecutarQuery<{ carnet: string }>(
    `SELECT carnet FROM p_Usuarios WHERE idUsuario = @id`,
    { id: { valor: idOrCarnet, tipo: Int } },
  );
  return res[0]?.carnet || '';
}

export async function asignarUsuarioTarea(
  idTarea: number,
  carnet: string | number,
  tipo: string = 'Responsable',
) {
  const carnetFinal = await resolverCarnet(carnet);
  if (!carnetFinal) return;

  await ejecutarSP('sp_Tarea_AsignarResponsable', {
    idTarea: { valor: idTarea, tipo: Int },
    carnetUsuario: { valor: carnetFinal, tipo: NVarChar },
    tipo: { valor: tipo, tipo: NVarChar },
    esReasignacion: { valor: 0, tipo: sql.Bit },
  });
}

export async function reasignarResponsable(
  idTarea: number,
  carnet: string | number,
) {
  const carnetFinal = await resolverCarnet(carnet);
  if (!carnetFinal) return;

  await ejecutarSP('sp_Tarea_AsignarResponsable', {
    idTarea: { valor: idTarea, tipo: Int },
    carnetUsuario: { valor: carnetFinal, tipo: NVarChar },
    tipo: { valor: 'Responsable', tipo: NVarChar },
    esReasignacion: { valor: 1, tipo: sql.Bit },
  });
}

export async function eliminarTarea(
  idTarea: number,
  carnet: string,
  motivo: string = 'Eliminación manual',
) {
  // FORCE SOFT DELETE
  await ejecutarQuery(
    `
        UPDATE p_Tareas 
        SET activo = 0, estado = 'Eliminada', fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea
    `,
    {
      idTarea: { valor: idTarea, tipo: Int },
    },
  );
}

export async function descartarTareaRecursivo(
  idTarea: number,
  carnet: string,
  motivo: string = 'Descarte manual',
) {
  // 2026-03-01: Ejecución de SP de descarte recursivo (Mantenibilidad / Integridad)
  await ejecutarSP('sp_Tarea_DescartarConSubtareas', {
    idTarea: { valor: idTarea, tipo: Int },
    carnet: { valor: carnet, tipo: NVarChar },
    motivo: { valor: motivo, tipo: NVarChar },
  });
}

export async function moverTareaAProyecto(
  idTarea: number,
  idProyectoDestino: number,
  idUsuarioEjecutor: number,
  moverSubtareas: boolean = true,
) {
  // 2026-03-01: Mover tarea entre proyectos (Integridad total)
  return await ejecutarSP('sp_Tarea_MoverAProyecto', {
    idTarea: { valor: idTarea, tipo: Int },
    idProyectoDestino: { valor: idProyectoDestino, tipo: Int },
    idUsuarioEjecutor: { valor: idUsuarioEjecutor, tipo: Int },
    moverSubtareas: { valor: moverSubtareas ? 1 : 0, tipo: Bit },
  });
}

export async function restaurarTarea(idTarea: number) {
  await ejecutarQuery(
    `
        UPDATE p_Tareas 
        SET activo = 1, estado = 'Pendiente', fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea
    `,
    {
      idTarea: { valor: idTarea, tipo: Int },
    },
  );
}

export async function eliminarTareaAdmin(
  idTarea: number,
  motivo: string = 'Eliminación Admin',
) {
  await ejecutarQuery(
    `
        UPDATE p_Tareas 
        SET activo = 0, 
            estado = 'Eliminada'
        WHERE idTarea = @idTarea
    `,
    {
      idTarea: { valor: idTarea, tipo: Int },
    },
  );
}

export async function getTareasUsuario(
  carnet: string,
  estado?: string,
  idProyecto?: number,
  startDate?: Date,
  endDate?: Date,
  query?: string,
) {
  return await ejecutarSP('sp_Tareas_ObtenerPorUsuario', {
    carnet: { valor: carnet, tipo: NVarChar },
    estado: { valor: estado || null, tipo: NVarChar },
    idProyecto: { valor: idProyecto || null, tipo: Int },
    query: { valor: query || null, tipo: NVarChar },
    startDate: { valor: startDate || null, tipo: DateTime },
    endDate: { valor: endDate || null, tipo: DateTime },
  });
}

export async function obtenerEquipoHoy(
  carnetsMiembros: string[],
  fechaStr: string,
): Promise<any> {
  if (carnetsMiembros.length === 0)
    return {
      miembros: [],
      resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
    };

  const carnetsList = carnetsMiembros.join(',');

  // Miembros del equipo con su rol (Usando carnet)
  // Miembros del equipo con su rol (Optimized SP via Acceso Repo standard)
  const miembros = await ejecutarSP<any>(
    'sp_Usuarios_ObtenerDetallesPorCarnets',
    {
      CarnetsCsv: { valor: carnetsList, tipo: NVarChar },
    },
  );

  if (miembros.length === 0)
    return {
      miembros: [],
      resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
    };

  // Checkins para el día (Usando carnet)
  // 2026-01-27: Optimization - Use SP instead of Inline Query
  // const checkins = await ejecutarQuery<CheckinDb>(`...`)
  const checkins = await ejecutarSP<CheckinDb>(
    'sp_Checkins_ObtenerPorEquipoFecha',
    {
      carnetsList: { valor: carnetsList, tipo: NVarChar },
      fecha: { valor: new Date(fechaStr), tipo: SqlDate },
    },
  );

  const stats = await ejecutarSP<{
    carnet: string;
    retrasadas: number;
    planificadas: number;
    hechas: number;
    enCurso: number;
    bloqueadas: number;
    descartadas: number;
  }>('sp_Equipo_ObtenerHoy', {
    carnetsList: { valor: carnetsList, tipo: NVarChar },
    fecha: { valor: new Date(fechaStr), tipo: SqlDate },
  });

  const resultMiembros = miembros.map((m) => {
    const checkin = checkins.find((c) => (c as any).usuarioCarnet === m.carnet);
    const userStats = stats.find((s) => (s as any).carnet === m.carnet);

    return {
      usuario: {
        idUsuario: m.idUsuario,
        nombre: m.nombre || m.nombreCompleto,
        correo: m.correo,
        carnet: m.carnet,
        area: m.subgerencia || m.departamento || m.orgDepartamento || 'General',
        rol: { nombre: m.rolNombre || m.cargo || 'General' },
      },
      checkin: checkin
        ? {
          idCheckin: checkin.idCheckin,
          fecha: checkin.fecha,
          estadoAnimo: checkin.estadoAnimo,
          nota: checkin.nota,
          entregableTexto: checkin.entregableTexto,
        }
        : null,
      estadisticas: {
        retrasadas: userStats?.retrasadas || 0,
        hoy: userStats?.planificadas || 0, // Mapeamos planificadas a "hoy" o lo usamos como base
        hechas: userStats?.hechas || 0,
        enCurso: userStats?.enCurso || 0,
        bloqueadas: userStats?.bloqueadas || 0,
        descartadas: userStats?.descartadas || 0,
      },
    };
  });

  const animos = checkins.map((c) => c.estadoAnimo).filter(Boolean);
  const resumenAnimo = {
    feliz: animos.filter((a) => a === 'Tope' || a === 'Bien').length,
    neutral: animos.filter((a) => a === 'Neutral' || !a).length,
    triste: animos.filter((a) => a === 'Bajo').length,
    promedio:
      resultMiembros.length > 0
        ? (animos.length / resultMiembros.length) * 100
        : 0,
  };

  return {
    miembros: resultMiembros,
    resumenAnimo,
  };
}

export async function obtenerEquipoInforme(
  carnetsMiembros: string[],
  fechaStr: string,
): Promise<any> {
  if (carnetsMiembros.length === 0)
    return {
      miembros: [],
      resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
    };

  const carnetsList = carnetsMiembros.join(',');

  // 1. Obtener Info de Miembros (Nombre, Rol, etc)
  // 1. Obtener Info de Miembros (Optimized SP via Acceso Repo standard)
  const miembros = await ejecutarSP<any>(
    'sp_Usuarios_ObtenerDetallesPorCarnets',
    {
      CarnetsCsv: { valor: carnetsList, tipo: NVarChar },
    },
  );

  console.log(
    `[DEBUG] obtenerEquipoInforme: carnetsList length=${carnetsMiembros.length}, miembros found=${miembros.length}`,
  );
  if (miembros.length > 0)
    console.log(`[DEBUG] Primer miembro carnet: ${miembros[0].carnet}`);

  if (miembros.length === 0)
    return {
      miembros: [],
      resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
    };

  // 2. Obtener Checkins (Solo para mood y status del día)
  // 2. Obtener Checkins (Optimized SP)
  const checkins = await ejecutarSP<CheckinDb>(
    'sp_Checkins_ObtenerPorEquipoFecha',
    {
      carnetsList: { valor: carnetsList, tipo: NVarChar },
      fecha: { valor: new Date(fechaStr), tipo: SqlDate },
    },
  );

  // 3. Ejecutar NUEVO SP de Informe
  const stats = await ejecutarSP<{
    carnet: string;
    retrasadas: number;
    planificadas: number;
    hechas: number;
    enCurso: number;
    bloqueadas: number;
    descartadas: number;
  }>('sp_Equipo_ObtenerInforme', {
    carnetsList: { valor: carnetsList, tipo: NVarChar },
    fecha: { valor: new Date(fechaStr), tipo: SqlDate },
  });

  // 4. Mapear Resultados
  const resultMiembros = miembros.map((m) => {
    const checkin = checkins.find((c) => (c as any).usuarioCarnet === m.carnet);
    const userStats = stats.find((s) => (s as any).carnet === m.carnet);

    return {
      usuario: {
        idUsuario: m.idUsuario,
        nombre: m.nombre || m.nombreCompleto,
        correo: m.correo,
        carnet: m.carnet,
        rol: { nombre: m.rolNombre || m.cargo || 'General' },
      },
      checkin: checkin
        ? {
          idCheckin: checkin.idCheckin,
          fecha: checkin.fecha,
          estadoAnimo: checkin.estadoAnimo,
          nota: checkin.nota,
          entregableTexto: checkin.entregableTexto,
        }
        : null,
      estadisticas: {
        retrasadas: userStats?.retrasadas || 0,
        hoy: userStats?.planificadas || 0,
        hechas: userStats?.hechas || 0,
        enCurso: userStats?.enCurso || 0,
        bloqueadas: userStats?.bloqueadas || 0,
        descartadas: userStats?.descartadas || 0,
      },
    };
  });

  // 5. Calcular Resumen de Animo
  const animos = checkins.map((c) => c.estadoAnimo).filter(Boolean);
  const resumenAnimo = {
    feliz: animos.filter((a) => a === 'Tope' || a === 'Bien').length,
    neutral: animos.filter((a) => a === 'Neutral' || !a).length,
    triste: animos.filter((a) => a === 'Bajo').length,
    promedio:
      resultMiembros.length > 0
        ? (animos.length / resultMiembros.length) * 100
        : 0,
  };

  return {
    miembros: resultMiembros,
    resumenAnimo,
  };
}

export async function checkinUpsert(checkin: any): Promise<number> {
  const carnet = checkin.carnet || checkin.usuarioCarnet;
  if (!carnet) throw new Error('Checkin requiere Carnet válido.');

  const tvpTareas = new sql.Table('dbo.TVP_CheckinTareas');
  tvpTareas.columns.add('idTarea', sql.Int);
  tvpTareas.columns.add('tipo', sql.NVarChar(20));

  if (checkin.entrego)
    checkin.entrego.forEach((id: number) => tvpTareas.rows.add(id, 'Entrego'));
  if (checkin.avanzo)
    checkin.avanzo.forEach((id: number) => tvpTareas.rows.add(id, 'Avanzo'));
  if (checkin.extras)
    checkin.extras.forEach((id: number) => tvpTareas.rows.add(id, 'Extra'));

  const isEmpty = tvpTareas.rows.length === 0;
  if (isEmpty) {
    // Añadir un valor dummy para no quebrar el TVP vacío en el driver MSSQL
    tvpTareas.rows.add(-999, 'Dummy');
  }

  const res = await ejecutarSP<{ idCheckin: number }>('sp_Checkin_Upsert_v2', {
    usuarioCarnet: { valor: carnet, tipo: NVarChar },
    fecha: { valor: checkin.fecha, tipo: SqlDate },
    prioridad1: { valor: checkin.prioridad1 || null, tipo: NVarChar },
    prioridad2: { valor: checkin.prioridad2 || null, tipo: NVarChar },
    prioridad3: { valor: checkin.prioridad3 || null, tipo: NVarChar },
    entregableTexto: { valor: checkin.entregableTexto || null, tipo: NVarChar },
    nota: { valor: checkin.nota || null, tipo: NVarChar },
    linkEvidencia: { valor: checkin.linkEvidencia || null, tipo: NVarChar },
    estadoAnimo: { valor: checkin.estadoAnimo || null, tipo: NVarChar },
    energia: { valor: checkin.energia || null, tipo: Int },
    idNodo: { valor: checkin.idNodo || null, tipo: Int },
    tareas: tvpTareas,
  });

  if (isEmpty) {
    // Limpiar el registro dummy que entró a p_CheckinTareas
    await ejecutarQuery(
      'DELETE FROM p_CheckinTareas WHERE idCheckin = @idC AND idTarea = -999',
      { idC: { valor: res[0].idCheckin, tipo: Int } }
    );
  }

  return res[0].idCheckin;
}

export async function obtenerCheckinPorFecha(
  carnet: string,
  fecha: Date,
): Promise<any | null> {
  // 2026-01-27: Optimized to use SP
  const result = await ejecutarSP<any>('sp_Checkins_ObtenerPorUsuarioFecha', {
    carnet: { valor: carnet, tipo: NVarChar },
    fecha: { valor: fecha, tipo: SqlDate }, // El SP recibe DATETIME pero lo castea internamente para buscar por dia
  });

  if (result.length === 0) return null;

  const checkin = result[0];
  const tareas = await ejecutarQuery(
    `
        SELECT ct.idTarea, ct.tipo, t.nombre as titulo, t.estado
        FROM p_CheckinTareas ct
        JOIN p_Tareas t ON ct.idTarea = t.idTarea
        WHERE ct.idCheckin = @idCheckin
    `,
    { idCheckin: { valor: checkin.idCheckin, tipo: Int } },
  );

  checkin.tareas = tareas.map((t) => ({
    idTarea: t.idTarea,
    tipo: t.tipo,
    tarea: { idTarea: t.idTarea, titulo: t.titulo, estado: t.estado },
  }));

  return checkin;
}

export async function bloquearTarea(dto: any) {
  if (!dto.carnetOrigen) {
    dto.carnetOrigen = await resolverCarnet(dto.idOrigenUsuario);
  }

  const res = await ejecutarSP('sp_Tarea_Bloquear', {
    idTarea: { valor: dto.idTarea, tipo: Int },
    carnetOrigen: { valor: dto.carnetOrigen, tipo: NVarChar },
    carnetDestino: { valor: dto.carnetDestino || null, tipo: NVarChar },
    motivo: { valor: dto.motivo, tipo: NVarChar },
    destinoTexto: { valor: dto.destinoTexto || null, tipo: NVarChar },
    accionMitigacion: { valor: dto.accionMitigacion || null, tipo: NVarChar },
  });

  return res[0] || { success: true };
}

export async function obtenerKpisDashboard(carnet: string) {
  // 2026-01-27: Optimización Multi-Resultset
  const recordsets = await ejecutarSPMulti<any>('sp_Dashboard_Kpis', {
    carnet: { valor: carnet, tipo: NVarChar },
  });

  const resumen = recordsets[0]?.[0] || {
    total: 0,
    hechas: 0,
    pendientes: 0,
    bloqueadas: 0,
    promedioAvance: 0,
  };
  const statsProyecto = recordsets[1] || [];

  return {
    resumen,
    proyectos: statsProyecto,
    avanceMensual: [],
  };
}

export async function obtenerNotasUsuario(carnet: string) {
  return await ejecutarSP('sp_Notas_Obtener', {
    carnet: { valor: carnet, tipo: NVarChar },
  });
}

export async function crearNota(nota: {
  carnet: string;
  titulo: string;
  content: string;
}) {
  await ejecutarSP('sp_Nota_Crear', {
    carnet: { valor: nota.carnet, tipo: NVarChar },
    titulo: { valor: nota.titulo, tipo: NVarChar },
    contenido: { valor: nota.content, tipo: NVarChar },
  });
}

export async function actualizarNota(
  idNota: number,
  nota: { titulo: string; content: string },
) {
  await ejecutarSP('sp_Nota_Actualizar', {
    idNota: { valor: idNota, tipo: Int },
    titulo: { valor: nota.titulo, tipo: NVarChar },
    contenido: { valor: nota.content, tipo: NVarChar },
  });
}

export async function obtenerNotaPorId(idNota: number) {
  const result = await ejecutarQuery<any>(
    `SELECT idNota, carnet, titulo, contenido FROM p_Notas WHERE idNota = @id`,
    {
      id: { valor: idNota, tipo: Int },
    },
  );
  return result[0] || null;
}

export async function eliminarNota(idNota: number) {
  await ejecutarSP('sp_Nota_Eliminar', { id: { valor: idNota, tipo: Int } });
}

export async function obtenerTareasHistorico(carnet: string, dias: number) {
  const sqlQuery = `
        SELECT DISTINCT
            t.idTarea, t.idProyecto,
            t.nombre as titulo,
            t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipoTarea as tipo,
            t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado as fechaHecha,
            t.porcentaje as progreso,
            t.orden, t.idCreador, t.fechaInicioPlanificada,
            t.fechaActualizacion as fechaUltActualizacion,
            p.nombre as proyectoNombre,
            CAST(c.fecha AS DATE) as fechaTrabajada,
            ct.tipo as tipoCheckin,
            COALESCE(c.fecha, t.fechaCreacion) as fechaOrden
        FROM p_Tareas t
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_CheckinTareas ct ON t.idTarea = ct.idTarea
        LEFT JOIN p_Checkins c ON ct.idCheckin = c.idCheckin
        WHERE (t.creadorCarnet = @carnet OR ta.carnet = @carnet)
          AND t.activo = 1
          AND (
            c.fecha >= DATEADD(day, -@dias, GETDATE())
            OR t.fechaCreacion >= DATEADD(day, -@dias, GETDATE())
            OR t.fechaCompletado >= DATEADD(day, -@dias, GETDATE())
          )
        ORDER BY fechaOrden DESC
    `;
  return await ejecutarQuery(sqlQuery, {
    carnet: { valor: carnet, tipo: NVarChar },
    dias: { valor: dias, tipo: Int },
  });
}

export async function resolverBloqueo(idBloqueo: number, resolucion: string) {
  await ejecutarQuery(
    `UPDATE p_Bloqueos SET estado = 'Resuelto', resolucion = @res, fechaResolucion = GETDATE() WHERE idBloqueo = @id`,
    {
      res: { valor: resolucion, tipo: NVarChar },
      id: { valor: idBloqueo, tipo: Int },
    },
  );
}

export async function obtenerTareasPorProyecto(idProyecto: number) {
  return await ejecutarSP('sp_Tareas_ObtenerPorProyecto', {
    idProyecto: { valor: idProyecto, tipo: Int },
  });
}

export async function obtenerTareasMultiplesUsuarios(carnets: string[]) {
  if (carnets.length === 0) return [];
  return await ejecutarSP<any>('sp_Tareas_ObtenerMultiplesUsuarios', {
    carnetsList: { valor: carnets.join(','), tipo: NVarChar },
  });
}

export async function obtenerAgendaEquipo(
  carnets: string[],
  startDate: Date,
  endDate: Date,
) {
  if (carnets.length === 0) return [];
  const sqlQuery = `
        SELECT 
            ct.idTarea, 
            c.fecha, 
            c.usuarioCarnet
        FROM p_Checkins c
        JOIN p_CheckinTareas ct ON c.idCheckin = ct.idCheckin
        WHERE c.usuarioCarnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
          AND c.fecha >= @startDate AND c.fecha <= @endDate
    `;
  return await ejecutarQuery(sqlQuery, {
    carnets: { valor: carnets.join(','), tipo: NVarChar },
    startDate: { valor: startDate, tipo: SqlDate },
    endDate: { valor: endDate, tipo: SqlDate },
  });
}

export async function obtenerBacklog(carnet: string) {
  const sqlQuery = `
        SELECT 
            t.idTarea, t.idProyecto,
            t.nombre as titulo,
            t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipoTarea as tipo,
            t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado as fechaHecha,
            t.porcentaje as progreso,
            t.orden, t.idCreador, t.fechaInicioPlanificada,
            p.nombre as proyectoNombre,
            COALESCE(u.nombre, t.creadorCarnet, 'General / Sistema') as creadorNombre,
            res.nombre as responsableNombre,
            CAST(CASE WHEN EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea AND ta.carnet = @carnet) THEN 1 ELSE 0 END AS BIT) as asignadoDirecto
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios u ON t.creadorCarnet = u.carnet
        LEFT JOIN (
            SELECT ta2.idTarea, u2.nombre 
            FROM p_TareaAsignados ta2
            INNER JOIN p_Usuarios u2 ON ta2.carnet = u2.carnet
            WHERE ta2.tipo = 'Responsable'
        ) res ON t.idTarea = res.idTarea
        WHERE t.activo = 1
          AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
          -- FIX 2026-02-13: No mostrar tareas de proyectos inactivos
          AND (t.idProyecto IS NULL OR p.estado = 'Activo')
          AND (
            -- Criterio 1: Fecha Objetivo Vencida
            t.fechaObjetivo < CAST(GETDATE() as DATE) 
            
            -- Criterio 2: Fecha Creación vieja (si no tiene objetivo)
            OR (t.fechaObjetivo IS NULL AND t.fechaCreacion < CAST(GETDATE() as DATE))
          )
          AND (
              -- CASO 1: Estoy asignado explícitamente
              EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea AND ta.carnet = @carnet)
              
              -- CASO 2: Soy el creador Y nadie más está asignado (Tarea personal huérfana)
              OR (
                  t.creadorCarnet = @carnet 
                  AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
              )
              
              -- CASO 3: Estuvo en mi checkin (implícitamente mía)
              OR EXISTS (
                  SELECT 1 
                  FROM p_CheckinTareas ct
                  INNER JOIN p_Checkins c ON ct.idCheckin = c.idCheckin
                  WHERE ct.idTarea = t.idTarea AND c.usuarioCarnet = @carnet
              )
          )
        ORDER BY COALESCE(t.fechaObjetivo, t.fechaCreacion) ASC
    `;
  return await ejecutarQuery(sqlQuery, {
    carnet: { valor: carnet, tipo: NVarChar },
  });
}

export async function getAgendaConfig(idUsuario: number) {
  const res = await ejecutarQuery<{ agendaConfig: string }>(
    `
        SELECT agendaConfig 
        FROM p_UsuariosConfig 
        WHERE idUsuario = @id
    `,
    { id: { valor: idUsuario, tipo: Int } },
  );

  return res[0]?.agendaConfig
    ? JSON.parse(res[0].agendaConfig)
    : { showGestion: true, showRapida: true };
}

export async function setAgendaConfig(idUsuario: number, config: any) {
  // Ensure column exists (quick fix for dev)
  await ejecutarQuery(`
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[p_UsuariosConfig]') AND name = 'agendaConfig')
        BEGIN
            ALTER TABLE [dbo].[p_UsuariosConfig] ADD [agendaConfig] NVARCHAR(MAX) NULL;
        END
    `);

  // Merge/Upsert
  await ejecutarQuery(
    `
        MERGE p_UsuariosConfig AS target
        USING (SELECT @idUsuario AS idUsuario) AS source
        ON (target.idUsuario = source.idUsuario)
        WHEN MATCHED THEN
            UPDATE SET agendaConfig = @config, fechaActualizacion = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (idUsuario, agendaConfig, fechaActualizacion)
            VALUES (@idUsuario, @config, GETDATE());
    `,
    {
      idUsuario: { valor: idUsuario, tipo: Int },
      config: { valor: JSON.stringify(config), tipo: NVarChar },
    },
  );
}

export async function obtenerResumenDiarioEquipo(carnetsMiembros: string[]) {
  if (carnetsMiembros.length === 0) return [];
  const carnetsList = carnetsMiembros.join(',');
  return await ejecutarSP<any>('sp_ObtenerResumenDiarioEquipo', {
    CarnetsCsv: { valor: carnetsList, tipo: NVarChar },
  });
}
