import React, { useEffect, useState } from 'react';
import {
    Clock, AlertTriangle, CheckCircle2, Folder, RefreshCw,
    ChevronDown, ChevronRight, Calendar,
    ListTodo, LayoutList, CheckCircle, Eye
} from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';
import { TaskDetailModalV2 } from '../../components/task-detail-v2/TaskDetailModalV2';

interface Tarea {
    idTarea: number;
    idProyecto: number;
    titulo: string;
    estado: string;
    prioridad: string;
    progreso: number;
    fechaObjetivo: string;
    diasAtraso: number;
    esAtrasada: boolean;
    proyectoNombre: string;
    [key: string]: any;
}

interface Proyecto {
    idProyecto: number;
    nombre: string;
    progresoProyecto: number;
    misTareas: Tarea[];
}

const MiAsignacionPage: React.FC = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [proyectos, setProyectos] = useState<Proyecto[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getMiAsignacion('pendientes');
            setProyectos(data.proyectos || []);
            setResumen(data.resumen || null);
            setExpandedProjects(new Set());
        } catch (error) {
            console.error(error);
            showToast('Error al cargar asignaciones', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleProject = (id: number) => {
        const newSet = new Set(expandedProjects);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedProjects(newSet);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-NI', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getPrioridadStyle = (prioridad: string) => {
        switch (prioridad) {
            case 'Alta': return 'text-rose-600 bg-rose-50 border-rose-100';
            case 'Media': return 'text-amber-600 bg-amber-50 border-amber-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    const getEstadoStyle = (estado: string) => {
        switch (estado) {
            case 'Hecha':
            case 'Completada':
                return 'bg-emerald-100 text-emerald-700';
            case 'EnCurso':
            case 'En Curso':
                return 'bg-blue-100 text-blue-700';
            case 'Bloqueada':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-slate-100 text-slate-600';
        }
    };

    const handleTaskClick = (tarea: Tarea) => {
        setSelectedTask(tarea);
    };

    const handleTaskUpdate = () => {
        setSelectedTask(null);
        loadData(); // Reload to reflect changes
    };

    if (loading && proyectos.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-clarity-bg">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-clarity-primary animate-spin mx-auto mb-4" />
                    <p className="text-clarity-secondary font-medium">Cargando tus asignaciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-clarity-bg p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-clarity-text flex items-center gap-3 tracking-tight">
                            <LayoutList className="text-clarity-primary w-8 h-8" />
                            Mi Asignación
                        </h1>
                        <p className="text-clarity-secondary mt-1">Haz clic en cualquier tarea para trabajar en ella directamente</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-clarity-surface border border-slate-200 rounded-lg font-medium text-clarity-text shadow-sm hover:shadow hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </button>
                </div>

                {/* Dashboard de Status */}
                {resumen && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-clarity-surface p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-clarity-secondary">
                                <ListTodo size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-clarity-text">{resumen.totalTareas}</div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pendientes</div>
                            </div>
                        </div>
                        <div className="bg-clarity-surface p-5 rounded-xl border border-rose-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-rose-50 rounded-lg flex items-center justify-center text-clarity-danger">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-clarity-danger">{resumen.tareasAtrasadas}</div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Atrasadas</div>
                            </div>
                        </div>
                        <div className="bg-clarity-surface p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-clarity-warning">
                                <Clock size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-clarity-warning">{resumen.tareasHoy}</div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Para Hoy</div>
                            </div>
                        </div>
                        <div className="bg-clarity-surface p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-clarity-success">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-clarity-success">{resumen.tareasCompletadas}</div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Completas</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabla Agrupada por Proyecto */}
                <div className="space-y-4">
                    {proyectos.length === 0 ? (
                        <div className="bg-clarity-surface rounded-xl p-12 text-center border border-slate-200 mt-10 shadow-sm">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-clarity-text">¡Todo al día!</h3>
                            <p className="text-clarity-secondary">No tienes tareas pendientes asignadas en proyectos activos.</p>
                        </div>
                    ) : (
                        proyectos.map((proyecto) => {
                            const isExpanded = expandedProjects.has(proyecto.idProyecto);
                            const hasAtraso = proyecto.misTareas.some(t => t.esAtrasada);

                            return (
                                <div key={proyecto.idProyecto} className="bg-clarity-surface rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                                    {/* Header Proyecto */}
                                    <div
                                        onClick={() => toggleProject(proyecto.idProyecto)}
                                        className={`px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/50 border-b border-slate-100' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md ${hasAtraso ? 'bg-rose-50 text-clarity-danger' : 'bg-slate-100 text-clarity-secondary'}`}>
                                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                            </div>
                                            <div>
                                                <h2 className="text-base font-semibold text-clarity-text leading-tight">{proyecto.nombre}</h2>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[11px] font-medium text-clarity-muted flex items-center gap-1">
                                                        <Folder size={12} />
                                                        {proyecto.misTareas.length} TAREAS
                                                    </span>
                                                    {hasAtraso && (
                                                        <span className="text-[10px] font-semibold bg-rose-100 text-clarity-danger px-2 py-0.5 rounded-sm uppercase tracking-wider">Atención requerida</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden md:flex items-center gap-6">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-semibold text-clarity-muted uppercase tracking-widest">Progreso Global</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-clarity-primary rounded-full transition-all duration-500"
                                                            style={{ width: `${proyecto.progresoProyecto}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-semibold text-clarity-text">{Math.round(proyecto.progresoProyecto)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body - Task Cards */}
                                    {isExpanded && (
                                        <div className="p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {proyecto.misTareas.map((tarea) => (
                                                    <div
                                                        key={tarea.idTarea}
                                                        onClick={() => handleTaskClick(tarea)}
                                                        className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
                                                            ${tarea.estado === 'Hecha' || tarea.estado === 'Completada'
                                                                ? 'border-emerald-100 bg-emerald-50/20 opacity-70'
                                                                : tarea.esAtrasada
                                                                    ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                                                                    : 'border-slate-200 bg-clarity-surface hover:border-clarity-primary/40'
                                                            }`}
                                                    >
                                                        {/* Top row: Title + Estado */}
                                                        <div className="flex items-start justify-between gap-2 mb-3">
                                                            <h3 className={`text-sm font-semibold leading-tight flex-1 ${tarea.estado === 'Hecha' ? 'line-through text-slate-400' : 'text-clarity-text group-hover:text-clarity-primary'} transition-colors`}>
                                                                {tarea.titulo}
                                                            </h3>
                                                            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getEstadoStyle(tarea.estado)}`}>
                                                                {tarea.estado}
                                                            </span>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mb-3">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[10px] font-semibold text-clarity-muted uppercase">Avance</span>
                                                                <span className="text-xs font-bold text-clarity-text">{tarea.progreso || 0}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${tarea.progreso >= 100
                                                                        ? 'bg-emerald-500'
                                                                        : tarea.esAtrasada
                                                                            ? 'bg-rose-500'
                                                                            : 'bg-clarity-primary'
                                                                        }`}
                                                                    style={{ width: `${Math.min(tarea.progreso || 0, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Bottom row: Meta info */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getPrioridadStyle(tarea.prioridad)}`}>
                                                                    {tarea.prioridad}
                                                                </span>
                                                                <span className={`text-[11px] font-medium flex items-center gap-1 ${tarea.esAtrasada ? 'text-rose-600 font-semibold' : 'text-clarity-muted'}`}>
                                                                    <Calendar size={12} />
                                                                    {formatDate(tarea.fechaObjetivo)}
                                                                </span>
                                                            </div>

                                                            {tarea.esAtrasada && (
                                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md uppercase animate-pulse border border-rose-100">
                                                                    {tarea.diasAtraso}d atraso
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Hover action hint */}
                                                        <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-clarity-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                            <span className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-lg shadow-sm border border-slate-100 text-[11px] font-bold text-clarity-primary uppercase tracking-wide flex items-center gap-1.5 translate-y-2 group-hover:translate-y-0 transition-all">
                                                                <Eye size={14} />
                                                                Abrir Tarea
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Task Detail Modal - Work on task directly */}
            {selectedTask && (
                <TaskDetailModalV2
                    task={selectedTask as any}
                    mode="execution"
                    onClose={() => setSelectedTask(null)}
                    onUpdate={handleTaskUpdate}
                />
            )}
        </div>
    );
};

export default MiAsignacionPage;
