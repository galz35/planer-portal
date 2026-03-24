/**
 * VCTrackingPage — Mapa de Tracking GPS con Leaflet
 *
 * Dibuja la ruta real del técnico con polyline coloreada por velocidad,
 * marcadores de check-in/out, geofences de clientes, y selector de usuario.
 *
 * NOTA: Leaflet se carga desde CDN (no requiere npm install).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

// ==========================================
// TIPOS
// ==========================================

interface TrackingPoint {
    id: number;
    lat: number;
    lon: number;
    accuracy: number | null;
    velocidad: number | null;
    timestamp: string;
    fuente: string;
    velocidad_estimada_kmh: number | null;
}

interface TrackingUser {
    carnet: string;
    nombre_empleado: string;
    ultimo_punto: string;
    total_puntos: number;
}

// ==========================================
// CDN LOADER
// ==========================================

let leafletLoaded = false;
let leafletPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
    if (leafletLoaded) return Promise.resolve();
    if (leafletPromise) return leafletPromise;

    leafletPromise = new Promise((resolve, reject) => {
        if (!document.querySelector('link[href*="leaflet"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.crossOrigin = '';
            document.head.appendChild(link);
        }

        if ((window as any).L) {
            leafletLoaded = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = () => { leafletLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });

    return leafletPromise;
}

// ==========================================
// COLOR POR VELOCIDAD
// ==========================================

function speedColor(kmh: number | null): string {
    if (kmh == null || kmh <= 0) return '#3b82f6'; // azul — sin datos
    if (kmh <= 5) return '#22c55e';   // verde — caminando
    if (kmh <= 30) return '#eab308';  // amarillo — tráfico o urbano
    if (kmh <= 60) return '#f97316';  // naranja — velocidad media
    if (kmh <= 100) return '#ef4444'; // rojo — rápido
    return '#7c3aed';                  // morado — muy rápido
}

// ==========================================
// COMPONENTE
// ==========================================

export function VCTrackingPage() {
    const [searchParams] = useSearchParams();
    const initFecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0];
    const initCarnet = searchParams.get('carnet') || '500708';

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [fecha, setFecha] = useState(initFecha);
    const [carnet, setCarnet] = useState(initCarnet);
    const [usuarios, setUsuarios] = useState<TrackingUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Cargar lista de usuarios con tracking
    useEffect(() => {
        api.get('/visita-campo/usuarios-tracking')
            .then(res => {
                const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setUsuarios(data);
            })
            .catch(err => console.warn('No se pudo cargar lista de usuarios:', err));
    }, []);

    // Inicializar mapa
    useEffect(() => {
        let mounted = true;

        loadLeaflet().then(() => {
            if (!mounted || !mapRef.current || mapInstance.current) return;

            const L = (window as any).L;
            const map = L.map(mapRef.current, {
                center: [12.1364, -86.2514], // Managua
                zoom: 13,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
                maxZoom: 19,
            }).addTo(map);

            mapInstance.current = map;
            loadTrackingData();
        });

        return () => { mounted = false; };
    }, []);

    // Cargar datos de tracking
    const loadTrackingData = useCallback(async () => {
        if (!mapInstance.current) return;
        setLoading(true);
        setError(null);

        const L = (window as any).L;
        const map = mapInstance.current;

        // Limpiar capas anteriores (excepto tile layer)
        map.eachLayer((layer: any) => {
            if (layer._url?.includes('openstreetmap') || layer._url?.includes('tile')) return;
            map.removeLayer(layer);
        });

        try {
            // 1. Obtener puntos GPS raw (polyline)
            const rawRes = await api.get(`/visita-campo/tracking-raw?fecha=${fecha}&carnet=${carnet}`);
            const rawData = Array.isArray(rawRes.data) ? rawRes.data : (rawRes.data?.data || []);
            setTrackingPoints(rawData);

            // 2. Obtener estadísticas km
            const statsRes = await api.get(`/visita-campo/stats/km?fecha=${fecha}`);
            setStats(statsRes.data);

            // 3. Obtener agenda (clientes) para marcadores
            const agendaRes = await api.get(`/visita-campo/agenda?lat=12.1364&lon=-86.2514`);
            const agenda = Array.isArray(agendaRes.data) ? agendaRes.data : (agendaRes.data?.data || []);

            const bounds: any[] = [];

            // ==========================================
            // DIBUJAR POLYLINE GPS
            // ==========================================
            if (rawData.length >= 2) {
                // Dibujar segmentos coloreados por velocidad
                for (let i = 0; i < rawData.length - 1; i++) {
                    const p1 = rawData[i];
                    const p2 = rawData[i + 1];
                    const color = speedColor(p1.velocidad_estimada_kmh);

                    L.polyline(
                        [[p1.lat, p1.lon], [p2.lat, p2.lon]],
                        { color, weight: 4, opacity: 0.85 }
                    ).addTo(map);
                }

                // Marcador de inicio (verde)
                const first = rawData[0];
                const startIcon = L.divIcon({
                    html: '<div style="font-size:22px;text-align:center">🟢</div>',
                    iconSize: [28, 28], iconAnchor: [14, 14], className: '',
                });
                L.marker([first.lat, first.lon], { icon: startIcon }).addTo(map)
                    .bindPopup(`<strong>Inicio de ruta</strong><br/>🕐 ${new Date(first.timestamp).toLocaleTimeString('es-NI')}`);

                // Marcador de fin (rojo)
                const last = rawData[rawData.length - 1];
                const endIcon = L.divIcon({
                    html: '<div style="font-size:22px;text-align:center">🔴</div>',
                    iconSize: [28, 28], iconAnchor: [14, 14], className: '',
                });
                L.marker([last.lat, last.lon], { icon: endIcon }).addTo(map)
                    .bindPopup(`<strong>Fin de ruta</strong><br/>🕐 ${new Date(last.timestamp).toLocaleTimeString('es-NI')}`);

                // Agregar puntos GPS al bounds
                rawData.forEach((p: TrackingPoint) => bounds.push([p.lat, p.lon]));
            }

            // ==========================================
            // DIBUJAR MARCADORES DE CLIENTES
            // ==========================================
            agenda.forEach((item: any) => {
                if (!item.cliente_lat || !item.cliente_lon) return;

                const pos: [number, number] = [item.cliente_lat, item.cliente_lon];
                bounds.push(pos);

                // Círculo del geofence
                L.circle(pos, {
                    radius: item.radio_metros || 100,
                    color: item.visita_estado === 'FINALIZADA' ? '#22c55e'
                        : item.visita_estado === 'EN_CURSO' ? '#3b82f6'
                            : '#94a3b8',
                    fillOpacity: 0.1,
                    weight: 2,
                }).addTo(map);

                // Marcador del cliente
                const iconHtml = item.visita_estado === 'FINALIZADA' ? '✅'
                    : item.visita_estado === 'EN_CURSO' ? '🔵'
                        : '📍';

                const icon = L.divIcon({
                    html: `<div style="font-size:20px;text-align:center">${iconHtml}</div>`,
                    iconSize: [30, 30], iconAnchor: [15, 15], className: '',
                });

                L.marker(pos, { icon }).addTo(map)
                    .bindPopup(`
                        <div style="min-width:150px">
                            <strong>${item.cliente_nombre}</strong><br/>
                            <span style="color:#64748b;font-size:12px">${item.zona || ''}</span><br/>
                            ${item.distancia_actual_m != null
                            ? `<span style="font-size:12px">📏 ${item.distancia_actual_m}m</span><br/>`
                            : ''}
                            ${item.visita_inicio
                            ? `<span style="font-size:12px">🕐 Inicio: ${new Date(item.visita_inicio).toLocaleTimeString('es-NI')}</span><br/>`
                            : ''}
                            ${item.visita_fin
                            ? `<span style="font-size:12px">🕐 Fin: ${new Date(item.visita_fin).toLocaleTimeString('es-NI')}</span><br/>`
                            : ''}
                            <span style="font-size:11px;color:${item.agenda_estado === 'FINALIZADA' ? '#16a34a' :
                            item.agenda_estado === 'EN_CURSO' ? '#2563eb' :
                                '#94a3b8'
                        };font-weight:600">${item.agenda_estado || 'PENDIENTE'}</span>
                        </div>
                    `);
            });

            // Ajustar zoom
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            }

        } catch (err: any) {
            console.error('[VCTrackingPage] Error:', err);
            setError(err?.message || 'Error cargando datos de tracking');
        } finally {
            setLoading(false);
        }
    }, [fecha, carnet]);

    // Recargar cuando cambia fecha o carnet
    useEffect(() => {
        if (mapInstance.current) loadTrackingData();
    }, [fecha, carnet, loadTrackingData]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px',
            }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                        🗺️ Mapa de Rutas GPS
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                        Tracking en vivo con polyline por velocidad
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Selector de usuario */}
                    <select
                        value={carnet}
                        onChange={(e) => setCarnet(e.target.value)}
                        style={{
                            padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid #e2e8f0', fontSize: '13px', minWidth: '180px',
                        }}
                    >
                        <option value="500708">Gustavo Lira (500708)</option>
                        {usuarios.map(u => (
                            <option key={u.carnet} value={u.carnet}>
                                {u.nombre_empleado || u.carnet} ({u.total_puntos} pts)
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        style={{
                            padding: '6px 10px', borderRadius: '6px',
                            border: '1px solid #e2e8f0', fontSize: '13px',
                        }}
                    />
                    <button
                        onClick={loadTrackingData}
                        disabled={loading}
                        style={{
                            padding: '6px 12px', borderRadius: '6px',
                            border: 'none', backgroundColor: '#4f46e5',
                            color: '#fff', fontSize: '13px', fontWeight: 600,
                            cursor: loading ? 'wait' : 'pointer',
                        }}
                    >
                        {loading ? '⏳' : '🔄'} Actualizar
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{
                display: 'flex', gap: '16px', padding: '12px 16px',
                backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0',
                flexWrap: 'wrap', alignItems: 'center',
            }}>
                <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Distancia: </span>
                    <strong style={{ color: '#1e293b' }}>
                        {typeof stats?.km_total === 'number' ? stats.km_total.toFixed(2) : '0.00'} km
                    </strong>
                </div>
                <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Puntos GPS: </span>
                    <strong style={{ color: '#1e293b' }}>{trackingPoints.length}</strong>
                </div>
                <div style={{ fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>Segmentos: </span>
                    <strong style={{ color: '#1e293b' }}>{stats?.segmentos_validos || 0}</strong>
                </div>
                {/* Leyenda de colores */}
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', fontSize: '11px', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Velocidad:</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
                        &lt;5
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#eab308', display: 'inline-block' }}></span>
                        5-30
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#f97316', display: 'inline-block' }}></span>
                        30-60
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                        60+ km/h
                    </span>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    margin: '12px 16px', padding: '10px 14px', borderRadius: '8px',
                    backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '13px',
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Mapa */}
            <div
                ref={mapRef}
                id="tracking-map"
                style={{
                    height: 'calc(100vh - 200px)',
                    width: '100%',
                    minHeight: '400px',
                }}
            />
        </div>
    );
}

export default VCTrackingPage;
