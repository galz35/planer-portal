// Last Sync Attempt: Force Update 2026-02-18
import React, { useState, useEffect } from 'react';
import type { Tarea, CheckinUpsertDto, Bloqueo, Proyecto } from '../../../types/modelos';
import { Plus, CheckCircle2, Circle, MessageSquare, Send, Trash2, Save } from 'lucide-react';
import { TaskDetailModalV2 } from '../../../components/task-detail-v2/TaskDetailModalV2';
import { TaskSelectorOverlay } from './TaskSelectorOverlay';
import { useToast } from '../../../context/ToastContext';
import { clarityService } from '../../../services/clarity.service';
import { useMiDiaContext } from '../context/MiDiaContext';

interface Props {
    disponibles: Tarea[];
    checkinTasks?: Tarea[];
    onSubmit: (dto: CheckinUpsertDto) => Promise<void>;
    userId: number;
    userCarnet?: string;
    fecha: string;
    initialData?: CheckinUpsertDto;
    onTaskCreated?: () => Promise<void>;
    bloqueos?: Bloqueo[];
    onMoodChange?: (mood: 'Tope' | 'Bien' | 'Bajo') => void;
}

export const CheckinForm: React.FC<Props> = ({ disponibles, checkinTasks = [], onSubmit, userId, userCarnet, fecha, initialData, onTaskCreated, bloqueos = [] }) => {
    // Form State
    const { showToast } = useToast();
    const { agendaConfig: config } = useMiDiaContext();

    // Slots State
    const [entregoIds, setEntregoIds] = useState<(number | null)[]>([null]);
    const [gestionIds, setGestionIds] = useState<(number | null)[]>([null]);
    const [rapidaIds, setRapidaIds] = useState<(number | null)[]>([null]);

    // UI State
    const [selectingFor, setSelectingFor] = useState<{ type: 'Entrego' | 'Avanzo' | 'Extra', index: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [editingTask, setEditingTask] = useState<Tarea | null>(null);

    const [quickLogId, setQuickLogId] = useState<number | null>(null);
    const [quickLogText, setQuickLogText] = useState('');
    const [viewBlockers, setViewBlockers] = useState(false);
    const [lastCreationProjectId, setLastCreationProjectId] = useState<number | ''>('');
    const [localTasks, setLocalTasks] = useState<Tarea[]>([]);

    const [projects, setProjects] = useState<Proyecto[]>([]);

    useEffect(() => {
        const loadInit = async () => {
            try {
                const p = await clarityService.getProyectos();
                const projectList = (p as any).items || p || [];
                const sorted = [...projectList].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
                setProjects(sorted);
            } catch { }
        };
        loadInit();
    }, []);

    useEffect(() => {
        if (initialData) {
            if (initialData.entrego && initialData.entrego.length > 0) {
                setEntregoIds([...initialData.entrego, null]); // Siempre un slot extra disponible
            }
            if (initialData.avanzo && initialData.avanzo.length > 0) {
                setGestionIds([...initialData.avanzo, null]);
            }
            if (initialData.extras && initialData.extras.length > 0) {
                setRapidaIds([...initialData.extras, null]);
            }
        }
    }, [initialData]);

    const getTask = (id: number | null | string) => {
        if (!id) return null;
        const numericId = Number(id);
        return disponibles.find(t => Number(t.idTarea) === numericId) ||
            checkinTasks.find(t => Number(t.idTarea) === numericId) ||
            localTasks.find(t => Number(t.idTarea) === numericId);
    };

    const isSelected = (id: number | string) => {
        const numId = Number(id);
        return [...entregoIds, ...gestionIds, ...rapidaIds].some(i => Number(i) === numId);
    };

    const addSlot = (type: 'Entrego' | 'Avanzo' | 'Extra') => {
        if (type === 'Entrego') setEntregoIds(p => [...p, null]);
        if (type === 'Avanzo') setGestionIds(p => [...p, null]);
        if (type === 'Extra') setRapidaIds(p => [...p, null]);
    };

    const removeSlot = (e: React.MouseEvent, type: 'Entrego' | 'Avanzo' | 'Extra', index: number) => {
        e.stopPropagation();
        const update = (prev: (number | null)[]) => {
            const newVal = [...prev];
            if (newVal[index] !== null) {
                newVal[index] = null;
            } else {
                if (newVal.length > 1) newVal.splice(index, 1);
            }
            return newVal;
        };
        if (type === 'Entrego') setEntregoIds(update);
        if (type === 'Avanzo') setGestionIds(update);
        if (type === 'Extra') setRapidaIds(update);
    };

    const handleSelectTask = (task: Tarea) => {
        if (!selectingFor) return;
        const { type, index } = selectingFor;
        const clear = (prev: (number | null)[]) => prev.map(id => (id !== null && Number(id) === Number(task.idTarea)) ? null : id);
        setEntregoIds(clear);
        setGestionIds(clear);
        setRapidaIds(clear);

        const assignAndAddNull = (prev: (number | null)[]) => {
            const n = [...prev];
            n[index] = task.idTarea;
            // Verificar si hay algún slot vacío, sino agregar uno
            if (!n.some(item => item === null)) {
                n.push(null);
            }
            return n;
        };

        if (type === 'Entrego') setEntregoIds(assignAndAddNull);
        if (type === 'Avanzo') setGestionIds(assignAndAddNull);
        if (type === 'Extra') setRapidaIds(assignAndAddNull);
        setSelectingFor(null);
    };

    const handleQuickAdd = async (val: string, _type?: any, _index?: any, projectId?: number) => {
        if (!val.trim() || !selectingFor) return;
        setLastCreationProjectId(projectId !== undefined ? projectId : '');
        try {
            const newT = await clarityService.postTareaRapida({
                titulo: val,
                idUsuario: userId,
                idProyecto: projectId,
                prioridad: 'Alta',
                esfuerzo: 'M',
                fechaObjetivo: fecha,
                fechaInicioPlanificada: fecha
            });
            if (onTaskCreated) await onTaskCreated();
            const realProject = projects.find(p => p.idProyecto === projectId);
            const titulo = (newT as any).titulo || (newT as any).nombre || val;
            const tempTask = { ...newT, titulo, proyecto: realProject || { nombre: 'Inbox' } } as unknown as Tarea;
            setLocalTasks(prev => [...prev, tempTask]);
            handleSelectTask(tempTask);
        } catch (err) { showToast('Error creando tarea', 'error'); }
    };

    const validate = () => {
        const validEntrego = entregoIds.filter(id => id !== null);
        if (validEntrego.length === 0) {
            // Permitir guardar sin tareas, pero confirmar
            const ok = window.confirm('Tu plan principal está vacío. ¿Deseas guardar así?');
            return ok;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const validEntregoIds = entregoIds.filter((id): id is number => id !== null);
        const validGestionIds = gestionIds.filter((id): id is number => id !== null);
        const validRapidaIds = rapidaIds.filter((id): id is number => id !== null);

        const getTitle = (id: number | undefined) => id ? getTask(id)?.titulo || '' : '';
        const prioridad1 = getTitle(validEntregoIds[0]);
        const prioridad2 = getTitle(validEntregoIds[1]);
        const prioridad3 = getTitle(validEntregoIds[2]);

        let generatedGoalText = validEntregoIds.map(id => getTask(id)?.titulo || '').filter(Boolean).join(' + ');
        if (!generatedGoalText) generatedGoalText = initialData?.entregableTexto || 'Plan de Trabajo';
        if (generatedGoalText.length > 3900) generatedGoalText = generatedGoalText.substring(0, 3900) + '...';

        setSubmitting(true);
        try {
            await onSubmit({
                idUsuario: userId,
                usuarioCarnet: userCarnet,
                fecha,
                entregableTexto: generatedGoalText,
                entrego: validEntregoIds,
                avanzo: validGestionIds,
                extras: validRapidaIds,
                prioridad1, prioridad2, prioridad3,
                linkEvidencia: initialData?.linkEvidencia
            });
        } catch (err) { showToast('Error al enviar check-in', 'error'); } finally { setSubmitting(false); }
    };

    const handleToggleComplete = async (task: Tarea, e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = task.estado === 'Hecha' ? 'EnCurso' : 'Hecha';
        try {
            await clarityService.actualizarTarea(task.idTarea, { estado: newState });
            if (onTaskCreated) await onTaskCreated();
        } catch (err) { showToast('Error al actualizar', 'error'); }
    };

    const handleQuickLogSubmit = async (e: React.FormEvent, taskId: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!quickLogText.trim()) return;
        try {
            await clarityService.postAvance(taskId, { idUsuario: userId, progreso: 0, comentario: quickLogText });
            setQuickLogId(null);
            setQuickLogText('');
            if (onTaskCreated) await onTaskCreated();
        } catch (err) { showToast('Error guardando bitácora', 'error'); }
    };

    const handleSlotClick = (type: 'Entrego' | 'Avanzo' | 'Extra', index: number, currentId: number | null) => {
        if (!currentId) {
            setSelectingFor({ type, index });
        } else {
            const task = getTask(currentId);
            if (task) setEditingTask(task);
        }
    };

    const renderCard = (type: 'Entrego' | 'Avanzo' | 'Extra', id: number | null, idx: number) => {
        const task = getTask(id);
        const isQuickLogging = id !== null && quickLogId === id;
        let activeBorder = 'border-l-4 border-l-rose-500';
        if (type === 'Avanzo') activeBorder = 'border-l-4 border-l-blue-500';
        if (type === 'Extra') activeBorder = 'border-l-4 border-l-amber-500';
        let bgClass = 'bg-white';
        if (id && isQuickLogging) bgClass = 'bg-indigo-50 shadow-md ring-1 ring-indigo-200';

        return (
            <div key={`${type}-${id || idx}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSlotClick(type, idx, id);
                    }
                }}
                onClick={(e) => {
                    if (isQuickLogging) return;
                    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                    handleSlotClick(type, idx, id);
                }}
                className={`group relative p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer animate-fade-in
                ${id ? `shadow-sm ${activeBorder} ${bgClass}` : 'border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
                {id && task ? (
                    isQuickLogging ? (
                        <div className="w-full flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <input autoFocus value={quickLogText} onChange={(e) => setQuickLogText(e.target.value)} placeholder="Escribe bitácora..." className="flex-1 text-xs bg-white border border-indigo-200 rounded px-2 py-1 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleQuickLogSubmit(e, id)} />
                            <button type="submit" onClick={(e) => handleQuickLogSubmit(e, id)} className="text-white bg-indigo-500 p-1 rounded hover:bg-indigo-600"><Send size={12} /></button>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <button onClick={(e) => handleToggleComplete(task, e)} className={`shrink-0 ${task.estado === 'Hecha' ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-400'}`}>
                                    {task.estado === 'Hecha' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                </button>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-sm font-semibold truncate ${task.estado === 'Hecha' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.titulo}</span>
                                    <span className="text-[10px] text-indigo-500 font-medium truncate">📁 {task.proyectoNombre || task.proyecto?.nombre || 'Inbox'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setQuickLogId(prev => prev === id ? null : id); }} className="p-1 hover:bg-slate-100 rounded text-slate-400" title="Bitácora rápida"><MessageSquare size={14} /></button>
                                <button onClick={(e) => removeSlot(e, type, idx)} className="p-1 hover:bg-rose-50 rounded text-rose-300 hover:text-rose-500" title="Quitar"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="flex items-center gap-2 h-full">
                        <Plus size={16} />
                        <span className="text-xs font-medium">Agregar Tarea</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col gap-4 animate-fade-in max-w-7xl mx-auto pb-6 relative">
            {editingTask && <TaskDetailModalV2 task={editingTask} mode="execution" onClose={() => setEditingTask(null)} onUpdate={async () => { if (onTaskCreated) await onTaskCreated(); setEditingTask(null); }} />}
            {selectingFor && <TaskSelectorOverlay disponibles={disponibles} selectionContext={selectingFor} onClose={() => setSelectingFor(null)} onSelect={handleSelectTask} isSelected={isSelected} onQuickAdd={handleQuickAdd} projects={projects} defaultProjectId={lastCreationProjectId} />}

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Mi Plan del Día</h2>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full flex items-center gap-4">
                    {bloqueos.length > 0 && (
                        <div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setViewBlockers(true)}
                            onClick={() => setViewBlockers(true)}
                            className="flex-1 bg-red-50 p-2 rounded-xl border border-red-100 shadow-sm flex items-center gap-2 text-xs text-red-600 cursor-pointer hover:bg-red-100 transition-colors py-3 px-4"
                        >
                            <span className="font-bold whitespace-nowrap">🚫 BLOQUEOS ({bloqueos.length}):</span>
                            <div className="overflow-hidden relative flex-1">
                                <div className="whitespace-nowrap animate-marquee flex gap-4">
                                    {bloqueos.map((b, i) => <span key={`blocker-${b.idBloqueo || i}`} className="flex items-center gap-1"><span className="font-bold">{b.destinoUsuario?.nombre}</span><span className="opacity-70">({b.motivo})</span></span>)}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="hidden md:block mx-auto">
                    <button type="button" onClick={(e) => handleSubmit(e as any)} disabled={submitting} className="bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-12 rounded-xl shadow-xl shadow-slate-200 active:scale-[0.95] transition-all disabled:opacity-70 flex items-center gap-3 text-sm whitespace-nowrap">
                        <Save size={18} /> {submitting ? 'Guardando...' : 'GUARDAR AGENDA'}
                    </button>
                </div>
            </div>

            <div className={`grid gap-6 flex-1 items-start transition-all ${(config.showGestion && config.showRapida) ? 'grid-cols-1 md:grid-cols-3' : (config.showGestion || config.showRapida) ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 min-h-[15rem]">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-50"><div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs ring-4 ring-rose-50">1</div><h4 className="font-bold text-slate-800 text-sm">Principal</h4></div>
                    <div className="space-y-2 flex-1">{entregoIds.map((id, idx) => renderCard('Entrego', id, idx))}<p className="text-[11px] text-slate-400 leading-tight px-1 italic mt-2">Foco principal (Prioritario).</p></div>
                    <button type="button" onClick={() => addSlot('Entrego')} className="text-xs font-bold text-rose-500 hover:text-rose-700 flex justify-center py-2 opacity-60 hover:opacity-100 transition-opacity">+ Agregar Tarea</button>
                </div>
                {config.showGestion && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 min-h-[15rem]">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-50"><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-4 ring-blue-50">2</div><h4 className="font-bold text-slate-800 text-sm">Gestión / Avance</h4></div>
                        <div className="space-y-2 flex-1">{gestionIds.map((id, idx) => renderCard('Avanzo', id, idx))}<p className="text-[11px] text-slate-400 leading-tight px-1 italic mt-2">Tareas secundarias o seguimiento.</p></div>
                        <button type="button" onClick={() => addSlot('Avanzo')} className="text-xs font-bold text-blue-500 hover:text-blue-700 flex justify-center py-2 opacity-60 hover:opacity-100 transition-opacity">+ Agregar Tarea</button>
                    </div>
                )}
                {config.showRapida && (
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 min-h-[15rem]">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-50"><div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs ring-4 ring-amber-50">3</div><h4 className="font-bold text-slate-800 text-sm">Rápida / Extra</h4></div>
                        <div className="space-y-2 flex-1">{rapidaIds.map((id, idx) => renderCard('Extra', id, idx))}<p className="text-[11px] text-slate-400 leading-tight px-1 italic mt-2">Tareas pequeñas o adicionales.</p></div>
                        <button type="button" onClick={() => addSlot('Extra')} className="text-xs font-bold text-amber-500 hover:text-amber-700 flex justify-center py-2 opacity-60 hover:opacity-100 transition-opacity">+ Agregar Tarea</button>
                    </div>
                )}
            </div>

            {viewBlockers && bloqueos.length > 0 && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewBlockers(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-rose-600 mb-4 flex items-center gap-2">🚫 Bloqueos Activos</h3>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                            {bloqueos.map((b, i) => (
                                <div key={`modal-blocker-${b.idBloqueo || i}`} className="bg-rose-50 p-3 rounded-lg border border-rose-100">
                                    <div className="flex justify-between items-start mb-1"><span className="font-bold text-rose-800 text-sm">{b.destinoUsuario?.nombre || 'Desconocido'}</span><span className="text-[10px] bg-white px-2 py-0.5 rounded text-rose-400 border border-rose-100 font-bold">BLOQUEA</span></div>
                                    <p className="text-sm text-slate-700 mb-2 font-medium">"{b.motivo}"</p>
                                    {b.accionMitigacion && <div className="text-xs text-slate-500 bg-white p-2 rounded border border-rose-100 italic">👉 Mientras espero: {b.accionMitigacion}</div>}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setViewBlockers(false)} className="w-full mt-4 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Cerrar</button>
                    </div>
                </div>
            )}

            <div className="md:hidden sticky bottom-4 z-40">
                <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-xl shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">{submitting ? 'Guardando...' : 'Guardar Agenda'}</button>
            </div>
        </form>
    );
};
