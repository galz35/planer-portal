# Hallazgos y acciones para backendrust

Hallazgos ya confirmados:
- El proyecto compila en este VPS con Rust estable actual si se usa gcc-10/g++-10.
- La migracion ya tenia casi toda la superficie HTTP cubierta; el trabajo real ahora es paridad funcional y de contratos.
- El helper `row_to_json` de src/handlers/equipo.rs tenia una brecha de precision: no contemplaba de forma explicita `decimal/numeric`, `uniqueidentifier` ni `datetimeoffset`.
- `src/db.rs` deja el pool en `max_size(10)` duro y sin tuning por entorno.
- El flujo `planning` de solicitud/aprobacion de cambios no estaba roto por falta de rutas; la brecha real era validacion de payload, permisos y aplicacion consistente del cambio en SQL Server.
- Un error recurrente de migracion fue asumir que un `sp_*_rust` existia o era compatible sin declararlo primero; eso genero falsos `200` o fallos de runtime evitables.

Impacto de esos hallazgos:
- Un endpoint puede existir y aun asi devolver datos incompatibles con el frontend si un decimal, fecha u UUID sale en formato incorrecto.
- Cuando SQL Server manda tipos ricos, la paridad depende mas del mapeo que de la consulta.
- En carga real, un pool fijo y pequeno puede degradar throughput o disparar latencia.

Acciones recomendadas inmediatas:
1. Corregir `row_to_json` para tipos de precision y fechas con offset.
2. Volver configurable el pool MSSQL por variables de entorno.
3. Ejecutar `cargo check` tras cada bloque y preferir validaciones pequenas pero frecuentes.
4. Priorizar endpoints criticos del frontend sobre refactors esteticos.
5. Para SPs de migracion, crear o alterar el SP antes del primer compare vivo; no esperar a descubrir su ausencia por logs.
6. En endpoints criticos, no esconder errores SQL devolviendo `[]`; la falla debe quedar visible.

Ruta de control ya existente:
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion/00_RESUMEN_EJECUTIVO.md
- /opt/apps/porta-planer/2026-03-27_backendrust_migracion/05_CHECKLIST_AVANCES.md
- /root/rust/09_ERRORES_REALES_Y_SOLUCIONES_BACKENDRUST.md
