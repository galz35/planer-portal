/**
 * DelegacionModal - Permitir que un Jefe delegue su visibilidad
 * 
 * Usado en el Panel de Gerencia para que los jefes puedan dar acceso
 * a sus secretarias o asistentes de forma autónoma.
 */
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, RefreshCw, Shield, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { accesoService } from '../../services/acceso.service';
import { alerts } from '../../utils/alerts';
import type { DelegacionVisibilidad, Empleado } from '../../types/acceso';

interface DelegacionModalProps {
    isOpen: boolean;
    onClose: () => void;
    carnetJefe: string;
}

export const DelegacionModal: React.FC<DelegacionModalProps> = ({ isOpen, onClose, carnetJefe }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [delegaciones, setDelegaciones] = useState<DelegacionVisibilidad[]>([]);

    // Search state for new delegate
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<Empleado[]>([]);
    const [motivo, setMotivo] = useState('');

    const loadDelegaciones = async () => {
        setLoading(true);
        try {
            const res = await accesoService.getDelegacionesPorDelegante(carnetJefe);
            setDelegaciones(res.data?.data || []);
        } catch (err: any) {
            setError('Error cargando delegaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadDelegaciones();
            setError(null);
        }
    }, [isOpen]);

    const handleSearch = async (val: string) => {
        setSearchTerm(val);
        if (val.length < 3) {
            setSearchResult([]);
            return;
        }

        try {
            const res = await accesoService.buscarEmpleados(val, 5);
            setSearchResult(res.data?.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const crearDelegacion = async (carnetDelegado: string) => {
        setLoading(true);
        setError(null);
        try {
            await accesoService.createDelegacion({
                carnetDelegante: carnetJefe,
                carnetDelegado,
                motivo: motivo || 'Delegación de Gerencia'
            });
            setSearchTerm('');
            setSearchResult([]);
            setMotivo('');
            loadDelegaciones();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error creando delegación');
        } finally {
            setLoading(false);
        }
    };

    const borrarDelegacion = async (id: number) => {
        if (!(await alerts.confirm('¿Revocar Delegación?', 'El usuario perderá el acceso heredado inmediatamente.'))) return;
        setLoading(true);
        try {
            await accesoService.deleteDelegacion(id);
            loadDelegaciones();
        } catch (err: any) {
            setError('Error eliminando delegación');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                            <Shield size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Delegar Visibilidad</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Control de Accesos Heredados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-full transition-all group flex items-center gap-1.5"
                    >
                        <span className="text-[10px] font-black uppercase tracking-tight opacity-0 group-hover:opacity-100 transition-opacity">Cerrar</span>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Concede acceso a tu panel de gerencia a un asistente o colega. <span className="text-purple-600 font-bold">Podrán visualizar exactamente lo mismo que tú.</span>
                    </p>

                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[11px] font-bold flex gap-3 items-center uppercase tracking-wider">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* New Delegation Form */}
                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-[24px] space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                            <UserPlus size={14} className="text-purple-500" /> Nueva Delegación
                        </h3>

                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Nombre o Carnet del delegado..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 text-sm font-bold border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
                                />

                                {searchResult.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-[20px] shadow-2xl z-20 overflow-hidden animate-in slide-in-from-top-2">
                                        {searchResult.map(emp => (
                                            <button
                                                key={emp.carnet}
                                                onClick={() => crearDelegacion(emp.carnet)}
                                                className="w-full text-left px-5 py-3 hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-0"
                                            >
                                                <p className="font-black text-slate-800 text-sm tracking-tight">{emp.nombreCompleto}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{emp.carnet} • {emp.cargo}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Motivo o Justificación..."
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                className="w-full px-4 py-3 text-sm font-medium border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-purple-300 transition-all bg-white/50"
                            />
                        </div>
                    </div>

                    {/* List existing */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Delegaciones Vigentes</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {loading && delegaciones.length === 0 ? (
                                <div className="text-center py-10 flex flex-col items-center gap-2">
                                    <RefreshCw className="animate-spin text-purple-600" size={24} />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</p>
                                </div>
                            ) : delegaciones.length > 0 ? (
                                delegaciones.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center font-black text-sm">
                                                {d.carnetDelegado.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm tracking-tight capitalize">{d.carnetDelegado}</p>
                                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">{d.motivo || 'Apoyo General'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => borrarDelegacion(d.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Revocar Acceso"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400 italic">No hay accesos delegados activos.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-purple-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 group"
                    >
                        Listo
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
