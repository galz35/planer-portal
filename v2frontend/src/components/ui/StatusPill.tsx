/**
 * ¿QUÉ ES?: Una pequeña etiqueta de estado (Pill / Badge).
 * ¿PARA QUÉ SE USA?: Para mostrar visualmente el estado de una tarea, un bloqueo o un semáforo de usuario con colores específicos.
 * ¿QUÉ SE ESPERA?: Que reciba un código de estado (ej: 'EnCurso') y devuelva un elemento visual con el color y texto adecuados.
 */

import React from 'react';

// Tipos de estados permitidos
export type StatusType = 'Pendiente' | 'EnCurso' | 'Bloqueada' | 'Revision' | 'Hecha' | 'Descartada' | 'Activo' | 'Resuelto' | 'AlDia' | 'ConBloqueos';

interface Props {
    status: StatusType | string;
    size?: 'sm' | 'md';
}

/**
 * Mapeo de estilos CSS según el estado.
 */
const styles: Record<string, string> = {
    // Estados de Tarea
    Pendiente: 'bg-slate-100 text-slate-600',
    EnCurso: 'bg-blue-100 text-blue-700 border border-blue-200',
    Bloqueada: 'bg-red-100 text-red-700 border border-red-200',
    Revision: 'bg-purple-100 text-purple-700 border border-purple-200',
    Hecha: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    Descartada: 'bg-gray-100 text-gray-400 line-through',

    // Estados de Bloqueo
    Activo: 'bg-red-100 text-red-700 font-bold',
    Resuelto: 'bg-green-50 text-green-600',

    // Semáforos de Usuario (equipo)
    AlDia: 'bg-emerald-100 text-emerald-800', // ✅
    ConBloqueos: 'bg-red-100 text-red-800',   // 🟥
};

/**
 * Mapeo de etiquetas personalizadas para estados específicos.
 */
const labels: Record<string, string> = {
    AlDia: 'Reportó',
    ConBloqueos: 'Bloqueado',
};

export const StatusPill: React.FC<Props> = ({ status, size = 'md' }) => {
    // Si el estado no existe en el mapa, usamos gris por defecto
    const className = styles[status] || 'bg-gray-100 text-gray-600';
    const label = labels[status] || status;

    return (
        <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
            {label}
        </span>
    );
};

