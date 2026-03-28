use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    body::Body,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use tokio::sync::Mutex;

#[derive(Clone)]
struct AttemptRecord {
    count: u32,
    first_attempt: Instant,
}

#[derive(Clone)]
pub struct RateLimiter {
    attempts: Arc<Mutex<HashMap<String, AttemptRecord>>>,
    max_attempts: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_attempts: u32, window_secs: u64) -> Self {
        Self {
            attempts: Arc::new(Mutex::new(HashMap::new())),
            max_attempts,
            window: Duration::from_secs(window_secs),
        }
    }

    pub async fn check_and_increment(&self, key: &str) -> Result<u32, u64> {
        let mut map = self.attempts.lock().await;
        let now = Instant::now();

        map.retain(|_, value| now.duration_since(value.first_attempt) < self.window);

        match map.get_mut(key) {
            Some(record) => {
                if now.duration_since(record.first_attempt) >= self.window {
                    record.count = 1;
                    record.first_attempt = now;
                    Ok(self.max_attempts - 1)
                } else if record.count >= self.max_attempts {
                    let remaining = self.window - now.duration_since(record.first_attempt);
                    Err(remaining.as_secs())
                } else {
                    record.count += 1;
                    Ok(self.max_attempts - record.count)
                }
            }
            None => {
                map.insert(
                    key.to_string(),
                    AttemptRecord {
                        count: 1,
                        first_attempt: now,
                    },
                );
                Ok(self.max_attempts - 1)
            }
        }
    }

    pub async fn reset(&self, key: &str) {
        let mut map = self.attempts.lock().await;
        map.remove(key);
    }
}

fn extract_bearer_token(req: &Request<Body>) -> Option<String> {
    req.headers()
        .get("Authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|header| {
            header
                .strip_prefix("Bearer ")
                .or_else(|| header.strip_prefix("bearer "))
        })
        .map(|token| token.to_string())
}

fn extract_jwt_secret(req: &Request<Body>) -> Result<String, Response> {
    req.extensions()
        .get::<crate::auth::JwtSecret>()
        .map(|secret| secret.0.clone())
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(crate::models::ApiResponse::error(
                    "JWT secret no configurado".to_string(),
                    500,
                )),
            )
                .into_response()
        })
}

fn decode_claims(token: &str, jwt_secret: &str) -> Result<crate::auth::Claims, Response> {
    let key = jsonwebtoken::DecodingKey::from_secret(jwt_secret.as_bytes());
    let mut validation = jsonwebtoken::Validation::new(jsonwebtoken::Algorithm::HS256);
    validation.validate_exp = true;

    jsonwebtoken::decode::<crate::auth::Claims>(token, &key, &validation)
        .map(|token_data| token_data.claims)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(crate::models::ApiResponse::error(
                    "Token invalido o expirado".to_string(),
                    401,
                )),
            )
                .into_response()
        })
}

pub async fn require_admin(req: Request<Body>, next: Next) -> Response {
    let Some(token) = extract_bearer_token(&req) else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(crate::models::ApiResponse::error(
                "Token de autenticacion requerido para endpoints de administracion".to_string(),
                401,
            )),
        )
            .into_response();
    };

    let jwt_secret = match extract_jwt_secret(&req) {
        Ok(secret) => secret,
        Err(response) => return response,
    };

    let claims = match decode_claims(&token, &jwt_secret) {
        Ok(claims) => claims,
        Err(response) => return response,
    };

    let rol = claims.rol.as_deref().unwrap_or("").to_uppercase();
    let is_admin = matches!(
        rol.as_str(),
        "ADMIN" | "SUPERADMIN" | "SUPERVISOR" | "GERENTE"
    );

    if !is_admin {
        return (
            StatusCode::FORBIDDEN,
            Json(crate::models::ApiResponse::error(
                "Acceso denegado. Se requiere rol de administrador.".to_string(),
                403,
            )),
        )
            .into_response();
    }

    next.run(req).await
}

pub async fn require_auth(req: Request<Body>, next: Next) -> Response {
    let Some(token) = extract_bearer_token(&req) else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(crate::models::ApiResponse::error(
                "Token de autenticacion requerido".to_string(),
                401,
            )),
        )
            .into_response();
    };

    let jwt_secret = match extract_jwt_secret(&req) {
        Ok(secret) => secret,
        Err(response) => return response,
    };

    if let Err(response) = decode_claims(&token, &jwt_secret) {
        return response;
    }

    next.run(req).await
}

pub fn login_rate_limiter() -> RateLimiter {
    RateLimiter::new(5, 15 * 60)
}
