import React from 'react';
import { Calendar as CalendarIcon, Briefcase, List } from 'lucide-react';
import { format } from 'date-fns';
import type { Proyecto } from '../../../types/modelos';

export const RoadmapView: React.FC<{ projects: Proyecto[] }> = ({ projects }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
            {projects.map(p => (
                <div key={p.idProyecto} className="group bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm hover:shadow-2xl transition-all hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-black text-2xl text-slate-900 mb-2 tracking-tight group-hover:text-indigo-600 transition-colors">{p.nombre}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black">Proyecto Activo</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl">
                                <Briefcase className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                <div className="flex justify-between text-xs mb-3">
                                    <span className="font-black text-slate-500 uppercase tracking-wider">Progreso Global</span>
                                    <span className="font-black text-slate-900">{(p as any).porcentaje || (p as any).progreso || 0}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                    <div className="h-full bg-slate-900 transition-all duration-1000" style={{ width: `${(p as any).porcentaje || (p as any).progreso || 0}%` }} />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            +
                                        </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5"><CalendarIcon size={14} /> {format(new Date(), 'MMM yy')}</span>
                                    <span className="flex items-center gap-1.5"><List size={14} /> 0 Tareas</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
