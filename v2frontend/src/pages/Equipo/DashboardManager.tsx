
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { planningService } from '../../services/planning.service';
import type { Proyecto } from '../../types/modelos';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Search, Calendar, LayoutList, Shield, Users,
    Briefcase, ChevronRight,
    BarChart3, AlertCircle, Clock, ChevronLeft,
    Building2, Filter, Layers, ChevronDown, X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { DelegacionModal } from '../../components/acceso/DelegacionModal';
import { MiEquipoPage } from './MiEquipoPage';
import { TaskDetailModalV2 } from '../../components/task-detail-v2/TaskDetailModalV2';
import { DashboardAtAGlance } from './DashboardAtAGlance';

// -- COMPONENTE INTERNO: Tabla de Alertas Paginada y Filtrable --
const AlertsTable = ({ tasks, title, type, onTaskClick }: { tasks: any[]; title: string; type: 'danger' | 'success'; onTaskClick: (t: any) => void }) => {
    const [page, setPage] = useState(1);
    const [term, setTerm] = useState('');
    const itemsPerPage = 5;

    // Filtro local
    const filtered = useMemo(() => tasks.filter(t =>
        t.titulo.toLowerCase().includes(term.toLowerCase()) ||
        (t.asignado || '').toLowerCase().includes(term.toLowerCase()) ||
        (t.proyectoNombre || '').toLowerCase().includes(term.toLowerCase())
    ), [tasks, term]);

    // Paginación
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentData = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    // Tema de colores
    const theme = type === 'danger'
        ? { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', icon: 'text-rose-500', badge: 'bg-rose-100 text-rose-700' }
        : { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };

    return (
        <div className={`bg-white rounded-2xl border ${theme.border} shadow-sm overflow-hidden flex flex-col h-full`}>
            {/* Header Tabla */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme.bg} ${theme.text}`}>
                            {type === 'danger' ? <AlertCircle size={20} /> : <Clock size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{filtered.length} Tareas</p>
                        </div>
                    </div>
                </div>
                {/* Search Bar */}
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar por tarea, responsable, proyecto..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                        value={term}
                        onChange={e => { setTerm(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-50 bg-slate-50/30">
                            <th className="px-4 py-3 w-[45%]">Descripción Tarea</th>
                            <th className="px-4 py-3">Responsable</th>
                            <th className="px-4 py-3 text-right">Fecha Objetiva</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {currentData.length > 0 ? currentData.map((t, i) => (
                            <tr
                                key={i}
                                onClick={() => onTaskClick(t)}
                                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                                <td className="px-4 py-3 align-top">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-700 line-clamp-2 leading-tight mb-0.5">{t.titulo}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{t.proyectoNombre || 'Sin Proyecto'}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full ${theme.bg} flex items-center justify-center text-[9px] font-black ${theme.text} shrink-0`}>
                                            {(t.asignado || 'U').charAt(0)}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-600 truncate max-w-[100px]">{t.asignado}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right align-top relative">
                                    <div className="flex flex-col items-end">
                                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${(t.estado === 'Hecha' || t.estado === 'Completada')
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {(t.estado === 'Hecha' || t.estado === 'Completada')
                                                ? format(new Date(t.fechaCompletado || t.fechaFinReal || t.fechaObjetivo || new Date()), 'dd MMM', { locale: es })
                                                : (t.fechaObjetivo ? format(new Date(t.fechaObjetivo), 'dd MMM', { locale: es }) : '--')}
                                        </span>
                                        {(t.estado === 'Hecha' || t.estado === 'Completada') && t.fechaObjetivo && (
                                            <span className="text-[8px] text-slate-400 mt-0.5 font-medium italic">Vencía: {format(new Date(t.fechaObjetivo), 'dd/MM')}</span>
                                        )}
                                    </div>
                                    <div className="hidden group-hover:block absolute right-2 mt-2">
                                        <button
                                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white shadow py-1 px-2 rounded-lg"
                                            onClick={(e) => { e.stopPropagation(); onTaskClick(t); }}
                                        >
                                            Ver
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={3} className="py-12 text-center text-xs text-slate-400 italic">No se encontraron resultados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {
                totalPages > 1 && (
                    <div className="px-4 py-2 border-t border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <span className="text-[10px] font-bold text-slate-400">Página {page} de {totalPages}</span>
                        <div className="flex gap-1">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-500"><ChevronLeft size={14} /></button>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-30 transition-all text-slate-500"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export const DashboardManager: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showToast } = useToast();

    // -- STATE --
    const [activeTab, setActiveTab] = useState<'atAGlance' | 'projects' | 'team' | 'alerts' | 'projectTasks' | 'orgView' | 'projView'>('atAGlance');
    const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);

    // Data State
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // User requested 5 or 10

    // Due Tasks Summary State
    const [dueTasks, setDueTasks] = useState<{ today: any[], overdue: any[] }>({ today: [], overdue: [] });
    // Selection for Modal
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [orgFilter, setOrgFilter] = useState({ gerencia: '', subgerencia: '', area: '', search: '' });
    const [expandedSubgerencias, setExpandedSubgerencias] = useState<string[]>([]);
    const [orgPage, setOrgPage] = useState(1);
    const [projPage, setProjPage] = useState(1);
    const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
    const orgGroupsPerPage = 6;

    // -- LOAD DATA METHODS --
    const loadProjects = async () => {
        setLoading(true);
        try {
            const result = await clarityService.getProyectos({
                limit: 50,
                nombre: searchTerm
            });

            if (result) {
                let items = result.items || [];
                if (items.length === 0 && !searchTerm) {
                    const myProjects = await planningService.getMyProjects();
                    items = myProjects?.map(p => ({
                        idProyecto: p.id,
                        nombre: p.nombre,
                        gerencia: p.gerencia,
                        subgerencia: p.subgerencia,
                        area: p.area,
                        estado: p.estado,
                        fechaInicio: p.fechaInicio,
                        fechaFin: p.fechaFin,
                        progreso: p.progress,
                        tareas: []
                    })) || [];
                }
                // FILTER: Reglas de Negocio Gerenciales (Solo Estratégicos y Clientes Clave)
                const filteredItems = items.filter(p => {
                    const tipo = (p.tipo || '').toUpperCase();
                    const nombre = (p.nombre || '').toUpperCase();
                    const cliente = (p.area || '').toUpperCase(); // A veces cliente viene en area

                    // 1. Exclusiones explícitas
                    if (tipo.includes('ADMIN') || tipo.includes('ADMON') || tipo.includes('LOGIST')) return false;

                    // 2. Inclusiones requeridas (Estratégico, CENAM, AMX)
                    if (tipo.includes('ESTRAT') || tipo.includes('CENAM') || tipo.includes('AMX')) return true;
                    if (nombre.includes('CENAM') || nombre.includes('AMX')) return true;
                    if (cliente.includes('CENAM') || cliente.includes('AMX')) return true;

                    // 3. Por defecto ocultar si no es explícitamente estratégico/clave
                    return false;
                });

                setProjects(filteredItems);
            }
        } catch (error) {
            console.error(error);
            showToast('Error cargando proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadAlerts = async () => {
        try {
            const data = await clarityService.getDashboardAlerts();
            if (data) {
                setDueTasks({ today: data.today || [], overdue: data.overdue || [] });
            }
        } catch (error) {
            console.error('Error loading dashboard alerts', error);
        }
    };

    // -- EFFECTS --
    useEffect(() => {
        loadProjects();
    }, [searchTerm]);

    useEffect(() => {
        loadAlerts();
    }, []);

    // -- HANDLERS --
    const handleTaskClick = (taskAlert: any) => {
        // Mapear alerta a estructura compatible con Tarea si es necesario
        // El modal espera { id, nombre... } pero taskAlert tiene { idTarea, titulo... }
        // Hacemos un mapeo básico para que el modal funcione o falle elegantemente.
        const mappedTask = {
            ...taskAlert,
            id: taskAlert.idTarea,
            nombre: taskAlert.titulo,
            // Si faltan datos críticos, el modal podría necesitar un refetch dentro,
            // pero por ahora pasamos lo que tenemos.
        };
        setSelectedTask(mappedTask);
    };

    const handleTaskUpdate = () => {
        loadAlerts();
        loadProjects();
    };

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

    const renderAtraso = (p: Proyecto) => {
        const delay = calculateDelay(p);
        if (delay <= 0) return <span className="text-[10px] font-bold text-slate-300">0%</span>;

        const color = delay > 30 ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-amber-600 bg-amber-50 border-amber-100';

        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black border ${color}`}>
                {delay}%
            </span>
        );
    };

    // -- KPIS & FILTERS --
    const [columnFilters, setColumnFilters] = useState({ area: '', estado: '' });

    const stats = useMemo(() => {
        const total = projects.length;
        // Contar áreas únicas (excluyendo nulos)
        const uniqueAreas = new Set(projects.map(p => p.area).filter(Boolean)).size;
        return { total, uniqueAreas };
    }, [projects]);

    // -- ORG VIEW LOGIC (TOP LEVEL HOOKS) --
    const filteredTasksOrg = useMemo(() => {
        const allTasks = [...dueTasks.today, ...dueTasks.overdue];
        return allTasks.filter(t =>
            (!orgFilter.gerencia || t.gerencia === orgFilter.gerencia) &&
            (!orgFilter.subgerencia || t.subgerencia === orgFilter.subgerencia) &&
            (!orgFilter.area || t.area === orgFilter.area) &&
            (!orgFilter.search ||
                t.titulo.toLowerCase().includes(orgFilter.search.toLowerCase()) ||
                (t.asignado || '').toLowerCase().includes(orgFilter.search.toLowerCase()) ||
                (t.area || '').toLowerCase().includes(orgFilter.search.toLowerCase())
            )
        ).sort((a, b) => {
            const aDone = a.estado === 'Hecha' || a.estado === 'Completada' ? 1 : 0;
            const bDone = b.estado === 'Hecha' || b.estado === 'Completada' ? 1 : 0;
            return aDone - bDone;
        });
    }, [dueTasks, orgFilter]);

    useEffect(() => {
        if (orgFilter.search && filteredTasksOrg.length > 0) {
            const groupsWithResults = Array.from(new Set(filteredTasksOrg.map(t => {
                let key = t.subgerencia || 'Sin Subgerencia';
                if (key.toUpperCase() === 'NO APLICA' && t.gerencia) key = t.gerencia;
                return key;
            })));
            setExpandedSubgerencias(groupsWithResults);
        }
    }, [orgFilter.search, filteredTasksOrg]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const term = searchTerm.toLowerCase();
            const areaFilter = columnFilters.area.toLowerCase();
            const statusFilter = columnFilters.estado.toLowerCase();

            const matchesSearch = p.nombre.toLowerCase().includes(term) ||
                (p.gerencia || '').toLowerCase().includes(term);

            const matchesArea = !areaFilter || (p.area || '').toLowerCase().includes(areaFilter) ||
                (p.gerencia || '').toLowerCase().includes(areaFilter); // Buscamos en area o gerencia para mayor flexibilidad

            const matchesStatus = !statusFilter || (p.estado || '').toLowerCase().includes(statusFilter);

            return matchesSearch && matchesArea && matchesStatus;
        });
    }, [projects, searchTerm, columnFilters]);

    // -- PAGINATION LOGIC --
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(start, start + itemsPerPage);
    }, [filteredProjects, currentPage]);

    // -- RENDER ALERT TABLES (Split into No Project vs Projects) --
    const renderRevisionTab = () => (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
            <AlertsTable
                title="Entregas de Hoy"
                tasks={dueTasks.today.filter(t => !t.idProyecto && (!t.proyectoNombre || t.proyectoNombre === 'Sin Proyecto'))}
                type="success"
                onTaskClick={handleTaskClick}
            />
            <AlertsTable
                title="Tareas Individuales Atrasadas"
                tasks={dueTasks.overdue.filter(t => !t.idProyecto && (!t.proyectoNombre || t.proyectoNombre === 'Sin Proyecto'))}
                type="danger"
                onTaskClick={handleTaskClick}
            />
        </div>
    );

    const renderProjectTasksTab = () => {
        const projectOverdue = dueTasks.overdue.filter(t => t.idProyecto || (t.proyectoNombre && t.proyectoNombre !== 'Sin Proyecto'));
        const projectToday = dueTasks.today.filter(t => t.idProyecto || (t.proyectoNombre && t.proyectoNombre !== 'Sin Proyecto'));

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
                <AlertsTable
                    title="Tareas Atrasadas Proyectos"
                    tasks={projectOverdue}
                    type="danger"
                    onTaskClick={handleTaskClick}
                />
                <AlertsTable
                    title="Entregas de Hoy (Proyecto)"
                    tasks={projectToday}
                    type="success"
                    onTaskClick={handleTaskClick}
                />
            </div>
        );
    };

    const renderProjectViewTab = () => {
        const allTasks = [...dueTasks.today, ...dueTasks.overdue].filter(t => t.idProyecto || (t.proyectoNombre && t.proyectoNombre !== 'Sin Proyecto'));

        // Ordenar tareas dentro de cada grupo
        const sortedTasks = allTasks.sort((a, b) => {
            const aDone = a.estado === 'Hecha' || a.estado === 'Completada' ? 1 : 0;
            const bDone = b.estado === 'Hecha' || b.estado === 'Completada' ? 1 : 0;
            return aDone - bDone;
        });

        const filtered = sortedTasks.filter(t =>
            (!orgFilter.gerencia || t.gerencia === orgFilter.gerencia) &&
            (!orgFilter.subgerencia || t.subgerencia === orgFilter.subgerencia) &&
            (!orgFilter.search ||
                t.titulo.toLowerCase().includes(orgFilter.search.toLowerCase()) ||
                (t.asignado || '').toLowerCase().includes(orgFilter.search.toLowerCase()) ||
                (t.proyectoNombre || '').toLowerCase().includes(orgFilter.search.toLowerCase())
            )
        );

        const grouped = filtered.reduce((acc: any, t) => {
            const key = t.proyectoNombre || 'Proyecto Desconocido';
            if (!acc[key]) acc[key] = { tasks: [], sub: t.subgerencia };
            acc[key].tasks.push(t);
            return acc;
        }, {});

        const projectKeys = Object.keys(grouped).sort();
        const totalProjPages = Math.ceil(projectKeys.length / orgGroupsPerPage);
        const currentProjects = projectKeys.slice((projPage - 1) * orgGroupsPerPage, projPage * orgGroupsPerPage);

        const toggleProj = (p: string) => {
            setExpandedProjects(prev =>
                prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
            );
        };

        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Filtros Compactos */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1 mr-2 text-indigo-500 shrink-0">
                        <Filter size={12} />
                        <span className="text-[9px] font-black uppercase">Filtros Proy:</span>
                    </div>

                    <div className="relative flex-1 min-w-[150px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                        <input
                            type="text"
                            placeholder="Buscar proyecto o tarea..."
                            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            value={orgFilter.search}
                            onChange={e => { setOrgFilter({ ...orgFilter, search: e.target.value }); setProjPage(1); }}
                        />
                    </div>

                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 min-w-[110px]"
                        value={orgFilter.gerencia}
                        onChange={e => { setOrgFilter({ ...orgFilter, gerencia: e.target.value, subgerencia: '' }); setProjPage(1); }}
                    >
                        <option value="">Gerencia...</option>
                        {Array.from(new Set(allTasks.map(t => t.gerencia).filter(Boolean))).sort().map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 min-w-[110px]"
                        value={orgFilter.subgerencia}
                        onChange={e => { setOrgFilter({ ...orgFilter, subgerencia: e.target.value }); setProjPage(1); }}
                    >
                        <option value="">Subgerencia...</option>
                        {Array.from(new Set(allTasks.filter(t => !orgFilter.gerencia || t.gerencia === orgFilter.gerencia).map(t => t.subgerencia).filter(Boolean))).sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                        onClick={() => { setOrgFilter({ gerencia: '', subgerencia: '', area: '', search: '' }); setProjPage(1); }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Acordeón de Proyectos */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <th className="px-3 py-2 w-[60%]">Proyecto / Entregable</th>
                                <th className="px-3 py-2 hidden md:table-cell w-[25%]">Responsable</th>
                                <th className="px-3 py-2 text-right w-[15%]">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentProjects.map(projKey => {
                                const isExpanded = expandedProjects.includes(projKey);
                                const { tasks, sub } = grouped[projKey];
                                const doneCount = tasks.filter((t: any) => t.estado === 'Hecha' || t.estado === 'Completada').length;

                                return (
                                    <React.Fragment key={projKey}>
                                        <tr
                                            onClick={() => toggleProj(projKey)}
                                            className="bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-l-indigo-600"
                                        >
                                            <td colSpan={3} className="px-3 py-2">
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    {isExpanded ? <ChevronDown size={12} className="text-indigo-600" /> : <ChevronRight size={12} className="text-slate-400" />}
                                                    <Briefcase size={10} className="text-indigo-400" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] text-slate-800 uppercase truncate leading-tight">{projKey}</span>
                                                        <span className="text-[7px] text-slate-400 font-black uppercase tracking-widest">{sub || 'General'}</span>
                                                    </div>
                                                    <div className="flex gap-1 ml-auto shrink-0">
                                                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                            {tasks.length}
                                                        </span>
                                                        <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            {doneCount} OK
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && tasks.map((t: any) => (
                                            <tr
                                                key={t.idTarea}
                                                onClick={() => handleTaskClick(t)}
                                                className="hover:bg-indigo-50/20 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-7 py-1.5">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-700 leading-tight uppercase truncate">{t.titulo}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Clock size={8} className="text-slate-300" />
                                                            <span className="text-[8px] font-medium text-slate-400">Objetivo: {t.fechaObjetivo ? format(new Date(t.fechaObjetivo), 'dd/MM/yy') : '--'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 hidden md:table-cell">
                                                    <div className="flex items-center gap-1.5">

                                                        <span className="text-[9px] font-bold text-slate-500 truncate uppercase">@{t.asignado}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span className={`inline-block px-1 py-0.2 rounded text-[8px] font-black uppercase ${(t.estado === 'Hecha' || t.estado === 'Completada')
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {t.estado === 'Hecha' || t.estado === 'Completada' ? 'OK' : 'PEND'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                            {projectKeys.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center text-[10px] font-bold text-slate-400 italic">No se encontraron proyectos con tareas pendientes hoy</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalProjPages > 1 && (
                        <div className="px-3 py-1.5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Pag. {projPage} / {totalProjPages} ({projectKeys.length} Proyectos)
                            </span>
                            <div className="flex gap-1">
                                <button disabled={projPage === 1} onClick={() => setProjPage(p => p - 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all text-slate-500"><ChevronLeft size={12} /></button>
                                <button disabled={projPage === totalProjPages} onClick={() => setProjPage(p => p + 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all text-slate-500"><ChevronRight size={12} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderOrgTab = () => {
        const allTasks = [...dueTasks.today, ...dueTasks.overdue];

        // Remove gerencias, subgerencias, areas from here as they are not used in the new filter structure
        // const gerencias = Array.from(new Set(allTasks.map(t => t.gerencia).filter(Boolean)));
        // const subgerencias = Array.from(new Set(allTasks.map(t => t.subgerencia).filter(Boolean)));
        // const areas = Array.from(new Set(allTasks.map(t => t.area).filter(Boolean)));

        const grouped = filteredTasksOrg.reduce((acc: any, t) => {
            let key = t.subgerencia || 'Sin Subgerencia';
            if (key.toUpperCase() === 'NO APLICA' && t.gerencia) {
                key = t.gerencia;
            }
            if (!acc[key]) acc[key] = [];
            acc[key].push(t);
            return acc;
        }, {});

        const groupKeys = Object.keys(grouped).sort();
        const totalOrgPages = Math.ceil(groupKeys.length / orgGroupsPerPage);
        const currentGroups = groupKeys.slice((orgPage - 1) * orgGroupsPerPage, orgPage * orgGroupsPerPage);

        const toggleSub = (sub: string) => {
            setExpandedSubgerencias(prev =>
                prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
            );
        };

        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Filtros Compactos */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center">
                    <div className="flex items-center gap-1 mr-2 text-indigo-500 shrink-0">
                        <Filter size={12} />
                        <span className="text-[9px] font-black uppercase">Filtros:</span>
                    </div>

                    <div className="relative flex-1 min-w-[150px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                            value={orgFilter.search}
                            onChange={e => { setOrgFilter({ ...orgFilter, search: e.target.value }); setOrgPage(1); }}
                        />
                    </div>

                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 min-w-[100px]"
                        value={orgFilter.gerencia}
                        onChange={e => { setOrgFilter({ ...orgFilter, gerencia: e.target.value, subgerencia: '', area: '' }); setOrgPage(1); }}
                    >
                        <option value="">Gerencia...</option>
                        {Array.from(new Set(allTasks.map(t => t.gerencia).filter(Boolean))).sort().map(g => <option key={g} value={g}>{g}</option>)}
                    </select>

                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 min-w-[100px]"
                        value={orgFilter.subgerencia}
                        onChange={e => { setOrgFilter({ ...orgFilter, subgerencia: e.target.value, area: '' }); setOrgPage(1); }}
                    >
                        <option value="">Subgerencia...</option>
                        {Array.from(new Set(allTasks
                            .filter(t => !orgFilter.gerencia || t.gerencia === orgFilter.gerencia)
                            .map(t => t.subgerencia).filter(Boolean)
                        )).sort().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <select
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 min-w-[100px]"
                        value={orgFilter.area}
                        onChange={e => { setOrgFilter({ ...orgFilter, area: e.target.value }); setOrgPage(1); }}
                    >
                        <option value="">Área...</option>
                        {Array.from(new Set(allTasks
                            .filter(t => (!orgFilter.gerencia || t.gerencia === orgFilter.gerencia) && (!orgFilter.subgerencia || t.subgerencia === orgFilter.subgerencia))
                            .map(t => t.area).filter(Boolean)
                        )).sort().map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <button
                        onClick={() => { setOrgFilter({ gerencia: '', subgerencia: '', area: '', search: '' }); setOrgPage(1); }}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all ml-auto shrink-0"
                        title="Limpiar Filtros"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Acordeón de Subgerencias */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100">
                                <th className="px-3 py-2 w-[55%]">Grupo / Tarea</th>
                                <th className="px-3 py-2 hidden md:table-cell w-[30%]">Resp. & Carnet</th>
                                <th className="px-3 py-2 text-right w-[15%]">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentGroups.map(sub => {
                                const isExpanded = expandedSubgerencias.includes(sub);
                                const tasks = grouped[sub];
                                const doneCount = tasks.filter((t: any) => t.estado === 'Hecha' || t.estado === 'Completada').length;

                                return (
                                    <React.Fragment key={sub}>
                                        <tr
                                            onClick={() => toggleSub(sub)}
                                            className="bg-slate-50/30 hover:bg-slate-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-l-indigo-400"
                                        >
                                            <td colSpan={3} className="px-3 py-2">
                                                <div className="flex items-center gap-1.5 font-bold">
                                                    {isExpanded ? <ChevronDown size={12} className="text-indigo-500" /> : <ChevronRight size={12} className="text-slate-400" />}
                                                    <Building2 size={10} className="text-slate-400" />
                                                    <span className="text-[10px] text-slate-700 uppercase truncate">{sub}</span>
                                                    <div className="flex gap-1 ml-auto shrink-0">
                                                        <span className="text-[8px] font-black px-1 py-0.2 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            {doneCount} OK
                                                        </span>
                                                        <span className="text-[8px] font-black px-1 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-100">
                                                            {tasks.length - doneCount} PEND
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && tasks.map((t: any) => (
                                            <tr
                                                key={t.idTarea}
                                                onClick={() => handleTaskClick(t)}
                                                className="hover:bg-indigo-50/20 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-7 py-1.5">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-indigo-700 leading-none truncate uppercase">{t.titulo}</span>
                                                        <span className="text-[8px] font-medium text-slate-400 mt-0.5">{t.area || '--'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 hidden md:table-cell">
                                                    <div className="flex items-center gap-1.5">

                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[9px] font-bold text-slate-500 tracking-tight leading-none truncate uppercase">@{t.asignado}</span>
                                                            <span className="text-[7px] font-black text-slate-300 leading-none">{t.usuarioCarnet}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span className={`inline-block px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-tighter ${(t.estado === 'Hecha' || t.estado === 'Completada')
                                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                                                        }`}>
                                                        {t.estado === 'Hecha' || t.estado === 'Completada' ? 'OK' : 'PEND'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                            {groupKeys.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center">
                                        <Layers size={24} className="mx-auto text-slate-200 mb-1" />
                                        <p className="text-[10px] font-bold text-slate-400">Sin tareas en este grupo</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Controles de Paginación Org */}
                    {totalOrgPages > 1 && (
                        <div className="px-3 py-1.5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Página {orgPage} de {totalOrgPages} ({groupKeys.length} Grupos)
                            </span>
                            <div className="flex gap-1">
                                <button
                                    disabled={orgPage === 1}
                                    onClick={() => setOrgPage(p => p - 1)}
                                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all text-slate-500"
                                >
                                    <ChevronLeft size={12} />
                                </button>
                                <button
                                    disabled={orgPage === totalOrgPages}
                                    onClick={() => setOrgPage(p => p + 1)}
                                    className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 disabled:opacity-20 transition-all text-slate-500"
                                >
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // -- RENDER TABLE --
    const renderTable = () => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-slate-500 shadow-sm">
                        <LayoutList size={16} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Portafolio de Proyectos</span>
                    <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100">
                        {projects.length}
                    </span>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        {/* Headers */}
                        <tr className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4 w-[35%]">Detalle Proyecto</th>
                            <th className="px-6 py-4 w-[20%]">
                                <div className="space-y-2">
                                    <span>Area / Gerencia</span>
                                    <input
                                        type="text"
                                        placeholder="Filtrar..."
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-normal text-slate-600 focus:border-indigo-400 outline-none"
                                        value={columnFilters.area}
                                        onChange={e => setColumnFilters(prev => ({ ...prev, area: e.target.value }))}
                                    />
                                </div>
                            </th>
                            <th className="px-6 py-4 w-[15%] text-center">Avance</th>
                            <th className="px-6 py-4 w-[15%] text-center">Atraso</th>
                            <th className="px-6 py-4 w-[15%] text-right">
                                <div className="space-y-2 flex flex-col items-end">
                                    <span>Estado</span>
                                    <select
                                        className="w-24 px-1 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-normal text-slate-600 focus:border-indigo-400 outline-none"
                                        value={columnFilters.estado}
                                        onChange={e => setColumnFilters(prev => ({ ...prev, estado: e.target.value }))}
                                    >
                                        <option value="">Todos</option>
                                        <option value="EnCurso">En Curso</option>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="Completado">Hecho</option>
                                        <option value="Detenido">Detenidos</option>
                                    </select>
                                </div>
                            </th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-xs font-bold text-slate-400">Cargando datos...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : projects.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-16 text-center text-slate-400 text-xs font-medium italic">
                                    No se encontraron proyectos activos
                                </td>
                            </tr>
                        ) : (
                            paginatedProjects.map((p) => (
                                <tr
                                    key={p.idProyecto}
                                    onClick={() => navigate(`/app/planning/plan-trabajo?projectId=${p.idProyecto}`)}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors mb-1">
                                                {p.nombre}
                                            </span>
                                            <div className="flex flex-wrap gap-2 items-center mb-1">
                                                {p.tipo && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${p.tipo.toUpperCase().includes('ESTRAT') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                        p.tipo.toUpperCase().includes('CENAM') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            p.tipo.toUpperCase().includes('AMX') ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                                'bg-slate-50 text-slate-600 border-slate-100'
                                                        }`}>
                                                        {p.tipo}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
                                                    <Calendar size={10} />
                                                    {p.fechaInicio ? format(new Date(p.fechaInicio), 'dd MMM', { locale: es }) : '--'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-600">{p.area || 'General'}</span>
                                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{p.subgerencia || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-center w-full max-w-[120px] mx-auto">
                                            <div className="flex justify-between w-full mb-1">
                                                <span className="text-[10px] font-bold text-slate-400">Total</span>
                                                <span className={`text-[10px] font-black ${(p.progreso || 0) === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                                    {p.progreso || 0}%
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${(p.progreso || 0) === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${p.progreso || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {renderAtraso(p)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black uppercase border tracking-wide ${p.estado === 'EnEjecucion' || p.estado === 'Confirmado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            p.estado === 'Cerrado' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                                'bg-indigo-50 text-indigo-600 border-indigo-100'
                                            }`}>
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-300">
                                        <ChevronRight size={16} className="group-hover:text-indigo-400 transition-colors" />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, projects.length)} de {projects.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div className="bg-white px-3 py-1 rounded-md border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                        {currentPage}
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfcfd] font-sans pb-24">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/95">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-xl shadow-lg shadow-slate-200 text-white">
                                <BarChart3 size={20} />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-800 tracking-tight">Panel de Control</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión Estratégica</p>
                            </div>
                        </div>

                        {/* TABS NAVIGATION */}
                        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
                            <button
                                onClick={() => setActiveTab('atAGlance')}
                                className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
                                ${activeTab === 'atAGlance' ? 'text-indigo-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Resumen
                            </button>

                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
                                ${activeTab === 'projects' ? 'text-indigo-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Proyectos
                            </button>

                            <button
                                onClick={() => setActiveTab('team')}
                                className={`relative px-4 py-2 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
                                ${activeTab === 'team' ? 'text-indigo-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Equipo
                            </button>

                            <button
                                onClick={() => setActiveTab('alerts')}
                                className={`relative px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === 'alerts' ? 'text-indigo-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-indigo-500'}`}
                            >
                                Tareas
                                {(() => {
                                    const count = dueTasks.overdue.filter(t => !t.idProyecto && (!t.proyectoNombre || t.proyectoNombre === 'Sin Proyecto')).length +
                                        dueTasks.today.filter(t => !t.idProyecto && (!t.proyectoNombre || t.proyectoNombre === 'Sin Proyecto')).length;
                                    return count > 0 && (
                                        <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-indigo-200">
                                            {count}
                                        </span>
                                    );
                                })()}
                                {activeTab === 'alerts' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-sm"></span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('projectTasks')}
                                className={`relative px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === 'projectTasks' ? 'text-rose-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-rose-500'}`}
                            >
                                Proyecto
                                {(() => {
                                    const count = dueTasks.overdue.filter(t => t.idProyecto || (t.proyectoNombre && t.proyectoNombre !== 'Sin Proyecto')).length +
                                        dueTasks.today.filter(t => t.idProyecto || (t.proyectoNombre && t.proyectoNombre !== 'Sin Proyecto')).length;
                                    return count > 0 && (
                                        <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[9px] font-black border border-rose-200">
                                            {count}
                                        </span>
                                    );
                                })()}
                                {activeTab === 'projectTasks' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full shadow-sm shadow-rose-200"></span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('orgView')}
                                className={`relative px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === 'orgView' ? 'text-emerald-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}
                            >
                                <Building2 size={14} />
                                Vista Org
                                {activeTab === 'orgView' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full shadow-sm"></span>
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('projView')}
                                className={`relative px-4 py-3 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                                ${activeTab === 'projView' ? 'text-indigo-600 bg-white rounded-lg shadow-sm' : 'text-slate-400 hover:text-indigo-500'}`}
                            >
                                <Briefcase size={14} />
                                Vista Proy
                                {activeTab === 'projView' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-sm"></span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {activeTab === 'atAGlance' && (
                    <DashboardAtAGlance onVerCompleto={() => setActiveTab('projects')} />
                )}
                {activeTab === 'projects' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-700">
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Proyectos</p>
                                    <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Briefcase size={20} />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between col-span-2 md:col-span-1">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Áreas Involucradas</p>
                                    <p className="text-2xl font-black text-slate-800">{stats.uniqueAreas}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <Users size={20} />
                                </div>
                            </div>
                        </div>

                        {renderTable()}
                    </div>
                )}
                {activeTab === 'team' && <MiEquipoPage />}
                {activeTab === 'alerts' && renderRevisionTab()}
                {activeTab === 'projectTasks' && renderProjectTasksTab()}
                {activeTab === 'orgView' && renderOrgTab()}
                {activeTab === 'projView' && renderProjectViewTab()}
            </main>

            {/* Delegation Button */}
            <button
                onClick={() => setIsDelegationModalOpen(true)}
                className="fixed bottom-8 right-8 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all z-50 group"
            >
                <Shield size={20} className="group-hover:rotate-12 transition-transform" />
            </button>

            <DelegacionModal
                isOpen={isDelegationModalOpen}
                onClose={() => setIsDelegationModalOpen(false)}
                carnetJefe={user?.carnet || ''}
            />

            {/* TASK DETAIL POPUP */}
            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskUpdate}
                    mode="execution" // Modo ejecución para gestión rápida
                />
            )}
        </div>
    );
};
