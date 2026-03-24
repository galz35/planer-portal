// Last Modified: 2026-01-24 20:38:55
import React, { useMemo, useState } from 'react';
import { useMemberAgenda } from '../../../hooks/useMemberAgenda';
import { MiDiaContext } from './MiDiaContextCore';

// ✅ Fecha local segura (evita bug UTC)
const fechaLocalYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const MemberAgendaProvider: React.FC<{ children: React.ReactNode; userId: string; userCarnet?: string }> = ({
    children,
    userId,
    userCarnet,
}) => {
    const [today, setToday] = useState(fechaLocalYYYYMMDD());

    // Hook dedicado a cargar datos del usuario TARGET (no el logueado)
    const {
        loading,
        checkin,
        arrastrados,
        bloqueos,
        bloqueosMeCulpan,
        disponibles,
        backlog,
        fetchMiDia,
    } = useMemberAgenda(userCarnet || userId, today);

    const allDisponibles = useMemo(() => {
        const base = [...(disponibles || []), ...(backlog || [])];

        // ✅ únicos por idTarea
        const unique = Array.from(new Map(base.map(t => [Number(t.idTarea), t])).values());

        // ✅ arrastrados primero, luego lo demás sin duplicar
        const arr = arrastrados || [];
        const real = [
            ...arr,
            ...unique.filter(u => !arr.some((a: any) => Number(a.idTarea) === Number(u.idTarea))),
        ];

        // ✅ orden estable
        return real.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    }, [arrastrados, disponibles, backlog]);

    const value = useMemo(
        () => ({
            loading,
            checkin: checkin as any, // Cast temporal para compatibilidad
            arrastrados,
            bloqueos,
            bloqueosMeCulpan,
            disponibles,
            backlog,
            allDisponibles,
            fetchMiDia,
            userId: Number(userId),
            userCarnet,
            today,
            setToday,
            // Agregamos funciones dummy para que no rompa si las vistas las llaman
            revalidarTarea: () => console.warn('Revalidar no disponible en vista de equipo'),
            toggleTarea: () => console.warn('Toggle no disponible en vista de equipo'),
            isSupervisorMode: true,
            agendaConfig: { showGestion: true, showRapida: true },
            setAgendaConfig: async () => { console.warn('Ajustes no disponibles en vista de equipo') }
        }),
        [
            loading,
            checkin,
            arrastrados,
            bloqueos,
            bloqueosMeCulpan,
            disponibles,
            backlog,
            allDisponibles,
            fetchMiDia,
            userId,
            userCarnet,
            today,
        ]
    );

    // Proxy del contexto para reutilizar ExecutionView/MatrixView/etc.
    return <MiDiaContext.Provider value={value as any}>{children}</MiDiaContext.Provider>;
};
