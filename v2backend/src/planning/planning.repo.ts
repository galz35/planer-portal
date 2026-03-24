/**
 * Planning Repository - Queries para el módulo de planificación
 * Reemplaza TypeORM con consultas directas a SQL Server
 */
import {
  crearRequest,
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  Bit,
  DateTime,
  SqlDate,
  conTransaccion,
  sql,
} from '../db/base.repo';
import {
  ProyectoDb,
  TareaDb,
  PlanTrabajoDb,
  SolicitudCambioDb,
  UsuarioDb,
  UsuarioOrganizacionDb,
} from '../db/tipos';
import { cacheGet, cacheSet } from '../common/cache.service';

// ==========================================
// CONSULTAS DE PROYECTOS
// ==========================================

export async function obtenerProyectosPorUsuario(carnet: string) {
  return await ejecutarSP<ProyectoDb>('sp_ObtenerProyectos', {
    carnet: { valor: carnet, tipo: NVarChar },
    filtroNombre: { valor: null, tipo: NVarChar },
    filtroEstado: { valor: null, tipo: NVarChar },
  });
}

export async function obtenerTodosProyectos(filter?: any) {
  // 2026-01-27: v2 - Use SP with Pagination Support (Defaulting to large page for backward compat)
  return await ejecutarSP<ProyectoDb>('sp_Proyectos_Listar', {
    nombre: { valor: filter?.nombre || null, tipo: NVarChar },
    estado: { valor: filter?.estado || null, tipo: NVarChar },
    gerencia: { valor: filter?.gerencia || null, tipo: NVarChar },
    subgerencia: { valor: filter?.subgerencia || null, tipo: NVarChar },
    area: { valor: filter?.area || null, tipo: NVarChar },
    tipo: { valor: filter?.tipo || null, tipo: NVarChar },
    pageNumber: { valor: 1, tipo: Int },
    pageSize: { valor: 2000, tipo: Int }, // Fetch "all" (limit to 2000)
  });
}

/**
 * Obtiene proyectos visibles para un usuario según reglas de negocio:
 * 1. Proyectos que yo creé
 * 2. Proyectos donde tengo tareas asignadas
 * 3. Proyectos donde mis subordinados (cadena de jefatura) tienen tareas
 */
export async function obtenerProyectosVisibles(
  idUsuario: number,
  usuario: any,
  filter?: any,
) {
  const cacheKey = `equipo_ids_v2:${usuario.carnet || idUsuario}`;
  let idsEquipo = cacheGet<number[]>(cacheKey);

  // Si no está en cache, usamos el SP optimizado de Visibilidad (Carnet-First)
  if (!idsEquipo) {
    // [OPTIMIZACION] Usamos el repo de acceso que ya tiene la lógica de jerarquía + delegación + permisos
    const accesoRepo = require('../acceso/acceso.repo');
    const miEquipo = await accesoRepo.obtenerMiEquipoPorCarnet(
      usuario.carnet || '',
    );

    // Extraemos solo IDs únicos
    idsEquipo = [
      ...new Set(miEquipo.map((u: any) => u.idUsuario).filter((id: any) => id)),
    ] as number[];

    // Fallback: si no devuelve nada (raro), al menos el propio usuario
    if (idsEquipo.length === 0) idsEquipo = [idUsuario];

    cacheSet(cacheKey, idsEquipo, 5 * 60 * 1000); // Cache 5 min
  }

  // 2026-01-25: Migración Zero Inline SQL - Uso de SP con TVP
  const tvpEquipo = new sql.Table('dbo.TVP_IntList');
  tvpEquipo.columns.add('Id', sql.Int);

  idsEquipo.forEach((id) => tvpEquipo.rows.add(id));

  return await ejecutarSP<ProyectoDb>('sp_Proyecto_ObtenerVisibles', {
    idUsuario: { valor: idUsuario, tipo: Int },
    idsEquipo: tvpEquipo, // TVP
  });
}

// Esta función estaba creando PROYECTOS, no tareas. La de tareas no estaba exportada o estaba en otro lado.
// Ahora agregamos la V2 para crear Tarea con SP
/**
 * @deprecated PRECAUCIÓN (CR-01): Este método es LEGACY y no integra las validaciones de Jerarquía Inteligente v2.1.
 * NO USAR PARA NUEVO CÓDIGO. Migrar a tasks.repo.crearTarea().
 */
export async function crearTarea(dto: {
  titulo: string;
  descripcion?: string;
  idProyecto?: number;
  prioridad: string;
  effort?: string;
  tipo?: string;
  fechaInicioPlanificada?: Date | null;
  fechaObjetivo?: Date | null;
  idCreador: number;
  idResponsable?: number;
  comportamiento?: string;
  linkEvidencia?: string;
}) {
  // V2: Uso de SP
  const res = await ejecutarQuery<{ idTarea: number }>(
    `
        EXEC sp_CrearTarea
            @titulo = @titulo,
            @descripcion = @descripcion,
            @idProyecto = @idProyecto,
            @prioridad = @prioridad,
            @esfuerzo = @esfuerzo,
            @tipo = @tipo,
            @fechaInicioPlanificada = @fechaInicioPlanificada,
            @fechaObjetivo = @fechaObjetivo,
            @idUsuarioCreador = @idCreador,
            @idResponsable = @idResponsable,
            @comportamiento = @comportamiento,
            @linkEvidencia = @linkEvidencia
    `,
    {
      titulo: { valor: dto.titulo, tipo: NVarChar },
      descripcion: { valor: dto.descripcion, tipo: NVarChar },
      idProyecto: { valor: dto.idProyecto, tipo: Int },
      prioridad: { valor: dto.prioridad, tipo: NVarChar },
      esfuerzo: { valor: dto.effort || 'M', tipo: NVarChar },
      tipo: { valor: dto.tipo || 'Administrativa', tipo: NVarChar },
      fechaInicioPlanificada: {
        valor: dto.fechaInicioPlanificada,
        tipo: DateTime,
      },
      fechaObjetivo: { valor: dto.fechaObjetivo, tipo: DateTime },
      idCreador: { valor: dto.idCreador, tipo: Int },
      idResponsable: { valor: dto.idResponsable, tipo: Int },
      comportamiento: { valor: dto.comportamiento, tipo: NVarChar },
      linkEvidencia: { valor: dto.linkEvidencia, tipo: NVarChar },
    },
  );
  return res[0]?.idTarea;
}

export async function crearProyecto(dto: {
  nombre: string;
  descripcion?: string;
  idNodoDuenio?: number;
  area?: string;
  subgerencia?: string;
  gerencia?: string;
  fechaInicio?: Date;
  fechaFin?: Date;
  idCreador: number;
  tipo?: string;
  creadorCarnet?: string;
  responsableCarnet?: string;
}) {
  // START LEGACY INLINE SQL (Mantenido comentado a petición del cliente para revisar lógica)
  /*
    const res = await ejecutarQuery<{ idProyecto: number }>(`
        INSERT INTO p_Proyectos (nombre, descripcion, idNodoDuenio, area, subgerencia, gerencia, fechaInicio, fechaFin, fechaCreacion, idCreador, creadorCarnet, responsableCarnet, estado, tipo)
        OUTPUT INSERTED.idProyecto
        VALUES (@nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, GETDATE(), @idCreador, @creadorCarnet, @responsableCarnet, 'Activo', @tipo)
    `, {
        nombre: { valor: dto.nombre, tipo: NVarChar },
        descripcion: { valor: dto.descripcion, tipo: NVarChar },
        idNodoDuenio: { valor: dto.idNodoDuenio, tipo: Int },
        area: { valor: dto.area, tipo: NVarChar },
        subgerencia: { valor: dto.subgerencia, tipo: NVarChar },
        gerencia: { valor: dto.gerencia, tipo: NVarChar },
        fechaInicio: { valor: dto.fechaInicio, tipo: DateTime },
        fechaFin: { valor: dto.fechaFin, tipo: DateTime },
        idCreador: { valor: dto.idCreador, tipo: Int },
        creadorCarnet: { valor: dto.creadorCarnet, tipo: NVarChar },
        responsableCarnet: { valor: dto.responsableCarnet, tipo: NVarChar },
        tipo: { valor: dto.tipo || 'administrativo', tipo: NVarChar }
    });
    return res[0].idProyecto;
    */
  // END LEGACY INLINE SQL

  // NUEVO CÓDIGO - Migrado a Procedimiento Almacenado
  const res = await ejecutarSP<{ idProyecto: number }>('sp_Proyectos_Gestion', {
    Accion: { valor: 'CREAR', tipo: NVarChar },
    nombre: { valor: dto.nombre, tipo: NVarChar },
    descripcion: { valor: dto.descripcion, tipo: NVarChar },
    idNodoDuenio: { valor: dto.idNodoDuenio, tipo: Int },
    area: { valor: dto.area, tipo: NVarChar },
    subgerencia: { valor: dto.subgerencia, tipo: NVarChar },
    gerencia: { valor: dto.gerencia, tipo: NVarChar },
    fechaInicio: { valor: dto.fechaInicio, tipo: DateTime },
    fechaFin: { valor: dto.fechaFin, tipo: DateTime },
    idCreador: { valor: dto.idCreador, tipo: Int },
    creadorCarnet: { valor: dto.creadorCarnet, tipo: NVarChar },
    responsableCarnet: { valor: dto.responsableCarnet, tipo: NVarChar },
    tipo: { valor: dto.tipo || 'administrativo', tipo: NVarChar },
    estado: { valor: 'Activo', tipo: NVarChar },
  });
  return res[0]?.idProyecto;
}

export async function actualizarDatosProyecto(
  idProyecto: number,
  updates: Partial<ProyectoDb>,
) {
  // START LEGACY INLINE SQL (Mantenido comentado a petición del cliente)
  /*
    const sets: string[] = [];
    const params: any = { idProyecto: { valor: idProyecto, tipo: Int } };

    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            sets.push(`${key} = @${key}`);
            let tipo = NVarChar;
            if (typeof value === 'number') tipo = Int;
            if (typeof value === 'boolean') tipo = Bit;
            if (value instanceof Date) tipo = DateTime;
            params[key] = { valor: value, tipo };
        }
    }

    if (sets.length === 0) return;

    await ejecutarQuery(`UPDATE p_Proyectos SET ${sets.join(', ')} WHERE idProyecto = @idProyecto`, params);
    */
  // END LEGACY INLINE SQL

  // NUEVO CÓDIGO - Migrado a Procedimiento Almacenado
  // Convertimos a JSON para aprovechar el UPDATE dinámico que pusimos en el SP
  if (Object.keys(updates).length === 0) return;

  await ejecutarSP('sp_Proyectos_Gestion', {
    Accion: { valor: 'ACTUALIZAR', tipo: NVarChar },
    idProyecto: { valor: idProyecto, tipo: Int },
    UpdatesJSON: { valor: JSON.stringify(updates), tipo: NVarChar },
  });
}

export async function eliminarProyecto(
  idProyecto: number,
  forceCascade: boolean = false,
) {
  // START LEGACY INLINE SQL (Mantenido comentado a petición del cliente)
  /*
    // FORCE SOFT DELETE (No se usa el SP para evitar borrado físico)
    // FIX: Removed 'activo' column update as it doesn't exist in p_Proyectos
    await ejecutarQuery(`
        UPDATE p_Proyectos 
        SET estado = 'Cancelado'
        WHERE idProyecto = @idProyecto
    `, {
        idProyecto: { valor: idProyecto, tipo: Int }
    });
    */
  // END LEGACY INLINE SQL

  // NUEVO CÓDIGO - Migrado a Procedimiento Almacenado
  await ejecutarSP('sp_Proyectos_Gestion', {
    Accion: { valor: 'ELIMINAR', tipo: NVarChar },
    idProyecto: { valor: idProyecto, tipo: Int },
  });
}

export async function restaurarProyecto(idProyecto: number) {
  // START LEGACY INLINE SQL (Mantenido comentado a petición del cliente)
  /*
    // FIX: Removed 'activo' column update as it doesn't exist in p_Proyectos
    await ejecutarQuery(`
        UPDATE p_Proyectos 
        SET estado = 'Activo'
        WHERE idProyecto = @idProyecto
    `, {
        idProyecto: { valor: idProyecto, tipo: Int }
    });
    */
  // END LEGACY INLINE SQL

  // NUEVO CÓDIGO - Migrado a Procedimiento Almacenado
  await ejecutarSP('sp_Proyectos_Gestion', {
    Accion: { valor: 'RESTAURAR', tipo: NVarChar },
    idProyecto: { valor: idProyecto, tipo: Int },
  });
}

export async function obtenerProyectoPorId(idProyecto: number) {
  const res = await ejecutarQuery<ProyectoDb>(
    `
        SELECT p.*, 
            creadorNombre = uc.nombre,
            responsableNombre = ur.nombre,
            progreso = ISNULL((
                SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
                FROM p_Tareas t
                WHERE t.idProyecto = p.idProyecto 
                  AND t.idTareaPadre IS NULL 
                  AND t.activo = 1
                  AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
            ), 0)
        FROM p_Proyectos p
        LEFT JOIN p_Usuarios uc ON p.idCreador = uc.idUsuario
        LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet
        WHERE p.idProyecto = @idProyecto
    `,
    { idProyecto: { valor: idProyecto, tipo: Int } },
  );
  return res[0];
}

// ==========================================
// CONSULTAS DE TAREAS
// ==========================================

// Recupera una tarea por ID incluyendo sus subtareas y datos del proyecto
export async function obtenerTareaPorId(idTarea: number) {
  const tareas = await ejecutarQuery<
    TareaDb & {
      proyectoTipo?: string;
      proyectoRequiereAprobacion?: boolean;
      creadorNombre?: string;
      creadorCorreo?: string;
      responsableNombre?: string;
      responsableCarnet?: string;
      idResponsable?: number;
    }
  >(
    `
        SELECT 
            t.idTarea, t.nombre as titulo, t.descripcion, t.estado, t.prioridad, t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado, t.porcentaje, t.idTareaPadre, t.orden, t.esHito, t.idAsignado, t.idPlan,
            t.linkEvidencia, t.tipo, t.esfuerzo, t.comportamiento, t.fechaInicioPlanificada,
            t.porcentaje as progreso, t.idCreador, t.idProyecto,
            p.tipo as proyectoTipo, 
            p.requiereAprobacion as proyectoRequiereAprobacion,
            uc.nombre as creadorNombre,
            uc.correo as creadorCorreo,
            ua.idUsuario as idResponsable,
            ua.nombreCompleto as responsableNombre,
            ta.carnet as responsableCarnet
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios uc ON t.idCreador = uc.idUsuario
        LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
        LEFT JOIN p_Usuarios ua ON ta.idUsuario = ua.idUsuario
        WHERE t.idTarea = @idTarea
    `,
    { idTarea: { valor: idTarea, tipo: Int } },
  );

  if (tareas.length === 0) return null;
  const t = tareas[0];

  // Transform flat creator fields to object
  const tarea: any = {
    ...t,
    creador: t.creadorNombre
      ? { nombre: t.creadorNombre, correo: t.creadorCorreo }
      : null,
  };

  if (tarea) {
    // Cargar subtareas
    const subtareas = await ejecutarQuery<TareaDb>(
      `
            SELECT idTarea, nombre as titulo, estado, prioridad, porcentaje as progreso
            FROM p_Tareas
            WHERE idTareaPadre = @id
            ORDER BY orden ASC, fechaObjetivo ASC
        `,
      { id: { valor: idTarea, tipo: Int } },
    );

    tarea.subtareas = subtareas;

    // Cargar avances (comentarios)
    try {
      const avances = await ejecutarQuery<any>(
        `
                IF OBJECT_ID(N'dbo.p_TareaAvances', N'U') IS NOT NULL
                SELECT idLog, idTarea, idUsuario, progreso, comentario, fecha
                FROM p_TareaAvances
                WHERE idTarea = @id
                ORDER BY fecha DESC
            `,
        { id: { valor: idTarea, tipo: Int } },
      );
      tarea.avances = avances || [];
    } catch (e) {
      tarea.avances = [];
    }

    // Cargar Asignados (Responsable y Colaboradores)
    try {
      const asignadosRaw = await ejecutarQuery<any>(
        `
                SELECT ta.id, ta.idTarea, ta.idUsuario, ta.tipo, ta.carnet,
                       u.nombreCompleto as usuarioNombre, u.cargo as usuarioCargo
                FROM p_TareaAsignados ta
                LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE ta.idTarea = @id AND ta.tipo = 'Colaborador'
            `,
        { id: { valor: idTarea, tipo: Int } },
      );

      tarea.asignados = asignadosRaw.map((a: any) => ({
        idAsignacion: a.id,
        idTarea: a.idTarea,
        idUsuario: a.idUsuario,
        tipo: a.tipo,
        usuario: {
          idUsuario: a.idUsuario,
          nombreCompleto: a.usuarioNombre,
          carnet: a.carnet,
          cargo: a.usuarioCargo,
        },
      }));
    } catch (err) {
      console.error('Error fetching asignados', err);
      tarea.asignados = [];
    }
  }

  return tarea;
}

/**
 * @deprecated PRECAUCIÓN (CR-01): Este método es LEGACY y no recalcula jerarquía. NO USAR para updates complejos.
 * Usar tasks.repo.actualizarTarea() envuelto en TasksService.
 */
export async function actualizarTarea(
  idTarea: number,
  updates: Partial<TareaDb>,
) {
  // V3: Uso de ejecutarSP para mayor seguridad y evitar warnings de BaseRepo
  // Mapeamos los campos del objeto TareaDb o Updates a los parámetros del SP
  // console.log(`[Repo] Actualizando tarea ${idTarea}:`, updates);
  // V3: Uso de ejecutarSP (envuelto en query raw con SET options para evitar error de indice filtrado)
  // Parche crítico: SET QUOTED_IDENTIFIER ON requerido.
  await ejecutarQuery(
    `
        SET QUOTED_IDENTIFIER ON;
        EXEC sp_ActualizarTarea 
            @idTarea = @idTarea,
            @titulo = @titulo,
            @descripcion = @descripcion,
            @estado = @estado,
            @prioridad = @prioridad,
            @progreso = @progreso,
            @fechaObjetivo = @fechaObjetivo,
            @fechaInicioPlanificada = @fechaInicioPlanificada,
            @linkEvidencia = @linkEvidencia,
            @idTareaPadre = @idTareaPadre
    `,
    {
      idTarea: { valor: idTarea, tipo: Int },
      titulo: { valor: updates.nombre ?? null, tipo: NVarChar },
      descripcion: { valor: updates.descripcion ?? null, tipo: NVarChar },
      estado: { valor: updates.estado ?? null, tipo: NVarChar },
      prioridad: { valor: updates.prioridad ?? null, tipo: NVarChar },
      progreso: { valor: updates.porcentaje ?? null, tipo: Int },
      fechaObjetivo: { valor: updates.fechaObjetivo ?? null, tipo: DateTime },
      fechaInicioPlanificada: {
        valor: updates.fechaInicioPlanificada ?? null,
        tipo: DateTime,
      },
      linkEvidencia: { valor: updates.linkEvidencia ?? null, tipo: NVarChar },
      idTareaPadre: { valor: (updates as any).idTareaPadre ?? null, tipo: Int },
    },
  );

  if ((updates as any).idTareaPadre !== undefined) {
    await ejecutarQuery(
      `SET QUOTED_IDENTIFIER ON; UPDATE p_Tareas SET idTareaPadre = @p, idPadre = @p WHERE idTarea = @t`,
      {
        p: { valor: (updates as any).idTareaPadre, tipo: Int }, // Puede ser null
        t: { valor: idTarea, tipo: Int },
      },
    );
  }

  // [SCHEMA HEAL] Asegurar que la columna existe y soporta URLs largas
  if (updates.linkEvidencia) {
    try {
      await ejecutarQuery(`
                IF COL_LENGTH('p_Tareas', 'linkEvidencia') IS NULL 
                BEGIN 
                    ALTER TABLE p_Tareas ADD linkEvidencia NVARCHAR(MAX); 
                END
                ELSE
                BEGIN
                    -- Si existe, asegurar que sea MAX (opcional, pero útil si se creó pequeña)
                     IF (SELECT max_length FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'linkEvidencia') < 2000
                     BEGIN
                        ALTER TABLE p_Tareas ALTER COLUMN linkEvidencia NVARCHAR(MAX);
                     END
                END
             `);
    } catch (e) {
      console.warn('[Repo] Schema heal failed (non-critical):', e);
    }
  }

  // [FIX] Inline Update para campos nuevos que el SP podría no tener mapeados aún en DB
  if (
    updates.linkEvidencia !== undefined ||
    (updates as any).tipo !== undefined ||
    updates.fechaInicioReal !== undefined ||
    (updates as any).fechaCompletado !== undefined ||
    (updates as any).fechaFinReal !== undefined
  ) {
    const sets: string[] = [];
    const params: any = { id: { valor: idTarea, tipo: Int } };

    if (updates.linkEvidencia !== undefined) {
      sets.push('linkEvidencia = @link');
      params.link = { valor: updates.linkEvidencia, tipo: NVarChar };
    }
    if ((updates as any).tipo !== undefined) {
      sets.push('tipo = @tipoUpdate');
      params.tipoUpdate = { valor: (updates as any).tipo, tipo: NVarChar };
    }
    if (updates.fechaInicioReal !== undefined) {
      sets.push('fechaInicioReal = @fir');
      params.fir = { valor: updates.fechaInicioReal, tipo: DateTime };
    }
    // ✅ FIX: Persistir fechaCompletado cuando la tarea se marca como Hecha
    if ((updates as any).fechaCompletado !== undefined) {
      sets.push('fechaCompletado = @fc');
      params.fc = { valor: (updates as any).fechaCompletado, tipo: DateTime };
    }
    if ((updates as any).fechaFinReal !== undefined) {
      sets.push('fechaFinReal = @ffr');
      params.ffr = { valor: (updates as any).fechaFinReal, tipo: DateTime };
    }

    if (sets.length > 0) {
      await ejecutarQuery(
        `SET QUOTED_IDENTIFIER ON; UPDATE p_Tareas SET ${sets.join(', ')} WHERE idTarea = @id`,
        params,
      );
    }
  }
}

// ==========================================
// CONSULTAS DE PLANES DE TRABAJO
// ==========================================

export async function obtenerPlanPorId(idPlan: number) {
  const res = await ejecutarQuery<any>(
    'SELECT * FROM p_PlanesTrabajo WHERE idPlan = @id',
    { id: { valor: idPlan, tipo: Int } },
  );
  return res[0] || null;
}

export async function obtenerPlanes(carnet: string, mes: number, anio: number) {
  // Buscar plan existente usando SP carnet-first
  const result = await ejecutarSP<any>('sp_Planning_ObtenerPlanes', {
    carnet: { valor: carnet, tipo: NVarChar },
    mes: { valor: mes, tipo: Int },
    anio: { valor: anio, tipo: Int },
  });
  const plan = (result as any)[0];
  if (!plan) return null;

  // Si el SP devuelve el plan en el primero, buscamos las tareas.
  // Asumiendo el wrapper actual de base.repo devuelve Recordset[0]:
  const tareas = await ejecutarQuery<any>(
    `
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC
    `,
    { idPlan: { valor: plan.idPlan, tipo: Int } },
  );

  return {
    ...plan,
    semanas: [
      {
        id: 1,
        label: 'Semana 1',
        tareas: tareas.filter((t) => t.semana === 1),
      },
      {
        id: 2,
        label: 'Semana 2',
        tareas: tareas.filter((t) => t.semana === 2),
      },
      {
        id: 3,
        label: 'Semana 3',
        tareas: tareas.filter((t) => t.semana === 3),
      },
      {
        id: 4,
        label: 'Semana 4',
        tareas: tareas.filter((t) => t.semana === 4),
      },
    ],
  };
}

export async function upsertPlan(datos: any) {
  const { idUsuario, mes, anio, objetivos, estado, idCreador } = datos;

  // Verificar si existe
  const existente = await ejecutarQuery(
    `
        SELECT idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio
    `,
    {
      idUsuario: { valor: idUsuario, tipo: Int },
      mes: { valor: mes, tipo: Int },
      anio: { valor: anio, tipo: Int },
    },
  );

  if (existente.length > 0) {
    // Update
    const idPlan = existente[0].idPlan;
    await ejecutarQuery(
      `
            UPDATE p_PlanesTrabajo 
            SET objetivos = @objetivos, estado = @estado, fechaActualizacion = GETDATE()
            WHERE idPlan = @idPlan
        `,
      {
        idPlan: { valor: idPlan, tipo: Int },
        objetivos: {
          valor:
            typeof objetivos === 'string'
              ? objetivos
              : JSON.stringify(objetivos),
          tipo: NVarChar,
        },
        estado: { valor: estado, tipo: NVarChar },
      },
    );
    return { idPlan, ...datos };
  } else {
    // Insert
    const res = await ejecutarQuery<{ idPlan: number }>(
      `
            INSERT INTO p_PlanesTrabajo (idUsuario, mes, anio, objetivos, estado, idCreador, fechaCreacion)
            OUTPUT INSERTED.idPlan
            VALUES (@idUsuario, @mes, @anio, @objetivos, @estado, @idCreador, GETDATE())
        `,
      {
        idUsuario: { valor: idUsuario, tipo: Int },
        mes: { valor: mes, tipo: Int },
        anio: { valor: anio, tipo: Int },
        objetivos: {
          valor:
            typeof objetivos === 'string'
              ? objetivos
              : JSON.stringify(objetivos),
          tipo: NVarChar,
        },
        estado: { valor: estado, tipo: NVarChar },
        idCreador: { valor: idCreador, tipo: Int },
      },
    );
    return { idPlan: res[0].idPlan, ...datos };
  }
}

// ==========================================
// CONSULTAS DE JERARQUÍA (RECURSIVO)
// ==========================================

export async function obtenerNodosLiderados(idUsuario: number) {
  return await ejecutarQuery<{ idNodo: number }>(
    `
        SELECT idNodo FROM p_UsuariosOrganizacion 
        WHERE idUsuario = @idUsuario AND rol IN ('Lider', 'Gerente', 'Director')
    `,
    { idUsuario: { valor: idUsuario, tipo: Int } },
  );
}

export async function obtenerHijosDeNodos(idsPadres: number[]) {
  if (idsPadres.length === 0) return [];

  const tvp = new sql.Table('dbo.TVP_IntList');
  tvp.columns.add('Id', sql.Int);
  idsPadres.forEach((id) => tvp.rows.add(Math.floor(id)));

  return await ejecutarQuery<{ idNodo: number }>(
    `
        SELECT idNodo FROM p_OrganizacionNodos WHERE idPadre IN (SELECT Id FROM @tvp)
    `,
    { tvp },
  );
}

export async function obtenerUsuariosEnNodos(idsNodos: number[]) {
  if (idsNodos.length === 0) return [];

  const tvp = new sql.Table('dbo.TVP_IntList');
  tvp.columns.add('Id', sql.Int);
  idsNodos.forEach((id) => tvp.rows.add(Math.floor(id)));

  return await ejecutarQuery<{ idUsuario: number }>(
    `
        SELECT idUsuario FROM p_UsuariosOrganizacion WHERE idNodo IN (SELECT Id FROM @tvp)
    `,
    { tvp },
  );
}

// ==========================================
// TEAM
// ==========================================

export async function obtenerEquipoDirecto(carnetJefe: string) {
  const rows = await ejecutarQuery<
    UsuarioDb & {
      rolNombre?: string;
      rolDescripcion?: string;
      rolEsSistema?: boolean;
      rolReglas?: string;
      rolDefaultMenu?: string;
    }
  >(
    `
        SELECT 
            u.*,
            r.nombre as rolNombre,
            r.descripcion as rolDescripcion,
            r.esSistema as rolEsSistema,
            r.reglas as rolReglas,
            r.defaultMenu as rolDefaultMenu
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        WHERE u.jefeCarnet = @carnetJefe AND u.activo = 1
    `,
    { carnetJefe: { valor: carnetJefe, tipo: NVarChar } },
  );

  return rows.map((row) => {
    const usuario: any = { ...row };
    if (row.idRol) {
      usuario.rol = {
        idRol: row.idRol,
        nombre: row.rolNombre || '',
        descripcion: row.rolDescripcion || null,
        esSistema: row.rolEsSistema || false,
        reglas: row.rolReglas || '[]',
        defaultMenu: row.rolDefaultMenu || null,
      };
    }
    return usuario;
  });
}

// ==========================================
// SOLICITUDES DE CAMBIO (Proyectos Estratégicos)
// ==========================================

export async function crearSolicitudCambio(dto: {
  idTarea: number;
  idUsuario: number;
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
  motivo: string;
}) {
  // Verificar si ya existe una pendiente
  await ejecutarQuery(
    `
        INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo)
        VALUES (@idTarea, @idUsuario, @campo, @valorAnterior, @valorNuevo, @motivo)
    `,
    {
      idTarea: { valor: dto.idTarea, tipo: Int },
      idUsuario: { valor: dto.idUsuario, tipo: Int },
      campo: { valor: dto.campo, tipo: NVarChar },
      valorAnterior: { valor: dto.valorAnterior, tipo: NVarChar },
      valorNuevo: { valor: dto.valorNuevo, tipo: NVarChar },
      motivo: { valor: dto.motivo, tipo: NVarChar },
    },
  );
}

export async function obtenerSolicitudesPendientes() {
  return await ejecutarQuery(`
        SELECT s.*, 
               t.nombre as tareaNombre, 
               u.nombre as solicitanteNombre, u.carnet as solicitanteCarnet,
               p.nombre as proyectoNombre
        FROM p_SolicitudesCambio s
        JOIN p_Tareas t ON s.idTarea = t.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
        WHERE s.estado = 'Pendiente'
        ORDER BY s.fechaSolicitud DESC
    `);
}

export async function obtenerSolicitudesPorCarnets(carnets: string[]) {
  if (!carnets.length) return [];
  const carnetsStr = carnets.map((c) => `'${c.replace(/'/g, "''")}'`).join(',');

  return await ejecutarQuery(`
        SELECT s.*, 
               t.nombre as tareaNombre, 
               u.nombre as solicitanteNombre, u.carnet as solicitanteCarnet,
               p.nombre as proyectoNombre
        FROM p_SolicitudesCambio s
        JOIN p_Tareas t ON s.idTarea = t.idTarea
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
        WHERE s.estado = 'Pendiente'
        AND u.carnet IN (${carnetsStr})
        ORDER BY s.fechaSolicitud DESC
    `);
}

export async function obtenerSolicitudesPendientesPorProyecto(
  idProyecto: number,
) {
  return await ejecutarQuery<{ idTarea: number; total: number }>(
    `
        SELECT s.idTarea, COUNT(*) as total
        FROM p_SolicitudesCambio s
        JOIN p_Tareas t ON s.idTarea = t.idTarea
        WHERE s.estado = 'Pendiente' AND t.idProyecto = @idProyecto
        GROUP BY s.idTarea
    `,
    { idProyecto: { valor: idProyecto, tipo: Int } },
  );
}

export async function obtenerSolicitudPorId(id: number) {
  const res = await ejecutarQuery<any>(
    'SELECT * FROM p_SolicitudesCambio WHERE idSolicitud = @id',
    { id: { valor: id, tipo: Int } },
  );
  return res[0] || null;
}

export async function resolverSolicitud(
  id: number,
  estado: string,
  idUsuarioResolutor: number,
  comentario: string,
) {
  await ejecutarQuery(
    `
        UPDATE p_SolicitudesCambio 
        SET estado = @estado, 
            idUsuarioResolutor = @idUsuario, 
            fechaResolucion = GETDATE(),
            comentarioResolucion = @comentario
        WHERE idSolicitud = @id
    `,
    {
      id: { valor: id, tipo: Int },
      estado: { valor: estado, tipo: NVarChar },
      idUsuario: { valor: idUsuarioResolutor, tipo: Int },
      comentario: { valor: comentario, tipo: NVarChar },
    },
  );
}

export async function clonarTarea(idTarea: number, carnet: string) {
  const res = await ejecutarSP<{ idTarea: number }>('sp_Tarea_Clonar', {
    idTareaFuente: { valor: idTarea, tipo: Int },
    ejecutorCarnet: { valor: carnet, tipo: NVarChar },
  });
  return res[0].idTarea;
}

export async function reasignarTareas(taskIds: number[], toCarnet: string) {
  await ejecutarSP('sp_Tareas_Reasignar_PorCarnet', {
    taskIdsCsv: { valor: taskIds.join(','), tipo: NVarChar },
    toCarnet: { valor: toCarnet, tipo: NVarChar },
  });
}

export async function cerrarPlan(idPlan: number) {
  await ejecutarSP('sp_Plan_Cerrar', {
    idPlan: { valor: idPlan, tipo: Int },
  });
}

export async function esAsignado(idTarea: number, idUsuario: number) {
  const res = await ejecutarQuery(
    `
        -- Check legacy single assignment
        SELECT 1 FROM p_Tareas WHERE idTarea = @idTarea AND idAsignado = @idUsuario
        UNION
        -- Check multiple assignment via carnet
        SELECT 1 
        FROM p_TareaAsignados ta
        INNER JOIN p_Usuarios u ON ta.carnet = u.carnet
        WHERE ta.idTarea = @idTarea AND u.idUsuario = @idUsuario
    `,
    {
      idTarea: { valor: idTarea, tipo: Int },
      idUsuario: { valor: idUsuario, tipo: Int },
    },
  );
  return res.length > 0;
}

// === DASHBOARD ALERTS (REAL DATA) ===
export async function obtenerTareasCriticas(carnets: string[]) {
  if (!carnets || carnets.length === 0) return [];

  // Sanitizar carnets para IN clausula segura
  const carnetsSafe = carnets.map((c) => c.replace(/'/g, "''"));
  const carnetsCsv = carnetsSafe.map((c) => `'${c}'`).join(',');

  // Query optimizada: Tareas activas que vencen hoy o antes
  // FIX: Ahora hacemos JOIN con p_TareaAsignados porque esa es la tabla real de asignaciones.
  // Usamos DISTINCT para evitar duplicados si la lógica de asignación es redundante.
  return await ejecutarQuery(`
        DECLARE @Hoy DATE = CONVERT(DATE, GETDATE());
        DECLARE @Ini DATETIME2(0) = CONVERT(DATETIME2(0), @Hoy);
        DECLARE @Fin DATETIME2(0) = DATEADD(DAY, 1, @Ini);

        WITH TareasEquipo AS (
            -- FUENTE 1: Asignación oficial a un miembro del equipo
            SELECT ta.idTarea, ta.carnet
            FROM dbo.p_TareaAsignados ta
            WHERE ta.carnet IN (${carnetsCsv})

            UNION  -- Dedup automático
            
            -- FUENTE 2: Tareas que el equipo puso en su plan de hoy
            SELECT ct.idTarea, c.usuarioCarnet as carnet
            FROM dbo.p_CheckinTareas ct
            INNER JOIN dbo.p_Checkins c ON c.idCheckin = ct.idCheckin
            WHERE c.usuarioCarnet IN (${carnetsCsv})
              AND c.fecha >= @Ini AND c.fecha < @Fin
        )
        SELECT DISTINCT
            t.idTarea, t.nombre as titulo, t.fechaObjetivo, t.estado, t.prioridad, t.idProyecto, 
            t.fechaCompletado, t.fechaFinReal,
            u.nombre as asignado, 
            u.gerencia, u.subgerencia, u.area,
            te.carnet as usuarioCarnet, 
            p.nombre as proyectoNombre
        FROM TareasEquipo te
        INNER JOIN dbo.p_Tareas t ON t.idTarea = te.idTarea
        INNER JOIN dbo.p_Usuarios u ON te.carnet = u.carnet
        LEFT JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.activo = 1
          AND (
            -- Caso A: Tarea pendiente que vence hoy o está atrasada
            (t.estado NOT IN ('Hecha', 'Completada', 'Eliminada', 'Cancelada') AND t.fechaObjetivo < @Fin)
            OR
            -- Caso B: Tarea terminada HOY (usando fecha de término real)
            (t.estado IN ('Hecha', 'Completada') AND (
                (t.fechaCompletado >= @Ini AND t.fechaCompletado < @Fin) OR 
                (t.fechaFinReal >= @Ini AND t.fechaFinReal < @Fin)
            ))
          )
        ORDER BY t.fechaObjetivo ASC;
    `);
}

// ==========================================
// MI ASIGNACIÓN - Vista Unificada
// ==========================================

export async function obtenerMiAsignacion(
  carnet: string,
  filtros?: { estado?: string },
) {
  // 1. Obtener proyectos donde tengo tareas asignadas
  const proyectos = await ejecutarSP<any>(
    'sp_Planning_ObtenerProyectosAsignados',
    {
      carnet: { valor: carnet, tipo: NVarChar },
    },
  );

  // 2. Obtener mis tareas en esos proyectos
  // 2. Obtener mis tareas en esos proyectos (USANDO SP para Visibilidad Correcta)
  // FIX 2026-02-17: Usar 'sp_Tareas_ObtenerPorUsuario' para incluir tareas de proyectos propios
  const tareasRaw = await ejecutarSP<any>('sp_Tareas_ObtenerPorUsuario', {
    carnet: { valor: carnet, tipo: NVarChar },
    estado: {
      valor:
        filtros?.estado === 'pendientes' || filtros?.estado === 'todas'
          ? null
          : filtros?.estado,
      tipo: NVarChar,
    },
  });

  // Filtro adicional en memoria si es necesario (el SP ya filtra por estado exacto si se pasa, pero 'pendientes' es especial)
  let tareas = tareasRaw;
  if (filtros?.estado === 'pendientes') {
    tareas = tareas.filter(
      (t: any) =>
        ![
          'Hecha',
          'Completada',
          'Descartada',
          'Eliminada',
          'Archivada',
        ].includes(t.estado),
    );
  }

  // Mapeo para mantener compatibilidad con la estructura anterior y calcular diasAtraso
  const toISODate = (d: any) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const hoyStr = toISODate(new Date());

  const tareasFiltradas = tareas.map((t: any) => {
    const fObjStr = toISODate(t.fechaObjetivo);
    const esAtrasada =
      fObjStr &&
      hoyStr &&
      fObjStr < hoyStr &&
      !['Hecha', 'Completada', 'Descartada'].includes(t.estado);

    let finalTitle = t.titulo || t.nombre || t.Nombre;
    if (t.responsableCarnet && String(t.responsableCarnet).trim() !== String(carnet).trim()) {
      const shortName = t.responsableNombre ? t.responsableNombre.split(' ').slice(0, 2).join(' ') : 'Otro';
      finalTitle = `${finalTitle} (Asig: ${shortName})`;
    }

    return {
      ...t,
      nombre: finalTitle,
      titulo: finalTitle,
      diasAtraso:
        esAtrasada && t.fechaObjetivo
          ? Math.floor(
            (new Date().getTime() - new Date(t.fechaObjetivo).getTime()) /
            (1000 * 3600 * 24),
          )
          : 0,
      esAtrasada: esAtrasada ? 1 : 0,
    };
  });

  // 4. Agrupar proyectos + Proyecto Virtual para tareas sin proyecto
  const proyectosMap = new Map();
  proyectos.forEach((p: any) =>
    proyectosMap.set(p.idProyecto, { ...p, misTareas: [] }),
  );

  const tareasSinProyecto: any[] = [];

  tareasFiltradas.forEach((t: any) => {
    if (t.idProyecto && proyectosMap.has(t.idProyecto)) {
      proyectosMap.get(t.idProyecto).misTareas.push(t);
    } else if (t.idProyecto) {
      // Tarea de proyecto que no está en la lista de 'mis proyectos asignados'
      // Esto pasa si soy Dueño del Proyecto pero no tengo tareas asignadas en él,
      // PERO el SP me devolvio la tarea porque soy el dueño.
      // Debemos buscar info del proyecto o ponerlo en un grupo genérico?
      // Simplificación: Lo agregamos a 'Sin Proyecto' o creamos entrada stub.
      // Mejor: Agregarlo a Sin Proyecto con el nombre del proyecto como prefijo?
      // O simplemente dejarlo en Sin Proyecto.
      // Opción ideal: El SP devuelve proyectoNombre.
      // Podríamos agrupar dinámicamente.
      tareasSinProyecto.push(t);
    } else {
      tareasSinProyecto.push(t);
    }
  });

  const proyectosFinal = Array.from(proyectosMap.values()).filter(
    (p: any) => p.misTareas.length > 0,
  );

  // Agregar tareas SIN PROYECTO (General) if any
  // Agregar tareas SIN PROYECTO o DE PROYECTOS NO ASIGNADOS (pero visibles)
  if (tareasSinProyecto.length > 0) {
    proyectosFinal.push({
      idProyecto: 0, // ID virtual
      nombre: 'General / Otros Proyectos',
      progresoProyecto: 0,
      misTareas: tareasSinProyecto,
    });
  }

  // 4. Calcular resumen
  const tareasAtrasadas = tareasFiltradas.filter(
    (t: any) => t.esAtrasada === 1 || t.esAtrasada === true,
  ).length;
  const tareasHoy = tareasFiltradas.filter((t: any) => {
    if (!t.fechaObjetivo) return false;
    const hoy = new Date().toISOString().split('T')[0];
    const fecha = new Date(t.fechaObjetivo).toISOString().split('T')[0];
    return hoy === fecha;
  }).length;

  return {
    proyectos: proyectosFinal,
    resumen: {
      totalProyectos: proyectos.length + (tareasSinProyecto.length > 0 ? 1 : 0),
      totalTareas: tareasFiltradas.length,
      tareasAtrasadas,
      tareasHoy,
      tareasCompletadas: tareasFiltradas.filter((t: any) => {
        const s = (t.estado || '').toString().trim();
        return s === 'Hecha' || s === 'Completada';
      }).length,
    },
  };
}

// ==========================================
// SUPERVISIÓN (ADMIN)
// ==========================================
export async function obtenerSupervision() {
  // 1. Usuarios activos SIN tareas asignadas (pendientes o en curso)
  // Se consideran usuarios activos que no estan en p_TareaAsignados de ninguna tarea activa no-finalizada
  const usuariosSinTarea = await ejecutarQuery(`
        SELECT u.idUsuario, u.nombre, u.carnet, u.gerencia, u.area, u.rolGlobal, u.correo
        FROM p_Usuarios u
        WHERE u.activo = 1
          AND u.carnet IS NOT NULL
          AND u.nombre NOT LIKE '%Admin%' -- Opcional: filtrar cuentas de sistema si se desea
          AND NOT EXISTS (
              SELECT 1 
              FROM p_TareaAsignados ta
              JOIN p_Tareas t ON ta.idTarea = t.idTarea
              WHERE ta.carnet = u.carnet
                AND t.activo = 1
                AND t.estado NOT IN ('Hecha', 'Completada', 'Descartada', 'Eliminada', 'Cancelada', 'Archivada')
          )
        ORDER BY u.nombre ASC
    `);

  // 2. Proyectos Activos SIN tareas activas (vacíos o solo con tareas finalizadas/descartadas)
  const proyectosSinTarea = await ejecutarQuery(`
        SELECT p.idProyecto, p.nombre, p.tipo, p.gerencia, p.area, u.nombre as creador, p.fechaCreacion
        FROM p_Proyectos p
        LEFT JOIN p_Usuarios u ON p.idCreador = u.idUsuario
        WHERE p.estado = 'Activo'
          AND NOT EXISTS (
              SELECT 1 
              FROM p_Tareas t
              WHERE t.idProyecto = p.idProyecto
                AND t.activo = 1
                AND t.estado NOT IN ('Hecha', 'Completada', 'Descartada', 'Eliminada', 'Cancelada', 'Archivada')
          )
        ORDER BY p.nombre ASC
    `);

  return { usuariosSinTarea, proyectosSinTarea };
}

export async function debugTasksByUser(name: string) {
  const users = await ejecutarQuery<any>(
    `SELECT * FROM p_Usuarios WHERE nombre LIKE '%${name}%'`,
  );
  if (!users || users.length === 0) return { message: 'User not found' };

  const user = users[0];
  const tasks = await ejecutarQuery<any>(`
        SELECT t.idTarea, t.titulo, t.descripcion, t.estado, t.activo, t.fechaObjetivo, t.idProyecto
        FROM p_Tareas t
        JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        WHERE ta.carnet = '${user.carnet}'
          AND t.activo = 1
        ORDER BY t.fechaObjetivo DESC
    `);

  return { user, tasks };
}
