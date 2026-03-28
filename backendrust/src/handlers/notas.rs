#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use std::collections::HashMap;

use crate::state::ApiState;

type SqlConnection<'a> = bb8::PooledConnection<'a, bb8_tiberius::ConnectionManager>;

fn notas_json_value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => String::new(),
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        other => other.to_string(),
    }
}

async fn notas_effective_carnet(
    client: &mut SqlConnection<'_>,
    user: &crate::auth::AuthUser,
) -> String {
    let carnet = user.carnet().trim();
    if !carnet.is_empty() && carnet != "UNKNOWN" {
        return carnet.to_string();
    }

    let rows = crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT carnet FROM p_Usuarios WHERE idUsuario = @P1 AND activo = 1",
        &[&user.user_id_i32()],
    )
    .await;

    rows.first()
        .and_then(|row| row.get("carnet"))
        .and_then(|value| value.as_str())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| user.carnet().to_string())
}

async fn notas_owner_carnet(client: &mut SqlConnection<'_>, id_nota: i32) -> Option<String> {
    let rows = crate::handlers::equipo::exec_query_to_json(
        client,
        "SELECT TOP 1 carnet FROM p_Notas WHERE idNota = @P1",
        &[&id_nota],
    )
    .await;

    rows.first()
        .and_then(|row| row.get("carnet"))
        .and_then(|value| value.as_str())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn notas_forbidden(message: &str) -> Response {
    (
        StatusCode::FORBIDDEN,
        Json(crate::models::ApiResponse::error(message.to_string(), 403)),
    )
        .into_response()
}

pub async fn notas_list(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    _query_params: axum::extract::Query<HashMap<String, String>>,
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

    let carnet = notas_effective_carnet(&mut client, &user).await;
    let rows = crate::handlers::equipo::exec_sp_to_json(
        &mut client,
        "EXEC sp_Notas_Obtener @P1",
        &[&carnet],
    )
    .await;

    let notas: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|row| {
            let id = row
                .get("idNota")
                .map(notas_json_value_to_string)
                .unwrap_or_default();
            let title = row
                .get("titulo")
                .or_else(|| row.get("title"))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            let content = row
                .get("contenido")
                .or_else(|| row.get("content"))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .to_string();
            let date = row
                .get("fechaModificacion")
                .or_else(|| row.get("fechaActualizacion"))
                .or_else(|| row.get("fechaCreacion"))
                .cloned()
                .unwrap_or(serde_json::Value::Null);
            let project_id = row
                .get("idProyecto")
                .cloned()
                .unwrap_or(serde_json::Value::Null);

            serde_json::json!({
                "id": id,
                "title": title,
                "content": content,
                "date": date,
                "status": "saved",
                "projectId": project_id
            })
        })
        .collect();

    Json(crate::models::ApiResponse::success(notas)).into_response()
}

pub async fn notas_create(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<serde_json::Value>,
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

    let carnet = notas_effective_carnet(&mut client, &user).await;
    let title = body
        .get("title")
        .or_else(|| body.get("titulo"))
        .and_then(|value| value.as_str())
        .unwrap_or("Sin titulo");
    let content = body
        .get("content")
        .or_else(|| body.get("contenido"))
        .and_then(|value| value.as_str())
        .unwrap_or("");

    match client
        .execute(
            "EXEC sp_Nota_Crear @P1, @P2, @P3",
            &[&carnet, &title, &content],
        )
        .await
    {
        Ok(_) => (
            StatusCode::CREATED,
            Json(crate::models::ApiResponse::success(serde_json::json!({
                "success": true
            }))),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    }
}

pub async fn notas_update(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
    Json(body): Json<serde_json::Value>,
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

    let carnet = notas_effective_carnet(&mut client, &user).await;
    if let Some(owner_carnet) = notas_owner_carnet(&mut client, id).await {
        if owner_carnet != carnet {
            return notas_forbidden("No puedes editar notas de otro usuario.");
        }
    }

    let title = body
        .get("title")
        .or_else(|| body.get("titulo"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
    let content = body
        .get("content")
        .or_else(|| body.get("contenido"))
        .and_then(|value| value.as_str())
        .unwrap_or("");

    match client
        .execute(
            "EXEC sp_Nota_Actualizar @P1, @P2, @P3",
            &[&id, &title, &content],
        )
        .await
    {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true
        })))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    }
}

pub async fn notas_delete(
    user: crate::auth::AuthUser,
    State(state): State<ApiState>,
    Path(id): Path<i32>,
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

    let carnet = notas_effective_carnet(&mut client, &user).await;
    if let Some(owner_carnet) = notas_owner_carnet(&mut client, id).await {
        if owner_carnet != carnet {
            return notas_forbidden("No puedes eliminar notas de otro usuario.");
        }
    }

    match client.execute("EXEC sp_Nota_Eliminar @P1", &[&id]).await {
        Ok(_) => Json(crate::models::ApiResponse::success(serde_json::json!({
            "success": true
        })))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(crate::models::ApiResponse::error(e.to_string(), 500)),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn notas_json_value_to_string_handles_scalars() {
        assert_eq!(notas_json_value_to_string(&serde_json::Value::Null), "");
        assert_eq!(notas_json_value_to_string(&json!(12)), "12");
        assert_eq!(notas_json_value_to_string(&json!(true)), "true");
        assert_eq!(notas_json_value_to_string(&json!("abc")), "abc");
    }
}
