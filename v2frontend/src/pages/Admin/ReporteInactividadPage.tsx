import { useState, useEffect } from 'react';
import { adminService } from '../../services/admin.service';
import { format } from 'date-fns';

export default function ReporteInactividadPage() {
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [fecha, setFecha] = useState(format(new Date(), 'yyyy-MM-dd'));

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsuariosInactivos(fecha);
            setUsuarios(data);
        } catch (error) {
            console.error('Error cargando inactividad:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, [fecha]);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Reporte de Inactividad Diaria</h1>

                <div className="flex gap-4 items-center">
                    <label className="text-sm font-medium text-gray-700">Fecha de Consulta:</label>
                    <input
                        type="date"
                        className="px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                    />
                    <button
                        onClick={cargarDatos}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-700">Usuarios sin actividad el {fecha}</h2>
                    <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {usuarios.length} Inactivos
                    </span>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando reporte...</div>
                ) : usuarios.length === 0 ? (
                    <div className="p-8 text-center text-green-600 font-medium">
                        ¡Excelente! Todos los usuarios activos han registrado actividad hoy.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Completo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carnet</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área / Cargo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {usuarios.map((u) => (
                                    <tr key={u.idUsuario} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{u.nombreCompleto}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{u.carnet}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{u.correo}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{u.area || u.subgerencia || '-'}</div>
                                            <div className="text-xs text-gray-500">{u.cargo}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Sin Actividad
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="mt-4 text-xs text-gray-500 text-right">
                * Se considera actividad: Login, Check-in, o cualquier registro en auditoría.
            </div>
        </div>
    );
}
