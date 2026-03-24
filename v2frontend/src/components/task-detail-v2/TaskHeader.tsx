import React from 'react';
import { X, AlignLeft, Lock, Users } from 'lucide-react';
import type { Tarea } from '../../types/modelos';

interface Props {
    task: Tarea;
    titulo: string;
    setTitulo: (v: string) => void;
    onClose: () => void;
    mode: 'planning' | 'execution';
    isStrategic?: boolean;
    subtasksCount?: number;
}

export const TaskHeader: React.FC<Props> = ({
    task, titulo, setTitulo, onClose, mode, isStrategic, subtasksCount
}) => {
    return (
        <div className="px-6 py-4 border-b flex justify-between items-start bg-slate-50/50 relative overflow-hidden shrink-0">
            {isStrategic && <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600" />}

            <div className="flex-1 pr-8 pl-1 min-w-0">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 overflow-hidden">
                    <span className="truncate max-w-[120px]">{task.proyectoNombre || task.proyecto?.nombre || 'General'}</span>
                    {task.idTareaPadre && (
                        <>
                            <span>/</span>
                            <span className="truncate max-w-[150px] flex items-center gap-1 text-blue-500">
                                <AlignLeft size={10} /> Padre #{task.idTareaPadre}
                            </span>
                        </>
                    )}
                    {mode === 'execution' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px]">EN EJECUCIÓN</span>
                    )}
                </div>

                {/* Badges */}
                <div className="flex gap-2 mb-2 items-center">
                    {isStrategic ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1 border border-purple-200 shadow-sm">
                            <Lock size={10} /> Estratégico
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                            Operativo
                        </span>
                    )}

                    <span className={
                        'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ' +
                        (task.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700')
                    }>
                        {task.prioridad}
                    </span>

                    {subtasksCount && subtasksCount > 0 ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 flex items-center gap-1 border border-indigo-100">
                            <Users size={10} /> {subtasksCount} Subtareas
                        </span>
                    ) : null}
                </div>

                {/* Title Input */}
                <textarea
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    readOnly={false}
                    onInput={(e) => {
                        e.currentTarget.style.height = 'auto';
                        e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                    }}
                    rows={titulo.length > 60 ? 2 : 1}
                    className="font-bold text-xl text-slate-800 leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none w-full transition-all py-1 -ml-1 pl-1 rounded resize-none overflow-hidden"
                    placeholder="Nombre de la tarea"
                    style={{ height: 'auto' }}
                />
            </div>

            <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-100 shadow-sm transition-transform active:scale-95">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
