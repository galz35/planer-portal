import { useState, useEffect } from 'react';
import type { Tarea, Proyecto } from '../../types/modelos';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';
import {
    LayoutList, Component, Calendar,
    Filter, FileSpreadsheet,
    MoreVertical, Plus, Folder, Loader2,
    History
} from 'lucide-react';

export const ProjectSimulationPage = () => {
    // REAL DATA STATE
    const [projects, setProjects] = useState<Proyecto[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // VIEW STATE
    const [viewMode, setViewMode] = useState<'table' | 'board' | 'gantt'>('table');
    const [filter, setFilter] = useState('');

    // DETAIL PANEL STATE
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // AUDIT STATE
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // FETCH PROJECTS
    useEffect(() => {
        const loadProjects = async () => {
            try {
                setLoading(true);
                const res = await clarityService.getProyectos();
                const projectsData = (res as any)?.items || res || [];
                setProjects(projectsData);
                if (projectsData.length > 0) {
                    setSelectedProjectId(projectsData[0].idProyecto);
                }
            } catch (error) {
                showToast("Error cargando proyectos", "error");
            } finally {
                setLoading(false);
            }
        };
        loadProjects();
    }, []);

    // FETCH TASKS WHEN PROJECT CHANGES
    useEffect(() => {
        if (!selectedProjectId) return;

        const loadTasks = async () => {
            try {
                setLoading(true);
                const data = await clarityService.getProyectosTareas(selectedProjectId);
                setTasks(data || []);
            } catch (error) {
                showToast("Error cargando tareas del proyecto", "error");
            } finally {
                setLoading(false);
            }
        };
        loadTasks();
    }, [selectedProjectId]);

    const openTaskDetails = async (task: Tarea) => {
        setSelectedTask(task);
        setIsPanelOpen(true);
        // Load real audit logs for this task
        try {
            const logs = await clarityService.getAuditLogsByTask(task.idTarea);
            setAuditLogs(logs || []);
        } catch (e) {
            setAuditLogs([]);
        }
    };

    const statusColors: Record<string, string> = {
        'Pendiente': 'bg-slate-100 text-slate-600',
        'EnCurso': 'bg-blue-100 text-blue-700',
        'Bloqueada': 'bg-red-100 text-red-700',
        'Revision': 'bg-purple-100 text-purple-700',
        'Hecha': 'bg-emerald-100 text-emerald-700',
        'Descartada': 'bg-gray-100 text-gray-500'
    };

    const handleStatusChange = async (taskId: number, newStatus: string) => {
        const previousTasks = [...tasks];
        setTasks(prev => prev.map(t => t.idTarea === taskId ? { ...t, estado: newStatus as any } : t));

        if (selectedTask?.idTarea === taskId) {
            setSelectedTask({ ...selectedTask, estado: newStatus as any });
        }

        try {
            await clarityService.actualizarTarea(taskId, { estado: newStatus as any });
            showToast("Estado actualizado", "success");
            // Refresh audit logs
            const logs = await clarityService.getAuditLogsByTask(taskId);
            setAuditLogs(logs || []);
        } catch (error) {
            setTasks(previousTasks);
            showToast("Error al actualizar estado", "error");
        }
    };

    const handleExport = () => {
        if (!tasks.length) return showToast("No hay datos para exportar", "warning");

        const headers = ["ID", "Titulo", "Estado", "Prioridad", "Progreso", "Fecha Objetivo"];
        const rows = tasks.map(t => [
            t.idTarea,
            `"${t.titulo?.replace(/"/g, '""')}"`,
            t.estado,
            t.prioridad,
            `${t.progreso}%`,
            t.fechaObjetivo ? new Date(t.fechaObjetivo).toLocaleDateString() : 'N/A'
        ]);

        const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.setAttribute("href", url);
        link.setAttribute("download", `Simulacion_Proyecto_${selectedProjectId || 'General'}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Reporte CSV generado con éxito", "success");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 font-sans p-6 overflow-hidden">
            {/* HER0 / HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                            <Folder size={10} /> Proyectos Activos
                        </span>
                        {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="text-2xl font-black text-slate-900 bg-transparent border-none outline-none cursor-pointer hover:bg-slate-100 rounded -ml-2 px-2 py-1 transition-colors max-w-[400px] truncate"
                            value={selectedProjectId || ''}
                            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                            disabled={loading || projects.length === 0}
                        >
                            {projects.length === 0 && <option value="">Sin proyectos</option>}
                            {projects.map(p => (
                                <option key={p.idProyecto} value={p.idProyecto}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">
                        {projects.find(p => p.idProyecto === selectedProjectId)?.descripcion || 'Supervisión en tiempo real de la base de datos.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <LayoutList size={16} /> <span className="hidden md:inline">Lista</span>
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Component size={16} /> <span className="hidden md:inline">Kanban</span>
                        </button>
                        <button
                            onClick={() => setViewMode('gantt')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'gantt' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Calendar size={16} /> <span className="hidden md:inline">Gantt</span>
                        </button>
                    </div>

                    <button onClick={handleExport} className="bg-white hover:bg-slate-50 text-slate-700 p-2.5 rounded-xl border border-slate-200 shadow-sm transition-all" title="Exportar Reporte">
                        <FileSpreadsheet size={18} />
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={`flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 relative ${isPanelOpen ? 'mr-[400px]' : ''}`}>

                {/* TOOLBAR */}
                <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-50/50">
                    <div className="relative w-full md:w-80">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en la base de datos..."
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-full transition-all"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => showToast("La creación de tareas se gestiona desde el Plan de Trabajo", "info")}
                        className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <Plus size={16} /> Crear Tarea
                    </button>
                </div>

                {/* LOADING STATE */}
                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <p className="text-sm font-bold uppercase tracking-widest text-xs">Sincronizando registros...</p>
                    </div>
                )}

                {/* EMPTY STATE */}
                {!loading && tasks.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                            <Folder size={32} />
                        </div>
                        <p className="text-sm font-medium">No se encontraron tareas en este proyecto.</p>
                    </div>
                )}

                {/* TABLE VIEW */}
                {!loading && tasks.length > 0 && viewMode === 'table' && (
                    <div className="overflow-auto flex-1 bg-white">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-16 text-center">ID</th>
                                    <th className="px-4 py-3">Nombre de la Tarea</th>
                                    <th className="px-4 py-3 w-48">Responsable</th>
                                    <th className="px-4 py-3 w-32">Estado</th>
                                    <th className="px-4 py-3 w-28">Prioridad</th>
                                    <th className="px-4 py-3 w-32 text-center">Progreso</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {tasks.filter(t => {
                                    const term = filter.toLowerCase();
                                    return t.titulo.toLowerCase().includes(term) || t.idTarea.toString().includes(term);
                                }).map(task => (
                                    <tr
                                        key={task.idTarea}
                                        className={`hover:bg-slate-50 group transition-colors cursor-pointer ${selectedTask?.idTarea === task.idTarea ? 'bg-indigo-50/60' : ''}`}
                                        onClick={() => openTaskDetails(task)}
                                    >
                                        <td className="px-4 py-3 text-slate-400 font-mono text-[10px] text-center">#{task.idTarea}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800 text-sm mb-0.5">{task.titulo}</div>
                                            {task.descripcion && <div className="text-[10px] text-slate-400 truncate max-w-md">{task.descripcion}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                
                                                <span className="truncate max-w-[120px] font-medium">
                                                    {task.asignados?.[0]?.usuario?.nombre || 'Sin asignar'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${statusColors[task.estado] ? statusColors[task.estado].replace('text-', 'border-transparent text-') : 'bg-slate-100 text-slate-500'}`}>
                                                {task.estado}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${task.prioridad === 'Alta' ? 'bg-rose-50 border-rose-100 text-rose-700' : task.prioridad === 'Media' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                                {task.prioridad}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center gap-2 justify-center">
                                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full bg-indigo-600`} style={{ width: `${task.progreso}%` }}></div>
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-500">{task.progreso}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-slate-300 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Simplified Board and Gantt would go here, removed for space and keeping table logic real */}
                {!loading && tasks.length > 0 && (viewMode === 'board' || viewMode === 'gantt') && (
                    <div className="flex-1 flex items-center justify-center text-slate-400 p-10 font-bold uppercase text-xs tracking-widest bg-slate-50/20">
                        Vista {viewMode} disponible en versión completa de CRM
                    </div>
                )}
            </div>

            {/* TASK DETAIL SLIDE-OVER */}
            {isPanelOpen && selectedTask && (
                <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl border-l border-slate-200 z-50 animate-in slide-in-from-right duration-300 flex flex-col font-sans">
                    {/* Panel Header */}
                    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/80 backdrop-blur">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ID #{selectedTask.idTarea}</span>
                            <span className="text-xs font-bold text-indigo-600">Registro de la Base de Datos</span>
                        </div>
                        <button onClick={() => setIsPanelOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
                            <Plus size={20} className="rotate-45" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-snug mb-2">{selectedTask.titulo}</h2>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedTask.descripcion || 'Sin descripción.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Estado</label>
                                <select
                                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    value={selectedTask.estado}
                                    onChange={(e) => handleStatusChange(selectedTask.idTarea, e.target.value)}
                                >
                                    <option value="Pendiente">Pendiente</option>
                                    <option value="EnCurso">En Curso</option>
                                    <option value="Bloqueada">Bloqueada</option>
                                    <option value="Revision">Revisión</option>
                                    <option value="Hecha">Hecha</option>
                                </select>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Prioridad</label>
                                <div className="text-xs font-black text-slate-700 text-center py-2">{selectedTask.prioridad}</div>
                            </div>
                        </div>

                        {/* Audit Feed */}
                        <div className="flex-1 flex flex-col pt-6 border-t border-slate-100">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                                <History size={14} /> Historial de Auditoría
                            </h3>

                            <div className="flex-1 space-y-4">
                                {auditLogs.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase">Sin registros de cambios</p>
                                    </div>
                                ) : (
                                    auditLogs.map((log, idx) => (
                                        <div key={idx} className="flex gap-3 relative">
                                            {idx !== auditLogs.length - 1 && <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-100"></div>}
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-sm">
                                                <History size={12} className="text-slate-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-bold text-slate-800 text-[11px]">{log.accion}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                        {new Date(log.fecha).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                                    {log.datosNuevos ? `Cambió a: ${JSON.stringify(log.datosNuevos).substring(0, 50)}...` : 'Acción registrada'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
