import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, X, Users, Calendar, Link2, ChevronDown, Check, Briefcase } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { alerts } from '../../utils/alerts';
import { useAuth } from '../../context/AuthContext';
import type { Proyecto, Prioridad, Esfuerzo, ComportamientoTarea, TipoTarea } from '../../types/modelos';
import type { Empleado } from '../../types/acceso';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentProject?: Proyecto | null;
    projectId?: number;
    onTaskCreated?: () => void;
    onSuccess?: () => void;
    defaultTeam?: Empleado[];
}

const TIPOS_TRABAJO = [
    { value: 'Logistica', label: 'Logística' },
    { value: 'Administrativa', label: 'Administrativa' },
    { value: 'Estrategica', label: 'Estratégica' },
    { value: 'CENAM', label: 'CENAM' },
    { value: 'Otros', label: 'Otros' }
];

export const CreateTaskModal: React.FC<Props> = ({ isOpen, onClose, currentProject, projectId, onTaskCreated, onSuccess, defaultTeam }) => {
    const { user } = useAuth();
    // Form State
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [linkEvidencia, setLinkEvidencia] = useState('');
    const [prioridad, setPrioridad] = useState<Prioridad>('Media');
    const [esfuerzo, setEsfuerzo] = useState<Esfuerzo>('M');
    const [tipoTrabajo, setTipoTrabajo] = useState<TipoTarea>('Administrativa');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [comportamiento, setComportamiento] = useState<ComportamientoTarea>('SIMPLE');

    // Assignee State
    const [searchAsignado, setSearchAsignado] = useState('');
    const [apiResults, setApiResults] = useState<Empleado[]>([]);
    const [gerenciaUsers, setGerenciaUsers] = useState<Empleado[]>([]);
    const [selectedAsignados, setSelectedAsignados] = useState<Empleado[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [areas, setAreas] = useState<string[]>([]);
    const [selectedArea, setSelectedArea] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const idProyecto = currentProject?.idProyecto || projectId;
    const pType = currentProject?.tipo || '';
    const isTypeLocked = pType === 'CENAM' || pType.toLowerCase() === 'administrativo';

    // Load Areas
    useEffect(() => {
        clarityService.getEstructuraUsuarios().then((data) => {
            if (!data) return;
            const distinctAreas = Array.from(new Set(data.map(d => d.area).filter(Boolean))).sort() as string[];
            setAreas(distinctAreas);
        }).catch(err => console.warn('Error loading areas', err));
    }, []);

    // Reset & Initialize
    useEffect(() => {
        if (isOpen) {
            setTitulo('');
            setDescripcion('');
            setLinkEvidencia('');
            setPrioridad('Media');
            setEsfuerzo('M');

            // Default Type Logic based on Project
            let defaultType: TipoTarea = 'Administrativa';
            const pType = currentProject?.tipo || '';

            if (pType === 'CENAM') defaultType = 'CENAM';
            else if (pType.toLowerCase() === 'administrativo') defaultType = 'Administrativa';
            else if (pType === 'Logistica') defaultType = 'Logistica';
            else if (pType === 'Estrategico' || pType === 'Estrategica') defaultType = 'Estrategica';
            else if (pType === 'AMX') defaultType = 'AMX';

            setTipoTrabajo(defaultType);

            setFechaInicio(new Date().toISOString().split('T')[0]);
            setFechaFin(new Date().toISOString().split('T')[0]);
            setComportamiento('SIMPLE');
            setSearchAsignado('');
            setSelectedArea('');

            // Auto-assign logic: if user has no personnel in charge (defaultTeam empty or only includes them)
            // or if they are an 'Empleado' without subordinates.
            if (user) {
                const hasPersonnel = defaultTeam && defaultTeam.length > 0;
                const isOnlyMe = defaultTeam?.length === 1 && (defaultTeam[0].idUsuario === user.idUsuario || defaultTeam[0].carnet === user.carnet);

                if (!hasPersonnel || isOnlyMe) {
                    setSelectedAsignados([{
                        idUsuario: user.idUsuario,
                        nombreCompleto: user.nombreCompleto || user.nombre,
                        carnet: user.carnet,
                        cargo: user.cargo,
                        area: user.departamento || user.area
                    } as any]);
                } else {
                    setSelectedAsignados([]);
                }
            } else {
                setSelectedAsignados([]);
            }

            setApiResults([]);

            // Cargar usuarios de la misma gerencia por defecto
            if (user && isOpen) {
                const g = (user as any).gerencia || (user as any).orgGerencia || (user as any).departamento;
                if (g) {
                    clarityService.getEmpleadosPorGerencia(g)
                        .then(res => {
                            // FIX: TransformInterceptor wraps in { data: [...] }
                            // Unwrap safely regardless of shape
                            const raw = Array.isArray(res) ? res : (res as any)?.data ?? [];
                            const arr = Array.isArray(raw) ? raw : [];
                            const valid = arr.filter((u: any) => u.carnet) as unknown as Empleado[];
                            setGerenciaUsers(valid);
                        })
                        .catch(e => console.error('Error loading management users', e));
                }
            }
        }
    }, [isOpen, user, defaultTeam]);

    // Click Outside Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !inputRef.current?.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter Logic
    const filteredResults = useMemo(() => {
        // Prioridad: 1. API Results (Search), 2. Gerencia Users (Default), 3. Default Team
        let baseList: Empleado[] = [];

        if (searchAsignado.length >= 2 && apiResults.length > 0) {
            baseList = apiResults;
        } else if (gerenciaUsers.length > 0) {
            baseList = gerenciaUsers;
        } else {
            baseList = defaultTeam || [];
        }

        const term = searchAsignado.toLowerCase();

        return baseList.filter(e => {
            const matchesText = !term ||
                (e.nombreCompleto || (e as any).nombre || '').toLowerCase().includes(term) ||
                (e.carnet || '').toLowerCase().includes(term);
            const eArea = (e.area || e.departamento || e.orgDepartamento || e.gerencia || '').toLowerCase();
            const matchesArea = !selectedArea || eArea === selectedArea.toLowerCase();
            return matchesText && matchesArea;
        }).slice(0, 50);
    }, [searchAsignado, apiResults, defaultTeam, selectedArea, gerenciaUsers]);

    const handleSearchAsignado = async (value: string) => {
        setSearchAsignado(value);
        setShowDropdown(true);
        if (value.length >= 2) {
            try {
                const res = await clarityService.buscarEmpleadosAcceso(value);
                setApiResults((res as Empleado[]) || []);
            } catch (err) {
                console.error('Error searching:', err);
                setApiResults([]);
            }
        } else {
            setApiResults([]);
        }
    };

    const handleSelectAsignado = (emp: Empleado) => {
        if (!selectedAsignados.some(a => a.idUsuario === emp.idUsuario)) {
            setSelectedAsignados([...selectedAsignados, emp]);
        }
        setSearchAsignado('');
        setShowDropdown(false);
    };

    const handleSelectAllFiltered = () => {
        const toAdd = filteredResults.filter(f => !selectedAsignados.some(s => s.idUsuario === f.idUsuario));
        setSelectedAsignados([...selectedAsignados, ...toAdd]);
        setShowDropdown(false);
        setSearchAsignado('');
    };

    const handleRemoveAsignado = (idUsuario: number) => {
        setSelectedAsignados(selectedAsignados.filter(a => a.idUsuario !== idUsuario));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo.trim()) return alerts.error('Falta título', 'El título es requerido');
        if (!idProyecto) return alerts.error('Falta proyecto', 'No hay proyecto seleccionado');

        // Logic Auto-select Area if empty
        let targets = [...selectedAsignados];
        if (targets.length === 0 && selectedArea && filteredResults.length > 0) {
            if (await alerts.confirm('Asignación Grupal', `¿Asignar tarea automáticamente a los ${filteredResults.length} miembros del área "${selectedArea}"?`)) {
                targets = [...filteredResults];
                setSelectedAsignados(targets);
            } else {
                return;
            }
        }

        if (targets.length === 0) {
            // Fallback: Si no hay nadie seleccionado, se autoasigna al creador
            targets = [{
                idUsuario: user?.idUsuario,
                nombreCompleto: user?.nombreCompleto || (user as any)?.nombre,
                carnet: user?.carnet,
                cargo: user?.cargo,
                area: (user as any)?.departamento || (user as any)?.area
            } as any];
        }

        setLoading(true);
        try {
            const promises = targets.map(asig => {
                // Asegurar ID válido (fallback a .id si .idUsuario falla)
                const finalId = asig.idUsuario || (asig as any).id;
                if (!finalId) console.warn('Advertencia: Empleado sin ID detectado', asig);

                return clarityService.postTarea({
                    titulo,
                    descripcion,
                    idProyecto: Number(idProyecto),
                    prioridad,
                    esfuerzo,
                    idResponsable: finalId, // Usar el ID validado
                    tipo: tipoTrabajo,
                    comportamiento,
                    fechaInicioPlanificada: fechaInicio || undefined,
                    fechaObjetivo: fechaFin || undefined
                } as any);
            });

            await Promise.all(promises);
            alerts.success('Tarea Creada', `Se han creado ${targets.length} tareas correctamente.`);

            if (onTaskCreated) onTaskCreated();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alerts.error('Error', error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/60 backdrop-blur-md p-4 pt-[5vh] md:pt-[10vh] animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">

                {/* Header Compacto */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm shadow-blue-200"><Plus size={16} strokeWidth={4} /></div>
                            Nueva Tarea
                        </h2>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider ml-10 -mt-1 truncate max-w-[300px]">
                            {currentProject?.nombre || 'Proyecto General'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body Scrollable */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">

                    {/* Título - Más grande e importante */}
                    <div>
                        <input
                            autoFocus
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder="Título de la tarea..."
                            className="w-full text-xl font-bold text-slate-800 placeholder:text-slate-300 border-b-2 border-slate-100 focus:border-blue-500 outline-none py-2 transition-colors bg-white hover:bg-slate-50/50 rounded-t-md px-2"
                        />
                    </div>

                    {/* Responsables */}
                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center mb-1">
                            <span className="flex items-center gap-1"><Users size={12} /> Asignar a ({selectedAsignados.length})</span>
                            <div className="flex gap-2">
                                {selectedArea && (
                                    <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm border border-blue-100">
                                        {selectedArea} <button type="button" onClick={() => setSelectedArea('')}><X size={10} /></button>
                                    </span>
                                )}
                                <div className="relative group/filter hidden"> {/* OCULTO TEMPORALMENTE */}
                                    <select
                                        value={selectedArea}
                                        onChange={(e) => setSelectedArea(e.target.value)}
                                        className="text-[10px] bg-white border border-slate-200 rounded-lg pl-2 pr-6 py-1 text-slate-600 font-bold outline-none cursor-pointer hover:border-blue-300 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="">Filtrar por Área</option>
                                        {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                    <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* BOTÓN DE ACCIÓN RÁPIDA PARA ÁREA (OCULTO) */}
                            {false && selectedArea && filteredResults.length > 0 && selectedAsignados.length === 0 && (
                                <div className="mt-2 animate-in slide-in-from-top-1 fade-in">
                                    <button
                                        type="button"
                                        onClick={handleSelectAllFiltered}
                                        className="w-full py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Users size={14} /> Añadir a los {filteredResults.length} miembros de {selectedArea}
                                    </button>
                                </div>
                            )}
                        </label>

                        <div className="relative">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-sm">
                                <Search size={16} className="text-slate-400 shrink-0" />
                                <div className="flex-1 flex flex-wrap gap-2 min-h-[26px]">
                                    {selectedAsignados.map(asig => (
                                        <span key={asig.idUsuario} className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 animate-in zoom-in-95">
                                            {asig.nombreCompleto?.split(' ')[0] || (asig as any).nombre?.split(' ')[0]}
                                            <button type="button" onClick={() => handleRemoveAsignado(asig.idUsuario!)} className="text-blue-400 hover:text-red-500 transition-colors"><X size={12} /></button>
                                        </span>
                                    ))}
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchAsignado}
                                        onChange={e => handleSearchAsignado(e.target.value)}
                                        onFocus={() => setShowDropdown(true)}
                                        placeholder={selectedAsignados.length === 0 ? "Buscar en toda la organización..." : "Añadir más..."}
                                        className="bg-transparent outline-none text-xs font-semibold text-slate-700 min-w-[200px] flex-1 placeholder:font-normal placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            {/* Dropdown Mejorado */}
                            {showDropdown && (filteredResults.length > 0 || selectedArea) && (
                                <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 max-h-56 overflow-y-auto animate-in slide-in-from-top-2">
                                    {selectedArea && filteredResults.length > 0 && (
                                        <button type="button" onClick={handleSelectAllFiltered} className="w-full text-left px-4 py-3 bg-blue-50/80 text-blue-700 text-[11px] font-bold hover:bg-blue-100 flex items-center gap-2 border-b border-blue-100 sticky top-0 backdrop-blur-sm z-10 transition-colors">
                                            <Users size={14} /> Seleccionar todos ({filteredResults.length})
                                        </button>
                                    )}
                                    {filteredResults.map(emp => {
                                        const isSelected = selectedAsignados.some(s => s.idUsuario === emp.idUsuario);
                                        return (
                                            <button
                                                key={emp.carnet}
                                                type="button"
                                                onClick={() => handleSelectAsignado(emp)}
                                                disabled={isSelected}
                                                className={`w-full text-left px-4 py-2.5 border-b border-slate-50 last:border-0 flex items-center justify-between group transition-colors ${isSelected ? 'bg-slate-50/50 opacity-40' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">

                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-slate-700 truncate group-hover:text-blue-700">{emp.nombreCompleto || (emp as any).nombre}</p>
                                                        <p className="text-[10px] text-slate-400 capitalize font-medium truncate">
                                                            <span className="font-bold text-slate-500">{emp.carnet}</span> • {emp.cargo || 'Sin Cargo'} • {emp.area || emp.gerencia || emp.departamento || 'Sin Área asignada'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isSelected && <Check size={14} className="text-green-500 mr-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* GRID DE CONFIGURACIÓN - Layout Corregido */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* COL 1: FECHAS (Más ancho: 7 columnas) */}
                        <div className="col-span-7 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                                <Calendar size={12} /> Cronograma
                            </label>
                            <div className="flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                <div className="flex-1 relative border-r border-slate-200 pr-2">
                                    <span className="absolute left-2 top-1.5 text-[8px] font-bold text-slate-400 uppercase">Inicio</span>
                                    <input
                                        type="date"
                                        value={fechaInicio}
                                        onChange={e => setFechaInicio(e.target.value)}
                                        className="w-full bg-transparent pt-3 pb-0.5 px-2 text-xs font-bold text-slate-700 outline-none"
                                    />
                                </div>
                                <div className="flex-1 relative pl-2">
                                    <span className="absolute left-2 top-1.5 text-[8px] font-bold text-slate-400 uppercase">Fin</span>
                                    <input
                                        type="date"
                                        value={fechaFin}
                                        onChange={e => setFechaFin(e.target.value)}
                                        className="w-full bg-transparent pt-3 pb-0.5 px-2 text-xs font-bold text-slate-700 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* COL 2: TIPO TRABAJO (5 columnas) */}
                        <div className="col-span-5 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                                <Briefcase size={12} /> Tipo
                            </label>
                            <div className="relative h-[46px]"> {/* Altura fija alineada con fechas */}
                                <select
                                    value={tipoTrabajo}
                                    onChange={e => setTipoTrabajo(e.target.value as TipoTarea)}
                                    disabled={isTypeLocked}
                                    className={`w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-400 appearance-none ${isTypeLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {TIPOS_TRABAJO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Prioridad y Esfuerzo */}
                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {['Alta', 'Media', 'Baja'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPrioridad(p as Prioridad)}
                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${prioridad === p ? 'bg-white shadow-sm text-slate-800 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Esfuerzo</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                {['S', 'M', 'L'].map(e => (
                                    <button
                                        key={e}
                                        type="button"
                                        onClick={() => setEsfuerzo(e as Esfuerzo)}
                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-md transition-all ${esfuerzo === e ? 'bg-white shadow-sm text-slate-800 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="pt-2">
                        <textarea
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                            placeholder="Descripción detallada o notas técnicas..."
                            rows={3}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium text-slate-700 outline-none focus:border-blue-400 resize-none transition-shadow focus:shadow-sm"
                        />
                    </div>

                    {/* Link Evidencia */}
                    <div className="relative">
                        <Link2 size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={linkEvidencia}
                            onChange={e => setLinkEvidencia(e.target.value)}
                            placeholder="Enlace a documentación en Sharepoint o Teams (Opcional)"
                            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-slate-600 outline-none focus:border-blue-400 transition-colors"
                        />
                    </div>

                </form>

                {/* Footer */}
                <div className="p-5 bg-white border-t border-slate-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-10">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-3.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 active:scale-[0.98] transition-all flex justify-center items-center gap-3 shadow-lg shadow-slate-200 disabled:opacity-70"
                    >
                        {loading ? 'Creando Tareas...' : <><Plus size={18} strokeWidth={3} /> CREAR TAREA</>}
                    </button>
                    {selectedAsignados.length > 1 && (
                        <p className="text-center text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-wide">
                            <Users size={12} className="inline mr-1 -mt-0.5" />
                            Se generarán <span className="text-blue-600">{selectedAsignados.length}</span> tareas independientes
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};
