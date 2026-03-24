import React, { useState, useEffect } from 'react';
import { clarityService } from '../../../services/clarity.service';
import { Bell, Clock, AlertTriangle, Calendar, Check, Loader2, ChevronRight, Flame } from 'lucide-react';
import type { Tarea } from '../../../types/modelos';

interface Props {
    userId: number;
    onUpdate?: () => void;
}

export const AlertasWidget: React.FC<Props> = ({ userId, onUpdate }) => {
    const [loading, setLoading] = useState(true);
    const [vencenHoy, setVencenHoy] = useState<Tarea[]>([]);
    const [atrasadas, setAtrasadas] = useState<Tarea[]>([]);
    const [proximosDias, setProximosDias] = useState<Tarea[]>([]);
    const [sinFecha, setSinFecha] = useState<Tarea[]>([]);
    const [saving, setSaving] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const tasks = await clarityService.getMisTareas({});
            if (!tasks) { setLoading(false); return; }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayStr = today.toISOString().split('T')[0];

            const manana = new Date(today);
            manana.setDate(manana.getDate() + 1);
            const mananaStr = manana.toISOString().split('T')[0];

            const tresDias = new Date(today);
            tresDias.setDate(tresDias.getDate() + 3);
            const tresDiasStr = tresDias.toISOString().split('T')[0];

            const activas = tasks.filter((t: Tarea) => !['Hecha', 'Descartada'].includes(t.estado));

            // Vencen hoy
            setVencenHoy(activas.filter((t: Tarea) => t.fechaObjetivo?.split('T')[0] === todayStr));

            // Atrasadas
            setAtrasadas(activas.filter((t: Tarea) => {
                const fecha = t.fechaObjetivo?.split('T')[0];
                return fecha && fecha < todayStr;
            }).sort((a, b) => (a.fechaObjetivo || '').localeCompare(b.fechaObjetivo || '')));

            // Próximos 3 días
            setProximosDias(activas.filter((t: Tarea) => {
                const fecha = t.fechaObjetivo?.split('T')[0];
                return fecha && fecha >= mananaStr && fecha <= tresDiasStr;
            }));

            // Sin fecha
            setSinFecha(activas.filter((t: Tarea) => !t.fechaObjetivo));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (taskId: number) => {
        setSaving(taskId);
        try {
            await clarityService.actualizarTarea(taskId, { estado: 'Hecha' } as any);
            await loadData();
            onUpdate?.();
        } finally {
            setSaving(null);
        }
    };

    const handlePosponer = async (taskId: number) => {
        setSaving(taskId);
        try {
            const manana = new Date();
            manana.setDate(manana.getDate() + 1);
            await clarityService.actualizarTarea(taskId, { fechaObjetivo: manana.toISOString().split('T')[0] } as any);
            await loadData();
            onUpdate?.();
        } finally {
            setSaving(null);
        }
    };

    const getDaysOverdue = (dateStr?: string) => {
        if (!dateStr) return 0;
        const date = new Date(dateStr);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getPrioColor = (prio: string) => {
        if (prio === 'Alta') return 'border-l-red-500 bg-red-50';
        if (prio === 'Media') return 'border-l-amber-500 bg-amber-50';
        return 'border-l-gray-300 bg-gray-50';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <Loader2 className="animate-spin mx-auto text-amber-500 mb-2" size={24} />
                <p className="text-gray-400 text-sm">Cargando alertas...</p>
            </div>
        );
    }

    const totalAlertas = vencenHoy.length + atrasadas.length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className={`${totalAlertas > 0 ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'} text-white p-4 rounded-xl`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Bell size={20} /> Centro de Alertas
                        </h2>
                        <p className="text-sm opacity-80">Tareas que necesitan atención</p>
                    </div>
                    <div className="text-right">
                        <p className="text-3xl font-black">{totalAlertas}</p>
                        <p className="text-sm opacity-80">{totalAlertas > 0 ? 'urgentes' : 'todo bien ✓'}</p>
                    </div>
                </div>
            </div>

            {/* Sin alertas */}
            {totalAlertas === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                    <Check size={48} className="mx-auto text-green-500 mb-3" />
                    <h3 className="text-lg font-bold text-green-700">¡Estás al día!</h3>
                    <p className="text-sm text-green-600">No tienes tareas urgentes ni atrasadas</p>
                </div>
            )}

            {/* Atrasadas */}
            {atrasadas.length > 0 && (
                <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
                            <AlertTriangle size={14} /> Atrasadas ({atrasadas.length})
                        </h3>
                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">URGENTE</span>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                        {atrasadas.map(task => {
                            const days = getDaysOverdue(task.fechaObjetivo || undefined);
                            return (
                                <div key={task.idTarea} className={`p-3 border-l-4 ${getPrioColor(task.prioridad)} hover:bg-gray-50`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 truncate">{task.titulo}</h4>
                                            <div className="flex items-center gap-2 mt-1 text-xs">
                                                <span className="text-red-600 font-bold flex items-center gap-1">
                                                    <Flame size={12} /> {days} días atrasada
                                                </span>
                                                <span className="text-gray-400">{task.prioridad}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => handleComplete(task.idTarea)}
                                                disabled={saving === task.idTarea}
                                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                                title="Completar"
                                            >
                                                {saving === task.idTarea ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handlePosponer(task.idTarea)}
                                                disabled={saving === task.idTarea}
                                                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                                                title="Posponer a mañana"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Vencen Hoy */}
            {vencenHoy.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                        <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                            <Clock size={14} /> Vencen Hoy ({vencenHoy.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {vencenHoy.map(task => (
                            <div key={task.idTarea} className={`p-3 border-l-4 ${getPrioColor(task.prioridad)} hover:bg-gray-50`}>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-800 truncate">{task.titulo}</h4>
                                        <span className="text-xs text-gray-400">{task.prioridad}</span>
                                    </div>
                                    <button
                                        onClick={() => handleComplete(task.idTarea)}
                                        disabled={saving === task.idTarea}
                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                                    >
                                        {saving === task.idTarea ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Próximos días */}
            {proximosDias.length > 0 && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                        <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <Calendar size={14} /> Próximos 3 Días ({proximosDias.length})
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {proximosDias.map(task => (
                            <div key={task.idTarea} className="p-3 hover:bg-gray-50">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-gray-700 truncate">{task.titulo}</h4>
                                        <span className="text-xs text-gray-400">{task.fechaObjetivo?.split('T')[0]}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${task.prioridad === 'Alta' ? 'bg-red-100 text-red-600' :
                                        task.prioridad === 'Media' ? 'bg-amber-100 text-amber-600' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>{task.prioridad}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sin fecha */}
            {sinFecha.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-600 flex items-center gap-2">
                            <Calendar size={14} /> Sin Fecha Asignada ({sinFecha.length})
                        </h3>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                        {sinFecha.slice(0, 10).map(task => (
                            <span key={task.idTarea} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {task.titulo.length > 25 ? task.titulo.substring(0, 25) + '...' : task.titulo}
                            </span>
                        ))}
                        {sinFecha.length > 10 && (
                            <span className="text-xs text-gray-400">+{sinFecha.length - 10} más</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
