/**
 * API Client para Visita a Cliente
 * Usa la instancia centralizada de Axios con interceptors JWT automáticos.
 */
import { api } from './api';

export interface VisitaCheckinDto {
    cliente_id: number;
    lat: number;
    lon: number;
    accuracy?: number;
    agenda_id?: number;
    offline_id?: string;
}

export interface VisitaCheckoutDto {
    visita_id: number;
    lat?: number;
    lon?: number;
    accuracy?: number;
    observacion?: string;
}

export const visitaApi = {
    getAgendaHoy: async (lat?: number, lon?: number) => {
        const params = new URLSearchParams();
        if (lat) params.append('lat', lat.toString());
        if (lon) params.append('lon', lon.toString());
        const response = await api.get(`/visita-campo/agenda?${params.toString()}`);
        return response.data;
    },

    getClientes: async () => {
        const response = await api.get('/visita-campo/clientes');
        return response.data;
    },

    checkin: async (data: VisitaCheckinDto) => {
        const response = await api.post('/visita-campo/checkin', data);
        return response.data;
    },

    checkout: async (data: VisitaCheckoutDto) => {
        const response = await api.post('/visita-campo/checkout', data);
        return response.data;
    },

    getResumenDia: async () => {
        const response = await api.get('/visita-campo/resumen');
        return response.data;
    },

    sendTrackingBatch: async (puntos: any[]) => {
        const response = await api.post('/visita-campo/tracking-batch', { puntos });
        return response.data;
    },

    getKmStats: async (fecha?: string) => {
        const params = fecha ? `?fecha=${fecha}` : '';
        const response = await api.get(`/visita-campo/stats/km${params}`);
        return response.data;
    },

    // --- Admin Endpoints ---
    importarClientes: async (clientesJson: any[]) => {
        const response = await api.post('/visita-admin/importar-clientes', { clientes: clientesJson });
        return response.data;
    },

    crearCliente: async (data: any) => {
        const response = await api.post('/visita-admin/clientes', data);
        return response.data;
    },

    actualizarCliente: async (id: number, data: any) => {
        const response = await api.put(`/visita-admin/clientes/${id}`, data);
        return response.data;
    },

    eliminarCliente: async (id: number) => {
        const response = await api.delete(`/visita-admin/clientes/${id}`);
        return response.data;
    },

    getVisitasAdmin: async (fecha?: string) => {
        const params = fecha ? `?fecha=${fecha}` : '';
        const response = await api.get(`/visita-admin/visitas${params}`);
        return response.data;
    },

    getDashboardAdmin: async (fecha?: string) => {
        const params = fecha ? `?fecha=${fecha}` : '';
        const response = await api.get(`/visita-admin/dashboard${params}`);
        return response.data;
    },

    getReporteKm: async (fechaInicio: string, fechaFin: string) => {
        if (!fechaInicio) fechaInicio = new Date().toISOString().split('T')[0];
        if (!fechaFin) fechaFin = new Date().toISOString().split('T')[0];

        const response = await api.get(`/visita-admin/reportes/km?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
        return response.data;
    },

    // --- Campo: Tracking Raw ---
    getTrackingRaw: async (fecha?: string, carnet?: string) => {
        let url = '/visita-campo/tracking-raw';
        const params: string[] = [];
        if (fecha) params.push(`fecha=${fecha}`);
        if (carnet) params.push(`carnet=${carnet}`);
        if (params.length) url += '?' + params.join('&');
        const response = await api.get(url);
        return response.data;
    },

    getUsuariosConTracking: async () => {
        const response = await api.get('/visita-campo/usuarios-tracking');
        return response.data;
    },

    // --- Admin: Tracking por carnet ---
    getTrackingUsuario: async (carnet: string, fecha?: string) => {
        const params = fecha ? `?fecha=${fecha}` : '';
        const response = await api.get(`/visita-admin/tracking/${carnet}${params}`);
        return response.data;
    },

    // --- Admin: CRUD Agenda ---
    listarAgenda: async (carnet: string, fecha?: string) => {
        const params = fecha ? `?fecha=${fecha}` : '';
        const response = await api.get(`/visita-admin/agenda/${carnet}${params}`);
        return response.data;
    },

    crearAgenda: async (data: { carnet: string; cliente_id: number; fecha: string; orden?: number; notas?: string }) => {
        const response = await api.post('/visita-admin/agenda', data);
        return response.data;
    },

    reordenarAgenda: async (id: number, nuevoOrden: number) => {
        const response = await api.put(`/visita-admin/agenda/${id}/reordenar`, { nuevo_orden: nuevoOrden });
        return response.data;
    },

    eliminarAgenda: async (id: number) => {
        const response = await api.delete(`/visita-admin/agenda/${id}`);
        return response.data;
    },

    // --- Admin: Metas ---
    listarMetas: async (carnet?: string) => {
        const params = carnet ? `?carnet=${carnet}` : '';
        const response = await api.get(`/visita-admin/metas${params}`);
        return response.data;
    },

    setMeta: async (data: { carnet: string; meta_visitas: number; costo_km: number; vigente_desde?: string; vigente_hasta?: string }) => {
        const response = await api.post('/visita-admin/metas', data);
        return response.data;
    },
};
