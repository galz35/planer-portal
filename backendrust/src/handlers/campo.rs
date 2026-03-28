use crate::auth::AuthUser;
use crate::handlers::equipo::exec_sp_to_json;
use crate::state::ApiState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;

// Models for requests
#[derive(Deserialize)]
pub struct RecPuntoRequest {
    pub lat: f64,
    pub lon: f64,
    pub accuracy: Option<f64>,
    #[serde(rename = "velocidad_kmh")]
    pub velocidad_kmh: Option<f64>,
    #[serde(rename = "tipo")]
    pub tipo: Option<String>,
    #[serde(rename = "id_cliente")]
    pub id_cliente: Option<i32>,
    pub notas: Option<String>,
}

#[derive(Deserialize)]
pub struct RecBatchRequest {
    pub puntos: Vec<RecPuntoRequest>,
}

#[derive(Deserialize)]
pub struct RecIniciarRequest {
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

#[derive(Deserialize)]
pub struct RecFinalizarRequest {
    pub lat: Option<f64>,
    pub lon: Option<f64>,
    pub notas: Option<String>,
}

// Handlers
pub async fn rec_iniciar(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<RecIniciarRequest>,
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
    let carnet = user.carnet();
    let res = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_iniciar_recorrido_rust @P1, @P2, @P3",
        &[&carnet, &body.lat, &body.lon],
    )
    .await;
    Json(
        res.first()
            .cloned()
            .unwrap_or(serde_json::json!({"estado": "ERROR", "mensaje": "Sin resultado"})),
    )
    .into_response()
}

pub async fn rec_finalizar(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<RecFinalizarRequest>,
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
    let carnet = user.carnet();
    let res = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_finalizar_recorrido_rust @P1, @P2, @P3, @P4",
        &[&carnet, &body.lat, &body.lon, &body.notas],
    )
    .await;
    Json(
        res.first()
            .cloned()
            .unwrap_or(serde_json::json!({"estado": "ERROR", "mensaje": "Sin resultado"})),
    )
    .into_response()
}

pub async fn rec_registrar_punto(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<RecPuntoRequest>,
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
    let carnet = user.carnet();
    let res = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_registrar_punto_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8",
        &[
            &carnet,
            &body.lat,
            &body.lon,
            &body.accuracy,
            &body.velocidad_kmh,
            &body.tipo,
            &body.id_cliente,
            &body.notas,
        ],
    )
    .await;
    Json(
        res.first()
            .cloned()
            .unwrap_or(serde_json::json!({"ok": false})),
    )
    .into_response()
}

pub async fn rec_registrar_batch(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<RecBatchRequest>,
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
    let carnet = user.carnet();
    let mut insertados = 0;
    for p in &body.puntos {
        let res = exec_sp_to_json(
            &mut client,
            "EXEC sp_campo_registrar_punto_rust @P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8",
            &[
                &carnet,
                &p.lat,
                &p.lon,
                &p.accuracy,
                &p.velocidad_kmh,
                &p.tipo,
                &p.id_cliente,
                &p.notas,
            ],
        )
        .await;
        if res
            .first()
            .and_then(|v| v.get("ok"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
        {
            insertados += 1;
        }
    }
    Json(serde_json::json!({"insertados": insertados, "total": body.puntos.len()})).into_response()
}

pub async fn rec_get_activo(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
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
    let carnet = user.carnet();
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_recorrido_activo_rust @P1",
        &[&carnet],
    )
    .await;
    Json(rows.first().cloned().unwrap_or(serde_json::Value::Null)).into_response()
}

pub async fn rec_get_puntos(
    _user: AuthUser,
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
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_recorrido_puntos_rust @P1",
        &[&id],
    )
    .await;
    Json(rows).into_response()
}

pub async fn rec_get_historial(user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
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
    let carnet = user.carnet();
    let rows = exec_sp_to_json(
        &mut client,
        "EXEC sp_campo_recorrido_historial_rust @P1",
        &[&carnet],
    )
    .await;
    Json(rows).into_response()
}

pub async fn rec_admin_get(
    _user: AuthUser,
    State(state): State<ApiState>,
    Query(params): Query<HashMap<String, String>>,
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
    let fecha = params
        .get("fecha")
        .cloned()
        .unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());
    let rows = match crate::handlers::equipo::exec_sp_to_json_result(
        &mut client,
        "EXEC sp_campo_admin_recorridos_rust @P1",
        &[&fecha],
    )
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e})),
            )
                .into_response()
        }
    };
    Json(rows).into_response()
}
