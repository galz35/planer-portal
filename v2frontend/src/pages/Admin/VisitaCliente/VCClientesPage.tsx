import { useState, useEffect } from 'react';
import { visitaApi } from '../../../services/visitaApi';

export function VCClientesPage() {
    const [clientes, setClientes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null); // null = create, object = edit
    const [saving, setSaving] = useState(false);

    const loadClientes = () => {
        setLoading(true);
        visitaApi.getClientes().then((res: any) => {
            const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
            setClientes(data);
            setLoading(false);
        }).catch((err) => {
            console.error('Error cargando clientes:', err);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadClientes();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonStr = event.target?.result as string;
                const clientesJson = JSON.parse(jsonStr);

                await visitaApi.importarClientes(clientesJson);
                alert('Clientes importados correctamente');
                loadClientes();
            } catch (error) {
                alert('Error al importar el archivo: Asegúrese de usar un formato válido.');
            } finally {
                setImporting(false);
                if (e.target) e.target.value = ''; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const handleOpenModal = (cliente?: any) => {
        if (cliente) {
            setModalData({ ...cliente });
        } else {
            setModalData({
                codigo: '',
                nombre: '',
                direccion: '',
                telefono: '',
                contacto: '',
                lat: '',
                long: '',
                radio_metros: 100,
                zona: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalData(null);
    };

    const handleSaveCliente = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...modalData,
                lat: modalData.lat ? parseFloat(modalData.lat) : undefined,
                long: modalData.long ? parseFloat(modalData.long) : undefined,
                radio_metros: modalData.radio_metros ? parseInt(modalData.radio_metros) : 100,
            };

            if (modalData.id) {
                await visitaApi.actualizarCliente(modalData.id, payload);
            } else {
                await visitaApi.crearCliente(payload);
            }
            handleCloseModal();
            loadClientes();
        } catch (error: any) {
            alert('Error al guardar: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleEliminarCliente = async (id: number) => {
        if (!confirm('¿Está seguro que desea desactivar este cliente?')) return;
        try {
            await visitaApi.eliminarCliente(id);
            loadClientes();
        } catch (error: any) {
            alert('Error al eliminar: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredClientes = clientes.filter(c => {
        if (!searchQuery) return true;
        const lowered = searchQuery.toLowerCase();
        return (c.codigo?.toLowerCase() || '').includes(lowered) ||
            (c.nombre?.toLowerCase() || '').includes(lowered) ||
            (c.zona?.toLowerCase() || '').includes(lowered);
    });

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>🏢 Gestión de Clientes</h1>
                    <p style={{ color: '#64748b' }}>Puntos de visita (PDVs), geocercas y datos de contacto.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="file"
                        accept=".json"
                        id="fileUpload"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                    <label
                        htmlFor="fileUpload"
                        style={{ backgroundColor: importing ? '#94a3b8' : '#e2e8f0', color: importing ? '#fff' : '#1e293b', padding: '10px 16px', borderRadius: '8px', cursor: importing ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-block', border: '1px solid #cbd5e1' }}
                    >
                        {importing ? '⏳ Importando...' : '📄 Importar JSON'}
                    </label>
                    <button
                        onClick={() => handleOpenModal()}
                        style={{ backgroundColor: '#2563eb', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        ➕ Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{ marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Buscar por código, nombre o zona..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
            </div>

            {/* Table */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', overflow: 'auto', border: '1px solid #e2e8f0' }}>
                {loading ? <div style={{ padding: '40px', textAlign: 'center' }}>Cargando clientes...</div> : filteredClientes.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        <p style={{ fontSize: '16px', marginBottom: '8px' }}>No se encontraron clientes.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>CÓDIGO</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>NOMBRE / DIRECCIÓN</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>ZONA / COORD</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px' }}>ESTADO</th>
                                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClientes.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>{c.codigo}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{c.nombre}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{c.direccion || 'Sin dirección'}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.zona || '-'}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                            {c.lat && c.long ? `${c.lat}, ${c.long} (${c.radio_metros}m)` : 'Sin GPS'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ backgroundColor: c.activo ? '#dcfce7' : '#fee2e2', color: c.activo ? '#166534' : '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                            {c.activo ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleOpenModal(c)}
                                            style={{ backgroundColor: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', marginRight: '8px', fontSize: '13px', fontWeight: 500 }}
                                        >
                                            ✏️ Editar
                                        </button>
                                        <button
                                            onClick={() => handleEliminarCliente(c.id)}
                                            style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
                                        >
                                            🗑️ Bloquear
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '20px' }}>{modalData?.id ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h2>
                            <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                        </div>
                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <form id="clienteForm" onSubmit={handleSaveCliente} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Código *</label>
                                    <input required type="text" value={modalData.codigo} onChange={e => setModalData({ ...modalData, codigo: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Nombre *</label>
                                    <input required type="text" value={modalData.nombre} onChange={e => setModalData({ ...modalData, nombre: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Dirección</label>
                                    <input type="text" value={modalData.direccion || ''} onChange={e => setModalData({ ...modalData, direccion: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Zona</label>
                                    <input type="text" value={modalData.zona || ''} onChange={e => setModalData({ ...modalData, zona: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Teléfono</label>
                                    <input type="text" value={modalData.telefono || ''} onChange={e => setModalData({ ...modalData, telefono: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Latitud</label>
                                    <input type="number" step="any" value={modalData.lat || ''} onChange={e => setModalData({ ...modalData, lat: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Longitud</label>
                                    <input type="number" step="any" value={modalData.long || ''} onChange={e => setModalData({ ...modalData, long: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Radio Geocerca (metros)</label>
                                    <input type="number" min="10" required value={modalData.radio_metros || 100} onChange={e => setModalData({ ...modalData, radio_metros: e.target.value })} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                                </div>

                                {modalData.id && (
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                                        <input type="checkbox" id="chkActivo" checked={modalData.activo} onChange={e => setModalData({ ...modalData, activo: e.target.checked })} style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                                        <label htmlFor="chkActivo" style={{ fontSize: '14px', fontWeight: 600 }}>Cliente Activo</label>
                                    </div>
                                )}
                            </form>
                        </div>
                        <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                            <button type="button" onClick={handleCloseModal} style={{ padding: '10px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
                            <button type="submit" form="clienteForm" disabled={saving} style={{ padding: '10px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', cursor: saving ? 'wait' : 'pointer', fontWeight: 600 }}>
                                {saving ? 'Guardando...' : '💾 Guardar Cliente'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default VCClientesPage;
