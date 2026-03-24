import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { clarityService } from '../../services/clarity.service';
import { alerts } from '../../utils/alerts';
import type { Bloqueo } from '../../types/modelos';
import {
    Clock, CheckCircle, ArrowRight, Search, X,
    Plus, Siren, RefreshCw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export const EquipoBloqueosPage: React.FC = () => {
    const { user } = useAuth();
    const [today] = useState(() => new Date().toISOString().split('T')[0]); // Stable today
    const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();
    const [filter, setFilter] = useState<'all' | 'critical' | 'external'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBloqueo, setSelectedBloqueo] = useState<Bloqueo | null>(null);
    const [isReporting, setIsReporting] = useState(false);

    const [reportMotivo, setReportMotivo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [resolvingId, setResolvingId] = useState<number | null>(null);

    const fetchBloqueos = useCallback(async () => {
        try {
            setLoading(true);
            const data = await clarityService.getEquipoBloqueos(today);
            setBloqueos(data || []);
        } catch (e: any) {
            // Only show toast if it's not a generic 404 handled globally or cancelled
            if (e.response?.status !== 404) {
                showToast("Error al cargar bloqueos", "error");
            }
            console.warn("Fetch bloqueos failed:", e);
        } finally {
            setLoading(false);
        }
    }, [today, showToast]);

    useEffect(() => {
        fetchBloqueos();
    }, [fetchBloqueos]);

    const stats = useMemo(() => {
        const active = bloqueos.filter(b => b.estado === 'Activo');
        const critical = active.filter(b => (new Date().getTime() - new Date(b.fechaCreacion).getTime()) > 86400000).length;
        return { active: active.length, critical };
    }, [bloqueos]);

    const handleResolve = async (id: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!(await alerts.confirm('¿Resolver impedimento?', '¿Marcar este bloqueo como resuelto?', 'question'))) return;

        setResolvingId(id);
        try {
            await clarityService.resolverBloqueo(id);
            showToast('Bloqueo resuelto.', 'success');
            await fetchBloqueos();
            if (selectedBloqueo?.idBloqueo === id) setSelectedBloqueo(null);
        } catch (error) {
            showToast('Error al resolver bloqueo.', 'error');
        } finally {
            setResolvingId(null);
        }
    };

    const handleCreateReport = async () => {
        if (!reportMotivo.trim()) return;

        setIsSubmitting(true);
        try {
            await clarityService.postBloqueo({
                motivo: reportMotivo,
                idOrigenUsuario: user?.idUsuario || 0,
                estado: 'Activo'
            } as any);

            showToast('Bloqueo registrado.', 'success');
            setIsReporting(false);
            setReportMotivo('');
            fetchBloqueos();
        } catch (error) {
            showToast('Error al registrar.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDuration = (start: string) => {
        const hrs = Math.floor((new Date().getTime() - new Date(start).getTime()) / 3600000);
        if (hrs > 48) return `${Math.floor(hrs / 24)}d`;
        return `${hrs}h`;
    };

    const filteredList = useMemo(() => {
        return bloqueos.filter(b => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                (b.origenUsuario?.nombre || '').toLowerCase().includes(term) ||
                (b.destinoUsuario?.nombre || '').toLowerCase().includes(term) ||
                b.motivo.toLowerCase().includes(term);

            const isCritical = (new Date().getTime() - new Date(b.fechaCreacion).getTime()) > 86400000;
            const isExternal = b.destinoUsuario?.rolGlobal === 'Externo' || b.idDestinoUsuario === 0;

            if (filter === 'critical') return matchesSearch && isCritical;
            if (filter === 'external') return matchesSearch && isExternal;
            return matchesSearch;
        });
    }, [bloqueos, searchTerm, filter]);

    return (
        <div className="bg-white min-h-screen flex flex-col h-screen text-slate-800 overflow-hidden font-sans">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                        <Siren size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-none">Gestión de Impedimentos</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] font-medium text-slate-500">{stats.active} Activos</span>
                            {stats.critical > 0 && <span className="text-[11px] font-bold text-rose-600">{stats.critical} Críticos</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-medium w-64 focus:border-indigo-500 outline-none transition-colors"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsReporting(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <Plus size={14} /> Reportar
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="max-w-6xl mx-auto">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'critical', label: 'Críticos (>24h)' },
                            { id: 'external', label: 'Externos' },
                        ].map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id as any)}
                                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${filter === f.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                            <RefreshCw className="animate-spin text-slate-300" size={24} />
                            <p className="text-xs font-medium">Cargando...</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="font-semibold text-slate-700">Sin impedimentos pendientes</p>
                            <p className="text-xs text-slate-400 mt-1">No hay registros que coincidan con el filtro.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredList.map(b => {
                                const isCritical = (new Date().getTime() - new Date(b.fechaCreacion).getTime()) > 86400000;
                                const duration = getDuration(b.fechaCreacion);
                                const isResolving = resolvingId === b.idBloqueo;

                                return (
                                    <div
                                        key={b.idBloqueo}
                                        className={`bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors cursor-pointer flex items-center gap-4 ${isCritical ? 'border-l-4 border-l-rose-500' : ''}`}
                                        onClick={() => setSelectedBloqueo(b)}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0 ${b.idDestinoUsuario === 0 ? 'bg-slate-600' : 'bg-indigo-600'}`}>
                                            {b.destinoUsuario?.nombre ? b.destinoUsuario.nombre.charAt(0) : 'E'}
                                        </div>

                                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                            <div className="md:col-span-3">
                                                <p className="text-xs font-bold text-slate-900 truncate">{b.destinoUsuario?.nombre || 'Proveedor Externo'}</p>
                                                <p className="text-[10px] text-slate-500">Responsable</p>
                                            </div>

                                            <div className="md:col-span-5">
                                                <p className="text-sm font-medium text-slate-800 truncate">{b.motivo}</p>
                                                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                    Bloquea a: {b.origenUsuario?.nombre.split(' ')[0]} • Tarea: {b.tarea?.titulo || 'General'}
                                                </p>
                                            </div>

                                            <div className="md:col-span-2 flex items-center gap-2">
                                                <div className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 flex items-center gap-1 ${isCritical ? 'bg-rose-50 text-rose-600' : ''}`}>
                                                    <Clock size={10} /> {duration}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 flex justify-end">
                                                <button
                                                    onClick={(e) => handleResolve(b.idBloqueo, e)}
                                                    disabled={isResolving}
                                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 rounded-md text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isResolving ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle size={12} />}
                                                    {isResolving ? 'Resolviendo...' : 'Resolver'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* REPORT MODAL */}
            {isReporting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-100 p-6 animate-in zoom-in-95 duration-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800">Reportar Impedimento</h3>
                            <button onClick={() => setIsReporting(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <textarea
                            className="w-full h-32 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg p-3 text-sm outline-none resize-none mb-4"
                            placeholder="Descripción del bloqueo..."
                            value={reportMotivo}
                            onChange={(e) => setReportMotivo(e.target.value)}
                            autoFocus
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsReporting(false)} className="px-4 py-2 text-slate-600 font-medium text-xs hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button
                                onClick={handleCreateReport}
                                disabled={isSubmitting || !reportMotivo.trim()}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting && <RefreshCw className="animate-spin" size={12} />}
                                Registrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {selectedBloqueo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-in fade-in duration-100">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-xl overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">ID #{selectedBloqueo.idBloqueo}</span>
                                <h3 className="font-bold text-lg text-slate-900 mt-1">{selectedBloqueo.motivo}</h3>
                            </div>
                            <button onClick={() => setSelectedBloqueo(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Bloqueado</div>
                                    <div className="font-bold text-slate-800">{selectedBloqueo.origenUsuario?.nombre}</div>
                                </div>
                                <ArrowRight className="text-slate-300" size={16} />
                                <div className="flex-1 text-right">
                                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Responsable</div>
                                    <div className="font-bold text-slate-800">{selectedBloqueo.destinoUsuario?.nombre || 'EXTERNO'}</div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Detalles</h4>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>Fecha Registro: <span className="font-medium">{new Date(selectedBloqueo.fechaCreacion).toLocaleDateString()}</span></p>
                                    <p>Tarea Afectada: <span className="font-medium">{selectedBloqueo.tarea?.titulo || 'N/A'}</span></p>
                                    {selectedBloqueo.accionMitigacion && (
                                        <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-100 text-xs">
                                            <span className="font-bold block mb-1">Mitigación:</span>
                                            {selectedBloqueo.accionMitigacion}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={(e) => handleResolve(selectedBloqueo.idBloqueo, e)}
                                disabled={resolvingId === selectedBloqueo.idBloqueo}
                                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {resolvingId === selectedBloqueo.idBloqueo ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                {resolvingId === selectedBloqueo.idBloqueo ? 'Procesando...' : 'Marcar Resuelto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
