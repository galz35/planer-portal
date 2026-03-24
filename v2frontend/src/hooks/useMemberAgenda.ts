// Last Modified: 2026-01-24 20:38:55
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clarityService } from '../services/clarity.service';
import type { Tarea, Checkin, Bloqueo } from '../types/modelos';

interface MemberAgendaData {
    checkinHoy: Checkin | null;
    tareasSugeridas: Tarea[];
    backlog: Tarea[];
    bloqueosActivos: Bloqueo[];
    bloqueosMeCulpan: Bloqueo[];
}

export const memberKeys = {
    all: ['member-mi-dia'] as const,
    detail: (userId: string, fecha: string) => [...memberKeys.all, userId, fecha] as const,
};

export const useMemberAgenda = (userId: string, fecha: string) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: memberKeys.detail(userId, fecha),
        queryFn: async () => {
            if (!userId) return null;
            const data = await clarityService.getMemberAgenda(userId, fecha);
            return data as MemberAgendaData;
        },
        enabled: !!userId,
        staleTime: 60_000, // 1 minuto
    });

    const fetchMiDia = () => {
        queryClient.invalidateQueries({ queryKey: memberKeys.detail(userId, fecha) });
    };

    const data = query.data;

    return {
        loading: query.isLoading,
        refreshing: query.isFetching,
        checkin: data?.checkinHoy || null,
        arrastrados: [] as Tarea[], // Por ahora el backend de member no lo devuelve separado
        bloqueos: data?.bloqueosActivos || [],
        bloqueosMeCulpan: data?.bloqueosMeCulpan || [],
        disponibles: data?.tareasSugeridas || [],
        backlog: data?.backlog || [],
        fetchMiDia,
        ...query
    };
};
