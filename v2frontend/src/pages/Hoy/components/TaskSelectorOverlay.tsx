import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import type { Tarea } from '../../../types/modelos';
import { X, CheckCircle2, Search, Plus } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface Props {
    disponibles: Tarea[];
    onSelect: (task: Tarea) => void;
    onClose: () => void;
    isSelected: (id: number) => boolean;
    onQuickAdd: (
        title: string,
        type: 'Entrego' | 'Avanzo' | 'Extra',
        index: number,
        projectId?: number
    ) => Promise<void>;
    selectionContext: { type: 'Entrego' | 'Avanzo' | 'Extra'; index: number };
    projects?: { idProyecto: number; nombre: string }[];
    defaultProjectId?: number | '';
}

export const TaskSelectorOverlay: React.FC<Props> = ({
    disponibles,
    onSelect,
    onClose,
    isSelected,
    onQuickAdd,
    selectionContext,
    projects = [],
    defaultProjectId,
}) => {
    const [quickVal, setQuickVal] = useState('');
    const [creationProjectId, setCreationProjectId] = useState<number | ''>(defaultProjectId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { showToast } = useToast();

    // ✅ Cerrar con ESC (el footer lo menciona)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const handleQuickAddLocal = async () => {
        const val = quickVal.trim();
        if (!val) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onQuickAdd(
                val,
                selectionContext.type,
                selectionContext.index,
                creationProjectId !== '' ? creationProjectId : undefined
            );
            showToast('Tarea rápida creada', 'success');
            // ✅ normalmente el padre desmonta/cierra el overlay
        } catch (error) {
            showToast('Error al crear tarea', 'error');
            setIsSubmitting(false);
        }
    };

    const getDaysActive = (dateStr?: string | Date) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return Math.max(0, Math.floor(diff / (1000 * 3600 * 24)));
    };

    // ✅ Mapa de colores para tipo de tarea
    const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
        Estrategica: { bg: 'bg-violet-100', text: 'text-violet-700' },
        Administrativa: { bg: 'bg-sky-100', text: 'text-sky-700' },
        Logistica: { bg: 'bg-teal-100', text: 'text-teal-700' },
        AMX: { bg: 'bg-orange-100', text: 'text-orange-700' },
        Operativo: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
        CENAM: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
        Otros: { bg: 'bg-slate-100', text: 'text-slate-500' },
    };

    // ✅ Filtrado + orden alfabético memoizado
    const disponiblesFiltradas = useMemo(() => {
        const q = quickVal.trim().toLowerCase();
        return disponibles
            .filter(t => !isSelected(t.idTarea))
            .filter(t => {
                if (!q) return true;
                return (
                    (t.titulo || '').toLowerCase().includes(q) ||
                    ((t.proyecto?.nombre || '').toLowerCase().includes(q)) ||
                    ((t.tipo || '').toLowerCase().includes(q))
                );
            })
            .sort((a, b) => (a.titulo || '').localeCompare(b.titulo || '', 'es', { sensitivity: 'base' }));
    }, [disponibles, isSelected, quickVal]);

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] z-[9999] flex items-start justify-center p-3 md:p-6 pt-[8vh] animate-fade-in"
            onClick={onClose}
        >
            {/* ✅ MÁS COMPACTO: max-w-lg (antes 2xl), radios/paddings menores, altura menor */}
            <div
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[78vh] flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header compacto */}
                <div className="px-4 py-3 border-b flex justify-between items-center bg-white shrink-0">
                    <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight leading-tight">
                            Seleccionar Tarea
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 leading-tight">
                            ¿En qué trabajarás? —{' '}
                            <span className="text-indigo-600 font-bold uppercase">{selectionContext.type}</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Barra búsqueda compacta */}
                <div className="px-4 py-3 bg-slate-50/50 border-b">
                    <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-50 transition-all flex items-center gap-2 shadow-sm">
                        <Search size={16} className="text-slate-400 shrink-0" />

                        <select
                            value={creationProjectId}
                            onChange={(e) => setCreationProjectId(e.target.value ? Number(e.target.value) : '')}
                            className="bg-slate-50 text-[11px] font-extrabold text-slate-700 outline-none cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border-none max-w-[120px] truncate"
                            title="Proyecto Destino"
                            disabled={isSubmitting}
                        >
                            <option value="">📥 INBOX</option>
                            {projects.map((p) => (
                                <option key={p.idProyecto} value={p.idProyecto}>
                                    {p.nombre}
                                </option>
                            ))}
                        </select>

                        <input
                            autoFocus
                            type="text"
                            disabled={isSubmitting}
                            value={quickVal}
                            onChange={(e) => setQuickVal(e.target.value)}
                            placeholder={isSubmitting ? 'Creando...' : 'Buscar o crear...'}
                            className={`flex-1 bg-transparent outline-none text-sm font-semibold text-slate-800 placeholder:text-slate-400 ${isSubmitting ? 'opacity-50 cursor-wait' : ''
                                }`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuickAddLocal();
                                }
                            }}
                        />

                        {/* ✅ Botón mini (icono) en vez de botón grande */}
                        <button
                            type="button"
                            onClick={handleQuickAddLocal}
                            disabled={!quickVal.trim() || isSubmitting}
                            className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="Crear"
                            aria-label="Crear"
                        >
                            <Plus size={16} />
                        </button>

                        {/* Spinner pequeño */}
                        {isSubmitting && (
                            <div className="ml-1">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Listado compacto */}
                <div className="overflow-y-auto px-3 py-2 space-y-2 bg-white flex-1 custom-scrollbar">
                    {disponiblesFiltradas.map((t, i) => (
                        <button
                            key={t.idTarea}
                            type="button"
                            onClick={() => onSelect(t)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all group relative overflow-hidden
                ${i < 3 && !quickVal
                                    ? 'bg-indigo-50/30 border-indigo-100 hover:border-indigo-300'
                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <span className="text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                            📁 {t.proyectoNombre || t.proyecto?.nombre || 'Inbox'}
                                        </span>

                                        {t.tipo && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${TIPO_COLORS[t.tipo]?.bg || 'bg-slate-100'} ${TIPO_COLORS[t.tipo]?.text || 'text-slate-500'}`}>
                                                {t.tipo}
                                            </span>
                                        )}

                                        {t.prioridad === 'Alta' && (
                                            <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                                                Alta
                                            </span>
                                        )}

                                        {i < 3 && !quickVal && (
                                            <span className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black uppercase tracking-tighter">
                                                Sugerida
                                            </span>
                                        )}
                                    </div>

                                    {/* ✅ título más chico */}
                                    <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        {t.titulo}
                                    </p>

                                    {/* ✅ meta en una línea */}
                                    <div className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        {getDaysActive(t.fechaCreacion)}d activa
                                    </div>
                                </div>

                                {/* ✅ icono más pequeño y sin “bloque grande” */}
                                <div className="opacity-0 group-hover:opacity-100 transition-all hidden md:flex">
                                    <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-200">
                                        <CheckCircle2 size={18} />
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}

                    {disponiblesFiltradas.length === 0 && (
                        <div className="py-14 text-center flex flex-col items-center gap-3">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={26} className="text-slate-200" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Todo listo</h4>
                                <p className="text-slate-400 font-medium text-xs">
                                    No tienes tareas pendientes que coincidan.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer compacto */}
                <div className="px-4 py-2 bg-slate-50 border-t flex justify-between items-center shrink-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Disponibles: {disponiblesFiltradas.length}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400 italic">ESC para cerrar</p>
                </div>
            </div>
        </div>,
        document.body
    );
};
