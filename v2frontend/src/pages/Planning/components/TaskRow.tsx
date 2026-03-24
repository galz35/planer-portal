import React from 'react';
import { format, differenceInDays, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Link2, GitPullRequest, ChevronDown } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import type { TeamMember } from '../../../types/plan-trabajo.types';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { QuickAssignDropdown } from './QuickAssignDropdown';
import { TaskActionsDropdown } from './TaskActionsDropdown';

interface TaskRowProps {
    task: Tarea;
    isChild?: boolean;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    selectedTaskId?: number;
    team: TeamMember[];
    allUsers?: TeamMember[];
    creationParentId: number | null;
    onTaskClick: (task: Tarea) => void;
    onAssign: (taskId: number, userId: number) => void;
    onToggleSubtaskCreation: (taskId: number) => void;
    onDeleteTask: (taskId: number) => void;
    onCloneTask?: (taskId: number) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({
    task: t,
    isChild = false,
    hasChildren = false,
    isExpanded = false,
    onToggleExpand,
    selectedTaskId,
    team,
    allUsers,
    creationParentId,
    onTaskClick,
    onAssign,
    onToggleSubtaskCreation,
    onDeleteTask,
    onCloneTask
}) => {
    const daysDelayed = t.fechaObjetivo && t.estado !== 'Hecha' && isAfter(startOfDay(new Date()), new Date(t.fechaObjetivo))
        ? differenceInDays(startOfDay(new Date()), new Date(t.fechaObjetivo))
        : 0;

    const assignedUser = t.idResponsable
        ? { id: t.idResponsable, nombre: t.responsableNombre || 'Asignado' }
        : (t.asignados && t.asignados.length > 0
            ? { id: t.asignados[0].idUsuario, nombre: t.asignados[0].usuario?.nombre || 'U' }
            : null);

    const isDone = t.estado === 'Hecha';
    const isDelayed = daysDelayed > 0;

    let rowClass = "group relative transition-all cursor-pointer border-b border-slate-50 ";
    if (selectedTaskId === t.idTarea) rowClass += "bg-indigo-50/80 ";
    else if (isDone) rowClass += "bg-emerald-50/40 hover:bg-emerald-100/50 ";
    else if (isDelayed) rowClass += "bg-orange-50/40 hover:bg-orange-100/50 ";
    else rowClass += "hover:bg-slate-50 ";

    if (hasChildren && !isDone && !isDelayed && selectedTaskId !== t.idTarea) rowClass += "bg-slate-50/30 ";

    const parseD = (d: string) => new Date(Number(d.split('-')[0]), Number(d.split('-')[1]) - 1, Number(d.split('-')[2].substring(0, 2)));

    return (
        <div
            className={rowClass}
            onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
        >
            {/* Mobile/Compact View */}
            <div className={`md:hidden p-4 space-y-3 ${isChild ? 'pl-8 border-l-4 border-slate-100' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                    <h4 className={`font-bold text-sm text-slate-800 leading-snug ${isDone ? 'line-through opacity-60' : ''}`}>
                        {isChild && <span className="text-slate-400 mr-1">↳</span>}
                        {t.titulo}
                    </h4>
                    <StatusBadge status={t.estado} />
                </div>
            </div>

            {/* Desktop Grid View */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 items-center text-xs h-10">
                <div className="col-span-3 flex items-center gap-2 pr-2 min-w-0 relative">
                    {/* Indentation Spacer */}
                    {isChild && <div className="w-6 shrink-0 flex justify-end"><div className="w-3 h-px bg-slate-300 rounded-full"></div></div>}

                    {hasChildren && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                            className={`w-6 h-6 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all ${isExpanded ? '' : '-rotate-90'}`}
                        >
                            <ChevronDown size={14} />
                        </button>
                    )}

                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            {hasChildren && <Link2 size={12} className="text-indigo-400 rotate-45 shrink-0" />}
                            <p className={`truncate transition-colors ${isDone ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700 group-hover:text-indigo-700'} ${hasChildren ? 'font-black' : 'font-medium'}`}>
                                {t.titulo}
                            </p>
                            {(t.pendingRequests || 0) > 0 && (
                                <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-purple-200" title={`${t.pendingRequests} cambios pendientes de aprobación`}>
                                    <GitPullRequest size={8} /> {t.pendingRequests}
                                </span>
                            )}
                            <span className="text-[9px] text-slate-300 font-mono hidden xl:inline">#{t.idTarea}</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 flex items-center justify-start overflow-hidden">
                    <div className="scale-90 origin-left"><StatusBadge status={t.estado} isDelayed={isDelayed} /></div>
                </div>

                <div className="col-span-2 flex items-center justify-start overflow-hidden">
                    {!hasChildren && (
                        <div onClick={(e) => e.stopPropagation()} className="scale-90 -ml-2">
                            <QuickAssignDropdown
                                currentAssignee={assignedUser}
                                team={team}
                                allUsers={allUsers}
                                onAssign={(uid) => onAssign(t.idTarea, uid)}
                            />
                        </div>
                    )}
                </div>

                <div className="col-span-2 flex items-center justify-start text-[10px] text-slate-500 font-semibold">
                    {t.fechaInicioPlanificada || t.fechaObjetivo ? (
                        <div className={`flex items-center gap-1 whitespace-nowrap ${isDelayed ? 'text-rose-600' : ''}`}>
                            <CalendarIcon size={10} className={isDelayed ? 'text-rose-400' : 'text-slate-300'} />
                            <span>{t.fechaInicioPlanificada ? format(parseD(String(t.fechaInicioPlanificada)), 'd MMM', { locale: es }) : ''}</span>
                            {(t.fechaInicioPlanificada && t.fechaObjetivo) && <span className="text-slate-300">-</span>}
                            <span className={`${isDelayed ? 'text-rose-600 font-bold' : ''}`}>
                                {t.fechaObjetivo ? format(parseD(String(t.fechaObjetivo)), 'd MMM', { locale: es }) : ''}
                            </span>
                        </div>
                    ) : <span className="text-slate-200">--</span>}
                </div>

                {/* Time Column */}
                <div className="col-span-1 flex items-center justify-center text-[10px] font-bold">
                    {(() => {
                        if (isDone) return <span className="text-emerald-500">Hecha</span>;
                        const now = startOfDay(new Date());

                        if (t.fechaObjetivo) {
                            const deadline = parseD(String(t.fechaObjetivo));
                            if (isAfter(now, deadline)) {
                                const days = differenceInDays(now, deadline);
                                return <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">+{days}d</span>;
                            }
                        }

                        if (t.fechaInicioPlanificada) {
                            const start = parseD(String(t.fechaInicioPlanificada));
                            if (isAfter(start, now)) {
                                const days = differenceInDays(start, now);
                                return <span className="text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded whitespace-nowrap">-{days}d</span>;
                            }
                        }

                        return <span className="text-slate-300">-</span>;
                    })()}
                </div>

                <div className="col-span-2 flex items-center gap-1.5 pl-2 justify-end transition-opacity">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[40px] xl:max-w-[60px]">
                        <div
                            className={`h-full rounded-full transition-all ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${isDone ? 100 : (t.progreso || 0)}%` }}
                        ></div>
                    </div>

                    <TaskActionsDropdown
                        onEdit={() => onTaskClick(t)}
                        onAddSubtask={!isChild ? () => onToggleSubtaskCreation(t.idTarea) : undefined}
                        onClone={() => onCloneTask && onCloneTask(t.idTarea)}
                        onDelete={() => onDeleteTask(t.idTarea)}
                        isChild={isChild}
                        isActive={creationParentId === t.idTarea}
                    />
                </div>
            </div>
        </div>
    );
};
