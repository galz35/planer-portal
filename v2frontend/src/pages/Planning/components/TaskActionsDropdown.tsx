import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
    Edit, 
    Plus, 
    Copy, 
    Trash2, 
    ChevronDown 
} from 'lucide-react';
import { alerts } from '../../../utils/alerts';

interface TaskActionsDropdownProps {
    onEdit: () => void;
    onAddSubtask?: () => void;
    onClone: () => void;
    onDelete: () => void;
    isChild?: boolean;
    isActive?: boolean;
}

export const TaskActionsDropdown: React.FC<TaskActionsDropdownProps> = ({
    onEdit,
    onAddSubtask,
    onClone,
    onDelete,
    isChild = false,
    isActive = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const dropdownWidth = 160;
            let left = rect.right - dropdownWidth;
            
            // Adjust if it goes off screen left
            if (left < 10) left = 10;

            setPosition({
                top: rect.bottom + 8,
                left: left
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (dropdownRef.current?.contains(target)) return;
            if (buttonRef.current?.contains(target)) return;
            setIsOpen(false);
        };
        window.addEventListener('mousedown', handleClick);
        return () => window.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleScroll = () => setIsOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const dropdownContent = (
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 99999
            }}
            className="w-40 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
            <div className="p-1">
                <button
                    onClick={() => { onEdit(); setIsOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                >
                    <Edit size={14} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900">Editar</span>
                </button>

                {!isChild && onAddSubtask && (
                    <button
                        onClick={() => { onAddSubtask(); setIsOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 rounded-lg transition-colors text-left group"
                    >
                        <Plus size={14} className="text-slate-400 group-hover:text-indigo-600" />
                        <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900">Subtarea</span>
                    </button>
                )}

                <button
                    onClick={async () => { 
                        setIsOpen(false);
                        if (await alerts.confirm('¿Clonar tarea?', '¿Deseas duplicar esta tarea y sus subtareas?')) {
                            onClone(); 
                        }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                >
                    <Copy size={14} className="text-slate-400 group-hover:text-indigo-600" />
                    <span className="text-xs text-slate-600 font-bold group-hover:text-slate-900">Clonar</span>
                </button>

                <div className="h-px bg-slate-100 my-1"></div>

                <button
                    onClick={async () => { 
                        setIsOpen(false);
                        if (await alerts.confirm('¿Eliminar tarea?', '¿Estás seguro de que deseas eliminar esta tarea?')) {
                            onDelete(); 
                        }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-rose-50 rounded-lg transition-colors text-left group"
                >
                    <Trash2 size={14} className="text-slate-400 group-hover:text-rose-600" />
                    <span className="text-xs text-slate-600 font-bold group-hover:text-rose-700">Eliminar</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border shadow-sm ${isOpen || isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200'}`}
            >
                <span>Acciones</span>
                <ChevronDown size={12} className={isOpen ? 'text-white' : 'text-slate-400'} />
            </button>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};
