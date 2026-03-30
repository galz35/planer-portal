---
name: rust-backendrust-sqlserver
description: Use when working on /opt/apps/porta-planer/backendrust, especially Axum/Tokio/Tiberius/SQL Server changes, API parity with v2backend, cargo builds on this Ubuntu 20.04 VPS, or debugging JSON contract mismatches caused by SQL Server type mapping.
---

# Rust backendrust SQL Server

Use this skill only for /opt/apps/porta-planer/backendrust and its migration docs.

## First reads
- /opt/apps/porta-planer/backendrust/Cargo.toml
- /opt/apps/porta-planer/backendrust/src/config.rs
- /opt/apps/porta-planer/backendrust/src/db.rs
- /opt/apps/porta-planer/backendrust/src/main.rs
- /opt/apps/porta-planer/backendrust/src/handlers/equipo.rs
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion/00_RESUMEN_EJECUTIVO.md
- Load [references/project-map.md](references/project-map.md) for commands and file map.
- Load [references/sqlserver.md](references/sqlserver.md) before touching DB code or row serialization.
- Load [references/migration-pitfalls.md](references/migration-pitfalls.md) when changing SPs, parity-critical handlers, or live SQL behavior.

## Workflow
1. Compare the target behavior against v2backend or migration docs before editing.
2. Prefer preserving HTTP contract and business behavior over making the code more "idiomatic".
3. Reuse existing stored procedures *_rust and shared helpers unless a real parity gap forces a different approach.
4. When a Rust endpoint depends on an SP, do not wait to discover at runtime whether it exists: add it up front with `CREATE OR ALTER`, or use explicit `DROP/CREATE` in the parity script when the signature changed.
5. For parity-critical endpoints, do not swallow SQL errors behind `200` with `[]`; surface the DB failure or use a strict helper.
6. When a handler fan-outs independent SQL calls, each concurrent branch needs its own pooled connection.
7. Validate with `cargo check` after each meaningful patch and re-run the live endpoint that motivated the change.
8. Use the project `bacon.toml` for fast local feedback, but don't confuse compile feedback with SQL Server contract parity: `bacon` catches Rust/test regressions quickly, while SP/result-shape mismatches still need integration tests or live Nest-vs-Rust compares.
9. Normalize mixed frontend date formats before building SQL params. This project sends both `YYYY-MM-DD` and full ISO strings from different screens.
10. For parity-critical reads, prefer surfacing DB errors with `exec_sp_to_json_result` instead of silently returning `[]`.

## Build commands on this VPS
```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
CC=gcc-10 CXX=g++-10 cargo check
```

Optional quality pass:
```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
cargo fmt -- --check
CC=gcc-10 CXX=g++-10 cargo clippy --all-targets -- -D warnings
```

Bacon loop for this project:
```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
bacon
```

Headless smoke check:
```bash
cd /opt/apps/porta-planer/backendrust
source /root/.cargo/env
timeout 20s bacon --headless -j check-sp
```

Project-specific notes:
- `backendrust/bacon.toml` sets `check-sp` as the default job and watches `src/db/scripts` too.
- The valid bacon job property is `on_change_strategy`, not `on_change`.
- Default refresh in bacon is `F5`; this project also binds `r = "rerun"` for convenience.
- `shift-t` runs the heavier `test-db` job from `bacon.toml`.

## Rules for SQL Server work
- Preserve decimal precision by serializing numeric/decimal as strings if they cross JSON boundaries.
- Serialize uniqueidentifier as canonical UUID strings.
- Serialize datetimeoffset as RFC3339.
- Use positional parameters instead of string interpolation.
- If a result stream is simple, prefer into_first_result() to avoid partial-consumption bugs.
- Default rule for migration SPs: bootstrap them before the first live test, not after the first failure.
- Prefer `CREATE OR ALTER PROCEDURE` for stable definitions; use explicit `DROP PROCEDURE` + `CREATE PROCEDURE` only when a wrapper/signature reset is intentional.

## When to load references
- Load [references/project-map.md](references/project-map.md) for file ownership, commands, and migration checkpoints.
- Load [references/sqlserver.md](references/sqlserver.md) for Tiberius/bb8 specifics and SQL Server pitfalls.
- Load [references/migration-pitfalls.md](references/migration-pitfalls.md) for the real mistakes already seen in backendrust and the fix pattern to reuse.
