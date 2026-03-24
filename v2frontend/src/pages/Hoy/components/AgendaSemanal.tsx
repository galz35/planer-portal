import React, { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import type { Tarea, Checkin } from '../../../types/modelos';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';
import { useMiDiaContext } from '../context/MiDiaContext';
import {
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameDay,
    isWeekend,
    addWeeks,
    subWeeks
} from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
    onAddQuickTask?: (date: Date) => void;
}

export const AgendaSemanal: React.FC<Props> = ({ onAddQuickTask }) => {
    const { userId, userCarnet, isSupervisorMode, agendaConfig } = useMiDiaContext();

    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [checkinHoy, setCheckinHoy] = useState<Checkin | null>(null);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });



    const loadWeekData = useCallback(async () => {
        setLoading(true);
        try {
            const startDateStr = weekStart.toISOString();
            const endDateStr = weekEnd.toISOString();

            console.log('[AgendaSemanal] Fetching range:', startDateStr, 'to', endDateStr);

            const targetId = userCarnet || String(userId || '');

            // Fetch tasks only (config is global now)
            const res = !isSupervisorMode
                ? await clarityService.getMiDia(new Date().toISOString(), startDateStr, endDateStr)
                : await clarityService.getMemberAgenda(targetId, new Date().toISOString(), startDateStr, endDateStr);

            setTasks([...(res?.tareasSugeridas || []), ...(res?.backlog || [])]);
            setCheckinHoy(res?.checkinHoy || null);

        } catch (e) {
            console.error('Error loading agenda:', e);
        } finally {
            setLoading(false);
        }
    }, [weekStart, userId, userCarnet, isSupervisorMode]);

    useEffect(() => { loadWeekData(); }, [loadWeekData]);

    // Derived tasks per day
    const getTasksForDay = (date: Date) => {
        // 1. Regular Tasks with dates matching this day
        const regularTasks = tasks.filter(t => {
            if (t.estado === 'Descartada' || (t.estado as string) === 'Eliminada') return false;

            // ✅ FIX: Normalizar progreso — si está Hecha, forzar a 100
            if (t.estado === 'Hecha' && (t.progreso === 0 || t.progreso === null || t.progreso === undefined)) {
                t.progreso = 100;
            }

            const start = t.fechaInicioPlanificada ? new Date(t.fechaInicioPlanificada) : null;
            const end = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
            const doneDate = t.fechaHecha || (t as any).fechaFinReal ? new Date(t.fechaHecha || (t as any).fechaFinReal) : null;

            // If done, show on done date
            if (t.estado === 'Hecha' && doneDate) {
                return isSameDay(date, doneDate);
            }

            // ✅ Tareas SIN fechas (operativas): mostrar en el día actual si están pendientes
            if (!start && !end) {
                if (t.estado !== 'Hecha') {
                    return isSameDay(date, new Date());
                }
                return false;
            }

            // Check range or single date
            if (start && end) {
                const check = new Date(date).setHours(0, 0, 0, 0);
                const s = new Date(start).setHours(0, 0, 0, 0);
                const e = new Date(end).setHours(0, 0, 0, 0);
                return check >= s && check <= e;
            }

            if (end) return isSameDay(date, end);
            if (start) return isSameDay(date, start);
            return false;
        });

        // 2. Checkin Tasks (Priority: "Lo que puse en mi agenda")
        // If 'checkinHoy' corresponds to THIS 'date', add its tasks
        // FILTER BASED ON CONFIG
        const checkinDate = checkinHoy?.fecha ? new Date(checkinHoy.fecha) : null;
        let agendaTasks: Tarea[] = [];

        if (checkinDate && isSameDay(date, checkinDate) && checkinHoy?.tareas) {
            agendaTasks = checkinHoy.tareas
                .filter(t => {
                    if (!t.tarea) return false;
                    // Apply Config logic
                    if (t.tipo === 'Entrego') return true; // Always show Principal
                    if (t.tipo === 'Avanzo' && !agendaConfig.showGestion) return false;
                    if (t.tipo === 'Extra' && !agendaConfig.showRapida) return false;
                    return true;
                })
                .map(t => ({
                    ...t.tarea!,
                    // Ensure ID is preserved
                    idTarea: t.idTarea || t.tarea!.idTarea
                })) as Tarea[];
        }

        // Merge and Deduplicate
        const merged = [...agendaTasks, ...regularTasks];
        const unique = merged.filter((t, index, self) =>
            index === self.findIndex((x) => x.idTarea === t.idTarea)
        );

        return unique;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando Agenda...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative">
            {/* Header Navigation */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWeekStart(d => subWeeks(d, 1))}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-center min-w-[140px]">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {format(weekStart, 'MMMM yyyy', { locale: es })}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Semana {format(weekStart, 'w')}
                        </p>
                    </div>
                    <button
                        onClick={() => setWeekStart(d => addWeeks(d, 1))}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <button
                    onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                >
                    Hoy
                </button>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-7 gap-2 min-h-full h-full">
                    {days.map(day => {
                        const dayTasks = getTasksForDay(day);
                        const isTodayMark = isSameDay(day, new Date());
                        const isWeekendMark = isWeekend(day);

                        return (
                            <div
                                key={day.toISOString()}
                                className={`flex flex-col rounded-3xl overflow-hidden transition-all duration-300 border ${isTodayMark
                                    ? 'bg-white border-indigo-200 shadow-xl shadow-indigo-100 ring-1 ring-indigo-50 z-10 scale-[1.02]'
                                    : isWeekendMark
                                        ? 'bg-slate-50/50 border-transparent opacity-80'
                                        : 'bg-white border-slate-200 shadow-sm'
                                    }`}
                            >
                                {/* Day Header */}
                                <div className={`p-3 text-center border-b border-dashed relative group ${isTodayMark ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100'}`}>
                                    <div className={`text-[10px] font-black uppercase mb-0.5 ${isTodayMark ? 'text-indigo-600' : 'text-slate-400'}`}>
                                        {format(day, 'EEE', { locale: es })}
                                    </div>
                                    <div className={`text-2xl font-black ${isTodayMark ? 'text-indigo-600' : 'text-slate-800'}`}>
                                        {format(day, 'd')}
                                    </div>
                                    {/* Action button to create task directly on this day */}
                                    {onAddQuickTask && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAddQuickTask(day); }}
                                            className="absolute top-1/2 right-2 -translate-y-1/2 p-2 bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                            title="Agregar tarea informativa a este día"
                                        >
                                            <Plus size={14} strokeWidth={3} />
                                        </button>
                                    )}
                                </div>

                                {/* Tasks List */}
                                <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-hide flex flex-col">
                                    {dayTasks.length === 0 ? (
                                        <div className="h-full flex items-center justify-center opacity-30 mt-4">
                                            {isTodayMark ? <p className="text-[9px] font-bold text-indigo-300 uppercase">Sin tareas</p> : null}
                                        </div>
                                    ) : (
                                        <>
                                            {/* SECCIÓN TAREAS PROYECTOS */}
                                            {dayTasks.filter(t => t.idProyecto).length > 0 && (
                                                <div className="space-y-1">
                                                    <div className="text-[9px] font-black uppercase text-indigo-400/80 px-1 mb-1 tracking-widest border-b border-indigo-100/50 pb-1">
                                                        De Proyecto
                                                    </div>
                                                    {dayTasks.filter(t => t.idProyecto).map(t => (
                                                        <div
                                                            key={t.idTarea}
                                                            onClick={() => setSelectedTask(t)}
                                                            className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md ${t.estado === 'Hecha'
                                                                ? 'bg-slate-50 border-slate-100 text-slate-400 dashed-border'
                                                                : 'bg-indigo-50/10 border-indigo-100 shadow-sm shadow-indigo-100/20'
                                                                }`}
                                                        >
                                                            <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${t.estado === 'Hecha' ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                                                            {t.asignados && t.asignados.length > 1 && (
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <span className="text-[7px] font-black text-indigo-400 bg-indigo-50 px-1 py-0.5 rounded uppercase tracking-tighter border border-indigo-100/50 flex items-center gap-0.5">
                                                                        👥 Compartida
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <h4 className={`text-[11px] font-bold leading-tight line-clamp-2 pr-2 ${t.estado === 'Hecha' ? 'line-through decoration-slate-300' : 'text-slate-700'}`}>
                                                                {t.titulo}
                                                            </h4>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* SECCIÓN TAREAS INFORMATIVAS / OPERATIVAS */}
                                            {dayTasks.filter(t => !t.idProyecto).length > 0 && (
                                                <div className="space-y-1">
                                                    <div className="text-[9px] font-black uppercase text-amber-500/80 px-1 mb-1 mt-2 tracking-widest border-b border-amber-100/50 pb-1">
                                                        Rapidas/Info
                                                    </div>
                                                    {dayTasks.filter(t => !t.idProyecto).map(t => (
                                                        <div
                                                            key={t.idTarea}
                                                            onClick={() => setSelectedTask(t)}
                                                            className={`group relative p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md ${t.estado === 'Hecha'
                                                                ? 'bg-slate-50 border-slate-100 text-slate-400 dashed-border'
                                                                : t.prioridad === 'Alta'
                                                                    ? 'bg-rose-50 border-rose-100 shadow-sm shadow-rose-100/20'
                                                                    : 'bg-white border-amber-100 shadow-sm'
                                                                }`}
                                                        >
                                                            <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${t.estado === 'Hecha' ? 'bg-emerald-400' :
                                                                t.prioridad === 'Alta' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                                                                }`}></div>

                                                            {t.asignados && t.asignados.length > 1 && (
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded uppercase tracking-tighter border border-amber-100/50 flex items-center gap-0.5">
                                                                        👥 Compartida
                                                                    </span>
                                                                </div>
                                                            )}

                                                            <h4 className={`text-[11px] font-bold leading-tight line-clamp-2 pr-2 ${t.estado === 'Hecha' ? 'line-through decoration-slate-300' : 'text-slate-700'}`}>
                                                                {t.titulo}
                                                            </h4>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Task Details Modal */}
            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask}
                    mode="execution"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        setSelectedTask(null);
                        loadWeekData();
                    }}
                    disableEdit={isSupervisorMode}
                />
            )}
        </div>
    );
};
