#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::state::ApiState;

pub async fn marcaje_mark(
    State(state): State<ApiState>,
    Json(body): Json<MarcajeMarkRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(
                    format!("Error de conexiÃ³n: {}", e),
                    500,
                )),
            )
                .into_response()
        }
    };

    let raw_source = body
        .device_type
        .clone()
        .unwrap_or_else(|| "DESKTOP".to_string())
        .to_uppercase();
    let tipo_device = if raw_source == "APP" || raw_source == "MOBILE" || raw_source == "MOVIL" {
        "MOBILE"
    } else {
        "DESKTOP"
    };

    // sp_marcaje_registrar @carnet, @tipo_marcaje, @tipo_device, @lat, @lon, @accuracy, @ip, ...
    let stream = match client
        .query(
            "EXEC sp_marcaje_registrar_rust @P1, @P2, @P3, @P4, @P5, @P6, NULL, NULL, NULL, NULL, @P7",
            &[
                &body.carnet,
                &body.accion,
                &tipo_device,
                &body.lat,
                &body.lon,
                &body.accuracy,
                &body.offline_id,
            ],
        )
        .await
    {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": format!("Error ejecutando SP: {}", e)})),
            )
                .into_response()
        }
    };

    match stream.into_first_result().await {
        Ok(rows) => {
            if let Some(r) = rows.into_iter().next() {
                (StatusCode::OK, Json(crate::models::ApiResponse::success(serde_json::json!({
                    "id": r.try_get::<i32, _>("id").ok().flatten().unwrap_or(0),
                    "tipo_marcaje": r.try_get::<&str, _>("tipo_marcaje").ok().flatten().unwrap_or(""),
                    "estado": r.try_get::<&str, _>("estado").ok().flatten().unwrap_or(""),
                    "motivo": r.try_get::<&str, _>("motivo").ok().flatten().unwrap_or(""),
                    "message": "Marcaje registrado correctamente"
                })))).into_response()
            } else {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"message": "Error al registrar marcaje: No se retornÃ³ ID"})),
                )
                    .into_response()
            }
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": format!("Error procesando resultado: {}", e)})),
        )
            .into_response(),
    }
}

pub async fn marcaje_summary(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": format!("Error de conexiÃ³n: {}", e)})),
            )
                .into_response()
        }
    };

    // Carnet from JWT, with query param override
    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());

    // Zero Inline SQL: Usar sp_marcaje_resumen_diario (multi-resultset)
    let recordsets = crate::handlers::equipo::exec_sp_multi_to_json(
        &mut client,
        "EXEC sp_marcaje_resumen_diario_rust @P1",
        &[&carnet],
    )
    .await;

    let history = recordsets.get(0).cloned().unwrap_or_default();
    let flags = recordsets
        .get(1)
        .and_then(|rs| rs.first())
        .cloned()
        .unwrap_or(serde_json::json!({
            "isClockedIn": false,
            "staleShift": false
        }));
    let last_checkin = flags
        .get("lastCheckIn")
        .cloned()
        .unwrap_or(serde_json::json!(null));
    let last_checkout = flags
        .get("lastCheckOut")
        .cloned()
        .unwrap_or(serde_json::json!(null));

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success(serde_json::json!({
            "dailyHistory": history.clone(),
            "flags": flags,
            "historial": history,
            "hora_entrada": last_checkin,
            "hora_salida": last_checkout
        }))),
    )
        .into_response()
}

pub async fn marcaje_undo_last(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    };

    let carnet = user.carnet().to_string();

    match client
        .query("EXEC sp_marcaje_deshacer_ultimo_rust @P1", &[&carnet])
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let ok = r.try_get::<bool, _>("ok").ok().flatten().unwrap_or(false);
                    let mensaje = r
                        .try_get::<&str, _>("mensaje")
                        .ok()
                        .flatten()
                        .unwrap_or("Sin resultado")
                        .to_string();
                    let tipo_eliminado = r
                        .try_get::<&str, _>("tipo_eliminado")
                        .ok()
                        .flatten()
                        .or_else(|| r.try_get::<&str, _>("tipo_actual").ok().flatten())
                        .unwrap_or("")
                        .to_string();
                    return (StatusCode::OK, Json(serde_json::json!({"ok": ok, "mensaje": mensaje, "tipo_eliminado": tipo_eliminado}))).into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({"ok": false, "mensaje": "Sin resultado"})),
    )
        .into_response()
}

pub async fn marcaje_request_correction(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeRequestCorrectionRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };

    let carnet = user.carnet().to_string();
    let tipo_solicitud = body
        .tipo_solicitud
        .as_deref()
        .unwrap_or("CORRECCION_ASISTENCIA")
        .to_string();
    let motivo = body.motivo.clone();
    let asistencia_id = body.asistencia_id;

    match client
        .query(
            "EXEC sp_marcaje_solicitar_correccion_rust @P1, @P2, @P3, @P4",
            &[&carnet, &asistencia_id, &tipo_solicitud, &motivo],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let json = crate::handlers::equipo::row_to_json(&r);
                    return (StatusCode::OK, Json(json)).into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    }

    (StatusCode::OK, Json(serde_json::json!({"success": true}))).into_response()
}

pub async fn marcaje_gps_track(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeGpsTrackRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "error": e.to_string()})),
            )
                .into_response()
        }
    };

    let carnet = user.carnet().to_string();
    let pts = serde_json::json!([body]);
    let pts_str = pts.to_string();

    match client
        .execute(
            "EXEC sp_marcaje_gps_batch_rust @P1, @P2",
            &[&carnet, &pts_str],
        )
        .await
    {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"ok": false, "error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn marcaje_gps_track_batch(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeGpsTrackBatchRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "error": e.to_string()})),
            )
                .into_response()
        }
    };

    let carnet = user.carnet().to_string();

    if body.puntos.is_empty() {
        return (StatusCode::OK, Json(serde_json::json!({"insertados": 0}))).into_response();
    }

    let pts = serde_json::json!(body.puntos);
    let pts_str = pts.to_string();

    match client
        .query(
            "EXEC sp_marcaje_gps_batch_rust @P1, @P2",
            &[&carnet, &pts_str],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let insertados = r
                        .try_get::<i32, _>("insertados")
                        .ok()
                        .flatten()
                        .unwrap_or(0);
                    return (
                        StatusCode::OK,
                        Json(serde_json::json!({"insertados": insertados})),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "error": e.to_string()})),
            )
                .into_response()
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({"insertados": body.puntos.len()})),
    )
        .into_response()
}

pub async fn marcaje_admin_solicitudes(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_ObtenerSolicitudes
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_ObtenerSolicitudes_rust",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_sites(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_ObtenerSites
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_ObtenerSites_rust",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_ips(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_ObtenerIps
    let items = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_ObtenerIps_rust",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_devices(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_ObtenerDevices
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Marcaje_Admin_ObtenerDevices_rust",
        &[],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response()
        }
    };
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_config(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_ObtenerConfigResumen
    let items = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_Marcaje_Admin_ObtenerConfigResumen_rust",
        &[],
    )
    .await
    {
        Ok(items) => items,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e, 500)),
            )
                .into_response()
        }
    };
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_monitor(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    let fecha_str = query_params.get("fecha").cloned();
    let mut items = Vec::new();
    if let Some(ref f) = fecha_str {
        if let Ok(st) = client
            .query("EXEC sp_marcaje_monitor_dia_rust @P1", &[f])
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                items = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
            }
        }
    } else {
        if let Ok(st) = client
            .query("EXEC sp_marcaje_monitor_dia_rust NULL", &[])
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                items = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
            }
        }
    }
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_dashboard(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(e.to_string(), 500)),
            )
                .into_response()
        }
    };
    let fecha_str = query_params.get("fecha").cloned();
    let mut result = serde_json::json!({});

    if let Some(ref f) = fecha_str {
        if let Ok(st) = client
            .query("EXEC sp_marcaje_dashboard_kpis_rust @P1", &[f])
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    result = crate::handlers::equipo::row_to_json(&r);
                }
            }
        }
    } else {
        if let Ok(st) = client
            .query("EXEC sp_marcaje_dashboard_kpis_rust NULL", &[])
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    result = crate::handlers::equipo::row_to_json(&r);
                }
            }
        }
    }
    (StatusCode::OK, Json(result)).into_response()
}

pub async fn marcaje_admin_resolver_solicitud(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<MarcajeResolverSolicitudRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    };
    let admin_carnet = user.carnet().to_string();
    let accion = if body.aprobado {
        "APROBADA"
    } else {
        "RECHAZADA"
    };
    match client
        .query(
            "EXEC sp_marcaje_resolver_solicitud_rust @P1, @P2, @P3, @P4",
            &[&id, &accion, &body.comentario, &admin_carnet],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let json = crate::handlers::equipo::row_to_json(&r);
                    return (StatusCode::OK, Json(json)).into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({"ok": false, "mensaje": "Sin resultado"})),
    )
        .into_response()
}

pub async fn marcaje_admin_delete_asistencia(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    body_opt: Option<Json<MarcajeMotivoRequest>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    };
    let admin_carnet = user.carnet().to_string();
    let motivo = body_opt.and_then(|Json(b)| b.motivo);
    match client
        .query(
            "EXEC sp_marcaje_admin_eliminar_rust @P1, @P2, @P3",
            &[&id, &admin_carnet, &motivo],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let json = crate::handlers::equipo::row_to_json(&r);
                    return (StatusCode::OK, Json(json)).into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({"ok": false, "mensaje": "Sin resultado"})),
    )
        .into_response()
}

pub async fn marcaje_admin_reiniciar(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
    body_opt: Option<Json<MarcajeMotivoRequest>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    };
    let admin_carnet = user.carnet().to_string();
    let motivo = body_opt.and_then(|Json(b)| b.motivo);
    match client
        .query(
            "EXEC sp_marcaje_admin_reiniciar_rust @P1, @P2, @P3",
            &[&carnet, &admin_carnet, &motivo],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    let json = crate::handlers::equipo::row_to_json(&r);
                    return (StatusCode::OK, Json(json)).into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"ok": false, "mensaje": e.to_string()})),
            )
                .into_response()
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({"ok": false, "mensaje": "Sin resultado"})),
    )
        .into_response()
}

pub async fn marcaje_admin_reportes(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let fecha_inicio = query_params.get("fecha_inicio").cloned();
    let fecha_fin = query_params.get("fecha_fin").cloned();
    let carnet = query_params.get("carnet").cloned();

    // In Rust with Tiberius we can pass null directly if we conditionally structure query parameters, but passing None requires explicit type annotations depending on the column.
    // Simplifying execution similar to dashboard by falling back if missing
    let mut items = Vec::new();

    if let (Some(fi), Some(ff), Some(car)) = (&fecha_inicio, &fecha_fin, &carnet) {
        if let Ok(st) = client
            .query(
                "EXEC sp_marcaje_reporte_asistencia_rust @P1, @P2, @P3",
                &[fi, ff, car],
            )
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                items = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
            }
        }
    } else if let (Some(fi), Some(ff)) = (&fecha_inicio, &fecha_fin) {
        if let Ok(st) = client
            .query(
                "EXEC sp_marcaje_reporte_asistencia_rust @P1, @P2, NULL",
                &[fi, ff],
            )
            .await
        {
            if let Ok(rows) = st.into_first_result().await {
                items = rows
                    .into_iter()
                    .map(|r| crate::handlers::equipo::row_to_json(&r))
                    .collect();
            }
        }
    } else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "fechas obligatorias"})),
        )
            .into_response();
    }
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_create_site(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeCreateSiteRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let radio = body.radio_metros.unwrap_or(200);
    let acc = body.accuracy_max.unwrap_or(100);
    match client
        .query(
            "EXEC sp_marcaje_admin_crud_site_rust 'CREAR', NULL, @P1, @P2, @P3, @P4, @P5, NULL",
            &[&body.nombre, &body.lat, &body.lng, &radio, &acc],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn marcaje_admin_update_site(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<MarcajeCreateSiteRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let activo_i32 = if body.activo.unwrap_or(true) {
        1_i32
    } else {
        0_i32
    };
    match client
        .query(
            "EXEC sp_marcaje_admin_crud_site_rust 'EDITAR', @P1, @P2, @P3, @P4, @P5, @P6, @P7",
            &[
                &id,
                &body.nombre,
                &body.lat,
                &body.lng,
                &body.radio_metros,
                &body.accuracy_max,
                &activo_i32,
            ],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn marcaje_admin_delete_site(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    match client.query("EXEC sp_marcaje_admin_crud_site_rust 'ELIMINAR', @P1, NULL, NULL, NULL, NULL, NULL, NULL", &[&id]).await {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (StatusCode::OK, Json(crate::handlers::equipo::row_to_json(&r))).into_response();
                }
            }
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    }
    (StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn marcaje_admin_create_ip(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeCreateIpRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_GestionIp
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_GestionIp_rust @accion='CREAR', @nombre=@P1, @ip=@P2",
        &[&body.nombre, &body.ip],
    )
    .await;
    (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response()
}

pub async fn marcaje_admin_delete_ip(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_GestionIp
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_GestionIp_rust @accion='ELIMINAR', @id=@P1",
        &[&id],
    )
    .await;
    (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response()
}

pub async fn marcaje_admin_update_device(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(uuid): Path<String>,
    Json(body): Json<MarcajeUpdateDeviceRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let estado = if body.habilitado { "ACTIVE" } else { "BLOCKED" };
    match client
        .query(
            "EXEC sp_marcaje_admin_device_rust @P1, @P2",
            &[&uuid, &estado],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (StatusCode::OK, Json(serde_json::json!({}))).into_response()
}

pub async fn marcaje_geocerca_validar(
    State(state): State<ApiState>,
    user: crate::auth::AuthUser,
    Json(body): Json<MarcajeGeocercaValidarRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let carnet = user.carnet().to_string();
    match client
        .query(
            "EXEC sp_marcaje_validar_geocerca_rust @P1, @P2, @P3",
            &[&carnet, &body.lat, &body.lng],
        )
        .await
    {
        Ok(st) => {
            if let Ok(rows) = st.into_first_result().await {
                if let Some(r) = rows.into_iter().next() {
                    return (
                        StatusCode::OK,
                        Json(crate::handlers::equipo::row_to_json(&r)),
                    )
                        .into_response();
                }
            }
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    }
    (
        StatusCode::OK,
        Json(serde_json::json!({"dentro_geocerca": true, "estado": "SIN_RESTRICCION"})),
    )
        .into_response()
}

pub async fn marcaje_admin_geocercas(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    let mut items = Vec::new();
    if let Ok(st) = client
        .query("EXEC sp_marcaje_geocercas_usuario_rust @P1", &[&carnet])
        .await
    {
        if let Ok(rows) = st.into_first_result().await {
            items = rows
                .into_iter()
                .map(|r| crate::handlers::equipo::row_to_json(&r))
                .collect();
        }
    }
    Json(crate::models::ApiResponse::success(items)).into_response()
}

pub async fn marcaje_admin_create_geocerca(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<MarcajeCreateGeocercaRequest>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };

    // Zero Inline SQL: Usar sp_Marcaje_Admin_GestionGeocerca
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_GestionGeocerca_rust @accion='CREAR', @carnet=@P1, @id_site=@P2",
        &[&body.carnet, &body.id_site],
    )
    .await;
    (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response()
}

pub async fn marcaje_admin_delete_geocerca(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response()
        }
    };
    // Zero Inline SQL: Usar sp_Marcaje_Admin_GestionGeocerca
    let _ = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Marcaje_Admin_GestionGeocerca_rust @accion='BORRAR', @id=@P1",
        &[&id],
    )
    .await;
    (StatusCode::OK, Json(serde_json::json!({"ok": true}))).into_response()
}

// ----- MODELS -----

#[derive(Deserialize)]
pub struct MarcajeMarkRequest {
    pub carnet: String,
    #[serde(alias = "tipo")]
    #[serde(alias = "tipo_marcaje")]
    pub accion: String,
    #[serde(alias = "source")]
    #[serde(alias = "tipo_device")]
    pub device_type: Option<String>,
    pub lat: Option<f64>,
    #[serde(alias = "lng")]
    #[serde(alias = "lon")]
    pub lon: Option<f64>,
    pub accuracy: Option<f64>,
    #[serde(alias = "offlineId")]
    #[serde(rename = "offline_id")]
    pub offline_id: Option<String>,
}

#[derive(Deserialize)]
pub struct MarcajeRequestCorrectionRequest {
    pub asistencia_id: Option<i32>,
    #[serde(alias = "tipo")]
    pub tipo_solicitud: Option<String>,
    pub motivo: String,
}

#[derive(Deserialize, Serialize)]
pub struct MarcajeGpsTrackRequest {
    pub lat: f64,
    #[serde(alias = "lng")]
    pub lon: f64,
    pub accuracy: Option<f64>,
    pub timestamp: String,
    pub fuente: Option<String>,
}

#[derive(Deserialize)]
pub struct MarcajeGpsTrackBatchRequest {
    pub puntos: Vec<MarcajeGpsTrackRequest>,
}

#[derive(Deserialize)]
pub struct MarcajeResolverSolicitudRequest {
    pub aprobado: bool,
    pub comentario: Option<String>,
}

#[derive(Deserialize)]
pub struct MarcajeCreateSiteRequest {
    pub nombre: Option<String>,
    pub lat: Option<f64>,
    #[serde(alias = "lon")]
    pub lng: Option<f64>,
    pub radio_metros: Option<i32>,
    pub accuracy_max: Option<i32>,
    pub activo: Option<bool>,
}

#[derive(Deserialize)]
pub struct MarcajeMotivoRequest {
    pub motivo: Option<String>,
}

#[derive(Deserialize)]
pub struct MarcajeCreateIpRequest {
    #[serde(alias = "cidr")]
    pub ip: String,
    pub nombre: Option<String>,
}

#[derive(Deserialize)]
pub struct MarcajeUpdateDeviceRequest {
    pub nombre: Option<String>,
    #[serde(alias = "estado")]
    pub habilitado: bool,
}

#[derive(Deserialize)]
pub struct MarcajeGeocercaValidarRequest {
    pub carnet: Option<String>,
    pub lat: f64,
    #[serde(alias = "lon")]
    pub lng: f64,
}

#[derive(Deserialize)]
pub struct MarcajeCreateGeocercaRequest {
    pub carnet: String,
    #[serde(alias = "idSite")]
    pub id_site: i32,
}
