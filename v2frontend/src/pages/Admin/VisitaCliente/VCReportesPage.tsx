/**
 * VCReportesPage — Reporte de Kilometraje Premium
 *
 * Filtros por rango de fechas, tabla con datos GPS,
 * exportar CSV, diseño premium con dark mode support.
 */
import { useState } from 'react';
import { visitaApi } from '../../../services/visitaApi';

export function VCReportesPage() {
    const [fechaInicio, setFechaInicio] = useState(() => {
        const d = new Date(); d.setDate(1);
        return d.toISOString().split('T')[0];
    });
    const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any[]>([]);

    const handleLoadReport = async () => {
        setLoading(true);
        try {
            const data = await visitaApi.getReporteKm(fechaInicio, fechaFin);
            setReportData(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) {
            console.error('Error cargando reporte:', error);
            alert('Error al generar el reporte.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!reportData.length) { alert('No hay datos. Genere el reporte primero.'); return; }
        const headers = ["Fecha", "Carnet", "Nombre", "Km_Calculados", "Puntos_GPS", "Segmentos_Validos"];
        const rows = reportData.map(obj => [
            `"${obj.fecha || ''}"`, `"${obj.carnet || ''}"`, `"${obj.nombre || ''}"`,
            `"${obj.km_total || '0'}"`, `"${obj.puntos_totales || '0'}"`, `"${obj.tramo_valido || '0'}"`
        ].join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte_Km_${fechaInicio}_al_${fechaFin}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Quick summary
    const totalKm = reportData.reduce((s, r) => s + (parseFloat(r.km_total) || 0), 0);
    const totalPuntos = reportData.reduce((s, r) => s + (parseInt(r.puntos_totales) || 0), 0);

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                .km-row:hover { background-color: var(--color-bg-tertiary, #f8fafc) !important; }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '24px', animation: 'fadeUp 0.3s ease both' }}>
                <h1 style={{
                    fontSize: '26px', fontWeight: 800, margin: '0 0 4px',
                    color: 'var(--color-text-primary, #0f172a)',
                }}>📈 Reporte de Kilometraje</h1>
                <p style={{
                    fontSize: '14px', margin: 0,
                    color: 'var(--color-text-muted, #64748b)',
                }}>
                    Consulta y exporta viáticos GPS por rango de fechas.
                </p>
            </div>

            {/* Filters Card */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary, #fff)',
                borderRadius: '16px', padding: '24px',
                border: '1px solid var(--color-border, #e2e8f0)',
                marginBottom: '24px',
                animation: 'fadeUp 0.3s ease 0.05s both',
            }}>
                <h3 style={{
                    fontSize: '14px', fontWeight: 700, margin: '0 0 16px',
                    paddingBottom: '12px', borderBottom: '1px solid var(--color-border, #e2e8f0)',
                    color: 'var(--color-text-secondary, #475569)',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>Parámetros</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desde</label>
                        <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                            style={{
                                padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid var(--color-border, #cbd5e1)', fontSize: '14px',
                                backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                                color: 'var(--color-text-primary, #0f172a)',
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '150px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-muted, #475569)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hasta</label>
                        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                            style={{
                                padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid var(--color-border, #cbd5e1)', fontSize: '14px',
                                backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                                color: 'var(--color-text-primary, #0f172a)',
                            }}
                        />
                    </div>
                    <button onClick={handleLoadReport} disabled={loading}
                        style={{
                            padding: '10px 24px', backgroundColor: '#0f172a', color: '#fff',
                            border: 'none', borderRadius: '10px', fontWeight: 600, fontSize: '13px',
                            cursor: loading ? 'wait' : 'pointer', transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
                    >
                        {loading ? '⏳ Generando...' : '🔍 Generar'}
                    </button>
                    <button onClick={downloadCSV} disabled={loading || !reportData.length}
                        style={{
                            padding: '10px 24px', borderRadius: '10px', border: 'none',
                            backgroundColor: reportData.length ? '#16a34a' : 'var(--color-border, #e2e8f0)',
                            color: reportData.length ? '#fff' : 'var(--color-text-muted, #94a3b8)',
                            fontWeight: 600, fontSize: '13px',
                            cursor: reportData.length ? 'pointer' : 'not-allowed',
                            transition: 'background-color 0.15s',
                        }}
                    >
                        📥 Exportar CSV
                    </button>
                </div>
            </div>

            {/* Summary Pills (only when data exists) */}
            {reportData.length > 0 && (
                <div style={{
                    display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
                    animation: 'fadeUp 0.3s ease both',
                }}>
                    <div style={{
                        padding: '10px 18px', borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>{totalKm.toFixed(1)}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 500 }}>km totales</span>
                    </div>
                    <div style={{
                        padding: '10px 18px', borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#7c3aed', fontFamily: 'monospace' }}>{totalPuntos}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 500 }}>puntos GPS</span>
                    </div>
                    <div style={{
                        padding: '10px 18px', borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>{reportData.length}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 500 }}>registros</span>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary, #fff)',
                borderRadius: '16px', border: '1px solid var(--color-border, #e2e8f0)',
                overflow: 'hidden',
                animation: 'fadeUp 0.4s ease 0.1s both',
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border, #e2e8f0)' }}>
                            {['FECHA', 'CARNET', 'TÉCNICO', 'KM CALCULADOS', 'PUNTOS GPS'].map((h, i) => (
                                <th key={h} style={{
                                    padding: '12px 16px', fontSize: '11px', fontWeight: 700,
                                    color: 'var(--color-text-muted, #94a3b8)',
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    backgroundColor: 'var(--color-bg-tertiary, #f8fafc)',
                                    textAlign: i >= 3 ? 'right' : 'left',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row, idx) => (
                            <tr key={idx} className="km-row" style={{
                                borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
                                transition: 'background-color 0.1s',
                            }}>
                                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary, #1e293b)' }}>{row.fecha}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-muted, #64748b)' }}>{row.carnet}</td>
                                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary, #1e293b)' }}>{row.nombre}</td>
                                <td style={{
                                    padding: '12px 16px', textAlign: 'right',
                                    fontSize: '15px', fontWeight: 800, fontFamily: 'monospace',
                                    color: '#2563eb',
                                }}>{row.km_total} km</td>
                                <td style={{
                                    padding: '12px 16px', textAlign: 'right',
                                    fontSize: '13px', color: 'var(--color-text-muted, #64748b)',
                                }}>{row.puntos_totales}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && !reportData.length && (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
                        <div style={{ fontSize: '15px', fontWeight: 500 }}>Sin resultados</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>Seleccione un rango de fechas y presione Generar.</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VCReportesPage;
