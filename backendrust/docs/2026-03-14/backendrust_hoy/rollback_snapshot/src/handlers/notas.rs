#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::collections::HashMap;

use crate::state::ApiState;

pub async fn notas_list(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    query_params: axum::extract::Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let carnet = query_params
        .get("carnet")
        .cloned()
        .unwrap_or_else(|| user.carnet().to_string());

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let response = match client.query(
        "SELECT idNota, carnet, titulo, content, fechaCreacion, fechaActualizacion FROM p_Notas WHERE carnet = @P1 ORDER BY fechaActualizacion DESC",
        &[&carnet],
    ).await {
        Ok(stream) => {
            match stream.into_first_result().await {
                Ok(rows) => {
                    let notas: Vec<serde_json::Value> = rows.into_iter().map(|r| {
                        serde_json::json!({
                            "idNota": r.get::<i32, _>("idNota").unwrap_or(0),
                            "carnet": r.get::<&str, _>("carnet").unwrap_or(""),
                            "titulo": r.get::<&str, _>("titulo").unwrap_or(""),
                            "content": r.get::<&str, _>("content").unwrap_or(""),
                            "fechaCreacion": r.get::<chrono::NaiveDateTime, _>("fechaCreacion").map(|d| d.to_string()),
                            "fechaActualizacion": r.get::<chrono::NaiveDateTime, _>("fechaActualizacion").map(|d| d.to_string()),
                        })
                    }).collect();
                    Json(serde_json::json!(notas)).into_response()
                }
                Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
            }
        }
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    response
}

pub async fn notas_create(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let carnet = body
        .get("carnet")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| user.carnet().to_string());
    let titulo = body
        .get("titulo")
        .and_then(|v| v.as_str())
        .unwrap_or("Sin tÃ­tulo");
    let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("");

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

    let response = match client.query(
        "INSERT INTO p_Notas (carnet, titulo, content, fechaCreacion, fechaActualizacion) VALUES (@P1, @P2, @P3, GETDATE(), GETDATE()); SELECT SCOPE_IDENTITY() as idNota",
        &[&carnet.as_str(), &titulo, &content],
    ).await {
        Ok(stream) => {
            match stream.into_first_result().await {
                Ok(rows) => {
                    let id: f64 = rows.into_iter().next().and_then(|r| {
                        r.try_get::<f64, _>("idNota").ok().flatten()
                            .or_else(|| r.try_get::<i32, _>("idNota").ok().flatten().map(|v| v as f64))
                    }).unwrap_or(0.0);
                    Json(serde_json::json!({
                        "idNota": id as i64,
                        "carnet": carnet,
                        "titulo": titulo,
                        "content": content,
                    })).into_response()
                }
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
            }
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))).into_response(),
    };
    response
}

pub async fn notas_update(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    let titulo = body.get("titulo").and_then(|v| v.as_str()).unwrap_or("");
    let content = body.get("content").and_then(|v| v.as_str()).unwrap_or("");

    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let response = match client.execute(
        "UPDATE p_Notas SET titulo = @P1, content = @P2, fechaActualizacion = GETDATE() WHERE idNota = @P3",
        &[&titulo, &content, &id],
    ).await {
        Ok(_) => Json(serde_json::json!({"success": true, "idNota": id})).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    response
}

pub async fn notas_delete(
    _user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };

    let response = match client
        .execute("DELETE FROM p_Notas WHERE idNota = @P1", &[&id])
        .await
    {
        Ok(_) => Json(serde_json::json!({"success": true})).into_response(),
        Err(e) => Json(serde_json::json!({"error": e.to_string()})).into_response(),
    };
    response
}


