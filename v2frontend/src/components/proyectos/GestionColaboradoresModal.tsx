/**
 * Propuesta Modal Gestión Colaboradores
 */
import React, { useState, useEffect } from 'react';
import { Users, X, UserPlus, Shield, Trash2 } from 'lucide-react';
import { colaboradoresService, type Colaborador, type RolesDisponibles } from '../../services/colaboradores.service';
import { useToast } from '../../context/ToastContext';
import { UserSelector } from '../ui/UserSelector';

interface GestionColaboradoresModalProps {
    idProyecto: number;
    proyectoNombre: string;
    modoVisibilidad?: string;
    onClose: () => void;
}

export const GestionColaboradoresModal: React.FC<GestionColaboradoresModalProps> = ({
    idProyecto,
    proyectoNombre,
    modoVisibilidad = 'JERARQUIA',
    onClose
}) => {
    const { showToast } = useToast();
    const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
    const [roles, setRoles] = useState<RolesDisponibles[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);

    // Estado Invitar
    const [invitarIdUsuario, setInvitarIdUsuario] = useState<number | null>(null);
    const [invitarNombre, setInvitarNombre] = useState('');
    const [invitarRol, setInvitarRol] = useState('Colaborador');
    const [invitarSubmitting, setInvitarSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadData();
    }, [idProyecto]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await colaboradoresService.listar(idProyecto);
            setColaboradores(res.data);
            setRoles(res.rolesDisponibles);
        } catch (error: any) {
            console.error('Error al cargar colaboradores:', error);
            if (error?.response?.status === 403) {
                showToast('No tienes permiso para ver los colaboradores', 'error');
                onClose();
            } else {
                showToast('Error al cargar los colaboradores', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const getVisibilityInfo = () => {
        switch (modoVisibilidad) {
            case 'COLABORADOR':
                return { icon: '👤', label: 'Solo Colaboradores', color: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Solo las personas listadas abajo pueden ver este proyecto.' };
            case 'JERARQUIA_COLABORADOR':
                return { icon: '🏢👤', label: 'Jerarquía + Colaboradores', color: 'bg-violet-50 text-violet-700 border-violet-200', desc: 'Visible por jerarquía organizacional y también por las personas listadas abajo.' };
            default:
                return { icon: '🏢', label: 'Jerarquía', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Visible según la estructura organizacional. Colaboradores adicionales también pueden acceder.' };
        }
    };
    const visInfo = getVisibilityInfo();

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitarIdUsuario) {
            showToast('Selecciona un usuario', 'warning');
            return;
        }

        setInvitarSubmitting(true);
        try {
            await colaboradoresService.invitar(idProyecto, invitarIdUsuario, invitarRol);
            showToast('Colaborador invitado exitosamente', 'success');
            setShowInvite(false);
            setInvitarIdUsuario(null);
            setInvitarNombre('');
            setInvitarRol('Colaborador');
            await loadData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al invitar colaborador', 'error');
        } finally {
            setInvitarSubmitting(false);
        }
    };

    const handleRevocar = async (colab: Colaborador) => {
        if (!window.confirm(`¿Estás seguro de revocar el acceso a ${colab.nombreUsuario}?`)) return;

        try {
            await colaboradoresService.revocar(idProyecto, colab.idUsuario);
            showToast('Acceso revocado', 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al revocar acceso', 'error');
        }
    };

    const handleUpdateRol = async (idUsuario: number, nuevoRol: string) => {
        try {
            await colaboradoresService.actualizar(idProyecto, idUsuario, { rolColaboracion: nuevoRol });
            showToast(`Rol actualizado a ${nuevoRol}`, 'success');
            await loadData();
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Error al actualizar rol', 'error');
            await loadData();
        }
    };

    const getRoleBadgeColor = (rol: string) => {
        switch (rol) {
            case 'Dueño': return 'bg-red-100 text-red-800 border-red-200';
            case 'Administrador': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Editor': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Revisor': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'Observador': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-green-100 text-green-800 border-green-200';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">

                {/* HEAD */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" />
                            Colaboradores del Proyecto
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{proyectoNombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* VISIBILITY MODE INDICATOR */}
                <div className={`mx-6 mt-4 p-3 rounded-xl border flex items-start gap-3 ${visInfo.color}`}>
                    <span className="text-lg">{visInfo.icon}</span>
                    <div className="flex-1">
                        <span className="text-xs font-black uppercase tracking-wider">{visInfo.label}</span>
                        <p className="text-[11px] font-medium opacity-80 mt-0.5">{visInfo.desc}</p>
                    </div>
                </div>

                {/* BODY */}
                <div className="p-6 flex-1 overflow-y-auto">

                    {/* Botón Invitar o Formulario Invitar */}
                    {!showInvite ? (
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-sm text-gray-600">
                                Gestiona las personas que tienen acceso especial a este proyecto.
                            </p>
                            <button
                                onClick={() => setShowInvite(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
                            >
                                <UserPlus className="w-4 h-4" />
                                Invitar Persona
                            </button>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl p-5 border border-emerald-100 mb-6 relative animate-slide-up">
                            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-emerald-600" />
                                Nueva Invitación
                            </h3>
                            <button onClick={() => setShowInvite(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>

                            <form onSubmit={handleInvite} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Seleccionar Usuario
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsSearching(true)}
                                        className="w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 flex items-center justify-between hover:border-emerald-500 transition-all text-left"
                                    >
                                        {invitarNombre ? (
                                            <span className="text-emerald-700 font-bold">{invitarNombre}</span>
                                        ) : (
                                            <span className="text-gray-400">Clic para buscar usuario...</span>
                                        )}
                                        <Users className="w-4 h-4 text-gray-400" />
                                    </button>

                                    <UserSelector
                                        isOpen={isSearching}
                                        onClose={() => setIsSearching(false)}
                                        title="Buscar y Seleccionar Usuario"
                                        onSelect={(u) => {
                                            setInvitarIdUsuario(u.idUsuario);
                                            setInvitarNombre(u.nombre || u.nombreCompleto || '');
                                            setIsSearching(false);
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rol de Colaboración
                                    </label>
                                    <select
                                        value={invitarRol}
                                        onChange={(e) => setInvitarRol(e.target.value)}
                                        className="w-full border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 transition-shadow p-2.5 border"
                                        required
                                    >
                                        {(roles || []).map(r => (
                                            <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2 bg-emerald-50 p-2 rounded-md border border-emerald-100">
                                        <span className="font-semibold text-emerald-800">¿Qué puede hacer?: </span>
                                        {invitarRol === 'Dueño' && 'Control total absoluto del proyecto. Puede eliminar y nombrar otros Dueños.'}
                                        {invitarRol === 'Administrador' && 'Gestiona tareas, edita y asigna cualquier elemento. Invita o quita personas (excepto al Dueño).'}
                                        {invitarRol === 'Colaborador' && 'Trabaja en el proyecto. Crea nuevas tareas, se auto-asigna y edita las tareas que le pertenecen.'}
                                        {invitarRol === 'Editor' && 'Edita o modifica progreso y estados de tareas creadas por otros, pero no invita personas.'}
                                        {invitarRol === 'Revisor' && 'Revisa avances y el historial de cambios, no puede modificar ni crear nada.'}
                                        {invitarRol === 'Observador' && 'Solo puede ver de qué trata el proyecto y su progreso actual.'}
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowInvite(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={invitarSubmitting || !invitarIdUsuario}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                                    >
                                        {invitarSubmitting ? 'Enviando...' : 'Confirmar Invitación'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Lista Colaboradores */}
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : (colaboradores || []).length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No hay colaboradores adicionales</p>
                            <p className="text-sm text-gray-400 mt-1">El proyecto solo es visible según la jerarquía actual.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {(colaboradores || []).map(c => (
                                <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-200 transition-colors shadow-sm gap-4">

                                    <div className="flex items-start gap-3 flex-1">

                                        <div>
                                            <p className="font-semibold text-gray-800 leading-tight">
                                                {c.nombreUsuario}
                                                {c.rolColaboracion === 'Dueño' && <span className="ml-2 text-xs text-red-500" title="Creador/Duenio del Proyecto">⭐</span>}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{c.cargo || c.correo}</p>
                                            <p className="text-xs text-emerald-600 mt-1">
                                                Añadido por: {c.invitadoPorNombre}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <select
                                            value={c.rolColaboracion}
                                            onChange={(e) => handleUpdateRol(c.idUsuario, e.target.value)}
                                            disabled={c.rolColaboracion === 'Dueño'}
                                            className={`text-sm rounded-full px-3 py-1 font-medium border cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/20 ${getRoleBadgeColor(c.rolColaboracion)}`}
                                        >
                                            <option value={c.rolColaboracion} disabled>{c.rolColaboracion}</option>
                                            {roles.map(r => (
                                                <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                            ))}
                                        </select>

                                        {c.rolColaboracion !== 'Dueño' && (
                                            <button
                                                onClick={() => handleRevocar(c)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                title="Revocar Acceso"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

