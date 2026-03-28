#![allow(dead_code)]
use axum::{
    extract::{Path, State},
    http::Method,
    response::IntoResponse,
    Json,
};

use crate::models::*;
use crate::state::ApiState;

pub async fn endpoint_proxy(
    State(state): State<ApiState>,
    method: Method,
    Path(tail): Path<String>,
) -> impl IntoResponse {
    let normalized = format!("/{}", tail.trim_start_matches('/'));
    let method_name = method.to_string();
    let exists = state.route_matcher.exists(&method_name, &normalized);

    (
        axum::http::StatusCode::NOT_IMPLEMENTED,
        Json(NotImplementedPayload {
            status: "not_implemented",
            message: "Endpoint pendiente de migraciÃ³n funcional desde NestJS a Rust",
            method: method_name,
            path: normalized,
            exists_in_nestjs: exists,
        }),
    )
}
