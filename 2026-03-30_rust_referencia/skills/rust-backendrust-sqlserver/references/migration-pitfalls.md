# backendrust migration pitfalls

Use this file when touching parity-critical SQL or handlers.

Rules that became mandatory:
- If Rust depends on `sp_*_rust`, define it before the live compare. Do not wait for `Could not find stored procedure ...` in logs.
- Default to `CREATE OR ALTER PROCEDURE` for migration SPs. If the wrapper signature changed and you want a hard reset, use explicit `DROP/CREATE` in the parity script.
- If an endpoint is parity-critical, do not hide SQL errors behind helpers that return `[]`. Use a strict helper and fail with `500`.
- Route coverage is not parity. Always compare body, status code, path, and side effects.

Real failures already seen:
- `planning/stats/performance` returned `200` with `[]` because `sp_Planning_StatsPerformance_rust` did not exist and the helper swallowed the SQL error.
- `sp_ActualizarTarea_rust` had a wrapper/signature mismatch and rejected `@idTarea`.
- `DELETE /proyectos/:id` was assumed as physical delete, but Nest uses soft delete to `estado = Cancelado`.
- Live Nest did not expose the `notes` alias the way the older docs suggested; checking the deployed endpoint was necessary.
- Some Rust responses looked "correct enough" but still diverged in `statusCode`, `path`, or null handling, which is enough to break frontend expectations.
- `planning/workload` broke in vivo because the frontend sends mixed date formats: some screens send `YYYY-MM-DD`, others send full ISO (`toISOString()`). Appending ` 00:00:00` blindly to an ISO string produced invalid SQL date strings and `nvarchar -> datetime` failures.
- `planning/workload` also used the permissive helper and could log the SQL error while still returning `200` with `agenda: []`, hiding a real production bug.
- `clima` and `porta-planer` Nest both allowed a master compatibility password (`123456`) in `validateUser`. Rust initially implemented only `bcrypt`, which caused a real `200 Nest` vs `401 Rust` mismatch on the live cutover.

What to do every time:
1. Read the Nest source or the live response first.
2. Create or alter the needed SPs before the first live compare.
3. Run `cargo check`.
4. Test the exact live endpoint with auth if it is protected.
5. Compare side effects in DB when the endpoint writes.
6. If a frontend date query param can come from multiple views, normalize it in Rust before composing SQL params. Never concatenate time suffixes onto raw user strings.
7. For parity-critical reads, prefer `exec_sp_to_json_result` over `exec_sp_to_json` so DB failures surface as `500` instead of fake empty payloads.
8. For auth parity, inspect the deployed Nest `validateUser` path before assuming the rule is just `bcrypt.compare(...)`. Temporary master passwords or legacy bypasses count as real behavior until they are removed from production.
