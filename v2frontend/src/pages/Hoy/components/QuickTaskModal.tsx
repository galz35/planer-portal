import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Plus, Users, Calendar, Send, Loader2 } from 'lucide-react';
import { clarityService } from '../../../services/clarity.service';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import type { Empleado } from '../../../types/acceso';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    defaultDate?: string; // YYYY-MM-DD
    onCreated?: () => void;
}

const PRIORIDADES = [
    { value: 'Baja', label: 'Baja', color: 'bg-slate-100 text-slate-600' },
    { value: 'Media', label: 'Media', color: 'bg-blue-100 text-blue-700' },
    { value: 'Alta', label: 'Alta', color: 'bg-rose-100 text-rose-700' },
];

export const QuickTaskModal: React.FC<Props> = ({ isOpen, onClose, defaultDate, onCreated }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    // Form state
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaObjetivo, setFechaObjetivo] = useState(defaultDate || new Date().toISOString().split('T')[0]);
    const [prioridad, setPrioridad] = useState('Media');
    const [loading, setLoading] = useState(false);

    // Sharing state
    const [shareSearch, setShareSearch] = useState('');
    const [shareResults, setShareResults] = useState<Empleado[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<Empleado[]>([]);
    const [showShareDropdown, setShowShareDropdown] = useState(false);
    const [searchingUsers, setSearchingUsers] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setTitulo('');
            setDescripcion('');
            setFechaObjetivo(defaultDate || new Date().toISOString().split('T')[0]);
            setPrioridad('Media');
            setSelectedUsers([]);
            setShareSearch('');
            setShareResults([]);
        }
    }, [isOpen, defaultDate]);

    // Click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowShareDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Debounced user search
    useEffect(() => {
        if (shareSearch.length < 2) {
            setShareResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchingUsers(true);
            try {
                const res = await clarityService.buscarEmpleadosAcceso(shareSearch);
                const raw = Array.isArray(res) ? res : (res as any)?.data ?? [];
                setShareResults(Array.isArray(raw) ? raw : []);
            } catch {
                setShareResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [shareSearch]);

    const filteredResults = useMemo(() => {
        return shareResults.filter(u =>
            !selectedUsers.some(s => s.idUsuario === u.idUsuario) &&
            u.idUsuario !== user?.idUsuario
        ).slice(0, 8);
    }, [shareResults, selectedUsers, user]);

    const addUser = (emp: Empleado) => {
        setSelectedUsers(prev => [...prev, emp]);
        setShareSearch('');
        setShowShareDropdown(false);
    };

    const removeUser = (id: number) => {
        setSelectedUsers(prev => prev.filter(u => u.idUsuario !== id));
    };

    const handleSubmit = async () => {
        if (!titulo.trim()) {
            showToast('El título es requerido', 'error');
            return;
        }

        setLoading(true);
        try {
            // Create the task for the current user (operativo - no project)
            const dto: any = {
                titulo: titulo.trim(),
                descripcion: descripcion.trim() || undefined,
                prioridad,
                fechaObjetivo: fechaObjetivo || undefined,
                fechaInicioPlanificada: fechaObjetivo || undefined,
                tipo: 'Administrativa',
                comportamiento: 'SIMPLE',
                idResponsable: user?.idUsuario,
                coasignados: selectedUsers.map(u => u.idUsuario),
            };

            await clarityService.postTarea(dto);

            const total = 1 + selectedUsers.length;
            showToast(
                total > 1
                    ? `Tarea creada y compartida con ${selectedUsers.length} usuario(s)`
                    : 'Tarea operativa creada',
                'success'
            );

            onCreated?.();
            onClose();
        } catch (err) {
            console.error('Error creating task:', err);
            showToast('Error al crear la tarea', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <Plus size={16} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800">Nueva Tarea Operativa</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Sin proyecto • Tarea personal o compartida</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                            Título *
                        </label>
                        <input
                            type="text"
                            placeholder="Ej: Recepción de documentos, Llamada con proveedor..."
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                            Descripción
                        </label>
                        <textarea
                            placeholder="Detalles opcionales..."
                            rows={2}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all resize-none"
                            value={descripcion}
                            onChange={e => setDescripcion(e.target.value)}
                        />
                    </div>

                    {/* Date + Priority Row */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar size={10} /> Fecha
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                                value={fechaObjetivo}
                                onChange={e => setFechaObjetivo(e.target.value)}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                                Prioridad
                            </label>
                            <div className="flex gap-1">
                                {PRIORIDADES.map(p => (
                                    <button
                                        key={p.value}
                                        onClick={() => setPrioridad(p.value)}
                                        className={`flex-1 px-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${prioridad === p.value
                                            ? `${p.color} border-current shadow-sm scale-105`
                                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Share with Users */}
                    <div className="border-t border-dashed border-slate-200 pt-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Users size={10} /> Compartir con (opcional)
                        </label>

                        {/* Selected Users Chips */}
                        {selectedUsers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedUsers.map(u => (
                                    <span
                                        key={u.idUsuario}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-100"
                                    >
                                        {u.nombreCompleto || (u as any).nombre || u.carnet}
                                        <button onClick={() => removeUser(u.idUsuario!)} className="hover:text-rose-600 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Buscar usuario para compartir..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-all"
                                value={shareSearch}
                                onChange={e => {
                                    setShareSearch(e.target.value);
                                    setShowShareDropdown(true);
                                }}
                                onFocus={() => shareSearch.length >= 2 && setShowShareDropdown(true)}
                            />
                            {searchingUsers && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={14} />
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {showShareDropdown && filteredResults.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150"
                            >
                                {filteredResults.map(u => (
                                    <button
                                        key={u.idUsuario}
                                        onClick={() => addUser(u)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-amber-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 truncate">
                                                {u.nombreCompleto || (u as any).nombre}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                                {u.cargo || u.departamento || u.carnet || ''}
                                            </p>
                                        </div>
                                        <Plus size={14} className="text-amber-500 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {showShareDropdown && shareSearch.length >= 2 && !searchingUsers && filteredResults.length === 0 && (
                            <div className="mt-1 p-3 text-center text-[10px] text-slate-400 font-medium bg-slate-50 rounded-xl">
                                No se encontraron usuarios
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
                    <p className="text-[10px] text-slate-400 font-medium">
                        {selectedUsers.length > 0
                            ? `Se creará para ti + ${selectedUsers.length} usuario(s)`
                            : 'Solo para ti'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-white rounded-xl transition-colors border border-slate-200"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !titulo.trim()}
                            className="px-4 py-2 text-xs font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Send size={14} />
                            )}
                            Crear Tarea
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
