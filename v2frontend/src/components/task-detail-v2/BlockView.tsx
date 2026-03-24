import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Usuario } from '../../types/modelos';

interface Props {
    team: Usuario[];
    onCancel: () => void;
    onSubmit: (params: { reason: string; who: string; userId: number | null }) => void;
    submitting: boolean;
}

export const BlockView: React.FC<Props> = ({ team, onCancel, onSubmit, submitting }) => {
    const [reason, setReason] = useState('');
    const [who, setWho] = useState('');
    const [userId, setUserId] = useState<number | null>(null);

    return (
        <div className="space-y-4 animate-fade-in">
            <h4 className="font-bold text-rose-700 flex items-center gap-2"><AlertTriangle size={20} /> Reportar Impedimento</h4>

            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">¿Qué te bloquea?</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ej: No tengo accesos a la VPN..."
                    className="w-full p-3 border border-rose-200 bg-rose-50 rounded-xl focus:border-rose-400 outline-none text-sm h-24 resize-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 underline decoration-slate-200">¿Quién es el responsable? (Opcional)</label>

                <select
                    className="w-full p-3 border border-slate-200 rounded-xl outline-none text-sm bg-white text-slate-700"
                    value={userId || ''}
                    onChange={(e) => {
                        const uid = Number(e.target.value);
                        setUserId(uid || null);
                        const user = team.find(u => u.idUsuario === uid);
                        if (user) setWho(user.nombre);
                    }}
                >
                    <option value="">Selecciona responsable...</option>
                    {team.map(u => (
                        <option key={u.idUsuario} value={u.idUsuario}>
                            {u.nombre} ({u.rol?.nombre || 'Colaborador'})
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    value={who}
                    onChange={(e) => setWho(e.target.value)}
                    placeholder="Nombre o área (ej: DevOps, Pedro...)"
                    className="w-full p-2 border-b border-slate-100 outline-none text-xs text-slate-400"
                />
            </div>

            <div className="flex gap-2 pt-2">
                <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button
                    onClick={() => onSubmit({ reason, who, userId })}
                    disabled={submitting}
                    className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-200 disabled:opacity-60 hover:bg-rose-700"
                >
                    {submitting ? 'Registrando...' : '🚨 Reportar'}
                </button>
            </div>
        </div>
    );
};
