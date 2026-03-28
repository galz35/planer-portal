#![allow(dead_code)]
use axum::{http::StatusCode, Json};

pub fn generic_not_implemented(method: &'static str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "success": false,
            "status": "not_implemented",
            "method": method,
            "message": "Ruta con paridad HTTP, pero lÃ³gica de negocio pendiente de migrar"
        })),
    )
}
