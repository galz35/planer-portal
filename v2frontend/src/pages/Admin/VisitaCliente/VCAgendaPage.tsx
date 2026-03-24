import { useState, useEffect } from 'react';
import { visitaApi } from '../../../services/visitaApi';

interface Cliente {
    id: number;
    codigo: string;
    nombre: string;
    zona: string;
}

interface AgendaItem {
    agenda_id: number;
    orden: number;
    agenda_estado: string;
    cliente_id: number;
    cliente_nombre: string;
    zona: string;
}

export function VCAgendaPage() {
    const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
    const [carnet, setCarnet] = useState('500708'); // default Gustavo
    const [usuarios, setUsuarios] = useState<any[]>([]);

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Cargar lista de técnicos
        visitaApi.getUsuariosConTracking().then(res => {
            setUsuarios(Array.isArray(res) ? res : (res?.data || []));
        }).catch(err => console.error(err));

        // Cargar catálogo de clientes
        visitaApi.getClientes().then(res => {
            setClientes(Array.isArray(res) ? res : (res?.data || []));
        });
    }, []);

    const loadAgenda = () => {
        if (!carnet || !fecha) return;
        setLoading(true);
        visitaApi.listarAgenda(carnet, fecha).then(res => {
            const data = Array.isArray(res) ? res : (res?.data || []);
            setAgenda(data);
            setLoading(false);
        }).catch(err => {
            console.error('Error:', err);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadAgenda();
    }, [carnet, fecha]);

    const handleAsignar = async (clienteId: number) => {
        try {
            await visitaApi.crearAgenda({
                carnet,
                cliente_id: clienteId,
                fecha
            });
            loadAgenda();
        } catch (error: any) {
            alert('Error al asignar cliente: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleQuitar = async (agendaId: number) => {
        try {
            await visitaApi.eliminarAgenda(agendaId);
            loadAgenda();
        } catch (error: any) {
            alert('Error al quitar de la agenda: ' + (error.response?.data?.message || error.message));
        }
    };

    const moveUp = async (index: number) => {
        if (index === 0) return;
        const current = agenda[index];
        const prev = agenda[index - 1];

        // Se hace swap de los ordenes (en backend lo ideal es resetear todo el array pero api.reordenar usa 1 a 1)
        // Optimizacion: Para no hacer DND complejo en React para el scope, 
        // usamos botones arriba/abajo.
        await visitaApi.reordenarAgenda(current.agenda_id, prev.orden);
        await visitaApi.reordenarAgenda(prev.agenda_id, current.orden);
        loadAgenda();
    };

    const moveDown = async (index: number) => {
        if (index === agenda.length - 1) return;
        const current = agenda[index];
        const next = agenda[index + 1];

        await visitaApi.reordenarAgenda(current.agenda_id, next.orden);
        await visitaApi.reordenarAgenda(next.agenda_id, current.orden);
        loadAgenda();
    };

    // Filter clientes por búsqueda
    const filteredClientes = clientes.filter(c => {
        if (!searchQuery) return true;
        const lowered = searchQuery.toLowerCase();
        return (c.nombre || '').toLowerCase().includes(lowered) ||
            (c.codigo || '').toLowerCase().includes(lowered) ||
            (c.zona || '').toLowerCase().includes(lowered);
    });

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>📅 Agenda de Visitas</h1>
                    <p style={{ color: '#64748b' }}>Planifica y asigna clientes a los técnicos de campo por día.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Técnico Asignado</label>
                        <select
                            value={carnet}
                            onChange={(e) => setCarnet(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minWidth: '220px' }}
                        >
                            <option value="500708">Gustavo Lira (500708)</option>
                            {usuarios.map(u => (
                                <option key={u.carnet} value={u.carnet}>
                                    {u.nombre_empleado || u.carnet}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Fecha</label>
                        <input
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) minmax(400px, 1fr)', gap: '24px', alignItems: 'start' }}>
                {/* Panel Izquierdo: Clientes Base */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Directorio de Clientes</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 12px 0' }}>Disponibles para asignar al técnico seleccionado.</p>
                        <input
                            type="text"
                            placeholder="Buscar cliente, código o zona..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                        {filteredClientes.map(c => {
                            // Verify if it is already in agenda
                            const isAssigned = agenda.some(a => a.cliente_id === c.id);

                            return (
                                <div key={c.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px',
                                    backgroundColor: isAssigned ? '#f8fafc' : '#fff'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: isAssigned ? '#94a3b8' : '#1e293b' }}>
                                            {c.nombre}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                                            {c.codigo} | {c.zona || 'Sin Zona'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAsignar(c.id)}
                                        disabled={isAssigned}
                                        style={{
                                            backgroundColor: isAssigned ? '#e2e8f0' : '#dbeafe', color: isAssigned ? '#94a3b8' : '#1d4ed8',
                                            padding: '6px 12px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '12px', cursor: isAssigned ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isAssigned ? '✔ Asignado' : '+ Asignar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Panel Derecho: Agenda Seleccionada */}
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>Ruta de Trabajo Asignada</h3>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>Arrastra o utiliza los botones para ordenar (Prioridad de Carga).</p>
                    </div>

                    <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                        {loading && <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>Cargando agenda...</div>}

                        {!loading && agenda.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                                <p style={{ fontSize: '14px', marginBottom: '8px' }}>El técnico no tiene visitas programadas para este día.</p>
                                <p style={{ fontSize: '13px' }}>Selecciona clientes del panel izquierdo para agregarlos a su ruta.</p>
                            </div>
                        )}

                        {!loading && agenda.map((item, index) => (
                            <div key={item.agenda_id} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px',
                                backgroundColor: item.agenda_estado === 'FINALIZADA' ? '#f0fdf4' : item.agenda_estado === 'EN_CURSO' ? '#eff6ff' : '#fff'
                            }}>
                                {/* Botones Ordenar */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <button onClick={() => moveUp(index)} disabled={index === 0} style={{ padding: '2px 6px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer' }}>▲</button>
                                    <button onClick={() => moveDown(index)} disabled={index === agenda.length - 1} style={{ padding: '2px 6px', fontSize: '10px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: index === agenda.length - 1 ? 'not-allowed' : 'pointer' }}>▼</button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#475569', fontSize: '13px', fontWeight: 700 }}>
                                    {index + 1}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>{item.cliente_nombre}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{item.zona || 'Sin Zona'} | Estado: <span style={{ fontWeight: 700, color: item.agenda_estado === 'FINALIZADA' ? '#16a34a' : item.agenda_estado === 'EN_CURSO' ? '#2563eb' : '#94a3b8' }}>{item.agenda_estado}</span></div>
                                </div>

                                {/* Botón Borrar (Solo PENDIENTES) */}
                                {item.agenda_estado === 'PENDIENTE' && (
                                    <button
                                        onClick={() => handleQuitar(item.agenda_id)}
                                        style={{ backgroundColor: '#fee2e2', color: '#991b1b', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                                        title="Remover"
                                    >
                                        ✖
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VCAgendaPage;
