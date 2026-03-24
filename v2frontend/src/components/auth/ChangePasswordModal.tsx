import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';

interface ChangePasswordModalProps {
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showOldPass, setShowOldPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [form, setForm] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const isMatch = form.newPassword === form.confirmPassword && form.newPassword !== '';
    const isValid = isMatch && form.oldPassword !== '' && form.newPassword.length >= 6;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setLoading(true);
        try {
            await clarityService.changePassword(form.oldPassword, form.newPassword);
            showToast("Contraseña actualizada correctamente", "success");
            onClose();
        } catch (error: any) {
            const msg = error.response?.data?.message || "Error al actualizar contraseña";
            showToast(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-white/20">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold tracking-tight">Seguridad</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Actualizar Contraseña</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Clave Actual */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña Actual</label>
                        <div className="relative">
                            <input
                                type={showOldPass ? "text" : "password"}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold pr-12"
                                value={form.oldPassword}
                                onChange={e => setForm({ ...form, oldPassword: e.target.value })}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPass(!showOldPass)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Nueva Clave */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nueva Contraseña</label>
                        <div className="relative">
                            <input
                                type={showNewPass ? "text" : "password"}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold pr-12"
                                value={form.newPassword}
                                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPass(!showNewPass)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirmar Clave */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmar Contraseña</label>
                        <input
                            type="password"
                            className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none transition-all font-bold
                                ${form.confirmPassword ? (isMatch ? 'border-emerald-200 focus:border-emerald-500' : 'border-rose-200 focus:border-rose-500') : 'border-slate-200 focus:border-indigo-500'}
                            `}
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                            placeholder="Repite la nueva clave"
                            required
                        />
                        {form.confirmPassword && !isMatch && (
                            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-tight">Las contraseñas no coinciden</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!isValid || loading}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl
                            ${isValid && !loading
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'}
                        `}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                        Actualizar Ahora
                    </button>
                </form>

                <div className="p-4 bg-slate-50 text-center">
                    <button
                        onClick={onClose}
                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Quizás luego
                    </button>
                </div>
            </div>
        </div>
    );
};
