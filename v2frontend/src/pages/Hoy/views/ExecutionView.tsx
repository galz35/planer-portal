import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../../context/AuthContext';
import { useMiDiaContext } from '../context/MiDiaContext';
import { ActivePlanView } from '../components/ActivePlanView';
import { CheckinForm } from '../components/CheckinForm';
import { clarityService } from '../../../services/clarity.service';
import { useToast } from '../../../context/ToastContext';
import type { CheckinUpsertDto, CheckinTarea } from '../../../types/modelos';
import { OverdueTimeline } from '../components/OverdueTimeline';

export const ExecutionView: React.FC = () => {
    const {
        loading,
        checkin,
        bloqueos,
        bloqueosMeCulpan,
        allDisponibles,
        userId,
        today,
        toggleTarea,
        isMutating,
        mutatingTaskId,
        backlog // Added backlog
    } = useMiDiaContext();

    const { showToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);

    const queryClient = useQueryClient();

    // ✅ Prepara initialData solo cuando cambian checkin/userId/today
    const initialData = useMemo<CheckinUpsertDto | undefined>(() => {
        if (!checkin) return undefined;

        const tareas = checkin.tareas || [];

        return {
            idUsuario: userId,
            fecha: today,
            entregableTexto: checkin.entregableTexto || '',
            // TODO: tipar correctamente estadoAnimo (evitar any)
            estadoAnimo: (checkin.estadoAnimo as any) ?? null,

            entrego: tareas.filter((t: CheckinTarea) => t.tipo === 'Entrego').map((t: CheckinTarea) => t.idTarea),
            avanzo: tareas.filter((t: CheckinTarea) => t.tipo === 'Avanzo').map((t: CheckinTarea) => t.idTarea),
            extras: tareas.filter((t: CheckinTarea) => t.tipo === 'Extra').map((t: CheckinTarea) => t.idTarea),
        };
    }, [checkin, userId, today]);

    // ✅ Mutation para guardar checkin (evita doble submit + controla estados)
    const guardarCheckin = useMutation({
        mutationFn: (dto: CheckinUpsertDto) => clarityService.postCheckin(dto),

        onSuccess: async () => {
            showToast('Check-in guardado exitosamente', 'success');
            setIsEditing(false);

            // 🔥 Refresco inmediato (equivale a “F5” solo para Mi Día)
            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
        },

        onError: () => {
            showToast('Error al guardar check-in', 'error');
        },
    });

    const onEdit = useCallback(() => setIsEditing(true), []);
    const onCancelEdit = useCallback(() => setIsEditing(false), []);

    const handleSubmitCheckin = useCallback(
        async (dto: CheckinUpsertDto) => {
            if (guardarCheckin.isPending) return; // ✅ evita doble submit
            guardarCheckin.mutate(dto);
        },
        [guardarCheckin]
    );

    const { user } = useAuth(); // Import useAuth from context

    // ✅ Evita render de “cargando” con layout distinto
    if (loading) {
        return <div className="p-8 text-center text-slate-400">Cargando datos...</div>;
    }

    const hayAlertas = (bloqueosMeCulpan?.length || 0) > 0;

    const onTaskComplete = async (id: number) => {
        try {
            await clarityService.actualizarTarea(id, { estado: 'Hecha' } as any);
            showToast('Tarea completada/restaurada', 'success');
            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
        } catch (err) {
            showToast('Error al actualizar tarea', 'error');
        }
    };

    const onTaskCancel = async (id: number) => {
        try {
            await clarityService.actualizarTarea(id, { estado: 'Descartada' } as any);
            showToast('Tarea descartada', 'success');
            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
        } catch (err) {
            showToast('Error al descartar tarea', 'error');
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-4 h-full animate-fade-in overflow-hidden">
            {/* Contenido Principal (Checkin / Plan Activo) */}
            <div className="flex-1 overflow-auto">
                <div className="w-full min-h-full flex flex-col">
                    {checkin && !isEditing ? (
                        <ActivePlanView
                            checkin={checkin}
                            onEdit={onEdit}
                            toggleTarea={toggleTarea}
                            isMutating={isMutating}
                            mutatingTaskId={mutatingTaskId}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full gap-6">
                            {isEditing && (
                                <div className="flex justify-end pt-6 px-4 sm:px-0">
                                    <button
                                        onClick={onCancelEdit}
                                        className="text-sm text-slate-500 underline transition-colors hover:text-indigo-600"
                                        type="button"
                                    >
                                        Cancelar Edición
                                    </button>
                                </div>
                            )}

                            {hayAlertas && (
                                <div className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center justify-between shadow-md mx-auto w-full max-w-full animate-pulse">
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <span>
                                            🛑 ¡ALERTA! Estás bloqueando el trabajo de {bloqueosMeCulpan.length} compañero(s).
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 h-full">
                                <CheckinForm
                                    disponibles={allDisponibles}
                                    checkinTasks={checkin?.tareas?.map((t: CheckinTarea) => t.tarea!).filter(Boolean) || []}
                                    onSubmit={handleSubmitCheckin}
                                    onTaskCreated={async () => {
                                        await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });
                                    }}
                                    userId={userId}
                                    userCarnet={user?.carnet}
                                    fecha={today}
                                    initialData={initialData}
                                    bloqueos={bloqueos}
                                />
                            </div>
                        </div>
                    )}

                    {/* Versión mobile: Backlog al final del scroll */}
                    <div className="xl:hidden mt-8 mb-8">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mb-4">Tareas Atrasadas</h3>
                            <OverdueTimeline
                                tasks={backlog}
                                onTaskComplete={onTaskComplete}
                                onTaskCancel={onTaskCancel}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar de Backlog (Tareas Atrasadas - Desktop) */}
            <div className="xl:w-[420px] shrink-0 h-full overflow-hidden border-l border-slate-100 hidden xl:flex flex-col">
                <OverdueTimeline
                    tasks={backlog}
                    onTaskComplete={onTaskComplete}
                    onTaskCancel={onTaskCancel}
                />
            </div>
        </div>
    );
};
