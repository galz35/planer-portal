/**
 * AttendanceManager — Componente CORE del Módulo Marcaje Web
 *
 * Rediseño Premium:
 *  - Reloj en vivo con fecha
 *  - Timer grande HH:MM:SS con gradiente animado
 *  - Tabs: Jornada | Horas Extra | Compensadas
 *  - Botón principal con efecto glassmorphism
 *  - GPS Tracking con indicador visual
 *  - Historial con timeline vertical y badges
 *  - Stale Shift + Correcciones dialogs
 *  - Soporte Dark Mode vía CSS vars
 *  - Offline sync con cola
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { marcajeApi, type AttendanceSummary, type AttendanceRecord } from '../../services/marcajeApi';

// ==========================================
// STYLES (CSS-in-JS con soporte dark mode)
// ==========================================

const styles = {
    page: {
        maxWidth: '540px',
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: 'Inter, system-ui, sans-serif',
    } as React.CSSProperties,

    // Clock
    clockCard: {
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        borderRadius: '20px',
        padding: '28px 20px',
        textAlign: 'center' as const,
        boxShadow: '0 8px 24px rgba(30,41,59,0.35)',
        position: 'relative' as const,
        overflow: 'hidden' as const,
    },
    clockTime: {
        fontSize: '42px',
        fontWeight: 800,
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        color: '#fff',
        letterSpacing: '3px',
        lineHeight: 1.2,
    },
    clockDate: {
        fontSize: '14px',
        color: 'rgba(255,255,255,0.6)',
        fontWeight: 500,
        marginTop: '6px',
    },

    // Tabs
    tabsContainer: {
        display: 'flex',
        gap: '4px',
        padding: '4px',
        borderRadius: '12px',
        backgroundColor: 'var(--color-bg-tertiary, #f1f5f9)',
        marginTop: '16px',
    },
    tab: (active: boolean) => ({
        flex: 1,
        padding: '10px 8px',
        borderRadius: '10px',
        border: 'none',
        cursor: 'pointer' as const,
        fontSize: '13px',
        fontWeight: active ? 700 : 500,
        color: active ? 'var(--color-text-primary, #1e293b)' : 'var(--color-text-muted, #94a3b8)',
        backgroundColor: active ? 'var(--color-bg-secondary, #fff)' : 'transparent',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.2s ease',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        alignItems: 'center' as const,
        gap: '2px',
    }) as React.CSSProperties,

    // Timer card
    timerCard: (active: boolean) => ({
        textAlign: 'center' as const,
        padding: '32px 20px',
        marginTop: '16px',
        borderRadius: '16px',
        background: active
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : 'linear-gradient(135deg, var(--color-bg-tertiary, #f8fafc) 0%, var(--color-bg-primary, #f1f5f9) 100%)',
        border: `2px solid ${active ? '#86efac' : 'var(--color-border, #e2e8f0)'}`,
        transition: 'all 0.3s ease',
    }) as React.CSSProperties,
    timerValue: (active: boolean) => ({
        fontSize: '52px',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontWeight: 800,
        letterSpacing: '4px',
        color: active ? '#4f46e5' : 'var(--color-text-muted, #cbd5e1)',
        lineHeight: 1.1,
    }),
    timerLabel: {
        fontSize: '13px',
        color: 'var(--color-text-muted, #64748b)',
        fontWeight: 500,
        marginBottom: '8px',
    },
    timerSince: {
        fontSize: '12px',
        color: 'var(--color-text-muted, #94a3b8)',
        marginTop: '8px',
    },

    // Main button
    mainButton: (isActive: boolean, loading: boolean) => ({
        width: '100%',
        padding: '18px',
        borderRadius: '16px',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '17px',
        fontWeight: 700,
        color: '#fff',
        backgroundColor: loading ? '#94a3b8' : isActive ? '#dc2626' : '#16a34a',
        boxShadow: `0 6px 20px ${loading ? 'rgba(0,0,0,0.1)' : isActive ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)'}`,
        transition: 'all 0.25s ease',
        marginTop: '20px',
        display: 'flex' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: '10px',
        letterSpacing: '0.5px',
    }) as React.CSSProperties,

    // GPS tracking button
    trackingButton: (isTracking: boolean) => ({
        width: '100%',
        padding: '14px',
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 700,
        color: '#fff',
        backgroundColor: isTracking ? '#ea580c' : '#4f46e5',
        boxShadow: `0 4px 14px ${isTracking ? 'rgba(234,88,12,0.25)' : 'rgba(79,70,229,0.25)'}`,
        transition: 'all 0.2s ease',
        marginTop: '10px',
        display: 'flex' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: '8px',
    }) as React.CSSProperties,

    // Secondary buttons
    secondaryRow: {
        display: 'flex',
        gap: '8px',
        marginTop: '10px',
    },
    secondaryButton: {
        flex: 1,
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid var(--color-border, #e2e8f0)',
        backgroundColor: 'var(--color-bg-secondary, #fff)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--color-text-secondary, #64748b)',
        transition: 'all 0.15s ease',
    } as React.CSSProperties,

    // Status bar
    statusBar: (online: boolean) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: '10px',
        backgroundColor: online ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${online ? '#bbf7d0' : '#fecaca'}`,
        marginBottom: '16px',
        fontSize: '13px',
    }) as React.CSSProperties,

    // History
    historyCard: {
        marginTop: '24px',
        borderRadius: '16px',
        border: '1px solid var(--color-border, #e2e8f0)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg-secondary, #fff)',
    } as React.CSSProperties,
    historyHeader: {
        padding: '14px 16px',
        backgroundColor: 'var(--color-bg-tertiary, #f8fafc)',
        borderBottom: '1px solid var(--color-border, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    } as React.CSSProperties,
    historyTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--color-text-secondary, #475569)',
    },

    // Toast
    toast: (type: string) => ({
        position: 'fixed' as const,
        top: '20px',
        right: '20px',
        zIndex: 10000,
        padding: '12px 20px',
        borderRadius: '12px',
        backgroundColor: type === 'success' ? '#dcfce7' : type === 'warning' ? '#fef3c7' : '#fee2e2',
        color: type === 'success' ? '#166534' : type === 'warning' ? '#92400e' : '#991b1b',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(8px)',
        animation: 'slideIn 0.3s ease',
        maxWidth: '360px',
    }) as React.CSSProperties,

    // Dialog overlay
    overlay: {
        position: 'fixed' as const,
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
    } as React.CSSProperties,
    dialog: {
        backgroundColor: 'var(--color-bg-secondary, #fff)',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '420px',
        width: '90%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
    } as React.CSSProperties,
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

/** Reloj en vivo */
function LiveClock() {
    const [time, setTime] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
            setDate(now.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={styles.clockCard}>
            {/* Decorative circle */}
            <div style={{
                position: 'absolute', top: '-30px', right: '-30px',
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
            }} />
            <div style={styles.clockTime}>{time}</div>
            <div style={styles.clockDate}>{date}</div>
        </div>
    );
}

/** Timer en vivo HH:MM:SS */
function LiveTimer({ since }: { since: string | null }) {
    const [elapsed, setElapsed] = useState('00:00:00');

    useEffect(() => {
        if (!since) { setElapsed('00:00:00'); return; }
        const startMs = new Date(since).getTime();

        const tick = () => {
            const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            const h = String(Math.floor(diff / 3600)).padStart(2, '0');
            const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            setElapsed(`${h}:${m}:${s}`);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [since]);

    return <span>{elapsed}</span>;
}

/** Badge de tipo de marcaje */
function TypeBadge({ tipo }: { tipo: string }) {
    const config: Record<string, { bg: string; text: string; label: string; icon: string }> = {
        ENTRADA: { bg: '#dcfce7', text: '#166534', label: 'Entrada', icon: '🟢' },
        SALIDA: { bg: '#fee2e2', text: '#991b1b', label: 'Salida', icon: '🔴' },
        INICIO_EXTRA: { bg: '#dbeafe', text: '#1e40af', label: 'Inicio Extra', icon: '🔵' },
        FIN_EXTRA: { bg: '#e0e7ff', text: '#3730a3', label: 'Fin Extra', icon: '⏹' },
        INICIO_COMPENSADA: { bg: '#fef9c3', text: '#854d0e', label: 'Inicio Comp.', icon: '🟡' },
        FIN_COMPENSADA: { bg: '#fef3c7', text: '#92400e', label: 'Fin Comp.', icon: '⏹' },
    };
    const c = config[tipo] || { bg: '#f3f4f6', text: '#374151', label: tipo, icon: '⚪' };

    return (
        <span style={{
            backgroundColor: c.bg, color: c.text,
            padding: '3px 10px', borderRadius: '8px',
            fontSize: '12px', fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
            {c.icon} {c.label}
        </span>
    );
}

/** Item de historial con timeline */
function HistoryItem({ record, isLast }: { record: AttendanceRecord; isLast: boolean }) {
    const time = new Date(record.fecha).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isEntry = record.tipo_marcaje.includes('ENTRADA') || record.tipo_marcaje.includes('INICIO');

    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '12px 16px',
            position: 'relative',
        }}>
            {/* Timeline dot + line */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: '2px', minWidth: '20px',
            }}>
                <div style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    backgroundColor: isEntry ? '#16a34a' : '#dc2626',
                    boxShadow: `0 0 0 3px ${isEntry ? '#dcfce7' : '#fee2e2'}`,
                }} />
                {!isLast && (
                    <div style={{
                        width: '2px', flex: 1, minHeight: '24px',
                        backgroundColor: 'var(--color-border-light, #f1f5f9)',
                        marginTop: '4px',
                    }} />
                )}
            </div>
            {/* Content */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TypeBadge tipo={record.tipo_marcaje} />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #64748b)' }}>
                        {record.tipo_device === 'MOBILE' ? '📱' : '🖥️'}
                    </span>
                </div>
                <div style={{
                    fontSize: '15px', fontWeight: 700,
                    color: 'var(--color-text-primary, #1e293b)',
                    marginTop: '4px',
                }}>
                    {time}
                </div>
                {record.motivo && (
                    <div style={{
                        fontSize: '11px', color: '#f59e0b', marginTop: '2px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        ⚠️ {record.motivo.split('|').length} aviso(s)
                    </div>
                )}
            </div>
        </div>
    );
}

/** Dialog Stale Shift */
function StaleShiftDialog({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>⚠️</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#dc2626' }}>
                        Turno Anterior Abierto
                    </h3>
                </div>
                <p style={{
                    margin: '0 0 20px', fontSize: '14px',
                    color: 'var(--color-text-secondary, #64748b)',
                    lineHeight: '1.6',
                }}>
                    Tu último turno lleva más de <strong>20 horas</strong> abierto sin salida.
                    Al continuar, se registrará una nueva entrada.
                    Puedes solicitar una corrección después.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{
                        ...styles.secondaryButton, flex: 'none',
                        padding: '10px 20px',
                    }}>Cancelar</button>
                    <button onClick={onConfirm} style={{
                        padding: '10px 20px', borderRadius: '10px', border: 'none',
                        backgroundColor: '#dc2626', color: '#fff', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600,
                    }}>Continuar de todas formas</button>
                </div>
            </div>
        </div>
    );
}

/** Dialog Solicitar Corrección */
function CorrectionDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (motivo: string) => void }) {
    const [motivo, setMotivo] = useState('');

    return (
        <div style={styles.overlay}>
            <div style={styles.dialog}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '28px' }}>📝</span>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary, #1e293b)' }}>
                        Solicitar Corrección
                    </h3>
                </div>
                <textarea
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Describe el motivo de la corrección..."
                    style={{
                        width: '100%', minHeight: '100px', padding: '12px',
                        borderRadius: '10px', border: '1px solid var(--color-border, #e2e8f0)',
                        fontSize: '14px', resize: 'vertical', fontFamily: 'inherit',
                        backgroundColor: 'var(--color-bg-primary, #f8fafc)',
                        color: 'var(--color-text-primary, #1e293b)',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={onClose} style={{
                        ...styles.secondaryButton, flex: 'none',
                        padding: '10px 20px',
                    }}>Cancelar</button>
                    <button
                        onClick={() => motivo.trim() && onSubmit(motivo.trim())}
                        disabled={!motivo.trim()}
                        style={{
                            padding: '10px 20px', borderRadius: '10px', border: 'none',
                            backgroundColor: motivo.trim() ? '#4f46e5' : '#cbd5e1',
                            color: '#fff', cursor: motivo.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '13px', fontWeight: 600,
                        }}
                    >Enviar Solicitud</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================
// TABS CONFIG
// ==========================================

type TabId = 'normal' | 'extra' | 'compensada';

const TABS: { id: TabId; label: string; icon: string; enterType: string; exitType: string }[] = [
    { id: 'normal', label: 'Jornada', icon: '🕐', enterType: 'ENTRADA', exitType: 'SALIDA' },
    { id: 'extra', label: 'Hrs Extra', icon: '⏰', enterType: 'INICIO_EXTRA', exitType: 'FIN_EXTRA' },
    { id: 'compensada', label: 'Compensadas', icon: '🔄', enterType: 'INICIO_COMPENSADA', exitType: 'FIN_COMPENSADA' },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function AttendanceManager() {
    const [summary, setSummary] = useState<AttendanceSummary | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>('normal');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showStaleDialog, setShowStaleDialog] = useState(false);
    const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warning' | 'error' } | null>(null);

    // GPS Tracking State
    const [isTracking, setIsTracking] = useState(false);
    const [trackingPoints, setTrackingPoints] = useState(0);
    const trackingRef = useRef<{ watchId: number | null; intervalId: ReturnType<typeof setInterval> | null }>({
        watchId: null, intervalId: null
    });
    const lastGpsRef = useRef<{ lat: number; lon: number; accuracy: number } | null>(null);

    const { sendMark, isOnline, isSyncing, queueLength } = useOfflineSync();

    const fetchSummary = useCallback(async () => {
        try {
            const data = await marcajeApi.getSummary();
            setSummary(data);
        } catch (err) {
            console.error('[AttendanceManager] Error cargando resumen:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);
    useEffect(() => {
        const interval = setInterval(fetchSummary, 60_000);
        return () => clearInterval(interval);
    }, [fetchSummary]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // GPS helper
    const getGps = (): Promise<{ lat: number; lon: number; accuracy: number } | null> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    };

    // GPS Tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setToast({ msg: '❌ Tu navegador no soporta geolocalización', type: 'error' });
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                lastGpsRef.current = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
            },
            () => { },
            { enableHighAccuracy: true }
        );

        const intervalId = setInterval(async () => {
            if (!lastGpsRef.current) return;
            try {
                await marcajeApi.sendGpsPoint({
                    lat: lastGpsRef.current.lat,
                    lon: lastGpsRef.current.lon,
                    accuracy: lastGpsRef.current.accuracy,
                    timestamp: new Date().toISOString(),
                    fuente: 'FOREGROUND',
                });
                setTrackingPoints(prev => prev + 1);
            } catch {
                // silenciar
            }
        }, 30_000);

        trackingRef.current = { watchId, intervalId };
        setIsTracking(true);
        setTrackingPoints(0);
        setToast({ msg: '📍 Grabando recorrido GPS cada 30 segundos...', type: 'success' });
    }, []);

    const stopTracking = useCallback(() => {
        if (trackingRef.current.watchId !== null) {
            navigator.geolocation.clearWatch(trackingRef.current.watchId);
        }
        if (trackingRef.current.intervalId !== null) {
            clearInterval(trackingRef.current.intervalId);
        }
        trackingRef.current = { watchId: null, intervalId: null };
        setIsTracking(false);
        lastGpsRef.current = null;
        setToast({ msg: `📍 Recorrido detenido (${trackingPoints} puntos capturados)`, type: 'warning' });
    }, [trackingPoints]);

    useEffect(() => {
        return () => {
            if (trackingRef.current.watchId !== null) {
                navigator.geolocation.clearWatch(trackingRef.current.watchId);
            }
            if (trackingRef.current.intervalId !== null) {
                clearInterval(trackingRef.current.intervalId);
            }
        };
    }, []);

    // Determinar estado por tab
    const getActiveState = () => {
        if (!summary || !summary.flags) return { isActive: false, since: null };
        const { flags } = summary;

        if (activeTab === 'normal') return { isActive: flags.isClockedIn ?? false, since: flags.lastCheckIn ?? null };
        if (activeTab === 'extra') return { isActive: flags.isOvertimeActive ?? false, since: flags.lastRecordTimestamp ?? null };
        if (activeTab === 'compensada') return { isActive: flags.isCompensatedActive ?? false, since: flags.lastRecordTimestamp ?? null };
        return { isActive: false, since: null };
    };

    // Acción principal
    const handleMainAction = async (forceEntry = false) => {
        if (actionLoading) return;

        const { isActive } = getActiveState();
        const tab = TABS.find(t => t.id === activeTab)!;
        const tipoMarcaje = isActive ? tab.exitType : tab.enterType;

        if (tipoMarcaje === 'ENTRADA' && summary?.flags?.staleShift && !forceEntry) {
            setShowStaleDialog(true);
            return;
        }

        setActionLoading(true);
        try {
            const gps = await getGps();

            const result = await sendMark({
                tipo_marcaje: tipoMarcaje as any,
                tipo_device: 'DESKTOP',
                lat: gps?.lat,
                lon: gps?.lon,
                accuracy: gps?.accuracy,
            });

            if (result.success) {
                if (result.queued) {
                    setToast({ msg: '📴 Sin conexión — marcaje guardado en cola', type: 'warning' });
                } else if (result.result?.hasWarnings) {
                    setToast({ msg: `⚠️ Marcaje registrado con avisos`, type: 'warning' });
                } else {
                    setToast({ msg: `✅ ${isActive ? 'Salida' : 'Entrada'} registrada correctamente`, type: 'success' });
                }
                await fetchSummary();
            } else {
                setToast({ msg: '❌ Error al registrar marcaje', type: 'error' });
            }
        } catch (err) {
            console.error('[AttendanceManager] Error al registrar:', err);
            setToast({ msg: '❌ Error inesperado al registrar marcaje', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Deshacer
    const handleUndo = async () => {
        try {
            const result = await marcajeApi.undoLastCheckout();
            if (result.ok) {
                setToast({ msg: '↩️ Último registro deshecho', type: 'success' });
                await fetchSummary();
            } else {
                setToast({ msg: result.mensaje, type: 'warning' });
            }
        } catch {
            setToast({ msg: '❌ Error al deshacer', type: 'error' });
        }
    };

    // Corrección
    const handleCorrection = async (motivo: string) => {
        try {
            await marcajeApi.requestCorrection({ tipo_solicitud: 'CORRECCION_ASISTENCIA', motivo });
            setToast({ msg: '📨 Solicitud de corrección enviada', type: 'success' });
            setShowCorrectionDialog(false);
        } catch {
            setToast({ msg: '❌ Error al enviar solicitud', type: 'error' });
        }
    };

    // ==========================================
    // RENDER
    // ==========================================

    const { isActive, since } = getActiveState();

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '40px', height: '40px', margin: '0 auto 12px',
                        border: '3px solid #e2e8f0', borderTopColor: '#4f46e5',
                        borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                    <div style={{ fontSize: '14px', color: 'var(--color-text-muted, #94a3b8)' }}>
                        Cargando marcaje...
                    </div>
                </div>
            </div>
        );
    }

    const enterLabel = activeTab === 'extra'
        ? '🔵 Iniciar Horas Extra'
        : activeTab === 'compensada'
            ? '🟡 Iniciar Compensadas'
            : '🟢 Registrar Entrada';
    const exitLabel = activeTab === 'extra'
        ? '⏹ Finalizar Horas Extra'
        : activeTab === 'compensada'
            ? '⏹ Finalizar Compensadas'
            : '🔴 Registrar Salida';

    return (
        <div style={styles.page}>
            {/* CSS animations */}
            <style>{`
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700;800&display=swap');
            `}</style>

            {/* Toast */}
            {toast && <div style={styles.toast(toast.type)}>{toast.msg}</div>}

            {/* Clock */}
            <LiveClock />

            {/* Status bar */}
            <div style={{ ...styles.statusBar(isOnline), marginTop: '16px' }}>
                <span style={{ color: isOnline ? '#166534' : '#991b1b' }}>
                    {isOnline ? '🟢 Conectado' : '🔴 Sin conexión'}
                </span>
                {queueLength > 0 && (
                    <span style={{
                        fontSize: '12px', color: '#92400e',
                        backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '6px',
                    }}>
                        {isSyncing ? '🔄 Sincronizando...' : `📤 ${queueLength} pendiente(s)`}
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div style={styles.tabsContainer}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={styles.tab(activeTab === t.id)}
                    >
                        <span style={{ fontSize: '16px' }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Timer */}
            <div style={styles.timerCard(isActive)}>
                <div style={styles.timerLabel}>
                    {isActive ? '⏱ Tiempo en curso' : '⏸ Sin turno activo'}
                </div>
                <div style={styles.timerValue(isActive)}>
                    <LiveTimer since={isActive ? since : null} />
                </div>
                {isActive && since && (
                    <div style={styles.timerSince}>
                        Desde {new Date(since).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
                {isTracking && (
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        marginTop: '10px', padding: '4px 12px', borderRadius: '20px',
                        backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 700,
                    }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s infinite' }} />
                        GPS · {trackingPoints} pts
                    </div>
                )}
            </div>

            {/* Main button */}
            <button
                onClick={() => handleMainAction()}
                disabled={actionLoading}
                style={styles.mainButton(isActive, actionLoading)}
            >
                {actionLoading
                    ? '⏳ Procesando...'
                    : isActive ? exitLabel : enterLabel
                }
            </button>

            {/* GPS Tracking button */}
            {isActive && (
                <button
                    onClick={() => isTracking ? stopTracking() : startTracking()}
                    style={styles.trackingButton(isTracking)}
                >
                    {isTracking ? (
                        <>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 1.5s infinite' }} />
                            ⏹ DETENER RECORRIDO ({trackingPoints} puntos)
                        </>
                    ) : (
                        '📍 GRABAR RECORRIDO GPS'
                    )}
                </button>
            )}

            {/* Secondary actions */}
            <div style={styles.secondaryRow}>
                <button onClick={handleUndo} style={styles.secondaryButton}>↩️ Deshacer</button>
                <button onClick={() => setShowCorrectionDialog(true)} style={styles.secondaryButton}>📝 Corrección</button>
            </div>

            {/* History */}
            <div style={styles.historyCard}>
                <div style={styles.historyHeader}>
                    <span style={styles.historyTitle}>📋 Historial de Hoy</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #94a3b8)' }}>
                        {summary?.dailyHistory?.length || 0} registro(s)
                    </span>
                </div>
                {summary?.dailyHistory && summary.dailyHistory.length > 0 ? (
                    <div style={{ padding: '8px 0' }}>
                        {summary.dailyHistory.map((record, idx) => (
                            <HistoryItem
                                key={record.id}
                                record={record}
                                isLast={idx === summary.dailyHistory.length - 1}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        padding: '32px 20px', textAlign: 'center',
                        color: 'var(--color-text-muted, #94a3b8)', fontSize: '14px',
                    }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                        Sin registros hoy
                    </div>
                )}
            </div>

            {/* Dialogs */}
            {showStaleDialog && (
                <StaleShiftDialog
                    onClose={() => setShowStaleDialog(false)}
                    onConfirm={() => { setShowStaleDialog(false); handleMainAction(true); }}
                />
            )}
            {showCorrectionDialog && (
                <CorrectionDialog
                    onClose={() => setShowCorrectionDialog(false)}
                    onSubmit={handleCorrection}
                />
            )}
        </div>
    );
}
