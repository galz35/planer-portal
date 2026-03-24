
import React, { useState, useEffect } from 'react';
import {
    Shield,
    Plus,
    Info,
    Check
} from 'lucide-react';
import { PermissionsEditor } from '../components';
import { MenuBuilder } from '../../../components/admin/MenuBuilder';
import { clarityService } from '../../../services/clarity.service';
import { alerts } from '../../../utils/alerts';
import { useToast } from '../../../context/ToastContext';
import type { RoleDefinition } from '../../../types/permissions';

// Extend type locally if needed or update global type
interface ExtendedRoleDefinition extends RoleDefinition {
    defaultMenu?: string;
}

export const RolesPage: React.FC = () => {
    // Local state for roles
    const [roles, setRoles] = useState<ExtendedRoleDefinition[]>([]);
    const [selectedRole, setSelectedRole] = useState<ExtendedRoleDefinition | null>(null);
    const [defaultMenuJson, setDefaultMenuJson] = useState('');
    const [, setJsonError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const loadRoles = async () => {
        setLoading(true);
        try {
            const data = await clarityService.getRoles() || [];
            const parsedRoles = data.map(r => ({
                id: r.idRol.toString(),
                name: r.nombre,
                description: r.descripcion,
                isSystem: r.esSistema,
                // rules match
                rules: typeof r.reglas === 'string' ? JSON.parse(r.reglas) : (r.reglas || []),
                defaultMenu: r.defaultMenu
            }));
            setRoles(parsedRoles);
            if (parsedRoles.length > 0 && !selectedRole) {
                const first = parsedRoles[0];
                setSelectedRole(first);
                setDefaultMenuJson(first.defaultMenu || '');
            }
        } catch (err) {
            showToast("Error cargando roles", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const handleSelectRole = async (role: ExtendedRoleDefinition) => {
        if (isEditing && (await alerts.confirm('Cambios sin guardar', 'Tienes cambios pendientes. ¿Deseas descartarlos para cambiar de rol?', 'question'))) {
            setSelectedRole(role);
            setDefaultMenuJson(role.defaultMenu || '');
            setIsEditing(false);
        } else if (!isEditing) {
            setSelectedRole(role);
            setDefaultMenuJson(role.defaultMenu || '');
        }
    };

    const handleSave = async () => {
        if (!selectedRole) return;

        // Pre-validate JSON
        if (defaultMenuJson) {
            try {
                JSON.parse(defaultMenuJson);
                setJsonError(null);
            } catch (e: any) {
                setJsonError("El JSON del menú es inválido: " + e.message);
                showToast("Corrige el error en el menú antes de guardar", "error");
                return;
            }
        }

        try {
            const dto = {
                nombre: selectedRole.name,
                descripcion: selectedRole.description,
                reglas: selectedRole.rules
            };

            if (selectedRole.id.startsWith('custom_')) {
                // CREATE
                await clarityService.createRol(dto);
                showToast("Rol creado exitosamente", "success");
            } else {
                // UPDATE
                await clarityService.updateRol(Number(selectedRole.id), dto);

                // Save Menu
                if (defaultMenuJson) {
                    try {
                        const menu = JSON.parse(defaultMenuJson);
                        await clarityService.updateRoleMenu(Number(selectedRole.id), menu);
                    } catch (e) {
                        console.error("Invalid Menu JSON");
                    }
                }

                showToast("Rol actualizado exitosamente", "success");
            }
            setIsEditing(false);
            loadRoles();
        } catch (e) {
            showToast("Error al guardar rol", "error");
        }
    };



    const handleCreateRole = () => {
        const newRole: RoleDefinition = {
            id: `custom_${Date.now()}`,
            name: 'Nuevo Rol',
            description: 'Descripción del rol...',
            rules: [],
            isSystem: false
        };
        setRoles([...roles, newRole]);
        setSelectedRole(newRole);
        setIsEditing(true);
    };

    const handleDeleteRole = async (id: string) => {
        if (await alerts.confirm('¿Eliminar Rol?', '¿Seguro que deseas eliminar este rol? Los usuarios asignados perderán sus permisos.')) {
            try {
                await clarityService.deleteRol(Number(id));
                showToast("Rol eliminado", "success");
                loadRoles();
            } catch (e) {
                const axiosError = e as { response?: { data?: { message?: string } }, message?: string };
                showToast("Error al eliminar rol: " + (axiosError.response?.data?.message || axiosError.message || 'Error desconocido'), "error");
            }
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50">
            {/* Sidebar List */}
            <div className="w-80 border-r border-slate-200 bg-white flex flex-col z-10 shadow-sm">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-indigo-600" size={20} /> Roles y Permisos
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Define qué pueden ver y hacer los usuarios.</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading && <p className="p-4 text-xs text-slate-400">Cargando roles...</p>}
                    {roles.map(role => (
                        <button
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`w-full text-left p-3 rounded-lg border transition-all relative group
                                ${selectedRole?.id === role.id
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`font-bold text-sm ${selectedRole?.id === role.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                                    {role.name}
                                </span>
                                {role.isSystem && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">System</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{role.description}</p>
                        </button>
                    ))}
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={handleCreateRole}
                        className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2"
                    >
                        <Plus size={16} /> Crear Nuevo Rol
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                {selectedRole ? (
                    <>
                        {/* Header */}
                        <div className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-start">
                            <div className="flex-1 max-w-2xl">
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={selectedRole.name}
                                            onChange={e => setSelectedRole({ ...selectedRole, name: e.target.value })}
                                            className="text-2xl font-black text-slate-800 w-full outline-none border-b-2 border-indigo-100 focus:border-indigo-500 bg-transparent placeholder:text-slate-300"
                                            placeholder="Nombre del Rol"
                                        />
                                        <input
                                            type="text"
                                            value={selectedRole.description}
                                            onChange={e => setSelectedRole({ ...selectedRole, description: e.target.value })}
                                            className="text-sm text-slate-500 w-full outline-none border-b border-slate-100 focus:border-indigo-300 bg-transparent placeholder:text-slate-300"
                                            placeholder="Descripción corta..."
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-800">{selectedRole.name}</h1>
                                        <p className="text-slate-500 mt-1">{selectedRole.description}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {!isEditing ? (
                                    <>
                                        {!selectedRole.isSystem && (
                                            <button
                                                onClick={() => handleDeleteRole(selectedRole.id)}
                                                className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-sm transition-colors"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                                        >
                                            Editar Permisos
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Revert would require keeping a clean copy, simplified here
                                            }}
                                            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold text-sm transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                                        >
                                            <Check size={16} /> Guardar Cambios
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="max-w-3xl mx-auto">
                                <PermissionsEditor
                                    rules={selectedRole.rules}
                                    readOnly={!isEditing}
                                    onChange={newRules => setSelectedRole({ ...selectedRole, rules: newRules })}
                                />

                                <div className="mt-8 pt-8 border-t border-slate-200">
                                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        Menú de Navegación
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-4">Selecciona las secciones a las que este rol tendrá acceso de forma predeterminada.</p>

                                    {isEditing ? (
                                        <MenuBuilder
                                            initialJson={defaultMenuJson}
                                            onChange={setDefaultMenuJson}
                                        />
                                    ) : (
                                        <div className="opacity-70 pointer-events-none grayscale-[0.5]">
                                            <MenuBuilder
                                                initialJson={defaultMenuJson}
                                                onChange={() => { }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                                    <Info className="shrink-0" />
                                    <p>
                                        Los cambios en los roles pueden tardar unos minutos en propagarse a todos los usuarios activos.
                                        Asegúrese de revisar los conflictos de permisos si un usuario tiene múltiples roles asignados.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Shield size={64} className="mb-4 opacity-20" />
                        <p>Selecciona un rol para ver sus detalles</p>
                    </div>
                )}
            </div>
        </div >
    );
};
