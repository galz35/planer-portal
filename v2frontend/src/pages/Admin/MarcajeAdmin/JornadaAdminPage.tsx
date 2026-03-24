/**
 * JornadaAdminPage — Mantenimiento de Jornadas Laborales
 * 
 * 3 secciones con tabs:
 * 1. Asignaciones → Qué patrón tiene cada empleado (activo/historial)
 * 2. Patrones → Secuencias cíclicas de turnos
 * 3. Horarios → Turnos individuales (bloques de tiempo)
 */
import { useState, useEffect, useCallback } from 'react';
import { jornadaApi } from '../../../services/jornadaApi';
import type { Horario, Patron, Asignacion } from '../../../services/jornadaApi';

type Tab = 'asignaciones' | 'patrones' | 'horarios';

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════

export function JornadaAdminPage() {
    const [tab, setTab] = useState<Tab>('asignaciones');
    const [horarios, setHorarios] = useState<Horario[]>([]);
    const [patrones, setPatrones] = useState<Patron[]>([]);
    const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [h, p, a] = await Promise.all([
                jornadaApi.getHorarios(),
                jornadaApi.getPatrones(),
                jornadaApi.getAsignaciones(),
            ]);
            setHorarios(Array.isArray(h) ? h : []);
            setPatrones(Array.isArray(p) ? p : []);
            setAsignaciones(Array.isArray(a) ? a : []);
        } catch (e: any) {
            setError(e?.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
        { key: 'asignaciones', label: 'Asignaciones', icon: '👥', count: asignaciones.length },
        { key: 'patrones', label: 'Patrones', icon: '🔄', count: patrones.length },
        { key: 'horarios', label: 'Horarios', icon: '🕐', count: horarios.length },
    ];

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    ⏰ Jornada Laboral
                </h1>
                <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                    Gestión de horarios, patrones y asignaciones de jornada por empleado
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #F1F5F9',
                paddingBottom: 0
            }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderBottom: tab === t.key ? '3px solid #E11D48' : '3px solid transparent',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: tab === t.key ? 700 : 500,
                            color: tab === t.key ? '#0F172A' : '#94A3B8',
                            fontFamily: 'Inter, sans-serif',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        <span>{t.icon}</span>
                        {t.label}
                        <span style={{
                            background: tab === t.key ? '#FEF2F2' : '#F1F5F9',
                            color: tab === t.key ? '#E11D48' : '#94A3B8',
                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        }}>
                            {t.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 8, color: '#DC2626', marginBottom: 16, fontSize: 13
                }}>
                    ⚠️ {error}
                    <button onClick={loadAll} style={{
                        marginLeft: 12, background: '#DC2626', color: '#fff', border: 'none',
                        padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12
                    }}>Reintentar</button>
                </div>
            )}

            {/* Loading */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                    Cargando datos de jornada...
                </div>
            ) : (
                <>
                    {tab === 'asignaciones' && (
                        <AsignacionesTab
                            asignaciones={asignaciones}
                            patrones={patrones}
                            onReload={loadAll}
                        />
                    )}
                    {tab === 'patrones' && (
                        <PatronesTab patrones={patrones} horarios={horarios} />
                    )}
                    {tab === 'horarios' && (
                        <HorariosTab horarios={horarios} onReload={loadAll} />
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TAB 1: ASIGNACIONES (Empleado → Patrón)
// ═══════════════════════════════════════════════════

function AsignacionesTab({
    asignaciones, patrones, onReload
}: {
    asignaciones: Asignacion[];
    patrones: Patron[];
    onReload: () => void;
}) {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ carnet: '', id_patron: 0, fecha_inicio: '', fecha_fin: '' });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.carnet || !formData.id_patron || !formData.fecha_inicio) return;
        setSaving(true);
        try {
            await jornadaApi.asignarPatron({
                carnet: formData.carnet,
                id_patron: formData.id_patron,
                fecha_inicio: formData.fecha_inicio,
                fecha_fin: formData.fecha_fin || undefined,
            });
            setShowForm(false);
            setFormData({ carnet: '', id_patron: 0, fecha_inicio: '', fecha_fin: '' });
            onReload();
        } catch (e: any) {
            alert('Error: ' + (e?.message || 'No se pudo guardar'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id: number, nombre: string) => {
        if (!confirm(`¿Desactivar asignación de ${nombre}?`)) return;
        try {
            await jornadaApi.desactivarAsignacion(id);
            onReload();
        } catch (e: any) {
            alert('Error: ' + (e?.message || ''));
        }
    };

    return (
        <div>
            {/* Action Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                    Cada empleado tiene un patrón de horario asignado. Al asignar uno nuevo, el anterior se desactiva automáticamente.
                </p>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        background: 'linear-gradient(135deg, #E11D48, #BE123C)',
                        color: '#fff', border: 'none', padding: '8px 20px', borderRadius: 8,
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                >
                    + Nueva Asignación
                </button>
            </div>

            {/* Form */}
            {showForm && (
                <div style={{
                    background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12,
                    padding: 20, marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
                }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginTop: 0, marginBottom: 16, color: '#0F172A' }}>
                        Asignar Patrón a Empleado
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                        <label style={labelStyle}>
                            Carnet del Empleado
                            <input
                                type="text"
                                value={formData.carnet}
                                onChange={e => setFormData({ ...formData, carnet: e.target.value })}
                                placeholder="Ej: gustavo.lira"
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Patrón de Horario
                            <select
                                value={formData.id_patron}
                                onChange={e => setFormData({ ...formData, id_patron: Number(e.target.value) })}
                                style={inputStyle}
                            >
                                <option value={0}>-- Seleccionar --</option>
                                {patrones.map(p => (
                                    <option key={p.id_patron} value={p.id_patron}>
                                        {p.nombre} ({p.total_dias} días)
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label style={labelStyle}>
                            Fecha Inicio (Día 1 del ciclo)
                            <input
                                type="date"
                                value={formData.fecha_inicio}
                                onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                                style={inputStyle}
                            />
                        </label>
                        <label style={labelStyle}>
                            Fecha Fin (vacío = indefinido)
                            <input
                                type="date"
                                value={formData.fecha_fin}
                                onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                                style={inputStyle}
                            />
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button disabled={saving} onClick={handleSave} style={{
                            background: '#10B981', color: '#fff', border: 'none',
                            padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13
                        }}>
                            {saving ? 'Guardando...' : '✓ Guardar'}
                        </button>
                        <button onClick={() => setShowForm(false)} style={{
                            background: '#F1F5F9', color: '#64748B', border: 'none',
                            padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13
                        }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={thStyle}>Empleado</th>
                            <th style={thStyle}>Carnet</th>
                            <th style={thStyle}>Patrón</th>
                            <th style={thStyle}>Ciclo</th>
                            <th style={thStyle}>Inicio</th>
                            <th style={thStyle}>Fin</th>
                            <th style={thStyle}>Estado</th>
                            <th style={thStyle}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {asignaciones.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                                Sin asignaciones registradas
                            </td></tr>
                        ) : asignaciones.map(a => (
                            <tr key={a.id_asignacion} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={tdStyle}>
                                    <span style={{ fontWeight: 600, color: '#0F172A' }}>
                                        {a.nombre_colaborador || '—'}
                                    </span>
                                </td>
                                <td style={tdStyle}>
                                    <code style={{ fontSize: 12, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                                        {a.carnet}
                                    </code>
                                </td>
                                <td style={tdStyle}>
                                    <span style={{ fontWeight: 600, color: '#1E293B' }}>{a.nombre_patron}</span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <span style={{
                                        background: '#F0FDF4', color: '#15803D', padding: '2px 8px',
                                        borderRadius: 12, fontSize: 11, fontWeight: 700,
                                    }}>
                                        {a.total_dias} días
                                    </span>
                                </td>
                                <td style={tdStyle}>{formatDate(a.fecha_inicio)}</td>
                                <td style={tdStyle}>{a.fecha_fin ? formatDate(a.fecha_fin) : <span style={{ color: '#94A3B8' }}>∞ Indefinido</span>}</td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    {a.activo ? (
                                        <span style={{
                                            background: '#DCFCE7', color: '#15803D',
                                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        }}>● Activa</span>
                                    ) : (
                                        <span style={{
                                            background: '#F1F5F9', color: '#94A3B8',
                                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        }}>Inactiva</span>
                                    )}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    {a.activo && (
                                        <button
                                            onClick={() => handleDeactivate(a.id_asignacion, a.nombre_colaborador || a.carnet)}
                                            style={{
                                                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                                padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600
                                            }}
                                        >
                                            Desactivar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TAB 2: PATRONES
// ═══════════════════════════════════════════════════

function PatronesTab({ patrones }: { patrones: Patron[]; horarios: Horario[] }) {
    return (
        <div>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Cada patrón define una secuencia cíclica de turnos. Día con horario = día laboral, día sin horario = día libre.
            </p>
            <div style={{ display: 'grid', gap: 16 }}>
                {patrones.map(p => (
                    <div key={p.id_patron} style={{
                        background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                        overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        {/* Patron Header */}
                        <div style={{
                            padding: '14px 20px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', borderBottom: '1px solid #F1F5F9',
                            background: 'linear-gradient(135deg, #F8FAFC 0%, #fff 100%)',
                        }}>
                            <div>
                                <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
                                    🔄 {p.nombre}
                                </span>
                                {p.descripcion && (
                                    <span style={{ marginLeft: 12, fontSize: 12, color: '#94A3B8' }}>
                                        — {p.descripcion}
                                    </span>
                                )}
                            </div>
                            <span style={{
                                background: '#EFF6FF', color: '#2563EB', padding: '4px 12px',
                                borderRadius: 20, fontSize: 12, fontWeight: 700,
                            }}>
                                Ciclo: {p.total_dias} días
                            </span>
                        </div>

                        {/* Pattern Detail (Visual Grid) */}
                        <div style={{ padding: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {p.detalle?.map((d, i) => {
                                const isOff = !d.id_horario;
                                const isNight = d.es_nocturno;
                                return (
                                    <div key={i} style={{
                                        width: 110, padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                                        background: isOff ? '#F8FAFC' : (isNight ? '#1E1B4B' : '#F0FDF4'),
                                        border: `1px solid ${isOff ? '#E2E8F0' : (isNight ? '#312E81' : '#BBF7D0')}`,
                                        color: isNight ? '#E0E7FF' : '#1E293B',
                                    }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.6, marginBottom: 4 }}>
                                            {d.etiqueta || `Día ${d.nro_dia}`}
                                        </div>
                                        {isOff ? (
                                            <div style={{ fontSize: 20 }}>😴</div>
                                        ) : (
                                            <>
                                                <div style={{ fontSize: 12, fontWeight: 700 }}>
                                                    {isNight && '🌙 '}
                                                    {d.hora_entrada?.substring(0, 5)} – {d.hora_salida?.substring(0, 5)}
                                                </div>
                                                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                                                    {d.nombre_horario?.split(' ')[0]}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TAB 3: HORARIOS (Turnos)
// ═══════════════════════════════════════════════════

function HorariosTab({ horarios }: { horarios: Horario[]; onReload: () => void }) {
    return (
        <div>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>
                Los horarios son los bloques de tiempo base. Un turno nocturno (🌙) indica que la salida es al día siguiente.
            </p>
            <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                            <th style={thStyle}>Nombre</th>
                            <th style={thStyle}>Entrada</th>
                            <th style={thStyle}>Salida</th>
                            <th style={thStyle}>Duración</th>
                            <th style={thStyle}>Tipo</th>
                            <th style={thStyle}>Tolerancia</th>
                            <th style={thStyle}>Descanso</th>
                        </tr>
                    </thead>
                    <tbody>
                        {horarios.map(h => (
                            <tr key={h.id_horario} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                <td style={tdStyle}>
                                    <span style={{ fontWeight: 600, color: '#0F172A' }}>{h.nombre}</span>
                                </td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>
                                    {formatTime(h.hora_entrada)}
                                </td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>
                                    {formatTime(h.hora_salida)}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    <span style={{
                                        background: '#EFF6FF', color: '#2563EB', padding: '2px 8px',
                                        borderRadius: 12, fontSize: 11, fontWeight: 700,
                                    }}>
                                        {h.duracion_horas}h
                                    </span>
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    {h.es_nocturno ? (
                                        <span style={{
                                            background: '#1E1B4B', color: '#C7D2FE',
                                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        }}>🌙 Nocturno</span>
                                    ) : (
                                        <span style={{
                                            background: '#FEF9C3', color: '#A16207',
                                            padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                                        }}>☀️ Diurno</span>
                                    )}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>{h.tolerancia_min} min</td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>{h.descanso_min} min</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// SHARED STYLES & UTILS
// ═══════════════════════════════════════════════════

const labelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: 4,
    fontSize: 12, fontWeight: 600, color: '#475569',
};

const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
    fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
};

const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
    padding: '10px 14px', color: '#334155',
};

function formatDate(d: string): string {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
}

function formatTime(t: string): string {
    if (!t) return '—';
    return t.substring(0, 5);
}

export default JornadaAdminPage;
