import { useState, useEffect, useCallback } from 'react';
import { marcajeApi } from '../../../services/marcajeApi';

export default function MarcajeMonitorPage() {
    const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
    const [marcajes, setMarcajes] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroAlertas, setFiltroAlertas] = useState(false);

    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [monitorData, dashboardData] = await Promise.all([
                marcajeApi.getAdminMonitor(fecha),
                marcajeApi.getAdminDashboard(fecha)
            ]);

            // Extract array from response wrapper if needed
            const records = Array.isArray(monitorData) ? monitorData : (Array.isArray(monitorData?.data) ? monitorData.data : []);
            setMarcajes(records);

            const dp = Array.isArray(dashboardData) ? dashboardData[0] : (dashboardData?.data ? dashboardData.data[0] || dashboardData.data : dashboardData);
            setKpis(dp || null);

        } catch (error) {
            console.error('Error cargando monitor:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [fecha]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadData(false); // don't show loading spinner on auto-refresh
        }, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Filtering logic
    const marcajesFiltrados = marcajes.filter(m => {
        if (filtroTipo && m.tipo_marcaje !== filtroTipo) return false;
        if (filtroAlertas && !m.tiene_warn && !m.motivo) return false;
        if (filtroNombre) {
            const term = filtroNombre.toLowerCase();
            const nom = (m.nombre_empleado || '').toLowerCase();
            const car = (m.carnet || '').toLowerCase();
            if (!nom.includes(term) && !car.includes(term)) return false;
        }
        return true;
    });

    const getTipoBadgeStyle = (tipo: string) => {
        if (tipo === 'ENTRADA') return { bg: '#dcfce7', color: '#166534' }; // emerald
        if (tipo === 'SALIDA') return { bg: '#fee2e2', color: '#991b1b' }; // rose
        if (tipo?.includes('EXTRA')) return { bg: '#fef3c7', color: '#92400e' }; // amber
        if (tipo?.includes('COMP')) return { bg: '#e0e7ff', color: '#3730a3' }; // indigo
        return { bg: '#f1f5f9', color: '#475569' }; // slate
    };

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>⏱️ Monitor de Asistencia</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0' }}>Marcajes en tiempo real (auto-refresh cada 30s)</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={fecha}
                        onChange={e => setFecha(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    />
                    <button
                        onClick={() => loadData(true)}
                        style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🔄 Actualizar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderTop: '4px solid #3b82f6' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>MARCADOS HOY</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{kpis?.empleados_marcaron || 0}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderTop: '4px solid #10b981' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>ENTRADAS</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{kpis?.total_entradas || 0}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderTop: '4px solid #f59e0b' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>TURNOS ABIERTOS</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{kpis?.turnos_abiertos || 0}</div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', borderTop: '4px solid #ef4444' }}>
                    <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>WARNINGS</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>{kpis?.total_warnings || 0}</div>
                </div>
            </div>

            {/* Filters & Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>

                {/* Filters */}
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: '#f8fafc' }}>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o carnet..."
                        value={filtroNombre}
                        onChange={e => setFiltroNombre(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', flex: '1', minWidth: '200px' }}
                    />
                    <select
                        value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', minWidth: '150px' }}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="ENTRADA">Entrada</option>
                        <option value="SALIDA">Salida</option>
                        <option value="INICIO_EXTRA">Inicio Extra</option>
                        <option value="FIN_EXTRA">Fin Extra</option>
                        <option value="INICIO_COMPENSADA">Inicio Comp</option>
                        <option value="FIN_COMPENSADA">Fin Comp</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={filtroAlertas}
                            onChange={e => setFiltroAlertas(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        Solo con Warnings
                    </label>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    {loading && marcajes.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando monitor...</div>
                    ) : marcajesFiltrados.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No se encontraron marcajes para la selección.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: '#f1f5f9' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>HORA</th>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>EMPLEADO</th>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>TIPO</th>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>DISPOSITIVO</th>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>UBICACIÓN</th>
                                    <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>WARNINGS / DETALLES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {marcajesFiltrados.map((m) => {
                                    const tieneWarn = m.tiene_warn === 1 || !!m.motivo;
                                    const badgeStyle = getTipoBadgeStyle(m.tipo_marcaje);

                                    return (
                                        <tr key={m.id} style={{
                                            borderBottom: '1px solid #f1f5f9',
                                            borderLeft: tieneWarn ? '4px solid #ef4444' : '4px solid transparent',
                                            backgroundColor: '#fff'
                                        }}>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                                {new Date(m.fecha).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{m.nombre_empleado || 'Desconocido'}</div>
                                                <div style={{ color: '#64748b', fontSize: '12px' }}>{m.carnet}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    backgroundColor: badgeStyle.bg,
                                                    color: badgeStyle.color,
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {m.tipo_marcaje}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {m.tipo_device === 'MOBILE' ? '📱' : '💻'}
                                                    <span style={{ color: '#475569' }}>{m.tipo_device}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                {m.lat && m.long ? (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.long}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}
                                                    >
                                                        📍 Ver Mapa
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#94a3b8' }}>Sin GPS</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: tieneWarn ? '#b91c1c' : '#64748b', maxWidth: '300px' }}>
                                                {m.motivo ? (
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                        ⚠️ {m.motivo}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#10b981' }}>✓ OK</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
