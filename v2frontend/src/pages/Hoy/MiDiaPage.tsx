import React, { useMemo, useCallback, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MiDiaProvider, useMiDiaContext } from './context/MiDiaContext';
import { TopBar } from '../../components/layout/TopBar';
import { List, Calendar, BarChart3, ChevronLeft, ChevronRight, CalendarDays, BookOpen, Settings } from 'lucide-react';
import { UserSettingsModal } from '../../components/layout/UserSettingsModal';

// ✅ Fecha local segura (evita bug UTC)
const fechaLocalYYYYMMDD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const MiDiaContent: React.FC = () => {
    const { allDisponibles, today, setToday } = useMiDiaContext();
    const [showSettings, setShowSettings] = useState(false);
    const dateInputRef = useRef<HTMLInputElement>(null);

    const handleDateClick = () => {
        // Trigger the native date picker
        if (dateInputRef.current) {
            if ('showPicker' in HTMLInputElement.prototype) {
                (dateInputRef.current as any).showPicker();
            } else {
                dateInputRef.current.click();
            }
        }
    };

    const handlePrevDay = useCallback(() => {
        const d = new Date(today + 'T00:00:00'); // ✅ evita parse raro
        d.setDate(d.getDate() - 1);
        setToday(fechaLocalYYYYMMDD(d));
    }, [today, setToday]);

    const handleNextDay = useCallback(() => {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        setToday(fechaLocalYYYYMMDD(d));
    }, [today, setToday]);


    const linkClass = useCallback(
        ({ isActive }: { isActive: boolean }) =>
            `px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isActive
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`,
        []
    );

    const total = allDisponibles.length;
    const hechas = useMemo(
        () => allDisponibles.reduce((acc, t) => (t.estado === 'Hecha' ? acc + 1 : acc), 0),
        [allDisponibles]
    );

    return (
        <div className="h-full bg-clarity-bg dark:bg-slate-900 flex flex-col overflow-hidden">
            <div className="md:hidden">
                <TopBar title="Mi Agenda" subtitle={today} />
            </div>

            <main className="p-4 w-full mx-auto animate-fade-in flex-1 flex flex-col min-h-0">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 mb-3 flex flex-col md:flex-row justify-between items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg">
                        <button
                            onClick={handlePrevDay}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <button
                            onClick={handleDateClick}
                            className="px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center gap-1 relative"
                        >
                            <CalendarDays size={14} />
                            {today}
                            {/* Hidden date input */}
                            <input
                                ref={dateInputRef}
                                type="date"
                                className="absolute inset-0 opacity-0 pointer-events-none w-0 h-0"
                                value={today}
                                onChange={(e) => setToday(e.target.value)}
                            />
                        </button>

                        <button
                            onClick={handleNextDay}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-500"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg flex gap-1 shadow-inner overflow-x-auto max-w-full no-scrollbar">
                        <NavLink to="" end className={linkClass}>
                            <List size={14} />
                            Ejecutar
                        </NavLink>

                        <NavLink to="calendario" className={linkClass}>
                            <Calendar size={14} />
                            Calendario
                        </NavLink>

                        <NavLink to="bitacora" className={linkClass}>
                            <BookOpen size={14} />
                            Bitácora
                        </NavLink>

                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                        <NavLink to="kpis" className={linkClass}>
                            <BarChart3 size={14} />
                            KPIs
                        </NavLink>
                    </div>

                    <div className="md:hidden flex items-center justify-between w-full mt-3 px-2">
                        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                            {hechas}/{total} completadas
                        </span>
                        <div className="flex-1 mx-3 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${total > 0 && hechas === total
                                    ? 'bg-emerald-500'
                                    : total > 0 && hechas / total > 0.5
                                        ? 'bg-blue-500'
                                        : 'bg-amber-500'
                                    }`}
                                style={{ width: `${total > 0 ? Math.round((hechas / total) * 100) : 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{total}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Total</p>
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="text-right">
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{hechas}</p>
                                <p className="text-[9px] uppercase font-bold text-slate-400">Hechas</p>
                            </div>
                        </div>

                        {/* Barra de progreso — NUEVA */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="w-24 md:w-32 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${total > 0 && hechas === total
                                        ? 'bg-emerald-500'
                                        : total > 0 && hechas / total > 0.5
                                            ? 'bg-blue-500'
                                            : 'bg-amber-500'
                                        }`}
                                    style={{ width: `${total > 0 ? Math.round((hechas / total) * 100) : 0}%` }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-full transition-all"
                            title="Ajustes de Usuario"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
                    <Outlet />
                </div>
            </main>

            <UserSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
};

export const MiDiaPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <MiDiaProvider userId={user?.idUsuario || 0} userCarnet={user?.carnet}>
            <MiDiaContent />
        </MiDiaProvider>
    );
};
