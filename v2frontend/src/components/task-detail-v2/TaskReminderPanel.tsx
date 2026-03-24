import React, { useState, useEffect } from 'react';
import { Bell, Clock, Trash2, Loader2 } from 'lucide-react';
import type { Tarea } from '../../types/modelos';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';

interface Props {
    task: Tarea;
}

export const TaskReminderPanel: React.FC<Props> = ({ task }) => {
    const { showToast } = useToast();
    const [reminderDate, setReminderDate] = useState('');
    const [reminderTime, setReminderTime] = useState('');
    const [nota, setNota] = useState('');
    const [saving, setSaving] = useState(false);
    const [existing, setExisting] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Cargar recordatorio existente
    useEffect(() => {
        loadReminders();
    }, [task.idTarea]);

    const loadReminders = async () => {
        try {
            const all = await clarityService.obtenerRecordatorios();
            const mine = (Array.isArray(all) ? all : []).find(
                (r: any) => r.idTarea === task.idTarea && !r.enviado
            );
            if (mine) {
                setExisting(mine);
                const dt = new Date(mine.fechaHoraRecordatorio);
                setReminderDate(dt.toISOString().split('T')[0]);
                setReminderTime(dt.toTimeString().substring(0, 5));
                setNota(mine.nota || '');
            }
        } catch { /* silencioso */ } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!reminderDate || !reminderTime) {
            showToast('Selecciona fecha y hora', 'error');
            return;
        }
        setSaving(true);
        try {
            const fechaHora = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();
            await clarityService.crearRecordatorio(task.idTarea, fechaHora, nota || undefined);
            showToast('⏰ Recordatorio programado', 'success');
            await loadReminders();
        } catch (e: any) {
            showToast(e?.response?.data?.message || 'Error al crear recordatorio', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existing) return;
        setSaving(true);
        try {
            await clarityService.eliminarRecordatorio(existing.idRecordatorio);
            setExisting(null);
            setReminderDate('');
            setReminderTime('');
            setNota('');
            showToast('Recordatorio eliminado', 'success');
        } catch {
            showToast('Error al eliminar', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Quick presets
    const setQuickReminder = (minutesFromNow: number, label: string) => {
        const target = new Date(Date.now() + minutesFromNow * 60000);
        setReminderDate(target.toISOString().split('T')[0]);
        setReminderTime(target.toTimeString().substring(0, 5));
        setNota(label);
    };

    // Si tarea ya completada, no mostrar
    if (task.estado === 'Hecha' || task.estado === 'Descartada') return null;

    if (loading) return null;

    return (
        <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Bell size={12} /> Recordatorio
                {existing && <span className="text-amber-500 font-bold normal-case tracking-normal text-[10px]">⏰ Activo</span>}
            </h4>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
                {[
                    { label: 'En 30 min', mins: 30 },
                    { label: 'En 1 hora', mins: 60 },
                    { label: 'En 3 horas', mins: 180 },
                    { label: 'Mañana 8AM', mins: -1 },
                ].map(({ label, mins }) => (
                    <button
                        key={label}
                        onClick={() => {
                            if (mins === -1) {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(8, 0, 0, 0);
                                setReminderDate(tomorrow.toISOString().split('T')[0]);
                                setReminderTime('08:00');
                                setNota(label);
                            } else {
                                setQuickReminder(mins, label);
                            }
                        }}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-lg text-[10px] font-bold border border-slate-100 hover:border-amber-200 transition-all"
                    >
                        <Clock size={10} className="inline mr-1" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Custom Date/Time */}
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Fecha</label>
                    <input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                    />
                </div>
                <div className="flex-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Hora</label>
                    <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || !reminderDate || !reminderTime}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm shadow-amber-200"
                >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                    {existing ? 'Actualizar' : 'Programar'}
                </button>
            </div>

            {/* Nota opcional */}
            <input
                type="text"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Nota del recordatorio (opcional)..."
                maxLength={200}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-600 outline-none focus:border-amber-300 placeholder:text-slate-300"
            />

            {/* Existing Reminder Info */}
            {existing && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-amber-600 font-bold">⏰ Programado:</span>
                        <span className="text-slate-600 font-medium">
                            {new Date(existing.fechaHoraRecordatorio).toLocaleString('es-NI', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        {existing.nota && <span className="text-slate-400 italic">— {existing.nota}</span>}
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={saving}
                        className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Eliminar recordatorio"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
