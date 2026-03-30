# SQL Server sources for Rust research

Primary sources:
- Tiberius docs: https://docs.rs/tiberius/latest/tiberius/
- Tiberius GitHub README: https://github.com/prisma/tiberius
- bb8-tiberius docs: https://docs.rs/bb8-tiberius/latest/bb8_tiberius/
- SQLx support matrix: https://docs.rs/sqlx/latest/sqlx/database/
- SQLx README: https://github.com/launchbadge/sqlx

Project-local anchor files:
- /opt/apps/porta-planer/backendrust/src/db.rs
- /opt/apps/porta-planer/backendrust/src/config.rs
- /opt/apps/porta-planer/backendrust/src/handlers/equipo.rs

Questions to answer during research:
- Which crate owns the driver?
- Which crate owns pooling?
- Which SQL types need special serialization to keep frontend parity?
- Which performance knobs are local to the app versus handled inside the pool or driver?
