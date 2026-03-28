use anyhow::Context;
use backendrust::config::AppConfig;
use backendrust::db;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let cfg = AppConfig::from_env()?;
    let pool = db::create_pool(&cfg).await?;
    let mut client = pool.get().await.context("No se pudo obtener conexion")?;

    println!("--- LISTADO DE TABLAS QUE CONTIENEN 'Usuario' ---");
    let stream = client.query(
        "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%Usuario%'",
        &[],
    ).await?;

    let rows = stream.into_first_result().await?;

    for row in rows {
        let schema: &str = row.get(0).unwrap_or("");
        let name: &str = row.get(1).unwrap_or("");
        println!("{}.{}", schema, name);
    }

    Ok(())
}
