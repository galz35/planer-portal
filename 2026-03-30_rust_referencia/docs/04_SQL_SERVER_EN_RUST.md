# SQL Server en Rust para este proyecto

Decision de libreria
- Para SQL Server, Tiberius es la pieza correcta del stack actual.
- Tiberius se define como cliente nativo TDS para Microsoft SQL Server.
- Su README deja claro que el pooling no es objetivo del crate; por eso el pairing correcto es con bb8-tiberius.
- SQLx no es la apuesta principal aqui: su README actual indica que MSSQL fue removido a partir de 0.7 y queda pendiente de reescritura. Para un backend que ya depende de SQL Server, Tiberius sigue siendo la via mas directa.

Que da precision real
- Usar parametros posicionales `@P1`, `@P2`, etc. en lugar de interpolar strings.
- Mantener stored procedures cuando la regla de negocio ya vive en SQL Server.
- Serializar `numeric/decimal` como string cuando importan precision y escala.
- Serializar `datetimeoffset` como RFC3339, no como fecha plana ni string truncado.
- Serializar `uniqueidentifier` como UUID canonico.
- Ser explicito con nulls. El frontend nota rapido cuando un numero llega como null o string inesperado.

Que da velocidad real
- Pooling reutilizable con bb8; el pool no debe quedarse en un valor fijo sin poder ajustarse por entorno.
- Tokio permite paralelizar consultas independientes con `tokio::join!`, pero cada rama necesita su propia conexion del pool.
- bb8-tiberius habilita `TCP_NODELAY` por defecto en el `ConnectionManager::new`, lo cual ayuda en latencia de round-trips pequenos.
- Evitar consultas N+1 desde handlers; si la logica ya existe en un SP, normalmente conviene mantenerla ahi mientras se cierra la migracion.
- Si el resultado usa stream, hay que consumir el resultset correcto; para casos simples `into_first_result()` evita errores de manejo parcial.
- Si el endpoint depende de varios resultsets, hay que procesar el stream completo o usar un helper que conserve la separacion de recordsets.
- En endpoints de paridad critica, no conviene convertir errores SQL en `[]`; es mejor fallar visible y corregir la causa.

Que revisar siempre en backendrust
- `row_to_json`: tipos SQL Server mal mapeados rompen precision aunque la consulta sea correcta.
- `src/db.rs`: tamano del pool, min_idle, timeouts y trazas de conexion.
- `src/config.rs`: que el tuning del pool y TLS quede configurable por env.
- Stored procedures *_rust: muchas rutas dependen de que la paridad funcional viva ahi.
- `OriginalUri` en Axum: si la respuesta usa envelope con `path`, hay que preservar el path real del request montado.
- existencia real de `sp_*_rust` en SQL Server antes del primer compare vivo.

Regla nueva de bootstrap SQL
- Si Rust va a invocar un `sp_*_rust`, el procedure se crea o altera antes del primer test vivo.
- Default: `CREATE OR ALTER PROCEDURE`.
- Excepcion valida: `DROP PROCEDURE` + `CREATE PROCEDURE` cuando hay que resetear una firma o wrapper roto.

Fuentes:
- Tiberius docs: https://docs.rs/tiberius/latest/tiberius/
- Tiberius README: https://github.com/prisma/tiberius
- bb8-tiberius docs: https://docs.rs/bb8-tiberius/latest/bb8_tiberius/
- SQLx support matrix: https://docs.rs/sqlx/latest/sqlx/database/
- SQLx README: https://github.com/launchbadge/sqlx
- Axum docs: https://docs.rs/axum/latest/axum/
- Microsoft Learn `CREATE OR ALTER`: https://learn.microsoft.com/sql/t-sql/statements/create-procedure-transact-sql
