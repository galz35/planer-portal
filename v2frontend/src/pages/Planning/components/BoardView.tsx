import React from 'react';
import { format, differenceInDays, isAfter, startOfDay } from 'date-fns';
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import type { TeamMember } from '../../../types/plan-trabajo.types';
import { QuickAssignDropdown } from './QuickAssignDropdown';
import { TipoBadge } from '../../../components/ui/TipoBadge';

export const BoardView: React.FC<{
    tasks: Tarea[],
    team: TeamMember[],
    allUsers?: TeamMember[],
    onAssign: (tid: number, uid: number) => void,
    onTaskClick: (t: Tarea) => void
}> = ({ tasks, team, allUsers, onAssign, onTaskClick }) => {
    const columns = ['Pendiente', 'En Curso', 'Bloqueada', 'Revisión', 'Hecha'];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'bg-slate-400';
            case 'En Curso': return 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]';
            case 'Bloqueada': return 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]';
            case 'Revisión': return 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
            case 'Hecha': return 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]';
            default: return 'bg-slate-400';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'En Curso': return 'En Ejecución';
            case 'Hecha': return 'Completado';
            default: return status;
        }
    };

    return (
        <div className="flex gap-6 h-full overflow-x-auto pb-8 pt-2 px-6 custom-scrollbar">
            {columns.map(status => (
                <div key={status} className="w-[340px] shrink-0 flex flex-col bg-slate-100/30 rounded-[2rem] border border-white/40 shadow-xl backdrop-blur-xl overflow-hidden">
                    {/* Header */}
                    <div className="p-6 flex justify-between items-center bg-white/40 border-b border-white/20 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(status)} ring-4 ring-white/30`} />
                            <h3 className="font-black text-xs text-slate-800 uppercase tracking-[0.25em]">{getStatusLabel(status)}</h3>
                        </div>
                        <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-sm border border-slate-100">
                            {tasks.filter(t => t.estado === status || (status === 'En Curso' && t.estado === 'EnCurso') || (status === 'Revisión' && (t.estado === 'Revision' || t.estado === 'Revisión'))).length}
                        </span>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar min-h-[500px]">
                        {tasks.filter(t => t.estado === status || (status === 'En Curso' && t.estado === 'EnCurso') || (status === 'Revisión' && (t.estado === 'Revision' || t.estado === 'Revisión'))).map(task => {
                            const daysDelayed = task.fechaObjetivo && task.estado !== 'Hecha' && isAfter(startOfDay(new Date()), new Date(task.fechaObjetivo))
                                ? differenceInDays(startOfDay(new Date()), new Date(task.fechaObjetivo))
                                : 0;
                            const isDone = task.estado === 'Hecha';
                            const isDelayed = daysDelayed > 0;

                            return (
                                <div
                                    key={task.idTarea}
                                    onClick={() => onTaskClick(task)}
                                    className={`group relative p-6 rounded-3xl border bg-white shadow-sm hover:shadow-2xl hover:-translate-y-1 active:scale-[0.97] transition-all cursor-pointer overflow-hidden ${isDone ? 'border-emerald-100' : isDelayed ? 'border-orange-100' : 'border-slate-100 hover:border-indigo-200'}`}
                                >
                                    {/* Sidebar indicator */}
                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${isDone ? 'bg-emerald-400' : isDelayed ? 'bg-orange-400' : getStatusColor(status)}`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 tracking-wider">#{task.idTarea}</span>
                                            {isDelayed && (
                                                <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[9px] font-bold animate-pulse">
                                                    <AlertCircle size={10} /> {daysDelayed}d retraso
                                                </div>
                                            )}
                                        </div>
                                        <TipoBadge tipo={task.tipo} />
                                    </div>

                                    <h4 className={`text-sm font-bold text-slate-800 leading-snug mb-5 group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-2 ${isDone ? 'line-through text-slate-400' : ''}`}>
                                        {task.titulo}
                                    </h4>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                        <div onClick={e => e.stopPropagation()}>
                                            <QuickAssignDropdown
                                                currentAssignee={task.asignados && task.asignados.length > 0 ? { id: task.asignados[0].idUsuario, nombre: task.asignados[0].usuario?.nombre || 'U' } : null}
                                                team={team}
                                                allUsers={allUsers}
                                                onAssign={(uid) => onAssign(task.idTarea, uid)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-500 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                                            <CalendarIcon size={12} />
                                            {task.fechaObjetivo ? format(new Date(task.fechaObjetivo), 'dd MMM') : '--'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};
