import { useEffect, useState, useMemo } from 'react';
import { clarityService } from '../../services/clarity.service';
import {
    Terminal, RefreshCw, AlertTriangle, Search, History,
    User, FileText, CheckCircle, XCircle,
    Activity, Users, Clock, ArrowRight, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface LogSistema {
    idLog: number;
    nivel: string;
    origen: string;
    mensaje: string;
    fecha: string;
    stack?: string;
}

interface AuditLog {
    idAudit?: number;
    idAuditLog?: number;
    idUsuario: number;
    accion?: string;
    entidad?: string;
    recurso?: string;
    recursoId?: string;
    idEntidad?: number;
    detalles?: string;
    datosAnteriores?: string | null;
    datosNuevos?: string | null;
    ip?: string;
    fecha: string;
    usuario?: { correo: string };
}

type TabType = 'actividad' | 'sistema' | 'errores';

export const LogsPage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('actividad');
    const [logs, setLogs] = useState<LogSistema[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLog, setExpandedLog] = useState<number | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [logsRes, auditRes] = await Promise.all([
                clarityService.getLogs(1, 200),
                clarityService.getAuditLogs({ page: 1, limit: 200 }),
            ]);
            setLogs(logsRes?.items || []);
            setAuditLogs(auditRes?.items || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.rolGlobal !== 'Admin') {
            navigate('/app/hoy');
        } else {
            fetchData();
        }
    }, [user, navigate]);

    // Estadísticas
    const stats = useMemo(() => {
        const errors = logs.filter(l => l.nivel === 'Error').length;
        const warns = logs.filter(l => l.nivel === 'Warn').length;
        const totalActividades = auditLogs.length;

        // Agrupar por acción
        const accionesPorTipo: Record<string, number> = {};
        auditLogs.forEach(log => {
            const accion = log.accion || log.entidad || 'Sin acción';
            accionesPorTipo[accion] = (accionesPorTipo[accion] || 0) + 1;
        });

        return { errors, warns, totalActividades, accionesPorTipo };
    }, [logs, auditLogs]);

    // Filtrar según tab activo
    const filteredData = useMemo(() => {
        if (activeTab === 'actividad') {
            return auditLogs.filter(log => {
                const accion = (log.accion || log.entidad || '').toLowerCase();
                const recurso = (log.recurso || '').toLowerCase();
                const correo = (log.usuario?.correo || '').toLowerCase();
                return accion.includes(searchTerm.toLowerCase()) ||
                    recurso.includes(searchTerm.toLowerCase()) ||
                    correo.includes(searchTerm.toLowerCase());
            });
        }
        if (activeTab === 'errores') {
            return logs.filter(log =>
                log.nivel === 'Error' &&
                ((log.mensaje || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.origen || '').toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }
        return logs.filter(log =>
            (log.mensaje || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.origen || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeTab, logs, auditLogs, searchTerm]);

    // Formatear acción para mostrar
    const formatAccion = (accion: string) => {
        const mapeo: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
            'TAREA_CREADA': { icon: <FileText size={14} />, color: 'text-green-600 bg-green-50', label: 'Nueva Tarea' },
            'TAREA_ACTUALIZADA': { icon: <FileText size={14} />, color: 'text-blue-600 bg-blue-50', label: 'Tarea Editada' },
            'TAREA_COMPLETADA': { icon: <CheckCircle size={14} />, color: 'text-emerald-600 bg-emerald-50', label: 'Tarea Completada' },
            'TAREA_ASIGNADA': { icon: <User size={14} />, color: 'text-indigo-600 bg-indigo-50', label: 'Tarea Asignada' },
            'TAREA_REASIGNADA': { icon: <Users size={14} />, color: 'text-purple-600 bg-purple-50', label: 'Reasignación' },
            'CHECKIN_CREADO': { icon: <Activity size={14} />, color: 'text-cyan-600 bg-cyan-50', label: 'Check-in' },
            'PROYECTO_CREADO': { icon: <FileText size={14} />, color: 'text-amber-600 bg-amber-50', label: 'Nuevo Proyecto' },
            'BLOQUEO_CREADO': { icon: <XCircle size={14} />, color: 'text-red-600 bg-red-50', label: 'Bloqueo Reportado' },
            'BLOQUEO_RESUELTO': { icon: <CheckCircle size={14} />, color: 'text-green-600 bg-green-50', label: 'Bloqueo Resuelto' },
            'USUARIO_LOGIN': { icon: <User size={14} />, color: 'text-slate-600 bg-slate-50', label: 'Inicio Sesión' },
        };
        return mapeo[accion] || { icon: <Activity size={14} />, color: 'text-slate-600 bg-slate-50', label: accion.replace(/_/g, ' ') };
    };

    const tabs = [
        { id: 'actividad' as TabType, label: 'Actividad', icon: <History size={16} />, badge: stats.totalActividades },
        { id: 'sistema' as TabType, label: 'Sistema', icon: <Terminal size={16} />, badge: logs.length },
        { id: 'errores' as TabType, label: 'Errores', icon: <XCircle size={16} />, badge: stats.errors, badgeColor: 'bg-red-500' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Terminal className="text-indigo-500" size={24} />
                        Centro de Monitoreo
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Seguimiento completo de actividad y errores del sistema
                    </p>
                </div>

                {/* Estadísticas rápidas */}
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
                        <p className="text-xs opacity-80 font-medium">Actividades (24h)</p>
                        <p className="text-2xl font-black">{stats.totalActividades}</p>
                    </div>
                    {stats.errors > 0 && (
                        <div className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl text-white shadow-lg">
                            <p className="text-xs opacity-80 font-medium">Errores</p>
                            <p className="text-2xl font-black">{stats.errors}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs y Búsqueda */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row gap-3 justify-between">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.badge > 0 && (
                                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${tab.badgeColor || 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200'
                                        } ${tab.badgeColor ? 'text-white' : ''}`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Búsqueda y Refresh */}
                    <div className="flex gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:border-indigo-400 font-medium text-slate-700 dark:text-slate-200 transition-all"
                            />
                        </div>
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors border border-slate-200 dark:border-slate-600"
                        >
                            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="space-y-3">
                {loading && (
                    <div className="text-center py-10 text-slate-400 animate-pulse">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                        Cargando registros...
                    </div>
                )}

                {!loading && filteredData.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Terminal className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            {activeTab === 'errores' ? '¡Sin errores! El sistema está funcionando correctamente.' : 'No se encontraron registros'}
                        </p>
                    </div>
                )}

                {!loading && activeTab === 'actividad' && filteredData.length > 0 && (
                    <div className="space-y-2">
                        {(filteredData as AuditLog[]).map((log, idx) => {
                            const accion = log.accion || log.entidad || 'Acción';
                            const accionInfo = formatAccion(accion);
                            let detalles: Record<string, any> = {};
                            try { detalles = (log.detalles || log.datosNuevos) ? JSON.parse(log.detalles || log.datosNuevos || '{}') : {}; } catch { }
                            const logId = log.idAudit || log.idAuditLog || idx;

                            return (
                                <div
                                    key={logId}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icono */}
                                        <div className={`p-2.5 rounded-xl ${accionInfo.color}`}>
                                            {accionInfo.icon}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 dark:text-white text-sm">
                                                    {accionInfo.label}
                                                </span>
                                                {log.recursoId && (
                                                    <>
                                                        <ArrowRight size={12} className="text-slate-300" />
                                                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-medium">
                                                            {log.recurso} #{log.recursoId}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <User size={12} />
                                                    {log.usuario?.correo?.split('@')[0] || `Usuario ${log.idUsuario}`}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {new Date(log.fecha).toLocaleString('es-ES', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                                {log.ip && (
                                                    <span className="text-slate-400">{log.ip}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandir detalles */}
                                        {Object.keys(detalles).length > 0 && (
                                            <button
                                                onClick={() => setExpandedLog(expandedLog === logId ? null : logId)}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Detalles expandidos */}
                                    {expandedLog === logId && Object.keys(detalles).length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto font-mono text-slate-600 dark:text-slate-300">
                                                {JSON.stringify(detalles, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Lista de Logs del Sistema */}
                {!loading && (activeTab === 'sistema' || activeTab === 'errores') && filteredData.length > 0 && (
                    <div className="space-y-2">
                        {(filteredData as LogSistema[]).map(log => (
                            <div
                                key={log.idLog}
                                className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border transition-all group ${log.nivel === 'Error'
                                    ? 'border-red-200 dark:border-red-900/50 hover:shadow-red-100'
                                    : log.nivel === 'Warn'
                                        ? 'border-amber-200 dark:border-amber-900/50'
                                        : 'border-slate-200 dark:border-slate-700'
                                    } hover:shadow-md`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Nivel */}
                                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 ${log.nivel === 'Error'
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        : log.nivel === 'Warn'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {log.nivel === 'Error' && <XCircle size={10} />}
                                        {log.nivel === 'Warn' && <AlertTriangle size={10} />}
                                        {log.nivel}
                                    </div>

                                    {/* Mensaje */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 font-mono break-all">
                                            {log.mensaje}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full font-medium">
                                                {log.origen}
                                            </span>
                                            <span>
                                                {new Date(log.fecha).toLocaleString('es-ES', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        {/* Stack trace si existe */}
                                        {log.stack && (
                                            <details className="mt-2">
                                                <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                                                    Ver stack trace
                                                </summary>
                                                <pre className="mt-2 text-[10px] bg-red-50 dark:bg-red-900/20 p-2 rounded-lg overflow-x-auto font-mono text-red-700 dark:text-red-300 max-h-32 overflow-y-auto">
                                                    {log.stack}
                                                </pre>
                                            </details>
                                        )}
                                    </div>

                                    {/* ID */}
                                    <span className="hidden md:block text-[10px] text-slate-300 dark:text-slate-600 font-mono">
                                        #{log.idLog}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
