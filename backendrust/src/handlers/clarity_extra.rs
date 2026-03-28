#![allow(dead_code)]
use axum::{
    extract::{OriginalUri, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::equipo::{
    exec_query_to_json, exec_sp_multi_to_json, exec_sp_to_json, exec_sp_to_json_result,
};
use crate::auth::AuthUser;
use crate::state::ApiState;

fn acceso_json_value_to_string(value: &serde_json::Value) -> Option<String> {
    match value {
        serde_json::Value::Null => None,
        serde_json::Value::String(raw) => {
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                None
            } else {
                Some(trimmed.to_string())
            }
        }
        serde_json::Value::Number(number) => Some(number.to_string()),
        serde_json::Value::Bool(boolean) => Some(boolean.to_string()),
        other => Some(other.to_string()),
    }
}

fn acceso_json_value_to_i64(value: &serde_json::Value) -> Option<i64> {
    value
        .as_i64()
        .or_else(|| value.as_u64().and_then(|raw| i64::try_from(raw).ok()))
        .or_else(|| value.as_str().and_then(|raw| raw.trim().parse::<i64>().ok()))
}

fn acceso_normalize_org_nodo_payload(
    row: &serde_json::Value,
    empleados_directos: i64,
) -> serde_json::Value {
    let Some(mut obj) = row.as_object().cloned() else {
        return row.clone();
    };

    if let Some(id_org) = obj
        .get("idorg")
        .or_else(|| obj.get("idOrg"))
        .and_then(acceso_json_value_to_string)
    {
        obj.insert("idOrg".to_string(), serde_json::json!(id_org));
    }

    let padre = obj
        .get("padre")
        .and_then(acceso_json_value_to_string)
        .map(serde_json::Value::String)
        .unwrap_or(serde_json::Value::Null);
    obj.insert("padre".to_string(), padre);
    obj.insert(
        "empleadosDirectos".to_string(),
        serde_json::json!(empleados_directos),
    );

    serde_json::Value::Object(obj)
}

fn acceso_body_text(body: &serde_json::Value, key: &str) -> String {
    body.get(key)
        .and_then(acceso_json_value_to_string)
        .unwrap_or_default()
}

fn acceso_body_optional_text(body: &serde_json::Value, key: &str) -> Option<String> {
    body.get(key).and_then(acceso_json_value_to_string)
}

fn acceso_parse_numeric_id_i64(raw: &str) -> Option<i64> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || !trimmed.chars().all(|character| character.is_ascii_digit()) {
        return None;
    }
    trimmed.parse::<i64>().ok()
}

fn acceso_parse_numeric_id_i32(raw: &str) -> Option<i32> {
    acceso_parse_numeric_id_i64(raw).and_then(|value| i32::try_from(value).ok())
}

fn acceso_planer_path(uri: &axum::http::Uri) -> String {
    uri.path()
        .strip_prefix("/api/")
        .map(|suffix| format!("/Planer_api/{}", suffix))
        .unwrap_or_else(|| uri.path().to_string())
}

fn acceso_bad_request(message: impl Into<String>, uri: &axum::http::Uri) -> Response {
    let response = crate::models::ApiResponse::<serde_json::Value> {
        success: false,
        data: None,
        message: Some(message.into()),
        error_code: Some("BAD_REQUEST".to_string()),
        status_code: 400,
        timestamp: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        path: acceso_planer_path(uri),
    };

    (
        StatusCode::BAD_REQUEST,
        Json(response),
    )
        .into_response()
}

fn acceso_internal_error(message: impl Into<String>) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(crate::models::ApiResponse::error(
            message.into(),
            500,
        )),
    )
        .into_response()
}

async fn acceso_buscar_usuario_por_carnet(
    client: &mut bb8::PooledConnection<'_, bb8_tiberius::ConnectionManager>,
    carnet: &str,
) -> Result<Option<serde_json::Value>, String> {
    if carnet.trim().is_empty() {
        return Ok(None);
    }

    let rows = exec_sp_to_json_result(
        client,
        "EXEC sp_Usuarios_BuscarPorCarnet_rust @P1",
        &[&carnet.trim()],
    )
    .await?;

    Ok(rows.into_iter().next())
}

async fn acceso_buscar_nodo_por_id(
    client: &mut bb8::PooledConnection<'_, bb8_tiberius::ConnectionManager>,
    id_org: i64,
) -> Result<Option<serde_json::Value>, String> {
    let rows = exec_sp_to_json_result(
        client,
        "EXEC sp_Organizacion_BuscarNodoPorId @P1",
        &[&id_org],
    )
    .await?;

    Ok(rows.into_iter().next())
}

// ==========================================
// FOCO DIARIO
// ==========================================

pub async fn foco_list(
    user: AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = query_params.get("fecha").cloned().unwrap_or_default();
    let user_id = user.user_id();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let query = "SELECT f.idFoco, f.idTarea, f.fecha, f.esEstrategico, f.completado, f.orden, t.nombre as tituloTarea, t.estado as estadoTarea FROM p_FocoDiario_v2 f INNER JOIN p_Tareas t ON f.idTarea = t.idTarea WHERE f.idUsuario = @P1 AND CAST(f.fecha AS DATE) = CAST(@P2 AS DATE) ORDER BY f.orden ASC";
    let rows = exec_query_to_json(&mut client, query, &[&user_id.to_string(), &fecha]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn foco_create(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<FocoCreateRequest>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let result = exec_query_to_json(&mut client, "INSERT INTO p_FocoDiario_v2 (idUsuario, idTarea, fecha, esEstrategico, completado, orden, creadoEn) VALUES (@P1, @P2, @P3, @P4, 0, 1, GETDATE()); SELECT SCOPE_IDENTITY() as idFoco;", &[&user_id, &body.id_tarea, &body.fecha, &body.es_estrategico.unwrap_or(false)]).await;
    Json(crate::models::ApiResponse::success(
        result
            .first()
            .cloned()
            .unwrap_or(serde_json::json!({"success": true})),
    ))
    .into_response()
}

pub async fn foco_update(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    _query_params: axum::extract::Query<HashMap<String, String>>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    if let Some(comp) = body.get("completado") {
        let val = if comp.as_bool().unwrap_or(false) {
            1
        } else {
            0
        };
        let _ = client.execute("UPDATE p_FocoDiario_v2 SET completado = @P1 WHERE idFoco = @P2 AND idUsuario = @P3", &[&val, &id, &user_id]).await;
    }
    Json(serde_json::json!({"success": true})).into_response()
}

pub async fn foco_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let _ = client
        .execute(
            "DELETE FROM p_FocoDiario_v2 WHERE idFoco = @P1 AND idUsuario = @P2",
            &[&id, &user_id],
        )
        .await;
    Json(serde_json::json!({"success": true})).into_response()
}

pub async fn foco_estadisticas(
    user: AuthUser,
    State(state): State<ApiState>,
    _query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let user_id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT COUNT(*) as total FROM p_FocoDiario_v2 WHERE idUsuario = @P1",
        &[&user_id],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn foco_reordenar(
    _user: AuthUser,
    _state: State<ApiState>,
    _body: Json<FocoReordenarRequest>,
) -> impl IntoResponse {
    Json(serde_json::json!({"success": true})).into_response()
}

// ==========================================
// BLOQUEOS & CHECKINS
// ==========================================

pub async fn bloqueos_create(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let id_tarea = body.get("idTarea").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let motivo = body.get("motivo").and_then(|v| v.as_str()).unwrap_or("");
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let result = exec_sp_to_json(
        &mut client,
        "EXEC sp_Tarea_Bloquear_rust @P1, @P2, NULL, @P3, NULL, NULL",
        &[&id_tarea, &carnet.as_str(), &motivo],
    )
    .await;
    Json(
        result
            .first()
            .cloned()
            .unwrap_or(serde_json::json!({"success": true})),
    )
    .into_response()
}

pub async fn bloqueos_resolver(
    _user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let sol = body
        .get("solucion")
        .and_then(|v| v.as_str())
        .unwrap_or("Resuelto");
    let _ = client.execute("UPDATE p_Bloqueos SET estado = 'Resuelto', resolucion = @P1, fechaResolucion = GETDATE() WHERE idBloqueo = @P2", &[&sol, &id]).await;
    Json(serde_json::json!({"success": true})).into_response()
}

pub async fn checkins_upsert(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<CheckinUpsertRequest>,
) -> impl IntoResponse {
    let validation_errors = checkins_validate_clarity_request(&body);
    if !validation_errors.is_empty() {
        return checkins_validation_error_response(validation_errors, "/api/checkins");
    }

    let carnet = checkins_normalize_optional_text(body.usuario_carnet.clone())
        .unwrap_or_else(|| user.carnet().to_string());
    let result = checkins_persist(
        &state,
        &carnet,
        &body,
        CheckinPersistOptions {
            auto_start_entrego: false,
            registrar_agenda_audit: false,
            default_entregable_texto: None,
            default_estado_animo: None,
            default_nota: None,
        },
    )
    .await;

    match result {
        Ok(id_checkin) => (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!(id_checkin),
                201,
                "/api/checkins",
            )),
        )
            .into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": error})),
        )
            .into_response(),
    }
}

pub async fn mi_dia_checkin(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<CheckinUpsertRequest>,
) -> impl IntoResponse {
    let carnet =
        match checkins_effective_user_carnet(&state, &user).await {
            Ok(value) if !value.is_empty() => value,
            Ok(_) => return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"message": "Usuario sin carnet asociado para Check-in."})),
            )
                .into_response(),
            Err(error) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"message": error})),
                )
                    .into_response()
            }
        };

    let result = checkins_persist(
        &state,
        &carnet,
        &body,
        CheckinPersistOptions {
            auto_start_entrego: true,
            registrar_agenda_audit: true,
            default_entregable_texto: Some("Objetivo del día"),
            default_estado_animo: Some("Neutral"),
            default_nota: Some(""),
        },
    )
    .await;

    match result {
        Ok(_) => (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success_with_status(
                serde_json::json!({
                    "success": true,
                    "message": "Checkin guardado correctamente"
                }),
                201,
                "/api/mi-dia/checkin",
            )),
        )
            .into_response(),
        Err(error) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"message": error})),
        )
            .into_response(),
    }
}

// ==========================================
// KPIs & VISIBILIDAD
// ==========================================

pub async fn kpis_dashboard(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let recordsets = exec_sp_multi_to_json(
        &mut client,
        "EXEC sp_Dashboard_Kpis_rust @P1",
        &[&carnet.as_str()],
    )
    .await;
    let resumo = recordsets
        .get(0)
        .and_then(|rs| rs.first())
        .cloned()
        .unwrap_or(serde_json::json!({"total":0,"hechas":0}));
    Json(crate::models::ApiResponse::success(serde_json::json!({"resumen": resumo, "proyectos": recordsets.get(1).cloned().unwrap_or_default()}))).into_response()
}

pub async fn visibilidad_carnets(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &carnet)
        .await
        .unwrap_or(vec![carnet]);
    Json(serde_json::json!({"visibles": v, "total": v.len()})).into_response()
}

pub async fn visibilidad_empleados(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let carnets = super::equipo::get_visible_carnets(&mut client, &carnet)
        .await
        .unwrap_or(vec![]);
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1",
        &[&carnets.join(",")],
    )
    .await;
    Json(serde_json::json!({"total": rows.len(), "empleados": rows})).into_response()
}

pub async fn visibilidad_actores(
    State(state): State<ApiState>,
    Path(carnet): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let ds = exec_sp_to_json(
        &mut client,
        "EXEC sp_DelegacionVisibilidad_ObtenerActivas_rust @P1",
        &[&carnet.as_str()],
    )
    .await;
    let mut acts = vec![carnet];
    for d in ds {
        if let Some(c) = d.get("carnet_delegante").and_then(|v| v.as_str()) {
            acts.push(c.to_string());
        }
    }
    Json(serde_json::json!({"carnets": acts, "total": acts.len()})).into_response()
}

pub async fn visibilidad_puede_ver(
    State(state): State<ApiState>,
    Path((c1, c2)): Path<(String, String)>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &c1)
        .await
        .unwrap_or(vec![]);
    Json(serde_json::json!({"puedeVer": v.contains(&c2)})).into_response()
}

pub async fn visibilidad_quien_puede_verme(_user: AuthUser) -> impl IntoResponse {
    Json(serde_json::json!([])).into_response()
}

pub async fn visibilidad_subarbol(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT * FROM p_OrganizacionNodos WHERE idPadre = @P1",
        &[&id],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// ACCESO & PERMISOS
// ==========================================

pub async fn acceso_empleados_list(State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT idUsuario, nombre, carnet FROM p_Usuarios WHERE activo = 1",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_empleados_buscar(
    State(state): State<ApiState>,
    q: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let txt = q.get("q").cloned().unwrap_or_default();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_Buscar_rust @P1", &[&txt]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_empleado_email(
    State(state): State<ApiState>,
    Path(email): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT * FROM p_Usuarios WHERE correo = @P1",
        &[&email],
    )
    .await;
    Json(crate::models::ApiResponse::success(
        serde_json::json!({"encontrado":!rows.is_empty(),"empleado":rows.first()}),
    ))
    .into_response()
}

pub async fn acceso_empleados_gerencia(
    State(state): State<ApiState>,
    Path(name): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_Usuarios_ListarActivos", &[]).await;
    let wanted = name.trim().to_lowercase();

    let filtered = if wanted.is_empty() {
        rows
    } else {
        rows.into_iter()
            .filter(|row| {
                row.get("gerencia")
                    .or_else(|| row.get("orgGerencia"))
                    .or_else(|| row.get("departamento"))
                    .and_then(|value| value.as_str())
                    .map(|value| value.trim().to_lowercase() == wanted)
                    .unwrap_or(false)
            })
            .collect()
    };

    Json(crate::models::ApiResponse::success(filtered)).into_response()
}

pub async fn acceso_organizacion_buscar(
    State(state): State<ApiState>,
    q: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let termino = q.get("q").cloned().unwrap_or_default();
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Organizacion_BuscarNodos @P1",
        &[&termino],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_organizacion_nodo(
    State(state): State<ApiState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let Some(id_num) = acceso_parse_numeric_id_i64(&id) else {
        return Json(crate::models::ApiResponse::success(serde_json::Value::Null)).into_response();
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Organizacion_BuscarNodoPorId @P1",
        &[&id_num],
    )
    .await;
    let empleados_directos = if let Some(id_directo) = acceso_parse_numeric_id_i32(&id) {
        let total_rows = exec_sp_to_json(
            &mut client,
            "EXEC sp_Organizacion_ContarEmpleadosNodoDirecto @P1",
            &[&id_directo],
        )
        .await;
        total_rows
            .first()
            .and_then(|row| row.get("total").or_else(|| row.get("count")))
            .and_then(acceso_json_value_to_i64)
            .unwrap_or(0)
    } else {
        0
    };
    let payload = rows
        .first()
        .map(|row| acceso_normalize_org_nodo_payload(row, empleados_directos))
        .unwrap_or(serde_json::Value::Null);

    Json(crate::models::ApiResponse::success(payload)).into_response()
}

pub async fn acceso_organizacion_nodo_preview(
    State(state): State<ApiState>,
    Path(id): Path<String>,
    q: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let alcance = match q.get("alcance").map(|value| value.trim()) {
        Some("SOLO_NODO") => "SOLO_NODO",
        _ => "SUBARBOL",
    };
    let limite = 50i32;

    let (muestra, total) = if alcance == "SOLO_NODO" {
        if let Some(id_directo) = acceso_parse_numeric_id_i32(&id) {
            let muestra = exec_sp_to_json(
                &mut client,
                "EXEC sp_Organizacion_ObtenerEmpleadosNodoDirecto @P1, @P2",
                &[&id_directo, &limite],
            )
            .await;
            let total_rows = exec_sp_to_json(
                &mut client,
                "EXEC sp_Organizacion_ContarEmpleadosNodoDirecto @P1",
                &[&id_directo],
            )
            .await;
            let total = total_rows
                .first()
                .and_then(|row| row.get("total").or_else(|| row.get("count")))
                .and_then(acceso_json_value_to_i64)
                .unwrap_or(0);
            (muestra, total)
        } else {
            (Vec::new(), 0)
        }
    } else {
        let muestra = exec_sp_to_json(
            &mut client,
            "EXEC sp_Organizacion_SubarbolPreviewEmpleados @P1, @P2",
            &[&id.as_str(), &limite],
        )
        .await;
        let total_rows = exec_sp_to_json(
            &mut client,
            "EXEC sp_Organizacion_SubarbolContarEmpleados @P1",
            &[&id.as_str()],
        )
        .await;
        let total = total_rows
            .first()
            .and_then(|row| row.get("total").or_else(|| row.get("count")))
            .and_then(acceso_json_value_to_i64)
            .unwrap_or(0);
        (muestra, total)
    };

    Json(crate::models::ApiResponse::success(serde_json::json!({
        "idOrgRaiz": id,
        "alcance": alcance,
        "total": total,
        "muestra": muestra
    })))
    .into_response()
}

pub async fn acceso_delegacion_list(
    State(state): State<ApiState>,
    _user: AuthUser,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_DelegacionVisibilidad_ListarActivas", &[])
        .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_delegacion_create(
    _user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(uri): OriginalUri,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let carnet_delegante = acceso_body_text(&body, "carnetDelegante");
    let carnet_delegado = acceso_body_text(&body, "carnetDelegado");
    let motivo = acceso_body_optional_text(&body, "motivo").unwrap_or_default();
    let fecha_fin = acceso_body_optional_text(&body, "fechaFin").unwrap_or_default();

    if carnet_delegante == carnet_delegado && !carnet_delegante.is_empty() {
        return acceso_bad_request("La delegación a sí mismo no tiene sentido.", &uri);
    }

    match acceso_buscar_usuario_por_carnet(&mut client, &carnet_delegante).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return acceso_bad_request(
                format!(
                "Empleado delegante no encontrado: {}",
                carnet_delegante
                ),
                &uri,
            )
        }
        Err(error) => return acceso_internal_error(error),
    }

    match acceso_buscar_usuario_por_carnet(&mut client, &carnet_delegado).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return acceso_bad_request(
                format!(
                "Empleado delegado no encontrado: {}",
                carnet_delegado
                ),
                &uri,
            )
        }
        Err(error) => return acceso_internal_error(error),
    }

    let motivo_param = motivo.as_str();
    let fecha_fin_param = fecha_fin.as_str();
    if let Err(error) = exec_sp_to_json_result(
        &mut client,
        "EXEC sp_DelegacionVisibilidad_Crear_rust @P1, @P2, @P3, NULL, @P4",
        &[
            &carnet_delegante.as_str(),
            &carnet_delegado.as_str(),
            &motivo_param,
            &fecha_fin_param,
        ],
    )
    .await
    {
        return acceso_internal_error(error);
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "mensaje": "Delegación creada exitosamente",
                "success": true,
                "carnetDelegante": carnet_delegante,
                "carnetDelegado": carnet_delegado
            }),
            200,
            acceso_planer_path(&uri),
        )),
    )
        .into_response()
}

pub async fn acceso_delegacion_delete(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    OriginalUri(uri): OriginalUri,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    if let Err(error) = exec_sp_to_json_result(
        &mut client,
        "EXEC sp_DelegacionVisibilidad_Eliminar_rust @P1",
        &[&id],
    )
    .await
    {
        return acceso_internal_error(error);
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "mensaje": "Delegación desactivada",
                "success": true
            }),
            200,
            acceso_planer_path(&uri),
        )),
    )
        .into_response()
}

pub async fn acceso_delegacion_delegado(
    State(state): State<ApiState>,
    Path(c): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(cl) => cl,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_DelegacionVisibilidad_ObtenerActivas_rust @P1",
        &[&c],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_delegacion_delegante(
    State(state): State<ApiState>,
    Path(c): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(cl) => cl,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_DelegacionVisibilidad_ListarPorDelegante @P1",
        &[&c],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_permiso_area_list(State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_PermisoArea_ListarActivos", &[]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_permiso_area_por_carnet(
    State(state): State<ApiState>,
    Path(c): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(cl) => cl,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_PermisoArea_ObtenerActivosPorRecibe @P1",
        &[&c],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_permiso_area_create(
    State(state): State<ApiState>,
    OriginalUri(uri): OriginalUri,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let carnet_otorga = acceso_body_optional_text(&body, "carnetOtorga").unwrap_or_default();
    let carnet_recibe = acceso_body_text(&body, "carnetRecibe");
    let id_org_raiz_raw = acceso_body_text(&body, "idOrgRaiz");
    let alcance = acceso_body_optional_text(&body, "alcance")
        .unwrap_or_else(|| "SUBARBOL".to_string());
    let motivo = acceso_body_optional_text(&body, "motivo").unwrap_or_default();
    let tipo_acceso = acceso_body_optional_text(&body, "tipoAcceso")
        .unwrap_or_else(|| "ALLOW".to_string());
    let mut nombre_area = acceso_body_optional_text(&body, "nombreArea");
    let tipo_nivel = acceso_body_optional_text(&body, "tipoNivel")
        .unwrap_or_else(|| "GERENCIA".to_string());

    match acceso_buscar_usuario_por_carnet(&mut client, &carnet_recibe).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return acceso_bad_request(
                format!(
                "Empleado receptor no encontrado: {}",
                carnet_recibe
                ),
                &uri,
            )
        }
        Err(error) => return acceso_internal_error(error),
    }

    let is_numeric_id = !id_org_raiz_raw.is_empty()
        && id_org_raiz_raw.chars().all(|character| character.is_ascii_digit());
    let mut id_org_raiz = 0i64;

    if is_numeric_id {
        id_org_raiz = id_org_raiz_raw.parse::<i64>().unwrap_or(0);
        match acceso_buscar_nodo_por_id(&mut client, id_org_raiz).await {
            Ok(Some(nodo)) => {
                if nombre_area.is_none() {
                    nombre_area = nodo
                        .get("descripcion")
                        .or_else(|| nodo.get("nombre"))
                        .and_then(acceso_json_value_to_string);
                }
            }
            Ok(None) => {
                return acceso_bad_request(
                    format!(
                    "Nodo organizacional no encontrado: {}",
                    id_org_raiz_raw
                    ),
                    &uri,
                )
            }
            Err(error) => return acceso_internal_error(error),
        }
    } else if nombre_area.is_none() {
        return acceso_bad_request(
            "nombreArea es requerido para IDs sintéticos de área",
            &uri,
        );
    }

    let nombre_area_param = nombre_area.unwrap_or_default();
    let motivo_param = motivo.as_str();
    if let Err(error) = exec_sp_to_json_result(
        &mut client,
        "EXEC sp_PermisoArea_Crear @P1, @P2, @P3, @P4, @P5, NULL, @P6, @P7, @P8",
        &[
            &carnet_otorga.as_str(),
            &carnet_recibe.as_str(),
            &id_org_raiz,
            &alcance.as_str(),
            &motivo_param,
            &tipo_acceso.as_str(),
            &nombre_area_param.as_str(),
            &tipo_nivel.as_str(),
        ],
    )
    .await
    {
        return acceso_internal_error(error);
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "mensaje": "Permiso por área creado exitosamente",
                "success": true,
                "message": "Permiso creado"
            }),
            200,
            acceso_planer_path(&uri),
        )),
    )
        .into_response()
}

pub async fn acceso_permiso_empleado_list(State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(&mut client, "EXEC sp_PermisoEmpleado_ListarActivos", &[]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_permiso_empleado_por_carnet(
    State(state): State<ApiState>,
    Path(c): Path<String>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(cl) => cl,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_PermisoEmpleado_ObtenerActivosPorRecibe @P1",
        &[&c],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn acceso_permiso_empleado_create(
    State(state): State<ApiState>,
    OriginalUri(uri): OriginalUri,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let carnet_otorga = acceso_body_optional_text(&body, "carnetOtorga").unwrap_or_default();
    let carnet_recibe = acceso_body_text(&body, "carnetRecibe");
    let carnet_objetivo = acceso_body_text(&body, "carnetObjetivo");
    let tipo_acceso = acceso_body_optional_text(&body, "tipoAcceso")
        .unwrap_or_else(|| "ALLOW".to_string());
    let motivo = acceso_body_optional_text(&body, "motivo").unwrap_or_default();

    if carnet_recibe == carnet_objetivo && !carnet_recibe.is_empty() {
        return acceso_bad_request(
            "No tiene sentido crear un permiso hacia sí mismo.",
            &uri,
        );
    }

    match acceso_buscar_usuario_por_carnet(&mut client, &carnet_recibe).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return acceso_bad_request(
                format!(
                "Empleado receptor no encontrado: {}",
                carnet_recibe
                ),
                &uri,
            )
        }
        Err(error) => return acceso_internal_error(error),
    }

    match acceso_buscar_usuario_por_carnet(&mut client, &carnet_objetivo).await {
        Ok(Some(_)) => {}
        Ok(None) => {
            return acceso_bad_request(
                format!(
                "Empleado objetivo no encontrado: {}",
                carnet_objetivo
                ),
                &uri,
            )
        }
        Err(error) => return acceso_internal_error(error),
    }

    let motivo_param = motivo.as_str();
    if let Err(error) = exec_sp_to_json_result(
        &mut client,
        "EXEC sp_PermisoEmpleado_Crear @P1, @P2, @P3, @P4, @P5",
        &[
            &carnet_otorga.as_str(),
            &carnet_recibe.as_str(),
            &carnet_objetivo.as_str(),
            &tipo_acceso.as_str(),
            &motivo_param,
        ],
    )
    .await
    {
        return acceso_internal_error(error);
    }

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "mensaje": "Permiso por empleado creado exitosamente",
                "success": true
            }),
            200,
            acceso_planer_path(&uri),
        )),
    )
        .into_response()
}

pub async fn acceso_permiso_delete(
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    OriginalUri(uri): OriginalUri,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let q = if uri.path().contains("permiso-area") {
        "EXEC sp_PermisoArea_Desactivar @P1"
    } else {
        "EXEC sp_PermisoEmpleado_Desactivar @P1"
    };
    if let Err(error) = exec_sp_to_json_result(&mut client, q, &[&id]).await {
        return acceso_internal_error(error);
    }

    let mensaje = if uri.path().contains("permiso-area") {
        "Permiso por área desactivado"
    } else {
        "Permiso por empleado desactivado"
    };

    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({
                "mensaje": mensaje,
                "success": true
            }),
            200,
            acceso_planer_path(&uri),
        )),
    )
        .into_response()
}

// ==========================================
// AGENDA & AUDIT
// ==========================================

pub async fn agenda_target(
    Path(c): Path<String>,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL",
        &[&c],
    )
    .await;
    Json(rows).into_response()
}

pub async fn audit_logs_task(
    Path(id): Path<i32>,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(&mut client, "SELECT * FROM p_AuditLogs WHERE entidadTipo = 'Tarea' AND entidadId = @P1 ORDER BY fecha DESC", &[&id]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn recordatorios_list(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT r.idRecordatorio, r.idTarea, r.fechaHoraRecordatorio, r.nota, r.enviado, t.nombre as tituloTarea, t.estado, t.prioridad FROM p_TareaRecordatorios r JOIN p_Tareas t ON r.idTarea = t.idTarea WHERE r.idUsuario = @P1 AND r.fechaHoraRecordatorio >= DATEADD(day, -1, GETDATE()) ORDER BY r.fechaHoraRecordatorio ASC",
        &[&id],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn recordatorios_delete(
    user: AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let uid = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let _ = client
        .execute(
            "DELETE FROM p_TareaRecordatorios WHERE idRecordatorio = @P1 AND idUsuario = @P2",
            &[&id, &uid],
        )
        .await;
    Json(serde_json::json!({"success": true})).into_response()
}

// ==========================================
// REPORTES
// ==========================================

pub async fn reportes_productividad(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &carnet)
        .await
        .unwrap_or(vec![carnet]);
    let sql = "SELECT u.nombre, u.carnet, COUNT(t.idTarea) as totalAsignadas, SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as completadas, SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso') AND t.fechaObjetivo < GETDATE() THEN 1 ELSE 0 END) as atrasadas, CASE WHEN COUNT(t.idTarea) = 0 THEN 0 ELSE (CAST(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.idTarea)) * 100 END as efectividad FROM p_Usuarios u LEFT JOIN p_TareaAsignados ta ON u.idUsuario = ta.idUsuario LEFT JOIN p_Tareas t ON ta.idTarea = t.idTarea WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) AND t.activo = 1 AND t.fechaObjetivo >= DATEADD(MONTH, -1, GETDATE()) GROUP BY u.nombre, u.carnet ORDER BY efectividad DESC";
    let rows = exec_query_to_json(&mut client, sql, &[&v.join(",")]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn reportes_bloqueos_trend(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let carnet = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &carnet)
        .await
        .unwrap_or(vec![carnet]);
    let sql = "SELECT DATEPART(WEEK, b.creadoEn) as semana, COUNT(b.idBloqueo) as total, b.motivo FROM p_Bloqueos b INNER JOIN p_Usuarios u ON b.idOrigenUsuario = u.idUsuario WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@P1, ',')) AND b.creadoEn >= DATEADD(MONTH, -3, GETDATE()) GROUP BY DATEPART(WEEK, b.creadoEn), b.motivo ORDER BY semana ASC";
    let rows = exec_query_to_json(&mut client, sql, &[&v.join(",")]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn reportes_equipo_performance(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    reportes_productividad(user, State(state)).await
}

pub async fn reportes_exportar(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Tareas_ObtenerPorUsuario_rust @P1, NULL, NULL, NULL, NULL, NULL",
        &[&user.carnet()],
    )
    .await;
    Json(serde_json::json!({"tareas": rows, "total": rows.len()})).into_response()
}

pub async fn reports_agenda_compliance(
    user: AuthUser,
    State(state): State<ApiState>,
    q: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let fecha = q
        .get("fecha")
        .cloned()
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &user.carnet())
        .await
        .unwrap_or(vec![user.carnet().to_string()]);
    let csv = v.join(",");
    let f = fecha.as_str();
    let miembros = super::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Usuarios_ObtenerDetallesPorCarnets_rust @P1",
        &[&csv],
    )
    .await;
    let checkins = super::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Checkins_ObtenerPorEquipoFecha_rust @P1, @P2",
        &[&csv, &f],
    )
    .await;
    let stats = super::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Equipo_ObtenerHoy_rust @P1, @P2",
        &[&csv, &f],
    )
    .await;
    let res: Vec<serde_json::Value> = miembros
        .iter()
        .map(|m| {
            let mc = m.get("carnet").and_then(|v| v.as_str()).unwrap_or("");
            let ch = checkins.iter().find(|c| {
                c.get("usuarioCarnet")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    == mc
            });
            let st = stats
                .iter()
                .find(|s| s.get("carnet").and_then(|v| v.as_str()).unwrap_or("") == mc);
            serde_json::json!({ "usuario": m, "checkin": ch, "estadisticas": st })
        })
        .collect();
    Json(crate::models::ApiResponse::success(
        serde_json::json!({ "miembros": res }),
    ))
    .into_response()
}

pub async fn gerencia_resumen(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let v = super::equipo::get_visible_carnets(&mut client, &user.carnet())
        .await
        .unwrap_or(vec![]);
    Json(serde_json::json!({"totalMiembros": v.len(),"carnets": v})).into_response()
}

pub async fn software_dashboard_stats(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(&mut client, "SELECT (SELECT COUNT(*) FROM p_Usuarios WHERE activo = 1) as totalUsuarios, (SELECT COUNT(*) FROM p_Tareas WHERE activo = 1) as totalTareas", &[]).await;
    Json(rows.first().cloned().unwrap_or(serde_json::json!({}))).into_response()
}

// ==========================================
// ORGANIZACION (MISSING BEFORE)
// ==========================================

pub async fn organizacion_catalogo(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Organizacion_ObtenerCatalogo_rust",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

pub async fn organizacion_estructura_usuarios(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Organizacion_ObtenerEstructura_rust",
        &[],
    )
    .await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// CONFIGURATION
// ==========================================

pub async fn config_get(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
) -> impl IntoResponse {
    let id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(
        &mut client,
        "SELECT agendaConfig FROM p_UsuariosConfig WHERE idUsuario = @P1",
        &[&id],
    )
    .await;
    let cfg = rows
        .first()
        .and_then(|r| r.get("agendaConfig"))
        .and_then(|v| v.as_str())
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .unwrap_or(serde_json::json!({"showGestion": true}));
    (
        StatusCode::OK,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({ "vistaPreferida": "Cards", "rutinas": "[]", "agendaConfig": cfg }),
            200,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn config_post(
    user: AuthUser,
    State(state): State<ApiState>,
    OriginalUri(original_uri): OriginalUri,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let id = user.user_id() as i32;
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    if let Some(cfg) = body.get("agendaConfig") {
        let s = serde_json::to_string(cfg).unwrap_or_default();
        let _ = client.execute("IF EXISTS (SELECT 1 FROM p_UsuariosConfig WHERE idUsuario = @P1) UPDATE p_UsuariosConfig SET agendaConfig = @P2 WHERE idUsuario = @P1 ELSE INSERT INTO p_UsuariosConfig (idUsuario, agendaConfig) VALUES (@P1, @P2)", &[&id,&s]).await;
    }
    (
        StatusCode::CREATED,
        Json(crate::models::ApiResponse::success_with_status(
            serde_json::json!({"success": true}),
            201,
            original_uri.path(),
        )),
    )
        .into_response()
}

pub async fn agenda_recurrente(
    user: AuthUser,
    State(state): State<ApiState>,
    _q: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let c = user.carnet().to_string();
    let mut client = match state.pool.get().await {
        Ok(cl) => cl,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"message": e.to_string()})),
            )
                .into_response()
        }
    };
    let rows = exec_query_to_json(&mut client, "SELECT t.idTarea, t.nombre AS titulo FROM p_Tareas t WHERE t.creadorCarnet = @P1 AND t.comportamiento = 'RECURRENTE'", &[&c]).await;
    Json(crate::models::ApiResponse::success(rows)).into_response()
}

// ==========================================
// MODELS
// ==========================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckinUpsertRequest {
    pub id_usuario: Option<i32>,
    pub fecha: Option<String>,
    pub entregable_texto: Option<String>,
    pub nota: Option<String>,
    pub link_evidencia: Option<String>,
    pub id_nodo: Option<i32>,
    pub entrego: Option<Vec<i32>>,
    pub avanzo: Option<Vec<i32>>,
    pub extras: Option<Vec<i32>>,
    pub estado_animo: Option<String>,
    pub usuario_carnet: Option<String>,
    pub prioridad1: Option<String>,
    pub prioridad2: Option<String>,
    pub prioridad3: Option<String>,
    pub energia: Option<i32>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct CheckinTaskItem {
    #[serde(rename = "idTarea")]
    id_tarea: i32,
    tipo: &'static str,
}

#[derive(Debug, Clone, Copy)]
struct CheckinPersistOptions {
    auto_start_entrego: bool,
    registrar_agenda_audit: bool,
    default_entregable_texto: Option<&'static str>,
    default_estado_animo: Option<&'static str>,
    default_nota: Option<&'static str>,
}

fn checkins_normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|raw| {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_string())
        }
    })
}

fn checkins_parse_fecha(raw: Option<&str>) -> Result<chrono::NaiveDate, String> {
    match raw.map(str::trim).filter(|value| !value.is_empty()) {
        Some(value) => {
            let candidate = if value.len() >= 10 {
                &value[..10]
            } else {
                value
            };
            chrono::NaiveDate::parse_from_str(candidate, "%Y-%m-%d")
                .map_err(|_| "fecha must be a valid ISO 8601 date string".to_string())
        }
        None => Ok(chrono::Utc::now().date_naive()),
    }
}

fn checkins_collect_task_items(body: &CheckinUpsertRequest) -> Vec<CheckinTaskItem> {
    let mut items = Vec::new();

    if let Some(entrego) = &body.entrego {
        for id_tarea in entrego {
            if *id_tarea > 0 {
                items.push(CheckinTaskItem {
                    id_tarea: *id_tarea,
                    tipo: "Entrego",
                });
            }
        }
    }

    if let Some(avanzo) = &body.avanzo {
        for id_tarea in avanzo {
            if *id_tarea > 0 {
                items.push(CheckinTaskItem {
                    id_tarea: *id_tarea,
                    tipo: "Avanzo",
                });
            }
        }
    }

    if let Some(extras) = &body.extras {
        for id_tarea in extras {
            if *id_tarea > 0 {
                items.push(CheckinTaskItem {
                    id_tarea: *id_tarea,
                    tipo: "Extra",
                });
            }
        }
    }

    items
}

fn checkins_validate_clarity_request(body: &CheckinUpsertRequest) -> Vec<String> {
    let mut errors = Vec::new();

    if let Err(error) = checkins_parse_fecha(body.fecha.as_deref()) {
        errors.push(error);
    }

    match &body.entregable_texto {
        Some(value) if !value.trim().is_empty() => {}
        _ => errors.push("entregableTexto should not be empty".to_string()),
    }

    if let Some(estado_animo) = checkins_normalize_optional_text(body.estado_animo.clone()) {
        if !matches!(estado_animo.as_str(), "Tope" | "Bien" | "Bajo") {
            errors.push(
                "estadoAnimo must be one of the following values: Tope, Bien, Bajo".to_string(),
            );
        }
    }

    errors
}

fn checkins_validation_error_response(messages: Vec<String>, path: &str) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "statusCode": 400,
            "message": messages,
            "error": "Bad Request",
            "timestamp": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            "path": path,
        })),
    )
        .into_response()
}

async fn checkins_effective_user_carnet(
    state: &ApiState,
    user: &AuthUser,
) -> Result<String, String> {
    let carnet = user.carnet().trim();
    if !carnet.is_empty() && carnet != "UNKNOWN" {
        return Ok(carnet.to_string());
    }

    let mut client = state
        .pool
        .get()
        .await
        .map_err(|error| format!("Error de conexion BD: {}", error))?;

    Ok(exec_query_to_json(
        &mut client,
        "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
        &[&user.user_id_i32()],
    )
    .await
    .first()
    .and_then(|row| row.get("carnet"))
    .and_then(|value| value.as_str())
    .unwrap_or("")
    .trim()
    .to_string())
}

async fn checkins_persist(
    state: &ApiState,
    carnet: &str,
    body: &CheckinUpsertRequest,
    options: CheckinPersistOptions,
) -> Result<i32, String> {
    let fecha = checkins_parse_fecha(body.fecha.as_deref())?;
    let prioridad1 = checkins_normalize_optional_text(body.prioridad1.clone());
    let prioridad2 = checkins_normalize_optional_text(body.prioridad2.clone());
    let prioridad3 = checkins_normalize_optional_text(body.prioridad3.clone());
    let entregable_texto = checkins_normalize_optional_text(body.entregable_texto.clone())
        .or_else(|| options.default_entregable_texto.map(str::to_string));
    let nota = checkins_normalize_optional_text(body.nota.clone())
        .or_else(|| options.default_nota.map(str::to_string));
    let link_evidencia = checkins_normalize_optional_text(body.link_evidencia.clone());
    let estado_animo = checkins_normalize_optional_text(body.estado_animo.clone())
        .or_else(|| options.default_estado_animo.map(str::to_string));
    let tareas = checkins_collect_task_items(body);
    let tareas_json = serde_json::to_string(&tareas)
        .map_err(|error| format!("Error serializando tareas de checkin: {}", error))?;
    let auto_start_entrego = if options.auto_start_entrego {
        1i32
    } else {
        0i32
    };
    let registrar_agenda_audit = if options.registrar_agenda_audit {
        1i32
    } else {
        0i32
    };

    let mut client = state
        .pool
        .get()
        .await
        .map_err(|error| format!("Error de conexion BD: {}", error))?;

    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_Checkin_Upsert_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8, @P9, @P10, @P11, @P12, @P13, @P14",
        &[
            &carnet,
            &fecha,
            &prioridad1.as_deref(),
            &prioridad2.as_deref(),
            &prioridad3.as_deref(),
            &entregable_texto.as_deref(),
            &nota.as_deref(),
            &link_evidencia.as_deref(),
            &estado_animo.as_deref(),
            &body.energia,
            &body.id_nodo,
            &tareas_json.as_str(),
            &auto_start_entrego,
            &registrar_agenda_audit,
        ],
    )
    .await;

    rows.first()
        .and_then(|row| row.get("idCheckin"))
        .and_then(|value| value.as_i64())
        .map(|value| value as i32)
        .ok_or_else(|| "No se pudo persistir el checkin.".to_string())
}

#[derive(Deserialize)]
pub struct FocoCreateRequest {
    #[serde(rename = "idTarea")]
    pub id_tarea: i32,
    pub fecha: String,
    #[serde(rename = "esEstrategico")]
    pub es_estrategico: Option<bool>,
}

#[derive(Deserialize)]
pub struct FocoReordenarRequest {
    pub ids: Vec<i32>,
}

#[cfg(test)]
mod tests {
    use super::{
        checkins_collect_task_items, checkins_parse_fecha, checkins_validate_clarity_request,
        CheckinTaskItem, CheckinUpsertRequest,
    };

    #[test]
    fn checkins_collect_task_items_preserves_mobile_alias_order() {
        let request = CheckinUpsertRequest {
            id_usuario: None,
            fecha: Some("2026-03-27".to_string()),
            entregable_texto: Some("Cierre diario".to_string()),
            nota: None,
            link_evidencia: None,
            id_nodo: None,
            entrego: Some(vec![10, 11]),
            avanzo: Some(vec![12]),
            extras: Some(vec![13]),
            estado_animo: Some("Bien".to_string()),
            usuario_carnet: None,
            prioridad1: None,
            prioridad2: None,
            prioridad3: None,
            energia: None,
        };

        assert_eq!(
            checkins_collect_task_items(&request),
            vec![
                CheckinTaskItem {
                    id_tarea: 10,
                    tipo: "Entrego",
                },
                CheckinTaskItem {
                    id_tarea: 11,
                    tipo: "Entrego",
                },
                CheckinTaskItem {
                    id_tarea: 12,
                    tipo: "Avanzo",
                },
                CheckinTaskItem {
                    id_tarea: 13,
                    tipo: "Extra",
                },
            ]
        );
    }

    #[test]
    fn checkins_parse_fecha_accepts_iso_datetime_prefix() {
        let parsed = checkins_parse_fecha(Some("2026-03-27T15:01:02.000Z")).expect("fecha válida");
        assert_eq!(
            parsed,
            chrono::NaiveDate::from_ymd_opt(2026, 3, 27).expect("date")
        );
    }

    #[test]
    fn checkins_validate_clarity_request_matches_required_fields() {
        let request = CheckinUpsertRequest {
            id_usuario: None,
            fecha: Some("bad-date".to_string()),
            entregable_texto: Some("   ".to_string()),
            nota: None,
            link_evidencia: None,
            id_nodo: None,
            entrego: None,
            avanzo: None,
            extras: None,
            estado_animo: Some("Neutral".to_string()),
            usuario_carnet: None,
            prioridad1: None,
            prioridad2: None,
            prioridad3: None,
            energia: None,
        };

        let errors = checkins_validate_clarity_request(&request);
        assert!(errors.contains(&"fecha must be a valid ISO 8601 date string".to_string()));
        assert!(errors.contains(&"entregableTexto should not be empty".to_string()));
        assert!(errors.contains(
            &"estadoAnimo must be one of the following values: Tope, Bien, Bajo".to_string()
        ));
    }
}
