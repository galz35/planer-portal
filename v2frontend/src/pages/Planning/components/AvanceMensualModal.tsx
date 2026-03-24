import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { clarityService } from '../../../services/clarity.service';
import type { Tarea } from '../../../types/modelos';
import { useToast } from '../../../context/ToastContext';

interface Props {
    task: Tarea;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const AvanceMensualModal: React.FC<Props> = ({ task, isOpen, onClose, onSaved }) => {
    const { showToast } = useToast();
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [porcentaje, setPorcentaje] = useState<number>(0);
    const [comentario, setComentario] = useState('');
    const [acumulado, setAcumulado] = useState(0);
    const [historial, setHistorial] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen && task) {
            loadData();
        }
    }, [isOpen, task, year]);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('[AvanceMensualModal] Cargando datos para tarea:', task.idTarea);
            const data = await clarityService.getAvancesMensuales(task.idTarea);
            console.log('[AvanceMensualModal] Datos recibidos:', data);

            if (data) {
                setAcumulado(data.acumulado || 0);
                setHistorial(data.historial || []);

                // Pre-cargar valor del mes seleccionado si existe
                const existing = (data.historial || []).find(
                    (h: any) => h.anio == year && h.mes == selectedMonth
                );
                if (existing) {
                    setPorcentaje(existing.porcentajeMes);
                } else {
                    setPorcentaje(0);
                }
            }
        } catch (error) {
            console.error('[AvanceMensualModal] Error cargando:', error);
            showToast('Error cargando historial', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (mes: number) => {
        setSelectedMonth(mes);
        const existing = historial.find((h: any) => h.anio == year && h.mes == mes);
        setPorcentaje(existing ? existing.porcentajeMes : 0);
    };

    const handleSave = async () => {
        if (porcentaje < 0 || porcentaje > 100) {
            showToast('El porcentaje debe estar entre 0 y 100', 'error');
            return;
        }

        setSaving(true);
        console.log('[AvanceMensualModal] Guardando:', {
            idTarea: task.idTarea,
            anio: year,
            mes: selectedMonth,
            porcentajeMes: porcentaje,
            comentario
        });

        try {
            const res = await clarityService.postAvanceMensual(task.idTarea, {
                anio: year,
                mes: selectedMonth,
                porcentajeMes: porcentaje,
                comentario: comentario || undefined
            });

            console.log('[AvanceMensualModal] Respuesta:', res);

            if (res) {
                setAcumulado(res.acumulado || 0);
                showToast(`Avance de ${porcentaje}% guardado para ${MESES[selectedMonth - 1]}`, 'success');
                onSaved();
                await loadData(); // Recargar historial
            }
        } catch (error: any) {
            console.error('[AvanceMensualModal] Error guardando:', error);
            showToast('Error al guardar: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={18} />
                                <span className="text-xs font-bold uppercase opacity-80">Avance Mensual</span>
                            </div>
                            <h2 className="text-lg font-bold truncate max-w-[300px]">{task.titulo}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Progreso Global */}
                    <div className="mt-4 bg-white/10 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium opacity-80">Progreso Global Acumulado</span>
                            <span className="text-2xl font-black">{(acumulado || 0).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white/80 transition-all duration-500"
                                style={{ width: `${Math.min(acumulado || 0, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {loading ? (
                        <div className="py-8 flex flex-col items-center text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={24} />
                            <span className="text-sm">Cargando historial...</span>
                        </div>
                    ) : (
                        <>
                            {/* Selector de Año */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Año</label>
                                <div className="flex gap-2">
                                    {[year - 1, year, year + 1].map(y => (
                                        <button
                                            key={y}
                                            onClick={() => setYear(y)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${y === year
                                                ? 'bg-indigo-600 text-white shadow-lg'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            {y}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selector de Mes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    <Calendar size={12} className="inline mr-1" />
                                    Mes a Registrar
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {MESES.map((mes, idx) => {
                                        const mesNum = idx + 1;
                                        // Usa == para permitir coincidencia flexible si el backend devuelve strings
                                        const existingData = historial.find((h: any) => h.anio == year && h.mes == mesNum);
                                        const hasData = !!existingData;

                                        return (
                                            <button
                                                key={mesNum}
                                                onClick={() => handleMonthChange(mesNum)}
                                                className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all relative flex flex-col items-center justify-center min-h-[48px] ${selectedMonth === mesNum
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : hasData
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <span>{mes.substring(0, 3)}</span>
                                                {hasData && (
                                                    <span className={`text-[10px] ${selectedMonth === mesNum ? 'text-indigo-200' : 'text-emerald-600 font-bold'}`}>
                                                        {existingData.porcentajeMes}%
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Input Porcentaje */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Porcentaje de Avance en {MESES[selectedMonth - 1]} {year}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={porcentaje}
                                        onChange={(e) => setPorcentaje(parseFloat(e.target.value) || 0)}
                                        className="w-full text-3xl font-black text-center py-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">%</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 text-center">
                                    Ingresa el avance logrado en este mes específico (no el acumulado)
                                </p>
                            </div>

                            {/* Comentario Opcional */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                                    Comentario (Opcional)
                                </label>
                                <textarea
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none focus:border-indigo-500 outline-none"
                                    rows={2}
                                    placeholder="Notas sobre el avance de este mes..."
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-200"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar Avance
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
