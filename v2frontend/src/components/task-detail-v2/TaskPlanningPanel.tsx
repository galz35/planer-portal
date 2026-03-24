import React from 'react';
import { Calendar, Lock, FileSignature, Users } from 'lucide-react';
import type { Tarea } from '../../types/modelos';

interface Props {
    task: Tarea;
    fechaInicioPlanificada: string;
    setFechaInicioPlanificada: (v: string) => void;
    fechaObjetivo: string;
    setFechaObjetivo: (v: string) => void;
    isLocked: boolean;
    onRequestChange: (field: 'fechaObjetivo' | 'fechaInicioPlanificada') => void;
}

export const TaskPlanningPanel: React.FC<Props> = ({
    task,
    fechaInicioPlanificada, setFechaInicioPlanificada,
    fechaObjetivo, setFechaObjetivo,
    isLocked,
    onRequestChange
}) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha Inicio */}
                <div className={'space-y-1 p-3 rounded-lg border ' + (isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent')}>
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1"><Calendar size={12} /> Fecha Inicio</span>
                        {isLocked && <Lock size={10} className="text-slate-400" />}
                    </label>

                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={fechaInicioPlanificada}
                            onChange={(e) => setFechaInicioPlanificada(e.target.value)}
                            disabled={false}
                            className="w-full text-sm font-bold text-slate-700 outline-none py-1 bg-transparent border-b-2 border-slate-200 focus:border-blue-500"
                        />

                        {isLocked && (
                            <button
                                onClick={() => onRequestChange('fechaInicioPlanificada')}
                                className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100"
                                title="Solicitar cambio de fecha"
                            >
                                <FileSignature size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Fecha Objetivo */}
                <div className={'space-y-1 p-3 rounded-lg border ' + (isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent')}>
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center justify-between">
                        <span className="flex items-center gap-1"><Calendar size={12} /> Fecha Objetivo</span>
                        {isLocked && <Lock size={10} className="text-slate-400" />}
                    </label>

                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={fechaObjetivo}
                            onChange={(e) => setFechaObjetivo(e.target.value)}
                            disabled={false}
                            className="w-full text-sm font-bold text-slate-700 outline-none py-1 bg-transparent border-b-2 border-slate-200 focus:border-blue-500"
                        />

                        {isLocked && (
                            <button
                                onClick={() => onRequestChange('fechaObjetivo')}
                                className="p-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs hover:bg-purple-100"
                                title="Solicitar cambio de fecha"
                            >
                                <FileSignature size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 p-3">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users size={12} /> Creador</label>
                    <div className="text-sm font-bold text-slate-700 py-1 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
                            {(task.creador?.nombre || 'Sys').substring(0, 2).toUpperCase()}
                        </div>
                        <span>{task.creador?.nombre || 'Sistema'}</span>
                    </div>
                </div>
                <div className="space-y-1 p-3">
                    <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1"><Users size={12} /> Responsable</label>
                    <div className="text-sm font-bold text-slate-700 py-1 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">
                            {(task.asignados?.find(a => a.tipo === 'Responsable')?.usuario?.nombre || 'Yo').substring(0, 2)}
                        </div>
                        <span>{task.asignados?.find(a => a.tipo === 'Responsable')?.usuario?.nombre || 'Yo (Asignado)'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
