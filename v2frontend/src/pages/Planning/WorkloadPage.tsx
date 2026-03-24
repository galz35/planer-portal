import React, { useEffect, useMemo, useState } from 'react';
import { clarityService } from '../../services/clarity.service';
import type { Tarea, Usuario } from '../../types/modelos';
import { useAuth } from '../../context/AuthContext';
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
import { ChevronLeft, ChevronRight, Search, Briefcase, Zap, Filter, LayoutList, Calendar as CalendarIcon } from 'lucide-react';
import { useSecureHTML } from '../../hooks/useSecureHTML';
// Extensión de Usuario para incluir estadísticas de carga
interface WorkloadUser extends Usuario {
    tareasActivas?: number;
    tareasCompletadas?: number;
}

export const WorkloadPage: React.FC = () => {
    const { user } = useAuth();
    const { sanitize } = useSecureHTML();

    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Lunes
    const [tasks, setTasks] = useState<Tarea[]>([]);
    const [team, setTeam] = useState<WorkloadUser[]>([]);
    const [agenda, setAgenda] = useState<{ idTarea: number, fecha: string, usuarioCarnet: string }[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTask, setSelectedTask] = useState<Tarea | null>(null);
    const [viewType, setViewType] = useState<'project' | 'operative'>('project');
    const [filterTerm, setFilterTerm] = useState('');

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await clarityService.getWorkload(
                    weekStart.toISOString(),
                    endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString()
                );
                if (data) {
                    setTeam(data.users || []);
                    setTasks(data.tasks || []);
                    setAgenda(data.agenda || []);
                }
            } catch (e) {
                console.error('[WorkloadPage] Error:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user, weekStart]);

    const getTasksForUserAndDay = (usuario: WorkloadUser, date: Date) => {
        const userCarnet = usuario.carnet;

        return tasks.filter(t => {
            // Filtrado por Carnet asignado
            const isAssigned = (t as any).usuarioCarnet === userCarnet;
            if (!isAssigned) return false;

            // PRIORITY: Si está en la agenda de hoy, lo mostramos SIEMPRE
            const onAgenda = agenda.some(a =>
                a.idTarea === t.idTarea &&
                a.usuarioCarnet === userCarnet &&
                isSameDay(new Date(a.fecha), date)
            );

            if (onAgenda) return true;

            // Filtro de vista (Proyecto vs Operativo)
            if (viewType === 'project' && !t.idProyecto) return false;
            if (viewType === 'operative' && t.idProyecto) return false;

            const start = t.fechaInicioPlanificada ? new Date(t.fechaInicioPlanificada) : null;
            const end = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;

            // ✅ Tareas operativas SIN fechas: mostrar en el día actual
            if (!start && !end) {
                if (viewType === 'operative' && t.estado !== 'Hecha' && t.estado !== 'Descartada') {
                    return isSameDay(date, new Date());
                }
                return false;
            }

            if (!start && end) return isSameDay(date, end);
            if (start && !end) return isSameDay(date, start);

            const checkDate = new Date(date).setHours(0, 0, 0, 0);
            const startDate = new Date(start!).setHours(0, 0, 0, 0);
            const endDate = new Date(end!).setHours(0, 0, 0, 0);
            return checkDate >= startDate && checkDate <= endDate;
        });
    };

    const filteredUsers = useMemo(() => {
        const term = filterTerm.trim().toLowerCase();
        if (!term) return team;
        return team.filter(u =>
            (u.nombre || '').toLowerCase().includes(term) ||
            (u.rol?.nombre || '').toLowerCase().includes(term) ||
            (u.carnet || '').toLowerCase().includes(term)
        );
    }, [team, filterTerm]);

    // AGRUPAR POR SUBGERENCIA (Usando el campo que el backend mapea en rol.nombre)
    const groupedUsers = useMemo(() => {
        const map: Record<string, WorkloadUser[]> = {};
        filteredUsers.forEach(u => {
            const group = u.rol?.nombre || 'General';
            (map[group] ||= []).push(u);
        });
        return map;
    }, [filteredUsers]);

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const toggleGroup = (group: string) => setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));

    return (
        <div className="bg-slate-50 h-screen max-w-full flex flex-col font-sans overflow-hidden">
            {/* HEADER MINIMALISTA */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 z-40 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                        <LayoutList size={22} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight">Carga Laboral</h1>
                        <div className="flex items-center gap-2 text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                            <span>{format(weekStart, 'MMMM yyyy', { locale: es })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {/* SWITCH DE VISTA */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                        <button
                            onClick={() => setViewType('project')}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewType === 'project' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Briefcase size={14} /> Proyectos
                        </button>
                        <button
                            onClick={() => setViewType('operative')}
                            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewType === 'operative' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Zap size={14} /> Operativo
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-300 hidden md:block"></div>

                    {/* BUSCADOR */}
                    <div className="relative w-full lg:w-64 group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-500 rounded-xl text-xs font-bold outline-none transition-all shadow-inner focus:shadow-indigo-50"
                            value={filterTerm}
                            onChange={e => setFilterTerm(e.target.value)}
                        />
                    </div>

                    {/* NAVEGACIÓN SEMANAL Y CALENDARIO */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all uppercase tracking-widest shadow-sm"
                            title="Ir a hoy"
                        >
                            Hoy
                        </button>

                        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm group">
                            <button onClick={() => setWeekStart(d => subWeeks(d, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                <ChevronLeft size={18} />
                            </button>

                            <div
                                className="relative flex items-center cursor-pointer"
                                onClick={() => {
                                    const el = document.getElementById('workload-date-picker') as any;
                                    if (el && el.showPicker) el.showPicker();
                                }}
                            >
                                <input
                                    id="workload-date-picker"
                                    type="date"
                                    className="absolute inset-0 opacity-0 pointer-events-none"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) setWeekStart(startOfWeek(new Date(val + 'T00:00:00'), { weekStartsOn: 1 }));
                                    }}
                                />
                                <span className="text-[10px] font-black text-slate-600 uppercase px-3 text-center min-w-[140px] flex items-center justify-center gap-2 group-hover:text-indigo-600 transition-colors">
                                    <CalendarIcon size={14} className="text-slate-400 group-hover:text-indigo-500" />
                                    {format(weekStart, 'd MMM', { locale: es })} - {format(weekEnd, 'd MMM', { locale: es })}
                                </span>
                            </div>

                            <button onClick={() => setWeekStart(d => addWeeks(d, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors">
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ÁREA PRINCIPAL CON SCROLL INTERNO */}
            <div className="flex-1 w-full overflow-hidden bg-white">
                <div className="h-full w-full overflow-auto p-4 lg:p-6 lg:pt-0">
                    <div className="min-w-[1200px]">
                        {/* CABECERA DE DÍAS (Sticky) */}
                        <div className="flex border-b border-slate-100 bg-white sticky top-0 z-30">
                            <div className="w-[300px] p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 sticky left-0 bg-white z-40 flex items-center gap-2">
                                <Filter size={12} className="text-slate-300" />
                                Subgerencia / Colaborador
                            </div>
                            {days.map(d => {
                                const today = isSameDay(d, new Date());
                                const weekend = isWeekend(d);
                                return (
                                    <div key={d.toISOString()} className={`flex-1 p-4 text-center border-r border-slate-100 last:border-0 relative ${weekend ? 'bg-slate-50/50' : ''}`}>
                                        {today && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                                        <div className={`text-[10px] font-black uppercase transition-colors ${today ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {format(d, 'EEEE', { locale: es })}
                                        </div>
                                        <div className={`text-lg font-black mt-0.5 ${today ? 'text-indigo-600' : 'text-slate-800'}`}>
                                            {format(d, 'd')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* CUERPO AGRUPADO */}
                        <div className="divide-y divide-slate-100 pb-10">
                            {loading ? (
                                <div className="p-32 text-center flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando equipo...</span>
                                </div>
                            ) : Object.keys(groupedUsers).sort().map(groupName => {
                                const isCollapsed = collapsedGroups[groupName];
                                return (
                                    <div key={groupName} className="relative">
                                        {/* ENCABEZADO DE SUBGERENCIA */}
                                        <button
                                            onClick={() => toggleGroup(groupName)}
                                            className="w-full flex items-center gap-3 px-6 py-3.5 bg-slate-50/70 hover:bg-slate-100/90 text-[10px] font-black text-indigo-900 border-y border-slate-100 sticky left-0 z-20 transition-all uppercase tracking-widest"
                                        >
                                            <div className={`p-1 rounded bg-white shadow-sm transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
                                                <ChevronRight size={12} />
                                            </div>
                                            {groupName}
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] border border-indigo-200">{groupedUsers[groupName].length}</span>
                                        </button>

                                        {!isCollapsed && groupedUsers[groupName].map(member => (
                                            <div key={member.idUsuario} className="flex hover:bg-slate-50/30 transition-all min-h-[90px] group/row border-b border-slate-50 last:border-0">
                                                {/* TARJETA COLABORADOR (Sticky) */}
                                                <div className="w-[300px] p-4 border-r border-slate-100 shrink-0 sticky left-0 bg-white z-10 flex items-center gap-4 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.02)] group-hover/row:bg-slate-50 transition-colors">
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black text-xs border border-white shadow-sm ring-2 ring-slate-100 transition-transform group-hover/row:scale-105">
                                                        {(member.nombre || 'E').substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-slate-800 truncate leading-tight mb-1 group-hover/row:text-indigo-700 transition-colors">
                                                            {member.nombre}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase truncate">ID: {member.carnet || member.idUsuario}</span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase">{member.tareasCompletadas || 0} OK</span>
                                                            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${(member.tareasActivas || 0) > 10 ? 'bg-red-100 text-red-700' :
                                                                    (member.tareasActivas || 0) > 5 ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                }`}>
                                                                {member.tareasActivas || 0} ACTIVAS
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* CELDA POR DÍA CON BADGES DE TAREA */}
                                                {days.map(day => {
                                                    const dayTasks = getTasksForUserAndDay(member, day);
                                                    const isTodayMark = isSameDay(day, new Date());
                                                    return (
                                                        <div key={day.toISOString()} className={`flex-1 p-2 border-r border-slate-50 last:border-0 flex flex-col gap-2 relative group/cell ${isWeekend(day) ? 'bg-slate-50/20' : ''} ${isTodayMark ? 'bg-indigo-50/10' : ''}`}>
                                                            {dayTasks.map(t => (
                                                                <div
                                                                    key={t.idTarea}
                                                                    onClick={() => setSelectedTask(t)}
                                                                    className={`text-[10px] px-3 py-2 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.03] hover:shadow-xl hover:z-30 flex flex-col justify-between ${t.prioridad === 'Alta'
                                                                        ? 'bg-rose-50 border-rose-100 text-rose-800 font-bold shadow-sm shadow-rose-100/50'
                                                                        : t.estado === 'Hecha'
                                                                            ? 'bg-slate-50 border-slate-200 text-slate-400 line-through font-medium opacity-60'
                                                                            : 'bg-white border-slate-200 text-slate-700 font-bold shadow-sm'
                                                                        }`}
                                                                >
                                                                    <div className="line-clamp-2 leading-tight mb-1">{t.titulo}</div>
                                                                    <div className="flex justify-between items-center mt-1">
                                                                        <span className="text-[8px] opacity-60">#{t.idTarea}</span>
                                                                        {t.idProyecto && <Briefcase size={8} className="text-indigo-400" />}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Hover cell highlight */}
                                                            <div className="absolute inset-0 bg-indigo-500/0 group-hover/cell:bg-indigo-500/[0.02] transition-colors pointer-events-none"></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DE DETALLES PREMIUM REDESIGN */}
            {selectedTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedTask(null)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 relative border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className={`h-2.5 w-full ${selectedTask.prioridad === 'Alta' ? 'bg-rose-500' : 'bg-indigo-600'}`}></div>

                        <div className="p-10 space-y-10">
                            <div className="flex justify-between items-start">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-slate-100 text-[9px] font-black tracking-widest text-slate-500 rounded-lg border border-slate-200 uppercase">ID: {selectedTask.idTarea}</span>
                                        {selectedTask.idProyecto && <span className="px-3 py-1 bg-indigo-50 text-[9px] font-black tracking-widest text-indigo-600 rounded-lg border border-indigo-100 uppercase">Estratégica</span>}
                                    </div>
                                    <h3 className="font-black text-2xl text-slate-800 leading-tight tracking-tight">{selectedTask.titulo}</h3>
                                </div>
                                <button onClick={() => setSelectedTask(null)} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all font-bold">✕</button>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${selectedTask.estado === 'Hecha' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-amber-500'}`}></div>
                                        <span className="text-sm font-black text-slate-700 uppercase">{selectedTask.estado}</span>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col gap-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridad</label>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${selectedTask.prioridad === 'Alta' ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-blue-500'}`}></div>
                                        <span className="text-sm font-black text-slate-700 uppercase">{selectedTask.prioridad || 'Media'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones / Detalles</label>
                                <div
                                    className="text-slate-600 text-sm leading-relaxed bg-slate-50/50 p-7 rounded-[2rem] border border-slate-100 min-h-[120px] font-medium"
                                    dangerouslySetInnerHTML={sanitize(selectedTask.descripcion || 'No se registraron detalles específicos para esta asignación.')}
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                                >
                                    Continuar
                                </button>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
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
