use crate::config::AppConfig;
use bb8_tiberius::ConnectionManager;
use std::time::Duration;
use tiberius::{AuthMethod, Config};

pub type Pool = bb8::Pool<ConnectionManager>;

pub async fn create_pool(cfg: &AppConfig) -> anyhow::Result<Pool> {
    let mut config = Config::new();

    let host = cfg.db_host.as_deref().unwrap_or("127.0.0.1");
    config.host(host);
    config.port(cfg.db_port.unwrap_or(1433));
    config.database(cfg.db_name.as_deref().unwrap_or("master"));

    let user = cfg.db_user.as_deref().unwrap_or("sa");
    let pass = cfg.db_pass.as_deref().unwrap_or("");
    config.authentication(AuthMethod::sql_server(user, pass));

    if cfg.db_trust_cert {
        config.trust_cert();
    }

    let manager = ConnectionManager::new(config);
    let mut builder = bb8::Pool::builder()
        .max_size(cfg.db_pool_max_size)
        .connection_timeout(Duration::from_secs(cfg.db_pool_connection_timeout_secs));

    if let Some(min_idle) = cfg.db_pool_min_idle {
        builder = builder.min_idle(Some(min_idle.min(cfg.db_pool_max_size)));
    }

    let pool = builder.build(manager).await?;

    Ok(pool)
}
