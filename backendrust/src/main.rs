use backendrust::app;
use backendrust::config::{AppConfig, LogFormat};
use backendrust::db;
use backendrust::grpc;

use anyhow::Context;

use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let cfg = AppConfig::from_env()?;
    init_tracing(&cfg);

    let pool = db::create_pool(&cfg).await?;

    // 1. REST Server (Axum) para React Web
    let app = app::build_router(pool.clone(), &cfg)?;
    let rest_addr = cfg.socket_addr()?;

    info!(%rest_addr, "REST/JSON server iniciado");

    let rest_listener = tokio::net::TcpListener::bind(rest_addr)
        .await
        .context("no se pudo abrir el puerto REST")?;

    let rest_handle = tokio::spawn(async move {
        if let Err(error) = axum::serve(rest_listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
        {
            tracing::error!(%error, "REST server fallo");
        }
    });

    // 2. gRPC Server (Tonic) para Flutter
    let grpc_port = cfg.grpc_port;
    let grpc_addr = format!("{}:{}", cfg.host, grpc_port)
        .parse()
        .context("gRPC addr invalida")?;

    let jwt_secret = cfg
        .jwt_secret
        .clone()
        .context("JWT_SECRET no configurado")?;

    let auth_svc = grpc::auth_grpc::AuthServiceImpl {
        pool: pool.clone(),
        jwt_secret,
    };

    let planning_svc = grpc::planning_grpc::PlanningServiceImpl { pool: pool.clone() };

    use grpc::pb::auth::auth_service_server::AuthServiceServer;
    use grpc::pb::planning::planning_service_server::PlanningServiceServer;

    info!(%grpc_addr, "gRPC server iniciado");

    let grpc_handle = tokio::spawn(async move {
        if let Err(error) = tonic::transport::Server::builder()
            .add_service(AuthServiceServer::new(auth_svc))
            .add_service(PlanningServiceServer::new(planning_svc))
            .serve(grpc_addr)
            .await
        {
            tracing::error!(%error, "gRPC server fallo");
        }
    });

    let _ = tokio::join!(rest_handle, grpc_handle);

    Ok(())
}

fn init_tracing(cfg: &AppConfig) {
    let env_filter = tracing_subscriber::EnvFilter::try_new(cfg.log_filter.clone())
        .unwrap_or_else(|_| "backendrust=debug,tower_http=info".into());

    let builder = tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_target(false);

    match cfg.log_format {
        LogFormat::Compact => builder.compact().init(),
        LogFormat::Pretty => builder.pretty().init(),
        LogFormat::Json => builder.json().init(),
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        use tokio::signal::unix::{signal, SignalKind};
        if let Ok(mut sigterm) = signal(SignalKind::terminate()) {
            let _ = sigterm.recv().await;
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("senal de apagado recibida, cerrando servidor");
}
