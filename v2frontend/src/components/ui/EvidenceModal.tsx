import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Link } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';
import type { Tarea } from '../../types/modelos';

interface Props {
    task: Tarea;
    onClose: () => void;
    onCompleted: () => void;
}

export const EvidenceModal: React.FC<Props> = ({ task, onClose, onCompleted }) => {
    const { showToast } = useToast();
    const [link, setLink] = useState('');
    const [nota, setNota] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!link.trim()) {
            showToast('El enlace de evidencia es obligatorio', 'error');
            return;
        }

        setSubmitting(true);
        try {
            await clarityService.actualizarTarea(task.idTarea, {
                linkEvidencia: link,
                comentario: nota ? `[Cierre con Evidencia] ${nota}` : undefined,
                estado: 'Hecha' // Importante: Aquí se marca como hecha
            } as any);
            showToast('Evidencia guardada y tarea completada', 'success');
            onCompleted();
        } catch (error) {
            console.error(error);
            showToast('Error al guardar evidencia', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 ring-1 ring-slate-900/5 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Link size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Cierre con Evidencia</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Esta tarea requiere un comprobante para ser finalizada.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Enlace de Evidencia (Drive/SharePoint)</label>
                        <input
                            type="url"
                            value={link}
                            onChange={e => setLink(e.target.value)}
                            placeholder="https://..."
                            autoFocus
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Nota Adicional (Opcional)</label>
                        <textarea
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            placeholder="Comentario sobre la entrega..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none h-20"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
                    >
                        {submitting ? 'Guardando...' : <><CheckCircle size={18} /> Confirmar Entrega</>}
                    </button>

                    <div className="text-center">
                        <button type="button" onClick={onClose} className="text-xs text-slate-400 font-medium hover:text-slate-600">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
