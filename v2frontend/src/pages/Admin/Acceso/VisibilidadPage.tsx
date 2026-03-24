/**
 * VisibilidadPage - Consultar visibilidad de empleados
 * 
 * Permite buscar un empleado y ver:
 * - A quién puede ver
 * - Quién puede verlo a él
 * - Sus actores efectivos (delegaciones)
 * - Verificar si puede ver a otro empleado específico
 */
import React, { useState } from 'react';
import { Eye, Search, Users, CheckCircle, XCircle, RefreshCw, User, ArrowRight } from 'lucide-react';
import { accesoService } from '../../../services/acceso.service';
import type { Empleado } from '../../../types/acceso';

export const VisibilidadPage: React.FC = () => {
    // Search state
    const [searchCarnet, setSearchCarnet] = useState('');
    const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Empleado | null>(null);

    // Data states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visibilidad, setVisibilidad] = useState<string[]>([]);
    const [empleadosVisibles, setEmpleadosVisibles] = useState<Empleado[]>([]);
    const [actores, setActores] = useState<string[]>([]);

    // Verification state
    const [carnetVerificar, setCarnetVerificar] = useState('');
    const [verificacionResultado, setVerificacionResultado] = useState<{ puedeVer: boolean; razon?: string } | null>(null);

    const buscarEmpleado = async () => {
        if (!searchCarnet.trim()) return;

        setLoading(true);
        setError(null);
        setVisibilidad([]);
        setEmpleadosVisibles([]);
        setActores([]);
        setVerificacionResultado(null);

        try {
            // Obtener datos del empleado
            const resEmp = await accesoService.getEmpleado(searchCarnet.trim());
            if (resEmp.data?.data) {
                setEmpleadoSeleccionado(resEmp.data.data);
            }

            // Obtener visibilidad
            // Obtener visibilidad
            const resVis = await accesoService.getVisibilidad(searchCarnet.trim());
            if (resVis.data?.data) {
                // Now returns object { total, visibles }
                setVisibilidad(resVis.data.data.visibles || []);
            }

            // Obtener empleados visibles con datos
            const resEmps = await accesoService.getVisibilidadEmpleados(searchCarnet.trim());
            if (resEmps.data?.data) {
                // Now returns object { total, empleados }
                setEmpleadosVisibles(resEmps.data.data.empleados || []);
            }

            // Obtener actores efectivos
            const resAct = await accesoService.getActores(searchCarnet.trim());
            if (resAct.data?.data) {
                // Now returns object { total, carnets }
                setActores(resAct.data.data.carnets || []);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Error buscando empleado');
        } finally {
            setLoading(false);
        }
    };

    const verificarPuedeVer = async () => {
        if (!searchCarnet.trim() || !carnetVerificar.trim()) return;

        try {
            const res = await accesoService.verificarPuedeVer(searchCarnet.trim(), carnetVerificar.trim());
            if (res.data?.data) {
                setVerificacionResultado(res.data.data);
            }
        } catch (err: any) {
            setVerificacionResultado({ puedeVer: false, razon: 'Error verificando' });
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Explorador de Visibilidad</h1>
                        <p className="text-slate-500 text-sm">Consulta quién puede ver a quién en el sistema</p>
                    </div>
                </div>
            </div>

            {/* Search Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Buscar Empleado</h2>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchCarnet}
                            onChange={(e) => setSearchCarnet(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && buscarEmpleado()}
                            placeholder="Ingresa el carnet del empleado..."
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                        />
                    </div>
                    <button
                        onClick={buscarEmpleado}
                        disabled={loading || !searchCarnet.trim()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        Buscar
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            {/* Results */}
            {empleadoSeleccionado && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Employee Info Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{empleadoSeleccionado.nombreCompleto || empleadoSeleccionado.carnet}</h3>
                                <p className="text-sm text-slate-500">{empleadoSeleccionado.carnet}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Departamento:</span>
                                <span className="text-slate-900 font-medium">{empleadoSeleccionado.departamento || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Area:</span>
                                <span className="text-slate-900 font-medium">{empleadoSeleccionado.area || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Cargo:</span>
                                <span className="text-slate-900 font-medium">{empleadoSeleccionado.cargo || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Jefe:</span>
                                <span className="text-slate-900 font-medium">{empleadoSeleccionado.jefeCarnet || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Estado:</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${empleadoSeleccionado.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {empleadoSeleccionado.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>

                        {/* Actors */}
                        {actores && actores.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Actores Efectivos (Delegaciones)</p>
                                <div className="flex flex-wrap gap-1">
                                    {actores.map(c => (
                                        <span key={c} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Visibility Stats */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-slate-900">Puede Ver</h3>
                        </div>

                        <div className="text-4xl font-bold text-purple-600 mb-2">
                            {visibilidad.length}
                        </div>
                        <p className="text-sm text-slate-500 mb-4">empleados</p>

                        {/* List of visible employees */}
                        <div className="max-h-64 overflow-y-auto space-y-2">
                            {empleadosVisibles.slice(0, 20).map(emp => (
                                <div key={emp.carnet} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{emp.nombreCompleto || emp.carnet}</p>
                                        <p className="text-xs text-slate-500">{emp.departamento || emp.carnet}</p>
                                    </div>
                                </div>
                            ))}
                            {empleadosVisibles.length > 20 && (
                                <p className="text-xs text-slate-500 text-center py-2">
                                    y {empleadosVisibles.length - 20} más...
                                </p>
                            )}
                            {empleadosVisibles.length === 0 && (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No puede ver a ningún empleado
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Verification Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-slate-900">Verificar Acceso</h3>
                        </div>

                        <p className="text-sm text-slate-500 mb-4">
                            ¿Puede <strong>{empleadoSeleccionado.carnet}</strong> ver a...?
                        </p>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={carnetVerificar}
                                onChange={(e) => setCarnetVerificar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && verificarPuedeVer()}
                                placeholder="Carnet a verificar"
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={verificarPuedeVer}
                                disabled={!carnetVerificar.trim()}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>

                        {verificacionResultado && (
                            <div className={`p-4 rounded-lg ${verificacionResultado.puedeVer ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {verificacionResultado.puedeVer ? (
                                        <>
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                            <span className="font-bold text-green-700">Sí puede ver</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-6 h-6 text-red-600" />
                                            <span className="font-bold text-red-700">No puede ver</span>
                                        </>
                                    )}
                                </div>
                                {verificacionResultado.razon && (
                                    <p className="text-sm mt-2 text-slate-600">{verificacionResultado.razon}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Help Card */}
            {!empleadoSeleccionado && !loading && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Explorador de Visibilidad</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Ingresa el carnet de un empleado para ver a quién puede ver en el sistema,
                        basado en su jerarquía organizacional, permisos por área y delegaciones.
                    </p>
                </div>
            )}
        </div>
    );
};

export default VisibilidadPage;
