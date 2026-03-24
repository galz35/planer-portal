import React from 'react';

interface StatusBadgeProps {
    status: string;
    isDelayed?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, isDelayed }) => {
    const colors: Record<string, string> = {
        'Pendiente': 'bg-slate-100 text-slate-600 border-slate-200',
        'En Curso': 'bg-sky-50 text-sky-600 border-sky-100',
        'Bloqueada': 'bg-rose-50 text-rose-600 border-rose-100',
        'Revisión': 'bg-purple-50 text-purple-600 border-purple-100',
        'Hecha': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        // Fallbacks for common variations
        'EnCurso': 'bg-sky-50 text-sky-600 border-sky-100',
        'Revision': 'bg-purple-50 text-purple-600 border-purple-100',
    };

    const labels: Record<string, string> = {
        'Pendiente': 'Por Hacer',
        'En Curso': 'En Curso',
        'Bloqueada': 'Bloqueada',
        'Revisión': 'Revisión',
        'Hecha': 'Completada',
        'EnCurso': 'En Curso',
        'Revision': 'Revisión',
    };

    const finalClass = isDelayed
        ? 'bg-rose-100/80 text-rose-700 border-rose-200 shadow-sm'
        : (colors[status] || colors['Pendiente']);

    return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${finalClass} uppercase tracking-wider whitespace-nowrap inline-flex items-center justify-center`}>
            {labels[status] || status}
        </span>
    );
};
