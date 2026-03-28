use crate::db::Pool;
use crate::migration::{EndpointManifest, RouteMatcher};
use crate::security::RateLimiter;
use std::{collections::HashMap, sync::Arc, time::Instant};
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct ApiState {
    pub manifest: Arc<EndpointManifest>,
    pub route_matcher: Arc<RouteMatcher>,
    pub boot_time: Instant,
    pub user_config: Arc<RwLock<HashMap<u64, serde_json::Value>>>,
    pub pool: Pool,
    pub jwt_secret: String,
    pub login_limiter: RateLimiter,
    pub notification_service: Arc<crate::services::notification::NotificationService>,
}
