use anyhow::{Context, Result};
use std::{collections::HashMap, net::SocketAddr};

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub grpc_port: u16,
    pub log_filter: String,
    pub log_format: LogFormat,
    // Base de datos (SQL Server)
    pub db_host: Option<String>,
    pub db_user: Option<String>,
    pub db_pass: Option<String>,
    pub db_name: Option<String>,
    pub db_port: Option<u16>,
    pub db_trust_cert: bool,
    pub db_pool_max_size: u32,
    pub db_pool_min_idle: Option<u32>,
    pub db_pool_connection_timeout_secs: u64,
    // Auth
    pub jwt_secret: Option<String>,
    // Notificaciones
    pub mail_host: String,
    pub mail_port: u16,
    pub mail_user: String,
    pub mail_pass: String,
    pub mail_from: String,
    pub firebase_credentials_path: String,
}

#[derive(Clone, Debug)]
pub enum LogFormat {
    Compact,
    Pretty,
    Json,
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        let env_map: HashMap<String, String> = std::env::vars().collect();
        Self::from_map(&env_map)
    }

    fn from_map(env: &HashMap<String, String>) -> Result<Self> {
        let host = env
            .get("HOST")
            .cloned()
            .unwrap_or_else(|| "0.0.0.0".to_string());

        let port = env
            .get("PORT")
            .map(|v| {
                v.parse::<u16>()
                    .context("PORT inválido, se esperaba entero 1..65535")
            })
            .transpose()?
            .unwrap_or(3100);

        let log_filter = env
            .get("RUST_LOG")
            .cloned()
            .unwrap_or_else(|| "backendrust=debug,tower_http=info".to_string());

        let log_format = match env
            .get("LOG_FORMAT")
            .map(|v| v.to_lowercase())
            .unwrap_or_else(|| "compact".to_string())
            .as_str()
        {
            "json" => LogFormat::Json,
            "pretty" => LogFormat::Pretty,
            _ => LogFormat::Compact,
        };

        let db_host = env.get("MSSQL_HOST").cloned();
        let db_user = env.get("MSSQL_USER").cloned();
        let db_pass = env.get("MSSQL_PASSWORD").cloned();
        let db_name = env.get("MSSQL_DATABASE").cloned();
        let db_port = env
            .get("MSSQL_PORT")
            .and_then(|v| v.parse::<u16>().ok())
            .or(Some(1433));
        let db_trust_cert = env
            .get("MSSQL_TRUST_CERT")
            .map(|v| matches!(v.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on"))
            .unwrap_or(false);
        let db_pool_max_size = env
            .get("MSSQL_POOL_MAX_SIZE")
            .and_then(|v| v.parse::<u32>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(10);
        let db_pool_min_idle = env
            .get("MSSQL_POOL_MIN_IDLE")
            .and_then(|v| v.parse::<u32>().ok())
            .map(|v| v.min(db_pool_max_size));
        let db_pool_connection_timeout_secs = env
            .get("MSSQL_POOL_CONNECTION_TIMEOUT_SECS")
            .and_then(|v| v.parse::<u64>().ok())
            .filter(|v| *v > 0)
            .unwrap_or(15);

        let grpc_port = env
            .get("GRPC_PORT")
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(50051);

        let jwt_secret = env.get("JWT_SECRET").map(|s| s.trim().to_string());

        let mail_host = env
            .get("MAIL_HOST")
            .cloned()
            .unwrap_or_else(|| "localhost".to_string());
        let mail_port = env
            .get("MAIL_PORT")
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(465);
        let mail_user = env.get("MAIL_USER").cloned().unwrap_or_default();
        let mail_pass = env.get("MAIL_PASSWORD").cloned().unwrap_or_default();
        let mail_from = env.get("MAIL_FROM").cloned().unwrap_or_default();
        let firebase_credentials_path = env
            .get("FIREBASE_CREDENTIALS_PATH")
            .cloned()
            .unwrap_or_default();

        Ok(Self {
            host,
            port,
            grpc_port,
            log_filter,
            log_format,
            db_host,
            db_user,
            db_pass,
            db_name,
            db_port,
            db_trust_cert,
            db_pool_max_size,
            db_pool_min_idle,
            db_pool_connection_timeout_secs,
            jwt_secret,
            mail_host,
            mail_port,
            mail_user,
            mail_pass,
            mail_from,
            firebase_credentials_path,
        })
    }

    pub fn socket_addr(&self) -> Result<SocketAddr> {
        format!("{}:{}", self.host, self.port)
            .parse()
            .with_context(|| format!("HOST/PORT inválidos para bind: {}:{}", self.host, self.port))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_defaults_from_map() {
        let env = HashMap::new();
        let cfg = AppConfig::from_map(&env).expect("config por defecto válida");
        assert_eq!(cfg.host, "0.0.0.0");
        assert_eq!(cfg.port, 3100);
        assert!(matches!(cfg.log_format, LogFormat::Compact));
        assert_eq!(cfg.db_pool_max_size, 10);
        assert_eq!(cfg.db_pool_min_idle, None);
        assert_eq!(cfg.db_pool_connection_timeout_secs, 15);
    }

    #[test]
    fn test_pool_config_from_map() {
        let mut env = HashMap::new();
        env.insert("MSSQL_POOL_MAX_SIZE".to_string(), "24".to_string());
        env.insert("MSSQL_POOL_MIN_IDLE".to_string(), "30".to_string());
        env.insert(
            "MSSQL_POOL_CONNECTION_TIMEOUT_SECS".to_string(),
            "9".to_string(),
        );
        let cfg = AppConfig::from_map(&env).expect("config valida");
        assert_eq!(cfg.db_pool_max_size, 24);
        assert_eq!(cfg.db_pool_min_idle, Some(24));
        assert_eq!(cfg.db_pool_connection_timeout_secs, 9);
    }

    #[test]
    fn test_invalid_port_from_map() {
        let mut env = HashMap::new();
        env.insert("PORT".to_string(), "abc".to_string());
        let err = AppConfig::from_map(&env).expect_err("debe fallar con puerto inválido");
        assert!(err.to_string().contains("PORT inválido"));
    }

    #[test]
    fn test_log_format_json() {
        let mut env = HashMap::new();
        env.insert("LOG_FORMAT".to_string(), "json".to_string());
        let cfg = AppConfig::from_map(&env).expect("config válida");
        assert!(matches!(cfg.log_format, LogFormat::Json));
    }
}
