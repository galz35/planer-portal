import React, { useState, useEffect, useMemo } from 'react';
import { clarityService } from '../../services/clarity.service';
import type { Proyecto } from '../../types/modelos';
import { Users, CheckCircle2, Hourglass, ShieldAlert, ArrowRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface Props {
    onVerCompleto: () => void;
}

export const DashboardAtAGlance: React.FC<Props> = ({ onVerCompleto }) => {
    const [loading, setLoading] = useState(true);
    const [workload, setWorkload] = useState<any>(null);
    const [projects, setProjects] = useState<Proyecto[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Monday to Sunday of the current week
            const startStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const endStr = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

            const [wlData, projData] = await Promise.all([
                clarityService.getWorkload(startStr, endStr),
                clarityService.getProyectos({ limit: 50 })
            ]);

            setWorkload(wlData);
            setProjects(projData?.items || []);
        } catch (error) {
            console.error('Error loading dashboard at a glance', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        if (!workload) return { teamSize: 0, completadas: 0, pendientes: 0, bloqueadas: 0, ranking: [] };

        let teamSize = workload.users?.length || 0;
        let completadas = 0;
        let pendientes = 0;
        let bloqueadas = 0;

        const ranking = (workload.users || []).map((u: any) => {
            completadas += u.tareasCompletadas || 0;
            pendientes += u.tareasActivas || 0;
            bloqueadas += u.tareasAtrasadas || 0; // Using tareasAtrasadas for 'atención req'

            return {
                nombre: u.nombre || u.carnet,
                completadas: u.tareasCompletadas || 0,
                activas: u.tareasActivas || 0
            };
        }).sort((a: any, b: any) => b.completadas - a.completadas);

        return { teamSize, completadas, pendientes, bloqueadas, ranking };
    }, [workload]);

    const calculateDelay = (p: Proyecto) => {
        const start = p.fechaInicio ? new Date(p.fechaInicio) : null;
        const end = p.fechaFin ? new Date(p.fechaFin) : null;
        const progress = Number(p.progreso ?? 0);
        const today = new Date();

        if (!start || !end) return 0;
        if (progress >= 100) return 0;
        if (today < start) return 0;

        const totalDuration = end.getTime() - start.getTime();
        const elapsed = today.getTime() - start.getTime();

        if (totalDuration <= 0) return today > end ? 100 - progress : 0;

        const expected = Math.min(100, (elapsed / totalDuration) * 100);
        const delay = Math.max(0, expected - progress);
        return Math.round(delay);
    };

    const riskyProjects = useMemo(() => {
        return projects.map(p => ({
            ...p,
            retraso: calculateDelay(p)
        }))
            .filter(p => p.retraso > 0)
            .sort((a, b) => b.retraso - a.retraso)
            .slice(0, 5); // top 5
    }, [projects]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Cargando dashboard de equipo...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in w-full pb-10">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Dashboard de Equipo
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">Esta Semana</p>
                </div>
                <button
                    onClick={onVerCompleto}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all"
                >
                    Ver Dashboard Completo
                    <ArrowRight size={14} />
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-indigo-500">
                        <Users size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Mi Equipo</span>
                    </div>
                    <span className="text-2xl font-black text-slate-800">{stats.teamSize} <span className="text-xs text-slate-400 font-medium">personas</span></span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Completadas</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700">{stats.completadas} <span className="text-xs text-emerald-500 font-medium">/ sem</span></span>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-amber-600">
                        <Hourglass size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Pendientes</span>
                    </div>
                    <span className="text-2xl font-black text-amber-700">{stats.pendientes}</span>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-rose-600">
                        <ShieldAlert size={16} />
                        <span className="text-[10px] font-black uppercase tracking-wider">Atrasadas</span>
                    </div>
                    <span className="text-2xl font-black text-rose-700">{stats.bloqueadas}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ranking */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        ⭐ Ranking Productividad
                    </h3>
                    <div className="space-y-4">
                        {stats.ranking.slice(0, 5).map((u: any, i: number) => {
                            const max = stats.ranking[0]?.completadas || 1;
                            const percent = Math.min((u.completadas / max) * 100, 100);
                            return (
                                <div key={i} className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-700">{i + 1}. {u.nombre}</span>
                                        <span className="text-slate-500">{u.completadas} <span className="text-[9px] uppercase">hechas</span></span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {stats.ranking.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No hay datos de equipo.</p>
                        )}
                    </div>
                </div>

                {/* Riesgo Proyectos */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        ⚠️ Proyectos con Riesgo
                    </h3>
                    <div className="space-y-3">
                        {riskyProjects.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-slate-50 bg-slate-50/50 hover:bg-slate-100 transition-colors">
                                <div className="flex flex-col min-w-0 pr-2">
                                    <span className="text-xs font-bold text-slate-700 leading-tight truncate">{p.nombre}</span>
                                    <span className="text-[10px] text-slate-400">Progreso: {Math.round(p.progreso || 0)}%</span>
                                </div>
                                <div className={`px-2 py-1 rounded text-[10px] font-black shrink-0 ${p.retraso > 30 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {p.retraso > 30 ? '🔴' : '🟡'} {p.retraso}% ATRASO
                                </div>
                            </div>
                        ))}
                        {riskyProjects.length === 0 && (
                            <div className="p-4 text-center rounded-xl bg-emerald-50 border border-emerald-100">
                                <p className="text-xs font-bold text-emerald-600">🟢 Todos los proyectos clave están a tiempo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
