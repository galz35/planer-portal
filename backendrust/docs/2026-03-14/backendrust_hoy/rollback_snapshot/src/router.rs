#![allow(dead_code)]
use axum::{
    response::IntoResponse,
    routing::{any, delete, get, patch, post, put}, Router,
};
use std::{collections::HashMap, sync::Arc, time::Instant};
use tokio::sync::RwLock;

use crate::db::Pool;
use crate::migration::EndpointManifest;
use crate::state::ApiState;

use crate::handlers::acceso::*;
use crate::handlers::admin::*;
use crate::handlers::api::*;
use crate::handlers::auth::*;
use crate::handlers::clarity_extra::*;
use crate::handlers::diagnostico::*;
use crate::handlers::endpoint::*;
use crate::handlers::equipo::*;
use crate::handlers::generic::*;
use crate::handlers::jornada::*;
use crate::handlers::marcaje::*;
use crate::handlers::migration::*;
use crate::handlers::notas::*;
use crate::handlers::planning::*;
use crate::handlers::proyectos::*;
use crate::handlers::tareas::*;
use crate::handlers::visita::*;
use crate::handlers::campo::*;
use crate::handlers::notificacion::*;

pub fn api_router(
    manifest: EndpointManifest,
    boot_time: Instant,
    pool: Pool,
    cfg: crate::config::AppConfig,
) -> Router {
    let jwt_secret = cfg
        .jwt_secret
        .clone()
        .expect("JWT secret validado en build_router");
    let jwt_ext = crate::auth::JwtSecret(jwt_secret.clone());
    
    let notification_service = Arc::new(crate::services::notification::NotificationService::new(
        cfg.clone(),
        pool.clone(),
    ));

    let state = ApiState {
        route_matcher: Arc::new(crate::migration::route_matcher(&manifest)),
        manifest: Arc::new(manifest),
        boot_time,
        user_config: Arc::new(RwLock::new(HashMap::new())),
        pool,
        jwt_secret,
        login_limiter: crate::security::login_rate_limiter(),
        notification_service,
    };

    Router::new()
        .route("/", get(api_root))
        .route("/diagnostico/contexto", get(diagnostico_contexto))
        .route("/diagnostico/ping", get(diagnostico_ping))
        .route("/diagnostico/stats", get(diagnostico_stats))
        .route(
            "/diagnostico/test-idcreador",
            get(diagnostico_test_id_creador),
        )
        .route("/diagnostico/test-tarea", get(diagnostico_test_tarea))
        .route("/auth/login", post(auth_login))
        .route("/auth/refresh", post(auth_refresh))
        .route("/auth/change-password", post(auth_change_password))
        .route(
            "/auth/config",
            get(auth_get_config).post(auth_update_config),
        )
        .route("/planning/workload", get(planning_workload))
        .route("/planning/pending", get(planning_pending))
        .route("/planning/approvals", get(planning_approvals))
        .route(
            "/planning/check-permission",
            post(planning_check_permission),
        )
        .route("/planning/request-change", post(planning_request_change))
        .route("/planning/resolve", post(planning_resolve))
        .route(
            "/planning/approvals/:idSolicitud/resolve",
            post(planning_approval_resolve),
        )
        .route(
            "/planning/plans",
            get(planning_plans).post(planning_create_plan),
        )
        .route("/planning/stats", get(planning_stats))
        .route("/planning/stats/compliance", get(planning_stats_compliance))
        .route(
            "/planning/stats/performance",
            get(planning_stats_performance),
        )
        .route(
            "/planning/stats/bottlenecks",
            get(planning_stats_bottlenecks),
        )
        .route("/planning/team", get(planning_team))
        .route("/planning/my-projects", get(planning_my_projects))
        .route("/planning/plans/:id/close", post(planning_close_plan))
        .route(
            "/planning/update-operative",
            post(planning_update_operative),
        )
        .route("/planning/tasks/:id/clone", post(planning_clone_task))
        .route("/planning/tasks/:id/history", get(planning_task_history))
        .route(
            "/planning/tasks/:id/avance-mensual",
            get(planning_task_avance_mensual).post(planning_task_save_avance_mensual),
        )
        .route(
            "/planning/tasks/:id/crear-grupo",
            post(planning_task_crear_grupo),
        )
        .route(
            "/planning/tasks/:id/agregar-fase",
            post(planning_task_agregar_fase),
        )
        .route("/planning/grupos/:idGrupo", get(planning_grupo_detail))
        .route("/planning/dashboard/alerts", get(planning_dashboard_alerts))
        .route("/planning/mi-asignacion", get(planning_mi_asignacion))
        .route("/planning/supervision", get(planning_supervision))
        .route("/planning/debug", get(planning_debug))
        .route("/planning/reassign", post(planning_reassign))
        .route(
            "/proyectos/roles-colaboracion",
            get(proyectos_roles_colaboracion),
        )
        .route("/proyectos", get(proyectos_list).post(proyectos_create))
        .route("/proyectos/:id/clonar", post(proyectos_clone))
        .route(
            "/proyectos/:id",
            get(proyectos_get)
                .patch(proyectos_update)
                .delete(proyectos_delete),
        )
        .route("/proyectos/:id/tareas", get(proyectos_tareas))
        .route("/proyectos/:id/historial", get(proyectos_historial))
        .route(
            "/proyectos/:id/colaboradores",
            get(proyectos_colaboradores).post(proyectos_add_colaborador),
        )
        .route(
            "/proyectos/:id/colaboradores/:idUsuario",
            patch(proyectos_update_colaborador).delete(proyectos_remove_colaborador),
        )
        .route("/proyectos/:id/mis-permisos", get(proyectos_mis_permisos))
        .route(
            "/tareas/:idTarea/avance-mensual",
            get(tareas_avance_mensual).post(tareas_save_avance_mensual),
        )
        .route("/tareas/masiva", post(tareas_masiva))
        .route("/tareas/mias", get(tareas_mias))
        .route("/tareas/:id", get(tareas_get).patch(tareas_update).delete(tareas_delete))
        .route("/tareas/:id/revalidar", post(tareas_revalidar))
        .route("/tareas/:id/clonar", post(planning_clone_task))
        .route("/tareas/:id/participantes", post(tareas_participantes))
        .route("/tareas/:id/recordatorio", post(tareas_recordatorio))
        .route("/tareas/:id/bloqueos", get(tareas_bloqueos))
        .route("/tareas/historico/:carnet", get(tareas_historico))
        .route("/tareas/:id/descartar", post(tareas_descartar))
        .route("/tareas/:id/mover", post(tareas_mover))
        .route("/tareas/:id/avance", post(tareas_avance))
        .route("/tareas/avance/:id", delete(tareas_delete_avance))
        .route("/tareas/solicitud-cambio", post(tareas_solicitud_cambio))
        .route(
            "/tareas/solicitud-cambio/pendientes",
            get(tareas_solicitud_cambio_pendientes),
        )
        .route(
            "/tareas/solicitud-cambio/:id/resolver",
            post(tareas_solicitud_cambio_resolver),
        )
        .route(
            "/tareas/:id/recurrencia",
            get(tareas_get_recurrencia).post(tareas_set_recurrencia),
        )
        .route("/tareas/:id/instancia", post(tareas_crear_instancia))
        .route("/tareas/:id/instancias", get(tareas_list_instancias))
        .route("/marcaje/mark", post(marcaje_mark))
        .route("/marcaje/summary", get(marcaje_summary))
        .route("/marcaje/undo-last-checkout", post(marcaje_undo_last))
        .route("/marcaje/undo-last", post(marcaje_undo_last))
        .route("/marcaje/request-correction", post(marcaje_request_correction))
        .route("/marcaje/correccion", post(marcaje_request_correction))
        .route("/marcaje/gps-track", post(marcaje_gps_track))
        .route("/marcaje/gps-track-batch", post(marcaje_gps_track_batch))
        .route("/marcaje/admin/solicitudes", get(marcaje_admin_solicitudes))
        .route(
            "/marcaje/admin/sites",
            get(marcaje_admin_sites).post(marcaje_admin_create_site),
        )
        .route(
            "/marcaje/admin/ips",
            get(marcaje_admin_ips).post(marcaje_admin_create_ip),
        )
        .route("/marcaje/admin/devices", get(marcaje_admin_devices))
        .route("/marcaje/admin/config", get(marcaje_admin_config))
        .route("/marcaje/admin/monitor", get(marcaje_admin_monitor))
        .route("/marcaje/admin/dashboard", get(marcaje_admin_dashboard))
        .route(
            "/marcaje/admin/solicitudes/:id/resolver",
            put(marcaje_admin_resolver_solicitud),
        )
        .route(
            "/marcaje/admin/asistencia/:id",
            delete(marcaje_admin_delete_asistencia),
        )
        .route(
            "/marcaje/admin/reiniciar/:carnet",
            post(marcaje_admin_reiniciar),
        )
        .route("/marcaje/admin/reportes", get(marcaje_admin_reportes))
        .route(
            "/marcaje/admin/sites/:id",
            put(marcaje_admin_update_site).delete(marcaje_admin_delete_site),
        )
        .route("/marcaje/admin/ips/:id", delete(marcaje_admin_delete_ip))
        .route(
            "/marcaje/admin/devices/:uuid",
            put(marcaje_admin_update_device),
        )
        .route("/marcaje/geocerca/validar", post(marcaje_geocerca_validar))
        .route(
            "/marcaje/admin/geocercas/:id_or_carnet",
            get(marcaje_admin_geocercas).delete(marcaje_admin_delete_geocerca),
        )
        .route(
            "/marcaje/admin/geocercas",
            post(marcaje_admin_create_geocerca),
        )
        // --- Visita Campo ---
        .route("/visita-campo/agenda", get(visita_campo_agenda))
        .route("/visita-campo/clientes", get(visita_campo_clientes))
        .route("/visita-campo/checkin", post(visita_campo_checkin))
        .route("/visita-campo/checkout", post(visita_campo_checkout))
        .route("/visita-campo/resumen", get(visita_campo_resumen))
        .route("/visita-campo/tracking-batch", post(visita_campo_tracking_batch))
        .route("/visita-campo/stats/km", get(visita_campo_stats_km))
        .route("/visita-campo/tracking-raw", get(visita_campo_tracking_raw))
        .route("/visita-campo/usuarios-tracking", get(visita_campo_usuarios_tracking))
        // --- Jornada ---
        .route("/jornada/resolver/:carnet", get(jornada_resolver))
        .route("/jornada/semana/:carnet", get(jornada_semana))
        .route(
            "/jornada/horarios", 
            get(jornada_horarios).post(jornada_crear_horario)
        )
        .route(
            "/jornada/horarios/:id",
            put(jornada_actualizar_horario).delete(jornada_eliminar_horario)
        )
        .route(
            "/jornada/patrones", 
            get(jornada_patrones).post(jornada_crear_patron)
        )
        .route(
            "/jornada/asignaciones", 
            get(jornada_asignaciones).post(jornada_crear_asignacion)
        )
        .route(
            "/jornada/asignaciones/:id",
            delete(jornada_eliminar_asignacion)
        )
        // --- Admin (protegido con guard de rol) ---
        .nest("/admin", admin_subrouter(state.clone()))
        .route("/acceso/empleado/:carnet", get(acceso_empleado_get))
        .route("/acceso/organizacion/tree", get(acceso_organizacion_tree))
        .route("/visita-admin/dashboard", get(visita_admin_dashboard))
        .route("/visita-admin/visitas", get(visita_admin_visitas))
        .route("/visita-admin/reportes/km", get(visita_admin_reportes_km))
        .route("/visita-admin/importar-clientes", post(visita_admin_importar_clientes))
        .route("/visita-admin/clientes", post(visita_admin_crear_cliente))
        .route(
            "/visita-admin/clientes/:id",
            put(visita_admin_actualizar_cliente).delete(visita_admin_eliminar_cliente),
        )
        .route("/visita-admin/tracking/:carnet", get(visita_admin_tracking_usuario))
        .route("/visita-admin/agenda", post(visita_admin_crear_agenda))
        .route("/visita-admin/agenda/:id_or_carnet", get(visita_admin_listar_agenda).delete(visita_admin_eliminar_agenda))
        .route("/visita-admin/agenda/:id/reordenar", put(visita_admin_reordenar_agenda))
        .route("/visita-admin/metas", get(visita_admin_listar_metas).post(visita_admin_set_meta))
        // --- Bloque auto-generado desde endpoints_manifest.json ---
        // Estas rutas usan handlers genéricos por método para no dejar huecos
        // de paridad durante la migración.
        .route("/tasks/:id", patch(tareas_update))
        .route("/tasks/me", get(tareas_mias))
        .route("/tareas/rapida", post(tareas_crear_rapida))
        .route("/tasks", post(tareas_crear_rapida))
        .route("/acceso/debug-raw-data", get(acceso_debug_raw_data))
        .route(
            "/acceso/delegacion",
            get(acceso_delegacion_list).post(acceso_delegacion_create),
        )
        .route("/acceso/delegacion/:id", delete(acceso_delegacion_delete))
        .route(
            "/acceso/delegacion/delegado/:carnetDelegado",
            get(acceso_delegacion_delegado),
        )
        .route(
            "/acceso/delegacion/delegante/:carnetDelegante",
            get(acceso_delegacion_delegante),
        )
        .route("/acceso/empleado/email/:correo", get(acceso_empleado_email))
        .route("/acceso/empleados", get(acceso_empleados_list))
        .route("/acceso/empleados/buscar", get(acceso_empleados_buscar))
        .route(
            "/acceso/empleados/gerencia/:nombre",
            get(acceso_empleados_gerencia),
        )
        .route("/acceso/organizacion/buscar", get(acceso_organizacion_buscar))
        .route(
            "/acceso/organizacion/nodo/:idOrg",
            get(acceso_organizacion_nodo),
        )
        .route(
            "/acceso/organizacion/nodo/:idOrg/preview",
            get(acceso_organizacion_nodo_preview),
        )
        .route(
            "/acceso/permiso-area",
            get(acceso_permiso_area_list).post(acceso_permiso_area_create),
        )
        .route(
            "/acceso/permiso-area/:id",
            get(acceso_permiso_area_por_carnet).delete(acceso_permiso_delete),
        )
        .route(
            "/acceso/permiso-empleado",
            get(acceso_permiso_empleado_list).post(acceso_permiso_empleado_create),
        )
        .route(
            "/acceso/permiso-empleado/:id",
            get(acceso_permiso_empleado_por_carnet).delete(acceso_permiso_delete),
        )
        .route("/agenda-recurrente", get(agenda_recurrente))
        .route("/agenda/:targetCarnet", get(agenda_target))
        .route("/asignaciones", post(asignaciones_create))
        .route("/audit-logs/task/:idTarea", get(audit_logs_task))
        .route("/bloqueos", post(bloqueos_create))
        .route("/bloqueos/:id/resolver", patch(bloqueos_resolver))
        .route("/campo/recorrido/activo", get(rec_get_activo))
        .route("/campo/recorrido/admin", get(rec_admin_get))
        .route("/campo/recorrido/finalizar", post(rec_finalizar))
        .route("/campo/recorrido/historial", get(rec_get_historial))
        .route("/campo/recorrido/iniciar", post(rec_iniciar))
        .route("/campo/recorrido/punto", post(rec_registrar_punto))
        .route("/campo/recorrido/puntos-batch", post(rec_registrar_batch))
        .route("/campo/recorrido/puntos/:id", get(rec_get_puntos))
        .route("/checkins", post(checkins_upsert))
        .route(
            "/config",
            get(config_get).post(config_post),
        )
        .route("/equipo/actividad", get(equipo_actividad))
        .route("/equipo/actividad/:id", get(equipo_actividad_detail))
        .route("/equipo/backlog", get(equipo_backlog))
        .route("/equipo/bloqueos", get(equipo_bloqueos))
        .route("/equipo/hoy", get(equipo_hoy))
        .route("/equipo/inform", get(equipo_inform))
        .route("/equipo/miembro/:idUsuario", get(equipo_miembro))
        .route(
            "/equipo/miembro/:idUsuario/bloqueos",
            get(equipo_miembro_bloqueos),
        )
        .route(
            "/equipo/miembro/:idUsuario/tareas",
            get(equipo_miembro_tareas),
        )
        .route(
            "/foco",
            get(foco_list).post(foco_create),
        )
        .route(
            "/foco/:id",
            patch(foco_update).delete(foco_delete),
        )
        .route("/foco/estadisticas", get(foco_estadisticas))
        .route("/foco/reordenar", post(foco_reordenar))
        .route("/gerencia/resumen", get(gerencia_resumen))
        .route("/kpis/dashboard", get(kpis_dashboard))
        .route("/mi-dia", get(planning_mi_dia))
        .route("/mi-dia/checkin", post(checkins_upsert))
        .route("/notas", get(notas_list).post(notas_create))
        .route("/notas/:id", patch(notas_update).delete(notas_delete))
        .route("/notes", post(notas_create))
        .route("/notes/:id", patch(notas_update).put(notas_update))
        .route("/notifications/device-token", post(notificacion_registrar_token))
        .route("/notifications/status", get(notificacion_status))
        .route("/notifications/test-email", get(notificacion_test_email))
        .route(
            "/notifications/test-email-public",
            get(notificacion_test_email_public),
        )
        .route(
            "/notifications/test-overdue-redesign",
            get(notificacion_test_overdue),
        )
        .route("/notifications/test-push", get(notificacion_test_push))
        .route("/organizacion/catalogo", get(organizacion_catalogo))
        .route(
            "/organizacion/estructura-usuarios",
            get(organizacion_estructura_usuarios),
        )
        .route("/recordatorios", get(recordatorios_list))
        .route("/recordatorios/:id", delete(recordatorios_delete))
        .route("/reportes/bloqueos-trend", get(reportes_bloqueos_trend))
        .route("/reportes/equipo-performance", get(reportes_equipo_performance))
        .route("/reportes/exportar", get(reportes_exportar))
        .route("/reportes/productividad", get(reportes_productividad))
        .route("/reports/agenda-compliance", get(reports_agenda_compliance))
        .route("/seed", post(api_seed))
        .route("/software/dashboard-stats", get(software_dashboard_stats))
        .route("/visibilidad/:carnet", get(visibilidad_carnets))
        .route("/visibilidad/:carnet/actores", get(visibilidad_actores))
        .route("/visibilidad/:carnet/empleados", get(visibilidad_empleados))
        .route(
            "/visibilidad/:carnet/puede-ver/:carnetObjetivo",
            get(visibilidad_puede_ver),
        )
        .route(
            "/visibilidad/:carnet/quien-puede-verme",
            get(visibilidad_quien_puede_verme),
        )
        .route(
            "/visibilidad/organizacion/:idorg/subarbol",
            get(visibilidad_subarbol),
        )
        .route("/_migration/status", get(migration_status))
        .route("/_migration/progress", get(migration_progress))
        .route("/_migration/breakdown", get(migration_breakdown))
        .route("/*tail", any(endpoint_proxy))
        .with_state(state)
        .layer(axum::Extension(jwt_ext))
}

async fn generic_manifest_get() -> impl IntoResponse {
    generic_not_implemented("GET")
}

async fn generic_manifest_post() -> impl IntoResponse {
    generic_not_implemented("POST")
}

async fn generic_manifest_patch() -> impl IntoResponse {
    generic_not_implemented("PATCH")
}

async fn generic_manifest_put() -> impl IntoResponse {
    generic_not_implemented("PUT")
}

async fn generic_manifest_delete() -> impl IntoResponse {
    generic_not_implemented("DELETE")
}

/// Sub-router para endpoints de administración.
/// Todas las rutas aquí requieren rol ADMIN/SUPERVISOR/GERENTE.
fn admin_subrouter(_state: ApiState) -> Router<ApiState> {
    Router::new()
        .route("/stats", get(admin_stats))
        .route("/usuarios", get(admin_usuarios).post(admin_create_usuario))
        .route("/usuarios/:id", patch(admin_patch_usuario).delete(admin_delete_usuario))
        .route("/usuarios/:id/rol", patch(admin_patch_usuario_rol))
        .route("/usuarios/:id/menu", post(admin_usuario_menu))
        .route("/usuarios/:id/visibilidad-efectiva", get(admin_visibilidad_efectiva))
        .route("/usuarios-inactivos", get(admin_usuarios_inactivos))
        .route("/roles", get(admin_roles).post(admin_create_role))
        .route("/roles/:id", patch(admin_patch_role).delete(admin_delete_role))
        .route("/logs", get(admin_logs))
        .route("/audit-logs", get(admin_audit_logs))
        .route("/organigrama", get(admin_organigrama))
        .route("/nodos", post(admin_create_nodo))
        .route("/usuarios-organizacion", post(admin_usuarios_organizacion))
        .route("/usuarios-organizacion/:idUsuario/:idNodo", delete(admin_delete_usuario_organizacion))
        .route("/recycle-bin", get(admin_recycle_bin))
        .route("/recycle-bin/restore", post(admin_recycle_restore))
        .route("/backup/export", get(admin_backup_export))
        .route("/import/template/empleados", get(admin_import_template_empleados))
        .route("/import/template/organizacion", get(admin_import_template_organizacion))
        .route("/import/empleados", post(admin_import_empleados))
        .route("/import/organizacion", post(admin_import_organizacion))
        .route("/import/asignaciones", post(admin_import_asignaciones))
        .route("/import/stats", get(admin_import_stats))
        .route("/security/users-access", get(admin_security_users_access))
        .route("/security/assign-menu", post(admin_security_assign_menu))
        .route("/security/assign-menu/:id", delete(admin_security_delete_assign_menu))
        .route("/security/profiles", get(admin_security_profiles))
        .layer(axum::middleware::from_fn(crate::security::require_admin))
}
