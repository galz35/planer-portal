/**
 * API Client para Marcaje Web
 * Usa la instancia centralizada de Axios con interceptors JWT automáticos.
 */
import { api } from './api';

export interface MarkAttendanceDto {
    tipo_marcaje: 'ENTRADA' | 'SALIDA' | 'INICIO_EXTRA' | 'FIN_EXTRA' | 'INICIO_COMPENSADA' | 'FIN_COMPENSADA';
    tipo_device: 'MOBILE' | 'DESKTOP';
    lat?: number;
    lon?: number;
    accuracy?: number;
    offline_id?: string;
    timestamp?: string;
}

export interface RequestCorrectionDto {
    asistencia_id?: number;
    tipo_solicitud: 'CORRECCION_ASISTENCIA' | 'ELIMINAR_SALIDA';
    motivo: string;
}

export interface AttendanceRecord {
    id: number;
    tipo_marcaje: string;
    tipo_device: string;
    fecha: string;
    estado: string;
    motivo: string | null;
    lat: number | null;
    long: number | null;
    accuracy: number | null;
    ip: string | null;
    offline_id: string | null;
}

export interface AttendanceFlags {
    isClockedIn: boolean;
    isOvertimeActive: boolean;
    isCompensatedActive: boolean;
    staleShift: boolean;
    lastCheckIn: string | null;
    lastCheckOut: string | null;
    lastRecordTimestamp: string | null;
    lastRecordType: string | null;
}

export interface AttendanceSummary {
    dailyHistory: AttendanceRecord[];
    flags: AttendanceFlags;
}

export interface MarkResult {
    id: number;
    tipo_marcaje: string;
    tipo_device: string;
    fecha: string;
    estado: string;
    motivo: string | null;
    hasWarnings: boolean;
}

export const marcajeApi = {
    mark: async (data: MarkAttendanceDto): Promise<MarkResult> => {
        const { data: response } = await api.post('/marcaje/mark', data);
        return response.data;
    },

    getSummary: async (): Promise<AttendanceSummary> => {
        const { data: response } = await api.get('/marcaje/summary');
        return response.data;
    },

    undoLastCheckout: async (): Promise<{ ok: boolean; mensaje: string }> => {
        const { data: response } = await api.post('/marcaje/undo-last-checkout');
        return response.data;
    },

    requestCorrection: async (data: RequestCorrectionDto) => {
        const { data: response } = await api.post('/marcaje/request-correction', data);
        return response.data;
    },

    /** Enviar un punto GPS de tracking (recorrido en vivo) */
    sendGpsPoint: async (data: { lat: number; lon: number; accuracy: number; timestamp: string; fuente?: string }) => {
        const { data: response } = await api.post('/marcaje/gps-track', data);
        return response.data;
    },

    // --- Admin Endpoints ---
    getAdminSolicitudes: async () => {
        const { data: response } = await api.get('/marcaje/admin/solicitudes');
        return response.data;
    },

    getAdminSites: async () => {
        const { data: response } = await api.get('/marcaje/admin/sites');
        return response.data;
    },

    getAdminIps: async () => {
        const { data: response } = await api.get('/marcaje/admin/ips');
        return response.data;
    },

    getAdminDevices: async () => {
        const { data: response } = await api.get('/marcaje/admin/devices');
        return response.data;
    },

    getAdminConfig: async () => {
        const { data: response } = await api.get('/marcaje/admin/config');
        return response.data;
    },

    // --- Admin: Monitor & Dashboard ---
    getAdminMonitor: async (fecha?: string) => {
        const url = fecha ? `/marcaje/admin/monitor?fecha=${fecha}` : '/marcaje/admin/monitor';
        const { data: response } = await api.get(url);
        return response.data;
    },

    getAdminDashboard: async (fecha?: string) => {
        const url = fecha ? `/marcaje/admin/dashboard?fecha=${fecha}` : '/marcaje/admin/dashboard';
        const { data: response } = await api.get(url);
        return response.data;
    },

    // --- Admin: Resoluciones y Correcciones ---
    resolverSolicitud: async (id: number, accion: string, comentario?: string) => {
        const { data: response } = await api.put(`/marcaje/admin/solicitudes/${id}/resolver`, { accion, comentario });
        return response.data;
    },

    eliminarMarcaje: async (id: number, motivo?: string) => {
        const { data: response } = await api.delete(`/marcaje/admin/asistencia/${id}`, { data: { motivo } });
        return response.data;
    },

    reiniciarEstado: async (carnet: string, motivo: string) => {
        const { data: response } = await api.post(`/marcaje/admin/reiniciar/${carnet}`, { motivo });
        return response.data;
    },

    // --- Admin: Reportes ---
    getAdminReportes: async (fechaInicio: string, fechaFin: string, carnet?: string) => {
        let url = `/marcaje/admin/reportes?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        if (carnet) url += `&carnet=${carnet}`;
        const { data: response } = await api.get(url);
        return response.data;
    },

    // --- Admin: CRUD Sites ---
    crearSite: async (data: any) => {
        const { data: response } = await api.post('/marcaje/admin/sites', data);
        return response.data;
    },

    editarSite: async (id: number, data: any) => {
        const { data: response } = await api.put(`/marcaje/admin/sites/${id}`, data);
        return response.data;
    },

    eliminarSite: async (id: number) => {
        const { data: response } = await api.delete(`/marcaje/admin/sites/${id}`);
        return response.data;
    },

    // --- Admin: CRUD IPs ---
    crearIp: async (data: any) => {
        const { data: response } = await api.post('/marcaje/admin/ips', data);
        return response.data;
    },

    eliminarIp: async (id: number) => {
        const { data: response } = await api.delete(`/marcaje/admin/ips/${id}`);
        return response.data;
    },

    // --- Admin: Devices ---
    actualizarDevice: async (uuid: string, estado: string) => {
        const { data: response } = await api.put(`/marcaje/admin/devices/${uuid}`, { estado });
        return response.data;
    },

    // --- Geocercas por usuario ---
    validarGeocerca: async (lat: number, lon: number) => {
        const { data: response } = await api.post('/marcaje/geocerca/validar', { lat, lon });
        return response.data;
    },

    getGeocercasUsuario: async (carnet: string) => {
        const { data: response } = await api.get(`/marcaje/admin/geocercas/${carnet}`);
        return response.data || response;
    },

    asignarGeocerca: async (carnet: string, id_site: number) => {
        const { data: response } = await api.post('/marcaje/admin/geocercas', { carnet, id_site });
        return response.data;
    },

    quitarGeocerca: async (id: number) => {
        const { data: response } = await api.delete(`/marcaje/admin/geocercas/${id}`);
        return response.data;
    },

    // --- Recorridos de campo ---
    getRecorridosAdmin: async (fecha?: string) => {
        const url = fecha ? `/campo/recorrido/admin?fecha=${fecha}` : '/campo/recorrido/admin';
        const { data: response } = await api.get(url);
        return response.data || response;
    },

    getPuntosRecorrido: async (id: number) => {
        const { data: response } = await api.get(`/campo/recorrido/puntos/${id}`);
        return response.data || response;
    },
};
