import React, { useState, useEffect } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { BarChart3, CheckCircle2, Circle, AlertTriangle, Layers, ArrowUpRight } from 'lucide-react';

interface Props {
    userId: number;
}

interface KpiData {
    resumen: {
        total: number;
        hechas: number;
        pendientes: number;
        bloqueadas: number;
        promedioAvance: number;
    };
    proyectos: {
        proyecto: string;
        area: string;
        total: number;
        hechas: number;
    }[];
}

export const DashboardEjecutivo: React.FC<Props> = ({ userId }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<KpiData | null>(null);

    useEffect(() => {
        loadStats();
    }, [userId]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const res = await clarityService.getDashboardKPIs();
            if (res) setData(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-400 animate-pulse">
                <div className="h-8 w-32 bg-gray-200 rounded mx-auto mb-4"></div>
                Cargando indicadores...
            </div>
        );
    }

    if (!data) return <div className="p-8 text-center text-gray-400">No hay datos disponibles</div>;

    const { resumen, proyectos } = data;
    const completionRate = resumen.total > 0 ? Math.round((resumen.hechas / resumen.total) * 100) : 0;

    return (
        <div className="space-y-8 p-1">
            {/* Header Simple */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="text-indigo-600" size={24} />
                        Dashboard Ejecutivo
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Visión general del rendimiento opertativo</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-indigo-600">{completionRate}%</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Efectividad Global</p>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Total Tareas"
                    value={resumen.total}
                    icon={<Layers size={18} />}
                    color="text-gray-600"
                    bg="bg-gray-50"
                />
                <MetricCard
                    label="Completadas"
                    value={resumen.hechas}
                    icon={<CheckCircle2 size={18} />}
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <MetricCard
                    label="En Proceso"
                    value={resumen.pendientes}
                    icon={<Circle size={18} />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <MetricCard
                    label="Bloqueadas"
                    value={resumen.bloqueadas}
                    icon={<AlertTriangle size={18} />}
                    color="text-red-600"
                    bg="bg-red-50"
                />
            </div>

            {/* Desglose por Proyecto */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 text-sm">Rendimiento por Proyecto</h3>
                    <span className="text-xs text-gray-400">{proyectos.length} proyectos activos</span>
                </div>
                <div className="divide-y divide-gray-50">
                    {proyectos.map((p, idx) => {
                        const rate = p.total > 0 ? Math.round((p.hechas / p.total) * 100) : 0;
                        return (
                            <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{p.proyecto}</p>
                                    <p className="text-xs text-gray-400">{p.area || 'General'}</p>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 mb-1">Progreso</p>
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                style={{ width: `${rate}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="min-w-[3rem] text-right">
                                        <span className="text-sm font-bold text-gray-700">{rate}%</span>
                                    </div>
                                    <ArrowUpRight size={16} className="text-gray-300" />
                                </div>
                            </div>
                        );
                    })}
                    {proyectos.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No hay proyectos activos para mostrar
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, icon, color, bg }: any) => (
    <div className={`rounded-xl p-5 border border-transparent ${bg} transition-all hover:scale-[1.02]`}>
        <div className={`flex items-center gap-2 mb-3 ${color}`}>
            {icon}
            <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-3xl font-black text-gray-800">{value}</p>
    </div>
);

