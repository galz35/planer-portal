/**
 * Colaboradores Repository — Queries para permisos granulares por proyecto
 * Usa Stored Procedures para todas las operaciones CRUD
 */
import {
  ejecutarSP,
  ejecutarQuery,
  Int,
  NVarChar,
  DateTime,
} from '../db/base.repo';

// ==========================================
// CRUD DE COLABORADORES
// ==========================================

export async function listarColaboradores(idProyecto: number) {
  return await ejecutarSP<any>('sp_ProyectoColaboradores_Listar', {
    idProyecto: { valor: idProyecto, tipo: Int },
  });
}

export async function invitarColaborador(dto: {
  idProyecto: number;
  idUsuario: number;
  rolColaboracion: string;
  invitadoPor: number;
  fechaExpiracion?: Date | null;
  notas?: string | null;
}) {
  const result = await ejecutarSP<any>('sp_ProyectoColaboradores_Invitar', {
    idProyecto: { valor: dto.idProyecto, tipo: Int },
    idUsuario: { valor: dto.idUsuario, tipo: Int },
    rolColaboracion: { valor: dto.rolColaboracion, tipo: NVarChar },
    invitadoPor: { valor: dto.invitadoPor, tipo: Int },
    fechaExpiracion: { valor: dto.fechaExpiracion || null, tipo: DateTime },
    notas: { valor: dto.notas || null, tipo: NVarChar },
  });
  return result[0] || null;
}

export async function actualizarColaborador(dto: {
  idProyecto: number;
  idUsuario: number;
  rolColaboracion?: string;
  permisosCustom?: string | null;
  fechaExpiracion?: Date | null;
}) {
  await ejecutarSP('sp_ProyectoColaboradores_Actualizar', {
    idProyecto: { valor: dto.idProyecto, tipo: Int },
    idUsuario: { valor: dto.idUsuario, tipo: Int },
    rolColaboracion: { valor: dto.rolColaboracion || null, tipo: NVarChar },
    permisosCustom: { valor: dto.permisosCustom ?? null, tipo: NVarChar },
    fechaExpiracion: { valor: dto.fechaExpiracion ?? null, tipo: DateTime },
  });
}

export async function revocarColaborador(
  idProyecto: number,
  idUsuario: number,
) {
  await ejecutarSP('sp_ProyectoColaboradores_Revocar', {
    idProyecto: { valor: idProyecto, tipo: Int },
    idUsuario: { valor: idUsuario, tipo: Int },
  });
}

// ==========================================
// VERIFICACIÓN DE PERMISOS
// ==========================================

export async function verificarPermiso(
  idProyecto: number,
  idUsuario: number,
  permisoRequerido: string,
): Promise<{ tienePermiso: boolean; rolColaboracion: string | null }> {
  const result = await ejecutarSP<{
    tienePermiso: number;
    rolColaboracion: string | null;
  }>('sp_ProyectoColaboradores_VerificarPermiso', {
    idProyecto: { valor: idProyecto, tipo: Int },
    idUsuario: { valor: idUsuario, tipo: Int },
    permisoRequerido: { valor: permisoRequerido, tipo: NVarChar },
  });
  const row = result[0];
  return {
    tienePermiso: row?.tienePermiso === 1,
    rolColaboracion: row?.rolColaboracion || null,
  };
}

/**
 * Verifica si un usuario es colaborador activo de un proyecto (sin verificar permiso específico)
 */
export async function esColaborador(
  idProyecto: number,
  idUsuario: number,
): Promise<boolean> {
  const result = await ejecutarQuery<{ activo: number }>(
    `
        SELECT 1 as activo FROM p_ProyectoColaboradores 
        WHERE idProyecto = @idProyecto AND idUsuario = @idUsuario AND activo = 1
        AND (fechaExpiracion IS NULL OR fechaExpiracion > GETDATE())
    `,
    {
      idProyecto: { valor: idProyecto, tipo: Int },
      idUsuario: { valor: idUsuario, tipo: Int },
    },
  );
  return result.length > 0;
}

// ==========================================
// ROLES DE COLABORACIÓN
// ==========================================

export async function listarRolesColaboracion() {
  return await ejecutarQuery<any>(`
        SELECT id, nombre, permisos, esSistema, orden
        FROM p_RolesColaboracion
        ORDER BY orden ASC
    `);
}

export async function obtenerPermisosPorRol(
  rolNombre: string,
): Promise<string[]> {
  const result = await ejecutarQuery<{ permisos: string }>(
    `
        SELECT permisos FROM p_RolesColaboracion WHERE nombre = @nombre
    `,
    { nombre: { valor: rolNombre, tipo: NVarChar } },
  );

  if (result.length === 0) return [];
  try {
    return JSON.parse(result[0].permisos);
  } catch {
    return [];
  }
}

// ==========================================
// MANTENIMIENTO
// ==========================================

export async function limpiarExpirados(): Promise<number> {
  const result = await ejecutarSP<{ colaboradoresDesactivados: number }>(
    'sp_ProyectoColaboradores_LimpiarExpirados',
    {},
  );
  return result[0]?.colaboradoresDesactivados ?? 0;
}
