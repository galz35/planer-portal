import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, Plus, Search, Loader2 } from 'lucide-react';
import type { Tarea } from '../../types/modelos';
import type { Empleado } from '../../types/acceso';
import { clarityService } from '../../services/clarity.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface Props {
    task: Tarea;
    onUpdate: () => void;
}

export const TaskParticipantsPanel: React.FC<Props> = ({ task, onUpdate }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const [coasignados, setCoasignados] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Empleado[]>([]);
    const [searching, setSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Al mount, leer asignados de la tarea que sean colaboradores
    useEffect(() => {
        if (task.asignados) {
            const cols = task.asignados.filter(a => a.tipo === 'Colaborador');
            setCoasignados(cols);
        } else {
            setCoasignados([]);
        }
    }, [task]);

    useEffect(() => {
        if (search.length < 2) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await clarityService.buscarEmpleadosAcceso(search);
                const raw = Array.isArray(res) ? res : (res as any)?.data ?? [];
                setResults(Array.isArray(raw) ? raw : []);
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const filteredResults = useMemo(() => {
        return results.filter(u =>
            !coasignados.some(c => c.idUsuario === u.idUsuario) &&
            u.idUsuario !== task.idResponsable
        ).slice(0, 5);
    }, [results, coasignados, task.idResponsable]);

    const addParticipant = async (emp: Empleado) => {
        const newCoasignados = [...coasignados, { idUsuario: emp.idUsuario, usuario: { nombreCompleto: emp.nombreCompleto, carnet: emp.carnet, cargo: emp.cargo }, tipo: 'Colaborador' }];
        setCoasignados(newCoasignados);
        setSearch('');
        await sync(newCoasignados.map(c => c.idUsuario));
    };

    const removeParticipant = async (idUsuario: number) => {
        const newCoasignados = coasignados.filter(c => c.idUsuario !== idUsuario);
        setCoasignados(newCoasignados);
        await sync(newCoasignados.map(c => c.idUsuario));
    };

    const sync = async (userIds: number[]) => {
        setIsSaving(true);
        try {
            await clarityService.syncParticipantes(task.idTarea, userIds);
            showToast('Participantes actualizados', 'success');
            onUpdate(); // Refrescar tarea
        } catch (e) {
            showToast('Error al actualizar participantes', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const canEdit = task.idCreador === user?.idUsuario || task.idResponsable === user?.idUsuario || user?.rolGlobal === 'Admin';

    return (
        <div className={`space-y-4 pt-4 border-t border-slate-100 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} /> Participantes / Compartido con
            </h4>

            <div className="flex flex-wrap gap-2">
                {/* Dueño Principal (Responsable) */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 text-[11px] font-bold">
                    <span>👑 {task.responsableNombre || 'Sin asignar'}</span>
                </div>

                {
                    coasignados.map(c => (
                        <div key={c.idUsuario} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-[11px] font-medium group">
                            <span className="truncate max-w-[120px]">{c.usuario?.nombreCompleto?.split(' ')[0] || c.carnet}</span>
                            {canEdit && (
                                <button onClick={() => removeParticipant(c.idUsuario)} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    ))
                }
            </div >

            {canEdit && (
                <div className="relative mt-2">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 focus-within:ring-2 focus-within:border-amber-400 focus-within:ring-amber-200 overflow-hidden">
                        <Search size={14} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar para añadir participante..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent px-2 py-2 text-[11px] font-medium outline-none"
                        />
                        {searching && <Loader2 size={12} className="animate-spin text-amber-500" />}
                    </div>

                    {search.length >= 2 && (
                        <div className="absolute top-10 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden text-xs max-h-48 overflow-y-auto">
                            {filteredResults.length > 0 ? (
                                filteredResults.map(u => (
                                    <button
                                        key={u.idUsuario}
                                        onClick={() => addParticipant(u)}
                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-700">{u.nombreCompleto}</div>
                                            <div className="text-[9px] text-slate-400">{u.cargo}</div>
                                        </div>
                                        <Plus size={14} className="text-amber-500" />
                                    </button>
                                ))
                            ) : search.length >= 3 && !searching ? (
                                <div className="p-3 text-center text-slate-500 italic">No se encontraron más resultados</div>
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </div >
    );
};
