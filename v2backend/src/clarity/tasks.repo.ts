import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  DateTime,
  Bit,
} from '../db/base.repo';
import { TareaDb } from '../db/tipos';
import { TaskStatus, TaskPriority, TaskType } from '../common/enums/task.enums';

// DTO interno unificado para creación
export interface CreateTaskParams {
  titulo: string;
  idCreador: number;
  idProyecto?: number;
  descripcion?: string;
  estado?: TaskStatus | string;
  prioridad?: TaskPriority | string;
  esfuerzo?: string;
  tipo?: TaskType | string;
  fechaInicioPlanificada?: Date;
  fechaObjetivo?: Date;
  progreso?: number;
  orden?: number;
  // Campos nuevos / específicos
  comportamiento?: string;
  idTareaPadre?: number;
  idResponsable?: number;
  requiereEvidencia?: boolean;
  idEntregable?: number;
  creadorCarnet?: string;
}

export interface UpdateTaskParams {
  titulo?: string;
  descripcion?: string;
  estado?: TaskStatus | string;
  prioridad?: TaskPriority | string;
  esfuerzo?: string;
  progreso?: number;
  fechaInicioPlanificada?: Date;
  fechaObjetivo?: Date;
  linkEvidencia?: string;
  comentario?: string; // Para bitácora rápida
  requiereEvidencia?: boolean;
  idTareaPadre?: number;
  idResponsable?: number;
  fechaInicioReal?: Date;
}

/**
 * REPOSITORIO UNIFICADO DE TAREAS
 * Centraliza toda la lógica de escritura (Crear/Actualizar/Borrar) para Tareas.
 * Reemplaza la lógica duplicada en clarity.repo y planning.repo.
 */

// ==========================================
// CREACIÓN
// ==========================================

export async function crearTarea(params: CreateTaskParams): Promise<number> {
  // 1. Defaults y validaciones básicas
  const fechaInicioPlanificada = params.fechaInicioPlanificada || new Date();
  const fechaObjetivo = params.fechaObjetivo || new Date();
  const estado = params.estado || TaskStatus.Pendiente;
  const prioridad = params.prioridad || TaskPriority.Media;
  const tipo = params.tipo || TaskType.Administrativa;

  // 2. Ejecutar SP ROBUSTO de creación completa v2 (2026-01-26)
  const res = await ejecutarSP<{ idTarea: number }>(
    'sp_Tarea_CrearCompleta_v2',
    {
      nombre: { valor: params.titulo, tipo: NVarChar },
      idUsuario: { valor: params.idCreador, tipo: Int },
      idProyecto: { valor: params.idProyecto || null, tipo: Int },
      descripcion: { valor: params.descripcion || null, tipo: NVarChar },
      estado: { valor: estado, tipo: NVarChar },
      prioridad: { valor: prioridad, tipo: NVarChar },
      esfuerzo: { valor: params.esfuerzo || null, tipo: NVarChar },
      tipo: { valor: tipo, tipo: NVarChar },
      fechaInicioPlanificada: { valor: fechaInicioPlanificada, tipo: DateTime },
      fechaObjetivo: { valor: fechaObjetivo, tipo: DateTime },
      porcentaje: { valor: params.progreso || 0, tipo: Int },
      orden: { valor: params.orden || 0, tipo: Int },
      comportamiento: { valor: params.comportamiento || null, tipo: NVarChar },
      idTareaPadre: { valor: params.idTareaPadre || null, tipo: Int },
      idResponsable: { valor: params.idResponsable || params.idCreador, tipo: Int },
      requiereEvidencia: {
        valor: params.requiereEvidencia || false,
        tipo: Bit,
      },
      idEntregable: { valor: params.idEntregable || null, tipo: Int },
      semana: { valor: null, tipo: Int }, // Default null, can be extended later if CreateTaskParams supports it
    },
  );

  return res[0].idTarea;
}

export async function recalcularJerarquia(
  idTarea?: number,
  idPadreDirecto?: number,
) {
  // Inteligencia en BD: Recálculo recursivo de estados y progresos
  await ejecutarSP('sp_Tarea_RecalcularJerarquia_v2', {
    idTareaInicio: { valor: idTarea || null, tipo: Int },
    idPadreDirecto: { valor: idPadreDirecto || null, tipo: Int },
  });
}

// ==========================================
// ACTUALIZACIÓN
// ==========================================

import * as planningRepo from '../planning/planning.repo';

export async function actualizarTarea(
  idTarea: number,
  updates: UpdateTaskParams,
) {
  // 1. Obtener estado previo para detectar cambios de jerarquía
  const tareaPrevia = await obtenerTarea(idTarea);

  // V4: Unificación de lógica. Usamos el repo de planning que ya tiene el SP y validaciones
  const dbUpdates: any = {
    nombre: updates.titulo,
    descripcion: updates.descripcion,
    estado: updates.estado,
    prioridad: updates.prioridad,
    porcentaje: updates.progreso,
    fechaObjetivo: updates.fechaObjetivo,
    fechaInicioPlanificada: updates.fechaInicioPlanificada,
    fechaInicioReal: updates.fechaInicioReal,
    linkEvidencia: updates.linkEvidencia,
    idTareaPadre: updates.idTareaPadre,
  };

  // 2. Ejecutar Update Base
  await planningRepo.actualizarTarea(idTarea, dbUpdates);

  // 3. Manejo especial de reasignación
  if (updates.idResponsable) {
    await reasignarResponsable(idTarea, updates.idResponsable);
  }

  // 4. AUTO-ROLLUP: Si hay cambios en jerarquía o métricas, recalcular
  const hayCambioPadre =
    updates.idTareaPadre !== undefined &&
    tareaPrevia?.idTareaPadre !== updates.idTareaPadre;
  const hayCambioMetricas =
    updates.progreso !== undefined || updates.estado !== undefined;

  if (hayCambioPadre) {
    // Recalcular Padre Viejo (si tenía)
    if (tareaPrevia?.idTareaPadre) {
      await recalcularJerarquia(undefined, tareaPrevia.idTareaPadre);
    }
    // Recalcular Nuevo Padre
    if (updates.idTareaPadre) {
      await recalcularJerarquia(undefined, updates.idTareaPadre);
    }
  } else if (hayCambioMetricas && tareaPrevia?.idTareaPadre) {
    // Mismo padre, cambiaron métricas
    await recalcularJerarquia(undefined, tareaPrevia.idTareaPadre);
  }
}

// ==========================================
// AVANCES (COMENTARIOS)
// ==========================================

export async function crearAvance(dto: {
  idTarea: number;
  idUsuario: number;
  progreso: number;
  comentario: string;
}) {
  // 1. Auto-create table if not exists (Schema Heal)
  await ejecutarQuery(`
        IF OBJECT_ID(N'dbo.p_TareaAvances', N'U') IS NULL
        BEGIN
            CREATE TABLE dbo.p_TareaAvances(
                idLog int IDENTITY(1,1) PRIMARY KEY,
                idTarea int NOT NULL,
                idUsuario int NOT NULL,
                progreso int NULL,
                comentario nvarchar(max) NULL,
                fecha datetime DEFAULT GETDATE()
            );
        END
    `);

  // 2. Insert
  await ejecutarQuery(
    `
        INSERT INTO p_TareaAvances (idTarea, idUsuario, progreso, comentario, fecha)
        VALUES (@idTarea, @idUsuario, @progreso, @comentario, GETDATE())
    `,
    {
      idTarea: { valor: dto.idTarea, tipo: Int },
      idUsuario: { valor: dto.idUsuario, tipo: Int },
      progreso: { valor: dto.progreso, tipo: Int },
      comentario: { valor: dto.comentario, tipo: NVarChar },
    },
  );
}

export async function eliminarAvance(idLog: number) {
  await ejecutarQuery('DELETE FROM p_TareaAvances WHERE idLog = @id', {
    id: { valor: idLog, tipo: Int },
  });
}

// ==========================================
// UTILS
// ==========================================

export async function asignarUsuario(
  idTarea: number,
  idUsuario: number,
  tipo: string = 'Responsable',
) {
  // Idempotente: Verifica si ya existe
  const existe = await ejecutarQuery(
    'SELECT 1 FROM p_TareaAsignados WHERE idTarea = @t AND idUsuario = @u',
    {
      t: { valor: idTarea, tipo: Int },
      u: { valor: idUsuario, tipo: Int },
    },
  );

  if (existe.length === 0) {
    await ejecutarQuery(
      `
            INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
            VALUES (@t, @u, @tipo, GETDATE())
        `,
      {
        t: { valor: idTarea, tipo: Int },
        u: { valor: idUsuario, tipo: Int },
        tipo: { valor: tipo, tipo: NVarChar },
      },
    );
  }
}

export async function reasignarResponsable(
  idTarea: number,
  idNuevoResponsable: number,
) {
  // 1. Quitar anteriores
  await ejecutarQuery(
    "DELETE FROM p_TareaAsignados WHERE idTarea = @t AND tipo = 'Responsable'",
    {
      t: { valor: idTarea, tipo: Int },
    },
  );
  // 2. Asignar nuevo
  await asignarUsuario(idTarea, idNuevoResponsable, 'Responsable');
}

export async function obtenerTarea(idTarea: number): Promise<TareaDb | null> {
  const res = await ejecutarQuery<TareaDb>(
    'SELECT *, porcentaje as progreso FROM p_Tareas WHERE idTarea = @id',
    { id: { valor: idTarea, tipo: Int } },
  );
  return res.length > 0 ? res[0] : null;
}

// ==========================================
// RECORDATORIOS DE TAREAS
// ==========================================

export async function ensureRecordatoriosTable() {
  await ejecutarQuery(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaRecordatorios')
        BEGIN
            CREATE TABLE p_TareaRecordatorios (
                idRecordatorio INT IDENTITY(1,1) PRIMARY KEY,
                idTarea INT NOT NULL,
                idUsuario INT NOT NULL,
                fechaHoraRecordatorio DATETIME NOT NULL,
                nota NVARCHAR(200) NULL,
                enviado BIT DEFAULT 0,
                creadoEn DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_Recordatorio_Tarea FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
                CONSTRAINT FK_Recordatorio_Usuario FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
            );
            CREATE INDEX IX_Recordatorios_Pendientes ON p_TareaRecordatorios (fechaHoraRecordatorio, enviado) WHERE enviado = 0;
        END
    `);
}

export async function crearOActualizarRecordatorio(
  idTarea: number,
  idUsuario: number,
  fechaHora: Date,
  nota?: string,
) {
  await ensureRecordatoriosTable();
  // Upsert: si ya existe para esta tarea+usuario, actualizar
  const existing = await ejecutarQuery<any>(
    `
        SELECT idRecordatorio FROM p_TareaRecordatorios 
        WHERE idTarea = @t AND idUsuario = @u AND enviado = 0
    `,
    { t: { valor: idTarea, tipo: Int }, u: { valor: idUsuario, tipo: Int } },
  );

  if (existing.length > 0) {
    await ejecutarQuery(
      `
            UPDATE p_TareaRecordatorios 
            SET fechaHoraRecordatorio = @fecha, nota = @nota, enviado = 0
            WHERE idRecordatorio = @id
        `,
      {
        id: { valor: existing[0].idRecordatorio, tipo: Int },
        fecha: { valor: fechaHora, tipo: DateTime },
        nota: { valor: nota || null, tipo: NVarChar },
      },
    );
    return existing[0].idRecordatorio;
  } else {
    const res = await ejecutarQuery<{ id: number }>(
      `
            INSERT INTO p_TareaRecordatorios (idTarea, idUsuario, fechaHoraRecordatorio, nota)
            OUTPUT INSERTED.idRecordatorio as id
            VALUES (@t, @u, @fecha, @nota)
        `,
      {
        t: { valor: idTarea, tipo: Int },
        u: { valor: idUsuario, tipo: Int },
        fecha: { valor: fechaHora, tipo: DateTime },
        nota: { valor: nota || null, tipo: NVarChar },
      },
    );
    return res[0]?.id;
  }
}

export async function eliminarRecordatorio(
  idRecordatorio: number,
  idUsuario: number,
) {
  await ejecutarQuery(
    `
        DELETE FROM p_TareaRecordatorios WHERE idRecordatorio = @id AND idUsuario = @u
    `,
    {
      id: { valor: idRecordatorio, tipo: Int },
      u: { valor: idUsuario, tipo: Int },
    },
  );
}

export async function obtenerRecordatoriosPendientesAhora() {
  await ensureRecordatoriosTable();
  return await ejecutarQuery<any>(`
        SELECT r.idRecordatorio, r.idTarea, r.idUsuario, r.fechaHoraRecordatorio, r.nota,
               t.nombre as tituloTarea, t.estado, t.prioridad,
               p.nombre as proyectoNombre
        FROM p_TareaRecordatorios r
        JOIN p_Tareas t ON r.idTarea = t.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE r.enviado = 0
          AND r.fechaHoraRecordatorio <= GETDATE()
          AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
    `);
}

export async function marcarRecordatorioEnviado(idRecordatorio: number) {
  await ejecutarQuery(
    `
        UPDATE p_TareaRecordatorios SET enviado = 1 WHERE idRecordatorio = @id
    `,
    { id: { valor: idRecordatorio, tipo: Int } },
  );
}

export async function obtenerRecordatoriosUsuario(idUsuario: number) {
  await ensureRecordatoriosTable();
  return await ejecutarQuery<any>(
    `
        SELECT r.idRecordatorio, r.idTarea, r.fechaHoraRecordatorio, r.nota, r.enviado,
               t.nombre as tituloTarea, t.estado, t.prioridad
        FROM p_TareaRecordatorios r
        JOIN p_Tareas t ON r.idTarea = t.idTarea
        WHERE r.idUsuario = @u
          AND r.fechaHoraRecordatorio >= DATEADD(day, -1, GETDATE())
        ORDER BY r.fechaHoraRecordatorio ASC
    `,
    { u: { valor: idUsuario, tipo: Int } },
  );
}
