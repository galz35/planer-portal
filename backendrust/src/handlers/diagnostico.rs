#![allow(dead_code)]
use axum::{extract::State, response::IntoResponse, Json};
use chrono::Utc;
use serde::Serialize;

use crate::auth::AuthUser;
use crate::state::ApiState;

pub async fn diagnostico_contexto(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> Json<DiagnosticoContexto> {
    Json(DiagnosticoContexto {
        context: DiagnosticoContextData {
            db: "SQL Server",
            server: std::env::var("DB_HOST").unwrap_or_else(|_| "not-configured".to_string()),
            schema: "dbo",
            note: "contexto parcial en Rust; query SQL directa pendiente",
            timestamp_utc: Utc::now().to_rfc3339(),
        },
        process_id: std::process::id(),
        uptime_seconds: state.boot_time.elapsed().as_secs(),
        node_env: std::env::var("NODE_ENV").unwrap_or_else(|_| "development".to_string()),
        engine: "rust-axum",
    })
}

pub async fn diagnostico_ping(_user: AuthUser, State(state): State<ApiState>) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"success": false, "db": "SQL Server", "error": e.to_string(), "timestamp": Utc::now().to_rfc3339()})).into_response(),
    };

    let response = match client.query("SELECT 1 AS ok", &[]).await {
        Ok(stream) => {
            match stream.into_first_result().await {
                Ok(rows) => {
                    let ok_val: i32 = rows.into_iter().next().and_then(|r| r.get("ok")).unwrap_or(0);
                    Json(serde_json::json!({
                        "success": true,
                        "db": "SQL Server",
                        "resultado": {"ok": ok_val},
                        "timestamp": Utc::now().to_rfc3339(),
                    })).into_response()
                }
                Err(e) => Json(serde_json::json!({"success": false, "error": e.to_string(), "timestamp": Utc::now().to_rfc3339()})).into_response(),
            }
        }
        Err(e) => Json(serde_json::json!({"success": false, "error": e.to_string(), "timestamp": Utc::now().to_rfc3339()})).into_response(),
    };
    response
}

pub async fn diagnostico_stats(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => return Json(serde_json::json!({"success": false, "error": e.to_string(), "timestamp": Utc::now().to_rfc3339()})).into_response(),
    };

    let mut stats = serde_json::Map::new();
    let tablas = [
        "p_Usuarios",
        "p_Proyectos",
        "p_Tareas",
        "p_Checkins",
        "p_Bloqueos",
    ];

    for tabla in tablas {
        let query = format!("SELECT COUNT(*) as cnt FROM {}", tabla);
        let cnt: i32 = match client.query(query.as_str(), &[]).await {
            Ok(stream) => match stream.into_first_result().await {
                Ok(rows) => rows
                    .into_iter()
                    .next()
                    .and_then(|r| r.get("cnt"))
                    .unwrap_or(0),
                Err(_) => 0,
            },
            Err(_) => 0,
        };
        stats.insert(tabla.to_string(), serde_json::json!(cnt));
    }

    Json(serde_json::json!({
        "success": true,
        "stats": stats,
        "timestamp": Utc::now().to_rfc3339(),
    }))
    .into_response()
}

pub async fn diagnostico_test_id_creador(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return Json(serde_json::json!({"success": false, "error": e.to_string()}))
                .into_response()
        }
    };

    let response = match client
        .query("SELECT TOP 1 idTarea, nombre, idCreador FROM p_Tareas", &[])
        .await
    {
        Ok(stream) => match stream.into_first_result().await {
            Ok(rows) => {
                let data: Vec<serde_json::Value> = rows
                    .into_iter()
                    .map(|r| {
                        serde_json::json!({
                            "idTarea": r.get::<i32, _>("idTarea").unwrap_or(0),
                            "nombre": r.get::<&str, _>("nombre").unwrap_or(""),
                            "idCreador": r.get::<i32, _>("idCreador").unwrap_or(0),
                        })
                    })
                    .collect();
                Json(serde_json::json!({"success": true, "data": data})).into_response()
            }
            Err(e) => {
                Json(serde_json::json!({"success": false, "error": e.to_string()})).into_response()
            }
        },
        Err(e) => {
            Json(serde_json::json!({"success": false, "error": e.to_string()})).into_response()
        }
    };
    response
}

pub async fn diagnostico_test_tarea(
    _user: AuthUser,
    State(state): State<ApiState>,
) -> impl IntoResponse {
    let mut client = match state.pool.get().await {
        Ok(c) => c,
        Err(e) => {
            return Json(serde_json::json!({"success": false, "error": e.to_string()}))
                .into_response()
        }
    };

    let test_name = format!("Test Diagnostico Rust {}", Utc::now().timestamp());
    let response = match client.query(
        "EXEC sp_Tarea_Crear_rust @P1, @P2, NULL, NULL, 'Pendiente', 'Media', NULL, 'Administrativa', NULL, NULL, 0, 0",
        &[&test_name.as_str(), &1i32],
    ).await {
        Ok(stream) => {
            match stream.into_first_result().await {
                Ok(rows) => {
                    let id_tarea: i32 = rows.into_iter().next().and_then(|r| r.get("idTarea")).unwrap_or(0);
                    Json(serde_json::json!({
                        "success": true,
                        "message": "Tarea creada via SP",
                        "idTarea": id_tarea,
                    })).into_response()
                }
                Err(e) => Json(serde_json::json!({"success": false, "error": e.to_string()})).into_response(),
            }
        }
        Err(e) => Json(serde_json::json!({"success": false, "error": e.to_string()})).into_response(),
    };
    response
}

// ----- MODELS -----

#[derive(Serialize)]
pub struct DiagnosticoContexto {
    pub context: DiagnosticoContextData,
    pub process_id: u32,
    pub uptime_seconds: u64,
    pub node_env: String,
    pub engine: &'static str,
}

#[derive(Serialize)]
pub struct DiagnosticoContextData {
    pub db: &'static str,
    pub server: String,
    pub schema: &'static str,
    pub note: &'static str,
    pub timestamp_utc: String,
}

#[derive(Serialize)]
pub struct DiagnosticoPing {
    pub success: bool,
    pub db: &'static str,
    pub resultado: DiagnosticoPingResult,
    pub timestamp: String,
    pub note: &'static str,
}

#[derive(Serialize)]
pub struct DiagnosticoPingResult {
    pub ok: u8,
}

#[derive(Serialize)]
pub struct DiagnosticoStats {
    pub success: bool,
    pub stats: DiagnosticoStatsData,
    pub timestamp: String,
    pub note: &'static str,
}

#[derive(Serialize)]
pub struct DiagnosticoStatsData {
    pub p_usuarios: u64,
    pub p_proyectos: u64,
    pub p_tareas: u64,
    pub p_checkins: u64,
    pub p_bloqueos: u64,
}

#[derive(Serialize)]
pub struct TestIdCreadorResponse {
    pub success: bool,
    pub data: Vec<TestIdCreadorRow>,
    pub note: &'static str,
}

#[derive(Serialize)]
pub struct TestIdCreadorRow {
    #[serde(rename = "idTarea")]
    pub id_tarea: u64,
    pub nombre: &'static str,
    #[serde(rename = "idCreador")]
    pub id_creador: u64,
}

#[derive(Serialize)]
pub struct TestTareaResponse {
    pub success: bool,
    pub message: &'static str,
    #[serde(rename = "idTarea")]
    pub id_tarea: u64,
    pub note: &'static str,
}
