# SQL Server notes for backendrust

Driver choice:
- backendrust already uses Tiberius 0.12 and bb8-tiberius 0.15.
- Keep that stack unless there is a very strong reason to replatform.
- SQLx is still not the right path here; its current support matrix no longer treats MSSQL as a first-class backend.

Important behavior:
- Tiberius is the SQL Server/TDS client.
- Pooling is intentionally external; bb8-tiberius is the correct companion.
- bb8-tiberius ConnectionManager enables TCP_NODELAY by default.
- For a simple stored procedure, `QueryStream::into_first_result()` is the safest consumption path.
- For multi-resultset procedures, iterate the stream or use a helper that preserves recordset boundaries.

What usually breaks frontend parity:
- decimal/numeric mapped to null or rounded numbers
- datetimeoffset losing timezone
- UUID returned in a non-canonical or binary-ish form
- handler-specific post-processing that filters rows differently than NestJS
- SQL errors hidden behind helpers that silently return `[]`
- missing `sp_*_rust` procedures discovered only after the endpoint is already live

Safe serialization defaults:
- decimal/numeric => JSON string
- datetimeoffset => RFC3339 string
- uuid => canonical string
- date => YYYY-MM-DD
- datetime => ISO-like timestamp with explicit timezone choice if needed

Validation habit:
- After changing row serialization or SQL helpers, re-check endpoints known to feed dashboards, planning, tareas and proyectos.
- Before live validation, audit the `_rust` procedures used by handlers against `sys.procedures`.
- When the route is nested or mounted behind a prefix, preserve the incoming path with Axum `OriginalUri`.
