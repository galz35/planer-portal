/**
 * role-utils.ts — Fuente ÚNICA de verdad para verificación de roles
 *
 * REGLA: NUNCA comparar roles como strings sueltos en otros archivos.
 *        Siempre importar desde aquí.
 *
 * Creado: 2026-02-19 (Plan de Seguridad, Fase 2)
 */

const ADMIN_ROLES = new Set(['Admin', 'Administrador', 'SuperAdmin']);
const LEADER_ROLES = new Set([
  'Gerente',
  'Director',
  'Jefe',
  'Coordinador',
  'Lider',
]);

/**
 * Verifica si un rol es de tipo Administrador.
 * Centraliza la lógica que antes estaba dispersa en 8+ archivos.
 */
export function isAdminRole(rol: string | null | undefined): boolean {
  return ADMIN_ROLES.has(String(rol || '').trim());
}

/**
 * Verifica si un rol es de tipo Líder (Gerente, Director, Jefe, etc.)
 */
export function isLeaderRole(rol: string | null | undefined): boolean {
  return LEADER_ROLES.has(String(rol || '').trim());
}

/**
 * Verifica si un rol tiene algún tipo de privilegio elevado (Admin o Líder).
 */
export function isPrivilegedRole(rol: string | null | undefined): boolean {
  const r = String(rol || '').trim();
  return ADMIN_ROLES.has(r) || LEADER_ROLES.has(r);
}
