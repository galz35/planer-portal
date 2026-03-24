import React, { useState, useEffect, useCallback } from 'react';
import type { Usuario } from '../../types/modelos';
import { alerts } from '../../utils/alerts';
import { clarityService } from '../../services/clarity.service';
import { X, Shield, Users, Plus, Search, Trash2, Eye, UserPlus, Building2, RefreshCw } from 'lucide-react';

interface Props {
    user: Usuario;
    onClose: () => void;
}

export const VisibilityModal: React.FC<Props> = ({ user, onClose }) => {
    // --- State ---
    const [loading, setLoading] = useState(true);
    const [effectiveUsers, setEffectiveUsers] = useState<any[]>([]);
    const [permisosEmpleado, setPermisosEmpleado] = useState<any[]>([]);
    const [permisosArea, setPermisosArea] = useState<any[]>([]);

    // Search
    const [searchMode, setSearchMode] = useState<'people' | 'areas'>('people');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showAddPanel, setShowAddPanel] = useState(false);

    // --- Load all data ---
    const loadAll = useCallback(async () => {
        if (!user.carnet && !user.idUsuario) return;
        setLoading(true);
        try {
            const [effective, pAreas, pPeople] = await Promise.all([
                clarityService.getVisibilidadEfectiva(user.idUsuario),
                user.carnet ? clarityService.getPermisosArea(user.carnet) : Promise.resolve([]),
                user.carnet ? clarityService.getPermisosEmpleado(user.carnet) : Promise.resolve([])
            ]);
            setEffectiveUsers((effective as any[]) || []);
            setPermisosArea(((pAreas as any[]) || []).filter((p: any) => p.activo !== false));
            setPermisosEmpleado(((pPeople as any[]) || []).filter((p: any) => p.activo !== false));
        } catch (error) {
            console.error('Error loading visibility:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // --- Search ---
    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        try {
            if (searchMode === 'areas') {
                const res = await clarityService.buscarNodosAcceso(q);
                setSearchResults((res as any[]) || []);
            } else {
                const res = await clarityService.buscarEmpleadosAcceso(q);
                setSearchResults((res as any[]) || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    // --- Add person or area ---
    const handleAdd = async (item: any) => {
        if (!user.carnet) return;
        try {
            if (searchMode === 'areas') {
                await clarityService.crearPermisoArea({
                    carnetRecibe: user.carnet,
                    idOrgRaiz: String(item.idOrg || item.idorg || '0'),
                    alcance: 'SUBARBOL',
                    tipoAcceso: 'ALLOW',
                    nombreArea: item.descripcion || item.nombre || '',
                    tipoNivel: item.tipo || 'GERENCIA'
                });
                alerts.success('Área agregada', `Ahora puede ver a todos de "${item.descripcion || item.nombre}"`);
            } else {
                if (!item.carnet) { alerts.error('Error', 'La persona no tiene carnet válido'); return; }
                await clarityService.crearPermisoEmpleado({
                    carnetRecibe: user.carnet,
                    carnetObjetivo: item.carnet,
                    tipoAcceso: 'ALLOW'
                });
                alerts.success('Persona agregada', `${item.nombreCompleto || item.nombre} ahora es visible`);
            }
            setSearchQuery('');
            setSearchResults([]);
            loadAll();
        } catch (error) {
            console.error(error);
            alerts.error('Error', 'No se pudo agregar el permiso');
        }
    };

    // --- Remove permission ---
    const handleRemove = async (id: string | number, type: 'area' | 'person', label: string) => {
        if (!(await alerts.confirm('¿Quitar acceso?', `¿Remover visibilidad de "${label}"?`))) return;
        try {
            if (type === 'area') {
                await clarityService.eliminarPermisoArea(id);
            } else {
                await clarityService.eliminarPermisoEmpleado(id);
            }
            alerts.success('Removido', 'Permiso eliminado');
            loadAll();
        } catch (error) {
            console.error(error);
            alerts.error('Error', 'No se pudo eliminar');
        }
    };

    const totalRules = permisosEmpleado.length + permisosArea.length;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>

                {/* ===== HEADER ===== */}
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                                <Eye size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black tracking-tight">Gestión de Visibilidad</h2>
                                <p className="text-sm opacity-80">
                                    {user.nombre || user.nombreCompleto}
                                    <span className="ml-2 opacity-60">({user.carnet || 'Sin carnet'})</span>
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                            <X size={22} />
                        </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-white/10 rounded-xl px-4 py-2">
                            <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Ve a</p>
                            <p className="text-2xl font-black">{effectiveUsers.length} <span className="text-sm font-normal opacity-70">personas</span></p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-2">
                            <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Personas Manuales</p>
                            <p className="text-2xl font-black">{permisosEmpleado.length}</p>
                        </div>
                        <div className="bg-white/10 rounded-xl px-4 py-2">
                            <p className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Áreas Asignadas</p>
                            <p className="text-2xl font-black">{permisosArea.length}</p>
                        </div>
                    </div>
                </div>

                {/* ===== BODY: Two columns ===== */}
                <div className="flex-1 flex overflow-hidden">

                    {/* LEFT: Effective visibility (who they see) */}
                    <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-indigo-500" />
                                <h3 className="text-sm font-black text-slate-700">Personas que puede ver</h3>
                            </div>
                            <button onClick={loadAll} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400" title="Refrescar">
                                <RefreshCw size={14} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs font-medium">Calculando visibilidad...</p>
                                </div>
                            ) : effectiveUsers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                                    <Shield size={40} className="mb-3 opacity-20" />
                                    <p className="font-bold text-sm">Sin visibilidad</p>
                                    <p className="text-xs opacity-60 mt-1 text-center max-w-[200px]">
                                        Este usuario no puede ver a nadie. Agregue personas o áreas desde el panel derecho.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {effectiveUsers.map((u: any, i: number) => (
                                        <div key={u.idUsuario || u.carnet || i}
                                            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-indigo-50/50 transition-colors group border border-transparent hover:border-indigo-100"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                                                    {(u.nombreCompleto || u.nombre || '?')[0]}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{u.nombreCompleto || u.nombre}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-400 font-medium truncate">{u.cargo || 'Colaborador'}</span>
                                                        {u.fuente && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${u.fuente === 'JERARQUIA' ? 'bg-emerald-100 text-emerald-600' :
                                                                u.fuente === 'PERMISO' ? 'bg-violet-100 text-violet-600' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>{u.fuente}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-slate-300 group-hover:text-slate-500 font-mono">{u.carnet}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Rules + Add */}
                    <div className="w-[380px] flex flex-col bg-slate-50/50 overflow-hidden shrink-0">

                        {/* Add Button / Toggle */}
                        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                            {!showAddPanel ? (
                                <button onClick={() => setShowAddPanel(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200"
                                >
                                    <Plus size={16} />
                                    Agregar Persona o Área
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex bg-slate-200 p-0.5 rounded-lg">
                                            <button
                                                onClick={() => { setSearchMode('people'); setSearchQuery(''); setSearchResults([]); }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${searchMode === 'people' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                <UserPlus size={12} /> Persona
                                            </button>
                                            <button
                                                onClick={() => { setSearchMode('areas'); setSearchQuery(''); setSearchResults([]); }}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${searchMode === 'areas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                <Building2 size={12} /> Área
                                            </button>
                                        </div>
                                        <button onClick={() => { setShowAddPanel(false); setSearchQuery(''); setSearchResults([]); }}
                                            className="p-1 hover:bg-slate-300 rounded text-slate-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            autoFocus
                                            placeholder={searchMode === 'areas' ? 'Buscar gerencia, subgerencia, coord...' : 'Buscar nombre de persona...'}
                                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                            value={searchQuery}
                                            onChange={e => handleSearch(e.target.value)}
                                        />
                                        {isSearching && (
                                            <div className="absolute right-3 top-2.5">
                                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Search results */}
                                    {searchResults.length > 0 && (
                                        <div className="bg-white rounded-xl border border-slate-200 max-h-[200px] overflow-y-auto shadow-sm">
                                            {searchResults.map((item: any, i: number) => (
                                                <button key={i}
                                                    onClick={() => handleAdd(item)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${searchMode === 'areas' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                            {searchMode === 'areas' ? <Building2 size={14} /> : <Users size={14} />}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <p className="text-xs font-bold text-slate-700 truncate">{item.descripcion || item.nombreCompleto || item.nombre}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{item.tipo || item.cargo || ''}</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded shrink-0">+ Agregar</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                                        <p className="text-xs text-slate-400 text-center py-2">Sin resultados para "{searchQuery}"</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Active Rules */}
                        <div className="flex-1 overflow-y-auto px-4 py-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                                Reglas Activas ({totalRules})
                            </p>

                            {totalRules === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-400 py-8">
                                    <Shield size={32} className="mb-2 opacity-20" />
                                    <p className="text-xs font-medium text-center">
                                        Sin permisos manuales.<br />
                                        Solo ve subordinados directos.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Area permissions */}
                                    {permisosArea.map((p: any) => (
                                        <div key={`a-${p.id}`} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-emerald-100 group hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                    <Building2 size={14} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-slate-700 truncate">
                                                        {p.nombre_area || p.nodoRaiz?.descripcion || `Área #${p.idorg_raiz}`}
                                                    </p>
                                                    <p className="text-[9px] text-emerald-500 font-bold uppercase">Área completa</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(p.id, 'area', p.nombre_area || 'Área')}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Quitar acceso"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Employee permissions */}
                                    {permisosEmpleado.map((p: any) => (
                                        <div key={`e-${p.id}`} className="flex items-center justify-between px-3 py-2.5 bg-white rounded-xl border border-indigo-100 group hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                                                    {(p.empleadoObjetivo?.nombre || p.carnet_objetivo || '?')[0]}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-slate-700 truncate">
                                                        {p.empleadoObjetivo?.nombreCompleto || p.empleadoObjetivo?.nombre || p.carnet_objetivo}
                                                    </p>
                                                    <p className="text-[9px] text-indigo-500 font-bold uppercase">
                                                        {p.tipo_acceso === 'DENY' ? '🚫 Bloqueado' : 'Persona individual'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemove(p.id, 'person', p.empleadoObjetivo?.nombre || p.carnet_objetivo)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Quitar acceso"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer info */}
                        <div className="px-4 py-3 border-t border-slate-100 bg-white shrink-0">
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                <strong>Subordinados</strong> aparecen automáticamente por jerarquía.
                                Los permisos manuales se muestran arriba y se pueden quitar en cualquier momento.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
