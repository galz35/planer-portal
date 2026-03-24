import { useState, useEffect } from 'react';
import { visitaApi } from '../../../services/visitaApi';

export function VCMetasPage() {
    const [metas, setMetas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    const [usuarios, setUsuarios] = useState<any[]>([]);

    const loadMetas = () => {
        setLoading(true);
        visitaApi.listarMetas().then(res => {
            setMetas(Array.isArray(res) ? res : (res?.data || []));
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadMetas();
        visitaApi.getUsuariosConTracking().then(res => {
            setUsuarios(Array.isArray(res) ? res : (res?.data || []));
        });
    }, []);

    const handleOpenModal = (meta?: any) => {
        if (meta) {
            setModalData({
                carnet: meta.carnet,
                meta_visitas: meta.meta_visitas,
                costo_km: meta.costo_km,
                vigente_desde: meta.vigente_desde ? new Date(meta.vigente_desde).toISOString().split('T')[0] : '',
                vigente_hasta: meta.vigente_hasta ? new Date(meta.vigente_hasta).toISOString().split('T')[0] : ''
            });
        } else {
            setModalData({
                carnet: '',
                meta_visitas: 10,
                costo_km: 0.15,
                vigente_desde: new Date().toISOString().split('T')[0],
                vigente_hasta: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await visitaApi.setMeta(modalData);
            setIsModalOpen(false);
            loadMetas();
        } catch (error: any) {
            alert('Error al guardar meta: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🎯 Configuración de Metas</h1>
                    <p style={{ color: '#64748b' }}>Define los objetivos de visitas y costo por kilómetro del personal.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 600 }}
                >
                    ➕ Asignar Nueva Meta
                </button>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                {loading ? <div style={{ padding: '40px', textAlign: 'center' }}>Cargando metas...</div> : metas.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No se han configurado metas específicas.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>CARNET</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>NOMBRE</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>META DÍA</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>COSTO KM</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>VIGENCIA</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metas.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600 }}>{m.carnet}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{m.nombre_empleado || 'Desconocido'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>{m.meta_visitas}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', textAlign: 'center' }}>$ {m.costo_km}</td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                                        {m.vigente_desde ? new Date(m.vigente_desde).toLocaleDateString() : 'Siempre'}
                                        {' - '}
                                        {m.vigente_hasta ? new Date(m.vigente_hasta).toLocaleDateString() : 'Indefinido'}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button onClick={() => handleOpenModal(m)} style={{ backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>✏️ Editar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '500px', padding: '24px' }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>Meta de Técnico</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Técnico *</label>
                                <select
                                    required
                                    value={modalData.carnet}
                                    onChange={e => setModalData({ ...modalData, carnet: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                >
                                    <option value="" disabled>Seleccione un técnico</option>
                                    <option value="500708">Gustavo Lira (500708)</option>
                                    {usuarios.map(u => (
                                        <option key={u.carnet} value={u.carnet}>{u.nombre_empleado || u.carnet}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Meta Visitas / Día *</label>
                                    <input type="number" required min="1" value={modalData.meta_visitas} onChange={e => setModalData({ ...modalData, meta_visitas: parseInt(e.target.value) })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Costo USD / Km *</label>
                                    <input type="number" step="0.01" required value={modalData.costo_km} onChange={e => setModalData({ ...modalData, costo_km: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Vigente Desde *</label>
                                    <input type="date" required value={modalData.vigente_desde} onChange={e => setModalData({ ...modalData, vigente_desde: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Vigente Hasta (Opcional)</label>
                                    <input type="date" value={modalData.vigente_hasta} onChange={e => setModalData({ ...modalData, vigente_hasta: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
                                <button type="submit" disabled={saving} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontWeight: 600 }}>
                                    {saving ? 'Guardando...' : 'Guardar Meta'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VCMetasPage;
