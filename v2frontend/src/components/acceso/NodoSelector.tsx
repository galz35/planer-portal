/**
 * NodoSelector - Componente para seleccionar nodos organizacionales
 * Muestra árbol jerárquico con conteo de empleados y tipos de nodo
 */
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Building2, Users, Folder, FolderOpen, Search, Loader2 } from 'lucide-react';
import { accesoService } from '../../services/acceso.service';

interface NodoTree {
    idOrg: string;
    descripcion: string;
    tipo: string;
    nivel: string | null;
    padre: string | null;
    empleadosDirectos: number;
    empleadosTotal: number;
    hijos: NodoTree[];
}

interface NodoSelectorProps {
    value: string;
    onChange: (idOrg: string, nodo?: NodoTree) => void;
    onPreviewRequest?: (idOrg: string, alcance: 'SUBARBOL' | 'SOLO_NODO') => void;
}

export const NodoSelector: React.FC<NodoSelectorProps> = ({ value, onChange, onPreviewRequest }) => {
    const [tree, setTree] = useState<NodoTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNodo, setSelectedNodo] = useState<NodoTree | null>(null);

    useEffect(() => {
        loadTree();
    }, []);

    const loadTree = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await accesoService.getNodosTree();
            const apiResponse = response.data as any; // Cast to access .data property if types are not inferred correctly
            const data = apiResponse.data || apiResponse; // Try accessing .data, fallback to response body if it's already the array (unlikely but safe)

            if (Array.isArray(data)) {
                setTree(data);
                // Auto-expandir primer nivel
                const firstLevel = new Set(data.map((n: NodoTree) => n.idOrg));
                setExpandedNodes(firstLevel);
            } else {
                setTree([]);
            }
        } catch (err: any) {
            setError(err.message || 'Error cargando organización');
            setTree([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (idOrg: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(idOrg)) {
                newSet.delete(idOrg);
            } else {
                newSet.add(idOrg);
            }
            return newSet;
        });
    };

    const handleSelect = (nodo: NodoTree) => {
        setSelectedNodo(nodo);
        onChange(nodo.idOrg, nodo);
    };

    const getTipoBadge = (tipo: string) => {
        const styles: Record<string, string> = {
            'Gerencia': 'bg-purple-100 text-purple-700',
            'Subgerencia': 'bg-blue-100 text-blue-700',
            'Equipo': 'bg-green-100 text-green-700',
            'Area': 'bg-emerald-100 text-emerald-700',
            'Dirección': 'bg-rose-100 text-rose-700',
        };
        return styles[tipo] || 'bg-slate-100 text-slate-600';
    };

    const filterNodes = (nodes: NodoTree[], term: string): NodoTree[] => {
        if (!term) return nodes;

        return nodes.reduce((acc: NodoTree[], node) => {
            const matches = node.descripcion?.toLowerCase().includes(term.toLowerCase());
            const filteredChildren = filterNodes(node.hijos || [], term);

            if (matches || filteredChildren.length > 0) {
                acc.push({
                    ...node,
                    hijos: filteredChildren
                });
            }
            return acc;
        }, []);
    };

    const renderNode = (nodo: NodoTree, level: number = 0) => {
        const isExpanded = expandedNodes.has(nodo.idOrg);
        const isSelected = value === nodo.idOrg;
        const hasChildren = nodo.hijos && nodo.hijos.length > 0;

        return (
            <div key={nodo.idOrg}>
                <div
                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-all ${isSelected
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'hover:bg-slate-50 border-2 border-transparent'
                        }`}
                    style={{ paddingLeft: `${level * 20 + 12}px` }}
                    onClick={() => handleSelect(nodo)}
                >
                    {/* Expand/Collapse Toggle */}
                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(nodo.idOrg);
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} className="text-slate-400" />
                            ) : (
                                <ChevronRight size={16} className="text-slate-400" />
                            )}
                        </button>
                    ) : (
                        <span className="w-5" />
                    )}

                    {/* Folder Icon */}
                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen size={18} className="text-amber-500" />
                        ) : (
                            <Folder size={18} className="text-amber-500" />
                        )
                    ) : (
                        <Building2 size={18} className="text-slate-400" />
                    )}

                    {/* Node Name */}
                    <span className={`flex-1 text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {nodo.descripcion || 'Sin nombre'}
                    </span>

                    {/* Type Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getTipoBadge(nodo.tipo)}`}>
                        {nodo.tipo || '?'}
                    </span>

                    {/* Employee Count */}
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users size={12} />
                        {nodo.empleadosTotal}
                    </span>
                </div>

                {/* Children */}
                {hasChildren && isExpanded && (
                    <div>
                        {nodo.hijos.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const filteredTree = filterNodes(tree, searchTerm);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
                <span className="ml-2 text-sm text-slate-500">Cargando organización...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
                <button onClick={loadTree} className="ml-2 underline">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar área, gerencia..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Tree */}
            <div className="max-h-[400px] overflow-y-auto p-2">
                {filteredTree.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay nodos disponibles'}
                    </div>
                ) : (
                    filteredTree.map(node => renderNode(node))
                )}
            </div>

            {/* Selected Info */}
            {selectedNodo && (
                <div className="p-3 border-t border-slate-100 bg-indigo-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-bold text-indigo-700">{selectedNodo.descripcion}</div>
                            <div className="text-xs text-indigo-600">
                                {selectedNodo.empleadosTotal} empleados (directos: {selectedNodo.empleadosDirectos})
                            </div>
                        </div>
                        {onPreviewRequest && (
                            <button
                                onClick={() => onPreviewRequest(selectedNodo.idOrg, 'SUBARBOL')}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                            >
                                Ver Empleados
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NodoSelector;
