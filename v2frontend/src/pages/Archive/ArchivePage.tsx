import React, { useEffect, useState, useCallback } from 'react';
import { clarityService } from '../../services/clarity.service';
import type { Tarea, Usuario } from '../../types/modelos';
import { useAuth } from '../../context/AuthContext';
import {
    Search,
    Copy,
    CheckCircle,
    Archive as ArchiveIcon,
    Users,
    Calendar,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../../context/ToastContext';

interface CloneModalProps {
    task: Tarea;
    onClose: () => void;
    onClone: () => void;
}

const CloneModal: React.FC<CloneModalProps> = ({ task, onClose, onClone }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [newTitle, setNewTitle] = useState(task.titulo);
    const [assigneeId, setAssigneeId] = useState(user?.idUsuario || 0);
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [team, setTeam] = useState<Usuario[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);

    useEffect(() => {
        const loadTeam = async () => {
            setLoadingTeam(true);
            try {
                const data = await clarityService.getWorkload();
                if (data && data.users) {
                    setTeam(data.users);
                }
            } catch (e) {
                console.error("Error loading team members", e);
            } finally {
                setLoadingTeam(false);
            }
        };
        loadTeam();
    }, []);

    const handleClone = async () => {
        try {
            await clarityService.postTareaRapida({
                titulo: newTitle,
                idProyecto: task.idProyecto || 0,
                prioridad: task.prioridad,
                esfuerzo: task.esfuerzo,
                idUsuario: user?.idUsuario || 0,
                idResponsable: assigneeId,
                fechaInicioPlanificada: newDate
            });
            showToast('Tarea clonada exitosamente', 'success');
            onClone();
        } catch (e) {
            showToast('Error al clonar tarea', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <h3 className="font-black text-xl flex items-center gap-3 z-10 tracking-tight">
                        <Copy size={24} /> Clonar Trabajo previo
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors z-10">✕</button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Plantilla Original</span>
                        <p className="font-bold text-slate-700 leading-tight">{task.titulo}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Título de la nueva tarea</label>
                            <input
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all placeholder-slate-300"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Escribe el nombre de la nueva tarea..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Calendar size={12} /> Inicio Planificado
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Users size={12} /> Asignado a
                                </label>
                                <select
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                                    value={assigneeId}
                                    onChange={(e) => setAssigneeId(Number(e.target.value))}
                                    disabled={loadingTeam}
                                >
                                    <option value={user?.idUsuario}>Mí mismo ({user?.nombre ? user.nombre.split(' ')[0] : 'Yo'})</option>
                                    {!loadingTeam && team.filter(m => m.idUsuario !== user?.idUsuario).map(member => (
                                        <option key={member.idUsuario} value={member.idUsuario}>
                                            {member.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button onClick={onClose} className="px-6 py-3 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                        <button onClick={handleClone} className="px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2">
                            PROCESAR CLONACIÓN <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ArchivePage: React.FC = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cloneTask, setCloneTask] = useState<Tarea | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [r1, r2] = await Promise.all([
                clarityService.getMisTareas({ estado: 'Hecha' }),
                clarityService.getMisTareas({ estado: 'Descartada' })
            ]);
            const all = [...(r1 || []), ...(r2 || [])];

            all.sort((a, b) => {
                const dateA = new Date(a.fechaHecha || a.fechaUltActualizacion).getTime();
                const dateB = new Date(b.fechaHecha || b.fechaUltActualizacion).getTime();
                return dateB - dateA;
            });

            setTasks(all);
        } catch (error) {
            showToast("No se pudo sincronizar el historial", "error");
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const filteredTasks = tasks.filter(t =>
        (t.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.proyecto?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-slate-50 min-h-screen p-8 pb-32 font-sans overflow-x-hidden">
            <header className="mb-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-2xl shadow-indigo-100 ring-8 ring-indigo-50">
                        <ArchiveIcon size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Expediente de Tareas</h1>
                        <p className="text-slate-400 font-medium mt-1">Recupera y reutiliza el conocimiento generado en proyectos pasados.</p>
                    </div>
                </div>

                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 w-full md:w-96 group focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                    <div className="pl-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                        <Search size={20} />
                    </div>
                    <input
                        className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder-slate-300 py-2"
                        placeholder="Buscar por título o proyecto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-100 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Desarrollo / Tarea</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proyecto Origen</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estatus Histórico</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Concluido el</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-indigo-600" size={40} />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Archivos...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="max-w-xs mx-auto opacity-30">
                                            <ArchiveIcon size={64} className="mx-auto mb-4 text-slate-300" />
                                            <p className="font-bold text-slate-500">Sin registros históricos coincidentes</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {filteredTasks.map(t => (
                                <tr key={t.idTarea} className="hover:bg-indigo-50/40 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${t.estado === 'Hecha' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <CheckCircle size={16} />
                                            </div>
                                            <span className="font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors uppercase text-sm">{t.titulo}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{t.proyecto?.nombre || 'General'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${t.estado === 'Hecha'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                            {t.estado}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black text-slate-900 uppercase">
                                                {format(new Date(t.fechaHecha || t.fechaUltActualizacion), "d 'de' MMMM", { locale: es })}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                Año {format(new Date(t.fechaHecha || t.fechaUltActualizacion), "yyyy")}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => setCloneTask(t)}
                                            className="inline-flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black text-indigo-600 uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 hover:shadow-lg transition-all active:scale-95"
                                        >
                                            <Copy size={14} /> Reutilizar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {cloneTask && (
                <CloneModal
                    task={cloneTask}
                    onClose={() => setCloneTask(null)}
                    onClone={() => {
                        setCloneTask(null);
                        showToast("Trabajo clonado al tablero pendiente", "success");
                    }}
                />
            )}
        </div>
    );
};

export default ArchivePage;
