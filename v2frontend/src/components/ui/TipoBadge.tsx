import React from 'react';
import type { TipoTarea } from '../../types/modelos';

interface Props {
    tipo?: TipoTarea;
    size?: 'sm' | 'md';
}

const getTipoConfig = (tipo: TipoTarea) => {
    const configs = {
        'Logistica': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Logística' },
        'Administrativa': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Admin' },
        'Estrategica': { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Estratégica' },
        'AMX': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'AMX' },
        'Operativo': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Operativo' },
        'CENAM': { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'CENAM' },
        'Otros': { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Otros' }
    };
    return configs[tipo] || configs['Otros'];
};

export const TipoBadge: React.FC<Props> = ({ tipo, size = 'sm' }) => {
    if (!tipo) return null;

    const config = getTipoConfig(tipo);
    const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';

    return (
        <span className={`${config.bg} ${config.text} ${sizeClasses} rounded font-medium inline-block`}>
            {config.label}
        </span>
    );
};
