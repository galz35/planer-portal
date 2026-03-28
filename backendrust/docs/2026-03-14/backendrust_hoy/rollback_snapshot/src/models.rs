#![allow(dead_code)]
use crate::migration::{ControllerProgress, ModuleProgress};
use serde::Serialize;

#[derive(Serialize)]
pub struct NotImplementedPayload<'a> {
    pub status: &'a str,
    pub message: &'a str,
    pub method: String,
    pub path: String,
    pub exists_in_nestjs: bool,
}
#[derive(Serialize)]
pub struct ApiRootResponse<'a> {
    pub message: &'a str,
    pub source: &'a str,
}
#[derive(Serialize)]
pub struct MigrationBreakdown {
    pub controllers: Vec<ControllerProgress>,
    pub modules: Vec<ModuleProgress>,
}

#[derive(Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    #[serde(rename = "errorCode", skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(rename = "statusCode")]
    pub status_code: u16,
    pub timestamp: String,
    pub path: String,
}
impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
            error_code: None,
            status_code: 200,
            timestamp: chrono::Utc::now().to_rfc3339(),
            path: "".to_string(),
        }
    }
}

impl ApiResponse<serde_json::Value> {
    pub fn error(message: String, code: u16) -> Self {
        Self::error_with_code(message, code, error_code_from_status(code).to_string())
    }

    pub fn error_with_code(message: String, code: u16, error_code: String) -> Self {
        Self {
            success: false,
            data: None,
            message: Some(message),
            error_code: Some(error_code),
            status_code: code,
            timestamp: chrono::Utc::now().to_rfc3339(),
            path: "".to_string(),
        }
    }
}

fn error_code_from_status(status: u16) -> &'static str {
    match status {
        400 => "BAD_REQUEST",
        401 => "UNAUTHORIZED",
        403 => "FORBIDDEN",
        404 => "NOT_FOUND",
        409 => "CONFLICT",
        422 => "UNPROCESSABLE_ENTITY",
        429 => "TOO_MANY_REQUESTS",
        500 => "INTERNAL_ERROR",
        _ => "UNKNOWN_ERROR",
    }
}
