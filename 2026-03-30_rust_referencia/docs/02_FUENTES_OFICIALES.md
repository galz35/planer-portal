# Fuentes oficiales y primarias

Base del lenguaje:
- Rust Book: https://doc.rust-lang.org/book/
  Uso: sintaxis, ownership, borrowing, modules, traits, async basico.
- Cargo Book: https://doc.rust-lang.org/cargo/
  Uso: manifests, workspaces, profiles, comandos, reproducibilidad.
- rustup Book: https://rust-lang.github.io/rustup/
  Uso: toolchains, stable/beta/nightly, componentes, targets.
- Clippy docs: https://doc.rust-lang.org/clippy/
  Uso: linting y mejora de calidad.
- Rust API Guidelines: https://rust-lang.github.io/api-guidelines/
  Uso: contratos limpios, validacion, nombres y ergonomia.

Async / web / red:
- Tokio: https://tokio.rs/
- Tokio tutorial: https://tokio.rs/tokio/tutorial
- Axum: https://docs.rs/axum/latest/axum/
- tower-http: https://docs.rs/tower-http/latest/tower_http/
- tonic: https://docs.rs/tonic/latest/tonic/
- tracing: https://docs.rs/tracing/latest/tracing/

Datos / serializacion / integraciones:
- Serde: https://serde.rs/
- Reqwest: https://docs.rs/reqwest/latest/reqwest/
- Tera: https://docs.rs/tera/latest/tera/
- lettre: https://docs.rs/lettre/latest/lettre/
- yup-oauth2: https://docs.rs/yup-oauth2/latest/yup_oauth2/

SQL Server:
- Tiberius crate docs: https://docs.rs/tiberius/latest/tiberius/
- Tiberius GitHub: https://github.com/prisma/tiberius
- bb8-tiberius docs: https://docs.rs/bb8-tiberius/latest/bb8_tiberius/
- SQLx support matrix: https://docs.rs/sqlx/latest/sqlx/database/
- SQLx README: https://github.com/launchbadge/sqlx
- Microsoft Learn `CREATE OR ALTER`: https://learn.microsoft.com/sql/t-sql/statements/create-procedure-transact-sql

Hallazgos web utiles validados para este proyecto:
- Axum `OriginalUri` es la referencia correcta para conservar el path real cuando el router esta montado bajo prefijos o nested routers.
- En Tiberius, `into_first_result()` es la ruta correcta para SPs de un solo resultset; para multiples resultsets hay que consumir el stream completo sin perder fronteras.
- bb8-tiberius confirma el modelo actual: pooling externo, no dentro del driver.
- SQLx no mejora esta migracion MSSQL hoy; seguir con Tiberius + bb8 es la decision correcta.
- Para migracion SQL, `CREATE OR ALTER PROCEDURE` queda como default futuro y `DROP/CREATE` solo cuando se quiere resetear firma o wrapper de forma explicita.

Regla practica de investigacion:
1. Primero Cargo.toml y Cargo.lock locales.
2. Luego documentacion oficial del lenguaje.
3. Luego docs.rs del crate exacto o de la serie compatible.
4. Luego README del proyecto del crate para soporte, roadmap o non-goals.
