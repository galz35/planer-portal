
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, User, ArrowRight, Activity, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { clarityService } from '../../services/clarity.service';

interface TimelineItem {
    idAudit: number;
    fecha: string;
    usuario: string;
    tareaTitulo?: string;
    accion: string;
    recurso: string;
    recursoId: string;
    datosNuevos: string | null;
    datosAnteriores: string | null;
}

export const ProjectHistoryPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [projectTitle, setProjectTitle] = useState('Cargando...');
    const [selectedLog, setSelectedLog] = useState<TimelineItem | null>(null);

    useEffect(() => {
        if (!id) return;
        fetchLogs(1);
        fetchProjectInfo();
    }, [id]);

    const fetchProjectInfo = async () => {
        try {
            const p = await clarityService.getProyecto(Number(id));
            if (p) setProjectTitle(p.nombre);
        } catch (error) {
            console.error('Error fetching project info:', error);
            setProjectTitle('Proyecto Desconocido');
        }
    };

    const fetchLogs = async (p: number) => {
        if (!id) return;
        setLoading(true);
        try {
            const res: any = await clarityService.getProyectoHistorial(Number(id), p, 50);
            setLogs(res.items || []);
            setTotalPages(res.totalPages || 1);
            setPage(p);
        } catch (error) {
            console.error('Error fetching timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const parseDiff = (item: TimelineItem) => {
        try {
            if (!item.datosNuevos) return null;
            const nuevo = JSON.parse(item.datosNuevos);
            const diff = nuevo.diff || nuevo;
            const keys = Object.keys(diff).filter(k => !['id', 'fecha', 'source', 'updates'].includes(k));

            if (keys.length === 0) return <div className="text-slate-400 italic text-sm">Sin detalles adicionales</div>;

            return (
                <div className="space-y-3">
                    {keys.map(key => {
                        const val = diff[key];
                        const formatValue = (v: any) => {
                            if (v === null || v === undefined || String(v).toLowerCase() === 'null') return '';
                            return String(v);
                        };

                        const isDiffObj = val && typeof val === 'object' && 'from' in val && 'to' in val;
                        const oldValue = formatValue(isDiffObj ? val.from : '');
                        const newValue = formatValue(isDiffObj ? val.to : val);

                        return (
                            <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{key.replace(/_/g, ' ')}</div>
                                <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                    <div className="text-sm text-slate-500 break-words bg-white p-2 rounded border border-slate-100 min-h-[2rem]">
                                        {oldValue}
                                    </div>
                                    <ArrowRight size={16} className="text-slate-300" />
                                    <div className="text-sm font-bold text-slate-800 break-words bg-emerald-50 p-2 rounded border border-emerald-100 min-h-[2rem]">
                                        {newValue}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            );
        } catch {
            return <div className="text-rose-500 text-sm">Error al procesar datos del cambio.</div>;
        }
    };

    const getActionBadge = (accion: string) => {
        const a = accion.toLowerCase();
        let color = 'bg-slate-100 text-slate-600';
        if (a.includes('cread')) color = 'bg-emerald-100 text-emerald-700';
        if (a.includes('elimin')) color = 'bg-rose-100 text-rose-700';
        if (a.includes('edit')) color = 'bg-indigo-100 text-indigo-700';
        if (a.includes('completad') || a.includes('hecha')) color = 'bg-sky-100 text-sky-700';

        return (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${color}`}>
                {accion.replace(/_/g, ' ')}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Historial de Cambios</h1>
                        <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Activity size={12} /> {projectTitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 p-6 overflow-auto">
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Cargando datos...</div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500 italic">No hay registros de actividad para este proyecto.</p>
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 font-bold text-slate-600 w-40">Fecha</th>
                                    <th className="px-6 py-3 font-bold text-slate-600 w-48">Usuario</th>
                                    <th className="px-6 py-3 font-bold text-slate-600 w-32">Acción</th>
                                    <th className="px-6 py-3 font-bold text-slate-600">Elemento Afectado</th>
                                    <th className="px-6 py-3 font-bold text-slate-600 w-24 text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs.map((log) => (
                                    <tr key={log.idAudit} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-3 text-slate-600 font-medium">
                                            {format(new Date(log.fecha), 'dd/MM/yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-2">
                                                
                                                <span className="text-slate-700 font-medium truncate max-w-[150px]" title={log.usuario}>{log.usuario}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            {getActionBadge(log.accion)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 font-medium truncate max-w-[300px]" title={log.tareaTitulo || log.recursoId}>
                                                    {log.tareaTitulo || `ID #${log.recursoId}`}
                                                </span>
                                                <span className="text-xs text-slate-400 capitalize">{log.recurso.toLowerCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-xs font-bold whitespace-nowrap"
                                            >
                                                Ver detalle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center mt-6 gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => fetchLogs(page - 1)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
                        >
                            Anterior
                        </button>
                        <span className="px-4 py-2 text-sm text-slate-500">
                            Página {page} de {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => fetchLogs(page + 1)}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg">Detalle del Cambio</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Meta Info Header */}
                            <div className="flex items-center gap-4 mb-6 text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    <span>{format(new Date(selectedLog.fecha), 'PPP - HH:mm', { locale: es })}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-300" />
                                <div className="flex items-center gap-2">
                                    <User size={14} />
                                    <span>{selectedLog.usuario}</span>
                                </div>
                                <div className="h-4 w-px bg-slate-300" />
                                <div>{getActionBadge(selectedLog.accion)}</div>
                            </div>

                            <div className="mb-4">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contexto</h4>
                                <div className="text-slate-800 font-medium text-lg">
                                    {selectedLog.tareaTitulo || `Elemento ${selectedLog.recursoId}`}
                                </div>
                                <div className="text-slate-400 text-sm">{selectedLog.recurso}</div>
                            </div>

                            <div className="border-t border-slate-100 pt-4">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Activity size={16} className="text-indigo-500" />
                                    Cambios Realizados
                                </h4>
                                {parseDiff(selectedLog)}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 hover:text-indigo-600 transition-all text-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectHistoryPage;
