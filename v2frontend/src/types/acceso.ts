/**
 * Tipos TypeScript para el Módulo de Acceso (UNIFIED)
 * Reemplaza estructuras legacy por Usuario
 */

// ============================================
// EMPLEADO -> USANDO USUARIO 
// ============================================

/**
 * Empleado ahora es un alias de Usuario con campos específicos RRHH
 * (Mantenemos la interfaz para compatibilidad, pero mapeada a Usuario backend)
 */
export interface Empleado {
    // Identificación
    idUsuario?: number;
    carnet: string;
    nombreCompleto: string | null;
    correo: string | null;
    telefono: string | null;

    // Ubicación organizacional (nuevos campos)
    idOrg: string | null;
    cargo: string | null;
    departamento: string | null; // Unified Department

    // Legacy support (optional mapping)
    area?: string | null;
    gerencia?: string | null; // e.g orgGerencia
    orgDepartamento?: string | null;
    orgGerencia?: string | null;

    // Pais
    pais: string | null;

    // Jefatura (Unified)
    jefeCarnet: string | null; // carnetJefe1
    jefeNombre: string | null;
    jefeCorreo: string | null;

    // Fechas y estado
    fechaIngreso: string | null; // Date object in backend
    activo: boolean;

    // Auditoría & Legacy (Optional)
    createdAt?: string;
    updatedAt?: string;
}

// ... Resto de DTOs como PermisoArea, Delegacion se mantienen igual ...
// Solo actualizamos la definición base de Empleado para que coincida con lo que devuelve el API

// ============================================
// PERMISOS
// ============================================

export type TipoPermisoArea = 'SUBARBOL' | 'SOLO_NODO';

export interface PermisoArea {
    id: number;
    carnetRecibe: string;
    idOrgRaiz: string;
    tipoPermiso: TipoPermisoArea;
    otorgadoPor: string;
    motivo: string | null;
    activo: boolean;
    createdAt: string;
    nombreRecibe?: string;
    descripcionNodo?: string;
}

export interface CrearPermisoAreaDto {
    carnetRecibe: string;
    idOrgRaiz: string;
    tipoPermiso?: TipoPermisoArea;
    motivo?: string;
}

export interface PermisoEmpleado {
    id: number;
    carnetRecibe: string;
    carnetObjetivo: string;
    otorgadoPor: string;
    motivo: string | null;
    activo: boolean;
    createdAt: string;
    nombreRecibe?: string;
    nombreObjetivo?: string;
}

export interface CrearPermisoEmpleadoDto {
    carnetRecibe: string;
    carnetObjetivo: string;
    motivo?: string;
}

// ============================================
// DELEGACIONES
// ============================================

export interface DelegacionVisibilidad {
    id: number;
    carnetDelegante: string;
    carnetDelegado: string;
    fechaInicio: string | null;
    fechaFin: string | null;
    motivo: string | null;
    activo: boolean;
    createdAt: string;
    nombreDelegante?: string;
    nombreDelegado?: string;
}

export interface CrearDelegacionDto {
    carnetDelegante: string;
    carnetDelegado: string;
    fechaInicio?: string;
    fechaFin?: string;
    motivo?: string;
}

// ============================================
// VISIBILIDAD
// ============================================

export interface VisibilidadResult {
    total: number;
    visibles: string[];
}

export interface VerificacionAcceso {
    puedeVer: boolean;
    razon?: string;
}

export interface ActoresEfectivos {
    carnets: string[];
    total: number;
}

// ============================================
// RESPONSES WRAPPER
// ============================================

export interface AccesoApiResponse<T> {
    success: boolean;
    data: T;
    statusCode: number;
    timestamp: string;
    path: string;
}
