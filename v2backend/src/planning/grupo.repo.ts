/**
 * Repositorio para Grupos/Fases (Solo Plan de Trabajo)
 * Maneja idGrupo y numeroParte en p_Tareas
 */

import { ejecutarQuery, ejecutarSP, Int } from '../db/base.repo';
import { TareaDb } from '../db/tipos';

// ==========================================
// GRUPOS / FASES
// ==========================================

/**
 * Convierte una tarea en grupo inicial (fase 1)
 */
export async function crearGrupoInicial(idTarea: number): Promise<void> {
  await ejecutarSP('sp_CrearGrupoInicial', {
    idTarea: { valor: idTarea, tipo: Int },
  });
}

/**
 * Agrega una tarea existente como fase de un grupo
 */
export async function agregarFase(
  idGrupo: number,
  idTareaNueva: number,
): Promise<void> {
  await ejecutarSP('sp_AgregarFaseGrupo', {
    idGrupo: { valor: idGrupo, tipo: Int },
    idTareaNueva: { valor: idTareaNueva, tipo: Int },
  });
}

/**
 * Obtiene todas las tareas de un grupo ordenadas por fase
 */
export async function obtenerTareasGrupo(idGrupo: number): Promise<TareaDb[]> {
  return await ejecutarQuery(
    `
        SELECT * FROM p_Tareas 
        WHERE idGrupo = @idGrupo 
        ORDER BY numeroParte
    `,
    { idGrupo: { valor: idGrupo, tipo: Int } },
  );
}

/**
 * Verifica si una tarea pertenece a un grupo
 */
export async function esParteDeFase(
  idTarea: number,
): Promise<{ idGrupo: number; numeroParte: number } | null> {
  const result = await ejecutarQuery(
    `
        SELECT idGrupo, numeroParte FROM p_Tareas 
        WHERE idTarea = @idTarea AND idGrupo IS NOT NULL
    `,
    { idTarea: { valor: idTarea, tipo: Int } },
  );
  return result[0] || null;
}

/**
 * Cuenta fases de un grupo
 */
export async function contarFases(idGrupo: number): Promise<number> {
  const result = await ejecutarQuery(
    `
        SELECT COUNT(*) as total FROM p_Tareas WHERE idGrupo = @idGrupo
    `,
    { idGrupo: { valor: idGrupo, tipo: Int } },
  );
  return result[0]?.total || 0;
}
