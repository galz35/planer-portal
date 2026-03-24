// Last Modified: 2026-01-24 20:38:55
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clarityService } from '../../services/clarity.service';
import type { Tarea, Checkin, Bloqueo } from '../../types/modelos';

export interface MiDiaData {
    checkin: Checkin | null;
    tareasSugeridas: Tarea[];
    backlog: Tarea[];
    bloqueosActivos: Bloqueo[];
    bloqueosMeCulpan: Bloqueo[];
}

// ✅ FUENTE ÚNICA DE VERDAD: miDiaKeys
export const miDiaKeys = {
    all: ['mi-dia'] as const,
    usuario: (idUsuario: number) => [...miDiaKeys.all, idUsuario] as const,
    fecha: (idUsuario: number, fecha: string) => [...miDiaKeys.usuario(idUsuario), fecha] as const,
};

/**
 * Helper para actualizar una tarea en el cache de MiDiaData
 * Útil para evitar duplicar lógica en onMutate
 */
const updateTaskInCache = (old: MiDiaData | undefined, idTarea: number, updates: Partial<Tarea>): MiDiaData => {
    if (!old) return { checkin: null, tareasSugeridas: [], backlog: [], bloqueosActivos: [], bloqueosMeCulpan: [] };

    const updateList = (list: Tarea[]) =>
        list.map(t => Number(t.idTarea) === idTarea ? { ...t, ...updates } : t);

    return {
        ...old,
        tareasSugeridas: updateList(old.tareasSugeridas),
        backlog: updateList(old.backlog),
        // Si el checkin tiene tareas anidadas
        checkin: old.checkin?.tareas ? {
            ...old.checkin,
            tareas: old.checkin.tareas.map(ct =>
                ct.tarea && Number(ct.tarea.idTarea) === idTarea
                    ? { ...ct, tarea: { ...ct.tarea, ...updates } }
                    : ct
            )
        } : old.checkin
    };
};

export const useMiDiaQuery = (idUsuario: number, fecha: string) => {
    const queryClient = useQueryClient();
    const queryKey = miDiaKeys.fecha(idUsuario, fecha);

    const query = useQuery({
        queryKey,
        queryFn: () => clarityService.getMiDia(fecha).then(res => ({
            checkin: res?.checkinHoy || null,
            tareasSugeridas: res?.tareasSugeridas || [],
            backlog: res?.backlog || [],
            bloqueosActivos: res?.bloqueosActivos || [],
            bloqueosMeCulpan: res?.bloqueosMeCulpan || [],
        } as MiDiaData)),
        enabled: !!idUsuario && !!fecha,
    });

    const revalidarTareaMutation = useMutation({
        mutationFn: ({ idTarea, accion }: { idTarea: number; accion: 'Sigue' | 'HechaPorOtro' | 'NoAplica' }) =>
            clarityService.revalidarTarea(idTarea, accion),
        onMutate: async ({ idTarea }: { idTarea: number }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<MiDiaData>(queryKey);
            if (previousData) {
                queryClient.setQueryData<MiDiaData>(queryKey, {
                    ...previousData,
                    tareasSugeridas: previousData.tareasSugeridas.filter(t => Number(t.idTarea) !== idTarea)
                });
            }
            return { previousData };
        },
        onError: (_err: any, _vars: any, ctx: any) => {
            if (ctx?.previousData) queryClient.setQueryData(queryKey, ctx.previousData);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });

    const toggleTareaMutation = useMutation({
        mutationFn: ({ idTarea, estadoActual }: { idTarea: number; estadoActual: string }) => {
            const nuevoEstado = estadoActual === 'Hecha' ? 'EnCurso' : 'Hecha';
            return clarityService.actualizarTarea(idTarea, { estado: nuevoEstado as any });
        },
        onMutate: async ({ idTarea, estadoActual }: { idTarea: number; estadoActual: string }) => {
            await queryClient.cancelQueries({ queryKey });
            const previousData = queryClient.getQueryData<MiDiaData>(queryKey);
            const nuevoEstado = estadoActual === 'Hecha' ? 'EnCurso' : 'Hecha';

            if (previousData) {
                queryClient.setQueryData<MiDiaData>(queryKey, (old: MiDiaData | undefined) =>
                    updateTaskInCache(old, idTarea, { estado: nuevoEstado as any })
                );
            }
            return { previousData };
        },
        onError: (_err: any, _vars: any, ctx: any) => {
            if (ctx?.previousData) queryClient.setQueryData(queryKey, ctx.previousData);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey }),
    });

    return {
        ...query,
        data: query.data || { checkin: null, tareasSugeridas: [], backlog: [], bloqueosActivos: [], bloqueosMeCulpan: [] },
        revalidarTarea: revalidarTareaMutation.mutate,
        toggleTarea: toggleTareaMutation.mutate,
        isMutating: toggleTareaMutation.isPending || revalidarTareaMutation.isPending,
        mutatingTaskId: (toggleTareaMutation.variables as any)?.idTarea || (revalidarTareaMutation.variables as any)?.idTarea
    };
};
