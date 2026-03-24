import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sun, ClipboardList, Users, BarChart3 } from 'lucide-react';

export const BottomNav: React.FC = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isActive = (path: string) => currentPath.startsWith(path);

    const navItems = [
        { path: '/app/hoy', label: 'Mi Agenda', icon: Sun },
        { path: '/app/pendientes', label: 'Pendientes', icon: ClipboardList },
        { path: '/app/equipo', label: 'Equipo', icon: Users },
        { path: '/app/gerencia/resumen', label: 'Gerencia', icon: BarChart3 },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe pt-2 px-6 flex justify-between items-center z-50 h-[65px] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col items-center justify-center w-16 h-full space-y-1 transition-all
                            ${active ? 'text-rose-600' : 'text-slate-400 hover:text-slate-600'}
                        `}
                    >
                        <item.icon
                            size={24}
                            strokeWidth={active ? 2.5 : 2}
                            className={`transition-transform duration-300 ${active ? '-translate-y-1' : ''}`}
                        />
                        <span className={`text-[10px] font-medium transition-opacity ${active ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                            {item.label}
                        </span>
                        {active && <div className="absolute bottom-1 w-1 h-1 bg-rose-500 rounded-full" />}
                    </Link>
                );
            })}
        </nav>
    );
};
