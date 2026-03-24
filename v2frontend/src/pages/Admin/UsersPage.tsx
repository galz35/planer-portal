import { useEffect, useState } from 'react';
import type { Usuario } from '../../types/modelos';
import { ArrowLeft, Users, Download, Edit3, X, Network, ChevronRight, ChevronDown, UserPlus, FolderPlus, Key, ToggleLeft, ToggleRight, Eye, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clarityService } from '../../services/clarity.service';
import { MenuBuilder } from '../../components/admin/MenuBuilder';
import { VisibilityModal } from '../../components/admin/VisibilityModal';
import { APP_MENU } from '../../constants/appMenu';
import { useToast } from '../../context/ToastContext';

export const UsersPage = () => {
    const navigate = useNavigate();
    const [visibilityUser, setVisibilityUser] = useState<Usuario | null>(null);
    const { showToast } = useToast();
    const [users, setUsers] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [organigram, setOrganigram] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'hierarchy'>('list');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(15);

    // Edit State
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');

    const [newPassword, setNewPassword] = useState('');
    const [customMenuJson, setCustomMenuJson] = useState('');

    // Node Management State
    const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState(false);
    const [isAssignUserModalOpen, setIsAssignUserModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState<'Gerencia' | 'Equipo'>('Equipo');
    const [assignUserId, setAssignUserId] = useState<string>('');
    const [assignUserRole, setAssignUserRole] = useState<'Director' | 'Lider' | 'Colaborador'>('Colaborador');

    // Create User State
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        nombre: '',
        correo: '',
        cargo: '',
        telefono: '',
        organizacion: '',
        rol: 'Colaborador'

    });

    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'acceso' | 'visibilidad' | 'history'>('info');

    useEffect(() => {
        if (activeTab === 'history' && editingUser) {
            fetchAuditLogs(editingUser.idUsuario);
        }
    }, [activeTab, editingUser]);

    const fetchAuditLogs = async (userId: number) => {
        try {
            setAuditLoading(true);
            const logs = await clarityService.getAuditLogs({
                entidad: 'Usuario',
                entidadId: String(userId),
                limit: 50
            });
            setAuditLogs(logs?.items || []);
        } catch (error) {
            console.error(error);
            showToast("Error al cargar historial", "error");
        } finally {
            setAuditLoading(false);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, rolesData, orgData] = await Promise.all([
                clarityService.getUsuarios(page, limit),
                clarityService.getRoles(),
                clarityService.getOrganigrama()
            ]);

            if (usersData) {
                // Normalizar nombreCompleto -> nombre para compatibilidad
                const normalizedUsers = (usersData.items || []).map((u: any) => ({
                    ...u,
                    nombre: u.nombre || u.nombreCompleto || 'Sin Nombre'
                }));
                setUsers(normalizedUsers);
                setTotalPages(usersData.lastPage || 1);
                setTotalItems(usersData.total || 0);
            }

            setRoles(rolesData || []);
            setOrganigram(Array.isArray(orgData) ? orgData : orgData ? [orgData] : []);
        } catch (e) {
            showToast("Error cargando datos administrativos", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page]); // Reload when page changes

    const handleSaveRole = async () => {
        if (!editingUser) return;
        try {
            const roleObj = roles.find(r => r.idRol.toString() === selectedRoleId);
            const roleName = roleObj ? roleObj.nombre : 'Empleado';
            await clarityService.updateUsuarioRol(editingUser.idUsuario, roleName, Number(selectedRoleId));
            showToast("Rol actualizado exitosamente", "success");
            setEditingUser(null);
            loadData();
        } catch (e) {
            showToast("Error actualizando rol", "error");
        }
    };

    const handleResetPassword = async () => {
        if (!editingUser) return;
        try {
            await clarityService.resetPassword(editingUser.correo, newPassword || '123456');
            showToast("Contraseña restablecida exitosamente", "success");
            setNewPassword('');
        } catch (e) {
            showToast("Error restableciendo contraseña", "error");
        }
    };

    const handleSaveMenu = async () => {
        if (!editingUser) return;
        try {
            let menu = null;
            if (customMenuJson && customMenuJson.trim() !== '' && customMenuJson !== 'null') {
                menu = JSON.parse(customMenuJson);
            }
            await clarityService.updateCustomMenu(editingUser.idUsuario, menu);
            showToast("Menú personalizado actualizado", "success");
        } catch (e) {
            showToast("Error guardando menú (JSON inválido?)", "error");
        }
    };

    const handleCreateNode = async () => {
        if (!newNodeName.trim()) return;
        try {
            await clarityService.createNodo({
                nombre: newNodeName,
                tipo: newNodeType,
                idPadre: selectedNode?.idNodo
            });
            showToast("Nodo creado exitosamente", "success");
            setIsAddNodeModalOpen(false);
            setNewNodeName('');
            loadData();
        } catch (e) {
            showToast("Error creando nodo", "error");
        }
    };

    const handleAssignUser = async () => {
        if (!assignUserId || !selectedNode) return;
        try {
            await clarityService.asignarUsuarioNodo({
                idUsuario: Number(assignUserId),
                idNodo: selectedNode.idNodo,
                rol: assignUserRole
            });
            showToast("Usuario asignado exitosamente", "success");
            setIsAssignUserModalOpen(false);
            setAssignUserId('');
            loadData();
        } catch (e) {
            showToast("Error asignando usuario", "error");
        }
    };

    const handleCreateUser = async () => {
        if (!newUserForm.nombre || !newUserForm.correo) {
            showToast("Nombre y correo son obligatorios", "error");
            return;
        }
        setIsCreating(true);
        try {
            await clarityService.crearUsuario(newUserForm);
            showToast("Colaborador creado exitosamente", "success");
            setIsCreateUserModalOpen(false);
            setNewUserForm({ nombre: '', correo: '', cargo: '', telefono: '', organizacion: '', rol: 'Colaborador' });
            loadData();
        } catch (e: any) {
            showToast(e.response?.data?.message || "Error al crear", "error");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredUsers = users.filter(u =>
        (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.correo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.carnet || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.rolGlobal || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const headers = ["ID", "Nombre", "Correo", "Rol", "Estado"];
        const rows = filteredUsers.map(u => {
            const roleName = (u as any).rol?.nombre || u.rolGlobal || 'Empleado';
            return [u.idUsuario, u.nombre, u.correo, roleName, u.activo ? 'Activo' : 'Inactivo']
        });
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "usuarios_clarity.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- RECURSIVE ORGANIGRAM COMPONENT ---
    const OrgNode = ({ node, level = 0 }: { node: any, level?: number }) => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div className="mb-2">
                <div
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group
                        ${node.tipo === 'Gerencia' ? 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}
                    `}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        {node.hijos?.length > 0 || node.usuarios?.length > 0 ? (
                            isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />
                        ) : <div className="w-4" />}
                        <div className={`p-2 rounded-lg ${node.tipo === 'Gerencia' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <Network size={16} />
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 tracking-tight">{node.nombre}</span>
                            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded leading-none">
                                {node.tipo}
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                            {node.usuarios?.length || 0} Miembros • {node.hijos?.length || 0} Sub-nodos
                        </p>
                    </div>

                    <div className="hidden group-hover:flex gap-1">
                        <button
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                            title="Agregar sub-equipo"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(node);
                                setIsAddNodeModalOpen(true);
                            }}
                        >
                            <FolderPlus size={16} />
                        </button>
                        <button
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                            title="Asignar persona"
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNode(node);
                                setIsAssignUserModalOpen(true);
                            }}
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className="ml-8 mt-2 border-l-2 border-slate-100 pl-4 space-y-2">
                        {/* Users in this node */}
                        {node.usuarios?.map((u: any) => (
                            <div key={u.idUsuario} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100 group shadow-sm">

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-700">{u.nombre}</span>
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded
                                            ${u.rolNodo === 'Lider' || u.rolNodo === 'Director' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}
                                        `}>
                                            {u.rolNodo}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">{u.correo}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        const originalUser = users.find(orig => orig.idUsuario === u.idUsuario);
                                        if (originalUser) {
                                            setEditingUser(originalUser);
                                            setSelectedRoleId(originalUser.idRol?.toString() || '');
                                            setCustomMenuJson((originalUser as any).menuPersonalizado || '');
                                        }
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`¿Remover a ${u.nombre} de ${node.nombre}?`)) return;
                                        try {
                                            await clarityService.removerUsuarioNodo(u.idUsuario, node.idNodo);
                                            showToast("Usuario removido del nodo", "success");
                                            loadData();
                                        } catch (err) {
                                            showToast("Error al remover usuario", "error");
                                        }
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Remover de este equipo"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Sub-nodes */}
                        {node.hijos?.map((h: any) => (
                            <OrgNode key={h.idNodo} node={h} level={level + 1} />
                        ))}

                        {node.hijos?.length === 0 && node.usuarios?.length === 0 && (
                            <p className="text-xs text-slate-300 italic py-1">Nodo vacío</p>
                        )}
                    </div>
                )
                }
            </div >
        );
    };

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/app/hoy')} className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-xs font-black uppercase tracking-widest">
                    <ArrowLeft size={16} /> Volver
                </button>

                <div className="flex flex-col gap-6 mb-8">
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                                    <Users size={24} />
                                </div>
                                Gestión de Talento
                            </h1>
                            <p className="text-slate-500 mt-2 font-medium">
                                Administra el organigrama, roles y visualización del equipo.
                            </p>
                        </div>
                        <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                            <button
                                onClick={() => setViewMode('hierarchy')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                                    ${viewMode === 'hierarchy' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}
                                `}
                            >
                                <Network size={16} /> Organigrama
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                                    ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}
                                `}
                            >
                                <Users size={16} /> Directorio
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center gap-4">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 w-full max-w-md">
                            <span className="text-slate-400 pl-2">🔍</span>
                            <input
                                type="text"
                                placeholder="Buscar colaborador..."
                                className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 whitespace-nowrap">
                            <button
                                onClick={() => setIsCreateUserModalOpen(true)}
                                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                <UserPlus size={16} /> Nuevo Colaborador
                            </button>
                            <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                <Download size={16} /> Exportar CSV
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-slate-400 animate-pulse">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-bold">Cargando estructura organizacional...</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'hierarchy' ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-4">
                                    <div className="bg-white/50 p-4 rounded-2xl border-2 border-dashed border-slate-200">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Estructura de Equipos</h3>
                                        {organigram.map(node => (
                                            <OrgNode key={node.idNodo} node={node} />
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
                                        <h3 className="text-lg font-black tracking-tight mb-2">Panel de Control</h3>
                                        <p className="text-indigo-100 text-xs font-medium leading-relaxed mb-6">
                                            Usa el organigrama para mover usuarios entre equipos, cambiar jefaturas y gestionar el acceso a menús.
                                        </p>
                                        <div className="space-y-3">
                                            <button className="w-full bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl text-left transition-all group">
                                                <div className="font-bold text-sm">Nueva Dependencia</div>
                                                <div className="text-[10px] text-white/60 font-bold uppercase mt-1">Crear Gerencia o Equipo</div>
                                            </button>
                                            <button className="w-full bg-indigo-500/50 hover:bg-indigo-500/80 border border-indigo-400/30 p-4 rounded-2xl text-left transition-all">
                                                <div className="font-bold text-sm">Transferir Masivo</div>
                                                <div className="text-[10px] text-white/60 font-bold uppercase mt-1">Mover equipo completo</div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400">
                                            <tr>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Colaborador</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Carnet / Código</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Correo</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Rol Sistema</th>
                                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                                <tr key={u.idUsuario} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-4 font-bold text-slate-800">
                                                        <div className="flex items-center gap-3">

                                                            {u.nombre}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-slate-500">{u.carnet || '---'}</td>
                                                    <td className="p-4 text-sm text-slate-500 font-medium">{u.correo}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border
                                                            ${['Admin', 'Administrador'].includes(u.rolGlobal || '') ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
                                                        `}>
                                                            {u.rolGlobal}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await clarityService.updateUsuario(u.idUsuario, { activo: !u.activo });
                                                                    showToast(`Usuario ${u.activo ? 'desactivado' : 'activado'}`, "success");
                                                                    loadData();
                                                                } catch (e) {
                                                                    showToast("Error al cambiar estado", "error");
                                                                }
                                                            }}
                                                            className={`p-2 rounded-xl transition-all shadow-sm hover:shadow ml-1 ${u.activo ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                                            title={u.activo ? "Desactivar Usuario" : "Activar Usuario"}
                                                        >
                                                            {u.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingUser(u);
                                                                setSelectedRoleId(u.idRol?.toString() || '');
                                                                setCustomMenuJson((u as any).menuPersonalizado || '');
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow group-hover:bg-white ml-1"
                                                            title="Editar Usuario"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setVisibilityUser(u)}
                                                            className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow group-hover:bg-white ml-1"
                                                            title="Gestionar Visibilidad"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-medium italic">
                                                        No se encontraron colaboradores
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                        Mostrando {users.length} de {totalItems} registrados
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Anterior
                                        </button>
                                        <div className="px-4 text-sm font-black text-slate-800">
                                            {page} / {totalPages}
                                        </div>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-3 py-1.5 text-xs font-bold bg-slate-50 text-slate-500 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {
                visibilityUser && (
                    <VisibilityModal
                        user={visibilityUser}
                        onClose={() => setVisibilityUser(null)}
                    />
                )
            }

            {/* EDIT MODAL */}
            {
                editingUser && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20 animate-fade-in-up">
                            {/* Header */}
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Editar Perfil</h3>
                                </div>
                                <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-indigo-100 bg-indigo-50 px-6 pt-3 gap-6">
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'info' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}
                                >
                                    Información Básica
                                </button>
                                <button
                                    onClick={() => setActiveTab('acceso')}
                                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'acceso' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}
                                >
                                    Poder y Menús
                                </button>
                                <button
                                    onClick={() => setActiveTab('visibilidad')}
                                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'visibilidad' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}
                                >
                                    Supervisión y Equipo
                                </button>
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`pb-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'history' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-indigo-600'}`}
                                >
                                    Auditoría
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                                {activeTab === 'info' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Columna Izquierda: Datos Básicos */}
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Datos Básicos</label>
                                                <div className="space-y-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre Completo"
                                                        className="w-full p-4 bg-white border border-slate-300 rounded-2xl focus:border-indigo-500 font-bold text-slate-700"
                                                        value={editingUser.nombre || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, nombre: e.target.value })}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Correo Electrónico"
                                                        className="w-full p-4 bg-white border border-slate-300 rounded-2xl focus:border-indigo-500 font-bold text-slate-700"
                                                        value={editingUser.correo || ''}
                                                        onChange={e => setEditingUser({ ...editingUser, correo: e.target.value })}
                                                    />
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Carnet / Código"
                                                            className="p-4 bg-white border border-slate-300 rounded-2xl focus:border-indigo-500 font-bold text-slate-700"
                                                            value={editingUser.carnet || ''}
                                                            onChange={e => setEditingUser({ ...editingUser, carnet: e.target.value })}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Cargo"
                                                            className="p-4 bg-white border border-slate-300 rounded-2xl focus:border-indigo-500 font-bold text-slate-700"
                                                            value={editingUser.cargo || ''}
                                                            onChange={e => setEditingUser({ ...editingUser, cargo: e.target.value })}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await clarityService.updateUsuario(editingUser.idUsuario, {
                                                                    nombre: editingUser.nombre,
                                                                    correo: editingUser.correo,
                                                                    carnet: editingUser.carnet,
                                                                    cargo: editingUser.cargo
                                                                });
                                                                showToast("Datos actualizados", "success");
                                                                loadData();
                                                            } catch (e) {
                                                                showToast("Error al actualizar datos", "error");
                                                            }
                                                        }}
                                                        className="w-full p-4 bg-slate-800 text-white font-black text-xs uppercase rounded-2xl hover:bg-slate-900 transition-all"
                                                    >
                                                        Guardar Cambios Básicos
                                                    </button>

                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm("¿Seguro que deseas eliminar este usuario? Esta acción lo enviará a la papelera.")) return;
                                                            try {
                                                                await clarityService.deleteUsuario(editingUser.idUsuario);
                                                                showToast("Usuario eliminado", "success");
                                                                setEditingUser(null);
                                                                loadData();
                                                            } catch (e) {
                                                                showToast("Error al eliminar usuario", "error");
                                                            }
                                                        }}
                                                        className="w-full p-4 bg-red-50 text-red-500 font-black text-xs uppercase rounded-2xl hover:bg-red-100 transition-all border border-red-100 mt-2"
                                                    >
                                                        Eliminar Usuario
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'acceso' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Columna Izquierda: Rol (Ahora en Acceso) */}
                                        <div className="space-y-6">

                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol de Seguridad</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        className="flex-1 p-4 bg-white border border-slate-300 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-slate-700"
                                                        value={selectedRoleId}
                                                        onChange={e => setSelectedRoleId(e.target.value)}
                                                    >
                                                        <option value="">Seleccionar Rol...</option>
                                                        {roles.map(r => (
                                                            <option key={r.idRol} value={r.idRol}>
                                                                {r.nombre}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={handleSaveRole}
                                                        className="px-6 bg-indigo-600 text-white font-black text-xs uppercase rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"
                                                    >
                                                        Guardar
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Restablecer Contraseña</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nueva contraseña"
                                                        className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                                                        value={newPassword}
                                                        onChange={e => setNewPassword(e.target.value)}
                                                    />
                                                    <button
                                                        onClick={handleResetPassword}
                                                        className="px-6 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Key size={16} /> Reset
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium mt-2">
                                                    Predeterminada: <strong className="text-slate-600">123456</strong>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Columna Derecha: Menú Avanzado */}
                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 h-full flex flex-col">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Opciones de Menú</label>
                                                        <p className="text-[10px] text-slate-500 font-medium">Define opciones específicas para este usuario.</p>
                                                    </div>

                                                    <button
                                                        onClick={() => setCustomMenuJson(customMenuJson ? '' : JSON.stringify(APP_MENU))}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border
                                                    ${customMenuJson
                                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                                                : 'bg-slate-200 border-slate-300 text-slate-500'
                                                            }
                                                `}
                                                    >
                                                        <span className="text-[10px] font-bold uppercase">{customMenuJson ? 'Habilitado' : 'Deshabilitado'}</span>
                                                        {customMenuJson ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                </div>

                                                {customMenuJson ? (
                                                    <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
                                                        <MenuBuilder
                                                            initialJson={customMenuJson !== '[]' ? customMenuJson : JSON.stringify(APP_MENU)}
                                                            onChange={setCustomMenuJson}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                                        <Network size={40} className="mb-2 opacity-20" />
                                                        <p className="text-xs font-medium text-center px-8">
                                                            El usuario usará el menú predeterminado de su Rol.
                                                        </p>
                                                        <button
                                                            onClick={() => setCustomMenuJson(JSON.stringify(APP_MENU))}
                                                            className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-sm hover:text-indigo-600 transition-all"
                                                        >
                                                            Habilitar Personalización
                                                        </button>
                                                    </div>
                                                )}

                                                {customMenuJson && (
                                                    <button
                                                        onClick={handleSaveMenu}
                                                        className="mt-4 w-full py-3 bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all"
                                                    >
                                                        Guardar Configuración
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'visibilidad' && (
                                    <div className="flex flex-col items-center justify-center p-12 bg-indigo-50/30 rounded-3xl border border-indigo-100">
                                        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                                            <Eye size={40} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">Editor de Visibilidad</h3>
                                        <p className="text-sm text-slate-500 text-center max-w-sm mb-8">
                                            Configura qué personas y áreas puede ver este usuario. Por defecto, solo pueden ver a su equipo en la jerarquía.
                                        </p>
                                        <button
                                            onClick={() => setVisibilityUser(editingUser)}
                                            className="px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center gap-3"
                                        >
                                            <Shield size={20} /> Abrir Panel de Visibilidad
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div className="space-y-4">
                                        {auditLoading ? (
                                            <div className="p-8 text-center text-slate-400">Cargando historial...</div>
                                        ) : (
                                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest font-black">
                                                        <tr>
                                                            <th className="p-3 text-left">Fecha</th>
                                                            <th className="p-3 text-left">Acción</th>
                                                            <th className="p-3 text-left">Detalle</th>
                                                            <th className="p-3 text-left">Actor</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {auditLogs?.map((log: any) => (
                                                            <tr key={log.idAuditLog || log.id}>
                                                                <td className="p-3 text-slate-500 font-medium">
                                                                    {new Date(log.fecha).toLocaleString()}
                                                                </td>
                                                                <td className="p-3 font-bold text-slate-700">
                                                                    {log.accion}
                                                                </td>
                                                                <td className="p-3 text-slate-600">
                                                                    {log.recurso} {log.detalles || ''}
                                                                </td>
                                                                <td className="p-3 text-slate-500">
                                                                    {log.nombreUsuario || 'Sistema'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(!auditLogs || auditLogs.length === 0) && (
                                                            <tr>
                                                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                                                    No hay actividad registrada
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-all text-sm"
                                >
                                    Cerrar Ventana
                                </button>
                            </div>
                        </div>
                    </div >
                )
            }

            {/* ADD NODE MODAL */}
            {
                isAddNodeModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Nuevo Nodo</h3>
                                    <p className="text-indigo-100 text-xs font-bold uppercase mt-1">Padre: {selectedNode?.nombre || 'Raíz'}</p>
                                </div>
                                <button onClick={() => setIsAddNodeModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Equipo/Gerencia</label>
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={newNodeName}
                                        onChange={e => setNewNodeName(e.target.value)}
                                        placeholder="Ej: Desarrollo Backend"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Nodo</label>
                                    <div className="flex gap-2">
                                        {(['Gerencia', 'Equipo'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewNodeType(t)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border
                                                ${newNodeType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                                            `}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button
                                        onClick={() => setIsAddNodeModalOpen(false)}
                                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateNode}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"
                                    >
                                        Crear Nodo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ASSIGN USER MODAL */}
            {
                isAssignUserModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Asignar Colaborador</h3>
                                    <p className="text-indigo-100 text-xs font-bold uppercase mt-1">Nodo: {selectedNode?.nombre}</p>
                                </div>
                                <button onClick={() => setIsAssignUserModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Seleccionar Persona</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={assignUserId}
                                        onChange={e => setAssignUserId(e.target.value)}
                                    >
                                        <option value="">Buscar en el directorio...</option>
                                        {users.map(u => (
                                            <option key={u.idUsuario} value={u.idUsuario}>{u.nombre} ({u.correo})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol dentro del Nodo</label>
                                    <select
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={assignUserRole}
                                        onChange={e => setAssignUserRole(e.target.value as any)}
                                    >
                                        <option value="Colaborador">Colaborador</option>
                                        <option value="Lider">Líder (Supervisor)</option>
                                        <option value="Director">Director (Gerente)</option>
                                    </select>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button
                                        onClick={() => setIsAssignUserModalOpen(false)}
                                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAssignUser}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all"
                                    >
                                        Confirmar Asignación
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* CREATE USER MODAL */}
            {
                isCreateUserModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up border border-white/20">
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">Nuevo Colaborador</h3>
                                    <p className="text-indigo-100 text-[10px] font-bold uppercase mt-1">Registrar acceso al sistema</p>
                                </div>
                                <button onClick={() => setIsCreateUserModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nombre Completo *</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                                            value={newUserForm.nombre}
                                            onChange={e => setNewUserForm({ ...newUserForm, nombre: e.target.value })}
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Correo Corporativo *</label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                                            value={newUserForm.correo}
                                            onChange={e => setNewUserForm({ ...newUserForm, correo: e.target.value })}
                                            placeholder="juan@empresa.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargo / Puesto</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                                            value={newUserForm.cargo}
                                            onChange={e => setNewUserForm({ ...newUserForm, cargo: e.target.value })}
                                            placeholder="Ej: Analista Senior"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Unidad / Organización</label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                                            value={newUserForm.organizacion}
                                            onChange={e => setNewUserForm({ ...newUserForm, organizacion: e.target.value })}
                                        >
                                            <option value="">Seleccione equipo...</option>
                                            {/* Recursive nodes or flat list */}
                                            {organigram.map(n => (
                                                <option key={n.idNodo} value={n.nombre}>{n.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Rol en Equipo</label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                                            value={newUserForm.rol}
                                            onChange={e => setNewUserForm({ ...newUserForm, rol: e.target.value })}
                                        >
                                            <option value="Colaborador">Colaborador</option>
                                            <option value="Lider">Líder</option>
                                            <option value="Gerente">Gerente</option>
                                        </select>
                                    </div>
                                </div>

                                <p className="text-[10px] text-slate-400 font-medium bg-slate-100 p-3 rounded-xl border border-slate-200">
                                    <span className="font-black text-indigo-600 uppercase">Nota:</span> Se enviará un correo de bienvenida y la contraseña temporal será <strong className="text-slate-700">123456</strong>. El usuario deberá cambiarla al primer ingreso.
                                </p>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setIsCreateUserModalOpen(false)}
                                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateUser}
                                        disabled={isCreating}
                                        className="flex-1 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isCreating ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <UserPlus size={16} />
                                        )}
                                        {isCreating ? 'Procesando...' : 'Crear Acceso'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
