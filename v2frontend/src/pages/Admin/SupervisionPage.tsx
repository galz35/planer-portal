import { useEffect, useState } from 'react';
import { RefreshCw, Users, AlertTriangle, Briefcase, UserX, FolderOpen } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';

export const SupervisionPage = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ usuariosSinTarea: any[], proyectosSinTarea: any[] }>({ usuariosSinTarea: [], proyectosSinTarea: [] });

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await clarityService.getSupervision();
            setData(result || { usuariosSinTarea: [], proyectosSinTarea: [] });
        } catch (error) {
            console.error(error);
            showToast('Error al cargar datos de supervisión', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const usuarios = data.usuariosSinTarea || [];
    const proyectos = data.proyectosSinTarea || [];

    if (loading && usuarios.length === 0 && proyectos.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Analizando carga laboral...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <AlertTriangle className="text-amber-500 w-8 h-8" />
                        Supervisión de Recursos
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Detecta empleados sin carga laboral asignada y proyectos inactivos.
                    </p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar Análisis
                </button>
            </div>

            {/* Resumen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-rose-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center z-10">
                        <UserX size={28} />
                    </div>
                    <div className="z-10">
                        <div className="text-4xl font-black text-slate-800">{usuarios.length}</div>
                        <div className="text-sm font-bold text-rose-500 uppercase tracking-widest mt-1">Empleados Sin Tarea</div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-6 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                    <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center z-10">
                        <FolderOpen size={28} />
                    </div>
                    <div className="z-10">
                        <div className="text-4xl font-black text-slate-800">{proyectos.length}</div>
                        <div className="text-sm font-bold text-amber-500 uppercase tracking-widest mt-1">Proyectos Vacíos</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tabla Empleados */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users size={18} className="text-rose-500" />
                            Recursos Sin Asignación
                        </h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-3">Empleado</th>
                                    <th className="px-6 py-3">Área / Gerencia</th>
                                    <th className="px-6 py-3 text-right">Rol</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {usuarios.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                            <p className="font-medium">¡Excelente! Todos tienen tareas asignadas.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    usuarios.map((u: any) => (
                                        <tr key={u.idUsuario} className="hover:bg-rose-50/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    
                                                    <div>
                                                        <div className="font-bold text-slate-700 text-sm">{u.nombre}</div>
                                                        <div className="text-xs text-slate-400 font-mono">{u.carnet}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-medium text-slate-600">{u.area || u.gerencia || 'General'}</div>
                                                {u.area && u.gerencia && (
                                                    <div className="text-[10px] text-slate-400">{u.gerencia}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                    {u.rolGlobal || 'Usuario'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {usuarios.length > 0 && (
                        <div className="p-3 bg-rose-50/30 border-t border-rose-100 text-center">
                            <p className="text-xs text-rose-600 font-medium flex items-center justify-center gap-2">
                                <AlertTriangle size={12} />
                                Estos usuarios no tienen ninguna tarea activa asignada.
                            </p>
                        </div>
                    )}
                </div>

                {/* Tabla Proyectos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Briefcase size={18} className="text-amber-500" />
                            Proyectos Inactivos (Vacíos)
                        </h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-3">Proyecto</th>
                                    <th className="px-6 py-3">Tipo / Área</th>
                                    <th className="px-6 py-3 text-right">Creador</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {proyectos.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                            <p className="font-medium">No hay proyectos activos vacíos.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    proyectos.map((p: any) => (
                                        <tr key={p.idProyecto} className="hover:bg-amber-50/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-700 text-sm">{p.nombre}</div>
                                                <div className="text-xs text-slate-400">ID: {p.idProyecto}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-600 mb-1">
                                                    {p.tipo || 'General'}
                                                </span>
                                                <div className="text-xs text-slate-500">{p.area || p.gerencia || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="text-xs font-bold text-slate-600">{p.creador}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString() : '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {proyectos.length > 0 && (
                        <div className="p-3 bg-amber-50/30 border-t border-amber-100 text-center">
                            <p className="text-xs text-amber-600 font-medium flex items-center justify-center gap-2">
                                <AlertTriangle size={12} />
                                Proyectos en estado 'Activo' pero sin tareas operativas.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
