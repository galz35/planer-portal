import React, { useEffect, useState } from 'react';
import { TopBar } from '../../components/layout/TopBar';
import { Plus, Zap, Trash2, Play, Loader2, Settings } from 'lucide-react';
import { clarityService } from '../../services/clarity.service';
import { useToast } from '../../context/ToastContext';

export const AutomationPage: React.FC = () => {
    const { showToast } = useToast();
    const [roles, setRoles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRoles = async () => {
            try {
                setLoading(true);
                const data = await clarityService.getRoles();
                setRoles(data || []);
            } catch (error) {
                showToast("Error cargando reglas de negocio", "error");
            } finally {
                setLoading(false);
            }
        };
        loadRoles();
    }, [showToast]);

    const handleRunNow = () => {
        showToast("Ejecución manual de reglas iniciada...", "info");
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 font-sans">
            <TopBar title="Motor de Reglas & Automatización" />

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">

                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Reglas de Negocio</h2>
                            <p className="text-slate-500 font-medium">Controla la lógica de permisos y automatización por rol.</p>
                        </div>
                        <button
                            onClick={() => showToast("Creación de reglas disponible en el editor de Roles (Admin)", "info")}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                        >
                            <Plus size={20} />
                            Configurar Nueva Regla
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                            <p className="font-bold uppercase tracking-widest text-xs">Sincronizando reglas con el servidor...</p>
                        </div>
                    ) : roles.length === 0 ? (
                        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                            <Settings size={48} className="mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 font-bold">No se encontraron roles con reglas configuradas.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {roles.map(rol => {
                                let reglasParsed = [];
                                try {
                                    reglasParsed = typeof rol.reglas === 'string' ? JSON.parse(rol.reglas) : rol.reglas || [];
                                } catch (e) {
                                    reglasParsed = [];
                                }

                                return (
                                    <div key={rol.idRol} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${rol.esSistema ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {rol.esSistema ? 'Sistema' : 'Personalizado'}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-900 text-indigo-400 rounded-2xl">
                                                    <Zap size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl text-slate-900 dark:text-white">{rol.nombre}</h3>
                                                    <p className="text-sm text-slate-500">{rol.descripcion || 'Sin descripción'}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-2">
                                                <button onClick={handleRunNow} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Ejecutar Ahora">
                                                    <Play size={20} />
                                                </button>
                                                {!rol.esSistema && (
                                                    <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Eliminar">
                                                        <Trash2 size={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {reglasParsed.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic">No hay reglas específicas configuradas para este rol.</p>
                                            ) : (
                                                reglasParsed.map((regla: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3 text-xs bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300">
                                                        <span className="font-black text-indigo-600 uppercase tracking-widest text-[10px]">REGLA {idx + 1}</span>
                                                        <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded shadow-sm">
                                                            {regla.recurso || regla.entidad || 'General'}
                                                        </span>
                                                        <span className="text-slate-300">→</span>
                                                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded">
                                                            {regla.accion || regla.permiso || 'Acceso'}
                                                        </span>
                                                        {regla.condicion && (
                                                            <span className="text-slate-400 italic">IF {JSON.stringify(regla.condicion)}</span>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-12 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                        <div className="relative z-10">
                            <h4 className="text-lg font-black mb-2 flex items-center gap-2">
                                <Zap className="text-indigo-400" size={20} />
                                Smart Automation AI
                            </h4>
                            <p className="text-slate-400 text-sm max-w-xl">
                                Próximamente: El sistema utilizará inteligencia artificial para sugerir automatizaciones basadas en tus flujos de trabajo repetitivos.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
