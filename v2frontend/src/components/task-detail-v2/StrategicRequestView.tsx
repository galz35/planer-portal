import React, { useState } from 'react';
import { FileSignature } from 'lucide-react';

interface Props {
    currentValue: string;
    onCancel: () => void;
    onSubmit: (newValue: string, reason: string) => void;
    submitting: boolean;
}

export const StrategicRequestView: React.FC<Props> = ({ currentValue, onCancel, onSubmit, submitting }) => {
    const [newValue, setNewValue] = useState(currentValue);
    const [reason, setReason] = useState('');

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <h4 className="font-bold text-purple-800 flex items-center gap-2 mb-2"><FileSignature size={18} /> Solicitud de Cambio Estratégico</h4>
                <p className="text-xs text-purple-600 mb-4">
                    Este proyecto es estratégico y requiere aprobación para modificar fechas. Tu solicitud será enviada al líder del proyecto.
                </p>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-purple-400 uppercase">Nueva Fecha Propuesta</label>
                        <input
                            type="date"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-purple-400 uppercase">Justificación (Obligatoria)</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Explica por qué necesitas mover la fecha..."
                            className="w-full p-2 bg-white border border-purple-200 rounded-lg text-sm outline-none h-20 resize-none"
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={onCancel} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button
                    onClick={() => onSubmit(newValue, reason)}
                    disabled={submitting || !reason.trim()}
                    className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 disabled:opacity-60 hover:bg-purple-700"
                >
                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
            </div>
        </div>
    );
};
