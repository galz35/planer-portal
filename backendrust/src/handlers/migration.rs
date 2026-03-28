#![allow(dead_code)]
use axum::{extract::State, Json};

use crate::migration::{by_controller, by_module, progress, EndpointManifest};
use crate::models::*;
use crate::state::ApiState;

pub async fn migration_status(State(state): State<ApiState>) -> Json<EndpointManifest> {
    Json((*state.manifest).clone())
}

pub async fn migration_progress(
    State(state): State<ApiState>,
) -> Json<crate::migration::ProgressSnapshot> {
    Json(progress(&state.manifest))
}

pub async fn migration_breakdown(State(state): State<ApiState>) -> Json<MigrationBreakdown> {
    Json(MigrationBreakdown {
        controllers: by_controller(&state.manifest),
        modules: by_module(&state.manifest),
    })
}
