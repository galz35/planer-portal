import { useState, useEffect, useMemo } from 'react';
import { clarityService } from '../../../services/clarity.service';
import {
    ShieldCheck,
    Database,
    Search,
    ChevronLeft,
    ChevronRight,
    PlusCircle,
    Edit3,
    Trash2,
    LogIn,
    History,
    Filter,
    Calendar,
    ArrowRight,
    User,
    AlertCircle,
    Clock,
    Layout,
    Settings,
    UserCog
} from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for cleaner tailwind classes */
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AuditLog {
    idAuditLog: number;
    idUsuario: number;
    accion: string;
    entidad: string;
    idEntidad: number;
    datosAnteriores: string | null;
    datosNuevos: string | null;
    fecha: string;
    usuario?: { nombre: string; correo: string; };
    ip?: string;
}

export const AuditLogsPage = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [filterAction, setFilterAction] = useState('ALL');
    const [filterEntity, setFilterEntity] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDiffId, setShowDiffId] = useState<number | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [page, filterAction, filterEntity, searchTerm]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (filterAction !== 'ALL') filters.accion = filterAction === 'Crear' ? 'Create' : filterAction === 'Actualizar' ? 'Update' : filterAction === 'Eliminar' ? 'Delete' : filterAction;
            if (filterEntity !== 'ALL') filters.recurso = filterEntity;
            if (searchTerm) filters.query = searchTerm;

            const data = await clarityService.getAuditLogs({ page, limit: 30, ...filters });
            if (data) {
                // Map backend fields to frontend interface
                const mappedLogs = (data.items || []).map((item: any) => ({
                    idAuditLog: item.idAudit || item.idAuditLog,
                    idUsuario: item.idUsuario,
                    accion: item.accion,
                    entidad: item.recurso,
                    idEntidad: item.recursoId,
                    datosAnteriores: item.datosAnteriores,
                    datosNuevos: item.datosNuevos,
                    fecha: item.fecha,
                    usuario: item.usuario,
                    ip: item.ip
                }));
                setLogs(mappedLogs);
                setTotalPages(data.totalPages);
                setTotalItems(data.total);
            }
        } catch (error) {
            console.error('Error fetching audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionConfig = (action: string) => {
        const safeAction = (action || '').toUpperCase();

        // Tareas
        if (safeAction.includes('TAREA_CREADA') || safeAction === 'CREATE') return { color: 'text-emerald-700 bg-emerald-100 border-emerald-200', icon: PlusCircle, label: 'Tarea Creada' };
        if (safeAction.includes('TAREA_ACTUALIZADA') || safeAction === 'UPDATE' || safeAction === 'ACTUALIZARTAREA') return { color: 'text-blue-700 bg-blue-100 border-blue-200', icon: Edit3, label: 'Tarea Editada' };
        if (safeAction.includes('TAREA_ELIMINADA') || safeAction === 'DELETE') return { color: 'text-rose-700 bg-rose-100 border-rose-200', icon: Trash2, label: 'Tarea Eliminada' };
        if (safeAction.includes('TAREA_COMPLETADA')) return { color: 'text-emerald-800 bg-emerald-200 border-emerald-300', icon: ShieldCheck, label: 'Tarea Completada' };

        // Usuarios & Acceso
        if (safeAction.includes('LOGIN')) return { color: 'text-amber-700 bg-amber-100 border-amber-200', icon: LogIn, label: 'Inicio de Sesión' };
        if (safeAction.includes('LOGOUT')) return { color: 'text-slate-700 bg-slate-100 border-slate-200', icon: LogIn, label: 'Cierre de Sesión' };

        // Bloqueos
        if (safeAction.includes('BLOQUEO_CREADO')) return { color: 'text-rose-800 bg-rose-200 border-rose-300', icon: AlertCircle, label: 'Bloqueo Reportado' };
        if (safeAction.includes('BLOQUEO_RESUELTO')) return { color: 'text-emerald-700 bg-emerald-50 border-emerald-100', icon: ShieldCheck, label: 'Bloqueo Resuelto' };

        // Fallback checks for common terms
        if (safeAction.includes('CREATE') || safeAction.includes('CREADO')) return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: PlusCircle, label: 'Creación' };
        if (safeAction.includes('UPDATE') || safeAction.includes('ACTUALIZADO') || safeAction.includes('EDIT')) return { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Edit3, label: 'Modificación' };
        if (safeAction.includes('DELETE') || safeAction.includes('ELIMINADO')) return { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: Trash2, label: 'Eliminación' };

        return { color: 'text-slate-500 bg-slate-50 border-slate-100', icon: Database, label: action || 'Evento' };
    };

    const getEntityIcon = (entity: string) => {
        const safeEntity = (entity || '').toLowerCase();
        switch (safeEntity) {
            case 'tarea': return <History size={14} />;
            case 'proyecto': return <Layout size={14} />;
            case 'usuario': return <User size={14} />;
            case 'rol': return <UserCog size={14} />;
            case 'config': return <Settings size={14} />;
            default: return <Database size={14} />;
        }
    };

    const parseJSON = (str: string | null) => {
        if (!str) return null;
        try { return JSON.parse(str); } catch { return null; }
    };

    // Calculate Diffs
    const getChanges = (prev: string | null, next: string | null) => {
        const oldObj = parseJSON(prev) || {};
        const newObj = parseJSON(next) || {};
        const changes: { field: string; from: any; to: any }[] = [];

        // format: { diff: { field: { from, to } } } - Optimized for new logs
        if (newObj.diff) {
            Object.entries(newObj.diff).forEach(([field, val]: [string, any]) => {
                changes.push({ field, from: val.from, to: val.to });
            });
            return changes;
        }

        // format: { cambios: ["Estado: Pendiente -> EnCurso", ...] } - Support for legacy
        if (Array.isArray(newObj.cambios)) {
            newObj.cambios.forEach((c: string, idx: number) => {
                changes.push({ field: `Cambio #${idx + 1}`, from: null, to: c });
            });
            return changes;
        }

        const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
        allKeys.forEach(key => {
            if (['idAuditLog', 'idAudit', 'fecha', 'idUsuario', 'actualizadoEn', 'pais', 'detalles'].includes(key)) return;
            if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                changes.push({ field: key, from: oldObj[key], to: newObj[key] });
            }
        });
        return changes;
    };

    const renderValue = (val: any) => {
        if (val === null || val === undefined) return <span className="text-slate-300 italic">null</span>;
        if (typeof val === 'boolean') return val ? 'Sí' : 'No';
        if (typeof val === 'object') return 'Omitido';
        return String(val);
    };

    // Group logs by date
    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: AuditLog[] } = {};
        logs.forEach(log => {
            const date = startOfDay(new Date(log.fecha)).toISOString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [logs]);

    const formatGroupDate = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return 'Hoy';
        if (isYesterday(date)) return 'Ayer';
        return format(date, "EEEE, d 'de' MMMM", { locale: es });
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Top Navigation / Progress */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden ring-4 ring-slate-100">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 tracking-tight">Historial de Cambios</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Registros Protegidos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Estado Global</span>
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Protegido
                            </span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-20"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold font-mono px-3 text-slate-600">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-20"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Filters Sidebar */}
                <aside className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6 sticky top-24">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Search size={14} /> Búsqueda Rápida
                            </h3>
                            <div className="relative group">
                                <Search className="absolute left-3 top-3 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="ID, Usuario, Entidad..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all text-slate-700 placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Filter size={14} /> Acciones
                            </h3>
                            <div className="flex flex-col gap-1">
                                {['ALL', 'Crear', 'Actualizar', 'Eliminar', 'Login'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilterAction(f)}
                                        className={cn(
                                            "flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                                            filterAction === f
                                                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                                                : "text-slate-500 hover:bg-slate-50"
                                        )}
                                    >
                                        {f === 'ALL' ? 'Todos los eventos' : f}
                                        {filterAction === f && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Database size={14} /> Categorías
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['ALL', 'Tarea', 'Proyecto', 'Usuario', 'Rol'].map(e => (
                                    <button
                                        key={e}
                                        onClick={() => setFilterEntity(e)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border",
                                            filterEntity === e
                                                ? "bg-white border-slate-900 text-slate-900 ring-2 ring-slate-900/5"
                                                : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300"
                                        )}
                                    >
                                        {e === 'ALL' ? 'Todas' : e}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-900 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 text-white transform group-hover:scale-110 transition-transform">
                                <ShieldCheck size={64} />
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase leading-none mb-1">Total de Cambios</p>
                            <p className="text-3xl font-black text-white leading-none">{totalItems.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1 font-bold">
                                <Clock size={10} /> Auto-refresco en 1m
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Content Timeline */}
                <main className="lg:col-span-9 space-y-8">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-12 h-12 rounded-2xl border-4 border-slate-100 border-t-slate-900 animate-spin" />
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando historial...</p>
                        </div>
                    )}

                    {!loading && groupedLogs.map(([date, group]) => (
                        <section key={date} className="space-y-4">
                            <div className="flex items-center gap-4 sticky top-20 z-20">
                                <div className="px-5 py-2 bg-white rounded-full shadow-sm border border-slate-200 text-xs font-black text-slate-900 flex items-center gap-2">
                                    <Calendar size={14} className="text-slate-400" />
                                    {formatGroupDate(date)}
                                </div>
                                <div className="h-px bg-slate-200 flex-1" />
                            </div>

                            <div className="space-y-4 pl-4 border-l-2 border-slate-100 ml-4">
                                {group.map((log) => {
                                    const config = getActionConfig(log.accion);
                                    const changes = getChanges(log.datosAnteriores, log.datosNuevos);
                                    const isOpen = showDiffId === log.idAuditLog;

                                    return (
                                        <div key={log.idAuditLog} className="relative group/item animate-fade-in pl-8 pb-4">
                                            {/* Timeline Bullet */}
                                            <div className={cn(
                                                "absolute left-[-9px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white ring-2 transition-all z-10",
                                                config.color.split(' ')[0] === 'text-emerald-600' ? "bg-emerald-500 ring-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.3)]" :
                                                    config.color.split(' ')[0] === 'text-blue-600' ? "bg-blue-500 ring-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.3)]" :
                                                        config.color.split(' ')[0] === 'text-rose-600' ? "bg-rose-500 ring-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.3)]" :
                                                            "bg-slate-400 ring-slate-100"
                                            )} />

                                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 group-hover/item:border-slate-300 transition-all hover:shadow-md">
                                                <div className="flex flex-col md:flex-row gap-4">

                                                    {/* Badge & Info */}
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", config.color)}>
                                                                        {config.label}
                                                                    </span>
                                                                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                                        {getEntityIcon(log.entidad)} {log.entidad} Ref: #{log.idEntidad}
                                                                        {(() => {
                                                                            const details = parseJSON(log.datosNuevos);
                                                                            return details?.titulo ? ` - ${details.titulo}` : '';
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                                                                        {log.usuario?.nombre?.substring(0, 1) || 'S'}
                                                                    </div>
                                                                    <p className="text-sm font-bold text-slate-800">
                                                                        {log.usuario?.nombre || 'Sistema de Automatización'}
                                                                        <span className="text-[10px] text-slate-400 font-normal ml-2">{log.usuario?.correo}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[11px] font-black text-slate-900 leading-none">{format(new Date(log.fecha), "HH:mm:ss")}</div>
                                                                <div className="text-[9px] text-slate-400 font-mono mt-1 flex items-center justify-end gap-1">
                                                                    <ShieldCheck size={8} /> {log.ip || 'Local/Internal'}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Summary Content */}
                                                        {changes.length > 0 ? (
                                                            <div className="pt-2">
                                                                <button
                                                                    onClick={() => setShowDiffId(isOpen ? null : log.idAuditLog)}
                                                                    className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                                                                >
                                                                    {isOpen ? <Clock size={14} className="text-slate-400" /> : <PlusCircle size={14} className="text-slate-400" />}
                                                                    {changes.length} {changes.length === 1 ? 'campo modificado' : 'campos modificados'}
                                                                </button>

                                                                {isOpen && (
                                                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 transition-all animate-fade-in">
                                                                        <table className="w-full text-left text-[11px] bg-slate-50/50">
                                                                            <thead className="bg-slate-100/50 text-slate-500 uppercase font-black tracking-tighter">
                                                                                <tr>
                                                                                    <th className="px-4 py-2 border-b border-slate-100 w-1/4">Información</th>
                                                                                    <th className="px-4 py-2 border-b border-slate-100">Antes</th>
                                                                                    <th className="w-8 border-b border-slate-100"></th>
                                                                                    <th className="px-4 py-2 border-b border-slate-100">Después</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-slate-100">
                                                                                {changes.map((c, i) => (
                                                                                    <tr key={i} className="hover:bg-white transition-colors">
                                                                                        <td className="px-4 py-3 font-black text-slate-400 uppercase tracking-tighter">{c.field}</td>
                                                                                        {c.from !== null ? (
                                                                                            <>
                                                                                                <td className="px-4 py-3 text-rose-500 font-medium line-through decoration-rose-200">{renderValue(c.from)}</td>
                                                                                                <td className="text-slate-300"><ArrowRight size={10} /></td>
                                                                                            </>
                                                                                        ) : (
                                                                                            <td colSpan={2} className="px-4 py-3 text-slate-300 italic">Resumen de cambio</td>
                                                                                        )}
                                                                                        <td className="px-4 py-3 text-emerald-600 font-bold bg-emerald-50/30 font-mono">{renderValue(c.to)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400 italic font-medium">
                                                                <AlertCircle size={12} /> Registro técnico de {config.label.toLowerCase()} sin matriz de cambios.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}

                    {!loading && logs.length === 0 && (
                        <div className="bg-white rounded-3xl p-20 text-center border border-slate-200 overflow-hidden relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] transform scale-[5]">
                                <ShieldCheck size={200} />
                            </div>
                            <Database className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-lg font-black text-slate-900">Bóveda Vacía</h3>
                            <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">No se encontraron registros de auditoría que coincidan con tus filtros actuales.</p>
                            <button
                                onClick={() => { setFilterAction('ALL'); setFilterEntity('ALL'); setSearchTerm(''); }}
                                className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:shadow-xl hover:bg-black transition-all"
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
