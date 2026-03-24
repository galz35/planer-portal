/**
 * Repositorio para Avance Mensual (Solo Plan de Trabajo)
 * Maneja p_TareaAvanceMensual
 */

import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  Decimal,
} from '../db/base.repo';
import { TareaAvanceMensualDb } from '../db/tipos';

// ==========================================
// AVANCE MENSUAL
// ==========================================

/**
 * Upsert avance mensual usando SP transaccional
 * Auto-completa tarea si acumulado >= 100%
 */
export async function upsertAvanceMensual(
  idTarea: number,
  anio: number,
  mes: number,
  porcentajeMes: number,
  comentario: string | null,
  idUsuario: number,
): Promise<void> {
  await ejecutarSP('sp_UpsertAvanceMensual', {
    idTarea: { valor: idTarea, tipo: Int },
    anio: { valor: anio, tipo: Int },
    mes: { valor: mes, tipo: Int },
    porcentajeMes: { valor: porcentajeMes, tipo: Decimal },
    comentario: { valor: comentario, tipo: NVarChar },
    idUsuario: { valor: idUsuario, tipo: Int },
  });
}

/**
 * Obtiene historial mensual con acumulado calculado
 */
export async function obtenerHistorialMensual(
  idTarea: number,
): Promise<TareaAvanceMensualDb[]> {
  return await ejecutarQuery(
    `
        SELECT
            id, idTarea, anio, mes, porcentajeMes,
            SUM(porcentajeMes) OVER (
                PARTITION BY idTarea 
                ORDER BY anio, mes
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS porcentajeAcumulado,
            comentario, idUsuarioActualizador, fechaActualizacion
        FROM p_TareaAvanceMensual
        WHERE idTarea = @idTarea
        ORDER BY anio, mes
    `,
    { idTarea: { valor: idTarea, tipo: Int } },
  );
}

/**
 * Obtiene el acumulado actual de una tarea
 */
export async function obtenerAcumulado(idTarea: number): Promise<number> {
  const result = await ejecutarQuery(
    `
        SELECT ISNULL(SUM(porcentajeMes), 0) AS acumulado
        FROM p_TareaAvanceMensual
        WHERE idTarea = @idTarea
    `,
    { idTarea: { valor: idTarea, tipo: Int } },
  );
  return result[0]?.acumulado || 0;
}
