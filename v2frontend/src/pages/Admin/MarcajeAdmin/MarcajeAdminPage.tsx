import { useState, useEffect } from 'react';
import { marcajeApi } from '../../../services/marcajeApi';

type Tab = 'gestion' | 'solicitudes' | 'sites' | 'ips' | 'dispositivos';

export function MarcajeAdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>('solicitudes');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modals states
    const [modal, setModal] = useState<{ type: string; item?: any } | null>(null);
    const [formInputs, setFormInputs] = useState<any>({});

    useEffect(() => {
        loadData(activeTab);
    }, [activeTab]);

    const loadData = async (tab: Tab) => {
        setLoading(true);
        try {
            let res: any = [];
            switch (tab) {
                case 'solicitudes': res = await marcajeApi.getAdminSolicitudes(); break;
                case 'sites': res = await marcajeApi.getAdminSites(); break;
                case 'ips': res = await marcajeApi.getAdminIps(); break;
                case 'dispositivos': res = await marcajeApi.getAdminDevices(); break;
                case 'gestion': res = await marcajeApi.getAdminConfig(); break;
            }
            setData(Array.isArray(res) ? res : res.data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionFn: Promise<any>, successMsg: string) => {
        try {
            await actionFn;
            alert(successMsg);
            setModal(null);
            loadData(activeTab);
        } catch (error) {
            console.error(error);
            alert('Ocurrió un error al procesar la acción.');
        }
    };

    // --- SOLICITUDES ---
    const renderSolicitudes = () => (
        <table className="admin-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Empleado</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {data.map(r => (
                    <tr key={r.id}>
                        <td>{new Date(r.creado_en || r.fecha_solicitud || '').toLocaleString()}</td>
                        <td>{r.colaborador_nombre} ({r.carnet})</td>
                        <td>{r.tipo_solicitud}</td>
                        <td>{r.motivo}</td>
                        <td>
                            <span className={`badge ${r.estado === 'PENDIENTE' ? 'amber' : r.estado === 'APROBADA' ? 'emerald' : 'rose'}`}>
                                {r.estado}
                            </span>
                        </td>
                        <td>
                            {r.estado === 'PENDIENTE' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setModal({ type: 'resolver', item: { ...r, accion: 'APROBADA' } })} className="btn btn-sm btn-emerald">✅ Aprobar</button>
                                    <button onClick={() => setModal({ type: 'resolver', item: { ...r, accion: 'RECHAZADA' } })} className="btn btn-sm btn-rose">❌ Rechazar</button>
                                </div>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // --- SITES ---
    const renderSites = () => (
        <div>
            <button onClick={() => { setFormInputs({}); setModal({ type: 'site_add' }); }} className="btn btn-blue" style={{ marginBottom: '16px' }}>➕ Nuevo Site</button>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Latitud</th>
                        <th>Longitud</th>
                        <th>Radio (m)</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(r => (
                        <tr key={r.id}>
                            <td>{r.nombre}</td>
                            <td>{r.lat}</td>
                            <td>{r.long || r.lon}</td>
                            <td>{r.radio_metros}</td>
                            <td>{r.activo ? 'Sí' : 'No'}</td>
                            <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => { setFormInputs(r); setModal({ type: 'site_edit', item: r }); }} className="btn btn-sm btn-zinc">✏️ Editar</button>
                                    <button onClick={() => {
                                        if (confirm('¿Eliminar geocerca?')) handleAction(marcajeApi.eliminarSite(r.id), 'Geocerca eliminada');
                                    }} className="btn btn-sm btn-rose">🗑️ Eliminar</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // --- IPS ---
    const renderIps = () => (
        <div>
            <button onClick={() => { setFormInputs({}); setModal({ type: 'ip_add' }); }} className="btn btn-blue" style={{ marginBottom: '16px' }}>➕ Agregar IP</button>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>CIDR / IP</th>
                        <th>Activo</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(r => (
                        <tr key={r.id}>
                            <td>{r.id}</td>
                            <td>{r.nombre}</td>
                            <td>{r.cidr}</td>
                            <td>{r.activo ? 'Sí' : 'No'}</td>
                            <td>
                                <button onClick={() => {
                                    if (confirm('¿Eliminar IP?')) handleAction(marcajeApi.eliminarIp(r.id), 'IP eliminada');
                                }} className="btn btn-sm btn-rose">🗑️ Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // --- DEVICES ---
    const renderDevices = () => (
        <table className="admin-table">
            <thead>
                <tr>
                    <th>Empleado</th>
                    <th>Modelo</th>
                    <th>UUID</th>
                    <th>Último Login</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {data.map(r => (
                    <tr key={r.uuid}>
                        <td>{r.colaborador_nombre} ({r.carnet})</td>
                        <td>{r.modelo}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>{r.uuid}</td>
                        <td>{r.last_login ? new Date(r.last_login).toLocaleString() : '-'}</td>
                        <td>
                            <span className={`badge ${r.estado === 'PENDING' ? 'amber' : r.estado === 'ACTIVE' ? 'emerald' : 'rose'}`}>
                                {r.estado}
                            </span>
                        </td>
                        <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {r.estado !== 'ACTIVE' && <button onClick={() => handleAction(marcajeApi.actualizarDevice(r.uuid, 'ACTIVE'), 'Dispositivo aprobado')} className="btn btn-sm btn-emerald">✅ Aprobar</button>}
                                {r.estado !== 'BLOCKED' && <button onClick={() => handleAction(marcajeApi.actualizarDevice(r.uuid, 'BLOCKED'), 'Dispositivo bloqueado')} className="btn btn-sm btn-rose">🔒 Bloquear</button>}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    // --- GESTIÓN ---
    const renderGestion = () => (
        <div>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0 }}>Usuarios Activos</h3>
                    <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Empleados que han registrado asistencia al menos una vez.</p>
                </div>
                <button onClick={() => { setFormInputs({}); setModal({ type: 'gestion_eliminar' }); }} className="btn btn-rose">🗑️ Eliminar Marcaje Específico (Por ID)</button>
            </div>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Carnet</th>
                        <th>Empleado</th>
                        <th>Total Registros Históricos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(r => (
                        <tr key={r.Carnet}>
                            <td>{r.Carnet}</td>
                            <td>{r.Colaborador}</td>
                            <td>{r.total_marcajes}</td>
                            <td>
                                <button onClick={() => { setFormInputs({ carnet: r.Carnet }); setModal({ type: 'gestion_reiniciar' }); }} className="btn btn-sm btn-amber">🔄 Forzar Cierre/Reiniciar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
            <style>{`
                .admin-table { width: 100%; border-collapse: collapse; text-align: left; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .admin-table th { padding: 12px 16px; background: #f1f5f9; color: #475569; font-weight: 600; font-size: 13px; border-bottom: 2px solid #e2e8f0; }
                .admin-table td { padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #f1f5f9; color: #334155; }
                .btn { padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; color: #fff; }
                .btn-sm { padding: 6px 12px; font-size: 12px; }
                .btn-blue { background: #3b82f6; } .btn-blue:hover { background: #2563eb; }
                .btn-emerald { background: #10b981; } .btn-emerald:hover { background: #059669; }
                .btn-rose { background: #ef4444; } .btn-rose:hover { background: #dc2626; }
                .btn-amber { background: #f59e0b; } .btn-amber:hover { background: #d97706; }
                .btn-zinc { background: #71717a; } .btn-zinc:hover { background: #52525b; }
                .badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; }
                .amber { background: #fef3c7; color: #92400e; }
                .emerald { background: #dcfce7; color: #166534; }
                .rose { background: #fee2e2; color: #991b1b; }
            `}</style>

            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#0f172a' }}>⚙️ Administración de Marcaje Web</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Gestiona sitios, dispositivos, IPs, solicitudes de corrección y estados de usuarios.</p>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                {(['gestion', 'solicitudes', 'sites', 'ips', 'dispositivos'] as Tab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                            backgroundColor: activeTab === tab ? '#eff6ff' : 'transparent',
                            color: activeTab === tab ? '#2563eb' : '#64748b',
                            fontWeight: activeTab === tab ? 600 : 400,
                            border: 'none', textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div>
                {loading ? (
                    <p style={{ color: '#64748b', textAlign: 'center', marginTop: '40px' }}>Cargando datos...</p>
                ) : data.length === 0 && activeTab !== 'sites' && activeTab !== 'ips' ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>No hay datos registrados en esta sección.</div>
                ) : (
                    <>
                        {activeTab === 'solicitudes' && renderSolicitudes()}
                        {activeTab === 'sites' && renderSites()}
                        {activeTab === 'ips' && renderIps()}
                        {activeTab === 'dispositivos' && renderDevices()}
                        {activeTab === 'gestion' && renderGestion()}
                    </>
                )}
            </div>

            {/* MODALS */}
            {modal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, fontSize: '18px' }}>
                            {modal.type === 'resolver' ? `Comentario para ${modal.item?.accion}` : ''}
                            {modal.type.includes('site') ? `${modal.type === 'site_add' ? 'Nueva' : 'Editar'} Geocerca` : ''}
                            {modal.type === 'ip_add' ? 'Agregar IP Whitelist' : ''}
                            {modal.type === 'gestion_reiniciar' ? 'Reinicio de turno' : ''}
                            {modal.type === 'gestion_eliminar' ? 'Eliminar asistencia por ID' : ''}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
                            {modal.type === 'resolver' && (
                                <input type="text" placeholder="Comentario administrativo (opcional)" className="modal-input" value={formInputs.comentario || ''} onChange={e => setFormInputs({ ...formInputs, comentario: e.target.value })} />
                            )}
                            {modal.type.includes('site') && (
                                <>
                                    <input type="text" placeholder="Nombre descriptivo" className="modal-input" value={formInputs.nombre || ''} onChange={e => setFormInputs({ ...formInputs, nombre: e.target.value })} />
                                    <input type="number" step="any" placeholder="Latitud" className="modal-input" value={formInputs.lat || ''} onChange={e => setFormInputs({ ...formInputs, lat: e.target.value })} />
                                    <input type="number" step="any" placeholder="Longitud" className="modal-input" value={formInputs.lon || formInputs.long || ''} onChange={e => setFormInputs({ ...formInputs, lon: e.target.value })} />
                                    <input type="number" placeholder="Radio en metros (ej. 200)" className="modal-input" value={formInputs.radio_metros || ''} onChange={e => setFormInputs({ ...formInputs, radio_metros: e.target.value })} />
                                </>
                            )}
                            {modal.type === 'ip_add' && (
                                <>
                                    <input type="text" placeholder="Nombre descriptivo" className="modal-input" value={formInputs.nombre || ''} onChange={e => setFormInputs({ ...formInputs, nombre: e.target.value })} />
                                    <input type="text" placeholder="Ej. 192.168.1.1 o 10.0.0.0/24" className="modal-input" value={formInputs.cidr || ''} onChange={e => setFormInputs({ ...formInputs, cidr: e.target.value })} />
                                </>
                            )}
                            {modal.type === 'gestion_reiniciar' && (
                                <input type="text" placeholder="Motivo administrativo del reinicio" className="modal-input" value={formInputs.motivo || ''} onChange={e => setFormInputs({ ...formInputs, motivo: e.target.value })} />
                            )}
                            {modal.type === 'gestion_eliminar' && (
                                <>
                                    <input type="number" placeholder="ID de la Asistencia a eliminar" className="modal-input" value={formInputs.id || ''} onChange={e => setFormInputs({ ...formInputs, id: e.target.value })} />
                                    <input type="text" placeholder="Motivo administrativo" className="modal-input" value={formInputs.motivo || ''} onChange={e => setFormInputs({ ...formInputs, motivo: e.target.value })} />
                                </>
                            )}
                        </div>

                        <style>{`.modal-input { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; }`}</style>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => setModal(null)} className="btn btn-zinc">Cancelar</button>
                            <button onClick={() => {
                                if (modal.type === 'resolver') handleAction(marcajeApi.resolverSolicitud(modal.item.id, modal.item.accion, formInputs.comentario), 'Solicitud resuelta');
                                if (modal.type === 'site_add') handleAction(marcajeApi.crearSite(formInputs), 'Geocerca creada');
                                if (modal.type === 'site_edit') handleAction(marcajeApi.editarSite(modal.item.id, formInputs), 'Geocerca actualizada');
                                if (modal.type === 'ip_add') handleAction(marcajeApi.crearIp(formInputs), 'IP agregada');
                                if (modal.type === 'gestion_reiniciar') handleAction(marcajeApi.reiniciarEstado(formInputs.carnet, formInputs.motivo), 'Estado del empleado reiniciado');
                                if (modal.type === 'gestion_eliminar') handleAction(marcajeApi.eliminarMarcaje(formInputs.id, formInputs.motivo), 'Marcaje eliminado');
                            }} className="btn btn-blue">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default MarcajeAdminPage;
