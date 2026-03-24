
import React from 'react';
import {
    Shield,
    Lock,
    Users,
    Briefcase,
    Eye,
    Edit3,
    Plus,
    Trash2,
    CheckCircle,
    Server,
    FileText,
    DollarSign,
    type LucideIcon
} from 'lucide-react';
import type { PermissionRule, ResourceType, ActionType, ScopeType } from '../../../types/permissions';

interface Props {
    rules: PermissionRule[];
    onChange: (newRules: PermissionRule[]) => void;
    readOnly?: boolean;
}

const RESOURCES: { id: ResourceType; label: string; icon: LucideIcon }[] = [
    { id: 'admin', label: 'Administración', icon: Shield },
    { id: 'users', label: 'Usuarios y RRHH', icon: Users },
    { id: 'projects', label: 'Proyectos', icon: Briefcase },
    { id: 'tasks', label: 'Tareas Operativas', icon: CheckCircle },
    { id: 'financials', label: 'Presupuestos', icon: DollarSign },
    { id: 'reports', label: 'Reportes y KPIs', icon: FileText },
    { id: 'menu', label: 'Menú y Navegación', icon: Server },
];

const SCOPES: { id: ScopeType; label: string }[] = [
    { id: 'global', label: 'Global (Todo)' },
    { id: 'department', label: 'Su Departamento' },
    { id: 'assigned', label: 'Solo Asignado' },
    { id: 'specific', label: 'Selección Manual...' },
];

export const PermissionsEditor: React.FC<Props> = ({ rules, onChange, readOnly = false }) => {

    const handleAddRule = () => {
        const newRule: PermissionRule = {
            resource: 'projects',
            actions: ['view'],
            scope: 'assigned'
        };
        onChange([...rules, newRule]);
    };

    const handleRemoveRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        onChange(newRules);
    };

    const updateRule = (index: number, changes: Partial<PermissionRule>) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], ...changes };
        onChange(newRules);
    };

    const toggleAction = (ruleIndex: number, action: ActionType) => {
        const rule = rules[ruleIndex];
        const actions = new Set(rule.actions);
        if (actions.has(action)) {
            actions.delete(action);
        } else {
            actions.add(action);
        }
        updateRule(ruleIndex, { actions: Array.from(actions) });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Reglas de Acceso</h3>
                {!readOnly && (
                    <button
                        onClick={handleAddRule}
                        className="text-indigo-600 text-xs font-bold hover:bg-indigo-50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                    >
                        <Plus size={14} /> Agregar Regla
                    </button>
                )}
            </div>

            {rules.length === 0 && (
                <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-sm">
                    Este rol no tiene reglas definidas. El usuario tendrá acceso restringido por defecto.
                </div>
            )}

            <div className="space-y-3">
                {rules.map((rule, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm transition-all hover:border-indigo-200 group">

                        {/* Header: Resource & Delete */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-slate-100 rounded text-slate-600">
                                    {RESOURCES.find(r => r.id === rule.resource)?.icon ?
                                        React.createElement(RESOURCES.find(r => r.id === rule.resource)!.icon, { size: 16 }) : <Server size={16} />}
                                </div>
                                <select
                                    className="font-bold text-sm text-slate-800 bg-transparent outline-none border-b border-dashed border-slate-300 hover:border-indigo-400 focus:border-indigo-600 cursor-pointer py-0.5"
                                    value={rule.resource}
                                    onChange={e => updateRule(idx, { resource: e.target.value as ResourceType })}
                                    disabled={readOnly}
                                >
                                    {RESOURCES.map(r => (
                                        <option key={r.id} value={r.id}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            {!readOnly && (
                                <button onClick={() => handleRemoveRule(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {/* Controls: Scope & Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            {/* Scope Selector */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alcance</label>
                                <select
                                    className="w-full text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                                    value={rule.scope}
                                    onChange={e => updateRule(idx, { scope: e.target.value as ScopeType })}
                                    disabled={readOnly}
                                >
                                    {SCOPES.map(s => (
                                        <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                </select>

                                {rule.scope === 'specific' && (
                                    <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-2">
                                        <Lock size={12} className="mt-0.5 shrink-0" />
                                        <span>Selección manual de IDs (Implementación pendiente en backend).</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions Toggles */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Permisos</label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: 'view', label: 'Ver', icon: Eye },
                                        { id: 'create', label: 'Crear', icon: Plus },
                                        { id: 'edit', label: 'Editar', icon: Edit3 },
                                        { id: 'delete', label: 'Eliminar', icon: Trash2 },
                                    ].map(action => {
                                        const isActive = rule.actions.includes(action.id as ActionType);
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={() => toggleAction(idx, action.id as ActionType)}
                                                disabled={readOnly}
                                                className={`
                                                    flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border transition-all
                                                    ${isActive
                                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}
                                                `}
                                                title={isActive ? 'Permitido' : 'Denegado'}
                                            >
                                                <action.icon size={10} />
                                                {action.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
