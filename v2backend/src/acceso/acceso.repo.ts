// src/acceso/acceso.repo.ts
// Repo 100% Stored Procedures (cero SQL inline)
// Requiere: base.repo.ts exporte ejecutarSP, Int, BigInt, NVarChar
// Nota: los SP listados abajo deben existir en SQL Server (te dejo el script en el siguiente paso si lo pides).

import { ejecutarSP, Int, BigInt, NVarChar } from '../db/base.repo';

export interface UsuarioDb {
  idUsuario: number;
  carnet: string;
  nombre: string;
  nombreCompleto: string;
  correo: string;
  cargo: string;
  departamento: string;
  orgDepartamento: string;
  orgGerencia: string;
  idOrg: number;
  jefeCarnet: string;
  jefeNombre: string;
  jefeCorreo: string;
  activo: boolean;
  gerencia: string;
  subgerencia: string;
  idRol: number;
  rolGlobal: string;
}

export interface OrganizacionNodoRhDb {
  idorg: number;
  nombre: string;
  tipo: string;
  padre: number | null;
  orden: number;
  activo: boolean;
  // Compat / legacy
  descripcion?: string;
  nivel?: number;
}

export interface PermisoAreaDb {
  id: number;
  carnet_otorga: string | null;
  carnet_recibe: string;
  idorg_raiz: number;
  alcance: string;
  activo: boolean;
  motivo: string | null;
  creado_en: Date;
  fecha_fin: Date;
  tipo_acceso: string;
}

export interface PermisoEmpleadoDb {
  id: number;
  carnet_otorga: string | null;
  carnet_recibe: string;
  carnet_objetivo: string;
  tipo_acceso: string;
  motivo: string | null;
  activo: boolean;
  creado_en: Date;
}

export interface DelegacionVisibilidadDb {
  id: number;
  carnet_delegante: string;
  carnet_delegado: string;
  motivo: string | null;
  activo: boolean;
  creado_en: Date;
  fecha_inicio: Date;
  fecha_fin: Date;
}

// ==========================================
// HELPERS
// ==========================================
function cleanStr(x: any): string {
  return String(x || '').trim();
}

function cleanLower(x: any): string {
  return cleanStr(x).toLowerCase();
}

function uniqueCarnets(carnets: string[]): string[] {
  return [...new Set((carnets || []).map(cleanStr).filter(Boolean))];
}

// ==========================================
// VISIBILIDAD
// ==========================================
export async function calcularCarnetsVisibles(
  carnetSolicitante: string,
): Promise<string[]> {
  const cleanCarnet = cleanStr(carnetSolicitante);
  if (!cleanCarnet) return [];

  const rows = await ejecutarSP<{ carnet: string }>(
    'sp_Visibilidad_ObtenerCarnets',
    {
      carnetSolicitante: { valor: cleanCarnet, tipo: NVarChar },
    },
  );

  return rows.map((r) => cleanStr(r.carnet)).filter(Boolean);
}

/**
 * Devuelve usuarios con rolNombre opcional.
 * Implementación: SP recibe CSV (CarnetsCsv) y hace split seguro (STRING_SPLIT / OPENJSON / TVP).
 */
export async function obtenerDetallesUsuarios(carnets: string[]) {
  const clean = uniqueCarnets(carnets);
  if (clean.length === 0) return [];

  const csv = clean.join(',');

  const rows = await ejecutarSP<UsuarioDb & { rolNombre?: string }>(
    'sp_Usuarios_ObtenerDetallesPorCarnets',
    {
      CarnetsCsv: { valor: csv, tipo: NVarChar },
    },
  );

  // Compat: agrega rol como objeto si idRol existe
  return rows.map((u) => {
    const user: any = { ...u };
    if ((u as any).idRol) {
      user.rol = {
        idRol: (u as any).idRol,
        nombre: (u as any).rolNombre || 'Empleado',
      };
    }
    return user;
  });
}

export async function obtenerCarnetDeUsuario(
  idUsuario: number,
): Promise<string | null> {
  const rows = await ejecutarSP<{ carnet: string }>(
    'sp_Usuarios_ObtenerCarnetPorId',
    {
      idUsuario: { valor: idUsuario, tipo: Int },
    },
  );
  return rows[0]?.carnet || null;
}

// ==========================================
// DELEGACIONES
// ==========================================
export async function obtenerDelegacionesActivas(carnetDelegado: string) {
  const clean = cleanStr(carnetDelegado);
  if (!clean) return [];

  return await ejecutarSP<DelegacionVisibilidadDb>(
    'sp_DelegacionVisibilidad_ObtenerActivas',
    {
      carnetDelegado: { valor: clean, tipo: NVarChar },
    },
  );
}

export async function crearDelegacion(
  delegacion: Partial<DelegacionVisibilidadDb>,
) {
  await ejecutarSP('sp_DelegacionVisibilidad_Crear', {
    delegante: { valor: cleanStr(delegacion.carnet_delegante), tipo: NVarChar },
    delegado: { valor: cleanStr(delegacion.carnet_delegado), tipo: NVarChar },
    motivo: {
      valor: delegacion.motivo ? cleanStr(delegacion.motivo) : null,
      tipo: NVarChar,
    },
    fecha_inicio: {
      valor: (delegacion as any).fecha_inicio || null,
      tipo: NVarChar,
    },
    fecha_fin: { valor: (delegacion as any).fecha_fin || null, tipo: NVarChar },
  });
}

export async function desactivarDelegacion(id: number) {
  await ejecutarSP('sp_DelegacionVisibilidad_Desactivar', {
    id: { valor: id, tipo: BigInt },
  });
}

export async function listarTodasDelegaciones() {
  return await ejecutarSP<DelegacionVisibilidadDb>(
    'sp_DelegacionVisibilidad_ListarActivas',
  );
}

export async function listarDelegacionesPorDelegante(carnetDelegante: string) {
  return await ejecutarSP<DelegacionVisibilidadDb>(
    'sp_DelegacionVisibilidad_ListarPorDelegante',
    {
      carnetDelegante: { valor: cleanStr(carnetDelegante), tipo: NVarChar },
    },
  );
}

// ==========================================
// PERMISOS ÁREA
// ==========================================
export async function obtenerPermisosAreaActivos(carnetRecibe: string) {
  const clean = cleanStr(carnetRecibe);
  if (!clean) return [];

  return await ejecutarSP<PermisoAreaDb>(
    'sp_PermisoArea_ObtenerActivosPorRecibe',
    {
      carnetRecibe: { valor: clean, tipo: NVarChar },
    },
  );
}

export async function crearPermisoArea(permiso: Partial<PermisoAreaDb>) {
  await ejecutarSP('sp_PermisoArea_Crear', {
    otorga: {
      valor: permiso.carnet_otorga ? cleanStr(permiso.carnet_otorga) : null,
      tipo: NVarChar,
    },
    recibe: { valor: cleanStr(permiso.carnet_recibe), tipo: NVarChar },
    idorg: { valor: permiso.idorg_raiz || 0, tipo: BigInt },
    alcance: { valor: cleanStr(permiso.alcance || 'SUBARBOL'), tipo: NVarChar },
    motivo: {
      valor: permiso.motivo ? cleanStr(permiso.motivo) : null,
      tipo: NVarChar,
    },
    fecha_fin: { valor: (permiso as any).fecha_fin || null, tipo: NVarChar },
    tipo_acceso: {
      valor: cleanStr(permiso.tipo_acceso || 'ALLOW'),
      tipo: NVarChar,
    },
    nombre_area: {
      valor: (permiso as any).nombre_area
        ? cleanStr((permiso as any).nombre_area)
        : null,
      tipo: NVarChar,
    },
    tipo_nivel: {
      valor: (permiso as any).tipo_nivel
        ? cleanStr((permiso as any).tipo_nivel)
        : 'GERENCIA',
      tipo: NVarChar,
    },
  });
}

export async function desactivarPermisoArea(id: number) {
  await ejecutarSP('sp_PermisoArea_Desactivar', {
    id: { valor: id, tipo: BigInt },
  });
}

export async function listarTodosPermisosArea() {
  return await ejecutarSP<PermisoAreaDb>('sp_PermisoArea_ListarActivos');
}

// ==========================================
// PERMISOS EMPLEADO
// ==========================================
export async function obtenerPermisosEmpleadoActivos(carnetRecibe: string) {
  const clean = cleanStr(carnetRecibe);
  if (!clean) return [];

  return await ejecutarSP<PermisoEmpleadoDb>(
    'sp_PermisoEmpleado_ObtenerActivosPorRecibe',
    {
      carnetRecibe: { valor: clean, tipo: NVarChar },
    },
  );
}

export async function crearPermisoEmpleado(p: Partial<PermisoEmpleadoDb>) {
  await ejecutarSP('sp_PermisoEmpleado_Crear', {
    otorga: {
      valor: p.carnet_otorga ? cleanStr(p.carnet_otorga) : null,
      tipo: NVarChar,
    },
    recibe: { valor: cleanStr(p.carnet_recibe), tipo: NVarChar },
    objetivo: { valor: cleanStr(p.carnet_objetivo), tipo: NVarChar },
    tipo: { valor: cleanStr(p.tipo_acceso || 'ALLOW'), tipo: NVarChar },
    motivo: { valor: p.motivo ? cleanStr(p.motivo) : null, tipo: NVarChar },
  });
}

export async function desactivarPermisoEmpleado(id: number) {
  await ejecutarSP('sp_PermisoEmpleado_Desactivar', {
    id: { valor: id, tipo: BigInt },
  });
}

export async function listarTodosPermisosEmpleado() {
  return await ejecutarSP<PermisoEmpleadoDb>(
    'sp_PermisoEmpleado_ListarActivos',
  );
}

// ==========================================
// ORGANIGRAMA (RH)
// ==========================================
export async function obtenerArbolOrganizacion() {
  return await ejecutarSP<OrganizacionNodoRhDb>('sp_Organizacion_ObtenerArbol');
}

export async function buscarNodoPorId(idorg: number) {
  const rows = await ejecutarSP<OrganizacionNodoRhDb>(
    'sp_Organizacion_BuscarNodoPorId',
    {
      idorg: { valor: idorg, tipo: BigInt },
    },
  );
  return rows[0] || null;
}

export async function buscarNodosOrganizacion(termino: string) {
  return await ejecutarSP<OrganizacionNodoRhDb>('sp_Organizacion_BuscarNodos', {
    termino: { valor: cleanStr(termino), tipo: NVarChar },
  });
}

export async function contarEmpleadosPorNodo() {
  return await ejecutarSP<{ idOrg: string; count: number }>(
    'sp_Organizacion_ContarEmpleadosPorNodo',
  );
}

export async function previewEmpleadosSubarbol(idOrgRaiz: string, limite = 50) {
  return await ejecutarSP<UsuarioDb>(
    'sp_Organizacion_SubarbolPreviewEmpleados',
    {
      idOrgRaiz: { valor: cleanStr(idOrgRaiz), tipo: NVarChar },
      limite: { valor: limite, tipo: Int },
    },
  );
}

export async function contarEmpleadosSubarbol(idOrgRaiz: string) {
  const rows = await ejecutarSP<{ total: number }>(
    'sp_Organizacion_SubarbolContarEmpleados',
    {
      idOrgRaiz: { valor: cleanStr(idOrgRaiz), tipo: NVarChar },
    },
  );
  return rows[0]?.total || 0;
}

export async function obtenerEmpleadosNodoDirecto(
  idOrg: string | number,
  limite = 50,
) {
  const id = typeof idOrg === 'string' ? parseInt(idOrg, 10) : idOrg;

  return await ejecutarSP<UsuarioDb>(
    'sp_Organizacion_ObtenerEmpleadosNodoDirecto',
    {
      idOrg: { valor: id, tipo: Int },
      limite: { valor: limite, tipo: Int },
    },
  );
}

export async function contarEmpleadosNodoDirecto(idOrg: string | number) {
  const id = typeof idOrg === 'string' ? parseInt(idOrg, 10) : idOrg;

  const rows = await ejecutarSP<{ total: number }>(
    'sp_Organizacion_ContarEmpleadosNodoDirecto',
    {
      idOrg: { valor: id, tipo: Int },
    },
  );

  return rows[0]?.total || 0;
}

// ==========================================
// USUARIOS (Helpers)
// ==========================================
export async function buscarUsuarioPorCarnet(carnet: string) {
  const rows = await ejecutarSP<UsuarioDb>('sp_Usuarios_BuscarPorCarnet', {
    carnet: { valor: cleanStr(carnet), tipo: NVarChar },
  });
  return rows[0] || null;
}

export async function buscarUsuarioPorCorreo(correo: string) {
  const rows = await ejecutarSP<UsuarioDb>('sp_Usuarios_BuscarPorCorreo', {
    correo: { valor: cleanLower(correo), tipo: NVarChar },
  });
  return rows[0] || null;
}

export async function listarEmpleadosActivos() {
  return await ejecutarSP<UsuarioDb>('sp_Usuarios_ListarActivos');
}

export async function buscarUsuarios(termino: string, limite = 10) {
  return await ejecutarSP<UsuarioDb>('sp_Usuarios_Buscar', {
    termino: { valor: cleanStr(termino), tipo: NVarChar },
    limite: { valor: limite, tipo: Int },
  });
}

// NUEVO: Obtener Mi Equipo (Jerarquía + Permisos)
export async function obtenerMiEquipoPorCarnet(carnet: string) {
  return await ejecutarSP<UsuarioDb & { nivel: number; fuente: string }>(
    'sp_Visibilidad_ObtenerMiEquipo',
    {
      carnet: { valor: cleanStr(carnet), tipo: NVarChar },
    },
  );
}

export async function obtenerEquipoDirecto(carnet: string) {
  const result = await ejecutarSP<UsuarioDb>(
    'sp_Visibilidad_ObtenerMiEquipo',
    {
      carnet: { valor: cleanStr(carnet), tipo: NVarChar },
    },
  );

  // Filtrar solo los que tienen nivel 1 (subordinados directos)
  return result.filter(u => (u as any).nivel === 1);
}
