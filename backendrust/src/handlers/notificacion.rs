use crate::auth::AuthUser;
use crate::handlers::equipo::exec_sp_to_json;
use crate::services::notification::PushPayload;
use crate::state::ApiState;
use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct DeviceTokenRequest {
    pub token: String,
    pub platform: Option<String>,
}

pub async fn notificacion_registrar_token(
    user: AuthUser,
    State(state): State<ApiState>,
    Json(body): Json<DeviceTokenRequest>,
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

    let user_id = user.user_id() as i32;
    let platform = body.platform.unwrap_or_else(|| "android".to_string());

    let _ = exec_sp_to_json(
        &mut client,
        "EXEC sp_Dispositivos_Registrar_rust @P1, @P2, @P3",
        &[&user_id, &body.token, &platform],
    )
    .await;

    Json(serde_json::json!({"success": true})).into_response()
}

pub async fn notificacion_status(
    user: AuthUser,
    State(state): State<ApiState>,
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

    let user_id = user.user_id() as i32;
    let tokens_res = exec_sp_to_json(
        &mut client,
        "EXEC sp_Dispositivos_ObtenerPorUsuario_rust @P1",
        &[&user_id],
    )
    .await;

    let tokens: Vec<String> = tokens_res
        .iter()
        .filter_map(|v| v["tokenFCM"].as_str().map(|s| s.to_string()))
        .collect();

    Json(crate::models::ApiResponse::success(serde_json::json!({
        "firebase": {
            "inicializado": true,
            "proyecto": "planner-ef-4772a"
        },
        "email": {
            "configurado": true,
            "remitente": "rrrhh1930@gmail.com"
        },
        "tuDispositivo": {
            "tokensRegistrados": tokens.len(),
            "tokens": tokens.iter().map(|t| if t.len() > 15 { format!("{}...", &t[..15]) } else { t.clone() }).collect::<Vec<_>>()
        },
        "idUsuario": user_id
    }))).into_response()
}

pub async fn notificacion_test_push(
    user: AuthUser,
    State(state): State<ApiState>,
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

    let user_id = user.user_id() as i32;
    let tokens_res = exec_sp_to_json(
        &mut client,
        "EXEC sp_Dispositivos_ObtenerPorUsuario_rust @P1",
        &[&user_id],
    )
    .await;

    let tokens: Vec<String> = tokens_res
        .iter()
        .filter_map(|v| v["tokenFCM"].as_str().map(|s| s.to_string()))
        .collect();

    if tokens.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"success": false, "message": "No tienes tokens registrados"})),
        )
            .into_response();
    }

    let payload = PushPayload {
        tokens,
        title: "Test de NotificaciÃ³n ðŸš€".to_string(),
        body: "Si recibes esto, el backend en Rust estÃ¡ enviando notificaciones correctamente."
            .to_string(),
        data: Some(serde_json::json!({
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
            "id": "test_123"
        })),
    };

    match state.notification_service.send_push(payload).await {
        Ok(_) => Json(serde_json::json!({"success": true, "message": "Push enviado con Ã©xito"}))
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn notificacion_test_email(
    user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let email_to = user.correo(); // Usar correo real de claims

    let html = format!(
        "<h1>Prueba de Email desde Rust</h1><p>Hola {}, esto es una prueba del sistema de notificaciones.</p>",
        user.carnet()
    );

    match state
        .notification_service
        .send_email(email_to, "Test Email Rust ðŸ¦€", html, None)
        .await
    {
        Ok(_) => Json(serde_json::json!({"success": true, "message": "Email enviado con Ã©xito"}))
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn notificacion_test_email_public(State(state): State<ApiState>) -> impl IntoResponse {
    let email_to = "gustavo.lira@claroni.com";
    let html =
        "<h1>Prueba PÃºblica Rust</h1><p>Este email fue enviado desde un endpoint pÃºblico.</p>"
            .to_string();

    match state
        .notification_service
        .send_email(email_to, "Public Test Rust ðŸ¦€", html, None)
        .await
    {
        Ok(_) => Json(serde_json::json!({"success": true, "message": "Email pÃºblico enviado"}))
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "error": e.to_string()})),
        )
            .into_response(),
    }
}

pub async fn notificacion_test_overdue(State(state): State<ApiState>) -> impl IntoResponse {
    let email_to = "gustavo.lira@claroni.com";

    let mut context = tera::Context::new();
    context.insert("nombre", "Gustavo Lira");
    context.insert("totalAtrasadas", &3);

    let tareas = vec![
        serde_json::json!({
            "titulo": "Implementar Rust Templates",
            "proyecto": "MigraciÃ³n Backend",
            "creador": "Sistema",
            "asignado": "Gustavo Lira",
            "diasAtraso": 1,
            "fechaLimite": "2024-05-20"
        }),
        serde_json::json!({
            "titulo": "Consolidar SQL Inline",
            "proyecto": "MigraciÃ³n Backend",
            "creador": "Admin",
            "asignado": "Gustavo Lira",
            "diasAtraso": 2,
            "fechaLimite": "2024-05-19"
        }),
    ];
    context.insert("tareas", &tareas);
    context.insert("enlace", "https://planner.claroni.com/tareas/atrasadas");

    match state
        .notification_service
        .send_templated_email(
            email_to,
            "âš  Reporte de Atrasos Rust ðŸ¦€",
            "tareas_atrasadas.html",
            &context,
            None,
        )
        .await
    {
        Ok(_) => Json(
            serde_json::json!({"success": true, "message": "Email de atraso (templado) enviado"}),
        )
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"success": false, "error": e.to_string()})),
        )
            .into_response(),
    }
}
