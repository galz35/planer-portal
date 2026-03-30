# Documentacion Rust de Referencia

Este bloque concentra la experiencia util obtenida durante la migracion de `backendrust` para `porta-planer` y su replica en `clima-portal`.

Contenido principal:

- `docs/`: notas tecnicas, hallazgos, decisiones de arquitectura, errores reales y validaciones hechas en el VPS.
- `skills/rust-backendrust-sqlserver/`: skill operativa usada para trabajar `backendrust` con Axum, Tokio, Tiberius y SQL Server.
- `skills/rust-docs-research/`: skill de investigacion y referencias oficiales de Rust y MSSQL.

Uso recomendado:

1. Leer `docs/00_INDICE.md`.
2. Revisar `docs/04_SQL_SERVER_EN_RUST.md` y `docs/08_SQL_SERVER_DECISIONES_DE_ARQUITECTURA.md`.
3. Revisar `docs/09_ERRORES_REALES_Y_SOLUCIONES_BACKENDRUST.md`.
4. Si se retoma el trabajo operativo, revisar `skills/rust-backendrust-sqlserver/SKILL.md`.

Objetivo:

- dejar una base descargable dentro del repo
- no repetir errores de esta migracion
- acelerar futuros proyectos Rust con SQL Server y API REST
