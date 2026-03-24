import React from 'react';
import { X, Calendar as CalendarIcon, Link2, AlertCircle, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
// import { es } from 'date-fns/locale';
import type { Tarea, Proyecto } from '../../../types/modelos';
import type { Comment } from '../../../types/plan-trabajo.types';
import { LockedField } from './LockedField';
import { UserAvatar } from './UserAvatar';
import { clarityService } from '../../../services/clarity.service';

interface TaskDetailsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    task: Tarea;
    setTask: (task: Tarea) => void;
    isManagerMode: boolean;
    selectedProject: Proyecto | null;
    comments: Comment[];
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: () => void;
    handleDeleteComment: (id: number) => void;
    isReportingBlocker: boolean;
    setIsReportingBlocker: (v: boolean) => void;
    blockerReason: string;
    setBlockerReason: (v: string) => void;
    blockerArea: string;
    setBlockerArea: (v: string) => void;
    handleReportBlocker: () => void;
    handleSaveChanges: () => void;
    isSaving: boolean;
    setIsAvanceMensualOpen: (v: boolean) => void;
    showToast: (msg: string, type?: any) => void;
}

export const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({
    isOpen,
    onClose,
    task,
    setTask,
    isManagerMode,
    selectedProject,
    comments,
    newComment,
    setNewComment,
    handleAddComment,
    handleDeleteComment,
    isReportingBlocker,
    setIsReportingBlocker,
    blockerReason,
    setBlockerReason,
    blockerArea,
    setBlockerArea,
    handleReportBlocker,
    handleSaveChanges,
    isSaving,
    setIsAvanceMensualOpen,
    showToast
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-full md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-100">
            {/* PANEL HEADER */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                        <CalendarIcon size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 tracking-tight">Detalles de Tarea</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID #{task.idTarea}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95"
                    >
                        {isSaving ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                    </button>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* PANEL CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* TITLE & DESCRIPTION */}
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block ml-1">Título de la Tarea</label>
                        <input
                            className="w-full text-sm font-black text-slate-800 bg-white border-b-2 border-slate-100 px-1 py-1 outline-none focus:border-indigo-500 transition-all placeholder:font-normal"
                            value={task.titulo}
                            onChange={(e) => setTask({ ...task, titulo: e.target.value })}
                            placeholder="Nombre de la tarea..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block ml-1">Descripción</label>
                        <textarea
                            className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:bg-white focus:border-indigo-400 transition-all min-h-[100px] leading-relaxed"
                            value={task.descripcion || ''}
                            onChange={(e) => setTask({ ...task, descripcion: e.target.value })}
                            placeholder="Añade una descripción detallada..."
                        />
                    </div>
                </div>

                {/* DATES */}
                <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Planificación</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Inicio Planificado</label>
                            <LockedField
                                isLocked={!isManagerMode && ((task as any).isLockedByManager || selectedProject?.enllavado)}
                                onProposal={async () => {
                                    const newDate = prompt("Proponer nueva fecha inicio (YYYY-MM-DD):", task.fechaInicioPlanificada ? format(new Date(task.fechaInicioPlanificada), 'yyyy-MM-dd') : '');
                                    if (newDate) {
                                        const motivo = prompt("Motivo del cambio (requerido):", "Reprogramación por bloqueo externo");
                                        if (motivo !== null) {
                                            try {
                                                await clarityService.solicitarCambio(task.idTarea, 'Inicio', newDate, motivo || 'Sin motivo especificado');
                                                showToast("Solicitud de cambio de fecha inicio enviada", "success");
                                            } catch (error) {
                                                console.error(error);
                                                showToast("Error al enviar la solicitud", "error");
                                            }
                                        }
                                    }
                                }}
                            >
                                <input
                                    type="date"
                                    className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none ${isManagerMode || !((task as any).isLockedByManager || selectedProject?.enllavado) ? 'focus:border-slate-400' : 'cursor-not-allowed opacity-70'}`}
                                    value={task.fechaInicioPlanificada ? String(task.fechaInicioPlanificada).split('T')[0] : ''}
                                    onChange={(e) => (isManagerMode || !((task as any).isLockedByManager || selectedProject?.enllavado)) && setTask({ ...task, fechaInicioPlanificada: e.target.value ? e.target.value : undefined })}
                                    readOnly={!isManagerMode && ((task as any).isLockedByManager || selectedProject?.enllavado)}
                                />
                            </LockedField>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Vencimiento</label>
                            <input
                                type="date"
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
                                value={task.fechaObjetivo ? String(task.fechaObjetivo).split('T')[0] : ''}
                                onChange={(e) => setTask({ ...task, fechaObjetivo: e.target.value ? e.target.value : undefined })}
                            />
                        </div>
                    </div>
                </div>

                {/* TIPO Y EVIDENCIA */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Tipo Trabajo</label>
                        <select
                            value={task.tipo || 'Administrativa'}
                            onChange={(e) => setTask({ ...task, tipo: e.target.value as any })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
                        >
                            <option value="Administrativa">Administrativa</option>
                            <option value="Logistica">Logística</option>
                            <option value="Estrategica">Estratégica</option>
                            <option value="Otros">Otros</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">Evidencia (URL)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={task.linkEvidencia || ''}
                                onChange={(e) => setTask({ ...task, linkEvidencia: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 pl-6 text-xs text-slate-600 outline-none focus:border-slate-400 truncate"
                            />
                            <Link2 size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* STATUS & PRIORITY */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block ml-1">Estado</label>
                        <select
                            value={task.estado}
                            onChange={(e) => {
                                const st = e.target.value as any;
                                let prog = task.progreso || 0;
                                if (st === 'Hecha') prog = 100;
                                else if (task.estado === 'Hecha' && prog === 100) prog = 90; 
                                setTask({ ...task, estado: st, progreso: prog });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 transition-all capitalize"
                        >
                            <option value="Pendiente">⏳ Pendiente</option>
                            <option value="EnCurso">🚀 En Curso</option>
                            <option value="Hecha">✅ Finalizada</option>
                            <option value="Bloqueada">⚠️ Bloqueada</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 block ml-1">Prioridad</label>
                        <select
                            value={task.prioridad}
                            onChange={(e) => setTask({ ...task, prioridad: e.target.value as any })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-400 transition-all capitalize"
                        >
                            <option value="Baja">🟢 Baja</option>
                            <option value="Normal">🔵 Normal</option>
                            <option value="Alta">🔴 Alta</option>
                            <option value="Critica">⚡ Crítica</option>
                        </select>
                    </div>
                </div>

                {/* PROGRESS */}
                {task.comportamiento === 'LARGA' ? (
                    <div className="mb-4">
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700">Avance Mensual (Larga Duración)</label>
                            <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">
                                {task.progreso || 0}% Global
                            </span>
                        </div>
                        <button
                            onClick={() => setIsAvanceMensualOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-indigo-200 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm group"
                        >
                            <CalendarIcon size={16} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                            Gestionar Avance y Comentarios
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700">Progreso</label>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${task.estado === 'Bloqueada' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                {task.progreso || 0}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer ${task.estado === 'Bloqueada' ? 'accent-red-500' : 'accent-slate-700'}`}
                            value={task.progreso || 0}
                            onChange={(e) => {
                                const newProg = parseInt(e.target.value);
                                let newState = task.estado;
                                if (newProg === 100) newState = 'Hecha';
                                else if (task.estado === 'Hecha' && newProg < 100) newState = 'EnCurso';
                                else if (task.estado === 'Pendiente' && newProg > 0) newState = 'EnCurso';
                                
                                setTask({ ...task, progreso: newProg, estado: newState });
                            }}
                        />
                    </div>
                )}

                <hr className="border-slate-100" />

                {/* BLOCKER SECTION */}
                <div>
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                        <AlertCircle size={14} /> Gestión de Riesgos
                    </h4>

                    {task.estado === 'Bloqueada' ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-in zoom-in-95">
                            <div className="flex items-start gap-3">
                                <div className="bg-rose-100 p-2 rounded-full text-rose-600 shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-rose-700 text-sm">Tarea Bloqueada</h5>
                                    <p className="text-xs text-rose-600 mt-1">Esta tarea presenta impedimentos y requiere atención.</p>
                                </div>
                                <button
                                    onClick={() => setTask({ ...task, estado: 'EnCurso' })}
                                    className="ml-auto text-xs font-bold text-rose-600 border border-rose-200 bg-white px-3 py-1.5 rounded-lg hover:bg-rose-50"
                                >
                                    Desbloquear
                                </button>
                            </div>
                        </div>
                    ) : (
                        isReportingBlocker ? (
                            <div className="bg-rose-50 border border-slate-200 rounded-xl p-4 animate-in zoom-in-95 space-y-3">
                                <h5 className="font-bold text-slate-700 text-xs uppercase">Detalles del Bloqueo</h5>
                                <textarea
                                    className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200 transition-all placeholder:text-slate-400"
                                    placeholder="Describa qué está impidiendo avanzar (Opcional)..."
                                    rows={2}
                                    value={blockerReason}
                                    onChange={(e) => setBlockerReason(e.target.value)}
                                    autoFocus
                                />
                                <div>
                                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Área responsable (Opcional)</label>
                                    <select
                                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-rose-400"
                                        value={blockerArea}
                                        onChange={(e) => setBlockerArea(e.target.value)}
                                    >
                                        <option value="">Seleccionar área...</option>
                                        <option value="IT">Tecnología (IT)</option>
                                        <option value="RRHH">Recursos Humanos</option>
                                        <option value="FIN">Finanzas</option>
                                        <option value="OPS">Operaciones</option>
                                        <option value="EXT">Proveedor Externo</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        onClick={() => setIsReportingBlocker(false)}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleReportBlocker}
                                        className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 shadow-sm"
                                    >
                                        Confirmar Bloqueo
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsReportingBlocker(true)}
                                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-all group"
                            >
                                <AlertCircle size={16} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Reportar Bloqueo o Impedimento</span>
                            </button>
                        )
                    )}
                </div>

                {/* COMMENTS SECTION */}
                <div className="flex-1 flex flex-col min-h-[200px]">
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-3 flex items-center gap-2">
                        <MoreVertical size={14} /> Comentarios
                    </h4>

                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-[200px]">
                        <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[300px]">
                            {(!comments || comments.length === 0) && (
                                <div className="text-center py-6 text-slate-400 italic text-xs">
                                    No hay comentarios. Sé el primero.
                                </div>
                            )}
                            {(comments || []).map(c => (
                                <div key={c.id} className="flex gap-3 group/comment">
                                    <UserAvatar name={c.user} />
                                    <div className="flex-1 bg-white p-2.5 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm relative">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="text-[11px] font-bold text-slate-800">{c.user}</span>
                                            <span className="text-[9px] text-slate-400">{c.timestamp}</span>
                                        </div>
                                        <p className="text-xs text-slate-600">{c.text}</p>
                                        {c.isMine && c.dateObj && new Date().toDateString() === c.dateObj.toDateString() && (
                                            <button
                                                onClick={() => handleDeleteComment(c.id)}
                                                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover/comment:opacity-100 transition-all"
                                                title="Eliminar comentario"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 bg-white border-t border-slate-100 flex gap-2">
                            <input
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-slate-400 focus:bg-white transition-colors"
                                placeholder="Escribe un comentario..."
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            />
                            <button
                                onClick={handleAddComment}
                                disabled={!newComment.trim()}
                                className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-6"></div> {/* Spacer */}
            </div>
        </div>
    );
};
