import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import type { TeamMember } from '../../../types/plan-trabajo.types';

export const QuickAssignDropdown: React.FC<{
    currentAssignee: { id: number, nombre: string } | null;
    team: TeamMember[];
    allUsers?: TeamMember[];
    onAssign: (userId: number) => void;
}> = ({ currentAssignee, team, allUsers, onAssign }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Refs for Portal
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const sourceList = (allUsers && allUsers.length > 0) ? allUsers : team;
    const filteredTeam = sourceList.filter(m =>
        (m.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.correo || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.carnet || '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

    // Calculate position on open
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Basic adjustment to keep it on screen could be added here
            setPosition({
                top: rect.bottom + 8,
                left: rect.left
            });
        }
    }, [isOpen]);

    // Handle outside click including Portal
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

    // Handle Window Resize/Scroll close to avoid floating weirdness
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
            className="w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
            <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-slate-300"
                    placeholder="Buscar miembro..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {filteredTeam.length > 0 ? filteredTeam.map(member => (
                    <button
                        key={member.idUsuario}
                        onClick={() => { onAssign(member.idUsuario); setIsOpen(false); }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors text-left group"
                    >
                        <UserAvatar name={member.nombre} />
                        <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900">{member.nombre}</span>
                    </button>
                )) : (
                    <div className="p-3 text-center text-[10px] text-slate-400">No se encontraron miembros</div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-slate-100 p-1 rounded-full pr-2 transition-colors border border-transparent hover:border-slate-200"
            >
                {currentAssignee ? (
                    <UserAvatar name={currentAssignee.nombre} />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                        <User size={12} />
                    </div>
                )}
                <span className="text-xs text-slate-600 truncate max-w-[80px] hidden md:block">
                    {currentAssignee ? (currentAssignee.nombre || 'Usuario').split(' ')[0] : 'Asignar'}
                </span>
                <ChevronDown size={10} className="text-slate-400" />
            </button>

            {isOpen && createPortal(dropdownContent, document.body)}
        </div>
    );
};
