import { api } from './api';

export interface SolicitudCambio {
    idSolicitud: number;
    idTarea: number;
    tarea: any;
    idUsuarioSolicitante: number;
    usuarioSolicitante: any;
    campoAfectado: string;
    valorAnterior: string;
    valorNuevo: string;
    motivo: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    fechaSolicitud: string;
}

export const planningService = {
    /**
     * Verifica si una tarea puede ser editada directamente o requiere aprobación.
     */
    checkPermission: async (idTarea: number): Promise<{ puedeEditar: boolean, requiereAprobacion: boolean, tipoProyecto: string }> => {
        const response = await api.post('/planning/check-permission', { idTarea });
        return response.data.data;
    },

    /**
     * Crea una solicitud de cambio para una tarea estratégica.
     */
    requestChange: async (idTarea: number, campo: string, valorNuevo: string, motivo: string): Promise<SolicitudCambio> => {
        const response = await api.post('/planning/request-change', { idTarea, campo, valorNuevo, motivo });
        return response.data.data;
    },

    /**
     * Obtiene las solicitudes pendientes (para Jefes).
     */
    getPendingRequests: async (): Promise<SolicitudCambio[]> => {
        const response = await api.get('/planning/approvals');
        return response.data.data;
    },

    /**
     * Resuelve una solicitud (Aprobar/Rechazar).
     */
    resolveRequest: async (idSolicitud: number, accion: 'Aprobar' | 'Rechazar', comentario?: string): Promise<SolicitudCambio> => {
        const response = await api.post(`/planning/approvals/${idSolicitud}/resolve`, { accion, comentario });
        return response.data.data;
    },

    /**
     * Obtiene los proyectos visibles según jerarquía.
     */
    getMyProjects: async (): Promise<any[]> => {
        const response = await api.get('/planning/my-projects');
        return response.data.data;
    },

    // ==========================================
    // AVANCE MENSUAL (Tareas B - Solo Plan de Trabajo)
    // ==========================================

    registrarAvanceMensual: async (idTarea: number, dto: {
        anio: number;
        mes: number;
        porcentajeMes: number;
        comentario?: string;
    }) => {
        const response = await api.post(`/planning/tasks/${idTarea}/avance-mensual`, dto);
        return response.data.data;
    },

    obtenerHistorialMensual: async (idTarea: number) => {
        const response = await api.get(`/planning/tasks/${idTarea}/avance-mensual`);
        return response.data.data;
    },

    // ==========================================
    // GRUPOS / FASES (Tareas C - Solo Plan de Trabajo)
    // ==========================================

    crearGrupo: async (idTarea: number) => {
        const response = await api.post(`/planning/tasks/${idTarea}/crear-grupo`, {});
        return response.data.data;
    },

    agregarFase: async (idGrupo: number, idTareaNueva: number) => {
        const response = await api.post(`/planning/tasks/${idGrupo}/agregar-fase`, { idTareaNueva });
        return response.data.data;
    },

    obtenerGrupo: async (idGrupo: number) => {
        const response = await api.get(`/planning/grupos/${idGrupo}`);
        return response.data.data;
    }
};

