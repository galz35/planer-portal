/**
 * GeocercasPage — Gestión de Geocercas y Mapa de Recorridos
 *
 * 2 Secciones:
 * 1. Geocercas: Asignar zonas permitidas a empleados para marcaje
 * 2. Recorridos: Ver rutas GPS de operadores en mapa
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { marcajeApi } from '../../../services/marcajeApi';

// ═══════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════

type Tab = 'geocercas' | 'recorridos';

export function GeocercasPage() {
    const [tab, setTab] = useState<Tab>('geocercas');

    const tabs: { key: Tab; label: string; icon: string }[] = [
        { key: 'geocercas', label: 'Geocercas por Empleado', icon: '📍' },
        { key: 'recorridos', label: 'Recorridos en Mapa', icon: '🗺️' },
    ];

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Inter, sans-serif' }}>
                    📍 Geocercas y Recorridos
                </h1>
                <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                    Gestión de zonas permitidas de marcaje y visualización de rutas de campo
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid #F1F5F9' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '10px 20px', border: 'none',
                        borderBottom: tab === t.key ? '3px solid #E11D48' : '3px solid transparent',
                        background: 'none', cursor: 'pointer', fontSize: 14,
                        fontWeight: tab === t.key ? 700 : 500,
                        color: tab === t.key ? '#0F172A' : '#94A3B8',
                        fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <span>{t.icon}</span> {t.label}
                    </button>
                ))}
            </div>

            {tab === 'geocercas' && <GeocercasTab />}
            {tab === 'recorridos' && <RecorridosTab />}
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TAB 1: GEOCERCAS POR EMPLEADO
// ═══════════════════════════════════════════════════

function GeocercasTab() {
    const [sites, setSites] = useState<any[]>([]);
    const [searchCarnet, setSearchCarnet] = useState('');
    const [selectedCarnet, setSelectedCarnet] = useState('');
    const [userGeocercas, setUserGeocercas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form para nueva geocerca
    const [showNewSite, setShowNewSite] = useState(false);
    const [newSite, setNewSite] = useState({ nombre: '', lat: '', lon: '', radio_metros: '200' });

    useEffect(() => {
        marcajeApi.getAdminSites().then(s => setSites(Array.isArray(s) ? s : []));
    }, []);

    const buscarGeocercas = async () => {
        if (!searchCarnet.trim()) return;
        setLoading(true);
        setSelectedCarnet(searchCarnet.trim());
        try {
            const result = await marcajeApi.getGeocercasUsuario(searchCarnet.trim());
            setUserGeocercas(Array.isArray(result) ? result : []);
        } catch {
            setUserGeocercas([]);
        }
        setLoading(false);
    };

    const asignar = async (idSite: number) => {
        if (!selectedCarnet) return;
        await marcajeApi.asignarGeocerca(selectedCarnet, idSite);
        buscarGeocercas();
    };

    const quitar = async (id: number) => {
        await marcajeApi.quitarGeocerca(id);
        buscarGeocercas();
    };

    const crearSite = async () => {
        if (!newSite.nombre || !newSite.lat || !newSite.lon) return;
        await marcajeApi.crearSite({
            nombre: newSite.nombre,
            lat: parseFloat(newSite.lat),
            lon: parseFloat(newSite.lon),
            radio_metros: parseInt(newSite.radio_metros) || 200,
        });
        setShowNewSite(false);
        setNewSite({ nombre: '', lat: '', lon: '', radio_metros: '200' });
        const s = await marcajeApi.getAdminSites();
        setSites(Array.isArray(s) ? s : []);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* LEFT: Búsqueda + Geocercas del empleado */}
            <div>
                <div style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                    padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                        🔍 Buscar Empleado
                    </h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={searchCarnet}
                            onChange={e => setSearchCarnet(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && buscarGeocercas()}
                            placeholder="Carnet del empleado..."
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: 8,
                                border: '1px solid #E2E8F0', fontSize: 13, outline: 'none',
                            }}
                        />
                        <button onClick={buscarGeocercas} style={{
                            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                            color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8,
                            cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        }}>
                            Buscar
                        </button>
                    </div>
                </div>

                {/* Geocercas asignadas */}
                {selectedCarnet && (
                    <div style={{
                        background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                        padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                            Geocercas de <code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{selectedCarnet}</code>
                        </h3>
                        {loading ? (
                            <p style={{ color: '#94A3B8' }}>Cargando...</p>
                        ) : userGeocercas.length === 0 ? (
                            <p style={{ color: '#94A3B8', fontSize: 13 }}>
                                Sin geocercas asignadas — puede marcar desde cualquier ubicación
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {userGeocercas.map((g: any) => (
                                    <div key={g.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 14px', borderRadius: 8,
                                        background: g.activo ? '#F0FDF4' : '#F8FAFC',
                                        border: `1px solid ${g.activo ? '#BBF7D0' : '#E2E8F0'}`,
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>
                                                📍 {g.nombre}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#94A3B8' }}>
                                                {g.lat?.toFixed(4)}, {g.lon?.toFixed(4)} — Radio: {g.radio_metros}m
                                            </div>
                                        </div>
                                        {g.activo ? (
                                            <button onClick={() => quitar(g.id)} style={{
                                                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                                padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600
                                            }}>✕ Quitar</button>
                                        ) : (
                                            <span style={{ fontSize: 11, color: '#94A3B8' }}>Inactiva</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Asignar nueva geocerca existente */}
                        {selectedCarnet && sites.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                                    Asignar geocerca existente:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {sites.filter((s: any) =>
                                        !userGeocercas.some((g: any) => g.id_site === s.id && g.activo)
                                    ).map((s: any) => (
                                        <button key={s.id} onClick={() => asignar(s.id)} style={{
                                            background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                                            padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600
                                        }}>
                                            + {s.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT: Lista de sites + Crear nuevo */}
            <div>
                <div style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                    padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                            🌐 Todas las Geocercas ({sites.length})
                        </h3>
                        <button onClick={() => setShowNewSite(!showNewSite)} style={{
                            background: 'linear-gradient(135deg, #10B981, #059669)',
                            color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6,
                            cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>
                            + Nueva Geocerca
                        </button>
                    </div>

                    {showNewSite && (
                        <div style={{
                            background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8,
                            padding: 14, marginBottom: 12,
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <input placeholder="Nombre (ej: Oficina Sur)" value={newSite.nombre}
                                    onChange={e => setNewSite({ ...newSite, nombre: e.target.value })}
                                    style={{ ...inputStyle, gridColumn: '1/3' }} />
                                <input placeholder="Latitud" value={newSite.lat}
                                    onChange={e => setNewSite({ ...newSite, lat: e.target.value })}
                                    style={inputStyle} />
                                <input placeholder="Longitud" value={newSite.lon}
                                    onChange={e => setNewSite({ ...newSite, lon: e.target.value })}
                                    style={inputStyle} />
                                <input placeholder="Radio (metros)" value={newSite.radio_metros}
                                    onChange={e => setNewSite({ ...newSite, radio_metros: e.target.value })}
                                    style={inputStyle} />
                                <button onClick={crearSite} style={{
                                    background: '#10B981', color: '#fff', border: 'none', padding: '8px',
                                    borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12
                                }}>✓ Crear</button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sites.map((s: any) => (
                            <div key={s.id} style={{
                                padding: '12px 14px', borderRadius: 8,
                                background: '#F8FAFC', border: '1px solid #E2E8F0',
                            }}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>
                                    📍 {s.nombre}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                                    📌 {Number(s.lat).toFixed(6)}, {Number(s.long || s.lon).toFixed(6)} —
                                    Radio: <strong>{s.radio_metros}m</strong> —
                                    Accuracy máx: {s.accuracy_max}m
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// TAB 2: RECORRIDOS CON MAPA
// ═══════════════════════════════════════════════════

function RecorridosTab() {
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [recorridos, setRecorridos] = useState<any[]>([]);
    const [selectedRecorrido, setSelectedRecorrido] = useState<any>(null);
    const [puntos, setPuntos] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);

    const loadRecorridos = useCallback(async () => {
        setLoading(true);
        try {
            const result = await marcajeApi.getRecorridosAdmin(fecha);
            setRecorridos(Array.isArray(result) ? result : []);
        } catch {
            setRecorridos([]);
        }
        setLoading(false);
    }, [fecha]);

    useEffect(() => { loadRecorridos(); }, [loadRecorridos]);

    const selectRecorrido = async (r: any) => {
        setSelectedRecorrido(r);
        try {
            const pts = await marcajeApi.getPuntosRecorrido(r.id_recorrido);
            setPuntos(Array.isArray(pts) ? pts : []);
        } catch {
            setPuntos([]);
        }
    };

    // Auto-refresh live tours
    useEffect(() => {
        if (!selectedRecorrido || selectedRecorrido.estado !== 'EN_CURSO') return;
        const interval = setInterval(() => {
            marcajeApi.getPuntosRecorrido(selectedRecorrido.id_recorrido).then(pts => {
                if (Array.isArray(pts)) setPuntos(pts);
            });
            // Also refresh list to update stats (min, km)
            loadRecorridos();
        }, 10000); // 10s
        return () => clearInterval(interval);
    }, [selectedRecorrido, loadRecorridos]);

    // Render map with Leaflet CDN
    useEffect(() => {
        if (!mapRef.current || puntos.length === 0) return;

        // Load Leaflet dynamically
        const loadLeaflet = async () => {
            if (!(window as any).L) {
                // CSS
                const css = document.createElement('link');
                css.rel = 'stylesheet';
                css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(css);
                // JS
                await new Promise<void>((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = () => resolve();
                    document.head.appendChild(script);
                });
            }

            const L = (window as any).L;
            if (!L) return;

            // Clear previous map
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }

            const map = L.map(mapRef.current).setView(
                [puntos[0].lat, puntos[0].lon], 14
            );
            mapInstanceRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Draw route polyline
            const coords = puntos.map((p: any) => [p.lat, p.lon]);
            L.polyline(coords, {
                color: '#E11D48', weight: 4, opacity: 0.8,
                dashArray: null, lineJoin: 'round',
            }).addTo(map);

            // Start marker
            L.circleMarker([puntos[0].lat, puntos[0].lon], {
                radius: 10, fillColor: '#10B981', fillOpacity: 1,
                color: '#fff', weight: 3,
            }).addTo(map).bindPopup('🟢 INICIO');

            // End marker
            const last = puntos[puntos.length - 1];
            L.circleMarker([last.lat, last.lon], {
                radius: 10, fillColor: '#EF4444', fillOpacity: 1,
                color: '#fff', weight: 3,
            }).addTo(map).bindPopup('🔴 FIN');

            // Visit markers
            puntos.filter((p: any) => p.tipo === 'VISITA' || p.tipo === 'PARADA').forEach((p: any) => {
                L.circleMarker([p.lat, p.lon], {
                    radius: 7, fillColor: '#2563EB', fillOpacity: 1,
                    color: '#fff', weight: 2,
                }).addTo(map).bindPopup(
                    `📍 ${p.tipo}${p.notas ? ': ' + p.notas : ''}<br>` +
                    `⏰ ${new Date(p.timestamp_gps).toLocaleTimeString('es-NI')}`
                );
            });

            // Fit bounds
            map.fitBounds(L.latLngBounds(coords).pad(0.1));
        };

        loadLeaflet();
    }, [puntos]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
            {/* LEFT: Lista recorridos */}
            <div>
                <div style={{
                    background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                    padding: 16, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                        Fecha:
                        <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                            style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
                    </label>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Cargando...</div>
                ) : recorridos.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: 40, color: '#94A3B8',
                        background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                    }}>
                        Sin recorridos para esta fecha
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recorridos.map((r: any) => (
                            <button key={r.id_recorrido} onClick={() => selectRecorrido(r)}
                                style={{
                                    background: selectedRecorrido?.id_recorrido === r.id_recorrido ? '#FEF2F2' : '#fff',
                                    border: `1px solid ${selectedRecorrido?.id_recorrido === r.id_recorrido ? '#FECACA' : '#E2E8F0'}`,
                                    borderRadius: 10, padding: 14, textAlign: 'left', cursor: 'pointer',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                                    {r.nombre_colaborador || r.carnet}
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12, color: '#64748B' }}>
                                    <span>🕐 {r.duracion_min || '—'} min</span>
                                    <span>📏 {Number(r.km_total || 0).toFixed(1)} km</span>
                                    <span>📍 {r.total_paradas || 0} paradas</span>
                                </div>
                                <div style={{ marginTop: 4, fontSize: 11, color: '#94A3B8' }}>
                                    {new Date(r.hora_inicio).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}
                                    {r.hora_fin ? ` → ${new Date(r.hora_fin).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })}` : ' → en curso'}
                                </div>
                                <span style={{
                                    display: 'inline-block', marginTop: 4,
                                    background: r.estado === 'EN_CURSO' ? '#FEF3C7' : '#DCFCE7',
                                    color: r.estado === 'EN_CURSO' ? '#D97706' : '#15803D',
                                    padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                                }}>{r.estado === 'EN_CURSO' ? '● En Curso' : '✓ Finalizado'}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT: Mapa */}
            <div style={{
                background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0',
                overflow: 'hidden', minHeight: 500, position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
                {selectedRecorrido && puntos.length > 0 ? (
                    <>
                        {/* Stats bar */}
                        <div style={{
                            position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000,
                            background: 'rgba(15,23,42,0.9)', borderRadius: 10, padding: '10px 16px',
                            display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: 13,
                            backdropFilter: 'blur(8px)',
                        }}>
                            <span style={{ fontWeight: 700 }}>
                                {selectedRecorrido.nombre_colaborador || selectedRecorrido.carnet}
                            </span>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <span>🕐 {selectedRecorrido.duracion_min} min</span>
                                <span>📏 {Number(selectedRecorrido.km_total).toFixed(1)} km</span>
                                <span>📍 {puntos.length} puntos</span>
                            </div>
                        </div>
                        <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 500 }} />
                    </>
                ) : (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', height: '100%', minHeight: 500, color: '#94A3B8',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
                        <p style={{ fontSize: 15, fontWeight: 600 }}>Selecciona un recorrido para ver la ruta en el mapa</p>
                        <p style={{ fontSize: 12 }}>Se mostrará la ruta GPS con inicio, fin y paradas del operador</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
    fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
};

export default GeocercasPage;
