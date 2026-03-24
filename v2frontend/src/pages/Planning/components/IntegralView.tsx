import React, { useState, useRef, useMemo, useEffect } from 'react';
import { es } from 'date-fns/locale';
import {
    format,
    eachDayOfInterval,
    isWeekend,
    differenceInDays,
    startOfMonth,
    addMonths,
    subMonths,
    isAfter,
    isBefore,
    startOfDay,
    endOfMonth,
    eachMonthOfInterval
} from 'date-fns';
import { 
    ChevronLeft, 
    ChevronRight, 
    ChevronDown, 
    Calendar as CalendarIcon,
    GitPullRequest,
    Link2,
    Edit,
    Plus,
    Copy,
    Trash2,
    CornerDownRight,
    X
} from 'lucide-react';
import type { Tarea } from '../../../types/modelos';
import type { TeamMember } from '../../../types/plan-trabajo.types';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { QuickAssignDropdown } from './QuickAssignDropdown';

const parseLocal = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return startOfDay(dateStr);
    try {
        const s = String(dateStr).split('T')[0].split(' ')[0];
        const parts = s.split('-');
        if (parts.length !== 3) return null;
        const [y, m, d] = parts.map(Number);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        const date = new Date(y, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
    } catch (e) {
        return null;
    }
};

const getBarColor = (task: Tarea, isParent: boolean) => {
    const status = task.estado || 'Pendiente';
    const isOverdue = !isParent && status !== 'Hecha' && task.fechaObjetivo && isAfter(new Date(), parseLocal(task.fechaObjetivo)!);
    if (isOverdue) return 'bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.4)]';
    if (isParent) return 'bg-slate-500';
    switch (status) {
        case 'Hecha': return 'bg-emerald-500';
        case 'EnCurso': case 'En Curso': return 'bg-indigo-500';
        case 'Bloqueada': return 'bg-rose-500';
        case 'Revision': case 'Revisión': return 'bg-amber-500';
        default: return 'bg-slate-400';
    }
};

interface IntegralViewProps {
    hierarchyData: {
        roots: Tarea[];
        childrenMap: Map<number, Tarea[]>;
        isFlat: boolean;
    };
    expandedTasks: Set<number>;
    toggleExpand: (id: number) => void;
    onTaskClick: (t: Tarea) => void;
    team: TeamMember[];
    allUsers?: TeamMember[];
    onAssign: (taskId: number, userId: number) => void;
    onToggleSubtaskCreation: (taskId: number) => void;
    onDeleteTask: (taskId: number) => void;
    onCloneTask?: (taskId: number) => void;
    creationParentId: number | null;
    newSubtaskTitle: string;
    setNewSubtaskTitle: (title: string) => void;
    onQuickSubtask: (parentId: number, title: string) => void;
    filterText: string;
    onFilterTextChange: (text: string) => void;
    filterAssignee: number | "";
    colFilters: { titulo: string; estado: string; asignado: string; fecha: string; prioridad: string };
    setColFilters: React.Dispatch<React.SetStateAction<{ titulo: string; estado: string; asignado: string; fecha: string; prioridad: string }>>;
    projectStart?: string;
    projectEnd?: string;
}

export const IntegralView: React.FC<IntegralViewProps> = ({ 
    hierarchyData, 
    expandedTasks, 
    toggleExpand, 
    onTaskClick,
    team,
    allUsers,
    onAssign,
    onToggleSubtaskCreation,
    onDeleteTask,
    onCloneTask,
    creationParentId,
    newSubtaskTitle,
    setNewSubtaskTitle,
    onQuickSubtask,
    filterText,
    onFilterTextChange,
    filterAssignee,
    colFilters,
    setColFilters,
    projectStart,
    projectEnd
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
    const tableBodyRef = useRef<HTMLDivElement>(null);
    const chartBodyRef = useRef<HTMLDivElement>(null);

    const COL_WIDTH = 44; 
    const ROW_HEIGHT = 44; 

    const range = useMemo(() => {
        let minDate: Date | null = parseLocal(projectStart);
        let maxDate: Date | null = parseLocal(projectEnd);

        // Always scan tasks to ensure they fit in the range
        const scan = (tasks: Tarea[]) => {
            tasks.forEach(t => {
                const s = parseLocal(t.fechaInicioPlanificada);
                const e = parseLocal(t.fechaObjetivo);
                if (s && (!minDate || s < minDate)) minDate = s;
                if (e && (!maxDate || e > maxDate)) maxDate = e;
                
                const children = hierarchyData.childrenMap.get(t.idTarea);
                if (children) scan(children);
            });
        };
        scan(hierarchyData.roots);

        const start = minDate ? startOfMonth(subMonths(minDate, 1)) : startOfMonth(subMonths(currentDate, 1));
        const end = maxDate ? endOfMonth(addMonths(maxDate, 1)) : endOfMonth(addMonths(currentDate, 3));
        
        return { start, end };
    }, [currentDate, projectStart, projectEnd, hierarchyData]);

    const viewStart = range.start;
    const viewEnd = range.end;

    const days = useMemo(() => {
        return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }, [viewStart, viewEnd]);

    // Apply filters to visible rows
    const visibleRows = useMemo(() => {
        const rows: { task: Tarea, level: number, isParent: boolean, type: 'task' | 'create' }[] = [];
        
        const matchesFilter = (t: Tarea) => {
            // Main search (filterText)
            const textMatch = (() => {
                if (!filterText) return true;
                const tokens = filterText.toLowerCase().split(/\s+/).filter(Boolean);
                const title = t.titulo.toLowerCase();
                return tokens.every(token => title.includes(token));
            })();

            const assigneeMatch = !filterAssignee || t.idResponsable === Number(filterAssignee);
            
            // Column Filters
            const fTitle = colFilters.titulo.toLowerCase();
            const titleMatch = (() => {
                if (!fTitle) return true;
                const tokens = fTitle.split(/\s+/).filter(Boolean);
                const title = t.titulo.toLowerCase();
                return tokens.every(token => title.includes(token));
            })();
            const fStatus = colFilters.estado;
            const fAssignee = colFilters.asignado ? Number(colFilters.asignado) : null;
            const fDate = colFilters.fecha.toLowerCase();

            const matchStatus = !fStatus || t.estado === fStatus;
            
            let matchAssignee = true;
            if (fAssignee) {
                matchAssignee = t.idResponsable === fAssignee || (t.asignados && t.asignados.some(a => a.idUsuario === fAssignee)) || false;
            }

            let matchDate = true;
            if (fDate) {
                const startStr = t.fechaInicioPlanificada ? format(parseLocal(t.fechaInicioPlanificada)!, 'dd MMM', { locale: es }).toLowerCase() : '';
                const endStr = t.fechaObjetivo ? format(parseLocal(t.fechaObjetivo)!, 'dd MMM', { locale: es }).toLowerCase() : '';
                matchDate = startStr.includes(fDate) || endStr.includes(fDate);
            }

            return textMatch && assigneeMatch && titleMatch && matchStatus && matchAssignee && matchDate;
        };

        const process = (t: Tarea, level: number) => {
            const children = hierarchyData.childrenMap.get(t.idTarea) || [];
            const isParent = children.length > 0;
            
            const hasMatchingDescendant = (task: Tarea): boolean => {
                if (matchesFilter(task)) return true;
                const kids = hierarchyData.childrenMap.get(task.idTarea) || [];
                return kids.some(k => hasMatchingDescendant(k));
            };

            if (hasMatchingDescendant(t)) {
                rows.push({ task: t, level, isParent, type: 'task' });
                
                if (isParent && (expandedTasks.has(t.idTarea) || filterText || filterAssignee)) {
                    children.forEach(c => process(c, level + 1));
                }

                // Input for quick subtask - Appears AFTER children (at the bottom)
                if (creationParentId === t.idTarea) {
                    rows.push({ 
                        task: { ...t, idTarea: -t.idTarea, titulo: '' }, 
                        level: level + 1, 
                        isParent: false, 
                        type: 'create' 
                    });
                }
            }
        };

        hierarchyData.roots.forEach(r => process(r, 0));
        return rows;
    }, [hierarchyData, expandedTasks, filterText, filterAssignee, creationParentId, colFilters]);


    const handleChartScroll = () => {
        if (chartBodyRef.current && tableBodyRef.current) {
            tableBodyRef.current.scrollTop = chartBodyRef.current.scrollTop;
        }
    };
    const handleTableScroll = () => {
        if (tableBodyRef.current && chartBodyRef.current) {
            chartBodyRef.current.scrollTop = tableBodyRef.current.scrollTop;
        }
    };

    const getTaskStyles = (task: Tarea, isParent: boolean) => {
        let start = parseLocal(task.fechaInicioPlanificada);
        let end = parseLocal(task.fechaObjetivo);

        if (isParent) {
            const children = hierarchyData.childrenMap.get(task.idTarea) || [];
            let minStart: Date | null = start;
            let maxEnd: Date | null = end;

            const scan = (kids: Tarea[]) => {
                kids.forEach(k => {
                    const sk = parseLocal(k.fechaInicioPlanificada);
                    const ek = parseLocal(k.fechaObjetivo);
                    if (sk && (!minStart || sk < minStart)) minStart = sk;
                    if (ek && (!maxEnd || ek > maxEnd)) maxEnd = ek;
                    const subKids = hierarchyData.childrenMap.get(k.idTarea);
                    if (subKids) scan(subKids);
                });
            };
            scan(children);
            start = minStart;
            end = maxEnd;
        }

        if (!start || !end) return null;
        if (isAfter(start, viewEnd) || isAfter(viewStart, end)) return null;

        const renderStart = start < viewStart ? viewStart : start;
        const renderEnd = end > viewEnd ? viewEnd : end;
        const offsetDays = differenceInDays(renderStart, viewStart);
        const durationDays = differenceInDays(renderEnd, renderStart) + 1;

        return { 
            left: offsetDays * COL_WIDTH, 
            width: durationDays * COL_WIDTH,
        };
    };

    useEffect(() => {
        if (chartBodyRef.current) {
            const today = new Date();
            const daysToToday = differenceInDays(today, viewStart);
            chartBodyRef.current.scrollLeft = (daysToToday * COL_WIDTH) - 200;
        }
        const table = tableBodyRef.current;
        const chart = chartBodyRef.current;
        if (table && chart) table.scrollTop = chart.scrollTop;
    }, [viewStart, visibleRows.length]);

    const daysToToday = differenceInDays(new Date(), viewStart);
    const todayLineOffset = daysToToday * COL_WIDTH;

    return (
        <div className="flex flex-col w-full h-full bg-white border border-slate-200 shadow-sm overflow-hidden select-none relative min-w-0">            {/* HEADER TOOLBAR & FILTERS */}
            <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-40">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-200 shadow-lg">
                        <GitPullRequest size={14} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Gantt</h2>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Control de Tiempos</p>
                    </div>
                    <div className="w-px h-6 bg-slate-200 mx-2" />
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Buscar tarea..."
                            value={filterText}
                            onChange={(e) => onFilterTextChange(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-56 transition-all group-hover:border-slate-300"
                        />
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"><ChevronLeft size={14} /></button>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider px-2 min-w-[100px] text-center">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"><ChevronRight size={14} /></button>
                    </div>
                    {(filterText || filterAssignee) && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Filtros Activos</span>}
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{visibleRows.length} tareas</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0 w-full min-w-0">
                {/* LEFT: DETAILED LIST TABLE (Strict 50%) */}
                <div className="flex flex-col border-r border-slate-300 z-30 shadow-2xl shadow-slate-200/40 bg-white overflow-hidden min-w-0 relative">
                    <div className="grid grid-cols-[minmax(120px,1.5fr)_85px_110px_130px_40px_40px] gap-0 bg-slate-50 border-b border-slate-300 text-[9px] font-black text-slate-500 uppercase tracking-tight shrink-0 sticky top-0">
                        <div className="border-r border-slate-200 py-3 px-3 truncate text-indigo-900">Tarea</div>
                        <div className="border-r border-slate-200 py-3 px-2 text-center">Estado</div>
                        <div className="border-r border-slate-200 py-3 px-2 text-center">Responsable</div>
                        <div className="border-r border-slate-200 py-3 px-2 text-center text-indigo-600">Periodo</div>
                        <div className="border-r border-slate-200 py-3 text-center" title="Duración en días">D.</div>
                        <div className="border-r border-slate-200 py-3 text-center" title="Estatus Temporal (Atraso (-) / Pendiente (+))">Est.</div>
                    </div>

                    {/* Filter Row */}
                    <div className="grid grid-cols-[minmax(120px,1.5fr)_85px_110px_130px_40px_40px] gap-0 bg-slate-50/50 border-b border-slate-200 shrink-0 sticky top-[33px] z-30">
                        <div className="border-r border-slate-100 px-1 py-1">
                            <input
                                placeholder="Filtrar..."
                                className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[9px] outline-none focus:border-indigo-400 font-bold"
                                value={colFilters.titulo}
                                onChange={e => setColFilters(prev => ({ ...prev, titulo: e.target.value }))}
                            />
                        </div>
                        <div className="border-r border-slate-100 px-1 py-1">
                            <select
                                className="w-full bg-white border border-slate-200 rounded px-0.5 py-0.5 text-[9px] outline-none focus:border-indigo-400 font-bold"
                                value={colFilters.estado}
                                onChange={e => setColFilters(prev => ({ ...prev, estado: e.target.value }))}
                            >
                                <option value="">Todos</option>
                                {['Pendiente', 'En Curso', 'Bloqueada', 'Revisión', 'Hecha'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="border-r border-slate-100 px-1 py-1">
                            <select
                                className="w-full bg-white border border-slate-200 rounded px-0.5 py-0.5 text-[9px] outline-none focus:border-indigo-400 font-bold text-ellipsis overflow-hidden"
                                value={colFilters.asignado}
                                onChange={e => setColFilters(prev => ({ ...prev, asignado: e.target.value }))}
                            >
                                <option value="">Todos</option>
                                {team.map(m => <option key={m.idUsuario} value={m.idUsuario}>{m.nombre}</option>)}
                            </select>
                        </div>
                        <div className="border-r border-slate-100 px-1 py-1">
                            <input
                                placeholder="Fecha..."
                                className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[9px] outline-none focus:border-indigo-400 font-bold"
                                value={colFilters.fecha}
                                onChange={e => setColFilters(prev => ({ ...prev, fecha: e.target.value }))}
                            />
                        </div>
                        <div className="col-span-2 flex items-center justify-center">
                            {(colFilters.titulo || colFilters.estado || colFilters.asignado || colFilters.fecha) && (
                                <button 
                                    onClick={() => setColFilters({ titulo: '', prioridad: '', estado: '', asignado: '', fecha: '' })}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                    title="Limpiar Filtros"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div ref={tableBodyRef} onScroll={handleTableScroll} className="flex-1 overflow-y-scroll overflow-x-hidden hide-scrollbar bg-white">
                        {visibleRows.map((row) => {
                            const { task, level, isParent, type } = row;
                            
                            if (type === 'create') {
                                return (
                                    <div 
                                        key={`create-${task.idTarea}`}
                                        className="grid grid-cols-[minmax(120px,1.5fr)_85px_110px_130px_40px_40px] gap-0 border-b border-indigo-100 bg-indigo-50/30 transition-all"
                                        style={{ height: ROW_HEIGHT }}
                                    >
                                        <div className="col-span-full flex items-center px-4" style={{ paddingLeft: (level * 16) + 8 }}>
                                            <CornerDownRight size={13} strokeWidth={3} className="text-indigo-400 shrink-0 mr-2" />
                                            <input
                                                autoFocus
                                                placeholder="Nueva subtarea..."
                                                className="flex-1 bg-white border border-indigo-400 rounded px-2 py-0.5 text-[11px] outline-none shadow-sm focus:ring-1 focus:ring-indigo-500 font-medium"
                                                value={newSubtaskTitle}
                                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                                        // After Enter, we save but keep creationParentId to allow adding more
                                                        onQuickSubtask(Math.abs(task.idTarea), newSubtaskTitle);
                                                    }
                                                    if (e.key === 'Escape') {
                                                        onToggleSubtaskCreation(Math.abs(task.idTarea));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            const start = parseLocal(task.fechaInicioPlanificada);
                            const end = parseLocal(task.fechaObjetivo);
                            const isOverdue = end && task.estado !== 'Hecha' && isAfter(startOfDay(new Date()), end);
                            const children = hierarchyData.childrenMap.get(task.idTarea) || [];
                            const assignedUser = task.idResponsable ? { id: task.idResponsable, nombre: task.responsableNombre || 'U' } : null;
                            
                            const getEffProg = (t: any) => (t.estado === 'Hecha' ? 100 : (t.progreso || 0));

                            // Calcula progreso para padres si no lo tienen
                            const progress = isParent 
                                ? (children.length > 0 ? Math.round(children.reduce((acc, c) => acc + getEffProg(c), 0) / children.length) : getEffProg(task))
                                : getEffProg(task);

                            return (
                                <div 
                                    key={task.idTarea}
                                    onMouseEnter={() => setHoveredTaskId(task.idTarea)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                    className={`grid grid-cols-[minmax(120px,1.5fr)_85px_110px_130px_40px_40px] gap-0 border-b border-slate-100 transition-all group cursor-pointer 
                                        ${hoveredTaskId === task.idTarea ? 'bg-indigo-50' : 
                                          task.estado === 'Hecha' ? 'bg-emerald-50/40' : 
                                          isOverdue ? 'bg-rose-50/60' : 'hover:bg-slate-50/50'}`}
                                    style={{ height: ROW_HEIGHT }}
                                    onClick={() => {
                                        const styles = getTaskStyles(task, isParent);
                                        if (styles && chartBodyRef.current) {
                                            chartBodyRef.current.scrollTo({
                                                left: styles.left - 100,
                                                behavior: 'smooth'
                                            });
                                        }
                                    }}
                                >
                                    {/* Task Name Column */}
                                    <div className="border-r border-slate-100/50 flex items-center px-2 min-w-0" style={{ paddingLeft: (level * 16) + 8 }}>
                                        {isParent && (
                                            <button onClick={(e) => { e.stopPropagation(); toggleExpand(task.idTarea); }} className="mr-1 text-slate-400 hover:text-indigo-600 p-1 rounded-full hover:bg-slate-200 transition-all">
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${expandedTasks.has(task.idTarea) ? '' : '-rotate-90'}`} />
                                            </button>
                                        )}
                                        <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {isParent && <Link2 size={10} className="text-indigo-400 shrink-0" />}
                                                    {(level > 0 || task.idTareaPadre) && <CornerDownRight size={13} strokeWidth={3} className="text-indigo-400 shrink-0 ml-1" />}
                                                    <span className={`text-[11px] truncate leading-tight tracking-tight ${isParent ? 'font-black text-slate-900 uppercase' : 'font-bold text-slate-700'}`}>
                                                        {task.titulo}
                                                    </span>
                                                </div>
                                            <div className="flex items-center gap-1.5 -mt-0.5">
                                                {/* Actions Toolbar - Visible on Hover */}
                                                <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-100 rounded-md px-1 py-0.5 z-10 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                                                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded-md transition-all flex items-center gap-1 bg-white border border-slate-100 shadow-sm"
                                                            title="Editar"
                                                        >
                                                            <Edit size={10} strokeWidth={2.5} className="text-indigo-600" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Edit</span>
                                                        </button>
                                                    {/* Subtask Creation - Available for all root tasks or as per detailed list logic */}
                                                    {(!task.idTareaPadre) && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onToggleSubtaskCreation(task.idTarea); }}
                                                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded-md transition-all flex items-center gap-1 bg-white border border-slate-100 shadow-sm"
                                                            title="Agregar Subtarea"
                                                        >
                                                            <Plus size={10} strokeWidth={2.5} className="text-emerald-600" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Sub</span>
                                                        </button>
                                                    )}
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (onCloneTask && window.confirm('¿Estás seguro de que deseas clonar esta tarea?')) {
                                                                    onCloneTask(task.idTarea);
                                                                }
                                                            }}
                                                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded-md transition-all flex items-center gap-1 bg-white border border-slate-100 shadow-sm"
                                                            title="Clonar"
                                                        >
                                                            <Copy size={10} strokeWidth={2.5} className="text-amber-500" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Clon</span>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                if (window.confirm('¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.')) {
                                                                        onDeleteTask(task.idTarea);
                                                                }
                                                            }}
                                                            className="px-1.5 py-0.5 hover:bg-slate-100 rounded-md transition-all flex items-center gap-1 bg-white border border-slate-100 shadow-sm"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={10} strokeWidth={2.5} className="text-rose-500" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Elim</span>
                                                        </button>
                                                </div>

                                                {(task.pendingRequests || 0) > 0 && (
                                                    <span className="bg-purple-100 text-purple-700 px-1 rounded-[4px] text-[8px] font-black ml-1">
                                                        <GitPullRequest size={8} className="inline mr-0.5" />{task.pendingRequests}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status & Progress Column */}
                                    <div className="border-r border-slate-100/50 flex flex-col items-center justify-center px-1 gap-1">
                                        <StatusBadge status={task.estado || 'Pendiente'} isDelayed={!!isOverdue} />
                                        <div className="flex items-center gap-1">
                                            <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} 
                                                    style={{ width: `${progress}%` }} 
                                                />
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-400">{progress}%</span>
                                        </div>
                                    </div>

                                    {/* Assignee Column */}
                                    <div className="border-r border-slate-100/50 flex items-center px-2">
                                        {!isParent && (
                                            <div className="scale-[0.8] origin-left" onClick={e => e.stopPropagation()}>
                                                <QuickAssignDropdown 
                                                    currentAssignee={assignedUser} 
                                                    team={team} 
                                                    allUsers={allUsers} 
                                                    onAssign={(uid) => onAssign(task.idTarea, uid)} 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Dates Column */}
                                    <div className="border-r border-slate-100/50 flex items-center px-2 text-[10px] font-bold text-slate-500 gap-1 overflow-hidden">
                                        <CalendarIcon size={10} className="text-slate-300 shrink-0" />
                                        <span className="truncate">{start ? format(start, 'dd MMM', { locale: es }) : '--'}</span>
                                        <span className="text-slate-200">-</span>
                                        <span className={`truncate ${isOverdue ? 'text-rose-600' : ''}`}>{end ? format(end, 'dd MMM', { locale: es }) : '--'}</span>
                                    </div>

                                    {/* Duration Column */}
                                    <div className="border-r border-slate-100/50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                        {start && end ? `${differenceInDays(end, start) + 1}d` : '-'}
                                    </div>

                                    {/* Time Status Column */}
                                    <div className="border-r border-slate-100/50 flex items-center justify-center">
                                        {(() => {
                                            const today = startOfDay(new Date());
                                            const tStart = start;
                                            const tEnd = end;
                                            
                                            if (task.estado === 'Hecha') {
                                                return <span className="text-[10px] font-black text-emerald-500">✓</span>;
                                            }

                                            if (tEnd && isBefore(tEnd, today)) {
                                                const diff = differenceInDays(today, tEnd);
                                                return <span className="text-[10px] font-black text-rose-600">-{diff}d</span>;
                                            }

                                            if (tStart && isAfter(tStart, today)) {
                                                const diff = differenceInDays(tStart, today);
                                                return <span className="text-[10px] font-black text-indigo-400">+{diff}d</span>;
                                            }

                                            if (tEnd) {
                                                const diff = differenceInDays(tEnd, today);
                                                return <span className="text-[10px] font-black text-indigo-600">{diff}d</span>;
                                            }

                                            return <span className="text-[10px] font-black text-slate-300">-</span>;
                                        })()}
                                    </div>

                                    {/* Action Column Removed as per Request - Edit moved to Task Name */}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: GANTT CHART (Strict 50%) */}
                <div className="flex flex-col overflow-hidden min-w-0 relative bg-slate-50/30">
                    <div ref={chartBodyRef} onScroll={handleChartScroll} className="flex-1 overflow-auto custom-scrollbar select-none relative h-full">
                    <div className="relative sticky top-0 z-20 bg-slate-100 border-b border-slate-300 flex flex-col shrink-0" style={{ width: days.length * COL_WIDTH }}>
                        {/* MONTH HEADER */}
                        <div className="flex">
                            {eachMonthOfInterval({ start: viewStart, end: viewEnd }).map(month => {
                                const mStart = startOfMonth(month) < viewStart ? viewStart : startOfMonth(month);
                                const mEnd = endOfMonth(month) > viewEnd ? viewEnd : endOfMonth(month);
                                const mWidth = (differenceInDays(mEnd, mStart) + 1) * COL_WIDTH;
                                return (
                                    <div key={month.toISOString()} className="border-r border-slate-300 py-1.5 px-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50" style={{ width: mWidth }}>
                                        {format(month, 'MMMM yyyy', { locale: es })}
                                    </div>
                                );
                            })}
                        </div>
                        {/* DAY HEADER */}
                        <div className="flex">
                            {days.map(day => (
                                <div key={day.toISOString()} className={`flex-none border-r border-slate-200 text-center py-1.5 text-[8px] font-bold ${isWeekend(day) ? 'bg-slate-200/50 text-slate-400' : 'text-slate-500'}`} style={{ width: COL_WIDTH }}>
                                    {format(day, 'd')}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative" style={{ width: days.length * COL_WIDTH, height: visibleRows.length * ROW_HEIGHT }}>
                        {/* PROJECT LIMIT LINES */}
                        {projectStart && (
                            <div className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-indigo-500/30 z-10 pointer-events-none" style={{ left: differenceInDays(parseLocal(projectStart)!, viewStart) * COL_WIDTH }}>
                                <div className="absolute top-2 left-2 whitespace-nowrap text-[8px] font-black text-indigo-500/60 uppercase">Inicio Proyecto</div>
                            </div>
                        )}
                        {projectEnd && (
                            <div className="absolute top-0 bottom-0 w-px border-l-2 border-dashed border-rose-500/30 z-10 pointer-events-none" style={{ left: (differenceInDays(parseLocal(projectEnd)!, viewStart) + 1) * COL_WIDTH }}>
                                <div className="absolute top-2 right-2 whitespace-nowrap text-[8px] font-black text-rose-500/60 uppercase">Fin Proyecto</div>
                            </div>
                        )}

                        {/* TODAY LINE */}
                        {daysToToday >= 0 && daysToToday < days.length && (
                            <div className="absolute top-0 bottom-0 w-px bg-rose-500/80 z-10 pointer-events-none" style={{ left: todayLineOffset }}>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
                            </div>
                        )}

                        {/* GRID VERTICAL LINES */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {days.map(day => (
                                <div key={day.toISOString()} className={`flex-none border-r ${isWeekend(day) ? 'bg-slate-100/30 border-slate-200/60' : 'border-slate-100'}`} style={{ width: COL_WIDTH }} />
                            ))}
                        </div>

                        {/* TASK BARS */}
                        {visibleRows.map((row) => {
                            const { task, isParent, type } = row;
                            
                            if (type === 'create') {
                                return <div key={'bar-create-' + task.idTarea} className="border-b border-indigo-100 bg-indigo-50/20" style={{ height: ROW_HEIGHT }} />;
                            }

                            const style = getTaskStyles(task, isParent);
                            const isHovered = hoveredTaskId === task.idTarea;
                            const children = hierarchyData.childrenMap.get(task.idTarea) || [];
                            
                            const getEffProg = (t: any) => (t.estado === 'Hecha' ? 100 : (t.progreso || 0));
                            const progress = isParent 
                                ? (children.length > 0 ? Math.round(children.reduce((acc, c) => acc + getEffProg(c), 0) / children.length) : getEffProg(task))
                                : getEffProg(task);
                            
                            return (
                                <div key={'bar-' + task.idTarea} className={`relative border-b transition-colors ${isHovered ? 'bg-indigo-50/40 border-indigo-100' : 'border-slate-50'}`} style={{ height: ROW_HEIGHT }} onMouseEnter={() => setHoveredTaskId(task.idTarea)} onMouseLeave={() => setHoveredTaskId(null)}>
                                    {style && (
                                        <div 
                                            className={`absolute transition-all flex items-center overflow-visible
                                                ${isParent 
                                                    ? 'h-1.5 top-1/2 -translate-y-1.5 bg-slate-500 z-0' 
                                                    : `h-7 top-1/2 -translate-y-1/2 px-2 overflow-hidden z-10 rounded-md shadow-lg shadow-indigo-500/20 ${getBarColor(task, isParent)}`
                                                }
                                            `}
                                            style={{ left: style.left, width: style.width }}
                                        >
                                            {isParent ? (
                                                <>
                                                    {/* Summary Bar Brackets */}
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500 -ml-px" />
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-500 -mr-px" />
                                                    <div className="absolute left-0 bottom-0 w-2 h-1 bg-slate-500 transform translate-y-full" />
                                                    <div className="absolute right-0 bottom-0 w-2 h-1 bg-slate-500 transform translate-y-full" />
                                                    
                                                    <span className="absolute -top-3 left-0 right-0 text-[7.5px] font-black text-slate-500 truncate uppercase tracking-tighter text-center">
                                                        {progress}%
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="w-full text-[9px] font-black text-white truncate drop-shadow-sm select-none text-center">
                                                    {progress}%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
            </div>

            <footer className="h-6 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between shrink-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-indigo-900/40">Gantt</div>
                <div className="text-[9px] font-black text-indigo-600">v2.0 PRO</div>
            </footer>
        </div>
    );
};
