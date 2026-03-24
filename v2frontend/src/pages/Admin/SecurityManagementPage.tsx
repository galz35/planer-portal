import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Users, User, Settings, X, RefreshCw } from 'lucide-react';
import { adminService, type UserAccessInfo } from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

const ProfileBadge: React.FC<{ type: UserAccessInfo['menuType'] }> = ({ type }) => {
    const styles = {
        ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
        LEADER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        EMPLOYEE: 'bg-slate-100 text-slate-600 border-slate-200',
        CUSTOM: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    const icons = {
        ADMIN: <Shield size={12} />,
        LEADER: <Users size={12} />,
        EMPLOYEE: <User size={12} />,
        CUSTOM: <Settings size={12} />
    };
    const labels = {
        ADMIN: 'Admin',
        LEADER: 'Líder',
        EMPLOYEE: 'Empleado',
        CUSTOM: 'Personalizado'
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[type]}`}>
            {icons[type]}
            {labels[type]}
        </span>
    );
};

const SecurityManagementPage: React.FC = () => {
    const [users, setUsers] = useState<UserAccessInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedUser, setSelectedUser] = useState<UserAccessInfo | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const { showToast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsersAccess();
            setUsers(data);
        } catch (error) {
            showToast('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch =
                u.nombre.toLowerCase().includes(search.toLowerCase()) ||
                u.carnet.toLowerCase().includes(search.toLowerCase()) ||
                u.cargo.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filterType === 'ALL' || u.menuType === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [users, search, filterType]);

    const stats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.menuType === 'ADMIN').length,
        leaders: users.filter(u => u.menuType === 'LEADER').length,
        employees: users.filter(u => u.menuType === 'EMPLOYEE').length,
        custom: users.filter(u => u.menuType === 'CUSTOM').length
    }), [users]);

    const handleResetToAuto = async (userId: number) => {
        try {
            await adminService.removeCustomMenu(userId);
            showToast('Menú restablecido a automático', 'success');
            fetchUsers();
        } catch {
            showToast('Error al restablecer menú', 'error');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Shield className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Configuración de Menús</h1>
                        <p className="text-sm text-slate-500">Personaliza la navegación y módulos accesibles por usuario</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total</p>
                    <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold uppercase">Admins</p>
                    <p className="text-2xl font-black text-blue-700">{stats.admins}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-semibold uppercase">Líderes</p>
                    <p className="text-2xl font-black text-emerald-700">{stats.leaders}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Empleados</p>
                    <p className="text-2xl font-black text-slate-700">{stats.employees}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-purple-600 font-semibold uppercase">Custom</p>
                    <p className="text-2xl font-black text-purple-700">{stats.custom}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, carnet o cargo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Todos los tipos</option>
                        <option value="ADMIN">Solo Admins</option>
                        <option value="LEADER">Solo Líderes</option>
                        <option value="EMPLOYEE">Solo Empleados</option>
                        <option value="CUSTOM">Solo Personalizados</option>
                    </select>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 text-slate-600 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-500">Cargando usuarios...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Cargo</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Departamento</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Subordinados</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo Menú</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map(user => (
                                    <tr key={user.idUsuario} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-slate-900">{user.nombre}</p>
                                                <p className="text-xs text-slate-500">{user.carnet}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{user.cargo}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">{user.departamento}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${user.subordinateCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.subordinateCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ProfileBadge type={user.menuType} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.menuType === 'CUSTOM' ? (
                                                <button
                                                    onClick={() => handleResetToAuto(user.idUsuario)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                                >
                                                    Resetear
                                                </button>
                                            ) : user.menuType !== 'ADMIN' ? (
                                                <button
                                                    onClick={() => { setSelectedUser(user); setModalOpen(true); }}
                                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                                >
                                                    Personalizar
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Info */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
                    Mostrando {filteredUsers.length} de {users.length} usuarios
                </div>
            </div>

            {/* Personalizar Menu Modal - NOW FUNCTIONAL */}
            {modalOpen && selectedUser && (
                <PersonalizeMenuModal
                    user={selectedUser}
                    onClose={() => { setModalOpen(false); setSelectedUser(null); }}
                    onSaved={() => { setModalOpen(false); setSelectedUser(null); fetchUsers(); }}
                />
            )}
        </div>
    );
};

// ==================================================================
// MODAL: Personalizar Menú (funcional con MenuBuilder)
// ==================================================================
import { MenuBuilder } from '../../components/admin/MenuBuilder';
import { clarityService } from '../../services/clarity.service';
import { APP_MENU } from '../../constants/appMenu';
import { ToggleLeft, ToggleRight, Save, RotateCcw } from 'lucide-react';

const PersonalizeMenuModal: React.FC<{
    user: UserAccessInfo;
    onClose: () => void;
    onSaved: () => void;
}> = ({ user, onClose, onSaved }) => {
    const { showToast } = useToast();
    const [menuEnabled, setMenuEnabled] = useState(false);
    const [menuJson, setMenuJson] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        // Start with the full APP_MENU so they can toggle items
        setMenuJson(JSON.stringify(APP_MENU));
        setMenuEnabled(false);
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            let menu = null;
            if (menuEnabled && menuJson && menuJson.trim() !== '' && menuJson !== 'null') {
                menu = JSON.parse(menuJson);
            }
            await clarityService.updateCustomMenu(user.idUsuario, menu);
            showToast(
                menuEnabled
                    ? `Menú personalizado guardado para ${user.nombre}`
                    : `Menú restablecido a automático para ${user.nombre}`,
                'success'
            );
            onSaved();
        } catch (e) {
            showToast('Error al guardar menú (¿JSON inválido?)', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        try {
            await adminService.removeCustomMenu(user.idUsuario);
            showToast(`Menú de ${user.nombre} restablecido a automático`, 'success');
            onSaved();
        } catch {
            showToast('Error al restablecer menú', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Personalizar Menú</h2>
                        <p className="text-xs text-slate-500">
                            Configurando acceso para: <strong className="text-slate-700">{user.nombre}</strong>
                            <span className="ml-2 text-slate-400">({user.carnet})</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Toggle */}
                <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-sm font-bold text-slate-700">Menú Personalizado</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {menuEnabled
                                ? 'Este usuario verá solo las opciones que definas abajo'
                                : 'Este usuario usa el menú predeterminado de su rol'}
                        </p>
                    </div>
                    <button
                        onClick={() => setMenuEnabled(!menuEnabled)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border text-sm font-bold
                            ${menuEnabled
                                ? 'bg-indigo-100 border-indigo-200 text-indigo-700'
                                : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}
                    >
                        {menuEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        {menuEnabled ? 'Habilitado' : 'Deshabilitado'}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {menuEnabled ? (
                        <div className="min-h-[300px]">
                            <MenuBuilder
                                initialJson={menuJson !== '[]' ? menuJson : JSON.stringify(APP_MENU)}
                                onChange={setMenuJson}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Settings size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium text-center max-w-sm">
                                El usuario verá el menú predeterminado basado en su rol ({user.menuType === 'LEADER' ? 'Líder' : 'Empleado'}).
                            </p>
                            <p className="text-xs text-slate-400 mt-2">
                                Habilita la personalización para controlar exactamente qué opciones ve.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex items-center justify-between shrink-0">
                    <button
                        onClick={handleReset}
                        disabled={saving}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 border border-slate-200"
                    >
                        <RotateCcw size={14} />
                        Restablecer a Automático
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={14} />
                            {saving ? 'Guardando...' : 'Guardar Menú'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityManagementPage;
