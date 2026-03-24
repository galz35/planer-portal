import React, { useEffect, useState, useMemo } from 'react';
import { planningService, type SolicitudCambio } from '../../services/planning.service';
import { CheckCircle, XCircle, Clock, ArrowRight, ShieldAlert, FileText, User } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const ApprovalsPage: React.FC = () => {
    const [requests, setRequests] = useState<SolicitudCambio[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const { showToast } = useToast();

    const loadRequests = async () => {
        setLoading(true);
        try {
            const data = await planningService.getPendingRequests();
            setRequests(data);
        } catch (error) {
            console.error(error);
            showToast('Error al cargar solicitudes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleResolve = async (id: number, accion: 'Aprobar' | 'Rechazar') => {
        setProcessingId(id);
        try {
            await planningService.resolveRequest(id, accion);
            showToast(`Solicitud ${accion === 'Aprobar' ? 'Aprobada' : 'Rechazada'} correctamente`, 'success');
            // Remove from list immediately for better UX
            setRequests(prev => prev.filter(r => r.idSolicitud !== id));
        } catch (error) {
            showToast('Error al procesar la solicitud', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const stats = useMemo(() => ({
        total: requests.length,
        strategic: requests.filter(r => r.tarea?.proyecto?.tipo === 'Estrategico').length
    }), [requests]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4 md:border-none md:pb-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <ShieldAlert className="text-purple-600" size={28} />
                        Centro de Aprobaciones
                    </h1>
                    <p className="text-slate-500 text-sm">Gestiona cambios en proyectos estratégicos</p>
                </div>

                {/* Mini Stats */}
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-3">
                        <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><FileText size={16} /></div>
                        <div>
                            <span className="block text-xs text-purple-500 font-bold uppercase">Pendientes</span>
                            <span className="text-lg font-black text-purple-700 leading-none">{stats.total}</span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse">Cargando solicitudes...</div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                    <CheckCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-600">Todo al día</h3>
                    <p className="text-slate-400">No tienes solicitudes pendientes de aprobación.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(req => (
                        <div key={req.idSolicitud} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col lg:flex-row gap-6">

                                {/* Main Info */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                        <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-purple-200">
                                            Solicitud #{req.idSolicitud}
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                                            <Clock size={14} /> {new Date(req.fechaSolicitud).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-500 font-medium">
                                            <User size={14} /> {req.usuarioSolicitante?.nombre || 'Solicitante Desconocido'}
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            {req.tarea?.titulo || `Tarea #${req.idTarea}`}
                                        </h3>
                                        <p className="text-sm text-slate-500">Proyecto: {req.tarea?.proyecto?.nombre || 'Desconocido'}</p>
                                    </div>

                                    {/* Diff View */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Cambio Solicitado en <span className="text-slate-700">{req.campoAfectado}</span></p>
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 line-through decoration-slate-400 decoration-2">
                                                {req.valorAnterior || <span className="italic opacity-50">Vacío</span>}
                                            </div>
                                            <ArrowRight size={16} className="text-slate-400" />
                                            <div className="bg-white px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 font-bold shadow-sm">
                                                {req.valorNuevo}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 items-start">
                                        <div className="mt-1 w-1 h-full bg-slate-200 rounded-full min-h-[20px]"></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase">Motivo</p>
                                            <p className="text-sm text-slate-600 italic">"{req.motivo}"</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row lg:flex-col justify-center items-stretch gap-3 min-w-[180px] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                                    <button
                                        onClick={() => handleResolve(req.idSolicitud, 'Aprobar')}
                                        disabled={processingId === req.idSolicitud}
                                        className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processingId === req.idSolicitud ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={18} />}
                                        Aprobar
                                    </button>
                                    <button
                                        onClick={() => handleResolve(req.idSolicitud, 'Rechazar')}
                                        disabled={processingId === req.idSolicitud}
                                        className="flex-1 py-3 px-4 bg-white text-rose-600 border border-rose-100 font-bold rounded-xl hover:bg-rose-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <XCircle size={18} /> Rechazar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
