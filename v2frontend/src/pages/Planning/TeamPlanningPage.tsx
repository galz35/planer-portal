import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clarityService } from '../../services/clarity.service';

interface Task {
    id: string;
    titulo: string;
    estado: string;
    fechaObjetivo: string;
    prioridad: string;
    proyecto?: string;
}

export const TeamPlanningPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [memberName, setMemberName] = useState('Miembro del Equipo');

    useEffect(() => {
        if (!userId) return;

        const loadData = async () => {
            setLoading(true);
            try {
                const id = Number(userId);
                // Cargar info del miembro
                const user = await clarityService.getEquipoMiembro(id);
                if (user) setMemberName(user.nombre || user.nombreCompleto || 'Usuario');

                // Cargar tareas
                const data = await clarityService.getEquipoMiembroTareas(id);
                if (data) {
                    const mapped: Task[] = (data as any[]).map(t => ({
                        id: String(t.idTarea),
                        titulo: t.nombre || t.titulo,
                        estado: t.estado,
                        fechaObjetivo: t.fechaObjetivo,
                        prioridad: t.prioridad,
                        proyecto: t.proyectoNombre || t.nombreProyecto
                    }));
                    setTasks(mapped);
                }
            } catch (error) {
                console.error('Error loading team member planning:', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userId]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10 font-sans">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors mb-4 text-sm font-medium"
                >
                    <ArrowLeft size={16} className="mr-1" />
                    Volver al Dashboard
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Plan de Trabajo: {memberName}</h1>
                        <p className="text-slate-500 mt-2">Visión detallada de asignaciones y progreso</p>
                    </div>
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-bold text-slate-700">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</div>
                        <div className="text-xs text-slate-400">Semana en curso</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* KPI Cards */}
                    <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pendientes</p>
                                <p className="text-3xl font-black text-slate-800 mt-1">{tasks.filter(t => t.estado !== 'Completada').length}</p>
                            </div>
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Clock size={24} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Atrasadas</p>
                                <p className="text-3xl font-black text-rose-600 mt-1">0</p>
                            </div>
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                                <AlertCircle size={24} />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Completadas</p>
                                <p className="text-3xl font-black text-emerald-600 mt-1">{tasks.filter(t => t.estado === 'Completada').length}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle2 size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">Tareas Asignadas</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <div key={task.id} className="p-5 hover:bg-slate-50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 ${task.estado === 'Completada' ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {task.estado === 'Completada' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-slate-800 text-lg group-hover:text-indigo-700 transition-colors ${task.estado === 'Completada' ? 'line-through text-slate-400' : ''}`}>
                                                    {task.titulo}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-medium mt-1">{task.proyecto || 'General'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold 
                                    ${task.prioridad === 'Alta' ? 'bg-rose-100 text-rose-700' :
                                                task.prioridad === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {task.prioridad}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 pl-8 mt-3">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                            <Calendar size={14} />
                                            {format(new Date(task.fechaObjetivo), 'dd MMM yyyy', { locale: es })}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                            <span className={`w-2 h-2 rounded-full ${task.estado === 'Completada' ? 'bg-emerald-500' : task.estado === 'En Progreso' ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                                            {task.estado}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sidebar / Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Detalles del Miembro</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ID Usuario</p>
                                    <p className="text-sm font-medium text-slate-800 font-mono bg-slate-50 p-2 rounded border border-slate-100">{userId}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Rol</p>
                                    <p className="text-sm font-medium text-slate-800">Colaborador</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Estado</p>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                        Activo
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
