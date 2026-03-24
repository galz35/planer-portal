import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface SolicitudCambioModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    campo: string;
    valorAnterior: string;
    valorNuevo: string;
}

export const SolicitudCambioModal: React.FC<SolicitudCambioModalProps> = ({
    isOpen, onClose, onConfirm, campo, valorAnterior, valorNuevo
}) => {
    const [motivo, setMotivo] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                    <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle size={20} />
                        <h3 className="font-bold">Aprobación Necesaria</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        El proyecto está en una etapa protegida. Para cambiar <strong>{campo}</strong> de <br />
                        <span className="line-through text-slate-400">{valorAnterior || 'N/A'}</span> &rarr; <span className="font-bold text-slate-800">{valorNuevo}</span>,
                        debes solicitar aprobación.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Motivo del cambio</label>
                        <textarea
                            className="w-full rounded-lg border-slate-200 text-sm focus:ring-amber-500 focus:border-amber-500"
                            rows={3}
                            placeholder="Ej: Retraso por parte del cliente..."
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(motivo)}
                        className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
                        disabled={!motivo.trim()}
                    >
                        Solicitar Aprobación
                    </button>
                </div>
            </div>
        </div>
    );
};
