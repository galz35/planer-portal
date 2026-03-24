import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Settings, LogOut, Shield, User, Save, Loader2 } from 'lucide-react';
import { useMiDiaContext } from '../../pages/Hoy/context/MiDiaContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const UserSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { agendaConfig, setAgendaConfig } = useMiDiaContext();
    const { user, logout } = useAuth();
    const { showToast } = useToast();

    // Local state for pending changes
    const [localConfig, setLocalConfig] = useState(agendaConfig);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Sync local state when modal opens or config changes externally
    useEffect(() => {
        if (isOpen) {
            setLocalConfig(agendaConfig);
            setHasChanges(false);
        }
    }, [isOpen, agendaConfig]);

    if (!isOpen) return null;

    const toggleGestion = () => {
        setLocalConfig(prev => {
            const next = { ...prev, showGestion: !prev.showGestion };
            setHasChanges(JSON.stringify(next) !== JSON.stringify(agendaConfig));
            return next;
        });
    };

    const toggleRapida = () => {
        setLocalConfig(prev => {
            const next = { ...prev, showRapida: !prev.showRapida };
            setHasChanges(JSON.stringify(next) !== JSON.stringify(agendaConfig));
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setAgendaConfig(localConfig);
            showToast('Configuración guardada correctamente', 'success');
            setHasChanges(false);
            // Optional: onClose(); or keep open based on UX preference
        } catch (error) {
            showToast('Error al guardar configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-end animate-fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 h-full w-full max-w-sm shadow-2xl flex flex-col animate-slide-in-right"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Settings size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Configuración</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Personaliza tu experiencia</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* User Profile Info */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Mi Perfil</h3>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-600 font-black border-2 border-indigo-100 dark:border-slate-700">
                                {user?.nombre?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 dark:text-white truncate">{user?.nombre || 'Usuario'}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.correo || 'correo@ejemplo.com'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Agenda Settings */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vista de Agenda</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                                <div className="flex items-center gap-2">
                                    <Eye size={16} />
                                    <span className="text-sm font-bold">Columna Principal</span>
                                </div>
                                <span className="text-[9px] font-black bg-white dark:bg-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">FIJO</span>
                            </div>

                            <button
                                onClick={toggleGestion}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${localConfig.showGestion
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 grayscale'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {localConfig.showGestion ? <Eye size={16} /> : <EyeOff size={16} />}
                                    <span className="text-sm font-bold">Gestión / Avance</span>
                                </div>
                                {localConfig.showGestion && <span className="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 rounded-full">VISIBLE</span>}
                            </button>

                            <button
                                onClick={toggleRapida}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${localConfig.showRapida
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 grayscale'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {localConfig.showRapida ? <Eye size={16} /> : <EyeOff size={16} />}
                                    <span className="text-sm font-bold">Rápida / Extra</span>
                                </div>
                                {localConfig.showRapida && <span className="text-[10px] font-bold text-amber-400 bg-white px-2 py-0.5 rounded-full">VISIBLE</span>}
                            </button>

                            {/* Save Button within section */}
                            {hasChanges && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {saving ? 'Guardando...' : 'Aplicar Cambios'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Account Actions */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cuenta</h3>
                        <div className="space-y-1">
                            {(user?.rolGlobal?.toLowerCase() === 'admin' || user?.rol?.nombre?.toLowerCase() === 'admin') && (
                                <button className="w-full flex items-center gap-3 p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                    <Shield size={18} />
                                    <span className="text-sm font-bold text-left flex-1">Panel de Control</span>
                                </button>
                            )}
                            <button className="w-full flex items-center gap-3 p-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <User size={18} />
                                <span className="text-sm font-bold text-left flex-1">Editar Datos</span>
                            </button>
                            <button
                                onClick={() => { logout(); onClose(); }}
                                className="w-full flex items-center gap-3 p-3 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors mt-4"
                            >
                                <LogOut size={18} />
                                <span className="text-sm font-bold text-left flex-1">Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter italic">Clarity 2026 • Premium Work Experience</p>
                </div>
            </div>
        </div>
    );
};
