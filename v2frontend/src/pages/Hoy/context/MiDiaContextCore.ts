import { createContext } from 'react';
import type { Checkin, Tarea, Bloqueo } from '../../../types/modelos';

export interface MiDiaContextType {
    loading: boolean;
    checkin: Checkin | null;
    arrastrados: Tarea[];
    bloqueos: Bloqueo[];
    bloqueosMeCulpan: Bloqueo[];
    disponibles: Tarea[];
    backlog: Tarea[];
    allDisponibles: Tarea[];
    userId: number;
    userCarnet?: string;
    today: string;
    setToday: (date: string) => void;
    revalidarTarea: (variables: { idTarea: number; accion: 'Sigue' | 'HechaPorOtro' | 'NoAplica' }) => void;
    toggleTarea: (variables: { idTarea: number; estadoActual: string }) => void;
    isMutating: boolean;
    mutatingTaskId?: number | null;
    isSupervisorMode?: boolean;
    agendaConfig: { showGestion: boolean, showRapida: boolean };
    setAgendaConfig: (config: { showGestion: boolean, showRapida: boolean }) => Promise<void>;
}

export const MiDiaContext = createContext<MiDiaContextType | undefined>(undefined);
