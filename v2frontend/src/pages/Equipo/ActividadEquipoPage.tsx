
import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Eye,
    ChevronLeft, ChevronRight,
    History, X
} from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { format } from 'date-fns';

interface AuditLog {
    idAuditLog: number;
    usuario: string;
    accion: string;
    entidad: string;
    datosNuevos: string | null;
    datosAnteriores: string | null;
    fecha: string;
    carnetUsuario?: string;
    recursoId?: string | number;
    tareaTitulo?: string;
    proyectoTitulo?: string;
}

export const ActividadEquipoPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtros Locales (Columnas)
    const [colFilters, setColFilters] = useState({
        usuario: '',
        accion: '',
        entidad: '',
        proyecto: ''
    });

    // Modal state
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [fullDetail, setFullDetail] = useState<any | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Ref para control estricto de ejecución única
    const hasFetched = React.useRef(false);
    const lastPageParams = React.useRef({ page: 1, term: '' });

    const fetchLogs = async (p: number, q: string) => {
        setLoading(true);

        const tm = setTimeout(() => {
            if (loading) setLoading(false);
        }, 8000);

        try {
            console.log('📡 Fetch logs...');
            const response = await clarityService.getEquipoActividad(p, 50, q);
            clearTimeout(tm);

            // Normalización
            let rawItems: any[] = [];
            if (response?.data?.items && Array.isArray(response.data.items)) {
                rawItems = response.data.items;
            } else if (response?.items && Array.isArray(response.items)) {
                rawItems = response.items;
            } else if (Array.isArray(response)) {
                rawItems = response;
            } else if (response?.data && Array.isArray(response.data)) {
                rawItems = response.data;
            }

            if (rawItems.length > 0) {
                const mapped = rawItems.map((item: any) => ({
                    idAuditLog: item.idAuditLog || item.idAudit || item.id,
                    usuario: item.nombreUsuario || item.usuario || 'Desconocido',
                    accion: item.accion,
                    entidad: item.recurso || item.entidad || 'Entidad',
                    datosNuevos: item.datosNuevos,
                    datosAnteriores: item.datosAnteriores,
                    fecha: item.fecha,
                    carnetUsuario: item.carnetUsuario || item.carnet,
                    recursoId: item.recursoId || item.entidadId,
                    tareaTitulo: item.tareaTitulo || item.entidadTitulo, // Fallback
                    proyectoTitulo: item.proyectoTitulo
                }));
                setLogs(mapped);
            } else {
                setLogs([]);
            }

        } catch (err: any) {
            console.error('🔥 Error fetch:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!hasFetched.current || lastPageParams.current.page !== page || lastPageParams.current.term !== searchTerm) {
            fetchLogs(page, searchTerm);
            hasFetched.current = true;
            lastPageParams.current = { page, term: searchTerm };
        }
    }, [page, searchTerm]);

    // Lógica Detalle
    useEffect(() => {
        if (selectedLog) {
            setLoadingDetail(true);
            setFullDetail(null);
            clarityService.getAuditLogDetalle(selectedLog.idAuditLog)
                .then(res => {
                    const data = res.data || res;
                    setFullDetail(data);
                })
                .catch(err => {
                    console.error("Error detalle:", err);
                    setFullDetail({ error: "No se pudo cargar el detalle completo." });
                })
                .finally(() => setLoadingDetail(false));
        }
    }, [selectedLog]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLogs(1, searchTerm);
    };

    // Helper seguro para fechas
    const formatDateSafe = (dateVal: any, fmt: string) => {
        if (!dateVal) return '--';
        try {
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return 'Fecha inválida';
            return format(d, fmt);
        } catch {
            return 'Error fecha';
        }
    };

    // Render Helpers
    const getCambiosResumen = (next: string | null) => {
        try {
            if (!next) return <span className="text-slate-400 italic">--</span>;
            const n = JSON.parse(next);
            const diffObj = n.diff || n;
            const keys = Object.keys(diffObj).filter(k => !['id', 'fecha', 'source', 'updates'].includes(k));
            if (keys.length === 0) return <span className="text-slate-400 italic">Sin cambios visibles</span>;
            const k = keys[0];
            const val = diffObj[k]?.to !== undefined ? diffObj[k].to : diffObj[k];
            return (
                <span className="text-xs">
                    <span className="font-bold text-slate-600">{k}: </span>
                    <span className="text-emerald-600 font-bold">{String(val).substring(0, 20)}</span>
                    {keys.length > 1 && <span className="ml-2 text-[10px] bg-slate-100 px-1 rounded">+{keys.length - 1}</span>}
                </span>
            );
        } catch {
            return <span className="text-indigo-400 text-xs italic pointer-events-none">Ver detalle...</span>;
        }
    };

    const renderDetalleModal = () => {
        if (!selectedLog) return null;

        let content;
        if (loadingDetail) {
            content = <div className="p-10 flex justify-center"><RefreshCw className="animate-spin text-indigo-500" /></div>;
        } else if (fullDetail) {
            let newObj = {}, oldObj = {};
            try { newObj = fullDetail.datosNuevos ? JSON.parse(fullDetail.datosNuevos) : {}; } catch { }
            try { oldObj = fullDetail.datosAnteriores ? JSON.parse(fullDetail.datosAnteriores) : {}; } catch { }
            const diffData = (newObj as any).diff || newObj;

            content = (
                <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg border grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span className="block font-bold text-slate-500 uppercase text-[10px]">Usuario</span>
                            <span className="text-slate-800 font-medium">{fullDetail.nombreUsuario || fullDetail.usuario}</span>
                        </div>
                        <div>
                            <span className="block font-bold text-slate-500 uppercase text-[10px]">Fecha</span>
                            <span className="text-slate-800 font-medium">{formatDateSafe(fullDetail.fecha, 'dd MMM yyyy, HH:mm:ss')}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="block font-bold text-slate-500 uppercase text-[10px]">Recurso</span>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">{fullDetail.entidad} #{fullDetail.entidadId}</span>
                                <span className="text-slate-600">{selectedLog.tareaTitulo || selectedLog.proyectoTitulo}</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-auto max-h-[50vh] border rounded-lg">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600 sticky top-0">
                                    <th className="border-b p-2 text-left w-1/4 font-semibold">Campo</th>
                                    <th className="border-b p-2 text-left w-1/3 font-semibold text-rose-700">Valor Anterior</th>
                                    <th className="border-b p-2 text-left w-1/3 font-semibold text-emerald-700">Valor Nuevo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {Object.keys(diffData).map(key => {
                                    if (['source', 'updates'].includes(key)) return null;
                                    const val = diffData[key];
                                    const isDiffFmt = val && typeof val === 'object' && 'from' in val && 'to' in val;
                                    const before = isDiffFmt ? val.from : (oldObj as any)[key];
                                    const after = isDiffFmt ? val.to : val;
                                    return (
                                        <tr key={key} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-xs font-bold text-slate-700 align-top">{key}</td>
                                            <td className="p-3 text-rose-600 bg-rose-50/20 break-all align-top text-xs">{String(before ?? '')}</td>
                                            <td className="p-3 text-emerald-600 bg-emerald-50/20 break-all align-top text-xs">{String(after ?? '')}</td>
                                        </tr>
                                    );
                                })}
                                {Object.keys(diffData).length === 0 && (
                                    <tr><td colSpan={3} className="p-4 text-center text-slate-400">Sin cambios registrados (posible log solo informativo)</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        } else {
            content = <div className="p-4 text-red-500 bg-red-50 rounded">Error cargando información del servidor.</div>;
        }

        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <History size={20} className="text-indigo-600" />
                            Detalle de Modificación
                        </h3>
                        <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-6 overflow-auto bg-white">
                        {content}
                    </div>
                </div>
            </div>
        );
    };

    // Filtrado local
    const filteredLogs = logs.filter(l => {
        const fUsr = colFilters.usuario.toLowerCase();
        const fAcc = colFilters.accion.toLowerCase();
        const fEnt = colFilters.entidad.toLowerCase();
        const fPro = colFilters.proyecto.toLowerCase();

        return (
            (!fUsr || l.usuario.toLowerCase().includes(fUsr)) &&
            (!fAcc || l.accion.toLowerCase().includes(fAcc)) &&
            (!fEnt || (l.tareaTitulo || '').toLowerCase().includes(fEnt) || l.entidad.toLowerCase().includes(fEnt)) &&
            (!fPro || (l.proyectoTitulo || '').toLowerCase().includes(fPro))
        );
    });

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-indigo-200 shadow-md">
                        <History size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Bitácora de Equipo</h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Transacciones recientes del sistema
                        </p>
                    </div>
                </div>
                <form onSubmit={handleSearch} className="flex gap-2 relative group">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Búsqueda global..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-100 border-transparent border focus:bg-white focus:border-indigo-300 rounded-lg text-sm w-64 outline-none transition-all"
                    />
                    <button type="button" onClick={() => fetchLogs(page, searchTerm)} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4 sm:p-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                    <div className="overflow-auto flex-1">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 w-48">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Fecha / Usuario</div>
                                        <input
                                            placeholder="Filtrar usuario..."
                                            className="text-xs w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-indigo-400 outline-none"
                                            value={colFilters.usuario}
                                            onChange={e => setColFilters({ ...colFilters, usuario: e.target.value })}
                                        />
                                    </th>
                                    <th className="px-6 py-3 w-40">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Acción</div>
                                        <input
                                            placeholder="Filtrar acción..."
                                            className="text-xs w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-indigo-400 outline-none"
                                            value={colFilters.accion}
                                            onChange={e => setColFilters({ ...colFilters, accion: e.target.value })}
                                        />
                                    </th>
                                    <th className="px-6 py-3">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Recurso / Tarea</div>
                                        <input
                                            placeholder="Filtrar tarea..."
                                            className="text-xs w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-indigo-400 outline-none"
                                            value={colFilters.entidad}
                                            onChange={e => setColFilters({ ...colFilters, entidad: e.target.value })}
                                        />
                                    </th>
                                    <th className="px-6 py-3 w-48">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Proyecto</div>
                                        <input
                                            placeholder="Filtrar proyecto..."
                                            className="text-xs w-full bg-white border border-slate-200 rounded px-2 py-1 focus:border-indigo-400 outline-none"
                                            value={colFilters.proyecto}
                                            onChange={e => setColFilters({ ...colFilters, proyecto: e.target.value })}
                                        />
                                    </th>
                                    <th className="px-4 py-3 w-32 text-center">
                                        <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cambios</div>
                                    </th>
                                    <th className="px-4 py-3 w-20"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400">Cargando bitácora...</td></tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic">No se encontraron registros coincidentes</td></tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.idAuditLog} className="hover:bg-indigo-50/40 transition-colors group">
                                            <td className="px-6 py-3 align-top whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{formatDateSafe(log.fecha, 'dd MMM, HH:mm')}</span>
                                                    <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                                                        {log.usuario}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 align-top">
                                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-600 block mb-1">
                                                    {log.accion.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 align-top">
                                                <div className="flex flex-col gap-0.5 max-w-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-600 uppercase">{log.entidad}</span>
                                                        <span className="text-slate-400 text-[10px]">#{log.recursoId}</span>
                                                    </div>
                                                    {log.tareaTitulo ? (
                                                        <span className="text-xs font-semibold text-indigo-700 truncate" title={log.tareaTitulo}>
                                                            {log.tareaTitulo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">--</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 align-top">
                                                {log.proyectoTitulo ? (
                                                    <span className="text-xs font-medium text-slate-600 bg-sky-50 px-2 py-1 rounded-md border border-sky-100 inline-block truncate max-w-[150px]" title={log.proyectoTitulo}>
                                                        {log.proyectoTitulo}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">--</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                {getCambiosResumen(log.datosNuevos)}
                                            </td>
                                            <td className="px-4 py-3 align-middle text-right">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="px-3 py-1.5 min-w-[80px] text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all shadow-sm flex items-center justify-center gap-1 opacity-90 hover:opacity-100"
                                                >
                                                    <Eye size={14} /> Ver
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center shrink-0">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1 text-xs font-medium">
                    <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-xs font-bold text-slate-500">Página {page}</span>
                <button onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 text-xs font-medium">
                    Siguiente <ChevronRight size={16} />
                </button>
            </div>

            {/* Modal */}
            {renderDetalleModal()}
        </div>
    );
};
