import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';

import { RoleRoute } from '../components/auth/RoleRoute';

// Core Pages
import { LoginPage } from '../pages/LoginPage';
import { MiDiaPage } from '../pages/Hoy/MiDiaPage';
import { PendientesPage } from '../pages/Pendientes/PendientesPage';
import { ArchivePage } from '../pages/Archive/ArchivePage';
import { SSOHandlerPage } from '../pages/SSOHandlerPage';

// Views - Hoy
import { ExecutionView } from '../pages/Hoy/views/ExecutionView';
import { CalendarView } from '../pages/Hoy/views/CalendarView';
import { TimelineView } from '../pages/Hoy/views/TimelineView';
import { ExecutiveView } from '../pages/Hoy/views/ExecutiveView';
// import { AlertsView } from '../pages/Hoy/views/AlertsView';
// import { BlockersView } from '../pages/Hoy/views/BlockersView';
// import { MetricsView } from '../pages/Hoy/views/MetricsView';
// import { TeamView } from '../pages/Hoy/views/TeamView';
// import { VisibilidadView } from '../pages/Hoy/views/VisibilidadView';

// Planning Pages
import { ProyectosPage } from '../pages/Planning/ProyectosPage';

import { ApprovalsPage } from '../pages/Planning/ApprovalsPage';
import { TimelinePage as PlanningTimelinePage } from '../pages/Planning/TimelinePage';
import { RoadmapPage } from '../pages/Planning/RoadmapPage';
import { WorkloadPage } from '../pages/Planning/WorkloadPage';
import { ProjectSimulationPage } from '../pages/Planning/ProjectSimulationPage';
import { PlanTrabajoPage } from '../pages/Planning/PlanTrabajoPage';
import { TeamPlanningPage } from '../pages/Planning/TeamPlanningPage';
import { ProjectHistoryPage } from '../pages/Planning/ProjectHistoryPage';

// Team Pages
// import { ManagerDashboard } from '../pages/Equipo/ManagerDashboard';
import { DashboardManager } from '../pages/Equipo/DashboardManager';
import { MemberAgendaPage } from '../pages/Equipo/MemberAgendaPage';
import { EquipoBloqueosPage } from '../pages/Equipo/EquipoBloqueosPage';
import { MiEquipoPage } from '../pages/Equipo/MiEquipoPage';
import { ActividadEquipoPage } from '../pages/Equipo/ActividadEquipoPage';
import { AgendaCompliancePage } from '../pages/Equipo/AgendaCompliancePage';

// Other Pages
import { MeetingNotesPage } from '../pages/Notes/MeetingNotesPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { TutorialPage } from '../pages/Tutorial/TutorialPage';
import { AutomationPage } from '../pages/Automation/AutomationPage';

// Lazy Admin Pages
const UsersPage = React.lazy(() => import('../pages/Admin/UsersPage').then(module => ({ default: module.UsersPage })));
const LogsPage = React.lazy(() => import('../pages/Admin/LogsPage').then(module => ({ default: module.LogsPage })));
const AuditLogsPage = React.lazy(() => import('../pages/Admin/Audit/AuditLogsPage').then(module => ({ default: module.AuditLogsPage })));
const RolesPage = React.lazy(() => import('../pages/Admin/Roles/RolesPage').then(module => ({ default: module.RolesPage })));
const ImportPage = React.lazy(() => import('../pages/Admin/Import/ImportPage').then(module => ({ default: module.ImportPage })));
const PermisosPage = React.lazy(() => import('../pages/Admin/Acceso/PermisosPage').then(module => ({ default: module.PermisosPage })));
const VisibilidadPage = React.lazy(() => import('../pages/Admin/Acceso/VisibilidadPage').then(module => ({ default: module.VisibilidadPage })));
const SecurityManagementPage = React.lazy(() => import('../pages/Admin/SecurityManagementPage'));
const RecycleBinPage = React.lazy(() => import('../pages/Admin/RecycleBinPage').then(module => ({ default: module.RecycleBinPage })));
const MiAsignacionPage = React.lazy(() => import('../pages/Admin/MiAsignacionPage'));
const SupervisionPage = React.lazy(() => import('../pages/Admin/SupervisionPage').then(module => ({ default: module.SupervisionPage })));
const ReporteInactividadPage = React.lazy(() => import('../pages/Admin/ReporteInactividadPage'));

// --- Módulos Experimentales (Marcaje Web + Visita Cliente) ---
const MarcajeWebPage = React.lazy(() => import('../pages/MarcajeWeb/MarcajeWebPage'));
const VCTrackingPage = React.lazy(() => import('../pages/Campo/VCTrackingPage'));

// --- Admin: Marcaje + Visita Cliente ---
const MarcajeAdminPage = React.lazy(() => import('../pages/Admin/MarcajeAdmin/MarcajeAdminPage'));
const MarcajeMonitorPage = React.lazy(() => import('../pages/Admin/MarcajeAdmin/MarcajeMonitorPage'));
const MarcajeReportesPage = React.lazy(() => import('../pages/Admin/MarcajeAdmin/MarcajeReportesPage'));
const JornadaAdminPage = React.lazy(() => import('../pages/Admin/MarcajeAdmin/JornadaAdminPage'));
const GeocercasPage = React.lazy(() => import('../pages/Admin/MarcajeAdmin/GeocercasPage'));
const VCClientesPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCClientesPage'));
const VCVisitasPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCVisitasPage'));
const VCDashboardPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCDashboardPage'));
const VCAgendaPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCAgendaPage'));
const VCReportesPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCReportesPage'));
const VCMetasPage = React.lazy(() => import('../pages/Admin/VisitaCliente/VCMetasPage'));

// Layout Components
import { Sidebar } from '../components/layout/Sidebar';
import { BottomNav } from '../components/layout/BottomNav';
import { CommandPalette } from '../components/ui/CommandPalette';


const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const ExperimentalGuard = () => {
    const { user, loading } = useAuth();
    if (loading) return null;

    // Solo carnet 500708 o email de Gustavo
    const isAuthorized = String((user as any)?.carnet) === '500708'
        || String((user as any)?.email).toLowerCase().includes('gustavo.lira');

    if (!isAuthorized) {
        return <Navigate to="/app/hoy" replace />;
    }
    return <Outlet />;
};

const AppLayout = () => {
    const { isSidebarCollapsed } = useUI();

    return (
        <div className="min-h-screen bg-clarity-bg flex relative">
            <CommandPalette />
            <Sidebar />
            <main className={`flex-1 transition-all duration-300 pb-20 md:pb-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-hidden min-w-0 flex flex-col`}>
                <Suspense fallback={<div className="p-8">Cargando módulo...</div>}>
                    <Outlet />
                </Suspense>
            </main>
            <BottomNav />
        </div>
    );
};

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/sso" element={<SSOHandlerPage />} />

            <Route path="/app" element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    {/* PLANNING */}
                    <Route path="planning/proyectos" element={<ProyectosPage />} />

                    <Route path="planning/approvals" element={<ApprovalsPage />} />
                    <Route path="planning/timeline" element={<PlanningTimelinePage />} />
                    <Route path="planning/roadmap" element={<RoadmapPage />} />
                    <Route path="planning/proyectos/:id/historial" element={<ProjectHistoryPage />} />
                    <Route path="proyectos/:id" element={<PlanningTimelinePage />} />
                    <Route path="planning/carga" element={<WorkloadPage />} />
                    <Route path="planning/simulation" element={<ProjectSimulationPage />} />
                    <Route path="planning/plan-trabajo" element={<PlanTrabajoPage />} />

                    {/* HOY (MI DÍA) */}
                    <Route path="hoy" element={<MiDiaPage />}>
                        <Route index element={<ExecutionView />} />
                        <Route path="calendario" element={<CalendarView />} />
                        <Route path="bitacora" element={<TimelineView />} />
                        <Route path="kpis" element={<ExecutiveView />} />
                        {/* 
                        <Route path="alertas" element={<AlertsView />} />
                        <Route path="bloqueos" element={<BlockersView />} />
                        <Route path="metricas" element={<MetricsView />} />
                        <Route path="equipo" element={<TeamView />} />
                        <Route path="visibilidad" element={<VisibilidadView />} />
                        */}
                    </Route>

                    <Route path="pendientes" element={<PendientesPage />} />

                    {/* GERENCIA / EQUIPO */}
                    <Route path="agenda/:carnet" element={<MemberAgendaPage />}>
                        <Route index element={<ExecutionView />} />
                        <Route path="calendario" element={<CalendarView />} />
                        <Route path="bitacora" element={<TimelineView />} />
                    </Route>
                    {/* <Route path="equipo" element={<ManagerDashboard />} />
                    <Route path="equipo/hoy" element={<ManagerDashboard />} /> */}
                    <Route path="software/dashboard" element={<DashboardManager />} />
                    <Route path="equipo/planning/:userId" element={<TeamPlanningPage />} />
                    <Route path="equipo/bloqueos" element={<EquipoBloqueosPage />} />
                    <Route path="equipo/mi-equipo" element={<MiEquipoPage />} />
                    <Route path="equipo/actividad" element={<ActividadEquipoPage />} />
                    <Route path="equipo/seguimiento-agenda" element={<AgendaCompliancePage />} />

                    <Route path="mi-asignacion" element={<MiAsignacionPage />} />

                    {/* OTROS MODULOS */}
                    <Route path="notas" element={<MeetingNotesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="help" element={<TutorialPage />} />
                    <Route path="automation" element={<AutomationPage />} />
                    <Route path="archivo" element={<ArchivePage />} />

                    {/* MARCAJE WEB + CAMPO (Experimentales — solo carnet 500708) */}
                    <Route element={<ExperimentalGuard />}>
                        <Route path="marcaje" element={<MarcajeWebPage />} />
                        <Route path="marcaje/admin" element={<MarcajeAdminPage />} />
                        <Route path="marcaje/monitor" element={<MarcajeMonitorPage />} />
                        <Route path="marcaje/reportes" element={<MarcajeReportesPage />} />
                        <Route path="marcaje/jornada" element={<JornadaAdminPage />} />
                        <Route path="marcaje/geocercas" element={<GeocercasPage />} />
                        <Route path="campo/tracking" element={<VCTrackingPage />} />
                        <Route path="campo/dashboard" element={<VCDashboardPage />} />
                        <Route path="campo/clientes" element={<VCClientesPage />} />
                        <Route path="campo/visitas" element={<VCVisitasPage />} />
                        <Route path="campo/agenda" element={<VCAgendaPage />} />
                        <Route path="campo/reportes" element={<VCReportesPage />} />
                        <Route path="campo/metas" element={<VCMetasPage />} />
                    </Route>

                    {/* ADMIN */}
                    <Route element={<RoleRoute allowedRoles={['Admin', 'Administrador', 'SuperAdmin']} />}>
                        <Route path="admin/users" element={<UsersPage />} />
                        <Route path="admin/roles" element={<RolesPage />} />
                        <Route path="admin/permisos" element={<PermisosPage />} />
                        <Route path="admin/visibilidad" element={<VisibilidadPage />} />
                        <Route path="admin/logs" element={<LogsPage />} />
                        <Route path="admin/supervision" element={<SupervisionPage />} />
                        <Route path="admin/audit" element={<AuditLogsPage />} />
                        <Route path="admin/import" element={<ImportPage />} />
                        <Route path="admin/seguridad" element={<SecurityManagementPage />} />
                        <Route path="admin/papelera" element={<RecycleBinPage />} />
                        <Route path="admin/reporte-inactividad" element={<ReporteInactividadPage />} />

                    </Route>

                    {/* DEFAULT REDIRECT */}
                    <Route path="" element={<Navigate to="hoy" replace />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/app/hoy" replace />} />
        </Routes>
    );
};
