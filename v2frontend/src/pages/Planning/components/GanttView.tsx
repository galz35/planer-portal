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
    startOfDay,
    endOfMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, Info, AlertCircle } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';

const isToday = (date: Date) => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

interface GanttViewProps {
    hierarchyData: {
        roots: Tarea[];
        childrenMap: Map<number, Tarea[]>;
        isFlat: boolean;
    };
    expandedTasks: Set<number>;
    toggleExpand: (id: number) => void;
    onTaskClick: (t: Tarea) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({ hierarchyData, expandedTasks, toggleExpand, onTaskClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
    const tableBodyRef = useRef<HTMLDivElement>(null);
    const chartBodyRef = useRef<HTMLDivElement>(null);

    const COL_WIDTH = 44; 
    const ROW_HEIGHT = 40; 

    // View Range: 3 months (prev, current, next) for better context
    const viewStart = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
    const viewEnd = useMemo(() => endOfMonth(addMonths(currentDate, 2)), [currentDate]);

    const days = useMemo(() => {
        return eachDayOfInterval({ start: viewStart, end: viewEnd });
    }, [viewStart, viewEnd]);

    // Build flat list based on hierarchy and expansion
    const visibleRows = useMemo(() => {
        const rows: { task: Tarea, level: number, isParent: boolean }[] = [];
        const process = (t: Tarea, level: number) => {
            const children = hierarchyData.childrenMap.get(t.idTarea) || [];
            const isParent = children.length > 0;
            rows.push({ task: t, level, isParent });
            
            if (isParent && expandedTasks.has(t.idTarea)) {
                children.forEach(c => process(c, level + 1));
            }
        };
        hierarchyData.roots.forEach(r => process(r, 0));
        return rows;
    }, [hierarchyData, expandedTasks]);

    // Sync vertical scroll
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

    const parseLocal = (dateStr: string | Date | null | undefined) => {
        if (!dateStr) return null;
        const s = String(dateStr).split('T')[0];
        const [y, m, d] = s.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const getTaskStyles = (task: Tarea, isParent: boolean) => {
        let start = parseLocal(task.fechaInicioPlanificada);
        let end = parseLocal(task.fechaObjetivo);

        // If parent, calculate range from children
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
            isPartialStart: start < viewStart,
            isPartialEnd: end > viewEnd
        };
    };

    const getBarColor = (status: string, isParent: boolean) => {
        if (isParent) return 'bg-slate-800'; // Summary tasks are black/dark in MS Project
        switch (status) {
            case 'Hecha': return 'bg-emerald-500';
            case 'EnCurso': case 'En Curso': return 'bg-indigo-500';
            case 'Bloqueada': return 'bg-rose-500';
            case 'Revision': case 'Revisión': return 'bg-amber-500';
            case 'Pausa': return 'bg-purple-400';
            default: return 'bg-slate-400';
        }
    };

    useEffect(() => {
        // Initial scroll to current day
        if (chartBodyRef.current) {
            const today = new Date();
            const daysToToday = differenceInDays(today, viewStart);
            chartBodyRef.current.scrollLeft = (daysToToday * COL_WIDTH) - 200;
        }
        // Sync scrollbars
        const table = tableBodyRef.current;
        const chart = chartBodyRef.current;
        if (table && chart) {
            table.scrollTop = chart.scrollTop;
        }
    }, [viewStart]);

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 shadow-sm overflow-hidden select-none">
            {/* TOOLBAR */}            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shadow-inner">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"><ChevronLeft size={16} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 text-[11px] font-black text-slate-700 hover:text-indigo-600 transition-colors uppercase tracking-widest">Hoy</button>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-500"><ChevronRight size={16} /></button>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {format(currentDate, 'MMMM yyyy', { locale: es })}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] -mt-0.5">Vista Planificada</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3 h-1 bg-slate-800 rounded-full"></span> RESUMEN
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3 h-3 bg-indigo-500 rounded-sm shadow-sm"></span> TAREA
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="w-3 h-3 bg-emerald-500 rounded-sm shadow-sm"></span> HECHA
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-100">
                        <AlertCircle size={12} /> RETRASADA
                    </div>
                </div>
            </div>


            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: MS PROJECT TABLE */}
                <div className="w-[480px] shrink-0 flex flex-col border-r border-slate-300 z-30 shadow-xl shadow-slate-200/50">
                    {/* Table Header */}
                    <div className="grid grid-cols-[30px_20px_220px_50px_80px_80px] gap-0 bg-slate-100 border-b border-slate-300 text-[9px] font-black text-slate-500 uppercase tracking-tight shrink-0 sticky top-0">
                        <div className="border-r border-slate-200 py-3 text-center">ID</div>
                        <div className="border-r border-slate-200 py-3 px-1 text-center"><Info size={10} /></div>
                        <div className="border-r border-slate-200 py-3 px-3">Nombre de la tarea</div>
                        <div className="border-r border-slate-200 py-3 px-1 text-center">Dur.</div>
                        <div className="border-r border-slate-200 py-3 px-2">Comienzo</div>
                        <div className="py-3 px-2">Fin</div>
                    </div>

                    <div ref={tableBodyRef} onScroll={handleTableScroll} className="flex-1 overflow-y-scroll hide-scrollbar bg-white">
                        {visibleRows.map((row, idx) => {
                            const { task, level, isParent } = row;
                            const start = parseLocal(task.fechaInicioPlanificada);
                            const end = parseLocal(task.fechaObjetivo);
                            const isOverdue = end && task.estado !== 'Hecha' && isAfter(startOfDay(new Date()), end);
                            const duration = start && end ? differenceInDays(end, start) + 1 : 0;

                            return (
                                <div 
                                    key={task.idTarea}
                                    onClick={() => onTaskClick(task)}
                                    onMouseEnter={() => setHoveredTaskId(task.idTarea)}
                                    onMouseLeave={() => setHoveredTaskId(null)}
                                    className={`grid grid-cols-[30px_20px_220px_50px_80px_80px] gap-0 border-b border-slate-100 transition-all group cursor-pointer ${hoveredTaskId === task.idTarea ? 'bg-indigo-50/70' : 'hover:bg-slate-50/50'}`}
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div className="border-r border-slate-100/50 flex items-center justify-center text-[9px] font-black text-slate-300 group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">{idx + 1}</div>
                                    <div className="border-r border-slate-100/50 flex items-center justify-center text-rose-500">
                                        {isOverdue && <AlertCircle size={12} />}
                                    </div>
                                    <div className="border-r border-slate-100/50 flex items-center px-2 min-w-0" style={{ paddingLeft: (level * 16) + 8 }}>
                                        {isParent && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(task.idTarea); }}
                                                className="mr-1 text-slate-400 hover:text-indigo-600 outline-none p-1 rounded-full hover:bg-slate-200 transition-all"
                                            >
                                                <ChevronDown size={14} className={`transition-transform duration-300 ${expandedTasks.has(task.idTarea) ? '' : '-rotate-90'}`} />
                                            </button>
                                        )}
                                        <span className={`text-[12px] truncate leading-tight tracking-tight ${isParent ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                                            {task.titulo}
                                        </span>
                                    </div>
                                    <div className="border-r border-slate-100/50 flex items-center justify-center text-[10px] font-black text-slate-400">
                                        {duration > 0 ? `${duration}d` : '-'}
                                    </div>
                                    <div className="border-r border-slate-100/50 flex items-center px-3 text-[10px] font-bold text-slate-600">
                                        {start ? format(start, 'dd MMM', { locale: es }) : '--'}
                                    </div>
                                    <div className="flex items-center px-3 text-[10px] font-bold text-slate-600">
                                        {end ? format(end, 'dd MMM', { locale: es }) : '--'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: GANTT CHART GRID */}
                <div ref={chartBodyRef} onScroll={handleChartScroll} className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-slate-200/20 relative">
                    <div style={{ width: days.length * COL_WIDTH, minWidth: '100%' }}>
                        {/* Timeline Header */}
                        <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 shrink-0">
                            {/* Months & Weeks Row */}
                            <div className="flex h-12">
                                {days.filter(d => format(d, 'd') === '1' || d === days[0]).map(monthStart => {
                                    const monthEnd = endOfMonth(monthStart);
                                    const actualEnd = monthEnd > viewEnd ? viewEnd : monthEnd;
                                    const width = (differenceInDays(actualEnd, monthStart) + 1) * COL_WIDTH;
                                    return (
                                        <div 
                                            key={'month-' + monthStart.toString()}
                                            className="shrink-0 border-r border-slate-300 flex items-center px-3 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-100"
                                            style={{ width }}
                                        >
                                            {format(monthStart, 'MMMM yyyy', { locale: es })}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Days row - denser */}
                            <div className="flex h-5">
                                {days.map(day => (
                                    <div
                                        key={'day-' + day.toString()}
                                        className={`shrink-0 flex items-center justify-center border-r border-slate-200 text-[8px] font-bold ${isWeekend(day) ? 'bg-slate-200/50 text-slate-400' : 'bg-white text-slate-500'} ${isToday(day) ? 'bg-indigo-600 text-white' : ''}`}
                                        style={{ width: COL_WIDTH }}
                                    >
                                        {format(day, 'd')}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* GRID BARS AREA */}
                        <div className="relative" style={{ minHeight: visibleRows.length * ROW_HEIGHT }}>
                            {/* Grid background vertical lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {days.map(day => (
                                    <div
                                        key={'grid-' + day.toString()}
                                        className={`shrink-0 border-r h-full ${isWeekend(day) ? 'bg-slate-100/30 border-slate-200/40' : 'border-slate-100'} ${isToday(day) ? 'bg-indigo-50/20' : ''}`}
                                        style={{ width: COL_WIDTH }}
                                    >
                                        {isToday(day) && <div className="absolute inset-y-0 left-1/2 w-[2px] bg-indigo-500/50 z-10" />}
                                    </div>
                                ))}
                            </div>

                            {/* Task bars */}
                            {visibleRows.map((row) => {
                                const { task, isParent } = row;
                                const style = getTaskStyles(task, isParent);
                                const isHovered = hoveredTaskId === task.idTarea;
                                
                                return (
                                    <div 
                                        key={'bar-' + task.idTarea}
                                        className={`relative border-b transition-colors ${isHovered ? 'bg-indigo-50/40 border-indigo-100' : 'border-slate-50'}`}
                                        style={{ height: ROW_HEIGHT }}
                                        onMouseEnter={() => setHoveredTaskId(task.idTarea)}
                                        onMouseLeave={() => setHoveredTaskId(null)}
                                    >
                                        {style && (
                                            <div 
                                                className={`absolute top-1/2 -translate-y-1/2 transition-all duration-200 z-20 ${isParent ? '' : 'rounded shadow-sm'}`}
                                                style={{ left: style.left, width: style.width, height: isParent ? 12 : 20 }}
                                            >
                                                {isParent ? (
                                                    /* Parent Bar: Bracket style */
                                                    <div className="relative h-full w-full">
                                                        <div className="absolute top-0 inset-x-0 h-2 bg-slate-800 rounded-sm" />
                                                        <div className="absolute top-0 left-0 w-2 h-4 bg-slate-800 [clip-path:polygon(0%_0%,100%_0%,0%_100%)]" />
                                                        <div className="absolute top-0 right-0 w-2 h-4 bg-slate-800 [clip-path:polygon(100%_0%,0%_0%,100%_100%)]" />
                                                        <div className="absolute left-[105%] top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black text-slate-800 uppercase tracking-tighter">
                                                            {task.titulo}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Child Bar: Regular task */
                                                    <div className={`relative h-full w-full ${getBarColor(task.estado, false)} overflow-hidden group/bar`}>
                                                        {/* Progress fill */}
                                                        {task.progreso > 0 && (
                                                            <div className="absolute inset-y-0 left-0 bg-black/20 border-r border-white/30" style={{ width: `${task.progreso}%` }} />
                                                        )}
                                                        {/* Details on bar */}
                                                        {style.width > 60 && (
                                                            <div className="absolute inset-0 flex items-center px-2 gap-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                                                <span className="text-[8px] font-black text-white whitespace-nowrap">{task.progreso}%</span>
                                                            </div>
                                                        )}
                                                        {/* Text and image indicators could go here */}
                                                         {/* Label to the right */}
                                                         <div className="absolute left-[105%] top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-bold text-slate-500">
                                                            {task.responsableNombre?.split(' ')[0]}
                                                        </div>
                                                    </div>
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
            
            {/* Legend / Status Footer */}
            <div className="h-6 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between shrink-0">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex gap-4">
                    <span>Cronograma de Proyecto</span>
                    <span>•</span>
                    <span>{visibleRows.length} tareas visibles</span>
                </div>
                <div className="flex items-center gap-3">
                     <span className="text-[9px] font-black text-indigo-600">Microsoft Project Style Enabled</span>
                </div>
            </div>
        </div>
    );
};

