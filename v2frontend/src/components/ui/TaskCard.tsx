/**
 * ¿QUÉ ES?: Un componente de tarjeta interactiva para mostrar una tarea.
 * ¿PARA QUÉ SE USA?: Para representar visualmente una tarea en listas, permitiendo ver su título, estado y detalles básicos.
 * ¿QUÉ SE ESPERA?: Que cambie de color según el estado o la fecha de vencimiento y que sea clicable para ver detalles.
 */

import React from 'react';
import type { Tarea } from '../../types/modelos';
import { StatusPill } from './StatusPill';

interface Props {
    tarea: Tarea;
    onClick?: () => void;
    compact?: boolean; // Opción para mostrar una versión más pequeña
}

export const TaskCard: React.FC<Props> = ({ tarea, onClick, compact = false }) => {

    /**
     * Determina el color de la tarjeta según el estado y si está atrasada.
     */
    const getCardStyle = () => {
        // Estilo para tareas en curso
        if (tarea.estado === 'EnCurso') return 'bg-emerald-50 border-emerald-200 shadow-sm';

        // Estilo para tareas finalizadas o descartadas (se ven más opacas)
        if (tarea.estado === 'Hecha' || tarea.estado === 'Descartada') return 'bg-gray-50 border-gray-200 opacity-75';

        // Lógica de validación de atraso (A2, A3, etc.)
        if (tarea.fechaObjetivo) {
            const hoy = new Date();
            const fechaObj = new Date(tarea.fechaObjetivo);

            // Normalizar fechas para comparar solo días
            hoy.setHours(0, 0, 0, 0);
            fechaObj.setHours(0, 0, 0, 0);

            const diffTime = hoy.getTime() - fechaObj.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);

            if (diffDays > 2) return 'bg-red-50 border-red-200 shadow-sm'; // Crítico (> 2 días)
            if (diffDays > 0) return 'bg-orange-50 border-orange-200 shadow-sm'; // Atrasado (1-2 días)
        }

        return 'bg-white border-slate-200 shadow-sm'; // Estilo por defecto (A0)
    };

    return (
        <div
            onClick={onClick}
            className={`${getCardStyle()} rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer ${compact ? 'py-2' : ''}`}
        >
            <div className="flex justify-between items-start mb-1">
                <h4 className={`font-semibold text-slate-800 line-clamp-2 ${compact ? 'text-sm' : 'text-base'}`}>{tarea.titulo}</h4>
                {/* En modo normal mostramos el Pill de estado arriba */}
                {!compact && <StatusPill status={tarea.estado} size="sm" />}
            </div>

            {/* Detalles extendidos si no es modo compacto */}
            {!compact && (
                <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
                    <div className="flex gap-2">
                        <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {tarea.proyecto?.nombre || 'General'}
                        </span>
                        <span className="px-1.5 py-0.5">
                            {tarea.esfuerzo} / {tarea.prioridad}
                        </span>
                    </div>
                    {tarea.fechaObjetivo && (
                        <span>
                            📅 {tarea.fechaInicioPlanificada ? `${tarea.fechaInicioPlanificada} → ` : ''}{tarea.fechaObjetivo}
                        </span>
                    )}
                </div>
            )}

            {/* Vista simplificada para modo compacto */}
            {compact && (
                <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-400 truncate max-w-[150px]">{tarea.proyecto?.nombre}</span>
                    <StatusPill status={tarea.estado} size="sm" />
                </div>
            )}
        </div>
    );
};

