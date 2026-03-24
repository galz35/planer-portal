import React, { useState, useEffect, useCallback } from 'react';
import {
    Database, FileSpreadsheet, RefreshCw, CheckCircle, AlertTriangle, Users,
    FileJson, Trash2, Upload
} from 'lucide-react';
import { clarityService } from '../../../services/clarity.service';
import { useToast } from '../../../context/ToastContext';
import './ImportPage.css';

interface EstadisticasAdmin {
    total: number;
    activos: number;
    inactivos: number;
}

interface ResultadoImportacion {
    procesados: number;
    insertados: number;
    actualizados: number;
    errores: string[];
}

type TabType = 'empleados' | 'excel';

export const ImportPage: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('empleados');
    const [jsonInput, setJsonInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResultadoImportacion | null>(null);
    const [stats, setStats] = useState<EstadisticasAdmin | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        try {
            const data = await clarityService.getAdminStats();
            if (data) setStats(data as any);
        } catch (err) {
            console.error('Error loading stats', err);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleImport = async () => {
        if (!jsonInput.trim()) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = JSON.parse(jsonInput);
            if (!Array.isArray(data)) {
                throw new Error('El JSON debe ser un array de objetos');
            }

            const response = await clarityService.importEmpleados(data);
            setResult(response as any);
            showToast("Importación completada", "success");
            loadStats();
        } catch (err: any) {
            setError(err.message || "Error durante la importación");
            showToast("Error en la importación", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadTemplate = () => {
        const template = [
            {
                correo: "usuario@empresa.com",
                nombre: "Nombre Completo",
                cargo: "Cargo del empleado",
                organizacion: "Nombre del Equipo/Gerencia",
                jefeCorreo: "jefe@empresa.com",
                rol: "Colaborador"
            }
        ];
        setJsonInput(JSON.stringify(template, null, 4));
    };

    const handleClear = () => {
        setJsonInput('');
        setResult(null);
        setError(null);
    };

    const tabs = [
        { id: 'empleados' as TabType, label: 'Carga Manual', icon: Users },
        { id: 'excel' as TabType, label: 'Excel (Próximamente)', icon: FileSpreadsheet },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                            <Database className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Consola de Carga de Datos</h1>
                            <p className="text-slate-500 font-medium">Sincroniza la nómina y estructura organizacional</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Total Usuarios</div>
                        <div className="text-4xl font-black text-slate-800">{stats.total}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Activos</div>
                        <div className="text-4xl font-black text-emerald-600">{stats.activos}</div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-rose-500">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Inactivos</div>
                        <div className="text-4xl font-black text-rose-600">{stats.inactivos}</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); handleClear(); }}
                        className={`flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 shadow-sm'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="bg-rose-100 p-2 rounded-full">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                    </div>
                    <span className="text-rose-700 font-medium flex-1 text-sm">{error}</span>
                    <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                {activeTab === 'empleados' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Editor de Datos Directo</h2>
                                <p className="text-sm text-slate-400">Pega aquí el listado para procesar.</p>
                            </div>
                            <button
                                onClick={handleLoadTemplate}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            >
                                <FileJson size={18} />
                                Ver Plantilla
                            </button>
                        </div>

                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='[ { "correo": "...", "nombre": "...", "rol": "..." } ]'
                            className="w-full h-80 px-6 py-4 font-mono text-sm bg-slate-900 text-indigo-300 border-none rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-inner"
                        />

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={handleImport}
                                disabled={loading || !jsonInput.trim()}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-100 transition-all active:scale-95"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {loading ? 'PROCESANDO...' : 'INICIAR IMPORTACIÓN'}
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200"
                            >
                                Limpiar Editor
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'excel' && (
                    <div className="p-12 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <FileSpreadsheet className="w-10 h-10 text-slate-400" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Importación desde Excel</h2>
                            <p className="text-slate-500 mb-8 font-medium">Esta función estará disponible próximamente. Por ahora use el editor de datos.</p>

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50 grayscale opacity-50 cursor-not-allowed">
                                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Upload Disabled</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Result Modal-like area */}
            {result && (
                <div className={`mt-8 p-8 rounded-2xl border-2 animate-in fade-in zoom-in duration-300 ${result.errores.length === 0
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                    }`}>
                    <div className="flex items-center gap-4 mb-8">
                        {result.errores.length === 0 ? (
                            <div className="bg-emerald-500 p-2 rounded-full text-white shadow-lg shadow-emerald-200">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                        ) : (
                            <div className="bg-amber-500 p-2 rounded-full text-white shadow-lg shadow-amber-200">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                        )}
                        <div>
                            <h3 className="text-2xl font-black text-slate-900">
                                {result.errores.length === 0 ? 'Sincronización Completa' : 'Sincronización con Observaciones'}
                            </h3>
                            <p className="text-slate-500 font-medium">Resultados del proceso masivo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Leídos</div>
                            <div className="text-3xl font-black text-slate-800">{result.procesados}</div>
                        </div>
                        <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Nuevos Registros</div>
                            <div className="text-3xl font-black text-emerald-600">{result.insertados}</div>
                        </div>
                        <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Corregidos</div>
                            <div className="text-3xl font-black text-indigo-600">{result.actualizados}</div>
                        </div>
                        <div className="bg-white/50 p-6 rounded-2xl border border-white/50 shadow-sm">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Con Errores</div>
                            <div className="text-3xl font-black text-rose-600">{result.errores.length}</div>
                        </div>
                    </div>

                    {result.errores.length > 0 && (
                        <div className="mt-8 bg-white/80 rounded-2xl p-6 border border-amber-200 max-h-60 overflow-y-auto">
                            <h4 className="font-black text-rose-600 text-xs uppercase tracking-widest mb-4">Detalle de Errores</h4>
                            <ul className="space-y-2 text-sm text-slate-600 font-medium">
                                {result.errores.map((err, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="text-rose-400">×</span> {err}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ImportPage;
