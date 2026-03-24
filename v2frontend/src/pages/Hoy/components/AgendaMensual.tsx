import React, { useState, useEffect, useCallback } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import { useMiDiaContext } from '../context/MiDiaContext';

interface DayData {
    date: string;
    dayNumber: number;
    isToday: boolean;
    isCurrentMonth: boolean;
    tasks: Tarea[];
}

interface Props {
    onSelectTask: (task: Tarea) => void;
    onAddQuickTask?: (date: Date) => void;
}

export const AgendaMensual: React.FC<Props> = ({ onSelectTask, onAddQuickTask }) => {
    const { userId, userCarnet, today, isSupervisorMode } = useMiDiaContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [monthData, setMonthData] = useState<DayData[]>([]);

    const getMonthName = (date: Date): string =>
        ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][date.getMonth()];

    const loadMonthData = useCallback(async () => {
        setLoading(true);
        try {
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);


            // Adjust to start on Monday
            const startDay = firstDayOfMonth.getDay();
            const diff = firstDayOfMonth.getDate() - startDay + (startDay === 0 ? -6 : 1);
            const calendarStart = new Date(firstDayOfMonth);
            calendarStart.setDate(diff);
            calendarStart.setHours(0, 0, 0, 0);

            // 42 days to show 6 weeks
            const calendarEnd = new Date(calendarStart);
            calendarEnd.setDate(calendarStart.getDate() + 41);
            calendarEnd.setHours(23, 59, 59, 999);

            const startDateStr = calendarStart.toISOString().split('T')[0];
            const endDateStr = calendarEnd.toISOString().split('T')[0];

            const targetId = userCarnet || String(userId || '');
            const res = !isSupervisorMode
                ? await clarityService.getMiDia(today, startDateStr, endDateStr)
                : await clarityService.getMemberAgenda(targetId, '', startDateStr, endDateStr);

            const tasks = [...(res?.tareasSugeridas || []), ...(res?.backlog || [])];

            const days: DayData[] = [];
            const todayStr = new Date().toISOString().split('T')[0];

            for (let i = 0; i < 42; i++) {
                const d = new Date(calendarStart);
                d.setDate(d.getDate() + i);
                const dStr = d.toISOString().split('T')[0];

                days.push({
                    date: dStr,
                    dayNumber: d.getDate(),
                    isToday: dStr === todayStr,
                    isCurrentMonth: d.getMonth() === currentDate.getMonth(),
                    tasks: []
                });
            }

            tasks.forEach((t: Tarea) => {
                // ✅ FIX: Excluir tareas descartadas y eliminadas del calendario
                if (t.estado === 'Descartada' || (t.estado as string) === 'Eliminada') return;

                const targetDate = t.fechaObjetivo || t.fechaHecha || t.fechaCreacion;
                let dateStr: string;

                if (targetDate) {
                    dateStr = typeof targetDate === 'string' ? targetDate.substring(0, 10) : (targetDate as any).toISOString().split('T')[0];
                } else {
                    // ✅ Tareas sin fechas (operativas): asignar al día actual
                    if (t.estado === 'Hecha') return;
                    dateStr = todayStr;
                }

                // ✅ FIX: Normalizar progreso — si está Hecha, forzar a 100
                if (t.estado === 'Hecha' && (t.progreso === 0 || t.progreso === null || t.progreso === undefined)) {
                    t.progreso = 100;
                }

                const idx = days.findIndex(d => d.date === dateStr);
                if (idx >= 0) {
                    if (!days[idx].tasks.some(existing => existing.idTarea === t.idTarea)) {
                        days[idx].tasks.push(t);
                    }
                }
            });

            setMonthData(days);
        } catch (e) {
            console.error('Error loading month data:', e);
        } finally {
            setLoading(false);
        }
    }, [currentDate, userId, userCarnet, today, isSupervisorMode]);

    useEffect(() => { loadMonthData(); }, [loadMonthData]);

    const changeMonth = (offset: number) => {
        const next = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        setCurrentDate(next);
    };

    const getStatusColor = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-500',
            'EnCurso': 'bg-blue-500',
            'Pausa': 'bg-orange-400',
            'Bloqueada': 'bg-red-500',
            'Revision': 'bg-purple-500',
            'Descartada': 'bg-gray-400',
            'Pendiente': 'bg-yellow-500'
        };
        return colors[estado] || 'bg-gray-400';
    };

    const getStatusBg = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-50',
            'EnCurso': 'bg-blue-50',
            'Pausa': 'bg-orange-50',
            'Bloqueada': 'bg-red-50',
            'Revision': 'bg-purple-50',
            'Descartada': 'bg-gray-100',
            'Pendiente': 'bg-yellow-50'
        };
        return colors[estado] || 'bg-gray-50';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center min-h-[400px] flex flex-col justify-center">
                <Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" size={32} />
                <p className="text-gray-400 text-sm font-medium">Cargando mes...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="text-2xl text-indigo-600">📅</span>
                        {getMonthName(currentDate)} <span className="text-slate-400 font-medium ml-1">{currentDate.getFullYear()}</span>
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors border border-slate-100"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100"
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors border border-slate-100"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Weekdays Labels */}
            <div className="grid grid-cols-7 bg-slate-50/50 border-b border-gray-100">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-gray-100 min-h-[600px] overflow-auto">
                {monthData.map((day) => (
                    <div
                        key={day.date}
                        className={`min-h-[100px] flex flex-col p-1.5 transition-colors relative group/cell
                            ${!day.isCurrentMonth ? 'bg-slate-50/30 opacity-40' : 'bg-white hover:bg-slate-50/50'}
                            ${day.isToday ? 'bg-indigo-50/30' : ''}
                        `}
                    >
                        <div className="flex justify-between items-center mb-1 px-1">
                            <span className={`text-xs font-black ${day.isToday
                                ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center -ml-1 shadow-md shadow-indigo-100'
                                : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                                }`}>
                                {day.dayNumber}
                            </span>
                            <div className="flex items-center gap-1">
                                {day.tasks.length > 0 && (
                                    <span className="text-[10px] font-black text-slate-300">
                                        {day.tasks.length}
                                    </span>
                                )}
                                {onAddQuickTask && day.isCurrentMonth && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddQuickTask(new Date(day.date + 'T12:00:00'));
                                        }}
                                        className="p-0.5 bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-600 rounded-md opacity-0 group-hover/cell:opacity-100 transition-all"
                                        title="Crear tarea en este día"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1 overflow-y-auto max-h-[120px] custom-scrollbar">
                            {day.tasks.map(task => (
                                <button
                                    key={task.idTarea}
                                    onClick={() => onSelectTask(task)}
                                    className={`w-full text-left p-1 rounded-lg border-l-2 transition-all 
                                        ${getStatusBg(task.estado)} border-${getStatusColor(task.estado).replace('bg-', '')}
                                        hover:shadow-md hover:scale-[1.02] transform
                                        ${task.estado === 'Hecha' || task.estado === 'Descartada' ? 'opacity-40' : ''}
                                    `}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        {task.asignados && task.asignados.length > 1 && (
                                            <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter -mb-0.5">👥 Compartida</span>
                                        )}
                                        <span className={`text-[9px] font-bold leading-tight truncate px-0.5 ${task.estado === 'Hecha' ? 'line-through text-slate-400' : 'text-slate-700'
                                            }`}>
                                            {task.titulo}
                                        </span>
                                        {task.progreso > 0 && task.progreso < 100 && (
                                            <div className="h-0.5 bg-slate-200/50 rounded-full overflow-hidden w-full">
                                                <div className={`h-full ${getStatusColor(task.estado)}`} style={{ width: `${task.progreso}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
};
