/**
 * API Client para Jornada Laboral
 * Gestión de Horarios, Patrones y Asignaciones
 */
import { api } from './api';

export interface Horario {
    id_horario: number;
    nombre: string;
    hora_entrada: string;
    hora_salida: string;
    duracion_horas: number;
    es_nocturno: boolean;
    tolerancia_min: number;
    descanso_min: number;
    activo: boolean;
}

export interface PatronDetalle {
    nro_dia: number;
    id_horario: number | null;
    etiqueta?: string;
    nombre_horario?: string;
    hora_entrada?: string;
    hora_salida?: string;
    es_nocturno?: boolean;
}

export interface Patron {
    id_patron: number;
    nombre: string;
    total_dias: number;
    descripcion?: string;
    detalle?: PatronDetalle[];
}

export interface Asignacion {
    id_asignacion: number;
    carnet: string;
    id_patron: number;
    fecha_inicio: string;
    fecha_fin: string | null;
    activo: boolean;
    nombre_patron?: string;
    total_dias?: number;
    nombre_colaborador?: string;
}

export const jornadaApi = {
    // --- Resolver ---
    resolver: async (carnet: string, fecha?: string) => {
        const url = fecha ? `/jornada/resolver/${carnet}?fecha=${fecha}` : `/jornada/resolver/${carnet}`;
        const { data: response } = await api.get(url);
        return response.data || response;
    },

    getSemana: async (carnet: string, fecha?: string) => {
        const url = fecha ? `/jornada/semana/${carnet}?fecha=${fecha}` : `/jornada/semana/${carnet}`;
        const { data: response } = await api.get(url);
        return response.data || response;
    },

    // --- Horarios CRUD ---
    getHorarios: async (): Promise<Horario[]> => {
        const { data: response } = await api.get('/jornada/horarios');
        return response.data || response;
    },

    crearHorario: async (data: Partial<Horario>) => {
        const { data: response } = await api.post('/jornada/horarios', data);
        return response.data || response;
    },

    actualizarHorario: async (id: number, data: Partial<Horario>) => {
        const { data: response } = await api.put(`/jornada/horarios/${id}`, data);
        return response.data || response;
    },

    desactivarHorario: async (id: number) => {
        const { data: response } = await api.delete(`/jornada/horarios/${id}`);
        return response.data || response;
    },

    // --- Patrones CRUD ---
    getPatrones: async (): Promise<Patron[]> => {
        const { data: response } = await api.get('/jornada/patrones');
        return response.data || response;
    },

    crearPatron: async (data: any) => {
        const { data: response } = await api.post('/jornada/patrones', data);
        return response.data || response;
    },

    // --- Asignaciones CRUD ---
    getAsignaciones: async (): Promise<Asignacion[]> => {
        const { data: response } = await api.get('/jornada/asignaciones');
        return response.data || response;
    },

    asignarPatron: async (data: { carnet: string; id_patron: number; fecha_inicio: string; fecha_fin?: string }) => {
        const { data: response } = await api.post('/jornada/asignaciones', data);
        return response.data || response;
    },

    desactivarAsignacion: async (id: number) => {
        const { data: response } = await api.delete(`/jornada/asignaciones/${id}`);
        return response.data || response;
    },
};
