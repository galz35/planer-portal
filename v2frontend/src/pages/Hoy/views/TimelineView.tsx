// Last Modified: 2026-01-24 20:38:55
import React, { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMiDiaContext } from '../context/MiDiaContext';
import { miDiaKeys } from '../../../hooks/query/useMiDiaQuery';

import { AgendaTimeline } from '../components/AgendaTimeline';
import { clarityService } from '../../../services/clarity.service';
import { useToast } from '../../../context/ToastContext';

export const TimelineView: React.FC = () => {
    const { userId } = useMiDiaContext();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [idEnProceso, setIdEnProceso] = useState<number | null>(null);

    const actualizarEstado = useMutation({
        mutationFn: async (params: { id: number; estado: 'Hecha' | 'Descartada' }) => {
            await clarityService.actualizarTarea(params.id, { estado: params.estado } as any);
        },
        onSuccess: async (_data: any, vars: { id: number; estado: 'Hecha' | 'Descartada' }) => {
            showToast(vars.estado === 'Hecha' ? 'Tarea completada' : 'Tarea descartada', 'success');

            // ✅ reemplaza fetchMiDia()
            await queryClient.invalidateQueries({ queryKey: miDiaKeys.usuario(userId) });

            // Si Timeline tiene su propia query:
            // await queryClient.invalidateQueries({ queryKey: ['timeline'] });
        },
        onError: (_err: any, vars: { id: number; estado: 'Hecha' | 'Descartada' }) => {
            showToast(vars.estado === 'Hecha' ? 'Error al completar' : 'Error al descartar', 'error');
        },
        onSettled: () => setIdEnProceso(null),
    });

    const onTaskClick = useCallback(
        (t: any) => showToast(`Tarea: ${t.titulo}`, 'info'),
        [showToast]
    );

    const onTaskComplete = useCallback(
        (id: number) => {
            if (idEnProceso !== null) return;
            setIdEnProceso(id);
            actualizarEstado.mutate({ id, estado: 'Hecha' });
        },
        [actualizarEstado, idEnProceso]
    );

    const onTaskCancel = useCallback(
        (id: number) => {
            if (idEnProceso !== null) return;
            setIdEnProceso(id);
            actualizarEstado.mutate({ id, estado: 'Descartada' });
        },
        [actualizarEstado, idEnProceso]
    );

    return (
        <div className="h-full flex flex-col animate-fade-in overflow-auto">
            <AgendaTimeline
                onTaskClick={onTaskClick}
                onTaskComplete={onTaskComplete}
                onTaskCancel={onTaskCancel}

            // ✅ si tu componente lo soporta:
            // isBusy={actualizarEstado.isPending}
            // busyTaskId={idEnProceso}
            />
        </div>
    );
};
