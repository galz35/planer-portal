import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import type { Proyecto } from '../../../types/modelos';

export const ProgresoBadge: React.FC<{ proyecto: Proyecto }> = ({ proyecto }) => {
    // FIX: Los SPs devuelven 'porcentaje' pero el frontend espera 'progreso'
    const prog = Math.min(100, Math.max(0, Number((proyecto as any).progreso ?? (proyecto as any).porcentaje ?? 0)));
    if (!Number.isFinite(prog)) return null;

    const color = prog >= 100 ? 'text-emerald-600' : prog >= 50 ? 'text-indigo-600' : prog > 0 ? 'text-amber-600' : 'text-slate-400';
    const bg = prog >= 100 ? 'bg-emerald-50' : prog >= 50 ? 'bg-indigo-50' : prog > 0 ? 'bg-amber-50' : 'bg-slate-50';
    const border = prog >= 100 ? 'border-emerald-200' : prog >= 50 ? 'border-indigo-200' : prog > 0 ? 'border-amber-200' : 'border-slate-200';

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${bg} ${color} ${border}`}>
            {prog}%
            {prog >= 100 && <CheckCircle size={10} className="text-emerald-500" />}
        </span>
    );
};

export const calculateDelay = (p: Proyecto) => {
    const start = (p as any).fechaInicio ? new Date((p as any).fechaInicio) : null;
    const end = (p as any).fechaFin ? new Date((p as any).fechaFin) : null;
    // FIX: Los SPs devuelven 'porcentaje' pero el frontend espera 'progreso'
    const progress = Math.min(100, Math.max(0, Number((p as any).progreso ?? (p as any).porcentaje ?? 0)));
    const today = new Date();

    if (!start || !end) return 0;
    if (progress >= 100) return 0;

    // Ignorar si el estado es final, o si está detenido/borrador/pausado
    const estado = ((p as any).estado || '').toLowerCase();
    if (estado.includes('termin') || estado.includes('final') || estado.includes('complet')) return 0;
    if (estado.includes('deten') || estado.includes('paus') || estado.includes('borrador')) return 0;

    // Normalizar la fecha fin para abarcar hasta el último milisegundo de ese día
    const endOfDeadLine = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    // Si seguimos dentro del plazo del proyecto (o es el mismo día final), NO marcamos atraso
    if (today <= endOfDeadLine) {
        return 0; // Aún hay tiempo, 0% atraso
    }

    // Si ya cruzamos al día siguiente de la Fecha Final (ya se venció totalmente)
    // El atraso a partir de ese momento es directamente lo que falta por avanzar para llegar a 100
    const delay = Math.max(0, 100 - progress);
    return Math.round(delay);
};

export const AtrasoBadge: React.FC<{ proyecto: Proyecto }> = ({ proyecto }) => {
    const delay = calculateDelay(proyecto);
    if (!delay || delay <= 0) return <span className="text-[10px] font-black text-slate-300">-</span>;

    const severity = delay > 20 ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100' : 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-100';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border shadow-sm ${severity}`}>
            <AlertCircle size={12} className={delay > 20 ? 'text-rose-600 animate-pulse' : 'text-orange-500'} />
            -{delay}%
        </span>
    );
};
