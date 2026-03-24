import React, { useEffect, useState, useMemo } from 'react';
import { clarityService } from '../../services/clarity.service';
import type { Proyecto } from '../../types/modelos';
import { format, startOfYear, endOfYear, eachQuarterOfInterval, isWithinInterval, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Target, Calendar, AlertCircle, Loader2 } from 'lucide-react';

// --- TYPES ---
interface RoadmapItem {
    id: number;
    title: string;
    type: 'Proyecto' | 'Hito';
    startDate: Date;
    endDate: Date;
    status: string;
    progress: number;
    health: 'OnTrack' | 'Risk' | 'Delayed';
}

// --- COMPONENTS ---

const RoadmapCard: React.FC<{ item: RoadmapItem }> = ({ item }) => {
    const colorMap = {
        OnTrack: 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400',
        Risk: 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400',
        Delayed: 'bg-rose-50 border-rose-200 text-rose-800 hover:border-rose-400'
    };

    return (
        <div className={`p-4 rounded-2xl border shadow-sm mb-3 cursor-pointer transition-all hover:shadow-md ${colorMap[item.health]}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="font-black text-xs leading-tight line-clamp-2 uppercase tracking-tight">{item.title}</span>
                {item.health === 'Delayed' && <AlertCircle size={14} className="text-rose-600 shrink-0" />}
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2">
                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.progress}%</span>
                <span>{item.endDate ? format(item.endDate, 'MMM yyyy') : 'TBD'}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${item.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                    style={{ width: `${item.progress}%` }}
                />
            </div>
        </div>
    );
};

const QuarterColumn: React.FC<{
    quarterName: string;
    dateRange: { start: Date, end: Date };
    items: RoadmapItem[];
}> = ({ quarterName, dateRange, items }) => {
    return (
        <div className="flex-1 min-w-[280px] flex flex-col bg-slate-50/50 border-r border-slate-200 last:border-r-0 h-full">
            <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10 text-center shadow-sm">
                <h3 className="font-black text-slate-900 text-sm tracking-widest uppercase">{quarterName}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                    {format(dateRange.start, 'MMMM')} - {format(dateRange.end, 'MMMM')}
                </p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Calendar size={24} className="opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sin Iniciativas</span>
                    </div>
                ) : (
                    items.map(item => <RoadmapCard key={item.id} item={item} />)
                )}
            </div>
        </div>
    );
};

export const RoadmapPage: React.FC = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await clarityService.getProyectos();
                setProjects(res?.items || []);
            } catch (error) {
                console.error('Error loading roadmap data', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const roadmapItems = useMemo(() => {
        return projects.map(p => {
            // Use real dates if project has them (using fechaCreacion as start if missing)
            // End date is Creacion + 3 months by default for visualization if not defined
            // PROGRESS is 0 if no tasks or 0%, real calculation would need task aggregation
            const start = p.fechaCreacion ? new Date(p.fechaCreacion) : new Date();
            const end = addMonths(start, 3);

            return {
                id: p.idProyecto,
                title: p.nombre,
                type: 'Proyecto' as const,
                startDate: start,
                endDate: end,
                status: p.estado,
                progress: 0, // Should be calculated from tasks in a real scenario
                health: 'OnTrack' as const
            };
        });
    }, [projects]);

    const quarters = useMemo(() => {
        const start = startOfYear(new Date(year, 0, 1));
        const end = endOfYear(new Date(year, 0, 1));
        const qDates = eachQuarterOfInterval({ start, end });

        return qDates.map((qDate, idx) => {
            const qEnd = new Date(qDate.getFullYear(), qDate.getMonth() + 3, 0);
            const qRange = { start: qDate, end: qEnd };

            const qItems = roadmapItems.filter(item =>
                isWithinInterval(item.startDate, qRange) ||
                isWithinInterval(item.endDate, qRange) ||
                (item.startDate < qRange.start && item.endDate > qRange.end)
            );

            return {
                name: `Trimestre ${idx + 1}`,
                range: qRange,
                items: qItems
            };
        });
    }, [year, roadmapItems]);

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden text-slate-800 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-lg shadow-slate-100 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 text-indigo-400 rounded-2xl shadow-xl">
                        <Target size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Roadmap Estratégico</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planificación de Capacidad {year}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                    <button onClick={() => setYear(y => y - 1)} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-500 hover:text-indigo-600">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-black text-sm min-w-[80px] text-center flex items-center justify-center gap-2">
                        <Calendar size={18} className="text-indigo-500" />
                        {year}
                    </span>
                    <button onClick={() => setYear(y => y + 1)} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-500 hover:text-indigo-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-x-auto">
                <div className="h-full flex min-w-max">
                    {loading ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em]">Sincronizando Cronogramas...</p>
                        </div>
                    ) : (
                        quarters.map(q => (
                            <QuarterColumn
                                key={q.name}
                                quarterName={q.name}
                                dateRange={q.range}
                                items={q.items}
                            />
                        ))
                    )}
                </div>
            </div>

            <div className="bg-white border-t border-slate-200 px-8 py-3 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Clarity Strategic Engine</span>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> On Track</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> At Risk</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Delayed</div>
                </div>
            </div>
        </div>
    );
};
