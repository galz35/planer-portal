import React from 'react';
import type { Proyecto } from '../../../types/modelos';

interface ProjectCloneModalProps {
    isOpen: boolean;
    project: Proyecto | null;
    cloneName: string;
    saving: boolean;
    onCloneNameChange: (name: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}

export const ProjectCloneModal: React.FC<ProjectCloneModalProps> = ({
    isOpen, project, cloneName, saving,
    onCloneNameChange, onClose, onSubmit
}) => {
    if (!isOpen || !project) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-black text-slate-800 mb-4">Clonar Proyecto</h3>
                <p className="text-sm text-slate-500 mb-4">
                    Se creará una copia del proyecto <strong>{project.nombre}</strong> con todas sus tareas (estado pendiente, sin responsables).
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="clone-name" className="block text-xs font-bold text-slate-700 uppercase mb-1">Nuevo Nombre del Proyecto</label>
                        <input
                            id="clone-name"
                            type="text"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={cloneName}
                            onChange={e => onCloneNameChange(e.target.value)}
                            placeholder="Nombre del nuevo proyecto..."
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSubmit}
                        disabled={!cloneName.trim()}
                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none"
                    >
                        {saving ? 'Clonando...' : 'Clonar Proyecto'}
                    </button>
                </div>
            </div>
        </>
    );
};
