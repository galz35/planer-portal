/**
 * MiEquipoPage - Gestión 360° de Colaboradores
 * 
 * Integra datos de Acceso (Empleados) y Clarity (Tareas/Planificación)
 * para proporcionar una vista completa de la gestión del equipo.
 */
import React, { useState, useEffect } from 'react';
import { Search, User, Eye, AlertCircle, Calendar as CalendarIcon, ListTodo, History, CheckCircle2, Mail, Phone, RefreshCw, Plus, ArrowRight, LayoutGrid, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { accesoService } from '../../services/acceso.service';
import { clarityService } from '../../services/clarity.service';
import { useAuth } from '../../context/AuthContext';
import type { Empleado } from '../../types/acceso';
import type { Tarea } from '../../types/modelos';
// import type { Proyecto } from '../../types/modelos';
import { CreateTaskModal } from '../../components/ui/CreateTaskModal';
import { Link, useNavigate } from 'react-router-dom';
import {
    eachDayOfInterval,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    format,
    isSameDay,
    isWeekend
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useSecureHTML } from '../../hooks/useSecureHTML';

type SortField = 'nombre' | 'departamento' | 'cargo';
type SortDir = 'asc' | 'desc';

export const MiEquipoPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { sanitize } = useSecureHTML();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    // const [projects, setProjects] = useState<Proyecto[]>([]); // Removed unused
    const [viewMode, setViewMode] = useState<'list' | 'workload'>('list');

    // Mapeo de Correo -> Stats
    const [clarityMap, setClarityMap] = useState<Map<string, any>>(new Map());

    // Search, Sort & Pagination
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<SortField>('nombre');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Selected employee detail
    const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<Tarea[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [activeTab, setActiveTab] = useState<'resumen' | 'agenda' | 'plan' | 'bloqueos' | 'bitacora' | 'calendario'>('resumen');

    // Quick Task Modal
    const [quickTasks, setQuickTasks] = useState<Tarea[]>([]);
    const [isQuickTasksOpen, setIsQuickTasksOpen] = useState(false);
    const [quickTasksLoading, setQuickTasksLoading] = useState(false);
    const [quickTasksTitle, setQuickTasksTitle] = useState('');

    // Workload/Heatmap Logic (Aligned with CargaPage)
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [allTasks, setAllTasks] = useState<Tarea[]>([]);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Task Creation
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

    // Derived Data helper
    const getOrgLocation = (e: Empleado) => {
        // Retorna la ubicación más específica disponible usando campos unificados
        return e.departamento || e.orgDepartamento || e.orgGerencia || 'Sin Departamento';
    };

    // Initial Load
    useEffect(() => {
        const init = async () => {
            if (!user?.correo) return;
            setLoading(true);
            try {
                // 1. Get My Details
                console.log('[DEBUG] 1. Init MiEquipoPage for:', user.correo);
                const carnetRes = await accesoService.getEmpleadoPorCorreo(user.correo);
                const carnet = carnetRes.data?.data?.empleado?.carnet;
                console.log('[DEBUG] 2. Carnet found:', carnet);

                if (carnet) {
                    console.log('[DEBUG] 3. Starting Parallel Fetch (TeamList, TeamStats, Workload, Projects)...');
                    // 2. Parallel Fetch: Visible Employees AND Clarity Team Stats AND All Tasks for workload AND Projects
                    const dateStr = new Date().toISOString().split('T')[0];
                    console.log('[DEBUG]    > Fetching getEquipoHoy for date:', dateStr);

                    const [teamList, teamPayload, workloadData, projectsRes] = await Promise.all([
                        clarityService.getMyTeam(),
                        clarityService.getEquipoInform(dateStr),
                        clarityService.getWorkload(),
                        clarityService.getProyectos()
                    ]);

                    console.log('[DEBUG] 4. API Results Received:', {
                        teamListCount: teamList?.length || 0,
                        teamPayloadRaw: teamPayload,
                        workloadTasks: workloadData?.tasks?.length || 0,
                        projectsCount: (projectsRes as any)?.items?.length || 0
                    });

                    setEmpleados(teamList || []);
                    if (workloadData) setAllTasks(workloadData.tasks || []);
                    // if (projectsRes) setProjects((projectsRes as any).items || []);

                    // Process Clarity Map (Email -> Stats)
                    const map = new Map<string, any>();
                    let teamMembers: any[] = [];
                    if (teamPayload && typeof teamPayload === 'object' && 'miembros' in teamPayload) {
                        teamMembers = (teamPayload as any).miembros || [];
                    } else if (Array.isArray(teamPayload)) {
                        teamMembers = teamPayload;
                    }

                    teamMembers.forEach((m: any) => {
                        // Map by Email
                        if (m.usuario?.correo) {
                            map.set(m.usuario.correo.toLowerCase(), {
                                ...m.estadisticas,
                                idUsuario: m.usuario.idUsuario
                            });
                        }
                        // Map by Carnet (Fallback if email mismatch) - Force string
                        if (m.usuario?.carnet) {
                            const c = String(m.usuario.carnet).trim();
                            map.set(c, {
                                ...m.estadisticas,
                                idUsuario: m.usuario.idUsuario
                            });
                        }
                    });
                    setClarityMap(map);
                }
            } catch (err: any) {
                console.error(err);
                setError('Error cargando información del equipo.');
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user?.correo]);

    const getClarityId = (email?: string | null) => {
        if (!email) return undefined;
        const entry = clarityMap.get(email.toLowerCase());
        return entry?.idUsuario;
    };

    // Summary Stats (Fixed: based on actual loaded tasks)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Filtrar tareas que pertenecen a los usuarios visibles actualmente
    const visibleUserIds = new Set(empleados.map(e => e.idUsuario || getClarityId(e.correo)).filter(Boolean));
    const visibleTasks = allTasks.filter(t => visibleUserIds.has((t as any).idUsuario));

    const totalHoy = visibleTasks.filter(t => ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'].includes(t.estado)).length;
    const totalRetrasadas = visibleTasks.filter(t => ['Pendiente', 'EnCurso'].includes(t.estado) && t.fechaObjetivo && t.fechaObjetivo.split('T')[0] < todayStr).length;

    const depts = new Set(empleados.map(e => getOrgLocation(e))).size;

    // Derived Data helper for employee detail
    const getTasksByTab = () => {
        if (!selectedTasks || !selectedEmpleado) return [];
        const id = selectedEmpleado.idUsuario || getClarityId(selectedEmpleado.correo);
        const carnet = selectedEmpleado.carnet;

        // Map selectedTasks for full drawer data, filter by responsibility for team view
        const owned = selectedTasks.filter(t =>
            t.idResponsable === id ||
            (t as any).responsableCarnet === carnet ||
            t.asignados?.some((a: any) => (a.idUsuario === id || a.carnet === carnet) && a.tipo === 'Responsable')
        );

        switch (activeTab) {
            case 'agenda':
                // Show upcoming and active tasks
                return owned.filter(t => t.estado !== 'Hecha' && t.estado !== 'Descartada')
                    .sort((a, b) => new Date(a.fechaObjetivo || '9999-12-31').getTime() - new Date(b.fechaObjetivo || '9999-12-31').getTime());
            case 'bloqueos': return owned.filter(t => t.estado === 'Bloqueada');
            case 'bitacora':
                // Show ALL tasks activity sorted by date
                return [...owned].sort((a, b) => new Date(b.fechaInicioPlanificada || '').getTime() - new Date(a.fechaInicioPlanificada || '').getTime());
            default: return owned;
        }
    };

    const handleSelectEmpleado = async (emp: Empleado) => {
        setSelectedEmpleado(emp);
        setLoadingDetails(true);
        setActiveTab('resumen'); // Reset tab
        setSelectedTasks([]);

        const id = emp.idUsuario || getClarityId(emp.correo);
        if (id) {
            try {
                const tasks = await clarityService.getTareasUsuario(id);
                setSelectedTasks(tasks || []);
            } catch (e) {
                console.error("Error fetching tasks", e);
            }
        }
        setLoadingDetails(false);
    };

    const handleShowQuickTasks = async (emp: Empleado, type: 'hoy' | 'retrasada' | 'hecha' | 'en_curso' | 'bloqueada' | 'descartada') => {
        const id = emp.idUsuario || getClarityId(emp.correo);
        if (!id) return;

        setIsQuickTasksOpen(true);
        setQuickTasksLoading(true);

        const titles = {
            'hoy': 'Tareas Planificadas (Hoy + Futuro)',
            'retrasada': 'Tareas Retrasadas',
            'hecha': 'Tareas Hechas Hoy',
            'en_curso': 'Tareas En Curso',
            'bloqueada': 'Tareas Bloqueadas',
            'descartada': 'Tareas Descartadas Hoy'
        };
        setQuickTasksTitle(`${titles[type]} - ${emp.nombreCompleto}`);
        setQuickTasks([]);

        try {
            const responseTasks = await clarityService.getTareasUsuario(id);
            const tasks = responseTasks || [];

            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            const getDatePart = (d?: string) => d ? d.split('T')[0] : '';

            let filtered: Tarea[] = [];
            // Filter only owned tasks to match team counts
            const carnet = emp.carnet;
            const ownedTasks = tasks.filter(t => 
                t.idResponsable === id || 
                (t as any).responsableCarnet === carnet ||
                t.asignados?.some((a: any) => (a.idUsuario === id || a.carnet === carnet) && a.tipo === 'Responsable')
            );

            if (type === 'hoy') {
                filtered = ownedTasks.filter(t => {
                    const tDate = getDatePart(t.fechaObjetivo || undefined);
                    return ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'].includes(t.estado) && tDate >= todayStr;
                });
            } else if (type === 'retrasada') {
                filtered = ownedTasks.filter(t => {
                    const tDate = getDatePart(t.fechaObjetivo || undefined);
                    return ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'].includes(t.estado) && tDate && tDate < todayStr;
                });
            } else if (type === 'hecha') {
                filtered = ownedTasks.filter(t => {
                    const tDate = getDatePart((t as any).fechaCompletado || t.fechaUltActualizacion);
                    return t.estado === 'Hecha' && tDate === todayStr;
                });
            } else if (type === 'en_curso') {
                filtered = ownedTasks.filter(t => t.estado === 'EnCurso');
            } else if (type === 'bloqueada') {
                filtered = ownedTasks.filter(t => t.estado === 'Bloqueada');
            } else if (type === 'descartada') {
                filtered = ownedTasks.filter(t => {
                    const tDate = getDatePart(t.fechaUltActualizacion);
                    return t.estado === 'Descartada' && tDate === todayStr;
                });
            }
            setQuickTasks(filtered);

        } catch (e) {
            console.error(e);
        } finally {
            setQuickTasksLoading(false);
        }
    };



    // Filter & Sort Main Table
    const filteredEmpleados = empleados
        .filter(e => {
            const term = searchTerm.toLowerCase();
            return (e.nombreCompleto || '').toLowerCase().includes(term) ||
                (e.carnet || '').toLowerCase().includes(term) ||
                (e.correo || '').toLowerCase().includes(term) ||
                (e.cargo || '').toLowerCase().includes(term) ||
                (getOrgLocation(e)).toLowerCase().includes(term);
        })
        .sort((a, b) => {
            let cmp = 0;
            switch (sortField) {
                case 'nombre': cmp = (a.nombreCompleto || '').localeCompare(b.nombreCompleto || ''); break;
                case 'departamento': cmp = (a.departamento || '').localeCompare(b.departamento || ''); break;
                case 'cargo': cmp = (a.cargo || '').localeCompare(b.cargo || ''); break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

    const handleSort = (field: SortField) => {
        if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
        setCurrentPage(1); // Reset to page 1 on sort
    };

    // Pagination calculations
    const totalPages = Math.ceil(filteredEmpleados.length / itemsPerPage);
    const paginatedEmpleados = filteredEmpleados.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset to page 1 when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Helpers
    const isOverdue = (dateStr?: string) => dateStr && new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
    const isToday = (dateStr?: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    // Heatmap Helper
    const getTasksForUserAndDay = (userId: number, date: Date) => {
        return allTasks.filter(t => {
            const isAssigned = (t as any).idUsuario === userId;
            if (!isAssigned) return false;
            const start = t.fechaInicioPlanificada ? new Date(t.fechaInicioPlanificada) : null;
            const end = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
            if (!start) return false;
            if (!end) return isSameDay(date, start);
            return date >= start && date <= end;
        });
    };

    const [selectedHeatmapTask, setSelectedHeatmapTask] = useState<Tarea | null>(null);

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-6 pb-20">
            {/* --- HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <User className="w-8 h-8 text-indigo-600" />
                        Mi Equipo
                    </h1>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                            <ListTodo size={14} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('workload')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'workload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                        >
                            <LayoutGrid size={14} /> Carga
                        </button>
                    </div>

                    <div className="relative flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, cargo..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl w-full lg:w-64 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* --- SUMMARY STATS (Aligned with CargaPage) --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaboradores</p>
                    <p className="text-2xl font-black text-slate-800">{empleados.length}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicaciones/Depts</p>
                    <p className="text-2xl font-black text-slate-800">{depts}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Planificadas Total</p>
                    <p className="text-2xl font-black text-indigo-600">{totalHoy}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Retrasadas Total</p>
                    <p className="text-2xl font-black text-rose-600">{totalRetrasadas}</p>
                </div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12">

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm font-bold animate-pulse">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* --- CONTENT AREA --- */}
                    {viewMode === 'list' ? (
                        /* --- TABLE VIEW --- */
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto max-h-[calc(100vh-380px)]">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th
                                                className="px-4 py-3 text-left w-1/3 cursor-pointer hover:bg-slate-100 transition-colors group"
                                                onClick={() => handleSort('nombre')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Nombre
                                                    <span className={`transition-opacity ${sortField === 'nombre' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {sortField === 'nombre' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                                    </span>
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 text-center w-24">Planificadas</th>
                                            <th className="px-4 py-3 text-center w-24">Retrasadas</th>
                                            <th className="px-4 py-3 text-center w-24">En Curso</th>
                                            <th className="px-4 py-3 text-center w-24">Bloqueadas</th>
                                            <th className="px-4 py-3 text-center w-24">Hechas</th>
                                            <th className="px-4 py-3 text-center w-24">Descartadas</th>
                                            <th className="px-4 py-3 text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading && <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium animate-pulse">Cargando directorio...</td></tr>}
                                        {!loading && filteredEmpleados.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No se encontraron colaboradores</td></tr>}

                                        {!loading && paginatedEmpleados.map(e => {
                                            // [FIX] Calculate stats locally from `allTasks` to match Heatmap/Workload consistency
                                            const uid = e.idUsuario || getClarityId(e.correo);
                                            let localStats = { hoy: 0, retrasadas: 0, hechas: 0, enCurso: 0, bloqueadas: 0, descartadas: 0 };

                                            if (uid && allTasks.length > 0) {
                                                const userTasks = allTasks.filter(t => (t as any).idUsuario === uid || (t as any).usuarioCarnet === e.carnet);
                                                const now = new Date();
                                                const todayStr = now.toISOString().split('T')[0];

                                                localStats.hoy = userTasks.filter(t => ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'].includes(t.estado)).length;
                                                localStats.retrasadas = userTasks.filter(t => ['Pendiente', 'EnCurso'].includes(t.estado) && t.fechaObjetivo && t.fechaObjetivo.split('T')[0] < todayStr).length;
                                                localStats.enCurso = userTasks.filter(t => t.estado === 'EnCurso').length;
                                                localStats.bloqueadas = userTasks.filter(t => t.estado === 'Bloqueada').length;
                                                // Hechas hoy
                                                localStats.hechas = userTasks.filter(t => t.estado === 'Hecha' && ((t as any).fechaCompletado || (t as any).fechaUltActualizacion || '').startsWith(todayStr)).length;
                                            }

                                            // Fallback to API map if local is empty (e.g. initial load glitch)
                                            let stats = localStats.hoy + localStats.hechas > 0 ? localStats : (clarityMap.get(e.correo?.toLowerCase() || '') || clarityMap.get(String(e.carnet).trim()) || localStats);

                                            return (
                                                <tr
                                                    key={e.carnet}
                                                    className={`hover:bg-indigo-50/50 transition-colors group ${selectedEmpleado?.carnet === e.carnet ? 'bg-indigo-50' : ''}`}
                                                >
                                                    <td className="px-4 py-3 cursor-pointer" onClick={() => handleSelectEmpleado(e)}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-xs shadow-sm ring-2 ring-white">
                                                                {(e.nombreCompleto || e.carnet || 'E').substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-800">{e.nombreCompleto || 'Sin Nombre'}</p>
                                                                <p className="text-xs text-slate-400 font-mono hidden sm:block">{e.carnet}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* PLANIFICADAS (HOY + FUTURO) */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'hoy'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.hoy > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.hoy || 0}
                                                        </div>
                                                    </td>

                                                    {/* RETRASADAS */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'retrasada'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.retrasadas > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.retrasadas || 0}
                                                        </div>
                                                    </td>

                                                    {/* EN CURSO */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'en_curso'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.enCurso > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.enCurso || 0}
                                                        </div>
                                                    </td>

                                                    {/* BLOQUEADAS */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'bloqueada'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.bloqueadas > 0 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.bloqueadas || 0}
                                                        </div>
                                                    </td>

                                                    {/* HECHAS */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'hecha'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.hechas > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.hechas || 0}
                                                        </div>
                                                    </td>

                                                    {/* DESCARTADAS */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div
                                                            onClick={(ev) => { ev.stopPropagation(); handleShowQuickTasks(e, 'descartada'); }}
                                                            className={`mx-auto w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-110 cursor-pointer ${stats.descartadas > 0 ? 'bg-gray-100 text-gray-700' : 'bg-slate-50 text-slate-400'}`}
                                                        >
                                                            {stats.descartadas || 0}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={(ev) => {
                                                                ev.stopPropagation();
                                                                if (e.carnet) {
                                                                    const query = new URLSearchParams();
                                                                    if (e.nombreCompleto) query.append('nombre', e.nombreCompleto);
                                                                    navigate(`/app/agenda/${e.carnet}?${query.toString()}`);
                                                                }
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all mr-1"
                                                            title="Ver Agenda"
                                                        >
                                                            <CalendarIcon size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleSelectEmpleado(e)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                                                            title="Ver Detalles"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Footer */}
                            {!loading && filteredEmpleados.length > itemsPerPage && (
                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                    <p className="text-xs text-slate-500 font-medium">
                                        Mostrando <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredEmpleados.length)}</span> de <span className="font-bold text-slate-700">{filteredEmpleados.length}</span> colaboradores
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                        >
                                            <ChevronLeft size={14} /> Anterior
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                        >
                                            Siguiente <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* --- WORKLOAD / HEATMAP VIEW (Same as CargaPage) --- */
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-380px)]">
                            {/* Controls copied from WorkloadPage */}
                            <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400 mr-2">Semana:</span>
                                    <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200">
                                        <button onClick={() => setWeekStart(d => subWeeks(d, 1))} className="p-1 hover:bg-slate-50 rounded text-slate-600 transition-colors"><ChevronLeft size={16} /></button>
                                        <span className="px-3 text-[10px] font-bold text-slate-600 uppercase">
                                            {format(weekStart, 'd MMM', { locale: es })} - {format(weekEnd, 'd MMM', { locale: es })}
                                        </span>
                                        <button onClick={() => setWeekStart(d => addWeeks(d, 1))} className="p-1 hover:bg-slate-50 rounded text-slate-600 transition-colors"><ChevronRight size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Prioridad Alta</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Completada</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <div className="min-w-[1000px]">
                                    {/* Heatmap Header */}
                                    <div className="flex border-b border-slate-200 bg-slate-50/90 text-[10px] font-black text-slate-500 uppercase sticky top-0 z-20">
                                        <div className="w-64 p-3 border-r border-slate-200 shrink-0 sticky left-0 bg-slate-50 z-30 shadow-[1px_0_5px_rgba(0,0,0,0.05)]">
                                            Colaborador / Ubicación
                                        </div>
                                        {days.map(d => (
                                            <div key={d.toISOString()} className={`flex-1 min-w-[120px] p-2 text-center border-r border-slate-100 ${isWeekend(d) ? 'bg-slate-100/50 text-slate-400' : ''} ${isSameDay(d, new Date()) ? 'bg-indigo-50 text-indigo-700 font-black' : ''}`}>
                                                <div>{format(d, 'EEE', { locale: es })}</div>
                                                <div className="text-sm">{format(d, 'd')}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Heatmap Rows */}
                                    <div className="divide-y divide-slate-100">
                                        {loading ? (
                                            <div className="p-20 text-center text-slate-400 font-medium animate-pulse">Cargando planificación...</div>
                                        ) : filteredEmpleados.length === 0 ? (
                                            <div className="p-20 text-center text-slate-400 italic font-medium">No se encontraron colaboradores</div>
                                        ) : filteredEmpleados.map(member => (
                                            <div key={member.carnet} className="flex hover:bg-slate-50/50 transition-colors group min-h-[70px]">
                                                <div className="w-64 p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50 shrink-0 sticky left-0 z-10 shadow-[1px_0_5px_rgba(0,0,0,0.05)] flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] border border-slate-200">
                                                        {(member.nombreCompleto || member.carnet || 'E').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[11px] font-bold text-slate-800 truncate">{member.nombreCompleto || 'Colaborador'}</div>
                                                        <div className="text-[9px] text-slate-400 truncate font-medium uppercase tracking-tighter">{member.cargo}</div>
                                                    </div>
                                                </div>

                                                {days.map(day => {
                                                    const dayTasks = getTasksForUserAndDay(member.idUsuario || getClarityId(member.correo), day);
                                                    return (
                                                        <div key={day.toISOString()} className={`flex-1 min-w-[120px] p-1.5 border-r border-slate-100 flex flex-col gap-1 ${isWeekend(day) ? 'bg-slate-50/30' : ''}`}>
                                                            {dayTasks.map(t => (
                                                                <div
                                                                    key={t.idTarea}
                                                                    className={`text-[9px] px-2 py-1 rounded shadow-sm cursor-pointer truncate transition-all hover:scale-[1.02] hover:z-20 relative font-bold ${t.prioridad === 'Alta' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                                                        t.estado === 'Hecha' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 line-through opacity-70' :
                                                                            'bg-white border-slate-200 text-slate-600'
                                                                        }`}
                                                                    onClick={() => setSelectedHeatmapTask(t)}
                                                                    title={t.titulo}
                                                                >
                                                                    {t.titulo}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- DRAWER --- */}
                    {selectedEmpleado && (
                        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedEmpleado(null)}>
                            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>

                                {/* Drawer Header */}
                                <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-32 bg-indigo-600 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none"></div>

                                    <button
                                        onClick={() => setSelectedEmpleado(null)}
                                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all z-20 flex items-center gap-2 group border border-white/10"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Cerrar</span>
                                        <X size={20} />
                                    </button>

                                    <div className="flex gap-5 items-center relative z-10">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-black shadow-lg ring-4 ring-white/10">
                                            {(selectedEmpleado.nombreCompleto || 'E').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-2xl font-bold truncate leading-tight">{selectedEmpleado.nombreCompleto || 'Colaborador'}</h2>
                                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-wide mb-1">Plan de Trabajo y Gestión</p>
                                            <p className="text-slate-400 text-sm truncate mb-3">{selectedEmpleado.cargo} • {getOrgLocation(selectedEmpleado)}</p>

                                            <div className="flex gap-2 flex-wrap">
                                                {selectedEmpleado.carnet && (
                                                    <button
                                                        onClick={() => {
                                                            const query = new URLSearchParams();
                                                            if (selectedEmpleado.nombreCompleto) query.append('nombre', selectedEmpleado.nombreCompleto);
                                                            navigate(`/app/agenda/${selectedEmpleado.carnet}?${query.toString()}`);
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/30"
                                                    >
                                                        <CalendarIcon size={14} /> Ver Agenda Completa
                                                    </button>
                                                )}
                                                {selectedEmpleado.correo && (
                                                    <a href={`mailto:${selectedEmpleado.correo}`} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                                                        <Mail size={14} /> Email
                                                    </a>
                                                )}
                                                {selectedEmpleado.telefono && (
                                                    <a href={`tel:${selectedEmpleado.telefono}`} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                                                        <Phone size={14} /> Llamar
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation Tabs */}
                                    <div className="flex gap-1 mt-8 overflow-x-auto no-scrollbar mask-gradient-r">
                                        {[
                                            { id: 'resumen', icon: <User size={14} />, label: 'Resumen' },
                                            { id: 'agenda', icon: <ListTodo size={14} />, label: 'Agenda' },
                                            { id: 'plan', icon: <LayoutGrid size={14} />, label: 'Plan' },
                                            { id: 'bitacora', icon: <History size={14} />, label: 'Bitácora' }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`px-4 py-2 rounded-t-lg text-xs font-bold flex items-center gap-2 transition-all border-t border-x ${activeTab === tab.id
                                                    ? 'bg-slate-50 text-indigo-600 border-slate-50'
                                                    : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                                                    }`}
                                            >
                                                {tab.icon} {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Drawer Content */}
                                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                                    {loadingDetails ? (
                                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                                            <RefreshCw className="animate-spin" size={32} />
                                            <p className="text-sm font-medium">Sincronizando con Clarity...</p>
                                        </div>
                                    ) : !(selectedEmpleado.idUsuario || getClarityId(selectedEmpleado.correo)) && activeTab !== 'resumen' ? (
                                        <div className="text-center py-12 p-6 bg-white rounded-xl border border-dashed border-slate-300">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                                <User size={24} />
                                            </div>
                                            <h3 className="font-bold text-slate-700">Usuario no conectado</h3>
                                            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                                                Este colaborador no tiene una cuenta activa en Clarity vinculada a su correo corporativo.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* AGENDA TAB - Fixed to be useful */}
                                            {activeTab === 'agenda' && (
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                        <div>
                                                            <h3 className="font-bold text-indigo-900">Agenda Activa</h3>
                                                            <p className="text-xs text-indigo-600">Tareas pendientes y próximas</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsCreateTaskOpen(true)}
                                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-indigo-200 flex items-center gap-2 transition-colors"
                                                        >
                                                            <Plus size={16} /> Nueva Tarea
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {getTasksByTab().length === 0 ? (
                                                            <div className="text-center py-12 text-slate-400 italic">No hay tareas pendientes</div>
                                                        ) : (
                                                            getTasksByTab().map(t => {
                                                                const overdue = isOverdue(t.fechaObjetivo || undefined);
                                                                const today = isToday(t.fechaObjetivo || undefined);
                                                                return (
                                                                    <div key={t.idTarea} className={`bg-white p-4 rounded-xl border shadow-sm transition-all hover:shadow-md flex items-start gap-3 ${overdue ? 'border-red-200 bg-red-50/30' : today ? 'border-indigo-200' : 'border-slate-100'}`}>
                                                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-red-500' : today ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between items-start">
                                                                                <h4 className={`font-bold text-sm ${overdue ? 'text-red-700' : 'text-slate-700'}`}>{t.titulo}</h4>
                                                                                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                                                                    #{t.idTarea}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 truncate mt-0.5">{t.proyecto?.nombre || 'Sin Proyecto'}</p>
                                                                            <div className="mt-2 flex items-center gap-3">
                                                                                {t.fechaObjetivo && (
                                                                                    <span className={`text-[10px] font-bold flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
                                                                                        <CalendarIcon size={10} />
                                                                                        {new Date(t.fechaObjetivo).toLocaleDateString()}
                                                                                    </span>
                                                                                )}
                                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.prioridad === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                                                                                    }`}>
                                                                                    {t.prioridad}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}



                                            {/* PLAN TAB - Quick Links */}
                                            {activeTab === 'plan' && (selectedEmpleado.idUsuario || getClarityId(selectedEmpleado.correo)) && (
                                                <div className="space-y-4">
                                                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
                                                        <h3 className="font-bold text-slate-800 mb-2">Planificación Detallada</h3>
                                                        <p className="text-sm text-slate-500 mb-6">Gestiona sprints, carga de trabajo y objetivos detallados.</p>
                                                        <Link
                                                            to={`/app/equipo/planning/${selectedEmpleado.idUsuario || getClarityId(selectedEmpleado.correo)}`}
                                                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                                        >
                                                            Abrir Tablero de Planificación <ArrowRight size={16} />
                                                        </Link>
                                                    </div>
                                                </div>
                                            )}

                                            {/* BITACORA TAB - History */}
                                            {activeTab === 'bitacora' && (
                                                <div className="space-y-4">
                                                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-2">Historial Reciente</h3>
                                                    <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
                                                        {getTasksByTab().length === 0 ? (
                                                            <p className="text-center text-slate-400 text-sm py-4 italic">Sin historial reciente</p>
                                                        ) : (
                                                            getTasksByTab().slice(0, 20).map(t => {
                                                                let icon = <ListTodo size={8} className="text-slate-700" />;
                                                                let colorClass = "bg-slate-100 border-slate-500";
                                                                let statusText = "Actualizada el";

                                                                if (t.estado === 'Hecha') {
                                                                    icon = <CheckCircle2 size={8} className="text-emerald-700" />;
                                                                    colorClass = "bg-emerald-100 border-emerald-500";
                                                                    statusText = "Completada el";
                                                                } else if (t.estado === 'Bloqueada') {
                                                                    icon = <AlertCircle size={8} className="text-rose-700" />;
                                                                    colorClass = "bg-rose-100 border-rose-500";
                                                                    statusText = "Bloqueada el";
                                                                } else if (t.estado === 'EnCurso') {
                                                                    icon = <History size={8} className="text-blue-700" />;
                                                                    colorClass = "bg-blue-100 border-blue-500";
                                                                    statusText = "En progreso desde el";
                                                                }

                                                                return (
                                                                    <div key={t.idTarea} className="pl-6 relative">
                                                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                                                                            {icon}
                                                                        </div>
                                                                        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                            <div className="flex justify-between items-start">
                                                                                <p className="font-bold text-slate-700 text-sm">{t.titulo}</p>
                                                                                <span className="text-[10px] font-mono text-slate-400">{t.estado}</span>
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 mt-1">{statusText} {new Date(t.fechaInicioPlanificada || '').toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* RESUMEN TAB - Quick Stats */}
                                            {activeTab === 'resumen' && (
                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                            <p className="text-xs text-slate-400 font-bold uppercase">Pendientes</p>
                                                            <p className="text-3xl font-black text-slate-800">{selectedTasks.filter(t => t.estado !== 'Hecha').length}</p>
                                                        </div>
                                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                            <p className="text-xs text-slate-400 font-bold uppercase">Completadas</p>
                                                            <p className="text-3xl font-black text-emerald-600">{selectedTasks.filter(t => t.estado === 'Hecha').length}</p>
                                                        </div>
                                                    </div>

                                                    {/* Overdue Warning */}
                                                    {selectedTasks.some(t => isOverdue(t.fechaObjetivo || undefined) && t.estado !== 'Hecha') && (
                                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
                                                            <AlertCircle className="text-red-600 mt-0.5" size={20} />
                                                            <div>
                                                                <h4 className="font-bold text-red-800 text-sm">Tareas Atrasadas Detectadas</h4>
                                                                <p className="text-xs text-red-600 mt-1">
                                                                    Este usuario tiene {selectedTasks.filter(t => isOverdue(t.fechaObjetivo || undefined) && t.estado !== 'Hecha').length} tareas fuera de fecha.
                                                                </p>
                                                                <button
                                                                    onClick={() => setActiveTab('agenda')}
                                                                    className="mt-2 text-xs font-bold text-red-700 underline"
                                                                >
                                                                    Revisar Agenda
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal for Quick Tasks */}
                    {isQuickTasksOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsQuickTasksOpen(false)}>
                            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                                    <h3 className="font-bold text-sm">{quickTasksTitle}</h3>
                                    <button onClick={() => setIsQuickTasksOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="p-4 max-h-[60vh] overflow-y-auto">
                                    {quickTasksLoading ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-3">
                                            <RefreshCw className="animate-spin" size={24} />
                                            <p className="text-xs font-medium">Cargando tareas...</p>
                                        </div>
                                    ) : quickTasks.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 italic text-sm">
                                            No se encontraron tareas en esta categoría.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {quickTasks.map(t => (
                                                <div
                                                    key={t.idTarea}
                                                    className="group flex gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all bg-white shadow-sm"
                                                >
                                                    <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${t.estado === 'Hecha' ? 'bg-emerald-500' :
                                                        t.estado === 'Bloqueada' ? 'bg-orange-500' :
                                                            t.estado === 'Descartada' ? 'bg-slate-400' :
                                                                isOverdue(t.fechaObjetivo || undefined) ? 'bg-rose-500' : 'bg-indigo-500'
                                                        }`} />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h4 className="font-bold text-sm text-slate-700 leading-snug group-hover:text-indigo-700 transition-colors">
                                                                {t.titulo}
                                                            </h4>
                                                            <span className="shrink-0 text-[10px] font-black uppercase text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                                #{t.idTarea}
                                                            </span>
                                                        </div>

                                                        {t.descripcion && (
                                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                                {t.descripcion}
                                                            </p>
                                                        )}

                                                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-50">
                                                            {t.fechaObjetivo && (
                                                                <span className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue(t.fechaObjetivo) && t.estado !== 'Hecha' ? 'text-rose-600' : 'text-slate-400'}`}>
                                                                    <Clock size={10} />
                                                                    {new Date(t.fechaObjetivo).toLocaleDateString()}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wilder px-1.5 py-0.5 bg-slate-100 rounded">
                                                                {t.prioridad || 'Normal'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal for Creating Task */}
                    {isCreateTaskOpen && (
                        <CreateTaskModal
                            isOpen={isCreateTaskOpen}
                            onClose={() => setIsCreateTaskOpen(false)}
                            onTaskCreated={() => {
                                setIsCreateTaskOpen(false);
                                // Refresh current view
                                const userEmail = user?.correo;
                                if (userEmail) window.location.reload(); // Simple reload for now or re-fetch
                            }}
                            currentProject={null}
                        />
                    )}
                </div>
            </div>
            {/* TASK DETAILS MODAL (Heatmap) */}
            {selectedHeatmapTask && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedHeatmapTask(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-widest">Detalles de la Tarea</h3>
                            <button onClick={() => setSelectedHeatmapTask(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Tarea</label>
                                <p className="text-slate-800 font-bold text-lg leading-tight">{selectedHeatmapTask.titulo}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Estado</label>
                                    <span className={`block w-fit px-2 py-1 rounded text-[10px] font-black mt-1 uppercase ${selectedHeatmapTask.estado === 'Hecha' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {selectedHeatmapTask.estado}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Prioridad</label>
                                    <span className={`block w-fit px-2 py-1 rounded text-[10px] font-black mt-1 uppercase ${selectedHeatmapTask.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {selectedHeatmapTask.prioridad || 'Normal'}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Descripción</label>
                                <div
                                    className="text-slate-600 text-xs mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 min-h-[60px]"
                                    dangerouslySetInnerHTML={sanitize(selectedHeatmapTask.descripcion || 'Sin descripción disponible.')}
                                />
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setSelectedHeatmapTask(null)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiEquipoPage;
