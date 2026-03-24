/**
 * Planning Repository - Queries para el módulo de planificación
 * Reemplaza TypeORM con consultas directas a SQL Server
 */
import { crearRequest, ejecutarQuery, ejecutarSP, Int, NVarChar, Bit, DateTime, SqlDate, conTransaccion, sql } from '../db/base.repo';
import { ProyectoDb, TareaDb, PlanTrabajoDb, SolicitudCambioDb, UsuarioDb, UsuarioOrganizacionDb } from '../db/tipos';
import { cacheGet, cacheSet } from '../common/cache.service';

// ==========================================
// CONSULTAS DE PROYECTOS
// ==========================================

export async function obtenerProyectosPorUsuario(carnet: string) {
    // Obtener proyectos donde el usuario tiene tareas asignadas
    // V2: Uso de SP carnet-first
    return await ejecutarQuery<ProyectoDb>('EXEC sp_ObtenerProyectos @carnet = @carnet', { carnet: { valor: carnet, tipo: NVarChar } });
}

export async function obtenerTodosProyectos(filter?: any) {
    let sql = 'SELECT * FROM p_Proyectos WHERE 1=1';
    const params: any = {};

    if (filter?.nombre) {
        sql += ' AND nombre LIKE @nombre';
        params.nombre = { valor: `%${filter.nombre}%`, tipo: NVarChar };
    }
    if (filter?.estado) {
        sql += ' AND estado = @estado';
        params.estado = { valor: filter.estado, tipo: NVarChar };
    }
    if (filter?.gerencia) {
        sql += ' AND gerencia = @gerencia';
        params.gerencia = { valor: filter.gerencia, tipo: NVarChar };
    }
    if (filter?.subgerencia) {
        sql += ' AND subgerencia = @subgerencia';
        params.subgerencia = { valor: filter.subgerencia, tipo: NVarChar };
    }
    if (filter?.area) {
        sql += ' AND area = @area';
        params.area = { valor: filter.area, tipo: NVarChar };
    }
    if (filter?.tipo) {
        sql += ' AND tipo = @tipo';
        params.tipo = { valor: filter.tipo, tipo: NVarChar };
    }

    sql += ' ORDER BY fechaCreacion DESC';
    return await ejecutarQuery<ProyectoDb>(sql, params);
}

/**
 * Obtiene proyectos visibles para un usuario según reglas de negocio:
 * 1. Proyectos que yo creé
 * 2. Proyectos donde tengo tareas asignadas
 * 3. Proyectos donde mis subordinados (cadena de jefatura) tienen tareas
 */
export async function obtenerProyectosVisibles(idUsuario: number, usuario: any, filter?: any) {
    const cacheKey = `equipo_ids_v2:${usuario.carnet || idUsuario}`;
    let idsEquipo = cacheGet<number[]>(cacheKey);

    // Si no está en cache, usamos el SP optimizado de Visibilidad (Carnet-First)
    if (!idsEquipo) {
        // [OPTIMIZACION] Usamos el repo de acceso que ya tiene la lógica de jerarquía + delegación + permisos
        const accesoRepo = require('../acceso/acceso.repo');
        const miEquipo = await accesoRepo.obtenerMiEquipoPorCarnet(usuario.carnet || '');

        // Extraemos solo IDs únicos
        idsEquipo = [...new Set(miEquipo.map((u: any) => u.idUsuario).filter((id: any) => id))] as number[];

        // Fallback: si no devuelve nada (raro), al menos el propio usuario
        if (idsEquipo.length === 0) idsEquipo = [idUsuario];

        cacheSet(cacheKey, idsEquipo, 5 * 60 * 1000); // Cache 5 min
    }

    // 2026-01-25: Migración Zero Inline SQL - Uso de SP con TVP
    const tvpEquipo = new sql.Table('dbo.TVP_IntList');
    tvpEquipo.columns.add('Id', sql.Int);

    idsEquipo.forEach(id => tvpEquipo.rows.add(id));

    return await ejecutarSP<ProyectoDb>('sp_Proyecto_ObtenerVisibles', {
        idUsuario: { valor: idUsuario, tipo: Int },
        idsEquipo: tvpEquipo // TVP
    });
}


// Esta función estaba creando PROYECTOS, no tareas. La de tareas no estaba exportada o estaba en otro lado.
// Ahora agregamos la V2 para crear Tarea con SP
export async function crearTarea(dto: {
    titulo: string, descripcion?: string, idProyecto?: number, prioridad: string, effort?: string, tipo?: string,
    fechaInicioPlanificada?: Date | null, fechaObjetivo?: Date | null, idCreador: number, idResponsable?: number,
    comportamiento?: string, linkEvidencia?: string
}) {
    // V2: Uso de SP
    const res = await ejecutarQuery<{ idTarea: number }>(`
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
    `, {
        titulo: { valor: dto.titulo, tipo: NVarChar },
        descripcion: { valor: dto.descripcion, tipo: NVarChar },
        idProyecto: { valor: dto.idProyecto, tipo: Int },
        prioridad: { valor: dto.prioridad, tipo: NVarChar },
        esfuerzo: { valor: dto.effort || 'M', tipo: NVarChar },
        tipo: { valor: dto.tipo || 'Administrativa', tipo: NVarChar },
        fechaInicioPlanificada: { valor: dto.fechaInicioPlanificada, tipo: DateTime },
        fechaObjetivo: { valor: dto.fechaObjetivo, tipo: DateTime },
        idCreador: { valor: dto.idCreador, tipo: Int },
        idResponsable: { valor: dto.idResponsable, tipo: Int },
        comportamiento: { valor: dto.comportamiento, tipo: NVarChar },
        linkEvidencia: { valor: dto.linkEvidencia, tipo: NVarChar }
    });
    return res[0]?.idTarea;
}

export async function crearProyecto(dto: { nombre: string, descripcion?: string, idNodoDuenio?: number, area?: string, subgerencia?: string, gerencia?: string, fechaInicio?: Date, fechaFin?: Date, idCreador: number, tipo?: string }) {
    const res = await ejecutarQuery<{ idProyecto: number }>(`
        INSERT INTO p_Proyectos (nombre, descripcion, idNodoDuenio, area, subgerencia, gerencia, fechaInicio, fechaFin, fechaCreacion, idCreador, estado, tipo)
        OUTPUT INSERTED.idProyecto
        VALUES (@nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, GETDATE(), @idCreador, 'Activo', @tipo)
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
        tipo: { valor: dto.tipo || 'administrativo', tipo: NVarChar }
    });
    return res[0].idProyecto;
}

export async function actualizarDatosProyecto(idProyecto: number, updates: Partial<ProyectoDb>) {
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
}

export async function eliminarProyecto(idProyecto: number) {
    await ejecutarQuery('DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto', { idProyecto: { valor: idProyecto, tipo: Int } });
}

export async function obtenerProyectoPorId(idProyecto: number) {
    const res = await ejecutarQuery<ProyectoDb>('SELECT * FROM p_Proyectos WHERE idProyecto = @idProyecto', { idProyecto: { valor: idProyecto, tipo: Int } });
    return res[0];
}

// ==========================================
// CONSULTAS DE TAREAS
// ==========================================

// Recupera una tarea por ID incluyendo sus subtareas y datos del proyecto
export async function obtenerTareaPorId(idTarea: number) {
    const tareas = await ejecutarQuery<TareaDb & {
        proyectoTipo?: string,
        proyectoRequiereAprobacion?: boolean,
        creadorNombre?: string,
        creadorCorreo?: string
    }>(`
        SELECT 
            t.idTarea, t.nombre, t.descripcion, t.estado, t.prioridad, t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado, t.porcentaje, t.idPadre, t.orden, t.esHito, t.idAsignado, t.idPlan,
            t.linkEvidencia, t.tipo, t.esfuerzo, t.comportamiento, t.fechaInicioPlanificada,
            t.porcentaje as progreso,
            p.tipo as proyectoTipo, 
            p.requiereAprobacion as proyectoRequiereAprobacion,
            uc.nombre as creadorNombre,
            uc.correo as creadorCorreo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios uc ON t.idCreador = uc.idUsuario
        WHERE t.idTarea = @idTarea
    `, { idTarea: { valor: idTarea, tipo: Int } });

    if (tareas.length === 0) return null;
    const t = tareas[0];

    // Transform flat creator fields to object
    const tarea: any = {
        ...t,
        creador: t.creadorNombre ? { nombre: t.creadorNombre, correo: t.creadorCorreo } : null
    };

    if (tarea) {
        // Cargar subtareas
        const subtareas = await ejecutarQuery<TareaDb>(`
            SELECT idTarea, nombre as titulo, estado, prioridad, porcentaje as progreso
            FROM p_Tareas
            WHERE idTareaPadre = @id
            ORDER BY orden ASC, fechaObjetivo ASC
        `, { id: { valor: idTarea, tipo: Int } });

        (tarea as any).subtareas = subtareas;
    }

    return tarea;
}

export async function actualizarTarea(idTarea: number, updates: Partial<TareaDb>) {
    // V3: Uso de ejecutarSP para mayor seguridad y evitar warnings de BaseRepo
    // Mapeamos los campos del objeto TareaDb o Updates a los parámetros del SP
    console.log(`[Repo] Actualizando tarea ${idTarea}:`, updates);
    await ejecutarSP('sp_ActualizarTarea', {
        idTarea: { valor: idTarea, tipo: Int },
        titulo: { valor: updates.nombre ?? null, tipo: NVarChar },
        descripcion: { valor: updates.descripcion ?? null, tipo: NVarChar },
        estado: { valor: updates.estado ?? null, tipo: NVarChar },
        prioridad: { valor: updates.prioridad ?? null, tipo: NVarChar },
        progreso: { valor: updates.porcentaje ?? null, tipo: Int },
        fechaObjetivo: { valor: updates.fechaObjetivo ?? null, tipo: DateTime },
        fechaInicioPlanificada: { valor: updates.fechaInicioPlanificada ?? null, tipo: DateTime },
        linkEvidencia: { valor: updates.linkEvidencia ?? null, tipo: NVarChar }
    });

    if ((updates as any).idTareaPadre !== undefined) {
        await ejecutarQuery(`UPDATE p_Tareas SET idTareaPadre = @p WHERE idTarea = @t`, {
            p: { valor: (updates as any).idTareaPadre, tipo: Int }, // Puede ser null
            t: { valor: idTarea, tipo: Int }
        });
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
    if (updates.linkEvidencia !== undefined || (updates as any).tipo !== undefined) {
        const sets: string[] = [];
        const params: any = { id: { valor: idTarea, tipo: Int } };

        if (updates.linkEvidencia !== undefined) {
            sets.push("linkEvidencia = @link");
            params.link = { valor: updates.linkEvidencia, tipo: NVarChar };
        }
        if ((updates as any).tipo !== undefined) {
            sets.push("tipo = @tipoUpdate");
            params.tipoUpdate = { valor: (updates as any).tipo, tipo: NVarChar };
        }

        if (sets.length > 0) {
            await ejecutarQuery(`UPDATE p_Tareas SET ${sets.join(', ')} WHERE idTarea = @id`, params);
        }
    }
}

// ==========================================
// CONSULTAS DE PLANES DE TRABAJO
// ==========================================

export async function obtenerPlanPorId(idPlan: number) {
    const res = await ejecutarQuery<any>('SELECT * FROM p_PlanesTrabajo WHERE idPlan = @id', { id: { valor: idPlan, tipo: Int } });
    return res[0] || null;
}

export async function obtenerPlanes(carnet: string, mes: number, anio: number) {
    // Buscar plan existente usando SP carnet-first
    const result = await ejecutarSP<any>('sp_Planning_ObtenerPlanes', {
        carnet: { valor: carnet, tipo: NVarChar },
        mes: { valor: mes, tipo: Int },
        anio: { valor: anio, tipo: Int }
    });
    let plan = (result as any)[0];
    if (!plan) return null;

    // Si el SP devuelve el plan en el primero, buscamos las tareas.
    // Asumiendo el wrapper actual de base.repo devuelve Recordset[0]:
    const tareas = await ejecutarQuery<any>(`
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC
    `, { idPlan: { valor: plan.idPlan, tipo: Int } });

    return {
        ...plan,
        semanas: [
            { id: 1, label: 'Semana 1', tareas: tareas.filter(t => t.semana === 1) },
            { id: 2, label: 'Semana 2', tareas: tareas.filter(t => t.semana === 2) },
            { id: 3, label: 'Semana 3', tareas: tareas.filter(t => t.semana === 3) },
            { id: 4, label: 'Semana 4', tareas: tareas.filter(t => t.semana === 4) }
        ]
    };
}

export async function upsertPlan(datos: any) {
    const { idUsuario, mes, anio, objetivos, estado, idCreador } = datos;

    // Verificar si existe
    const existente = await ejecutarQuery(`
        SELECT idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio
    `, {
        idUsuario: { valor: idUsuario, tipo: Int },
        mes: { valor: mes, tipo: Int },
        anio: { valor: anio, tipo: Int }
    });

    if (existente.length > 0) {
        // Update
        const idPlan = existente[0].idPlan;
        await ejecutarQuery(`
            UPDATE p_PlanesTrabajo 
            SET objetivos = @objetivos, estado = @estado, fechaActualizacion = GETDATE()
            WHERE idPlan = @idPlan
        `, {
            idPlan: { valor: idPlan, tipo: Int },
            objetivos: { valor: typeof objetivos === 'string' ? objetivos : JSON.stringify(objetivos), tipo: NVarChar },
            estado: { valor: estado, tipo: NVarChar }
        });
        return { idPlan, ...datos };
    } else {
        // Insert
        const res = await ejecutarQuery<{ idPlan: number }>(`
            INSERT INTO p_PlanesTrabajo (idUsuario, mes, anio, objetivos, estado, idCreador, fechaCreacion)
            OUTPUT INSERTED.idPlan
            VALUES (@idUsuario, @mes, @anio, @objetivos, @estado, @idCreador, GETDATE())
        `, {
            idUsuario: { valor: idUsuario, tipo: Int },
            mes: { valor: mes, tipo: Int },
            anio: { valor: anio, tipo: Int },
            objetivos: { valor: typeof objetivos === 'string' ? objetivos : JSON.stringify(objetivos), tipo: NVarChar },
            estado: { valor: estado, tipo: NVarChar },
            idCreador: { valor: idCreador, tipo: Int }
        });
        return { idPlan: res[0].idPlan, ...datos };
    }
}

// ==========================================
// CONSULTAS DE JERARQUÍA (RECURSIVO)
// ==========================================

export async function obtenerNodosLiderados(idUsuario: number) {
    return await ejecutarQuery<{ idNodo: number }>(`
        SELECT idNodo FROM p_UsuariosOrganizacion 
        WHERE idUsuario = @idUsuario AND rol IN ('Lider', 'Gerente', 'Director')
    `, { idUsuario: { valor: idUsuario, tipo: Int } });
}

export async function obtenerHijosDeNodos(idsPadres: number[]) {
    if (idsPadres.length === 0) return [];

    // Construir lista IN para la query (sanitizada via parameter no soportado en lista, usaremos string builder seguro con ints)
    const idsStr = idsPadres.map(id => Math.floor(id)).join(',');

    return await ejecutarQuery<{ idNodo: number }>(`
        SELECT idNodo FROM p_OrganizacionNodos WHERE idPadre IN (${idsStr})
    `);
}

export async function obtenerUsuariosEnNodos(idsNodos: number[]) {
    if (idsNodos.length === 0) return [];
    const idsStr = idsNodos.map(id => Math.floor(id)).join(',');

    return await ejecutarQuery<{ idUsuario: number }>(`
        SELECT idUsuario FROM p_UsuariosOrganizacion WHERE idNodo IN (${idsStr})
    `);
}

// ==========================================
// TEAM
// ==========================================

export async function obtenerEquipoDirecto(carnetJefe: string) {
    const rows = await ejecutarQuery<UsuarioDb & {
        rolNombre?: string;
        rolDescripcion?: string;
        rolEsSistema?: boolean;
        rolReglas?: string;
        rolDefaultMenu?: string
    }>(`
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
    `, { carnetJefe: { valor: carnetJefe, tipo: NVarChar } });

    return rows.map(row => {
        const usuario: any = { ...row };
        if (row.idRol) {
            usuario.rol = {
                idRol: row.idRol,
                nombre: row.rolNombre || '',
                descripcion: row.rolDescripcion || null,
                esSistema: row.rolEsSistema || false,
                reglas: row.rolReglas || '[]',
                defaultMenu: row.rolDefaultMenu || null
            };
        }
        return usuario;
    });
}


// ==========================================
// SOLICITUDES DE CAMBIO (Proyectos Estratégicos)
// ==========================================

export async function crearSolicitudCambio(dto: { idTarea: number, idUsuario: number, campo: string, valorAnterior: string, valorNuevo: string, motivo: string }) {
    // Verificar si ya existe una pendiente
    await ejecutarQuery(`
        INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo)
        VALUES (@idTarea, @idUsuario, @campo, @valorAnterior, @valorNuevo, @motivo)
    `, {
        idTarea: { valor: dto.idTarea, tipo: Int },
        idUsuario: { valor: dto.idUsuario, tipo: Int },
        campo: { valor: dto.campo, tipo: NVarChar },
        valorAnterior: { valor: dto.valorAnterior, tipo: NVarChar },
        valorNuevo: { valor: dto.valorNuevo, tipo: NVarChar },
        motivo: { valor: dto.motivo, tipo: NVarChar }
    });
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
    const carnetsStr = carnets.map(c => `'${c.replace(/'/g, "''")}'`).join(',');

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

export async function obtenerSolicitudPorId(id: number) {
    const res = await ejecutarQuery<any>('SELECT * FROM p_SolicitudesCambio WHERE idSolicitud = @id', { id: { valor: id, tipo: Int } });
    return res[0] || null;
}



export async function resolverSolicitud(id: number, estado: string, idUsuarioResolutor: number, comentario: string) {
    await ejecutarQuery(`
        UPDATE p_SolicitudesCambio 
        SET estado = @estado, 
            idUsuarioResolutor = @idUsuario, 
            fechaResolucion = GETDATE(),
            comentarioResolucion = @comentario
        WHERE idSolicitud = @id
    `, {
        id: { valor: id, tipo: Int },
        estado: { valor: estado, tipo: NVarChar },
        idUsuario: { valor: idUsuarioResolutor, tipo: Int },
        comentario: { valor: comentario, tipo: NVarChar }
    });
}

export async function clonarTarea(idTarea: number, carnet: string) {
    const res = await ejecutarSP<{ idTarea: number }>('sp_Tarea_Clonar', {
        idTareaFuente: { valor: idTarea, tipo: Int },
        ejecutorCarnet: { valor: carnet, tipo: NVarChar }
    });
    return res[0].idTarea;
}

export async function reasignarTareas(taskIds: number[], toCarnet: string) {
    await ejecutarSP('sp_Tareas_Reasignar_PorCarnet', {
        taskIdsCsv: { valor: taskIds.join(','), tipo: NVarChar },
        toCarnet: { valor: toCarnet, tipo: NVarChar }
    });
}

export async function cerrarPlan(idPlan: number) {
    await ejecutarSP('sp_Plan_Cerrar', {
        idPlan: { valor: idPlan, tipo: Int }
    });
}

// === DASHBOARD ALERTS (REAL DATA) ===
export async function obtenerTareasCriticas(carnets: string[]) {
    if (!carnets || carnets.length === 0) return [];

    // Sanitizar carnets para IN clausula segura
    const carnetsSafe = carnets.map(c => c.replace(/'/g, "''"));
    const carnetsCsv = carnetsSafe.map(c => `'${c}'`).join(',');

    // Query optimizada: Tareas activas que vencen hoy o antes
    // FIX: Ahora hacemos JOIN con p_TareaAsignados porque esa es la tabla real de asignaciones.
    // Usamos DISTINCT para evitar duplicados si la lógica de asignación es redundante.
    return await ejecutarQuery(`
        SELECT DISTINCT
            t.idTarea, t.nombre as titulo, t.fechaObjetivo, t.estado, t.prioridad, t.idProyecto,
            u.nombre as asignado, 
            ta.carnet as usuarioCarnet, 
            p.nombre as proyectoNombre
        FROM p_Tareas t
        INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
        INNER JOIN p_Usuarios u ON ta.carnet = u.carnet
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE ta.carnet IN (${carnetsCsv})
          AND t.activo = 1
          AND t.estado NOT IN ('Hecha', 'Eliminada', 'Cancelada', 'Completada')
          AND t.fechaObjetivo IS NOT NULL
          AND CAST(t.fechaObjetivo AS DATE) <= CAST(GETDATE() AS DATE)
        ORDER BY t.fechaObjetivo ASC
    `);
}
