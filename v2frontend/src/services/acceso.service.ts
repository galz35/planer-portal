/**
 * Servicio para el Módulo de Acceso
 * API endpoints para empleados (Usuarios), permisos, delegaciones y visibilidad
 */
import { api } from './api';
import type {
    Empleado,
    PermisoArea,
    CrearPermisoAreaDto,
    PermisoEmpleado,
    CrearPermisoEmpleadoDto,
    DelegacionVisibilidad,
    CrearDelegacionDto,
    VisibilidadResult,
    VerificacionAcceso,
    ActoresEfectivos,
} from '../types/acceso';
import type { ApiResponse } from '../types/api';

// Imports Types removed: ImportarEmpleadosDto, ResultadoImportacion, EstadisticasAcceso, PlantillaImportacion, PreviewExcel, ModoImportacion, OrganizacionNodoRh

export const accesoService = {
    // =========================================
    // EMPLEADOS (Usuarios)
    // =========================================

    /**
     * Listar empleados con filtros opcionales
     */
    getEmpleados: async (filtros?: { activo?: boolean; departamento?: string }) => {
        const params = new URLSearchParams();
        if (filtros?.activo !== undefined) params.append('activo', String(filtros.activo));
        if (filtros?.departamento) params.append('departamento', filtros.departamento);

        return api.get<ApiResponse<{ total: number; empleados: Empleado[] }>>(
            `/acceso/empleados${params.toString() ? '?' + params.toString() : ''}`
        );
    },

    /**
     * Obtener un empleado por carnet
     */
    getEmpleado: async (carnet: string) => {
        return api.get<ApiResponse<Empleado>>(`/acceso/empleado/${encodeURIComponent(carnet)}`);
    },

    /**
     * Buscar empleados por término (carnet o nombre)
     */
    buscarEmpleados: async (q: string, limit: number = 10) => {
        return api.get<ApiResponse<Empleado[]>>(`/acceso/empleados/buscar?q=${encodeURIComponent(q)}&limit=${limit}`);
    },

    /**
     * Obtener empleado por correo (para carnet lookup después de login)
     */
    getEmpleadoPorCorreo: async (correo: string) => {
        return api.get<ApiResponse<{ encontrado: boolean; empleado?: { carnet: string; nombreCompleto?: string; departamento?: string; cargo?: string } }>>(`/acceso/empleado/email/${encodeURIComponent(correo)}`);
    },

    // =========================================
    // PERMISOS POR ÁREA
    // =========================================

    /**
     * Listar todos los permisos por área activos
     */
    getPermisosArea: async () => {
        return api.get<ApiResponse<PermisoArea[]>>('/acceso/permiso-area');
    },

    /**
     * Listar permisos por área de un receptor específico
     */
    getPermisosAreaPorReceptor: async (carnet: string) => {
        return api.get<ApiResponse<PermisoArea[]>>(`/acceso/permiso-area/${encodeURIComponent(carnet)}`);
    },

    /**
     * Crear permiso por área
     */
    createPermisoArea: async (dto: CrearPermisoAreaDto) => {
        return api.post<ApiResponse<PermisoArea>>('/acceso/permiso-area', dto);
    },

    /**
     * Desactivar permiso por área
     */
    deletePermisoArea: async (id: number) => {
        return api.delete<ApiResponse<{ success: boolean }>>(`/acceso/permiso-area/${id}`);
    },

    // =========================================
    // PERMISOS POR EMPLEADO
    // =========================================

    /**
     * Listar todos los permisos por empleado activos
     */
    getPermisosEmpleado: async () => {
        return api.get<ApiResponse<PermisoEmpleado[]>>('/acceso/permiso-empleado');
    },

    /**
     * Listar permisos por empleado de un receptor específico
     */
    getPermisosEmpleadoPorReceptor: async (carnet: string) => {
        return api.get<ApiResponse<PermisoEmpleado[]>>(`/acceso/permiso-empleado/${encodeURIComponent(carnet)}`);
    },

    /**
     * Crear permiso por empleado
     */
    createPermisoEmpleado: async (dto: CrearPermisoEmpleadoDto) => {
        return api.post<ApiResponse<PermisoEmpleado>>('/acceso/permiso-empleado', dto);
    },

    /**
     * Desactivar permiso por empleado
     */
    deletePermisoEmpleado: async (id: number) => {
        return api.delete<ApiResponse<{ success: boolean }>>(`/acceso/permiso-empleado/${id}`);
    },

    // =========================================
    // DELEGACIONES
    // =========================================

    /**
     * Listar todas las delegaciones activas
     */
    getDelegaciones: async () => {
        return api.get<ApiResponse<DelegacionVisibilidad[]>>('/acceso/delegacion');
    },

    /**
     * Listar delegaciones donde soy el delegado
     */
    getDelegacionesPorDelegado: async (carnet: string) => {
        return api.get<ApiResponse<DelegacionVisibilidad[]>>(`/acceso/delegacion/delegado/${encodeURIComponent(carnet)}`);
    },

    /**
     * Listar delegaciones donde soy el delegante
     */
    getDelegacionesPorDelegante: async (carnet: string) => {
        return api.get<ApiResponse<DelegacionVisibilidad[]>>(`/acceso/delegacion/delegante/${encodeURIComponent(carnet)}`);
    },

    /**
     * Crear delegación de visibilidad
     */
    createDelegacion: async (dto: CrearDelegacionDto) => {
        return api.post<ApiResponse<DelegacionVisibilidad>>('/acceso/delegacion', dto);
    },

    /**
     * Desactivar delegación
     */
    deleteDelegacion: async (id: number) => {
        return api.delete<ApiResponse<{ success: boolean }>>(`/acceso/delegacion/${id}`);
    },

    // =========================================
    // VISIBILIDAD
    // =========================================

    /**
     * Obtener carnets visibles para un usuario
     */
    getVisibilidad: async (carnet: string) => {
        return api.get<ApiResponse<VisibilidadResult>>(`/visibilidad/${encodeURIComponent(carnet)}`);
    },

    /**
     * Obtener empleados visibles con datos completos
     */
    getVisibilidadEmpleados: async (carnet: string) => {
        return api.get<ApiResponse<{ total: number; empleados: Empleado[] }>>(
            `/visibilidad/${encodeURIComponent(carnet)}/empleados`
        );
    },

    /**
     * Verificar si un usuario puede ver a otro
     */
    verificarPuedeVer: async (carnet: string, objetivo: string) => {
        return api.get<ApiResponse<VerificacionAcceso>>(
            `/visibilidad/${encodeURIComponent(carnet)}/puede-ver/${encodeURIComponent(objetivo)}`
        );
    },

    /**
     * Obtener actores efectivos (incluye delegaciones)
     */
    getActores: async (carnet: string) => {
        return api.get<ApiResponse<ActoresEfectivos>>(`/visibilidad/${encodeURIComponent(carnet)}/actores`);
    },

    /**
     * Obtener quién tiene acceso a los datos de un empleado
     */
    getQuienPuedeVer: async (carnet: string) => {
        return api.get<ApiResponse<{ total: number; accesos: any[] }>>(`/visibilidad/${encodeURIComponent(carnet)}/quien-puede-verme`);
    },

    // =========================================
    // ORGANIZACIÓN
    // =========================================

    /**
     * Buscar nodos organizacionales
     */
    buscarOrganizacion: async (q: string) => {
        return api.get<ApiResponse<any[]>>(`/acceso/organizacion/buscar?q=${encodeURIComponent(q)}`);
    },

    /**
     * Obtener árbol jerárquico de nodos con conteo de empleados
     */
    getNodosTree: async () => {
        return api.get<ApiResponse<any[]>>('/acceso/organizacion/tree');
    },

    /**
     * Obtener información de un nodo específico
     */
    getNodo: async (idOrg: string) => {
        return api.get<ApiResponse<any>>(`/acceso/organizacion/nodo/${encodeURIComponent(idOrg)}`);
    },

    /**
     * Previsualizar empleados afectados por un permiso de área
     */
    previewEmpleadosPorNodo: async (idOrg: string, alcance: 'SUBARBOL' | 'SOLO_NODO' = 'SUBARBOL') => {
        return api.get<ApiResponse<{ idOrgRaiz: string; alcance: string; total: number; muestra: any[] }>>(
            `/acceso/organizacion/nodo/${encodeURIComponent(idOrg)}/preview?alcance=${alcance}`
        );
    },

    // Legacy or Removed methods (getSubarbol, imports) commented out to ensure clean build
};

export default accesoService;
