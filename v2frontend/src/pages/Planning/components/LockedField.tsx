import React from 'react';
import { Lock } from 'lucide-react';

export const LockedField: React.FC<{
    isLocked: boolean;
    label?: string;
    onProposal: () => void;
    children: React.ReactNode;
}> = ({ isLocked, label, onProposal, children }) => {
    return (
        <div className="relative group w-full">
            {label && <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{label}</label>}
            {children}
            {isLocked && (
                <div className="absolute top-0 right-0 z-10">
                    <button
                        onClick={onProposal}
                        className="bg-slate-50 p-1.5 rounded-bl-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors shadow-sm border-l border-b border-white"
                        title="Campo protegido / Aprobado. Solicitar cambio."
                    >
                        <Lock size={12} />
                    </button>
                </div>
            )}
        </div>
    );
};
