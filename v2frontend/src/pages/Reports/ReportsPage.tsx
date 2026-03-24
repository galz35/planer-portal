import React, { useState, useEffect } from 'react';
import {
    Users,
    FileText,
    Download,
    Briefcase,
    Activity,
    Terminal,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import type { Proyecto, Usuario } from '../../types/modelos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProductivityChart } from './ProductivityChart';
import { BloqueosTrendChart } from './BloqueosTrendChart';
import { EquipoPerformanceChart } from './EquipoPerformanceChart';

// --- COMPONENTS ---

const WidgetError = ({ message, onRetry }: { message: string, onRetry?: () => void }) => (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex flex-col items-center justify-center text-rose-600 gap-2 h-full min-h-[200px]">
        <AlertTriangle size={32} />
        <p className="font-bold text-sm text-center">{message}</p>
        <p className="text-xs text-rose-400 text-center max-w-[250px]">No se pudieron cargar los datos de este widget.</p>
        {onRetry && (
            <button onClick={onRetry} className="mt-2 text-xs font-bold underline hover:text-rose-800 flex items-center gap-1">
                <RefreshCw size={12} /> Reintentar
            </button>
        )}
    </div>
);

const ProjectStatusReport = ({ projects }: { projects: Proyecto[] }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map(p => (
                    <div key={p.idProyecto} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 flex justify-between items-start">
                            <span>{p.nombre}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>
                                {p.estado || 'Activo'}
                            </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-3">{p.descripcion || 'Sin descripción'}</p>

                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                            <span>ID: {p.idProyecto}</span>
                            <span>Dueño: N{p.idNodoDuenio}</span>
                        </div>
                    </div>
                ))}
            </div>
            {projects.length === 0 && (
                <p className="text-center text-slate-400 py-10">No hay proyectos registrados.</p>
            )}
        </div>
    );
};

const TeamReport = ({ team }: { team: Usuario[] }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-in fade-in duration-500">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                        <th className="p-4">Empleado</th>
                        <th className="p-4">Correo</th>
                        <th className="p-4">Rol / Cargo</th>
                        <th className="p-4 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {team.map(u => {
                        const roleName = u.rol?.nombre || u.rolGlobal || 'Empleado';
                        return (
                            <tr key={u.idUsuario} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-bold text-slate-800">{u.nombre}</td>
                                <td className="p-4 text-slate-500">{u.correo}</td>
                                <td className="p-4 text-slate-500">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200">
                                        {roleName}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    {u.activo ?
                                        <span className="text-emerald-600 font-bold text-xs">● Activo</span> :
                                        <span className="text-slate-300 text-xs">● Inactivo</span>
                                    }
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const SystemLogsReport = ({ logs }: { logs: any[] }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl shadow-lg font-mono text-xs overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-slate-400 border-b border-slate-800 pb-2">
                    <Terminal size={14} /> System Logs (Real-time)
                </div>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="flex gap-3 hover:bg-slate-800/50 p-1 rounded">
                            <span className="text-slate-500 shrink-0">{format(new Date(log.fecha), 'HH:mm:ss')}</span>
                            <span className={`font-bold shrink-0 w-16 ${log.nivel === 'ERROR' ? 'text-rose-500' :
                                log.nivel === 'WARN' ? 'text-amber-400' : 'text-emerald-400'
                                }`}>{log.nivel}</span>
                            <span className="text-indigo-300 shrink-0 w-24">[{log.origen}]</span>
                            <span className="text-slate-300 break-all">{log.mensaje}</span>
                        </div>
                    )) : (
                        <div className="text-slate-600 italic">No hay logs recientes.</div>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---

export const ReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'projects' | 'team' | 'system' | 'productivity' | 'blockers' | 'performance'>('productivity');
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterMonth, setFilterMonth] = useState<number | undefined>(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
    const [filterIdProyecto, setFilterIdProyecto] = useState<number | undefined>(undefined);

    // Data State
    const [organigram, setOrganigram] = useState<any[]>([]);
    const [context, setContext] = useState<'gerencia' | 'area' | 'persona' | null>(null);
    const [selectedContextId, setSelectedContextId] = useState<number | string | null>(null);

    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [team, setTeam] = useState<Usuario[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [productivity, setProductivity] = useState<{ date: string, count: number }[]>([]);
    const [blockersTrend, setBlockersTrend] = useState<{ date: string, count: number }[]>([]);
    const [teamPerformance, setTeamPerformance] = useState<{ nombre: string, total: number, hechas: number, atrasadas: number, enCurso: number, porcentaje: number }[]>([]);

    // Error States
    const [errors, setErrors] = useState({
        projects: false,
        team: false,
        logs: false,
        productivity: false,
        blockers: false,
        performance: false
    });

    const loadData = async () => {
        setLoading(true);
        // Reset errors
        setErrors({ projects: false, team: false, logs: false, productivity: false, blockers: false, performance: false });

        const results = await Promise.allSettled([
            clarityService.getProyectos(),
            clarityService.getUsuarios(1, 1000),
            clarityService.getLogs(),
            clarityService.getReporteProductividad(filterMonth, filterYear, filterIdProyecto),
            clarityService.getBloqueosTrend(filterMonth, filterYear, filterIdProyecto),
            clarityService.getEquipoPerformance(filterMonth, filterYear, filterIdProyecto),
            clarityService.getOrganigrama()
        ]);

        const newErrors = { ...errors };

        // 0: Projects
        if (results[0].status === 'fulfilled') {
            const val = results[0].value as any;
            setProjects(val?.items || val || []);
        } else newErrors.projects = true;

        // 1: Users
        if (results[1].status === 'fulfilled') {
            const val = results[1].value as any;
            setTeam(val?.items || val || []);
        } else newErrors.team = true;

        // 2: Logs
        if (results[2].status === 'fulfilled') {
            const val = results[2].value as any;
            setLogs(val?.items || val || []);
        } else newErrors.logs = true;

        // 3: Productivity
        if (results[3].status === 'fulfilled') setProductivity(results[3].value || []);
        else newErrors.productivity = true;

        // 4: Blockers Trend
        if (results[4].status === 'fulfilled') setBlockersTrend(results[4].value || []);
        else newErrors.blockers = true;

        // 5: Performance
        if (results[5].status === 'fulfilled') setTeamPerformance(results[5].value || []);
        else newErrors.performance = true;

        // 6: Organigram
        if (results[6].status === 'fulfilled') setOrganigram((results[6].value as any) || []);

        setErrors(newErrors);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [filterMonth, filterYear, filterIdProyecto]);

    const printReport = () => {
        window.print();
    };

    const renderContent = () => {
        if (activeTab === 'productivity') {
            if (errors.productivity) return <WidgetError message="Error al cargar productividad" onRetry={loadData} />;
            return <ProductivityChart data={productivity} />;
        }
        if (activeTab === 'performance') {
            if (errors.performance) return <WidgetError message="Error al cargar desempeño" onRetry={loadData} />;
            return <EquipoPerformanceChart data={teamPerformance} />;
        }
        if (activeTab === 'blockers') {
            if (errors.blockers) return <WidgetError message="Error al cargar tendencia de bloqueos" onRetry={loadData} />;
            return <BloqueosTrendChart data={blockersTrend} />;
        }
        if (activeTab === 'projects') {
            if (errors.projects) return <WidgetError message="Error al cargar proyectos" onRetry={loadData} />;
            return <ProjectStatusReport projects={projects} />;
        }
        if (activeTab === 'team') {
            if (errors.team) return <WidgetError message="Error al cargar equipo" onRetry={loadData} />;
            return <TeamReport team={team} />;
        }
        if (activeTab === 'system') {
            if (errors.logs) return <WidgetError message="Error al cargar logs del sistema" onRetry={loadData} />;
            return <SystemLogsReport logs={logs} />;
        }
        return null;
    }

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5 flex flex-wrap justify-between items-center sticky top-0 z-30 shadow-sm print:hidden gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" /> Centro de Reportes
                    </h1>
                    <p className="text-slate-500 text-sm">Inteligencia de negocios y estado del sistema.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        {context && (
                            <button
                                onClick={() => { setContext(null); setSelectedContextId(null); }}
                                className="px-3 py-2 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                            >
                                ← Cambiar Ámbito
                            </button>
                        )}

                        <select
                            value={filterMonth || ''}
                            onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
                            className="bg-white border-none text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        >
                            <option value="">Mes (Todos)</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{format(new Date(2025, i, 1), 'MMMM', { locale: es })}</option>
                            ))}
                        </select>

                        <select
                            value={filterYear || ''}
                            onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
                            className="bg-white border-none text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        >
                            <option value="">Año (Todos)</option>
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>


                        <button
                            onClick={printReport}
                            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 text-xs"
                        >
                            <Download size={14} /> PDF
                        </button>

                        {(['productivity', 'blockers', 'performance'].includes(activeTab)) && (
                            <button
                                onClick={() => {
                                    const typeMap: Record<string, string> = {
                                        'productivity': 'productividad',
                                        'blockers': 'bloqueos-trend',
                                        'performance': 'equipo-performance'
                                    };
                                    clarityService.exportarReporte(typeMap[activeTab], filterMonth, filterYear, filterIdProyecto);
                                }}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/20 text-xs"
                            >
                                <FileText size={14} /> XLSX
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

                {/* Context Selector Layer */}
                {!context ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 shadow-sm border border-indigo-100">
                            <Activity size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 text-center mb-2">¿Qué deseas analizar hoy?</h2>
                        <p className="text-slate-500 text-center max-w-md mb-12">Selecciona el ámbito de los datos para generar los reportes de inteligencia.</p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                            {[
                                { id: 'gerencia', label: 'Gerencia', desc: 'Vista consolidada por departamentos principales', icon: <Briefcase /> },
                                { id: 'area', label: 'Área', desc: 'Análisis detallado de equipos y sub-áreas', icon: <Users /> },
                                { id: 'persona', label: 'Persona', desc: 'Rendimiento individual y carga de trabajo', icon: <Users /> }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setContext(item.id as any)}
                                    className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 hover:-translate-y-1 transition-all group text-left"
                                >
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-4">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{item.label}</h3>
                                    <p className="text-sm text-slate-500 mt-2">{item.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : !selectedContextId ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-300">
                        <button onClick={() => setContext(null)} className="text-sm font-bold text-indigo-600 hover:underline mb-8 flex items-center gap-2">
                            ← Volver a selección de ámbito
                        </button>
                        <h2 className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-wider">
                            Seleccionar {context === 'gerencia' ? 'Gerencia' : context === 'area' ? 'Área' : 'Persona'}
                        </h2>

                        <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                            <select
                                onChange={(e) => setSelectedContextId(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 focus:border-indigo-500 outline-none appearance-none"
                                defaultValue=""
                            >
                                <option value="" disabled>Selecciona una opción...</option>
                                {context === 'persona' ? (
                                    team.map(u => <option key={u.idUsuario} value={u.idUsuario}>{u.nombre}</option>)
                                ) : (
                                    organigram
                                        .filter(n => context === 'gerencia' ? n.tipo === 'Gerencia' || n.tipo === 'Dirección' : n.tipo === 'Subgerencia' || n.tipo === 'Equipo')
                                        .map(n => <option key={n.idNodo} value={n.idNodo}>{n.nombre}</option>)
                                )}
                            </select>

                            <p className="text-center text-xs text-slate-400 mt-6 font-medium italic">
                                Al seleccionar se cargarán automáticamente todos los gráficos y tablas de rendimiento.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-2 mb-8 print:hidden">
                            <button
                                onClick={() => setActiveTab('productivity')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'productivity' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Activity size={16} /> Productividad
                            </button>
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Briefcase size={16} /> Proyectos
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Users size={16} /> Equipo
                            </button>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'performance' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Activity size={16} /> Desempeño
                            </button>
                            <button
                                onClick={() => setActiveTab('blockers')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'blockers' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Activity size={16} /> Bloqueos
                            </button>
                            <button
                                onClick={() => setActiveTab('system')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'system' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Terminal size={16} /> Logs
                            </button>

                            <select
                                value={filterIdProyecto || ''}
                                onChange={(e) => setFilterIdProyecto(e.target.value ? Number(e.target.value) : undefined)}
                                className="bg-white border-2 border-slate-100 text-xs font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm ml-auto"
                            >
                                <option value="">Proyectos (Todos)</option>
                                {projects.map(p => (
                                    <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Report Content */}
                        <div className="min-h-[400px]">
                            <div className="mb-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded-lg border border-indigo-200">
                                        {context}: {
                                            context === 'persona'
                                                ? team.find(u => u.idUsuario === Number(selectedContextId))?.nombre
                                                : organigram.find(n => n.idNodo === Number(selectedContextId))?.nombre
                                        }
                                    </span>
                                    <h2 className="text-xl font-bold text-slate-800">
                                        {activeTab === 'productivity' && 'Rendimiento de Operación'}
                                        {activeTab === 'performance' && 'Desempeño del Equipo'}
                                        {activeTab === 'blockers' && 'Salud de Flujo (Bloqueos)'}
                                        {activeTab === 'projects' && 'Estado General de Proyectos'}
                                        {activeTab === 'team' && 'Directorio de Personal'}
                                        {activeTab === 'system' && 'Auditoría del Sistema'}
                                    </h2>
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
                                    Generado: {format(new Date(), "dd MMM, HH:mm", { locale: es })}
                                </span>
                            </div>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                                    <Activity className="animate-spin mb-4" size={40} />
                                    <p>Generando reporte en tiempo real...</p>
                                </div>
                            ) : (
                                renderContent()
                            )}
                        </div>
                    </div>
                )}

                {/* Footer for Print */}
                <div className="hidden print:block mt-10 pt-10 border-t border-slate-300 text-center text-xs text-slate-500">
                    <p>Planner-EF System Report • Confidencial • {new Date().getFullYear()}</p>
                </div>
            </main>
        </div>
    );
};
