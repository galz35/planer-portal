import React from 'react';
import { X, Edit, Plus, ChevronDown, Building2, Calendar, Users as UsersIcon, FileText, Eye, Briefcase } from 'lucide-react';
import type { Proyecto } from '../../../types/modelos';
import { UserSelector } from '../../../components/ui/UserSelector';

interface ProjectModalProps {
    isOpen: boolean;
    editingProject: Proyecto | null;
    formData: Partial<Proyecto> & { responsableNombre?: string; modoVisibilidad?: string };
    saving: boolean;
    isUserSelectorOpen: boolean;
    uniqueGerencias: string[];
    formUniqueSubgerencias: string[];
    formUniqueAreas: string[];
    onFormDataChange: (data: Partial<Proyecto> & { responsableNombre?: string; modoVisibilidad?: string }) => void;
    onClose: () => void;
    onSubmit: () => void;
    onUserSelectorOpen: () => void;
    onUserSelectorClose: () => void;
    onUserSelect: (u: any) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
    isOpen, editingProject, formData, saving,
    isUserSelectorOpen, uniqueGerencias, formUniqueSubgerencias, formUniqueAreas,
    onFormDataChange, onClose, onSubmit,
    onUserSelectorOpen, onUserSelectorClose, onUserSelect
}) => {
    if (!isOpen) return null;

    const isEditing = !!editingProject;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
                    {/* Gradient top accent */}
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

                    {/* Header */}
                    <div className="px-8 py-5 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isEditing ? 'bg-gradient-to-br from-violet-500 to-indigo-600 shadow-indigo-200' : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-violet-200'}`}>
                                {isEditing ? <Edit size={22} className="text-white" /> : <Plus size={22} className="text-white" />}
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                    {isEditing ? 'Configurar Proyecto' : 'Nuevo Proyecto'}
                                </h2>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    {isEditing ? 'Modifica los datos del proyecto' : 'Completa los datos para crear tu proyecto'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-8 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">

                        {/* ===== Section 1: Datos Principales ===== */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText size={14} className="text-indigo-500" />
                                <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Datos del Proyecto</span>
                            </div>

                            {/* Nombre */}
                            <div className="space-y-1.5">
                                <label htmlFor="project-name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    Nombre del Proyecto *
                                </label>
                                <input
                                    id="project-name"
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-slate-300"
                                    value={formData.nombre || ''}
                                    onChange={e => onFormDataChange({ ...formData, nombre: e.target.value })}
                                    placeholder="Ej: Transformación Digital 2026"
                                    autoFocus
                                />
                            </div>

                            {/* Descripción */}
                            <div className="space-y-1.5">
                                <label htmlFor="project-desc" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    Objetivo / Descripción
                                </label>
                                <textarea
                                    id="project-desc"
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all resize-none placeholder:text-slate-300"
                                    rows={3}
                                    value={formData.descripcion || ''}
                                    onChange={e => onFormDataChange({ ...formData, descripcion: e.target.value })}
                                    placeholder="Describe el alcance y objetivos del proyecto..."
                                />
                            </div>

                            {/* Tipo + Responsable */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="project-tipo" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                                        <Briefcase size={10} /> Tipo
                                    </label>
                                    <select
                                        id="project-tipo"
                                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                                        value={formData.tipo || 'administrativo'}
                                        onChange={e => onFormDataChange({ ...formData, tipo: e.target.value })}
                                    >
                                        <option value="administrativo">Administrativo</option>
                                        <option value="Operativo">Operativo</option>
                                        <option value="Estrategico">Estratégico</option>
                                        <option value="Logistica">Logística</option>
                                        <option value="AMX">AMX</option>
                                        <option value="CENAM">CENAM</option>
                                        <option value="Especial">Especial</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="project-responsible" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1">
                                        <UsersIcon size={10} /> Responsable
                                    </label>
                                    <button
                                        id="project-responsible"
                                        onClick={onUserSelectorOpen}
                                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center justify-between hover:bg-white hover:border-indigo-300 transition-all text-left"
                                    >
                                        {formData.responsableNombre || formData.responsableCarnet ? (
                                            <span className="truncate text-indigo-700 font-black">
                                                {formData.responsableNombre || formData.responsableCarnet}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 font-normal">Seleccionar...</span>
                                        )}
                                        <ChevronDown size={14} className="text-slate-400 shrink-0" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ===== Section 2: Ubicación Organizacional ===== */}
                        <div className="bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-5 rounded-2xl border border-indigo-100/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 size={14} className="text-indigo-500" />
                                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Ubicación Organizacional</span>
                                </div>
                                {(formData.gerencia || formData.subgerencia || formData.area) && (
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        ✓ Auto-detectado
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label htmlFor="project-gerencia" className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Gerencia</label>
                                    <select
                                        id="project-gerencia"
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        value={formData.gerencia || ''}
                                        onChange={e => onFormDataChange({ ...formData, gerencia: e.target.value, subgerencia: '', area: '' })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {uniqueGerencias.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="project-sub" className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Subgerencia</label>
                                    <select
                                        id="project-sub"
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-40 disabled:bg-slate-50"
                                        value={formData.subgerencia || ''}
                                        onChange={e => onFormDataChange({ ...formData, subgerencia: e.target.value, area: '' })}
                                        disabled={!formData.gerencia}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {formUniqueSubgerencias.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label htmlFor="project-area" className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Área</label>
                                    <select
                                        id="project-area"
                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-40 disabled:bg-slate-50"
                                        value={formData.area || ''}
                                        onChange={e => onFormDataChange({ ...formData, area: e.target.value })}
                                        disabled={!formData.subgerencia}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {formUniqueAreas.map(a => (
                                            <option key={a} value={a}>{a}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ===== Section 3: Visibilidad ===== */}
                        <div className="space-y-3 bg-gradient-to-r from-violet-50/40 to-indigo-50/40 p-5 rounded-2xl border border-violet-100/60">
                            <div className="flex items-center gap-2">
                                <Eye size={14} className="text-violet-500" />
                                <span className="text-[11px] font-black text-violet-600 uppercase tracking-widest">Visibilidad</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'JERARQUIA', icon: '🏢', label: 'Jerarquía', desc: 'Visible según estructura' },
                                    { value: 'COLABORADOR', icon: '👤', label: 'Colaboradores', desc: 'Solo personas que agregues' },
                                    { value: 'JERARQUIA_COLABORADOR', icon: '🏢👤', label: 'Ambos', desc: 'Jerarquía + Colaboradores' },
                                ].map(mode => (
                                    <button
                                        key={mode.value}
                                        type="button"
                                        onClick={() => onFormDataChange({ ...formData, modoVisibilidad: mode.value })}
                                        className={`p-3 rounded-xl border-2 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${formData.modoVisibilidad === mode.value
                                            ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100/50'
                                            : 'border-slate-200 bg-white/60 hover:border-indigo-200 hover:bg-white'
                                            }`}
                                    >
                                        <div className="text-lg mb-1">{mode.icon}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-wider ${formData.modoVisibilidad === mode.value ? 'text-indigo-700' : 'text-slate-600'}`}>
                                            {mode.label}
                                        </div>
                                        <div className="text-[9px] font-medium text-slate-400 mt-0.5 leading-tight">{mode.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ===== Section 4: Fechas ===== */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-amber-500" />
                                <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Cronograma</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="project-start" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        Fecha de Inicio
                                    </label>
                                    <input
                                        id="project-start"
                                        type="date"
                                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                                        value={formData.fechaInicio || ''}
                                        onChange={e => onFormDataChange({ ...formData, fechaInicio: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="project-end" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                        Fecha de Cierre
                                    </label>
                                    <input
                                        id="project-end"
                                        type="date"
                                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                                        value={formData.fechaFin || ''}
                                        onChange={e => onFormDataChange({ ...formData, fechaFin: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <p className="text-[10px] font-bold text-slate-300 hidden sm:block">
                            Los campos con * son obligatorios
                        </p>
                        <div className="flex gap-3 ml-auto">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={saving}
                                className="px-10 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-xl hover:from-indigo-700 hover:to-violet-700 shadow-xl shadow-indigo-200/50 hover:shadow-indigo-300/60 transition-all text-sm disabled:opacity-50 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    isEditing ? 'Guardar Cambios' : 'Crear Proyecto'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <UserSelector
                isOpen={isUserSelectorOpen}
                onClose={onUserSelectorClose}
                onSelect={onUserSelect}
                title="Seleccionar Responsable"
            />
        </>
    );
};
