/**
 * VCVisitasPage — Historial de Visitas Premium
 *
 * Tabla con filtros, badges, validación geocerca,
 * link a mapa. Dark mode + hover effects.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitaApi } from '../../../services/visitaApi';

const estadoConfig: Record<string, { bg: string; text: string; label: string; icon: string }> = {
    FINALIZADA: { bg: '#dcfce7', text: '#166534', label: 'Finalizada', icon: '✅' },
    EN_CURSO: { bg: '#dbeafe', text: '#1e40af', label: 'En Curso', icon: '🔵' },
    CANCELADA: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelada', icon: '❌' },
    PENDIENTE: { bg: '#f1f5f9', text: '#475569', label: 'Pendiente', icon: '⏳' },
};

export function VCVisitasPage() {
    const navigate = useNavigate();
    const [visitas, setVisitas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
    const [filtroCarnet, setFiltroCarnet] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [usuarios, setUsuarios] = useState<any[]>([]);

    const loadVisitas = () => {
        setLoading(true);
        visitaApi.getVisitasAdmin(fecha).then((res: any) => {
            const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
            setVisitas(data);
            setLoading(false);
        }).catch((err) => {
            console.error('Error cargando visitas:', err);
            setLoading(false);
        });
    };

    useEffect(() => {
        visitaApi.getUsuariosConTracking().then(res => {
            setUsuarios(Array.isArray(res) ? res : (res?.data || []));
        });
    }, []);

    useEffect(() => { loadVisitas(); }, [fecha]);

    const handleVerEnMapa = (carnet: string, fechaViaje: string) => {
        navigate(`/marcaje-web/visita-cliente/tracking?fecha=${fechaViaje}&carnet=${carnet}`);
    };

    const filteredVisitas = visitas.filter(v => {
        if (filtroCarnet && v.carnet !== filtroCarnet) return false;
        if (filtroEstado && v.estado !== filtroEstado) return false;
        return true;
    });

    // Stats rápidos
    const total = filteredVisitas.length;
    const completadas = filteredVisitas.filter(v => v.estado === 'FINALIZADA').length;
    const enCurso = filteredVisitas.filter(v => v.estado === 'EN_CURSO').length;
    const alertas = filteredVisitas.filter(v => !v.valido_inicio).length;

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            <style>{`
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .vc-row:hover { background-color: var(--color-bg-tertiary, #f8fafc) !important; }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                    fontSize: '26px', fontWeight: 800, margin: '0 0 4px',
                    color: 'var(--color-text-primary, #0f172a)',
                }}>📋 Historial de Visitas</h1>
                <p style={{
                    fontSize: '14px', margin: 0,
                    color: 'var(--color-text-muted, #64748b)',
                }}>
                    Check-ins, check-outs, geocercas y duración de visitas de campo.
                </p>
            </div>

            {/* Quick Stats */}
            <div style={{
                display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
                animation: 'fadeUp 0.3s ease both',
            }}>
                {[
                    { label: 'Total', value: total, color: '#2563eb' },
                    { label: 'Completadas', value: completadas, color: '#16a34a' },
                    { label: 'En Curso', value: enCurso, color: '#f59e0b' },
                    { label: 'Alertas', value: alertas, color: '#dc2626' },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '10px 18px', borderRadius: '10px',
                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</span>
                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', fontWeight: 500 }}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary, #fff)',
                padding: '16px 20px',
                borderRadius: '14px',
                border: '1px solid var(--color-border, #e2e8f0)',
                marginBottom: '20px',
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end',
                animation: 'fadeUp 0.3s ease 0.05s both',
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #475569)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        style={{
                            padding: '9px 12px', borderRadius: '8px',
                            border: '1px solid var(--color-border, #cbd5e1)', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                            color: 'var(--color-text-primary, #0f172a)',
                        }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #475569)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico</label>
                    <select
                        value={filtroCarnet}
                        onChange={(e) => setFiltroCarnet(e.target.value)}
                        style={{
                            padding: '9px 12px', borderRadius: '8px',
                            border: '1px solid var(--color-border, #cbd5e1)', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                            color: 'var(--color-text-primary, #0f172a)',
                        }}
                    >
                        <option value="">Todos los técnicos</option>
                        {usuarios.map(u => (
                            <option key={u.carnet} value={u.carnet}>{u.nombre_empleado || u.carnet}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '160px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted, #475569)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</label>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        style={{
                            padding: '9px 12px', borderRadius: '8px',
                            border: '1px solid var(--color-border, #cbd5e1)', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                            color: 'var(--color-text-primary, #0f172a)',
                        }}
                    >
                        <option value="">Todos</option>
                        <option value="EN_CURSO">En Curso</option>
                        <option value="FINALIZADA">Finalizada</option>
                        <option value="CANCELADA">Cancelada</option>
                        <option value="PENDIENTE">Pendiente</option>
                    </select>
                </div>
                <button
                    onClick={loadVisitas}
                    disabled={loading}
                    style={{
                        backgroundColor: '#0f172a', color: '#fff',
                        padding: '10px 22px', borderRadius: '8px', border: 'none',
                        cursor: loading ? 'wait' : 'pointer', fontWeight: 600, fontSize: '13px',
                        transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1e293b'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0f172a'; }}
                >
                    {loading ? '⏳ Buscando...' : '🔄 Actualizar'}
                </button>
            </div>

            {/* Table */}
            <div style={{
                backgroundColor: 'var(--color-bg-secondary, #fff)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid var(--color-border, #e2e8f0)',
                animation: 'fadeUp 0.4s ease 0.1s both',
            }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)' }}>
                        <div style={{
                            width: '32px', height: '32px', margin: '0 auto 12px',
                            border: '3px solid var(--color-border, #e2e8f0)', borderTopColor: '#3b82f6',
                            borderRadius: '50%', animation: 'spin 1s linear infinite',
                        }} />
                        Cargando visitas...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : filteredVisitas.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)' }}>
                        <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
                        <div style={{ fontSize: '15px', fontWeight: 500 }}>No se encontraron visitas</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>Ajuste los filtros o seleccione otra fecha.</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border, #e2e8f0)' }}>
                                    {['TÉCNICO', 'CLIENTE', 'CHECK-IN', 'CHECK-OUT', 'DURACIÓN', 'ESTADO', 'VALIDACIÓN', ''].map(h => (
                                        <th key={h} style={{
                                            padding: '12px 16px', fontSize: '11px', fontWeight: 700,
                                            color: 'var(--color-text-muted, #94a3b8)',
                                            textTransform: 'uppercase', letterSpacing: '0.06em',
                                            backgroundColor: 'var(--color-bg-tertiary, #f8fafc)',
                                            textAlign: h === '' ? 'right' : 'left',
                                        }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisitas.map(v => {
                                    const ec = estadoConfig[v.estado] || { bg: '#fef08a', text: '#854d0e', label: v.estado, icon: '❓' };
                                    return (
                                        <tr key={v.id} className="vc-row" style={{
                                            borderBottom: '1px solid var(--color-border-light, #f1f5f9)',
                                            transition: 'background-color 0.1s',
                                        }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary, #1e293b)' }}>
                                                    {v.colaborador || v.carnet}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>{v.carnet}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary, #1e293b)' }}>
                                                    {v.cliente_nombre || 'N/A'}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted, #94a3b8)' }}>
                                                    {v.cliente_codigo || ''} {v.cliente_zona ? `· ${v.cliente_zona}` : ''}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary, #475569)' }}>
                                                {v.timestamp_inicio ? new Date(v.timestamp_inicio).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                {v.distancia_inicio_m != null && (
                                                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted, #94a3b8)', marginTop: '2px' }}>
                                                        📍 {v.distancia_inicio_m}m
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary, #475569)' }}>
                                                {v.timestamp_fin ? new Date(v.timestamp_fin).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {v.duracion_minutos != null ? (
                                                    <span style={{
                                                        fontSize: '14px', fontWeight: 700,
                                                        color: 'var(--color-text-primary, #0f172a)',
                                                        fontFamily: 'monospace',
                                                    }}>{v.duracion_minutos} min</span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    backgroundColor: ec.bg, color: ec.text,
                                                    padding: '3px 10px', borderRadius: '8px',
                                                    fontSize: '11px', fontWeight: 700,
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                }}>
                                                    {ec.icon} {ec.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {v.valido_inicio ? (
                                                    <span style={{
                                                        backgroundColor: '#dcfce7', color: '#166534',
                                                        padding: '3px 8px', borderRadius: '6px',
                                                        fontSize: '11px', fontWeight: 600,
                                                    }}>✅ En Zona</span>
                                                ) : (
                                                    <span
                                                        title={v.motivo_fuera_zona || 'Fuera del Geofence'}
                                                        style={{
                                                            backgroundColor: '#fee2e2', color: '#991b1b',
                                                            padding: '3px 8px', borderRadius: '6px',
                                                            fontSize: '11px', fontWeight: 600,
                                                            cursor: 'help',
                                                        }}>⚠️ Alerta</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleVerEnMapa(v.carnet, fecha)}
                                                    style={{
                                                        border: '1px solid var(--color-border, #cbd5e1)',
                                                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                                                        color: 'var(--color-text-secondary, #475569)',
                                                        borderRadius: '8px', padding: '6px 12px',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        transition: 'all 0.15s',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.backgroundColor = '#4f46e5';
                                                        e.currentTarget.style.color = '#fff';
                                                        e.currentTarget.style.borderColor = '#4f46e5';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary, #fff)';
                                                        e.currentTarget.style.color = 'var(--color-text-secondary, #475569)';
                                                        e.currentTarget.style.borderColor = 'var(--color-border, #cbd5e1)';
                                                    }}
                                                >
                                                    🗺️ Mapa
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VCVisitasPage;
