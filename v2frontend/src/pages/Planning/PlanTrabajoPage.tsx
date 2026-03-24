import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Tarea } from '../../types/modelos';
import { CreateTaskModal } from '../../components/ui/CreateTaskModal';
import { alerts } from '../../utils/alerts';

import { AvanceMensualModal } from './components/AvanceMensualModal';
import {
    Plus,
    Briefcase, Lock, Search, CheckCircle,
    GitPullRequest, ChevronDown, Edit, X, ArrowLeft
} from 'lucide-react';
import {
    format
} from 'date-fns';
import { es } from 'date-fns/locale';

// --- TYPES ---
import type { ViewMode, Comment } from '../../types/plan-trabajo.types';

// --- COMPONENTS ---
import { ViewTabs } from './components/ViewTabs';
import { GanttView } from './components/GanttView';
import { IntegralView } from './components/IntegralView';
import { TaskRow } from './components/TaskRow';
import { TaskDetailsPanel } from './components/TaskDetailsPanel';

// --- HOOKS ---
import { usePlanTrabajoData } from './hooks/usePlanTrabajoData';
import { usePlanTrabajoFilters } from './hooks/usePlanTrabajoFilters';
import { usePlanTrabajoActions } from './hooks/usePlanTrabajoActions';

export const PlanTrabajoPage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectIdFromUrl = searchParams.get('projectId');

    // Detect initial view mode from URL
    const initialViewMode: ViewMode = useMemo(() => {
        const v = searchParams.get('view') || searchParams.get('gant');
        if (v === 'list') return 'list';
        return 'integral'; // Default to Gantt
    }, [searchParams]);

    // --- HOOKS ---
    const {
        projects, setProjects,
        selectedProject, setSelectedProject,
        tasks, setTasks,
        team,
        allUsers,
        hierarchyCatalog,
        loading,
        loadingTasks,
        isSaving, setIsSaving,
        loadTasks
    } = usePlanTrabajoData(projectIdFromUrl);

    const handleCloneTask = async (taskId: number) => {
        try {
            await clarityService.cloneTarea(taskId);
            showToast('Tarea y subtareas clonadas exitosamente', 'success');
            loadTasks();
        } catch (e: any) {
            console.error(e);
            showToast('Error al clonar tarea', 'error');
        }
    };

    const {
        viewMode, setViewMode,
        filterText, setFilterText,
        filterAssignee, setFilterAssignee,
        colFilters, setColFilters,
        hFilters, setHFilters,
        projectSearch, setProjectSearch,
        expandedTasks, toggleExpand,
        uniqueGerencias, uniqueSubgerencias, uniqueAreas,
        filteredProjects,
        finalFilteredTasks,
        hierarchyData
    } = usePlanTrabajoFilters(tasks, projects, hierarchyCatalog, initialViewMode);

    const {
        handleAssign,
        handleNewProject,
        handleDeleteTask,
        handleQuickSubtask,
        handleSaveProjectName
    } = usePlanTrabajoActions(
        tasks, setTasks,
        selectedProject, setSelectedProject,
        projects, setProjects,
        team, showToast, loadTasks
    );

    // Permissions
    const canManageProject = useMemo(() => {
        if (!user) return false;
        if (user.rolGlobal === 'Admin' || user.rolGlobal === 'Administrador') return true;
        if (user.rolGlobal === 'Jefe' && selectedProject?.idNodoDuenio) {
            return user.idOrg === selectedProject.idNodoDuenio;
        }
        return false;
    }, [user, selectedProject]);

    const isManagerMode = canManageProject;

    // Local UI State
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isAssigneeFilterOpen, setIsAssigneeFilterOpen] = useState(false);
    const [assigneeFilterSearch, setAssigneeFilterSearch] = useState('');

    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [comments, setComments] = useState<Record<number, Comment[]>>({});
    const [newComment, setNewComment] = useState('');
    const [isReportingBlocker, setIsReportingBlocker] = useState(false);
    const [blockerReason, setBlockerReason] = useState('');
    const [blockerArea, setBlockerArea] = useState('');
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isAvanceMensualOpen, setIsAvanceMensualOpen] = useState(false);
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [tempProjectName, setTempProjectName] = useState('');
    const [creationParentId, setCreationParentId] = useState<number | null>(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const openTaskDetails = async (task: Tarea) => {
        let initialComments: Comment[] = [];
        if (task.avances) {
            initialComments = task.avances.map(a => ({
                id: a.idLog,
                idLog: a.idLog,
                user: team.find(m => m.idUsuario === a.idUsuario)?.nombre || 'Usuario',
                text: a.comentario,
                timestamp: format(new Date(a.fecha), 'd MMM HH:mm', { locale: es }),
                isMine: user?.idUsuario === a.idUsuario,
                dateObj: new Date(a.fecha)
            }));
            initialComments.sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));
        }

        setComments(prev => ({
            ...prev,
            [task.idTarea]: initialComments
        }));

        setSelectedTask({ ...task });
        setIsPanelOpen(true);
    };

    const handleAddComment = async () => {
        if (!selectedTask || !newComment.trim() || !user) return;
        try {
            await clarityService.postAvance(selectedTask.idTarea, {
                idUsuario: user.idUsuario,
                progreso: selectedTask.progreso,
                comentario: newComment
            });

            const updatedTask = await clarityService.getTaskById(selectedTask.idTarea);
            if (updatedTask && updatedTask.avances) {
                const freshComments = updatedTask.avances.map(a => ({
                    id: a.idLog,
                    idLog: a.idLog,
                    user: team.find(m => m.idUsuario === a.idUsuario)?.nombre || 'Yo',
                    text: a.comentario,
                    timestamp: format(new Date(a.fecha), 'd MMM HH:mm', { locale: es }),
                    isMine: user.idUsuario === a.idUsuario,
                    dateObj: new Date(a.fecha)
                })).sort((a, b) => (b.dateObj?.getTime() || 0) - (a.dateObj?.getTime() || 0));

                setComments(prev => ({ ...prev, [selectedTask.idTarea]: freshComments }));
                setTasks(prev => prev.map(t => t.idTarea === selectedTask.idTarea ? updatedTask : t));
                setSelectedTask(updatedTask);
            }
            setNewComment('');
            showToast('Comentario agregado', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error al agregar comentario', 'error');
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!(await alerts.confirm('¿Eliminar comentario?'))) return;
        try {
            await clarityService.deleteAvance(commentId);
            setComments(prev => ({
                ...prev,
                [selectedTask!.idTarea]: prev[selectedTask!.idTarea].filter(c => c.id !== commentId)
            }));
            setTasks(prev => prev.map(t => {
                if (t.idTarea === selectedTask!.idTarea && t.avances) {
                    return { ...t, avances: t.avances.filter(a => a.idLog !== commentId) };
                }
                return t;
            }));
            showToast('Comentario eliminado', 'success');
        } catch (e) {
            console.error(e);
            showToast('Error eliminando comentario', 'error');
        }
    };

    const handleReportBlockerInternal = () => {
        if (!selectedTask) return;
        setSelectedTask({ ...selectedTask, estado: 'Bloqueada' });
        showToast('Tarea marcada como bloqueada', 'error');
        setIsReportingBlocker(false);
        setBlockerReason('');
        setBlockerArea('');
    };

    const handleSaveChangesInternal = async () => {
        if (!selectedTask) return;
        setIsSaving(true);
        try {
            const response = await clarityService.actualizarTarea(selectedTask.idTarea, {
                titulo: selectedTask.titulo,
                estado: selectedTask.estado,
                prioridad: selectedTask.prioridad,
                progreso: selectedTask.progreso,
                descripcion: selectedTask.descripcion,
                fechaInicioPlanificada: selectedTask.fechaInicioPlanificada || undefined,
                fechaObjetivo: selectedTask.fechaObjetivo || undefined,
                tipo: selectedTask.tipo,
                linkEvidencia: selectedTask.linkEvidencia
            });

            if ((response as any)?.requiresApproval) {
                showToast((response as any).message || 'Cambio enviado para aprobación', 'info');
                loadTasks();
                setIsPanelOpen(false);
                return;
            }

            setTasks(prev => prev.map(t => t.idTarea === selectedTask.idTarea ? { ...t, ...selectedTask } : t));
            showToast('Cambios guardados', 'success');
            setIsPanelOpen(false);
        } catch (error: any) {
            console.error(error);
            let msg = error.response?.data?.message || 'Error al guardar cambios';
            if (Array.isArray(msg)) msg = msg.join(', ');
            msg = String(msg);

            if (msg && String(msg).toLowerCase().includes('requieren aprobación') || String(msg).toLowerCase().includes('approval')) {
                if (await alerts.confirm('🔒 Tarea Protegida', 'Esta tarea requiere aprobación para cambios sensibles. ¿Deseas enviar una solicitud de cambio oficial?', 'info')) {
                    const motivo = await alerts.prompt('Motivo del cambio', 'Ej: Cambio de fecha por disponibilidad de equipo');
                    const original = tasks.find(t => t.idTarea === selectedTask.idTarea);
                    const finalMotivo = motivo || 'Actualización de planificación';

                    if (original) {
                        let sent = 0;
                        try {
                            if (selectedTask.fechaInicioPlanificada !== original.fechaInicioPlanificada) {
                                await clarityService.solicitarCambio(selectedTask.idTarea, 'fechaInicioPlanificada', selectedTask.fechaInicioPlanificada || '', finalMotivo);
                                sent++;
                            }
                            if (selectedTask.fechaObjetivo !== original.fechaObjetivo) {
                                await clarityService.solicitarCambio(selectedTask.idTarea, 'fechaObjetivo', selectedTask.fechaObjetivo || '', finalMotivo);
                                sent++;
                            }
                            if (sent > 0) {
                                showToast(`Se enviaron ${sent} solicitudes de cambio a tu jefe`, 'success');
                                loadTasks();
                                setIsPanelOpen(false);
                            } else {
                                showToast('No se detectaron cambios que requieran solicitud', 'info');
                            }
                        } catch (reqError) {
                            showToast('Error al enviar solicitud', 'error');
                        }
                    }
                    return;
                }
            }
            showToast(msg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!selectedProject && viewMode !== 'roadmap') {
            setTasks([]);
            return;
        }
        if (viewMode === 'roadmap') return;
        loadTasks();
    }, [selectedProject, viewMode, loadTasks, setTasks]);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
            {/* HEADER */}
            <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-40">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all font-bold text-xs"
                    >
                        <ArrowLeft size={16} />
                        <span>Regresar</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200"></div>

                    <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg shadow-slate-200">
                        <Briefcase size={20} />
                    </div>
                    
                        <div className="relative">
                            <button
                                onClick={() => setIsProjectSelectorOpen(!isProjectSelectorOpen)}
                                className="flex items-center gap-3 text-left group/title p-1.5 -ml-1.5 rounded-xl hover:bg-slate-50 transition-all outline-none"
                            >
                                <div className="flex flex-col">
                                    {isEditingProjectName && selectedProject ? (
                                        <input
                                            autoFocus
                                            className="font-black text-sm text-slate-800 bg-white border-2 border-indigo-500 rounded px-2 py-0.5 outline-none"
                                            value={tempProjectName}
                                            onChange={(e) => setTempProjectName(e.target.value)}
                                            onBlur={() => {
                                                if (tempProjectName && tempProjectName !== selectedProject.nombre) {
                                                    handleSaveProjectName(selectedProject.idProyecto, tempProjectName);
                                                }
                                                setIsEditingProjectName(false);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && tempProjectName && tempProjectName !== selectedProject.nombre) {
                                                    handleSaveProjectName(selectedProject.idProyecto, tempProjectName);
                                                    setIsEditingProjectName(false);
                                                }
                                                if (e.key === 'Escape') setIsEditingProjectName(false);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h1 className="font-black text-sm text-slate-800 tracking-tight uppercase">
                                                {selectedProject ? selectedProject.nombre : 'Seleccionar Proyecto'}
                                            </h1>
                                            {selectedProject && canManageProject && (
                                                <Edit
                                                    size={12}
                                                    className="text-slate-400 opacity-0 group-hover/title:opacity-100 transition-opacity cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTempProjectName(selectedProject.nombre);
                                                        setIsEditingProjectName(true);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    {selectedProject && (
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                            <span className={`flex items-center gap-1 ${selectedProject.estado === 'Activo' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${selectedProject.estado === 'Activo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                {selectedProject.estado}
                                            </span>
                                            {selectedProject.fechaInicio && (
                                                <span className="flex items-center gap-1">
                                                    <span className="w-0.5 h-2 bg-slate-200"></span>
                                                    {format(new Date(selectedProject.fechaInicio), 'dd MMM')} - {selectedProject.fechaFin ? format(new Date(selectedProject.fechaFin), 'dd MMM') : '??'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform duration-300 ${isProjectSelectorOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Project Selector Menu */}
                            {isProjectSelectorOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setIsProjectSelectorOpen(false)} />
                                    <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-white rounded-2xl border border-slate-100 shadow-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Buscar proyecto..."
                                                className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:bg-slate-100 transition-colors"
                                                value={projectSearch}
                                                onChange={(e) => setProjectSearch(e.target.value)}
                                            />
                                        </div>

                                        {/* Filters UI */}
                                        <div className="grid grid-cols-1 gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400"
                                                value={hFilters.gerencia}
                                                onChange={e => setHFilters({ ...hFilters, gerencia: e.target.value, subgerencia: '', area: '' })}
                                            >
                                                <option value="">Todas las Gerencias</option>
                                                {uniqueGerencias.map((g: any) => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50"
                                                    value={hFilters.subgerencia}
                                                    onChange={e => setHFilters({ ...hFilters, subgerencia: e.target.value, area: '' })}
                                                    disabled={!hFilters.gerencia}
                                                >
                                                    <option value="">Subgerencia...</option>
                                                    {uniqueSubgerencias.map((s: any) => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold text-slate-600 outline-none focus:border-indigo-400 disabled:opacity-50"
                                                    value={hFilters.area}
                                                    onChange={e => setHFilters({ ...hFilters, area: e.target.value })}
                                                    disabled={!hFilters.subgerencia}
                                                >
                                                    <option value="">Área...</option>
                                                    {uniqueAreas.map((a: any) => <option key={a} value={a}>{a}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                            {/* Proyectos Activos */}
                                            {filteredProjects.filter(p => !p.enllavado && p.estado === 'Activo').length > 0 && (
                                                <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mb-1">Activos</div>
                                            )}
                                            {filteredProjects.filter(p => !p.enllavado && p.estado === 'Activo').map(p => (
                                                <div key={p.idProyecto} className="flex items-center group/item hover:bg-slate-50 rounded-xl pr-2 transition-colors">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedProject(p);
                                                            setIsProjectSelectorOpen(false);
                                                            setProjectSearch('');
                                                        }}
                                                        className={`flex-1 text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${selectedProject?.idProyecto === p.idProyecto ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            {p.nombre}
                                                        </div>
                                                        {selectedProject?.idProyecto === p.idProyecto && <CheckCircle size={14} className="text-indigo-600" />}
                                                    </button>
                                                </div>
                                            ))}

                                            {/* Enllavados */}
                                            {filteredProjects.some(p => p.enllavado && p.estado === 'Activo') && (
                                                <>
                                                    <div className="px-2 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-lg mt-2 mb-1">Oficializados</div>
                                                    {filteredProjects.filter(p => p.enllavado && p.estado === 'Activo').map(p => (
                                                        <button
                                                            key={p.idProyecto}
                                                            onClick={() => {
                                                                setSelectedProject(p);
                                                                setIsProjectSelectorOpen(false);
                                                                setProjectSearch('');
                                                            }}
                                                            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between opacity-90 hover:opacity-100 ${selectedProject?.idProyecto === p.idProyecto ? 'bg-amber-50 text-amber-900 border border-amber-100' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Lock size={10} className="text-amber-500" />
                                                                {p.nombre}
                                                            </div>
                                                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">OFICIAL</span>
                                                        </button>
                                                    ))}
                                                </>
                                            )}
                                        </div>

                                        <div className="border-t border-slate-100 mt-2 pt-2">
                                            <button
                                                onClick={() => { setIsProjectSelectorOpen(false); setIsNewProjectModalOpen(true); }}
                                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-xl text-xs font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                                            >
                                                CREAR NUEVO PROYECTO
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-3">
                        {tasks.some(t => (t.pendingRequests || 0) > 0) && (
                            <button
                                onClick={() => navigate('/app/planning/approvals')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 font-bold text-xs rounded-lg hover:bg-purple-200 shadow-sm border border-purple-200 animate-pulse"
                            >
                                <GitPullRequest size={14} />
                                <span className="hidden md:inline">{tasks.reduce((sum, t) => sum + (t.pendingRequests || 0), 0)} Cambios</span>
                            </button>
                        )}

                        <ViewTabs value={viewMode} onChange={setViewMode} />

                        <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        <button
                            onClick={() => setIsCreateTaskOpen(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 text-white font-bold text-xs rounded-lg hover:bg-slate-900 shadow-sm"
                        >
                            <Plus size={14} /> <span className="hidden md:inline">Nueva Tarea</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-white/50 z-50">Cargando...</div>
                ) : (
                    <div className="w-full h-full flex flex-col">
                        {/* Filters Bar */}
                        {viewMode === 'list' && (
                            <div className="px-6 py-2 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-64">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            placeholder="Filtrar tareas..."
                                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold focus:bg-white focus:border-indigo-300 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="relative">
                                        <div
                                            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md pl-3 pr-2 py-1.5 text-xs font-bold text-slate-700 cursor-pointer hover:bg-white transition-colors min-w-[180px]"
                                            onClick={() => setIsAssigneeFilterOpen(!isAssigneeFilterOpen)}
                                        >
                                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                                            <span className="flex-1 truncate">
                                                {filterAssignee
                                                    ? team.find(m => m.idUsuario === filterAssignee)?.nombre || 'Desconocido'
                                                    : 'Todos los asignados'
                                                }
                                            </span>
                                            <ChevronDown size={12} className="text-slate-400 shrink-0" />
                                        </div>

                                        {isAssigneeFilterOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsAssigneeFilterOpen(false)} />
                                                <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-20">
                                                    <div className="px-2 pb-2 border-b border-slate-100 mb-1">
                                                        <input
                                                            autoFocus
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-md py-1.5 px-2 text-xs font-bold outline-none focus:border-indigo-400"
                                                            placeholder="Buscar persona..."
                                                            value={assigneeFilterSearch}
                                                            onChange={e => setAssigneeFilterSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        <button
                                                            onClick={() => { setFilterAssignee(''); setIsAssigneeFilterOpen(false); }}
                                                            className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-600"
                                                        >
                                                            Todos
                                                        </button>
                                                        {team
                                                            .filter(m => (m.nombre || '').toLowerCase().includes(assigneeFilterSearch.toLowerCase()))
                                                            .map(member => (
                                                                <button
                                                                    key={member.idUsuario}
                                                                    onClick={() => { setFilterAssignee(member.idUsuario); setIsAssigneeFilterOpen(false); }}
                                                                    className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 text-slate-600"
                                                                >
                                                                    {member.nombre}
                                                                </button>
                                                            ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium">{finalFilteredTasks.length} tareas</div>
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-hidden">
                            {selectedProject ? (
                                <div className="h-full w-full flex flex-col overflow-hidden">
                                    {viewMode === 'gantt' && (
                                        <div className="flex-1 min-h-0 overflow-hidden">
                                            <GanttView 
                                                hierarchyData={hierarchyData}
                                                expandedTasks={expandedTasks}
                                                toggleExpand={toggleExpand}
                                                onTaskClick={openTaskDetails} 
                                            />
                                        </div>
                                    )}

                                    {viewMode === 'integral' && (
                                        <div className="flex-1 min-h-0 overflow-hidden">
                                            <IntegralView 
                                                hierarchyData={hierarchyData}
                                                expandedTasks={expandedTasks}
                                                toggleExpand={toggleExpand}
                                                onTaskClick={openTaskDetails}
                                                team={team}
                                                allUsers={allUsers}
                                                onAssign={handleAssign}
                                                onToggleSubtaskCreation={(tid) => {
                                                    if (creationParentId === tid) setCreationParentId(null);
                                                    else { setCreationParentId(tid); setNewSubtaskTitle(''); }
                                                }}
                                                creationParentId={creationParentId}
                                                newSubtaskTitle={newSubtaskTitle}
                                                setNewSubtaskTitle={setNewSubtaskTitle}
                                                onQuickSubtask={handleQuickSubtask}
                                                colFilters={colFilters}
                                                setColFilters={setColFilters}
                                                onDeleteTask={handleDeleteTask}
                                                onCloneTask={handleCloneTask}
                                                filterText={filterText}
                                                onFilterTextChange={(text) => setFilterText(text)}
                                                filterAssignee={filterAssignee}
                                                projectStart={selectedProject?.fechaInicio}
                                                projectEnd={selectedProject?.fechaFin}
                                            />
                                        </div>
                                    )}

                                    {viewMode === 'list' && (
                                        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            {/* Table Header */}
                                            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 sticky top-0 z-30">
                                                <div className="col-span-3 pl-2">Tarea</div>
                                                <div className="col-span-2">Estado</div>
                                                <div className="col-span-2">Asignado</div>
                                                <div className="col-span-2 flex items-center gap-1">Fechas <ChevronDown size={10} className="text-indigo-400" /></div>
                                                <div className="col-span-1 text-center">Tiempo</div>
                                                <div className="col-span-2 text-right pr-2">Acciones</div>
                                            </div>

                                            {/* Filter Row */}
                                            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50/50 border-b border-slate-100 shrink-0 z-20">
                                                <div className="col-span-3 pl-2">
                                                    <input
                                                        placeholder="Filtrar tarea..."
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                        value={colFilters.titulo}
                                                        onChange={e => setColFilters(prev => ({ ...prev, titulo: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <select
                                                        className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs outline-none"
                                                        value={colFilters.estado}
                                                        onChange={e => setColFilters(prev => ({ ...prev, estado: e.target.value }))}
                                                    >
                                                        <option value="">Estado...</option>
                                                        {['Pendiente', 'En Curso', 'Bloqueada', 'Revisión', 'Hecha'].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <select
                                                        className="w-full bg-white border border-slate-200 rounded px-1 py-1 text-xs outline-none"
                                                        value={colFilters.asignado}
                                                        onChange={e => setColFilters(prev => ({ ...prev, asignado: e.target.value }))}
                                                    >
                                                        <option value="">Asignado...</option>
                                                        {team.map(m => <option key={m.idUsuario} value={m.idUsuario}>{m.nombre}</option>)}
                                                    </select>
                                                </div>
                                                <div className="col-span-2">
                                                    <input
                                                        placeholder="Fecha..."
                                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none"
                                                        value={colFilters.fecha}
                                                        onChange={e => setColFilters(prev => ({ ...prev, fecha: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="col-span-1"></div>
                                                <div className="col-span-2 flex justify-end pr-2">
                                                    {(colFilters.titulo || colFilters.estado || colFilters.asignado || colFilters.fecha) && (
                                                        <button
                                                            onClick={() => setColFilters({ titulo: '', prioridad: '', estado: '', asignado: '', fecha: '' })}
                                                            className="text-[10px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 bg-rose-50 px-2 py-1 rounded"
                                                        >
                                                            <X size={10} /> LIMPIAR
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-white">
                                                {loadingTasks && (
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 overflow-hidden z-20">
                                                        <div className="h-full bg-slate-500 animate-progress"></div>
                                                    </div>
                                                )}
                                                {finalFilteredTasks.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                                        <p className="text-slate-500 text-sm font-medium">No se encontraron tareas.</p>
                                                    </div>
                                                ) : (
                                                    <div className="divide-y divide-slate-100 pb-24">
                                                        {hierarchyData.roots.map(rootTask => {
                                                            const children = hierarchyData.childrenMap.get(rootTask.idTarea) || [];
                                                            const hasKids = children.length > 0;
                                                            const isExpanded = expandedTasks.has(rootTask.idTarea);

                                                            const getEffProg = (t: Tarea) => (t.estado === 'Hecha' ? 100 : (t.progreso || 0));
                                                            const rootProgress = hasKids ? Math.round(children.reduce((acc, c) => acc + getEffProg(c), 0) / children.length) : getEffProg(rootTask);
                                                            const displayRootTask = { ...rootTask, progreso: rootProgress };

                                                            return (
                                                                <React.Fragment key={rootTask.idTarea}>
                                                                    <div className="relative">
                                                                        <TaskRow
                                                                            task={displayRootTask}
                                                                            isChild={false}
                                                                            hasChildren={hasKids}
                                                                            isExpanded={isExpanded}
                                                                            onToggleExpand={() => toggleExpand(rootTask.idTarea)}
                                                                            selectedTaskId={selectedTask?.idTarea}
                                                                            team={team}
                                                                            allUsers={allUsers}
                                                                            creationParentId={creationParentId}
                                                                            onTaskClick={openTaskDetails}
                                                                            onAssign={handleAssign}
                                                                            onToggleSubtaskCreation={(id) => {
                                                                                if (creationParentId === id) setCreationParentId(null);
                                                                                else { setCreationParentId(id); setNewSubtaskTitle(''); }
                                                                            }}
                                                                            onDeleteTask={handleDeleteTask}
                                                                            onCloneTask={handleCloneTask}
                                                                        />
                                                                    </div>

                                                                    {creationParentId === rootTask.idTarea && (
                                                                        <div className="flex ml-12 mr-8 my-2 items-center gap-4 animate-in slide-in-from-top-2">
                                                                            <input
                                                                                autoFocus
                                                                                placeholder="Nueva subtarea..."
                                                                                className="flex-1 bg-white border-2 border-indigo-500 rounded-lg px-4 py-2 text-sm"
                                                                                value={newSubtaskTitle}
                                                                                onChange={e => setNewSubtaskTitle(e.target.value)}
                                                                                onKeyDown={e => {
                                                                                    if (e.key === 'Enter') handleQuickSubtask(rootTask.idTarea, newSubtaskTitle);
                                                                                    if (e.key === 'Escape') setCreationParentId(null);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )}

                                                                    {isExpanded && children.map(child => (
                                                                        <TaskRow
                                                                            key={child.idTarea}
                                                                            task={child}
                                                                            isChild={true}
                                                                            hasChildren={false}
                                                                            selectedTaskId={selectedTask?.idTarea}
                                                                            team={team}
                                                                            allUsers={allUsers}
                                                                            onTaskClick={openTaskDetails}
                                                                            creationParentId={null}
                                                                            onToggleSubtaskCreation={() => { }}
                                                                            onAssign={handleAssign}
                                                                            onDeleteTask={handleDeleteTask}
                                                                            onCloneTask={handleCloneTask}
                                                                        />
                                                                    ))}
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                                    <h3 className="text-xl font-black text-slate-800 mb-2">Comienza tu Planificación</h3>
                                    <p className="text-sm text-slate-500 mb-8 max-w-md">
                                        Selecciona un proyecto existente desde el selector superior o crea uno nuevo para empezar a gestionar tareas.
                                    </p>
                                    <button
                                        onClick={() => setIsNewProjectModalOpen(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 shadow-xl"
                                    >
                                        <Plus size={18} /> Crear primer proyecto
                                    </button>
                                </div>
                            )}

                            {/* Floating Action Button for New Task */}
                            {selectedProject && viewMode !== 'roadmap' && (
                                <button
                                    onClick={() => setIsCreateTaskOpen(true)}
                                    className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all z-40 animate-in fade-in slide-in-from-bottom"
                                    title="Nueva Tarea Rápida"
                                >
                                    <Plus size={28} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* TASK DETAIL SLIDE-OVER */}
            < TaskDetailsPanel
                isOpen={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                task={selectedTask!}
                setTask={setSelectedTask}
                isManagerMode={isManagerMode}
                selectedProject={selectedProject}
                comments={selectedTask ? comments[selectedTask.idTarea] || [] : []}
                newComment={newComment}
                setNewComment={setNewComment}
                handleAddComment={handleAddComment}
                handleDeleteComment={handleDeleteComment}
                isReportingBlocker={isReportingBlocker}
                setIsReportingBlocker={setIsReportingBlocker}
                blockerReason={blockerReason}
                setBlockerReason={setBlockerReason}
                blockerArea={blockerArea}
                setBlockerArea={setBlockerArea}
                handleReportBlocker={handleReportBlockerInternal}
                handleSaveChanges={handleSaveChangesInternal}
                isSaving={isSaving}
                setIsAvanceMensualOpen={setIsAvanceMensualOpen}
                showToast={showToast}
            />

            {/* MODALS */}
            {
                isCreateTaskOpen && selectedProject && (
                    <CreateTaskModal
                        isOpen={isCreateTaskOpen}
                        onClose={() => setIsCreateTaskOpen(false)}
                        projectId={selectedProject.idProyecto}
                        onSuccess={() => { setIsCreateTaskOpen(false); loadTasks(); }}
                    />
                )
            }

            {
                isAvanceMensualOpen && selectedTask && (
                    <AvanceMensualModal
                        isOpen={isAvanceMensualOpen}
                        onClose={() => setIsAvanceMensualOpen(false)}
                        task={selectedTask}
                        onSaved={() => { loadTasks(); openTaskDetails(selectedTask); }}
                    />
                )
            }

            {
                isNewProjectModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-black text-slate-800">Nuevo Proyecto</h3>
                                <button onClick={() => setIsNewProjectModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del Proyecto</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                        placeholder="Ej: Lanzamiento Q4..."
                                        value={newProjectName}
                                        onChange={e => setNewProjectName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                                <button
                                    onClick={() => { handleNewProject(newProjectName); setIsNewProjectModalOpen(false); setNewProjectName(''); }}
                                    disabled={!newProjectName.trim()}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100"
                                >
                                    CREAR PROYECTO
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
