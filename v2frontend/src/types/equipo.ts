import type { Usuario, Checkin } from './modelos';

export interface EquipoHoyResponse {
    miembros: {
        usuario: Usuario;
        checkin: Checkin | null;
        bloqueosActivos: number;
        tareasVencidas: number;
        estado: 'Pendiente' | 'AlDia' | 'ConBloqueos';
    }[];
    resumenAnimo: {
        feliz: number;
        neutral: number;
        triste: number;
        promedio: number;
    };
}
