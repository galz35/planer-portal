
import {
    Sun, CheckSquare, FileText, LayoutDashboard, Eye, Shield, BarChart, FileCheck,
    PieChart, Users, KeyRound, ShieldCheck, Database, Terminal, Archive, BookOpen, ClipboardList,
    History, Trash2, Briefcase, Clock, Settings, Map, MapPin, Navigation, Target, BarChart3,
    Smartphone
} from 'lucide-react';

export const APP_MENU = [
    {
        group: 'MIS ESPACIOS',
        items: [
            { path: '/app/hoy', label: 'Mi Agenda', icon: 'Sun' },
            { path: '/app/planning/proyectos', label: 'Gestión Proyectos', icon: 'FileText' },
            { path: '/app/mi-asignacion', label: 'Mi Asignación', icon: 'Briefcase' },
            { path: '/app/pendientes', label: 'Mis Tareas', icon: 'CheckSquare' },
            { path: '/app/notas', label: 'Mis Notas', icon: 'FileText' },
        ]
    },
    {
        group: 'Mi Gestión Equipo',
        items: [
            { path: '/app/equipo/mi-equipo', label: 'Mi Equipo', icon: 'Users' },
            { path: '/app/equipo/seguimiento-agenda', label: 'Seguimiento Agenda', icon: 'ClipboardList' },
            { path: '/app/equipo/actividad', label: 'Historial de Cambios', icon: 'History' },
            { path: '/app/equipo/bloqueos', label: 'Bloqueos y Riesgos', icon: 'Shield' },
        ]
    },
    {
        group: 'Planificación',
        items: [
            { path: '/app/planning/carga', label: 'Carga Laboral', icon: 'BarChart' },
            { path: '/app/software/dashboard', label: 'Dashboard', icon: 'PieChart' },
            { path: '/app/planning/approvals', label: 'Aprobaciones', icon: 'FileCheck' },
        ]
    },
    /* {
        group: 'Inteligencia',
        items: [
            { path: '/app/reports', label: 'Centro de Reportes', icon: 'PieChart' },
        ]
    }, */
    {
        group: 'Administración',
        items: [
            { path: '/app/admin/users', label: 'Directorio de Usuarios', icon: 'Users' },
            {
                label: 'Accesos y Permisos',
                icon: 'KeyRound',
                children: [
                    { path: '/app/admin/roles', label: 'Roles de Sistema' },
                    { path: '/app/admin/seguridad', label: 'Menús Personalizados' },
                    { path: '/app/admin/permisos', label: 'Reglas de Visibilidad' },
                    { path: '/app/admin/visibilidad', label: 'Explorar Visibilidad' }
                ]
            },
            {
                label: 'Auditoría y Monitoreo',
                icon: 'ShieldCheck',
                children: [
                    { path: '/app/admin/supervision', label: 'Supervisión Operativa' },
                    { path: '/app/admin/audit', label: 'Registro de Acciones' },
                    { path: '/app/admin/reporte-inactividad', label: 'Inactividad de Usuarios' },
                    { path: '/app/admin/logs', label: 'Monitor del Sistema' }
                ]
            },
            {
                label: 'Mantenimiento',
                icon: 'Database',
                children: [
                    { path: '/app/admin/import', label: 'Importador de Datos' },
                    { path: '/app/admin/papelera', label: 'Papelera de Reciclaje' }
                ]
            }
        ]
    },
    /* {
        group: 'Historial',
        items: [
            { path: '/app/archivo', label: 'Archivo Tareas', icon: 'Archive' },
        ]
    }, */
    /* {
        group: 'Ayuda',
        items: [
            { path: '/app/help', label: 'Tutorial Interactivo', icon: 'BookOpen' },
        ]
    } */
    {
        group: 'Experimental',
        items: [
            {
                label: 'Marcaje Web',
                icon: 'Clock',
                children: [
                    { path: '/app/marcaje', label: 'Reloj' },
                    { path: '/app/marcaje/monitor', label: 'Monitor' },
                    { path: '/app/marcaje/reportes', label: 'Reportes' },
                    { path: '/app/marcaje/admin', label: 'Admin Marcaje' },
                    { path: '/app/marcaje/jornada', label: 'Jornada Laboral' },
                    { path: '/app/marcaje/geocercas', label: 'Geocercas y Mapa' }
                ]
            },
            { path: '/app/campo/dashboard', label: 'Dashboard Campo', icon: 'BarChart3' },
            { path: '/app/campo/tracking', label: 'Móvil Suit Case', icon: 'Navigation' },
            {
                label: 'Operaciones Campo',
                icon: 'MapPin',
                children: [
                    { path: '/app/campo/clientes', label: 'Clientes' },
                    { path: '/app/campo/visitas', label: 'Visitas' },
                    { path: '/app/campo/agenda', label: 'Agenda Campo' },
                    { path: '/app/campo/reportes', label: 'Reportes Campo' },
                    { path: '/app/campo/metas', label: 'Metas' }
                ]
            }
        ]
    },
];

export const ICON_MAP: any = {
    Sun, CheckSquare, FileText, LayoutDashboard, Eye, Shield, BarChart, FileCheck,
    PieChart, Users, KeyRound, ShieldCheck, Database, Terminal, Archive, BookOpen, ClipboardList,
    History, Trash2, Briefcase, Clock, Settings, Map, MapPin, Navigation, Target, BarChart3,
    Smartphone
};
