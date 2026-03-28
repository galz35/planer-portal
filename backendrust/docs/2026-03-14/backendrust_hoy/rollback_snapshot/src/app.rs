use std::time::Instant;

use anyhow::ensure;
use crate::config::AppConfig;
use crate::db::Pool;
use axum::{routing::get, Json, Router};
use chrono::Utc;
use serde::Serialize;
use tower_http::cors::CorsLayer;

use crate::{migration, router};

#[derive(Serialize)]
struct HealthResponse {
    service: &'static str,
    status: &'static str,
    timestamp_utc: String,
    total_endpoints_nest: usize,
    implemented_endpoints_rust: usize,
    progress_percent: usize,
}

pub fn build_router(pool: Pool, cfg: &AppConfig) -> anyhow::Result<Router> {
    ensure!(
        cfg.jwt_secret
            .as_ref()
            .map(|secret| !secret.trim().is_empty())
            .unwrap_or(false),
        "JWT_SECRET no configurado"
    );

    let manifest = migration::load_manifest()?;
    let snapshot = migration::progress(&manifest);
    let boot_time = Instant::now();

    let allowed_origins = [
        "https://www.rhclaroni.com",
        "https://rhclaroni.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ];
    let cors = CorsLayer::new()
        .allow_origin(
            allowed_origins
                .iter()
                .filter_map(|o| o.parse::<axum::http::HeaderValue>().ok())
                .collect::<Vec<_>>(),
        )
        .allow_methods([
            axum::http::Method::GET,
            axum::http::Method::POST,
            axum::http::Method::PUT,
            axum::http::Method::PATCH,
            axum::http::Method::DELETE,
            axum::http::Method::OPTIONS,
        ])
        .allow_headers([
            axum::http::header::AUTHORIZATION,
            axum::http::header::CONTENT_TYPE,
            axum::http::header::ACCEPT,
        ])
        .allow_credentials(true);

    use tower_http::compression::CompressionLayer;
    use tower_http::timeout::TimeoutLayer;
    use tower_http::trace::TraceLayer;
    use std::time::Duration;

    let app = Router::new()
        .route(
            "/health",
            get(move || async move {
                Json(HealthResponse {
                    service: "backendrust",
                    status: "ok",
                    timestamp_utc: Utc::now().to_rfc3339(),
                    total_endpoints_nest: snapshot.total_endpoints,
                    implemented_endpoints_rust: snapshot.implemented_endpoints,
                    progress_percent: snapshot.progress_percent,
                })
            }),
        )
        .nest(
            "/api",
            router::api_router(manifest, boot_time, pool, cfg.clone()),
        )
        .layer(TimeoutLayer::new(Duration::from_secs(30)))
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http()) 
        .layer(cors);

    Ok(app)
}
