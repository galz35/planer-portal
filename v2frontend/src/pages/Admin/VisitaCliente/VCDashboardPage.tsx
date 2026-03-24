/**
 * VCDashboardPage — Dashboard Premium del Módulo Campo
 *
 * Métricas en tiempo real:
 *  - Cards con gradientes por tipo (verde/azul/púrpura/rojo)
 *  - Chart Recharts con tooltips premium
 *  - Auto-refresh cada 60s
 *  - Soporte Dark Mode vía CSS variables
 */
import { useState, useEffect } from 'react';
import { visitaApi } from '../../../services/visitaApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ══════════════════════════════════════════════
// STAT CARD SUB-COMPONENT
// ══════════════════════════════════════════════

function StatCard({ label, value, icon, color, gradient }: {
    label: string; value: number; icon: string; color: string; gradient: string;
}) {
    return (
        <div style={{
            position: 'relative',
            backgroundColor: 'var(--color-bg-secondary, #fff)',
            padding: '24px 20px',
            borderRadius: '16px',
            border: '1px solid var(--color-border, #e2e8f0)',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Decorative gradient bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                background: gradient,
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <div style={{
                        fontSize: '13px', color: 'var(--color-text-muted, #64748b)',
                        fontWeight: 600, marginBottom: '10px',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{label}</div>
                    <div style={{
                        fontSize: '36px', fontWeight: 800, color,
                        fontFamily: '"JetBrains Mono", monospace',
                        lineHeight: 1,
                    }}>{value}</div>
                </div>
                <span style={{
                    fontSize: '32px',
                    opacity: 0.2,
                    filter: 'grayscale(0)',
                }}>{icon}</span>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// CUSTOM TOOLTIP
// ══════════════════════════════════════════════

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            backgroundColor: 'var(--color-bg-secondary, #fff)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                {label}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: payload[0]?.fill || '#3b82f6' }}>
                {payload[0]?.value}
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════

export function VCDashboardPage() {
    const [stats, setStats] = useState<any>({
        visitas_hoy: 0,
        completadas_hoy: 0,
        clientes_activos: 0,
        alertas_fuera_zona: 0
    });
    const [loading, setLoading] = useState(true);

    const loadStats = () => {
        visitaApi.getDashboardAdmin().then(data => {
            setStats(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60_000);
        return () => clearInterval(interval);
    }, []);

    const chartData = [
        { name: 'Pendientes', cantidad: Math.max(0, (stats.visitas_hoy || 0) - (stats.completadas_hoy || 0)), fill: '#f59e0b' },
        { name: 'Completadas', cantidad: stats.completadas_hoy || 0, fill: '#16a34a' },
        { name: 'Alertas', cantidad: stats.alertas_fuera_zona || 0, fill: '#dc2626' },
    ];

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap');
                @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .stat-grid > * { animation: fadeUp 0.4s ease both; }
                .stat-grid > *:nth-child(2) { animation-delay: 0.05s; }
                .stat-grid > *:nth-child(3) { animation-delay: 0.1s; }
                .stat-grid > *:nth-child(4) { animation-delay: 0.15s; }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{
                    fontSize: '26px', fontWeight: 800, margin: '0 0 4px',
                    color: 'var(--color-text-primary, #0f172a)',
                }}>📊 Dashboard Campo</h1>
                <p style={{
                    fontSize: '14px', margin: 0,
                    color: 'var(--color-text-muted, #64748b)',
                }}>
                    Métricas en tiempo real · {dateStr}
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted, #64748b)' }}>
                    <div style={{
                        width: '40px', height: '40px', margin: '0 auto 16px',
                        border: '3px solid var(--color-border, #e2e8f0)', borderTopColor: '#3b82f6',
                        borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                    Cargando métricas...
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="stat-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '16px',
                        marginBottom: '28px',
                    }}>
                        <StatCard
                            label="Visitas del Día"
                            value={stats.visitas_hoy || 0}
                            icon="📍"
                            color="#2563eb"
                            gradient="linear-gradient(90deg, #3b82f6, #60a5fa)"
                        />
                        <StatCard
                            label="Completadas"
                            value={stats.completadas_hoy || 0}
                            icon="✅"
                            color="#16a34a"
                            gradient="linear-gradient(90deg, #16a34a, #4ade80)"
                        />
                        <StatCard
                            label="Clientes Activos"
                            value={stats.clientes_activos || 0}
                            icon="👥"
                            color="#7c3aed"
                            gradient="linear-gradient(90deg, #7c3aed, #a78bfa)"
                        />
                        <StatCard
                            label="Alertas Fuera Zona"
                            value={stats.alertas_fuera_zona || 0}
                            icon="⚠️"
                            color="#dc2626"
                            gradient="linear-gradient(90deg, #dc2626, #f87171)"
                        />
                    </div>

                    {/* Chart */}
                    <div style={{
                        backgroundColor: 'var(--color-bg-secondary, #fff)',
                        padding: '24px',
                        borderRadius: '16px',
                        border: '1px solid var(--color-border, #e2e8f0)',
                        animation: 'fadeUp 0.5s ease 0.2s both',
                    }}>
                        <h2 style={{
                            fontSize: '16px', fontWeight: 700, margin: '0 0 20px',
                            color: 'var(--color-text-primary, #1e293b)',
                        }}>Resumen de Visitas Hoy</h2>
                        <div style={{ height: '320px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light, #f1f5f9)" />
                                    <XAxis
                                        dataKey="name" axisLine={false} tickLine={false}
                                        tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 13 }}
                                    />
                                    <YAxis
                                        axisLine={false} tickLine={false}
                                        tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 13 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-bg-tertiary, #f1f5f9)' }} />
                                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} barSize={50}>
                                        {chartData.map((entry, index) => (
                                            <Bar key={index} dataKey="cantidad" fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default VCDashboardPage;
