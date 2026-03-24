// Last Modified: 2026-02-18 Sync Fix
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useMiDiaQuery } from '../../../hooks/query/useMiDiaQuery';
import { clarityService } from '../../../services/clarity.service';
import type { Tarea, Bloqueo } from '../../../types/modelos';

import { MiDiaContext, type MiDiaContextType } from './MiDiaContextCore';
export { MiDiaContext, type MiDiaContextType };


const fechaLocalYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const MiDiaProvider: React.FC<{ children: React.ReactNode; userId: number; userCarnet?: string }> = ({
    children,
    userId,
    userCarnet
}) => {
    const [today, setToday] = useState(fechaLocalYYYYMMDD());

    // ✅ IMPORTANTE: el hook debe incluir userId en la queryKey
    const { data, isLoading, revalidarTarea, toggleTarea, isMutating, mutatingTaskId } = useMiDiaQuery(userId, today);

    // ✅ Defaults defensivos (evita crash si data es undefined)
    const safe = data ?? {
        checkin: null,
        tareasSugeridas: [],
        bloqueosActivos: [],
        bloqueosMeCulpan: [],
        backlog: [],
        arrastrados: [], // si no existe en backend, queda vacío
    };

    const checkin = safe.checkin;
    const disponibles: Tarea[] = safe.tareasSugeridas || [];
    const backlog: Tarea[] = safe.backlog || [];
    const bloqueos: Bloqueo[] = safe.bloqueosActivos || [];
    const bloqueosMeCulpan: Bloqueo[] = safe.bloqueosMeCulpan || [];

    // ✅ Si backend no separa arrastrados, NO los dupliques
    const arrastrados: Tarea[] = (safe as any).arrastrados || [];

    const allDisponibles = useMemo(() => {
        const base = [...disponibles, ...backlog, ...arrastrados];

        const unique = Array.from(new Map(base.map(t => [Number(t.idTarea), t])).values());
        unique.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        return unique;
    }, [disponibles, backlog, arrastrados]);

    // ✅ Configuración de Agenda (Cargada una vez)
    const [agendaConfig, setLocalAgendaConfig] = useState({ showGestion: true, showRapida: true });

    const loadConfig = async () => {
        try {
            // Force refresh
            const res = await clarityService.getConfig();
            console.log('[MiDiaContext] Config cargada:', res);
            if (res) {
                setLocalAgendaConfig({
                    showGestion: res.agendaShowGestion ?? true,
                    showRapida: res.agendaShowRapida ?? true
                });
            }
        } catch (e) {
            console.error('[MiDiaContext] Error cargando config:', e);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    const setAgendaConfig = async (newConfig: { showGestion: boolean, showRapida: boolean }) => {
        try {
            await clarityService.setConfig({
                agendaShowGestion: newConfig.showGestion,
                agendaShowRapida: newConfig.showRapida
            });
            // Only update local state AFTER server confirms success
            setLocalAgendaConfig(newConfig);
        } catch (e) {
            console.error('[MiDiaContext] Error guardando config:', e);
            throw e; // Re-throw so UI can show error
        }
    };

    const value = useMemo<MiDiaContextType>(
        () => ({
            loading: isLoading,
            checkin: checkin || null,
            arrastrados,
            bloqueos,
            bloqueosMeCulpan,
            disponibles,
            backlog,
            allDisponibles,
            userId,
            userCarnet,
            today,
            setToday,
            revalidarTarea,
            toggleTarea,
            isMutating,
            mutatingTaskId,
            isSupervisorMode: false,
            agendaConfig,
            setAgendaConfig
        }),
        [
            isLoading,
            checkin,
            arrastrados,
            bloqueos,
            bloqueosMeCulpan,
            disponibles,
            backlog,
            allDisponibles,
            userId,
            userCarnet,
            today,
            revalidarTarea,
            toggleTarea,
            isMutating,
            mutatingTaskId,
            agendaConfig
        ]
    );

    return <MiDiaContext.Provider value={value}>{children}</MiDiaContext.Provider>;
};

export const useMiDiaContext = () => {
    const context = useContext(MiDiaContext);
    if (!context) throw new Error('useMiDiaContext must be used within a MiDiaProvider');
    return context;
};
