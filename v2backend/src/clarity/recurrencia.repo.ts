/**
 * Repositorio para Tareas Recurrentes
 * Maneja p_TareaRecurrencia y p_TareaInstancia
 */

import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  Bit,
  DateTime,
  SqlDate,
} from '../db/base.repo';
import { TareaRecurrenciaDb, TareaInstanciaDb } from '../db/tipos';

// ==========================================
// RECURRENCIA
// ==========================================

// ==========================================
// RECURRENCIA (Migrado a SP)
// ==========================================

export async function crearRecurrencia(datos: {
  idTarea: number;
  tipoRecurrencia: 'SEMANAL' | 'MENSUAL';
  diasSemana?: string;
  diaMes?: number;
  fechaInicioVigencia: Date;
  fechaFinVigencia?: Date;
  idCreador: number;
}): Promise<number> {
  const result = await ejecutarSP('sp_Recurrencia_Crear', {
    idTarea: { valor: datos.idTarea, tipo: Int },
    tipoRecurrencia: { valor: datos.tipoRecurrencia, tipo: NVarChar },
    diasSemana: { valor: datos.diasSemana || null, tipo: NVarChar },
    diaMes: { valor: datos.diaMes || null, tipo: Int },
    fechaInicioVigencia: { valor: datos.fechaInicioVigencia, tipo: SqlDate },
    fechaFinVigencia: { valor: datos.fechaFinVigencia || null, tipo: SqlDate },
    idCreador: { valor: datos.idCreador, tipo: Int },
  });
  return (result as any)[0]?.id;
}

export async function obtenerRecurrenciaPorTarea(
  idTarea: number,
): Promise<TareaRecurrenciaDb | null> {
  const result = await ejecutarSP<TareaRecurrenciaDb>(
    'sp_Recurrencia_ObtenerPorTarea',
    {
      idTarea: { valor: idTarea, tipo: Int },
    },
  );
  return (result as any)[0] || null;
}

export async function desactivarRecurrencia(id: number): Promise<void> {
  await ejecutarQuery(
    `UPDATE p_TareaRecurrencia SET activo = 0 WHERE id = @id`,
    { id: { valor: id, tipo: Int } },
  );
}

// ==========================================
// INSTANCIAS (Bitácora - Migrado a SP)
// ==========================================

export async function crearInstancia(datos: {
  idTarea: number;
  idRecurrencia?: number;
  fechaProgramada: Date;
  estadoInstancia: 'PENDIENTE' | 'HECHA' | 'OMITIDA' | 'REPROGRAMADA';
  comentario?: string;
  idUsuarioEjecutor?: number;
  fechaReprogramada?: Date;
}): Promise<number> {
  const result = await ejecutarSP('sp_Instancia_Upsert', {
    idTarea: { valor: datos.idTarea, tipo: Int },
    idRecurrencia: { valor: datos.idRecurrencia || null, tipo: Int },
    fechaProgramada: { valor: datos.fechaProgramada, tipo: SqlDate },
    estadoInstancia: { valor: datos.estadoInstancia, tipo: NVarChar },
    comentario: { valor: datos.comentario || null, tipo: NVarChar },
    idUsuarioEjecutor: { valor: datos.idUsuarioEjecutor || null, tipo: Int },
    fechaReprogramada: {
      valor: datos.fechaReprogramada || null,
      tipo: SqlDate,
    },
  });
  return (result as any)[0]?.id;
}

export async function obtenerInstanciasPorTarea(
  idTarea: number,
  limit: number = 30,
): Promise<TareaInstanciaDb[]> {
  return await ejecutarQuery(
    `SELECT TOP (@limit) * FROM p_TareaInstancia WHERE idTarea = @idTarea ORDER BY fechaProgramada DESC`,
    {
      idTarea: { valor: idTarea, tipo: Int },
      limit: { valor: limit, tipo: Int },
    },
  );
}

export async function obtenerInstanciaPorFecha(
  idTarea: number,
  fecha: Date,
): Promise<TareaInstanciaDb | null> {
  const result = await ejecutarQuery(
    `SELECT * FROM p_TareaInstancia WHERE idTarea = @idTarea AND fechaProgramada = @fecha`,
    {
      idTarea: { valor: idTarea, tipo: Int },
      fecha: { valor: fecha, tipo: SqlDate },
    },
  );
  return result[0] || null;
}

export async function actualizarEstadoInstancia(
  id: number,
  estadoInstancia: 'HECHA' | 'OMITIDA' | 'REPROGRAMADA',
  comentario?: string,
  fechaReprogramada?: Date,
): Promise<void> {
  // Usamos el mismo SP de Upsert si tenemos los datos necesarios, pero para mantener compatibilidad con 'id' directo:
  await ejecutarQuery(
    `
        UPDATE p_TareaInstancia 
        SET estadoInstancia = @estadoInstancia,
            comentario = @comentario,
            fechaEjecucion = CASE WHEN @estadoInstancia IN ('HECHA', 'OMITIDA') THEN GETDATE() ELSE fechaEjecucion END,
            fechaReprogramada = @fechaReprogramada
        WHERE id = @id
    `,
    {
      id: { valor: id, tipo: Int },
      estadoInstancia: { valor: estadoInstancia, tipo: NVarChar },
      comentario: { valor: comentario || null, tipo: NVarChar },
      fechaReprogramada: { valor: fechaReprogramada || null, tipo: SqlDate },
    },
  );
}

// ==========================================
// AGENDA DIARIA (Recurrencias)
// ==========================================

export async function obtenerAgendaRecurrente(
  fecha: Date,
  carnet: string,
): Promise<any[]> {
  // SET DATEFIRST 1 para que lunes = 1 (ISO)
  return await ejecutarQuery(
    `
        SET DATEFIRST 1;
        
        -- 1) Instancias reales registradas ese día
        WITH Inst AS (
            SELECT
                i.idTarea,
                i.estadoInstancia,
                i.fechaEjecucion,
                i.fechaReprogramada,
                i.comentario,
                CAST(1 AS BIT) AS esInstanciaReal
            FROM p_TareaInstancia i
            WHERE i.fechaProgramada = @fecha
        ),
        -- 2) Recurrencias activas que aplican hoy
        RecAplica AS (
            SELECT r.idTarea, r.id as idRecurrencia
            FROM p_TareaRecurrencia r
            WHERE r.activo = 1
              AND @fecha >= r.fechaInicioVigencia
              AND (@fecha <= r.fechaFinVigencia OR r.fechaFinVigencia IS NULL)
              AND (
                  (r.tipoRecurrencia = 'SEMANAL'
                   AND CHARINDEX(',' + CAST(DATEPART(WEEKDAY, @fecha) AS VARCHAR(2)) + ',', 
                                 ',' + r.diasSemana + ',') > 0)
                  OR
                  (r.tipoRecurrencia = 'MENSUAL' AND DAY(@fecha) = r.diaMes)
              )
        )
        SELECT
            t.idTarea,
            t.nombre AS titulo,
            t.comportamiento,
            @fecha AS fechaProgramada,
            COALESCE(inst.estadoInstancia, 'PENDIENTE') AS estadoInstancia,
            inst.fechaEjecucion,
            inst.fechaReprogramada,
            inst.comentario,
            COALESCE(inst.esInstanciaReal, CAST(0 AS BIT)) AS esInstanciaReal,
            ra.idRecurrencia
        FROM p_Tareas t
        LEFT JOIN Inst inst ON inst.idTarea = t.idTarea
        LEFT JOIN RecAplica ra ON ra.idTarea = t.idTarea
        WHERE t.creadorCarnet = @carnet
          AND t.comportamiento = 'RECURRENTE'
          AND (inst.idTarea IS NOT NULL OR ra.idTarea IS NOT NULL)
        ORDER BY
            CASE COALESCE(inst.estadoInstancia, 'PENDIENTE')
                WHEN 'PENDIENTE' THEN 1
                WHEN 'REPROGRAMADA' THEN 2
                WHEN 'HECHA' THEN 3
                WHEN 'OMITIDA' THEN 4
                ELSE 9
            END
    `,
    {
      fecha: { valor: fecha, tipo: SqlDate },
      carnet: { valor: carnet, tipo: NVarChar },
    },
  );
}
