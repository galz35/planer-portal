use tiberius::{Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::TokioAsyncWriteCompatExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut config = Config::new();
    config.host("190.56.16.85");
    config.port(1433);
    config.authentication(tiberius::AuthMethod::sql_server("sa", "TuPasswordFuerte!2026"));
    config.database("Bdplaner");
    config.trust_cert();

    let tcp = TcpStream::connect(config.get_addr()).await?;
    tcp.set_nodelay(true)?;

    let mut client = Client::connect(config, tcp.compat_summary()).await?;

    let id_tarea = 2186;
    let stream = client.query("SELECT idLog, idTarea, idUsuario, progreso, comentario, fecha FROM p_TareaAvances WHERE idTarea = @P1", &[&id_tarea]).await?;
    let rows = stream.into_first_result().await?;
    
    println!("Found {} advances for task {}", rows.len(), id_tarea);
    for row in rows {
        let id_log: i32 = row.get("idLog").unwrap();
        let com: &str = row.get("comentario").unwrap();
        println!("- Log {}: {}", id_log, com);
    }

    Ok(())
}
