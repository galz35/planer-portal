/**
 * PermisosPage - Gestión de Permisos y Delegaciones
 * 
 * Tabs:
 * 1. Permisos por Área - Acceso a subárboles organizacionales
 * 2. Permisos por Empleado - Acceso puntual a empleados específicos
 * 3. Delegaciones - Heredar visibilidad de otro usuario
 */
import React, { useState, useEffect } from 'react';
import { KeyRound, Building2, User, Users2, Plus, Trash2, Search, RefreshCw, Eye } from 'lucide-react';
import { accesoService } from '../../../services/acceso.service';
import { alerts } from '../../../utils/alerts';
import { NodoSelector } from '../../../components/acceso/NodoSelector';
import type {
    PermisoArea,
    PermisoEmpleado,
    DelegacionVisibilidad,
    CrearPermisoAreaDto,
    CrearPermisoEmpleadoDto,
    CrearDelegacionDto
} from '../../../types/acceso';

type TabType = 'area' | 'empleado' | 'delegacion';

export const PermisosPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('area');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data states
    const [permisosArea, setPermisosArea] = useState<PermisoArea[]>([]);
    const [permisosEmpleado, setPermisosEmpleado] = useState<PermisoEmpleado[]>([]);
    const [delegaciones, setDelegaciones] = useState<DelegacionVisibilidad[]>([]);

    // Modal state
    const [showModal, setShowModal] = useState(false);

    // Form states
    const [formPermisoArea, setFormPermisoArea] = useState<CrearPermisoAreaDto>({
        carnetRecibe: '',
        idOrgRaiz: '',
        tipoPermiso: 'SUBARBOL',
        motivo: ''
    });
    const [previewEmpleados, setPreviewEmpleados] = useState<{ total: number; muestra: any[] } | null>(null);

    const [formPermisoEmpleado, setFormPermisoEmpleado] = useState<CrearPermisoEmpleadoDto>({
        carnetRecibe: '',
        carnetObjetivo: '',
        motivo: ''
    });

    const [formDelegacion, setFormDelegacion] = useState<CrearDelegacionDto>({
        carnetDelegante: '',
        carnetDelegado: '',
        motivo: ''
    });

    // Load data based on active tab
    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            switch (activeTab) {
                case 'area':
                    const resArea = await accesoService.getPermisosArea();
                    const areaData = resArea.data?.data;
                    setPermisosArea(Array.isArray(areaData) ? areaData : []);
                    break;
                case 'empleado':
                    const resEmp = await accesoService.getPermisosEmpleado();
                    const empData = resEmp.data?.data;
                    setPermisosEmpleado(Array.isArray(empData) ? empData : []);
                    break;
                case 'delegacion':
                    const resDel = await accesoService.getDelegaciones();
                    const delData = resDel.data?.data;
                    setDelegaciones(Array.isArray(delData) ? delData : []);
                    break;
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error cargando datos');
            // Reset to empty arrays on error
            setPermisosArea([]);
            setPermisosEmpleado([]);
            setDelegaciones([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            switch (activeTab) {
                case 'area':
                    await accesoService.createPermisoArea(formPermisoArea);
                    setFormPermisoArea({ carnetRecibe: '', idOrgRaiz: '', tipoPermiso: 'SUBARBOL', motivo: '' });
                    break;
                case 'empleado':
                    await accesoService.createPermisoEmpleado(formPermisoEmpleado);
                    setFormPermisoEmpleado({ carnetRecibe: '', carnetObjetivo: '', motivo: '' });
                    break;
                case 'delegacion':
                    await accesoService.createDelegacion(formDelegacion);
                    setFormDelegacion({ carnetDelegante: '', carnetDelegado: '', motivo: '' });
                    break;
            }
            setShowModal(false);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Error creando registro');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!(await alerts.confirm('¿Desactivar permiso?', '¿Estás seguro de que deseas desactivar este permiso?'))) return;

        setLoading(true);
        try {
            switch (activeTab) {
                case 'area':
                    await accesoService.deletePermisoArea(id);
                    break;
                case 'empleado':
                    await accesoService.deletePermisoEmpleado(id);
                    break;
                case 'delegacion':
                    await accesoService.deleteDelegacion(id);
                    break;
            }
            loadData();
        } catch (err: any) {
            setError(err.message || 'Error eliminando registro');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'area' as TabType, label: 'Por Área', icon: Building2, count: permisosArea?.length || 0 },
        { id: 'empleado' as TabType, label: 'Por Empleado', icon: User, count: permisosEmpleado?.length || 0 },
        { id: 'delegacion' as TabType, label: 'Delegaciones', icon: Users2, count: delegaciones?.length || 0 },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <KeyRound className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Control de Acceso</h1>
                        <p className="text-slate-500 text-sm">Gestiona quién puede ver a quién en el sistema</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 underline">Cerrar</button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={16} />
                        Nuevo
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Cargando...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {activeTab === 'area' && (
                                    <>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Receptor</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Nodo Raíz</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Otorgado Por</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                                        <th className="w-16"></th>
                                    </>
                                )}
                                {activeTab === 'empleado' && (
                                    <>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Receptor</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Objetivo</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Motivo</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Otorgado Por</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                                        <th className="w-16"></th>
                                    </>
                                )}
                                {activeTab === 'delegacion' && (
                                    <>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Delegante</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Delegado</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Motivo</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Vigencia</th>
                                        <th className="w-16"></th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeTab === 'area' && permisosArea?.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.carnetRecibe}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.idOrgRaiz}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.tipoPermiso === 'SUBARBOL' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {p.tipoPermiso}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.otorgadoPor}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'empleado' && permisosEmpleado?.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.carnetRecibe}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.carnetObjetivo}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{p.motivo || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.otorgadoPor}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(p.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {activeTab === 'delegacion' && delegaciones?.map((d) => (
                                <tr key={d.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{d.carnetDelegante}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{d.carnetDelegado}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{d.motivo || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {d.fechaInicio ? new Date(d.fechaInicio).toLocaleDateString() : 'Siempre'}
                                        {d.fechaFin && ` - ${new Date(d.fechaFin).toLocaleDateString()}`}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {((activeTab === 'area' && (permisosArea?.length || 0) === 0) ||
                                (activeTab === 'empleado' && (permisosEmpleado?.length || 0) === 0) ||
                                (activeTab === 'delegacion' && (delegaciones?.length || 0) === 0)) && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                            No hay registros. Haz clic en "Nuevo" para crear uno.
                                        </td>
                                    </tr>
                                )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">
                            Nuevo {activeTab === 'area' ? 'Permiso por Área' : activeTab === 'empleado' ? 'Permiso por Empleado' : 'Delegación'}
                        </h2>

                        <div className="space-y-4">
                            {activeTab === 'area' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Carnet Receptor *</label>
                                        <input
                                            type="text"
                                            value={formPermisoArea.carnetRecibe}
                                            onChange={(e) => setFormPermisoArea({ ...formPermisoArea, carnetRecibe: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ej: EMP001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Área/Nodo Organizacional *</label>
                                        <NodoSelector
                                            value={formPermisoArea.idOrgRaiz}
                                            onChange={(idOrg, _nodo) => {
                                                setFormPermisoArea({ ...formPermisoArea, idOrgRaiz: idOrg });
                                                // Auto-cargar preview
                                                if (idOrg) {
                                                    accesoService.previewEmpleadosPorNodo(idOrg, formPermisoArea.tipoPermiso || 'SUBARBOL')
                                                        .then(res => {
                                                            const d = res.data as any;
                                                            if (d) setPreviewEmpleados({ total: d.total || 0, muestra: d.muestra || [] });
                                                        })
                                                        .catch(() => setPreviewEmpleados(null));
                                                }
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Alcance</label>
                                        <select
                                            value={formPermisoArea.tipoPermiso}
                                            onChange={(e) => {
                                                const alcance = e.target.value as 'SUBARBOL' | 'SOLO_NODO';
                                                setFormPermisoArea({ ...formPermisoArea, tipoPermiso: alcance });
                                                // Actualizar preview con nuevo alcance
                                                if (formPermisoArea.idOrgRaiz) {
                                                    accesoService.previewEmpleadosPorNodo(formPermisoArea.idOrgRaiz, alcance)
                                                        .then(res => {
                                                            const d = res.data as any;
                                                            if (d) setPreviewEmpleados({ total: d.total || 0, muestra: d.muestra || [] });
                                                        })
                                                        .catch(() => setPreviewEmpleados(null));
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="SUBARBOL">SUBÁRBOL (incluye hijos)</option>
                                            <option value="SOLO_NODO">SOLO ESTE NODO (sin hijos)</option>
                                        </select>
                                    </div>
                                    {previewEmpleados && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-2 text-blue-700 font-medium text-sm mb-2">
                                                <Eye size={16} />
                                                El receptor podrá ver <strong>{previewEmpleados.total}</strong> empleados
                                            </div>
                                            {previewEmpleados.muestra.length > 0 && (
                                                <div className="text-xs text-blue-600 max-h-24 overflow-y-auto">
                                                    {previewEmpleados.muestra.slice(0, 5).map((e: any, i: number) => (
                                                        <div key={i}>{e.nombreCompleto || e.nombre} - {e.cargo}</div>
                                                    ))}
                                                    {previewEmpleados.total > 5 && <div className="italic">...y {previewEmpleados.total - 5} más</div>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                                        <input
                                            type="text"
                                            value={formPermisoArea.motivo || ''}
                                            onChange={(e) => setFormPermisoArea({ ...formPermisoArea, motivo: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Razón del permiso"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'empleado' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Carnet Receptor *</label>
                                        <input
                                            type="text"
                                            value={formPermisoEmpleado.carnetRecibe}
                                            onChange={(e) => setFormPermisoEmpleado({ ...formPermisoEmpleado, carnetRecibe: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Quién recibe el permiso"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Carnet Objetivo *</label>
                                        <input
                                            type="text"
                                            value={formPermisoEmpleado.carnetObjetivo}
                                            onChange={(e) => setFormPermisoEmpleado({ ...formPermisoEmpleado, carnetObjetivo: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="A quién puede ver"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                                        <input
                                            type="text"
                                            value={formPermisoEmpleado.motivo || ''}
                                            onChange={(e) => setFormPermisoEmpleado({ ...formPermisoEmpleado, motivo: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'delegacion' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Carnet Delegante *</label>
                                        <input
                                            type="text"
                                            value={formDelegacion.carnetDelegante}
                                            onChange={(e) => setFormDelegacion({ ...formDelegacion, carnetDelegante: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Quién delega su visibilidad"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Carnet Delegado *</label>
                                        <input
                                            type="text"
                                            value={formDelegacion.carnetDelegado}
                                            onChange={(e) => setFormDelegacion({ ...formDelegacion, carnetDelegado: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Quién recibe la visibilidad"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                                        <input
                                            type="text"
                                            value={formDelegacion.motivo || ''}
                                            onChange={(e) => setFormDelegacion({ ...formDelegacion, motivo: e.target.value })}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Ej: Vacaciones, Secretaria"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? 'Creando...' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermisosPage;
