
export type ResourceType = 'users' | 'projects' | 'tasks' | 'financials' | 'reports' | 'admin' | 'menu' | 'all';
export type ActionType = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'all';
export type ScopeType = 'global' | 'department' | 'assigned' | 'specific';

export interface PermissionRule {
    resource: ResourceType;
    actions: ActionType[];
    scope: ScopeType;
    specificIds?: number[]; // IDs of nodes (departments) or projects
    excludedIds?: number[]; // IDs to explicitly block
}

export interface RoleDefinition {
    id: string;
    name: string;
    description: string;
    isSystem?: boolean; // If true, cannot be deleted (e.g. SuperAdmin)
    rules: PermissionRule[];
}

// Default Presets
export const DEFAULT_ROLES: RoleDefinition[] = [
    {
        id: 'super_admin',
        name: 'Super Admin',
        description: 'Acceso total y control absoluto del sistema.',
        isSystem: true,
        rules: [
            { resource: 'admin', actions: ['view', 'create', 'edit', 'delete'], scope: 'global' },
            { resource: 'users', actions: ['view', 'create', 'edit', 'delete'], scope: 'global' },
            { resource: 'projects', actions: ['view', 'create', 'edit', 'delete'], scope: 'global' },
            { resource: 'reports', actions: ['view'], scope: 'global' }
        ]
    },
    {
        id: 'manager',
        name: 'Gerente de Área',
        description: 'Gestión completa de su departamento asignado.',
        rules: [
            { resource: 'users', actions: ['view', 'edit'], scope: 'department' },
            { resource: 'projects', actions: ['view', 'create', 'edit'], scope: 'department' },
            { resource: 'tasks', actions: ['view', 'create', 'edit', 'delete', 'approve'], scope: 'department' },
            { resource: 'reports', actions: ['view'], scope: 'department' }
        ]
    },
    {
        id: 'employee',
        name: 'Empleado Estándar',
        description: 'Acceso a sus propias tareas y proyectos asignados.',
        isSystem: true,
        rules: [
            { resource: 'projects', actions: ['view'], scope: 'assigned' },
            { resource: 'tasks', actions: ['view', 'edit'], scope: 'assigned' }, // Edit status only usually
            { resource: 'users', actions: ['view'], scope: 'department' } // Can see colleagues
        ]
    }
];
