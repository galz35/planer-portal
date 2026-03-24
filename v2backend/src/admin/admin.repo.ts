/**
 * Admin Repository - Queries para el módulo Administrativo
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
} from '../db/base.repo';
import {
  UsuarioDb,
  RolDb,
  UsuarioConfigDb,
  SeguridadPerfilDb,
  OrganizacionNodoDb,
  LogSistemaDb,
  AuditLogDb,
  ResultadoPaginado,
} from '../db/tipos';

// ==========================================
// SEGURIDAD Y USUARIOS (Access Info)
// ==========================================

export async function obtenerUsuariosAccessInfo() {
  // Optimización: Reemplazamos COUNT correlacionado por agregación única + JOIN para mejorar performance O(N)
  return await ejecutarQuery<
    UsuarioDb & { subordinateCount: number; menuPersonalizado: string | null }
  >(`
        SELECT 
            u.*,
            ISNULL(sc.subordinateCount, 0) AS subordinateCount,
            c.menuPersonalizado
        FROM p_Usuarios u
        LEFT JOIN p_UsuariosConfig c 
            ON u.idUsuario = c.idUsuario
        LEFT JOIN (
            SELECT jefeCarnet, COUNT(*) AS subordinateCount
            FROM p_Usuarios
            WHERE activo = 1
            GROUP BY jefeCarnet
        ) sc 
            ON sc.jefeCarnet = u.carnet
        WHERE u.activo = 1
        ORDER BY u.nombre ASC
    `);
}

export async function asignarMenuPersonalizado(
  idUsuario: number,
  menuJson: string | null,
) {
  // Upsert config
  const config = await ejecutarQuery<UsuarioConfigDb>(
    `
        SELECT * FROM p_UsuariosConfig WHERE idUsuario = @id
    `,
    { id: { valor: idUsuario, tipo: Int } },
  );

  if (config.length > 0) {
    await ejecutarQuery(
      `
            UPDATE p_UsuariosConfig SET menuPersonalizado = @menu WHERE idUsuario = @id
        `,
      {
        menu: { valor: menuJson, tipo: NVarChar },
        id: { valor: idUsuario, tipo: Int },
      },
    );
  } else {
    await ejecutarQuery(
      `
            INSERT INTO p_UsuariosConfig (idUsuario, menuPersonalizado) VALUES (@id, @menu)
        `,
      {
        id: { valor: idUsuario, tipo: Int },
        menu: { valor: menuJson, tipo: NVarChar },
      },
    );
  }
}

export async function obtenerPerfilesSeguridad() {
  return await ejecutarQuery<SeguridadPerfilDb>(`
        SELECT * FROM p_SeguridadPerfiles WHERE activo = 1 ORDER BY nombre ASC
    `);
}

// ==========================================
// ADMIN GENERAL (Usuarios, Roles, Logs)
// ==========================================

export async function listarUsuarios(pagina: number = 1, limite: number = 50) {
  const offset = (pagina - 1) * limite;

  const datos = await ejecutarQuery<
    UsuarioDb & { rolNombre: string; menuPersonalizado: string | null }
  >(
    `
        SELECT u.*, r.nombre as rolNombre, c.menuPersonalizado
        FROM p_Usuarios u
        LEFT JOIN p_Roles r ON u.idRol = r.idRol
        LEFT JOIN p_UsuariosConfig c ON u.idUsuario = c.idUsuario
        ORDER BY u.nombre ASC
        OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `,
    {
      offset: { valor: offset, tipo: Int },
      limite: { valor: limite, tipo: Int },
    },
  );

  const totalRes = await ejecutarQuery<{ total: number }>(
    `SELECT COUNT(*) as total FROM p_Usuarios`,
  );
  const total = totalRes[0].total;

  return {
    datos,
    total,
    pagina,
    porPagina: limite,
    totalPaginas: Math.ceil(total / limite),
  };
}

export async function cambiarRolUsuario(
  idUsuario: number,
  rolGlobal: string,
  idRol?: number,
) {
  await ejecutarQuery(
    `
        UPDATE p_Usuarios 
        SET rolGlobal = @rolGlobal, idRol = @idRol, fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario
    `,
    {
      idUsuario: { valor: idUsuario, tipo: Int },
      rolGlobal: { valor: rolGlobal, tipo: NVarChar },
      idRol: { valor: idRol || null, tipo: Int },
    },
  );
}

export async function obtenerEstadisticasAdmin() {
  const stats = await ejecutarQuery<{
    total: number;
    activos: number;
    inactivos: number;
  }>(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
            SUM(CASE WHEN activo = 0 THEN 1 ELSE 0 END) as inactivos
        FROM p_Usuarios
    `);
  return stats[0] || { total: 0, activos: 0, inactivos: 0 };
}

// Roles
export async function listarRoles() {
  return await ejecutarQuery<RolDb>(
    `SELECT * FROM p_Roles ORDER BY nombre ASC`,
  );
}

export async function crearRol(rol: Partial<RolDb>) {
  await ejecutarQuery(
    `
        INSERT INTO p_Roles (nombre, descripcion, reglas, esSistema, defaultMenu)
        VALUES (@nombre, @descripcion, @reglas, @esSistema, @defaultMenu)
    `,
    {
      nombre: { valor: rol.nombre, tipo: NVarChar },
      descripcion: { valor: rol.descripcion, tipo: NVarChar },
      reglas: { valor: rol.reglas || '[]', tipo: NVarChar },
      esSistema: { valor: rol.esSistema || false, tipo: Bit },
      defaultMenu: { valor: rol.defaultMenu, tipo: NVarChar },
    },
  );
}

export async function actualizarRol(idRol: number, rol: Partial<RolDb>) {
  await ejecutarQuery(
    `
        UPDATE p_Roles 
        SET nombre = @nombre, descripcion = @descripcion, reglas = @reglas
        WHERE idRol = @idRol
    `,
    {
      idRol: { valor: idRol, tipo: Int },
      nombre: { valor: rol.nombre, tipo: NVarChar },
      descripcion: { valor: rol.descripcion, tipo: NVarChar },
      reglas: { valor: rol.reglas, tipo: NVarChar },
    },
  );
}

export async function eliminarRol(idRol: number) {
  // 1. Validar si hay usuarios asignados
  const check = await ejecutarQuery<{ total: number }>(
    `
        SELECT COUNT(*) as total FROM p_Usuarios WHERE idRol = @idRol AND activo = 1
    `,
    { idRol: { valor: idRol, tipo: Int } },
  );

  if (check[0].total > 0) {
    throw new Error(
      `No se puede eliminar el rol: Hay ${check[0].total} usuarios activos asignados a él.`,
    );
  }

  // 2. Si está libre, proceder (Fisico o Soft, aqui Fisico está bien si está limpio)
  await ejecutarQuery(`DELETE FROM p_Roles WHERE idRol = @idRol`, {
    idRol: { valor: idRol, tipo: Int },
  });
}

// Logs
export async function crearLog(log: Partial<LogSistemaDb>) {
  await ejecutarQuery(
    `
        INSERT INTO p_Logs (idUsuario, accion, entidad, datos, fecha)
        VALUES (@idUsuario, @accion, @entidad, @datos, GETDATE())
    `,
    {
      idUsuario: { valor: log.idUsuario, tipo: Int },
      accion: { valor: log.accion, tipo: NVarChar },
      entidad: { valor: log.entidad, tipo: NVarChar },
      datos: { valor: log.datos, tipo: NVarChar },
    },
  );
}

export async function listarLogs(pagina: number = 1, limite: number = 50) {
  const offset = (pagina - 1) * limite;
  const datos = await ejecutarQuery<LogSistemaDb>(
    `
        SELECT * FROM p_Logs ORDER BY fecha DESC
        OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `,
    {
      offset: { valor: offset, tipo: Int },
      limite: { valor: limite, tipo: Int },
    },
  );

  // Total aproximado (logs pueden ser muchos, mejor TOP 1000 si es lento)
  const totalRes = await ejecutarQuery<{ total: number }>(
    'SELECT COUNT(*) as total FROM p_Logs',
  );
  return { datos, total: totalRes[0].total, pagina, porPagina: limite };
}

// Organigrama
export async function crearNodoOrganigrama(nodo: Partial<OrganizacionNodoDb>) {
  return await ejecutarQuery(
    `
        INSERT INTO p_OrganizacionNodos (nombre, tipo, idPadre, orden, activo)
        OUTPUT INSERTED.id
        VALUES (@nombre, @tipo, @idPadre, 0, 1)
    `,
    {
      nombre: { valor: nodo.nombre, tipo: NVarChar },
      tipo: { valor: nodo.tipo, tipo: NVarChar },
      idPadre: { valor: nodo.idPadre, tipo: Int },
    },
  );
}

export async function obtenerOrganigrama() {
  return await ejecutarQuery<OrganizacionNodoDb>(
    `SELECT * FROM p_OrganizacionNodos WHERE activo = 1`,
  );
}

export async function asignarUsuarioNodo(
  idUsuario: number,
  idNodo: number,
  rol: string,
) {
  await ejecutarQuery(
    `
        INSERT INTO p_UsuariosOrganizacion (idUsuario, idNodo, rol, esResponsable)
        VALUES (@idUsuario, @idNodo, @rol, @esResponsable)
    `,
    {
      idUsuario: { valor: idUsuario, tipo: Int },
      idNodo: { valor: idNodo, tipo: Int },
      rol: { valor: rol, tipo: NVarChar },
    },
  );
}

export async function listarAuditLogs(filtro: {
  page?: number;
  limit?: number;
  idUsuario?: number;
  accion?: string;
  query?: string;
}) {
  const pagina = filtro.page || 1;
  const limite = filtro.limit || 50;
  const offset = (pagina - 1) * limite;

  let whereClause = '1=1';
  const params: any = {
    offset: { valor: offset, tipo: Int },
    limite: { valor: limite, tipo: Int },
  };

  if (filtro.idUsuario) {
    whereClause += ' AND idUsuario = @idUsuario';
    params.idUsuario = { valor: filtro.idUsuario, tipo: Int };
  }
  if (filtro.accion) {
    whereClause += ' AND accion = @accion';
    params.accion = { valor: filtro.accion, tipo: NVarChar };
  }
  if (filtro.query) {
    whereClause +=
      ' AND (datos LIKE @query OR accion LIKE @query OR entidad LIKE @query)';
    params.query = { valor: `%${filtro.query}%`, tipo: NVarChar };
  }

  const countQuery = `SELECT COUNT(*) as total FROM p_Logs WHERE ${whereClause}`;
  const dataQuery = `
        SELECT l.*, u.nombre as nombreUsuario 
        FROM p_Logs l
        LEFT JOIN p_Usuarios u ON l.idUsuario = u.idUsuario
        WHERE ${whereClause}
        ORDER BY l.fecha DESC
        OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
    `;

  const totalRes = await ejecutarQuery<{ total: number }>(countQuery, params);
  const datos = await ejecutarQuery<any>(dataQuery, params);

  return {
    items: datos.map((d: any) => ({
      idAuditLog: d.idLog,
      accion: d.accion,
      entidad: d.entidad,
      idEntidad: 0,
      datosAnteriores: null,
      datosNuevos: d.datos,
      idUsuario: d.idUsuario,
      nombreUsuario: d.nombreUsuario,
      fecha: d.fecha,
    })),
    total: totalRes[0].total,
    page: pagina,
    totalPages: Math.ceil(totalRes[0].total / limite),
  };
}

// ==========================================
// PAPELERA DE RECICLAJE
// ==========================================

export async function getDeletedItems() {
  // FIX: p_Proyectos may not have 'activo' column. Use estado-only check + defensive query.
  let proyectos: any[] = [];
  try {
    proyectos = await ejecutarQuery<any>(`
            SELECT p.idProyecto as id, 'Proyecto' as tipo, p.nombre, 
                   ISNULL(p.fechaCreacion, GETDATE()) as fechaEliminacion, NULL as proyecto,
                   u.nombre as eliminadoPor
            FROM p_Proyectos p
            LEFT JOIN p_Usuarios u ON p.idCreador = u.idUsuario
            WHERE p.estado IN ('Cancelado', 'Eliminado')
        `);
  } catch (e) {
    console.warn('[RecycleBin] Error loading projects:', e?.message);
  }

  let tareas: any[] = [];
  try {
    tareas = await ejecutarQuery<any>(`
            SELECT t.idTarea as id, 'Tarea' as tipo, t.nombre, 
                   ISNULL(t.fechaCreacion, GETDATE()) as fechaEliminacion, p.nombre as proyecto,
                   u.nombre as eliminadoPor
            FROM p_Tareas t
            LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
            LEFT JOIN p_Usuarios u ON t.idCreador = u.idUsuario
            WHERE t.activo = 0 OR t.estado IN ('Eliminada', 'Descartada')
        `);
  } catch (e) {
    console.warn('[RecycleBin] Error loading tasks:', e?.message);
  }

  return [...proyectos, ...tareas].sort(
    (a, b) =>
      new Date(b.fechaEliminacion || 0).getTime() -
      new Date(a.fechaEliminacion || 0).getTime(),
  );
}

export async function restoreItem(tipo: 'Proyecto' | 'Tarea', id: number) {
  if (tipo === 'Proyecto') {
    await ejecutarQuery(
      `
            UPDATE p_Proyectos 
            SET estado = 'Activo', activo = 1 
            WHERE idProyecto = @id
        `,
      { id: { valor: id, tipo: Int } },
    );
  } else {
    await ejecutarQuery(
      `
            UPDATE p_Tareas 
            SET estado = 'Pendiente', activo = 1, fechaActualizacion = GETDATE()
            WHERE idTarea = @id
        `,
      { id: { valor: id, tipo: Int } },
    );
  }
}

export async function crearUsuario(dto: any) {
  const result = await ejecutarSP('sp_Admin_Usuario_Crear', {
    nombre: { valor: dto.nombre, tipo: NVarChar },
    correo: { valor: dto.correo, tipo: NVarChar },
    carnet: { valor: dto.carnet || null, tipo: NVarChar },
    cargo: { valor: dto.cargo || null, tipo: NVarChar },
    telefono: { valor: dto.telefono || null, tipo: NVarChar },
    rol: { valor: dto.rol || 'Colaborador', tipo: NVarChar },
  });
  return result[0];
}

export async function actualizarUsuario(idUsuario: number, dto: any) {
  const fields: string[] = [];
  const params: any = { id: { valor: idUsuario, tipo: Int } };

  if (dto.nombre !== undefined) {
    fields.push('nombre = @nombre');
    params.nombre = { valor: dto.nombre, tipo: NVarChar };
  }
  if (dto.correo !== undefined) {
    fields.push('correo = @correo');
    params.correo = { valor: dto.correo, tipo: NVarChar };
  }
  if (dto.carnet !== undefined) {
    fields.push('carnet = @carnet');
    params.carnet = { valor: dto.carnet, tipo: NVarChar };
  }
  if (dto.cargo !== undefined) {
    fields.push('cargo = @cargo');
    params.cargo = { valor: dto.cargo, tipo: NVarChar };
  }
  if (dto.telefono !== undefined) {
    fields.push('telefono = @telefono');
    params.telefono = { valor: dto.telefono, tipo: NVarChar };
  }
  if (dto.activo !== undefined) {
    fields.push('activo = @activo');
    params.activo = { valor: dto.activo ? 1 : 0, tipo: Bit };
  }

  if (fields.length === 0) return;

  await ejecutarQuery(
    `
        UPDATE p_Usuarios 
        SET ${fields.join(', ')}, fechaActualizacion = GETDATE()
        WHERE idUsuario = @id
    `,
    params,
  );
}

export async function eliminarUsuario(idUsuario: number) {
  await ejecutarSP('sp_Admin_Usuario_Eliminar', {
    idUsuario: { valor: idUsuario, tipo: Int },
  });
}

export async function removerUsuarioNodo(idUsuario: number, idNodo: number) {
  await ejecutarSP('sp_Admin_Usuario_RemoverNodo', {
    idUsuario: { valor: idUsuario, tipo: Int },
    idNodo: { valor: idNodo, tipo: Int },
  });
}

export async function obtenerUsuariosInactivos(fecha?: string) {
  return await ejecutarSP('sp_Admin_ReporteInactividad', {
    Fecha: { valor: fecha || null, tipo: SqlDate },
  });
}
