import { useState } from 'react';
import { marcajeApi } from '../../../services/marcajeApi';

export default function MarcajeReportesPage() {
    const defaultDate = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(defaultDate);
    const [fechaFin, setFechaFin] = useState(defaultDate);
    const [carnetBuscar, setCarnetBuscar] = useState('');

    const [reportes, setReportes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const generarReporte = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const data = await marcajeApi.getAdminReportes(fechaInicio, fechaFin, carnetBuscar || undefined);
            const arrayData = Array.isArray(data) ? data : (data?.data || []);
            setReportes(arrayData);
            if (arrayData.length === 0) {
                setErrorMsg('No se encontraron datos para los filtros seleccionados.');
            }
        } catch (error) {
            console.error('Error al generar reporte:', error);
            setErrorMsg('Hubo un error al generar el reporte.');
        } finally {
            setLoading(false);
        }
    };

    const exportarCsv = () => {
        if (!reportes.length) return;

        const headers = [
            'Día',
            'Carnet',
            'Nombre Empleado',
            'Primera Entrada',
            'Última Salida',
            'Minutos Jornada',
            'Horas Trabajadas',
            'Entradas',
            'Salidas',
            'Mapa',
            'Extras',
            'Warnings',
            'Fuera Geofence',
            'Total Eventos'
        ].join(',');

        const rows = reportes.map(r => {
            const h = (r.minutos_jornada / 60).toFixed(2);
            return [
                r.dia,
                r.carnet,
                `"${r.nombre_empleado || ''}"`,
                r.primera_entrada ? new Date(r.primera_entrada).toLocaleTimeString() : '',
                r.ultima_salida ? new Date(r.ultima_salida).toLocaleTimeString() : '',
                r.minutos_jornada || 0,
                h,
                r.total_entradas || 0,
                r.total_salidas || 0,
                r.lat && r.long ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.long}` : '',
                r.sesiones_extra || 0,
                r.total_warnings || 0,
                r.fuera_geofence || 0,
                r.total_marcajes || 0
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `reporte_marcaje_${fechaInicio}_${fechaFin}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calcular Totales
    const totales = reportes.reduce((acc, curr) => {
        acc.mins += curr.minutos_jornada || 0;
        acc.entradas += curr.total_entradas || 0;
        acc.salidas += curr.total_salidas || 0;
        acc.warns += curr.total_warnings || 0;
        acc.fuera += curr.fuera_geofence || 0;
        return acc;
    }, { mins: 0, entradas: 0, salidas: 0, warns: 0, fuera: 0 });

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>📊 Reportes de Asistencia</h1>
                    <p style={{ color: '#64748b', margin: '4px 0 0' }}>Consultar histórico y horas trabajadas por empleado</p>
                </div>
                {reportes.length > 0 && (
                    <button
                        onClick={exportarCsv}
                        style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}
                    >
                        ⬇️ Exportar CSV
                    </button>
                )}
            </div>

            {/* Filtros Container */}
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Fecha Inicio</label>
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={e => setFechaInicio(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Fecha Fin</label>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={e => setFechaFin(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div style={{ flex: 2, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Carnet (Opcional)</label>
                    <input
                        type="text"
                        placeholder="Dejar vacío para todos"
                        value={carnetBuscar}
                        onChange={e => setCarnetBuscar(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                    />
                </div>
                <div>
                    <button
                        onClick={generarReporte}
                        disabled={loading}
                        style={{ padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', minWidth: '140px' }}
                    >
                        {loading ? 'Cargando...' : 'Generar Reporte'}
                    </button>
                </div>
            </div>

            {errorMsg && (
                <div style={{ padding: '16px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f87171' }}>
                    {errorMsg}
                </div>
            )}

            {/* Panel de Resultados */}
            {reportes.length > 0 && (
                <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                            <thead style={{ backgroundColor: '#f1f5f9' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>DÍA</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>EMPLEADO</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>1RA ENTRADA</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>ÚLT SALIDA</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>HORAS</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>ENTRADAS</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>SALIDAS</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>UBICACIÓN (INICIO)</th>
                                    <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'center' }}>WARNS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportes.map((r, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>{r.dia}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{r.nombre_empleado || 'N/A'}</div>
                                            <div style={{ color: '#64748b', fontSize: '11px' }}>{r.carnet}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#166534' }}>
                                            {r.primera_entrada ? new Date(r.primera_entrada).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#991b1b' }}>
                                            {r.ultima_salida ? new Date(r.ultima_salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600 }}>
                                            {r.minutos_jornada ? (r.minutos_jornada / 60).toFixed(1) + ' h' : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center' }}>{r.total_entradas}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center' }}>{r.total_salidas}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center' }}>
                                            {r.lat && r.long ? (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.long}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 500 }}
                                                >
                                                    📍 Mapa
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center' }}>
                                            {r.total_warnings > 0 ? (
                                                <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>{r.total_warnings}</span>
                                            ) : (
                                                <span style={{ color: '#94a3b8' }}>0</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                                <tr>
                                    <td colSpan={4} style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a' }}>TOTALES DEL RANGO:</td>
                                    <td style={{ padding: '12px 16px', color: '#0f172a' }}>{(totales.mins / 60).toFixed(1)} h</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{totales.entradas}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>{totales.salidas}</td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        {totales.warns > 0 ? (
                                            <span style={{ color: '#b91c1c' }}>{totales.warns}</span>
                                        ) : '0'}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
