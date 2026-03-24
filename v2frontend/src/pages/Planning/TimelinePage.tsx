import React, { useEffect, useState, useMemo } from 'react';
import { clarityService } from '../../services/clarity.service';
import { alerts } from '../../utils/alerts';
import { useParams } from 'react-router-dom';
import type { Tarea, Proyecto } from '../../types/modelos';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TaskDetailModalV2 as TaskDetailModal } from '../../components/task-detail-v2/TaskDetailModalV2';
import { CreateTaskModal } from '../../components/ui/CreateTaskModal';
import {
    Calendar as CalendarIcon,
    Layout,
    List,
    Plus,
    Download,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    Briefcase,
    Clock,
    Trash2,
    Edit3
} from 'lucide-react';
import {
    format,
    eachDayOfInterval,
    isWeekend,
    differenceInDays,
    startOfMonth,
    endOfMonth,
    addMonths,
    subMonths,
    isAfter,
    startOfDay,
    addDays
} from 'date-fns';
import { es } from 'date-fns/locale';

// --- HELPERS ---
const isTaskDelayed = (t: Tarea) => {
    if (t.estado === 'Hecha' || t.estado === 'Descartada') return false;
    if (!t.fechaObjetivo) return false;
    return isAfter(startOfDay(new Date()), new Date(t.fechaObjetivo));
};

const getProjectHealth = (tasks: Tarea[]) => {
    if (tasks.length === 0) return { score: 100, label: 'Sin Datos', color: 'text-slate-400' };
    const delayed = tasks.filter(isTaskDelayed).length;
    const done = tasks.filter(t => t.estado === 'Hecha').length;

    // Simple logic: Health = (1 - (delayed / total)) * 100
    // But we also care about progress. 
    const health = Math.max(0, 100 - (delayed * 10)); // Lose 10 points per delayed task

    let color = 'text-emerald-600';
    let label = 'Saludable';
    if (health < 80) { color = 'text-amber-500'; label = 'Riesgo Moderado'; }
    if (health < 50) { color = 'text-rose-600'; label = 'Crítico'; }

    return { score: health, label, color, delayed, done, total: tasks.length };
};

// --- COMPONENTS ---

// 1. Gantt Chart Component
const GanttChart: React.FC<{ tasks: Tarea[], onTaskClick: (t: Tarea) => void }> = ({ tasks, onTaskClick }) => {
    // Start with current date, aligned to start of month for clean view
    const [viewStart, setViewStart] = useState(() => startOfMonth(new Date()));
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    // Calculate view end based on mode
    const viewEnd = useMemo(() => {
        if (viewMode === 'week') return addDays(viewStart, 7); // Show 7 days (1 week window)
        return endOfMonth(addMonths(viewStart, 0)); // Show 1 month
    }, [viewStart, viewMode]);

    const days = useMemo(() => eachDayOfInterval({ start: viewStart, end: viewEnd }), [viewStart, viewEnd]);
    const CELL_WIDTH = 40;

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden select-none">
            <div className="flex justify-between items-center px-2 py-1 border-b border-slate-100 bg-slate-50/50">
                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setViewStart(d => viewMode === 'week' ? addDays(d, -7) : subMonths(d, 1))}
                        className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-600 flex items-center gap-1"
                        title="Anterior"
                    >
                        <ArrowLeft size={10} /> Anterior
                    </button>

                    <button
                        onClick={() => setViewStart(startOfDay(new Date()))}
                        className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200 transition-colors"
                        title="Ir a Hoy"
                    >
                        Hoy
                    </button>

                    <span className="text-xs font-bold text-slate-800 capitalize min-w-[100px] text-center">
                        {format(viewStart, viewMode === 'week' ? "'Semana del' d MMM" : 'MMMM yyyy', { locale: es })}
                    </span>

                    <button
                        onClick={() => setViewStart(d => viewMode === 'week' ? addDays(d, 7) : addMonths(d, 1))}
                        className="p-1 hover:bg-slate-200 rounded text-[10px] font-bold text-slate-600 flex items-center gap-1 flex-row-reverse"
                        title="Siguiente"
                    >
                        <ArrowLeft size={10} className="rotate-180" /> Siguiente
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-2"></div>

                    <div className="flex bg-slate-200 p-0.5 rounded-lg">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${viewMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${viewMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Mes
                        </button>
                    </div>
                </div>
                <div className="flex text-[10px] gap-2">
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div> Atrasada</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> En Curso</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Hecha</div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar (Task Names) */}
                <div className="w-56 border-r border-slate-200 flex flex-col bg-white shrink-0 z-10 shadow-lg shadow-slate-200/50">
                    <div className="h-8 border-b border-slate-100 bg-slate-50 flex items-center px-3 font-bold text-[10px] text-slate-500 uppercase">
                        Tarea
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {tasks.length === 0 ? <div className="p-2 text-[10px] text-slate-400 italic">Sin tareas.</div> : tasks.map(t => {
                            const delayed = isTaskDelayed(t);
                            return (
                                <div key={t.idTarea} onClick={() => onTaskClick(t)} className="group px-3 py-0 text-xs text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer truncate border-l-2 border-transparent hover:border-rose-500 transition-colors h-7 flex items-center justify-between border-b border-slate-50">
                                    <span className={`truncate ${delayed ? 'text-rose-600 font-bold' : ''}`}>{t.titulo}</span>
                                    {delayed && <AlertCircle size={10} className="text-rose-500 shrink-0 ml-1" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Timeline Grid */}
                <div className="flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar bg-slate-50/30">
                    <div style={{ width: days.length * CELL_WIDTH, minWidth: '100%' }}>
                        {/* Header */}
                        <div className="flex h-8 border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
                            {days.map(d => (
                                <div
                                    key={d.toISOString()}
                                    className={`shrink-0 border-r border-slate-100 flex flex-col items-center justify-center text-[10px] ${isWeekend(d) ? 'bg-slate-50 text-slate-400' : 'text-slate-600 font-bold'}`}
                                    style={{ width: CELL_WIDTH }}
                                >
                                    <span>{format(d, 'EE', { locale: es }).slice(0, 1)}</span>
                                    <span>{format(d, 'd')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="relative">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                                {days.map(d => (
                                    <div
                                        key={`grid-${d.toISOString()}`}
                                        className={`shrink-0 border-r border-slate-100 h-full ${isWeekend(d) ? 'bg-slate-50/50' : ''}`}
                                        style={{ width: CELL_WIDTH }}
                                    />
                                ))}
                            </div>

                            {/* Rows */}
                            <div className="relative z-10">
                                {tasks.map(t => {
                                    const tStart = t.fechaInicioPlanificada ? new Date(t.fechaInicioPlanificada) : new Date();
                                    const tEnd = t.fechaObjetivo ? new Date(t.fechaObjetivo) : addDays(tStart, 1);

                                    const offsetDays = differenceInDays(tStart, viewStart);
                                    let durationDays = differenceInDays(tEnd, tStart) + 1;
                                    if (durationDays < 1) durationDays = 1;

                                    const left = offsetDays * CELL_WIDTH;
                                    const width = durationDays * CELL_WIDTH;
                                    const isOutOfView = (offsetDays + durationDays < 0) || (offsetDays > days.length);

                                    let colorClass = 'from-slate-400 to-slate-500';
                                    let ringClass = 'ring-slate-400/20';
                                    if (t.estado === 'EnCurso') { colorClass = 'from-blue-500 to-indigo-600'; ringClass = 'ring-blue-500/20'; }
                                    if (t.estado === 'Hecha') { colorClass = 'from-emerald-500 to-teal-600'; ringClass = 'ring-emerald-500/20'; }
                                    if (t.estado === 'Bloqueada') { colorClass = 'from-rose-500 to-red-600'; ringClass = 'ring-rose-500/30'; }
                                    if (isTaskDelayed(t)) { colorClass = 'from-rose-500 to-orange-600'; ringClass = 'ring-rose-500/40 animate-pulse'; }

                                    return (
                                        <div key={t.idTarea} className="h-7 relative w-full hover:bg-slate-100/50 transition-colors border-b border-slate-50/50 group/row">
                                            {!isOutOfView && (
                                                <div
                                                    onClick={() => onTaskClick(t)}
                                                    className={`absolute top-1 h-5 rounded-full shadow-sm text-[9px] text-white flex items-center px-2 truncate cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all bg-gradient-to-r ${colorClass} ring-2 ${ringClass} group-hover/row:brightness-110`}
                                                    style={{ left, width }}
                                                    title={`${t.titulo} \n${format(tStart, 'd MMM')} - ${format(tEnd, 'd MMM')}`}
                                                >
                                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/row:opacity-100 transition-opacity rounded-full"></div>
                                                    {width > 30 && <span className="truncate font-bold drop-shadow-sm">{t.titulo}</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TimelinePage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'timeline' | 'board' | 'list'>('timeline');

    // Selection State
    const [projectsList, setProjectsList] = useState<Proyecto[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    // Modals
    const [showCreateProject, setShowCreateProject] = useState(false);
    const [showEditProject, setShowEditProject] = useState(false);
    const [showCreateTask, setShowCreateTask] = useState(false);

    const { id: urlProjectId } = useParams();
    const [newProjectName, setNewProjectName] = useState('');

    // Fetch Projects on load
    useEffect(() => {
        const init = async () => {
            try {
                const res = await clarityService.getProyectos();
                const projects = (res as any)?.items || (Array.isArray(res) ? res : []);
                setProjectsList(projects);
                if (urlProjectId) {
                    setSelectedProjectId(parseInt(urlProjectId));
                } else if (projects.length > 0) {
                    setSelectedProjectId(projects[0].idProyecto);
                }
            } catch (e) {
                // Error de carga - lista vacía
            }
        };
        init();
    }, [urlProjectId]);

    // Fetch Tasks when Project Changes
    useEffect(() => {
        if (selectedProjectId) {
            setLoading(true);
            clarityService.getProyectosTareas(selectedProjectId)
                .then(t => {
                    setTasks((t || []).sort((a, b) => (a.orden || 0) - (b.orden || 0)));
                    setLoading(false);
                })
                .catch(() => {
                    setLoading(false);
                });
        } else {
            setTasks([]);
        }
    }, [selectedProjectId]);

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const newProj = await clarityService.postProyecto(newProjectName);
            setNewProjectName('');
            setProjectsList(prev => [...prev, newProj as Proyecto]);
            setSelectedProjectId((newProj as Proyecto).idProyecto);
            setShowCreateProject(false);
            showToast('Proyecto creado exitosamente', 'success');
        } catch (e) {
            showToast('Error creando proyecto', 'error');
        }
    };

    const handleTaskCreated = () => {
        setShowCreateTask(false);
        // Refresh tasks
        if (selectedProjectId) {
            clarityService.getProyectosTareas(selectedProjectId).then(res => setTasks(res || []));
        }
    };

    const handleArchiveProject = async () => {
        if (!selectedProjectId) return;
        if (!(await alerts.confirm('¿Archivar proyecto?', '¿Estás seguro de que deseas archivar este proyecto?'))) return;
        try {
            await clarityService.deleteProyecto(selectedProjectId);
            showToast('Proyecto archivado exitosamente', 'success');
            setProjectsList(prev => prev.filter(p => p.idProyecto !== selectedProjectId));
            setSelectedProjectId(() => {
                const remaining = projectsList.filter(p => p.idProyecto !== selectedProjectId);
                return remaining.length > 0 ? remaining[0].idProyecto : null;
            });
        } catch (e) {
            showToast('Error al archivar proyecto', 'error');
        }
    };

    const handleUpdateProject = async (newName: string, newDesc: string) => {
        if (!selectedProjectId) return;
        try {
            await clarityService.updateProyecto(selectedProjectId, { nombre: newName, descripcion: newDesc });
            showToast('Proyecto actualizado', 'success');
            setProjectsList(prev => prev.map(p => p.idProyecto === selectedProjectId ? { ...p, nombre: newName, descripcion: newDesc } : p));
            setShowEditProject(false);
        } catch (e) {
            showToast('Error al actualizar proyecto', 'error');
        }
    };

    const handleExportExcel = () => {
        if (tasks.length === 0) return;
        const headers = ['ID', 'Tarea', 'Proyecto', 'Estado', 'Prioridad', 'Inicio', 'Fin', 'Atrasada'];
        const rows = tasks.map(t => [
            t.idTarea,
            `"${t.titulo.replace(/"/g, '""')}"`,
            t.proyecto?.nombre || 'Sin Proyecto',
            t.estado,
            t.prioridad,
            t.fechaInicioPlanificada || '',
            t.fechaObjetivo || '',
            isTaskDelayed(t) ? 'SI' : 'NO'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `planificacion_clarity_${format(new Date(), 'yyyyMMdd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const currentProject = projectsList.find(p => p.idProyecto === selectedProjectId);
    const health = getProjectHealth(tasks);

    return (
        <div className="bg-clarity-bg min-h-screen flex flex-col relative h-screen overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-30 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase className="text-rose-600" size={24} />
                            Gestión de Proyectos
                        </h1>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setViewMode('timeline')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>
                        <CalendarIcon size={16} /> Cronograma
                    </button>
                    <button onClick={() => setViewMode('board')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>
                        <Layout size={16} /> Tablero
                    </button>
                    <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500'}`}>
                        <List size={16} /> Lista
                    </button>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleExportExcel} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 shadow-sm" title="Exportar a CSV">
                        <Download size={20} />
                    </button>
                    <button onClick={() => setShowCreateProject(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg font-bold text-sm hover:bg-slate-50">
                        <Plus size={16} /> Nuevo Proyecto
                    </button>
                    {selectedProjectId && (
                        <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all active:scale-95">
                            <Plus size={16} /> Nueva Tarea
                        </button>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Project Filter */}
                <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
                    <div className="p-4 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase tracking-wider bg-slate-100">
                        Mis Proyectos
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {projectsList.map(p => (
                            <button
                                key={p.idProyecto}
                                onClick={() => setSelectedProjectId(p.idProyecto)}
                                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all flex justify-between items-center group ${selectedProjectId === p.idProyecto ? 'bg-white shadow-md text-indigo-700 border border-indigo-100 ring-1 ring-indigo-50' : 'text-slate-600 hover:bg-slate-200/50'}`}
                            >
                                <span className="truncate">{p.nombre}</span>
                                {selectedProjectId === p.idProyecto && <CheckCircle2 size={14} className="text-indigo-600" />}
                            </button>
                        ))}
                        {projectsList.length === 0 && (
                            <div className="text-xs text-center p-4 text-slate-400">
                                No hay proyectos activos. <br /><span className="underline cursor-pointer" onClick={() => setShowCreateProject(true)}>Crear uno nuevo</span>
                            </div>
                        )}
                    </div>

                    {/* User Info / Mini Stats */}
                    <div className="p-4 bg-slate-100 border-t border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                                {user?.nombre ? user.nombre.substring(0, 2).toUpperCase() : 'YO'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 truncate">{user?.nombre || 'Usuario'}</p>
                                <p className="text-[10px] text-slate-500">Planificador Maestro</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col bg-slate-50/30 overflow-hidden relative">
                    {loading && (
                        <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-sm flex items-center justify-center text-slate-400 font-bold animate-pulse flex-col gap-2">
                            <Briefcase size={32} className="text-indigo-200" />
                            Cargando planificación...
                        </div>
                    )}

                    {!selectedProjectId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <Briefcase size={48} className="mb-4 text-slate-300" />
                            <p className="font-bold text-lg text-slate-500">Ningún proyecto seleccionado</p>
                            <p className="text-sm">Selecciona o crea un proyecto para comenzar.</p>
                        </div>
                    ) : (
                        <div className="flex-1 p-6 overflow-hidden flex flex-col">
                            {/* Project Header Info */}
                            <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group/proj-header">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                                        {currentProject?.nombre}
                                        <span className={`text-xs px-2 py-1 rounded-full border ${health.score > 80 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                            {health.label}
                                        </span>
                                        <div className="flex gap-1 ml-4 opacity-0 group-hover/proj-header:opacity-100 transition-opacity">
                                            <button onClick={() => setShowEditProject(true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600" title="Editar Proyecto">
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={handleArchiveProject} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-600" title="Archivar Proyecto">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">{currentProject?.descripcion || 'Sin descripción detallada'}</p>
                                </div>

                                {/* KPIs */}
                                <div className="flex gap-6">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Total Tareas</p>
                                        <p className="text-xl font-bold text-slate-700">{health.total}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Completadas</p>
                                        <p className="text-xl font-bold text-emerald-600">{health.done}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Atrasadas</p>
                                        <p className="text-xl font-bold text-rose-600">{health.delayed}</p>
                                    </div>
                                    <div className="text-right border-l border-slate-100 pl-6">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Tiempo Estimado</p>
                                        <p className="text-xl font-bold text-indigo-600 flex items-center gap-1 justify-end">
                                            <Clock size={16} /> 120h
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {viewMode === 'timeline' && <GanttChart tasks={tasks} onTaskClick={setSelectedTask} />}

                            {viewMode === 'list' && (
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full flex flex-col shadow-sm">
                                    <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-500 uppercase sticky top-0">
                                        <div className="col-span-1">ID</div>
                                        <div className="col-span-6">Tarea</div>
                                        <div className="col-span-3">Estado</div>
                                        <div className="col-span-2">Fecha Fin</div>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        {tasks.map(t => {
                                            const delayed = isTaskDelayed(t);
                                            return (
                                                <div key={t.idTarea} onClick={() => setSelectedTask(t)} className={`grid grid-cols-12 gap-4 p-4 border-b border-slate-50 hover:bg-slate-50 items-center text-sm cursor-pointer ${delayed ? 'bg-rose-50/30' : ''}`}>
                                                    <div className="col-span-1 text-slate-400 font-mono text-xs">#{t.idTarea}</div>
                                                    <div className="col-span-6 font-bold text-slate-700 flex items-center gap-2">
                                                        {t.titulo}
                                                        {delayed && <span className="bg-rose-100 text-rose-600 text-[10px] px-1.5 rounded border border-rose-200">Atrasada</span>}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${t.estado === 'EnCurso' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            t.estado === 'Hecha' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>{t.estado}</span>
                                                    </div>
                                                    <div className="col-span-2 text-slate-500 text-xs font-mono">
                                                        {t.fechaObjetivo}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {viewMode === 'board' && (
                                <div className="h-full flex gap-4 overflow-x-auto pb-2">
                                    {['Pendiente', 'EnCurso', 'Hecha'].map(status => (
                                        <div key={status} className="w-80 shrink-0 flex flex-col bg-slate-100 rounded-xl max-h-full border border-slate-200">
                                            <div className={`p-3 font-bold text-slate-600 border-b border-slate-200 flex justify-between ${status === 'EnCurso' ? 'bg-blue-50/50' : status === 'Hecha' ? 'bg-emerald-50/50' : ''}`}>
                                                {status}
                                                <span className="bg-white px-2 rounded-full text-xs flex items-center shadow-sm border border-slate-200">{tasks.filter(t => t.estado === status || (status === 'Hecha' && t.estado === 'Descartada')).length}</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                                {tasks.filter(t => t.estado === status || (status === 'Hecha' && t.estado === 'Descartada')).map(t => (
                                                    <div key={t.idTarea} onClick={() => setSelectedTask(t)} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                                                        <div className="text-sm font-bold text-slate-700 mb-1">{t.titulo}</div>
                                                        <div className="flex justify-between items-center mt-3">
                                                            <div className="flex items-center gap-1 text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-100">
                                                                <Briefcase size={10} />
                                                                <span className="truncate max-w-[100px]">{t.proyecto?.nombre}</span>
                                                            </div>
                                                            {isTaskDelayed(t) && <AlertCircle size={14} className="text-rose-500" />}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>

            {/* Create Task Modal */}
            {showCreateTask && selectedProjectId && (
                <CreateTaskModal
                    isOpen={true}
                    currentProject={currentProject}
                    onClose={() => setShowCreateTask(false)}
                    onSuccess={handleTaskCreated}
                />
            )}

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    mode="planning"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={() => {
                        setSelectedTask(null);
                        // Refresh logic
                        if (selectedProjectId) clarityService.getProyectosTareas(selectedProjectId).then(res => setTasks(res || []));
                    }}
                />
            )}
            {/* Create Project Modal (Simple Overlay) */}
            {showCreateProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 relative">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                            <Layout className="text-indigo-600" /> Nuevo Proyecto
                        </h2>
                        <div className="space-y-4">
                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <label className="text-xs font-bold text-indigo-900 uppercase mb-2 block">Nombre del Proyecto</label>
                                <input
                                    autoFocus
                                    className="w-full text-sm border border-slate-300 rounded-lg px-4 py-2 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-white transition-all font-bold"
                                    placeholder="Ej: Migración Cloud 2026..."
                                    value={newProjectName}
                                    onChange={e => setNewProjectName(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button onClick={() => setShowCreateProject(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm">Cerrar</button>
                                <button onClick={handleCreateProject} disabled={!newProjectName} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200 text-sm flex items-center gap-2">
                                    <Plus size={16} /> Crear Proyecto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Project Modal */}
            {showEditProject && currentProject && (
                <EditProjectDialog
                    project={currentProject}
                    onClose={() => setShowEditProject(false)}
                    onSave={handleUpdateProject}
                />
            )}
        </div>
    );
};

const EditProjectDialog: React.FC<{ project: Proyecto, onClose: () => void, onSave: (name: string, desc: string) => void }> = ({ project, onClose, onSave }) => {
    const [name, setName] = useState(project.nombre);
    const [desc, setDesc] = useState(project.descripcion || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 relative">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                    <Edit3 className="text-indigo-600" /> Editar Proyecto
                </h2>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nombre</label>
                        <input
                            autoFocus
                            className="w-full text-sm border border-slate-300 rounded-lg px-4 py-2 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-white transition-all font-bold"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Descripción</label>
                        <textarea
                            className="w-full text-sm border border-slate-300 rounded-lg px-4 py-6 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none bg-white transition-all min-h-[100px]"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
                        <button onClick={() => onSave(name, desc)} disabled={!name} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200 text-sm flex items-center gap-2">
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
