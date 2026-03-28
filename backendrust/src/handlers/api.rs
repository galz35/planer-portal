#![allow(dead_code)]
use axum::Json;

use crate::models::*;

pub async fn api_root() -> Json<ApiRootResponse<'static>> {
    Json(ApiRootResponse {
        message: "Hello World!",
        source: "backendrust",
    })
}

pub async fn api_seed() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": false,
        "message": "Seed service deshabilitado en Rust. Usar SQL manual."
    }))
}
