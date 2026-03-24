import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clarityService } from '../../../services/clarity.service';
import { CheckCircle2, Circle, AlertTriangle, PlayCircle, Pause, ChevronDown, ChevronUp, Check, X, Save, Loader2 } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import { TipoBadge } from '../../../components/ui/TipoBadge';


interface Props {
    tasks: Tarea[];
    onTaskClick?: (task: Tarea) => void;
    onTaskComplete?: (taskId: number) => void;
    onTaskCancel?: (taskId: number) => void;
}

interface DayGroup {
    date: string;
    label: string;
    tasks: Tarea[];
    stats: { hechas: number; pendientes: number; enCurso: number; bloqueadas: number };
}

const ESTADOS = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision', 'Hecha', 'Descartada'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];
const TIPOS = ['Estrategico', 'Impacto', 'Operativo'];
const ALCANCES = ['Local', 'Regional', 'AMX'];
const ESFUERZOS = ['S', 'M', 'L'];

export const OverdueTimeline: React.FC<Props> = ({ tasks, onTaskComplete, onTaskCancel }) => {
    const queryClient = useQueryClient(); // ✅ Hook

    // Removed unused context and state
    const [days, setDays] = useState<DayGroup[]>([]);
    const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['0', '1', '2', '3'])); // Expand more by default for backlog
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Tarea>>({});
    const [saving, setSaving] = useState(false);

    const getLabel = (dateStr: string): string => {
        const d = new Date(dateStr + 'T12:00:00Z');
        return new Intl.DateTimeFormat('es-NI', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    };

    useEffect(() => {
        // Group tasks by date
        const groupsMap = new Map<string, DayGroup>();

        if (tasks && tasks.length > 0) {
            tasks.forEach((t: Tarea & { fechaTrabajada?: string }) => {
                // Use deadline or creation date for backlog grouping
                const taskDate = t.fechaObjetivo || t.fechaCreacion;
                if (taskDate) {
                    const dateStr = typeof taskDate === 'string' ? taskDate.substring(0, 10) : (taskDate as any).toISOString().split('T')[0];

                    if (!groupsMap.has(dateStr)) {
                        groupsMap.set(dateStr, {
                            date: dateStr,
                            label: getLabel(dateStr),
                            tasks: [],
                            stats: { hechas: 0, pendientes: 0, enCurso: 0, bloqueadas: 0 }
                        });
                    }

                    const group = groupsMap.get(dateStr)!;
                    group.tasks.push(t);
                    if (t.estado === 'Hecha') group.stats.hechas++;
                    else if (t.estado === 'EnCurso') group.stats.enCurso++;
                    else if (t.estado === 'Bloqueada') group.stats.bloqueadas++;
                    else group.stats.pendientes++;
                }
            });
        }

        const sortedGroups = Array.from(groupsMap.values())
            .sort((a, b) => b.date.localeCompare(a.date));

        setDays(sortedGroups);
    }, [tasks]);

    const toggleDay = (idx: string) => {
        setExpandedDays(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const selectTask = (task: Tarea) => {
        setSelectedTask(task);
        setEditForm({
            titulo: task.titulo,
            descripcion: task.descripcion || '',
            estado: task.estado,
            prioridad: task.prioridad,
            esfuerzo: task.esfuerzo,
            tipo: task.tipo || 'Administrativa',
            alcance: task.alcance || 'Local',
            progreso: task.progreso || 0,
            comentario: task.comentario || '',
            motivoBloqueo: task.motivoBloqueo || ''
        });
        setIsEditing(false);
    };

    const [loadingTasks, setLoadingTasks] = useState<Set<number>>(new Set());
    const [successTasks, setSuccessTasks] = useState<Set<number>>(new Set());

    const handleComplete = async (taskId: number) => {
        setLoadingTasks(prev => new Set(prev).add(taskId));
        setSaving(true);
        try {
            // 1. Update DB directly
            await clarityService.actualizarTarea(taskId, { estado: 'Hecha' } as any);

            // 2. Show Success (stop loading)
            setLoadingTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; });
            setSuccessTasks(prev => new Set(prev).add(taskId));

            // 3. Wait for feedback
            await new Promise(resolve => setTimeout(resolve, 800));

            // 4. Refresh Data
            await queryClient.invalidateQueries({ queryKey: ['mi-dia'] });

            setSelectedTask(null);
        } catch (e) {
            console.error(e);
            setLoadingTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; });
        } finally {
            setSaving(false);
            // Cleanup success state if component still alive
            setTimeout(() => {
                setSuccessTasks(prev => { const n = new Set(prev); n.delete(taskId); return n; });
            }, 500);
        }
    };

    const handleCancel = async (taskId: number) => {
        setSaving(true);
        try {
            await onTaskCancel?.(taskId);
            setSelectedTask(null);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!selectedTask) return;
        setSaving(true);
        try {
            await clarityService.actualizarTarea(selectedTask.idTarea, editForm as any);
            setIsEditing(false);
            const updated = { ...selectedTask, ...editForm } as Tarea;
            setSelectedTask(updated);
            if (onTaskComplete) await onTaskComplete(0);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const getStatusIcon = (estado: string) => {
        const icons: Record<string, React.ReactNode> = {
            'Hecha': <CheckCircle2 size={14} className="text-green-500" />,
            'EnCurso': <PlayCircle size={14} className="text-blue-500" />,
            'Pausa': <Pause size={14} className="text-orange-400" />,
            'Bloqueada': <AlertTriangle size={14} className="text-red-500" />,
            'Revision': <Circle size={14} className="text-purple-500" />,
            'Pendiente': <Circle size={14} className="text-yellow-500" />
        };
        return icons[estado] || <Circle size={14} className="text-gray-400" />;
    };

    const getStatusColor = (estado: string) => {
        const colors: Record<string, string> = {
            'Hecha': 'bg-green-500', 'EnCurso': 'bg-blue-500', 'Pausa': 'bg-orange-400',
            'Bloqueada': 'bg-red-500', 'Revision': 'bg-purple-500', 'Descartada': 'bg-gray-400', 'Pendiente': 'bg-yellow-500'
        };
        return colors[estado] || 'bg-gray-400';
    };

    return (
        <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* Timeline */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all ${selectedTask ? 'hidden' : 'w-full flex-1'}`}>
                {/* ... Header ... */}
                <div className="px-4 py-3 bg-rose-700 text-white shrink-0">
                    <h3 className="text-sm font-bold">🕰️ Tareas Atrasadas</h3>
                    <p className="text-xs text-rose-200">Pendientes de días anteriores</p>
                </div>

                <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
                    {/* ... Empty and Days map ... */}
                    {days.length === 0 && (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={24} />
                            </div>
                            <p className="text-slate-500 font-bold text-sm">¡Al día!</p>
                            <p className="text-slate-400 text-xs">No tienes tareas atrasadas.</p>
                        </div>
                    )}
                    {days.map((day, idx) => {
                        const isExpanded = expandedDays.has(String(idx));
                        const hasActivity = day.tasks.length > 0;

                        return (
                            <div key={day.date}>
                                <button onClick={() => toggleDay(String(idx))} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                    {/* ... Group Header ... */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold ${hasActivity ? 'bg-rose-500' : 'bg-gray-200'
                                                }`}>{hasActivity ? day.tasks.length : ''}</div>
                                            {idx < days.length - 1 && <div className="absolute top-5 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-gray-200" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-slate-700">{day.label}</p>
                                            <p className="text-[10px] text-gray-400">{day.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasActivity ? (isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />) :
                                            <span className="text-[10px] text-gray-300">Vacío</span>}
                                    </div>
                                </button>

                                {isExpanded && hasActivity && (
                                    <div className="pl-12 pr-4 pb-3 space-y-1.5">
                                        {day.tasks.map(task => {
                                            const isTaskLoading = loadingTasks.has(task.idTarea);
                                            const isSuccess = successTasks.has(task.idTarea);

                                            return (
                                                <div key={task.idTarea}
                                                    className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-all ${selectedTask?.idTarea === task.idTarea ? 'ring-2 ring-rose-500 bg-rose-50' : 'bg-gray-50 hover:bg-gray-100'
                                                        } ${task.estado === 'Hecha' || task.estado === 'Descartada' ? 'opacity-60' : ''}`}
                                                >
                                                    {/* 1. Área de Check - Completar Directo */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Evitar abrir popup
                                                            if (!isTaskLoading && !isSuccess && task.estado !== 'Hecha' && task.estado !== 'Descartada') {
                                                                handleComplete(task.idTarea);
                                                            }
                                                        }}
                                                        disabled={isTaskLoading || isSuccess}
                                                        className={`p-1 rounded-full hover:bg-black/5 transition-colors ${task.estado === 'Hecha' ? 'cursor-default' : 'cursor-pointer'}`}
                                                        title={task.estado === 'Hecha' ? 'Completada' : 'Marcar como Completada'}
                                                    >
                                                        {isTaskLoading ? (
                                                            <Loader2 size={14} className="animate-spin text-rose-500" />
                                                        ) : isSuccess ? (
                                                            <Check size={14} className="text-green-500 font-bold" />
                                                        ) : (
                                                            getStatusIcon(task.estado)
                                                        )}
                                                    </button>

                                                    {/* 2. Área de Contenido - Abrir Popup */}
                                                    <button
                                                        onClick={() => selectTask(task)}
                                                        className="flex-1 flex items-center gap-3 min-w-0 text-left"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm ${task.estado === 'Hecha' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.titulo}</span>
                                                                {task.proyecto?.nombre && (
                                                                    <span className="text-[10px] text-indigo-500 font-medium truncate">
                                                                        📁 {task.proyecto.nombre}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {task.progreso > 0 && task.progreso < 100 && (
                                                                <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden w-20">
                                                                    <div className={`h-full ${getStatusColor(task.estado)}`} style={{ width: `${task.progreso}%` }}></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${task.prioridad === 'Alta' ? 'bg-red-100 text-red-600' :
                                                                task.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-500'
                                                                }`}>{task.prioridad}</span>
                                                            <TipoBadge tipo={task.tipo} size="sm" />
                                                        </div>
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center shrink-0">
                    <p className="text-[10px] text-gray-400">{tasks?.length || 0} tareas atrasadas</p>
                </div>
            </div>

            {/* Panel de Tarea */}
            {selectedTask && (
                <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full">
                    <div className={`px-4 py-3 ${getStatusColor(selectedTask.estado)} text-white flex justify-between items-center shrink-0`}>
                        <div>
                            <p className="text-xs font-bold uppercase">{selectedTask.estado}</p>
                            <p className="text-[10px] opacity-80">{selectedTask.fechaObjetivo} • {selectedTask.progreso}%</p>
                        </div>
                        <button onClick={() => setSelectedTask(null)} className="p-1 hover:bg-white/20 rounded"><X size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {isEditing ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Título</label>
                                    <input type="text" value={editForm.titulo || ''} onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Descripción</label>
                                    <textarea value={editForm.descripcion || ''} onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                                        rows={3} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Estado</label>
                                        <select value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Prioridad</label>
                                        <select value={editForm.prioridad} onChange={(e) => setEditForm({ ...editForm, prioridad: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Tipo</label>
                                        <select value={editForm.tipo || 'Operativo'} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Alcance</label>
                                        <select value={editForm.alcance || 'Local'} onChange={(e) => setEditForm({ ...editForm, alcance: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ALCANCES.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase font-bold">Esfuerzo</label>
                                        <select value={editForm.esfuerzo} onChange={(e) => setEditForm({ ...editForm, esfuerzo: e.target.value as any })}
                                            className="w-full mt-1 px-2 py-2 border border-gray-200 rounded-lg text-sm outline-none">
                                            {ESFUERZOS.map(e => <option key={e} value={e}>{e}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Avance: {editForm.progreso || 0}%</label>
                                    <input type="range" min="0" max="100" step="5" value={editForm.progreso || 0}
                                        onChange={(e) => setEditForm({ ...editForm, progreso: Number(e.target.value) })} className="w-full mt-1" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase font-bold">Comentario</label>
                                    <textarea value={editForm.comentario || ''} onChange={(e) => setEditForm({ ...editForm, comentario: e.target.value })}
                                        rows={2} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none" placeholder="Notas..." />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">{selectedTask.titulo}</h3>
                                {selectedTask.descripcion ? <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTask.descripcion}</p> : <p className="text-sm text-gray-400 italic">Sin descripción</p>}

                                <div>
                                    <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Progreso</span><span className="font-bold">{selectedTask.progreso}%</span></div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${getStatusColor(selectedTask.estado)}`} style={{ width: `${selectedTask.progreso}%` }}></div></div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-gray-400">Prioridad</p><p className={`font-bold ${selectedTask.prioridad === 'Alta' ? 'text-red-500' : selectedTask.prioridad === 'Media' ? 'text-yellow-600' : 'text-gray-500'}`}>{selectedTask.prioridad}</p></div>
                                    <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-gray-400">Tipo</p><p className="font-bold text-gray-700">{selectedTask.tipo || '—'}</p></div>
                                    <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-gray-400">Alcance</p><p className="font-bold text-gray-700">{selectedTask.alcance || '—'}</p></div>
                                </div>

                                {selectedTask.comentario && <div className="bg-blue-50 p-3 rounded-lg"><p className="text-[10px] text-blue-600 uppercase font-bold mb-1">Notas</p><p className="text-sm text-blue-700">{selectedTask.comentario}</p></div>}
                                {selectedTask.proyecto && <div className="bg-indigo-50 p-3 rounded-lg text-xs"><p className="text-indigo-400">Proyecto</p><p className="font-bold text-indigo-700">{selectedTask.proyecto.nombre}</p></div>}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 space-y-2 shrink-0">
                        {isEditing ? (
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200">Cancelar</button>
                                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                                </button>
                            </div>
                        ) : selectedTask.estado !== 'Hecha' && selectedTask.estado !== 'Descartada' ? (
                            <>
                                <button onClick={() => handleComplete(selectedTask.idTarea)} disabled={saving} className="w-full py-2.5 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Completar
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditing(true)} className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-200">Editar</button>
                                    <button onClick={() => handleCancel(selectedTask.idTarea)} disabled={saving} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200 flex items-center justify-center gap-2"><X size={14} /> Descartar</button>
                                </div>
                            </>
                        ) : <p className="text-center text-sm text-gray-400 py-2">Tarea {selectedTask.estado === 'Hecha' ? 'completada ✓' : 'descartada'}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};



