import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Folder, FileText, AlertTriangle, Search, CheckCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { adminService } from '../../services/admin.service';
import { alerts } from '../../utils/alerts';

interface DeletedItem {
    id: number;
    tipo: 'Proyecto' | 'Tarea';
    nombre: string;
    fechaEliminacion: string;
    eliminadoPor: string;
    proyecto?: string;
}

export const RecycleBinPage: React.FC = () => {
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'Proyecto' | 'Tarea'>('all');
    const [search, setSearch] = useState('');
    const [restoring, setRestoring] = useState<number | null>(null);
    const { showToast } = useToast();

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await adminService.getDeletedItems();
            setItems(data || []);
        } catch (e) {
            console.error(e);
            showToast('Error cargando papelera', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleRestore = async (item: DeletedItem) => {
        if (!await alerts.confirm(`¿Restaurar ${item.tipo.toLowerCase()} "${item.nombre}"?`)) return;

        setRestoring(item.id);
        try {
            await adminService.restoreItem(item.tipo, item.id);
            showToast(`${item.tipo} restaurado correctamente`, 'success');
            setItems(prev => prev.filter(i => !(i.id === item.id && i.tipo === item.tipo)));
        } catch (e) {
            showToast('Error al restaurar', 'error');
        } finally {
            setRestoring(null);
        }
    };

    const filteredItems = items.filter(i => {
        if (filter !== 'all' && i.tipo !== filter) return false;
        if (search && !i.nombre.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const stats = {
        proyectos: items.filter(i => i.tipo === 'Proyecto').length,
        tareas: items.filter(i => i.tipo === 'Tarea').length
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Trash2 className="text-rose-500" size={28} />
                        Papelera de Reciclaje
                    </h1>
                    <p className="text-slate-500 text-sm">Elementos eliminados que pueden ser restaurados</p>
                </div>

                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
                        <Folder size={16} className="text-purple-600" />
                        <span className="font-bold text-purple-700">{stats.proyectos}</span>
                        <span className="text-xs text-purple-500">Proyectos</span>
                    </div>
                    <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <span className="font-bold text-blue-700">{stats.tareas}</span>
                        <span className="text-xs text-blue-500">Tareas</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['all', 'Proyecto', 'Tarea'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filter === f ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {f === 'all' ? 'Todos' : f + 's'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-amber-800">Protección contra eliminación activada</p>
                    <p className="text-xs text-amber-600">
                        Los proyectos y tareas no se eliminan permanentemente. Puedes restaurarlos en cualquier momento desde esta página.
                    </p>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-16 text-slate-400 animate-pulse">Cargando elementos...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
                    <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600">Papelera vacía</h3>
                    <p className="text-slate-400 text-sm">No hay elementos eliminados</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase">Tipo</th>
                                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase">Nombre</th>
                                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase hidden md:table-cell">Proyecto</th>
                                <th className="text-left py-3 px-4 font-bold text-slate-500 text-xs uppercase hidden md:table-cell">Eliminado</th>
                                <th className="text-right py-3 px-4 font-bold text-slate-500 text-xs uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map(item => (
                                <tr key={`${item.tipo}-${item.id}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${item.tipo === 'Proyecto' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.tipo === 'Proyecto' ? <Folder size={12} /> : <FileText size={12} />}
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-medium text-slate-800 truncate max-w-[200px]">{item.nombre}</td>
                                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{item.proyecto || '-'}</td>
                                    <td className="py-3 px-4 text-slate-400 text-xs hidden md:table-cell">
                                        {item.fechaEliminacion ? new Date(item.fechaEliminacion).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleRestore(item)}
                                            disabled={restoring === item.id}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                        >
                                            {restoring === item.id ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <RotateCcw size={14} />
                                            )}
                                            Restaurar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
