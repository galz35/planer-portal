import React from 'react';
import { History, Copy, Users } from 'lucide-react';
import type { Proyecto } from '../../../types/modelos';

interface ProjectContextMenuProps {
    menuRef: React.RefObject<HTMLDivElement | null>;
    activeMenuId: number | null;
    menuPos: { top: number; right: number } | null;
    projects: Proyecto[];
    onNavigatePlan: (p: Proyecto) => void;
    onEdit: (p: Proyecto) => void;
    onHistory: (p: Proyecto) => void;
    onClone: (p: Proyecto) => void;
    onCollaborators: (p: Proyecto) => void;
    onDelete: (p: Proyecto) => void;
    onClose: () => void;
}

export const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({
    menuRef, activeMenuId, menuPos, projects,
    onNavigatePlan, onEdit, onHistory, onClone, onCollaborators, onDelete, onClose
}) => {
    if (!activeMenuId || !menuPos) return null;

    const findProject = () => projects.find(x => Number(x.idProyecto) === Number(activeMenuId));

    const action = (fn: (p: Proyecto) => void) => {
        const p = findProject();
        if (p) { onClose(); fn(p); }
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="py-1">
                <button onClick={() => action(onNavigatePlan)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-indigo-50 flex items-center gap-2">
                    <span>📅</span> Abrir plan
                </button>

                <button onClick={() => action(onEdit)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <span>✏️</span> Editar
                </button>

                <button onClick={() => action(onHistory)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50">
                    <History size={14} className="text-slate-400" /> Historial
                </button>

                <button onClick={() => action(onClone)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50">
                    <Copy size={14} className="text-slate-400" /> Clonar
                </button>

                <button onClick={() => action(onCollaborators)} className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50">
                    <Users size={14} className="text-slate-400" /> Colaboradores
                </button>

                <button onClick={() => action(onDelete)} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50">
                    <span>🗑️</span> Eliminar
                </button>
            </div>
        </div>
    );
};
