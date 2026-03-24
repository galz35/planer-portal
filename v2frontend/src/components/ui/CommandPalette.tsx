import React, { useState, useEffect, useMemo } from 'react';
import Fuse from 'fuse.js';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Database, Lock, UserCog, History, ShieldAlert } from 'lucide-react';
import { Search, Calendar, Users, FileText, PlusCircle, AlertTriangle, LogOut, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { alerts } from '../../utils/alerts';
import { AnimatePresence, motion } from 'framer-motion';

interface Command {
    id: string;
    label: string;
    icon: React.ReactNode;
    section: string;
    action: () => void;
}

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const navigate = useNavigate();
    const { user } = useAuth();

    // --- COMMAND DEFINITIONS ---
    const commands: Command[] = useMemo(() => {
        const baseCommands: Command[] = [
            // Navegación
            { id: 'nav-home', label: 'Ir a Inicio', icon: <Search size={18} />, section: 'Navegación', action: () => navigate('/app/hoy') },
            { id: 'nav-day', label: 'Ver Mi Agenda', icon: <Calendar size={18} />, section: 'Navegación', action: () => navigate('/app/hoy') },
            { id: 'nav-team', label: 'Ver Equipo', icon: <Users size={18} />, section: 'Navegación', action: () => navigate('/app/equipo') },
            { id: 'nav-notes', label: 'Mis Notas', icon: <FileText size={18} />, section: 'Navegación', action: () => navigate('/app/notas') },

            // Acciones
            { id: 'act-task', label: 'Crear Tarea Nueva', icon: <PlusCircle size={18} />, section: 'Acciones', action: () => navigate('/app/hoy?action=new-task') },
            { id: 'act-block', label: 'Reportar Bloqueo', icon: <AlertTriangle size={18} />, section: 'Acciones', action: () => navigate('/app/hoy?action=block') },

            // Sistema
            { id: 'sys-logout', label: 'Cerrar Sesión', icon: <LogOut size={18} />, section: 'Sistema', action: () => alerts.info('Cerrar Sesión', 'Utiliza el menú de usuario en la barra lateral para cerrar tu sesión.') },
        ];

        // Manager / Admin Commands
        if (['Admin', 'Administrador'].includes(user?.rolGlobal || '') || user?.rolGlobal === 'Jefe') {
            baseCommands.push(
                { id: 'mng-approvals', label: 'Centro de Aprobaciones', icon: <ShieldAlert size={18} />, section: 'Navegación', action: () => navigate('/app/planning/approvals') }
            );
        }

        // Admin Only
        if (['Admin', 'Administrador'].includes(user?.rolGlobal || '')) {
            baseCommands.push(
                { id: 'adm-audit', label: 'Auditoría de Seguridad', icon: <History size={18} />, section: 'Sistema', action: () => navigate('/app/admin/audit') },
                { id: 'adm-logs', label: 'Monitor de Sistema', icon: <ShieldCheck size={18} />, section: 'Sistema', action: () => navigate('/app/admin/logs') },
                { id: 'adm-users', label: 'Gestionar Usuarios', icon: <UserCog size={18} />, section: 'Sistema', action: () => navigate('/app/admin/users') },
                { id: 'adm-roles', label: 'Gestionar Roles', icon: <Lock size={18} />, section: 'Sistema', action: () => navigate('/app/admin/roles') },
                { id: 'adm-import', label: 'Importar Datos', icon: <Database size={18} />, section: 'Sistema', action: () => navigate('/app/admin/import') },
            );
        }

        return baseCommands;
    }, [user, navigate]);


    const fuse = useMemo(() => new Fuse(commands, {
        keys: ['label', 'section'],
        threshold: 0.4,
        distance: 100
    }), [commands]);

    const filteredCommands = useMemo(() => {
        if (!query) return commands;
        return fuse.search(query).map(res => res.item);
    }, [query, commands, fuse]);

    // --- KEYBOARD LISTENERS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') setIsOpen(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Navigation inside palette
    useEffect(() => {
        const handleNav = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % filteredCommands.length);
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action();
                    setIsOpen(false);
                    setQuery('');
                }
            }
        };
        window.addEventListener('keydown', handleNav);
        return () => window.removeEventListener('keydown', handleNav);
    }, [isOpen, filteredCommands, selectedIndex]);

    // Reset selection on query change
    useEffect(() => setSelectedIndex(0), [query]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-start justify-center pt-[20vh]"
                        onClick={() => setIsOpen(false)}
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.1 }}
                            className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center px-4 py-4 border-b border-slate-100">
                                <Search className="text-slate-400 mr-3" size={20} />
                                <input
                                    autoFocus
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="¿Qué necesitas hacer?..."
                                    className="flex-1 text-lg outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                                />
                                <div className="flex gap-2">
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono">ESC</span>
                                </div>
                            </div>

                            {/* List */}
                            <div className="max-h-[300px] overflow-y-auto py-2">
                                {filteredCommands.length === 0 ? (
                                    <div className="px-6 py-8 text-center text-slate-400 text-sm">
                                        No se encontraron comandos.
                                    </div>
                                ) : (
                                    <ul className="space-y-0.5 px-2">
                                        {filteredCommands.map((cmd, idx) => (
                                            <li
                                                key={cmd.id}
                                                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                                                    }`}
                                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                            >
                                                <div className={`p-2 rounded-md ${idx === selectedIndex ? 'bg-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 text-sm font-medium">
                                                    {cmd.label}
                                                </div>
                                                {idx === selectedIndex && (
                                                    <ArrowRight size={16} className="text-indigo-400" />
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                                <span>MOMENTUS <strong>Pro</strong></span>
                                <div className="flex gap-4">
                                    <span><strong>↑↓</strong> para navegar</span>
                                    <span><strong>↵</strong> para seleccionar</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
