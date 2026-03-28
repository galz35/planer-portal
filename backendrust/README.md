# backendrust

Migración de `v2sistema/v2backend` (NestJS) hacia Rust con Axum.

## Objetivo
Construir una versión equivalente del backend actual en Rust, manteniendo cobertura funcional, contratos HTTP y reglas de negocio.

## Ola de trabajo (roadmap)

| Ola | Alcance | Entregables | Avance |
|---|---|---|---:|
| Ola 0 | Descubrimiento y paridad | Inventario automático de controladores/rutas NestJS | 100% |
| Ola 1 | Base técnica Rust | Proyecto `backendrust`, servidor Axum, health, trazas | 100% |
| Ola 2 | Paridad de superficie HTTP | Proxy `/api/*` y validación de rutas | 100% |
| Ola 3 | Endpoints Críticos (Phase 1-2)| Auth, Planning, Proyectos y Marcaje reales | 100% |
| Ola 4 | Servicios Transversales | **Notificaciones (FCM/SMTP)** e Infraestructura real | 100% |
| Ola 5 | Módulos Especializados | Campo (GPS Tracking) y Admin Stats reales | 100% |

## Porcentaje global de avance

- Avance de rutas (HTTP): **100%**.
- Implementación lógica real: **~95%**.

> ⚠️ **Estado Actual:** La mayoría de los endpoints críticos (Auth, Proyectos, Tareas, Notificaciones, GPS) están implementados con lógica de base de datos real (SQL Server).

### ¿Qué falta para terminar de verdad?

Paridad HTTP ya está completa, pero el **100% funcional real** requiere cerrar infraestructura y reemplazar mocks/generics por lógica de negocio.

Ver plan corto aquí: `docs/next_steps_100_real.md`.

## Endpoints útiles en esta etapa

- `GET /health`
- `GET /api/`
- `GET /api/diagnostico/contexto`
- `GET /api/diagnostico/ping`
- `GET /api/diagnostico/stats`
- `GET /api/diagnostico/test-tarea`
- `GET /api/diagnostico/test-idcreador`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/change-password`
- `GET /api/auth/config`
- `POST /api/auth/config`
- `GET /api/planning/workload`
- `GET /api/planning/pending`
- `GET /api/planning/approvals`
- `POST /api/planning/check-permission`
- `POST /api/planning/request-change`
- `POST /api/planning/resolve`
- `POST /api/planning/approvals/:idSolicitud/resolve`
- `GET /api/planning/plans`
- `POST /api/planning/plans`
- `GET /api/planning/stats`
- `GET /api/planning/stats/compliance`
- `GET /api/planning/stats/performance`
- `GET /api/planning/stats/bottlenecks`
- `GET /api/planning/team`
- `GET /api/planning/my-projects`
- `POST /api/planning/plans/:id/close`
- `POST /api/planning/update-operative`
- `POST /api/planning/tasks/:id/clone`
- `GET /api/planning/tasks/:id/history`
- `POST /api/planning/reassign`
- `POST /api/planning/tasks/:id/avance-mensual`
- `GET /api/planning/tasks/:id/avance-mensual`
- `POST /api/planning/tasks/:id/crear-grupo`
- `POST /api/planning/tasks/:id/agregar-fase`
- `GET /api/planning/grupos/:idGrupo`
- `GET /api/planning/dashboard/alerts`
- `GET /api/planning/mi-asignacion`
- `GET /api/planning/supervision`
- `GET /api/planning/debug`
- `GET /api/proyectos/roles-colaboracion`
- `GET /api/proyectos`
- `POST /api/proyectos`
- `POST /api/proyectos/:id/clonar`
- `GET /api/proyectos/:id`
- `PATCH /api/proyectos/:id`
- `DELETE /api/proyectos/:id`
- `GET /api/proyectos/:id/tareas`
- `GET /api/proyectos/:id/historial`
- `GET /api/proyectos/:id/colaboradores`
- `POST /api/proyectos/:id/colaboradores`
- `PATCH /api/proyectos/:id/colaboradores/:idUsuario`
- `DELETE /api/proyectos/:id/colaboradores/:idUsuario`
- `GET /api/proyectos/:id/mis-permisos`
- `GET /api/tareas/:idTarea/avance-mensual`
- `POST /api/tareas/:idTarea/avance-mensual`
- `POST /api/tareas/masiva`
- `GET /api/tareas/:id`
- `POST /api/tareas/:id/revalidar`
- `POST /api/tareas/:id/participantes`
- `POST /api/tareas/:id/recordatorio`
- `GET /api/tareas/historico/:carnet`
- `DELETE /api/tareas/:id`
- `POST /api/tareas/:id/descartar`
- `POST /api/tareas/:id/mover`
- `POST /api/tareas/:id/avance`
- `DELETE /api/tareas/avance/:id`
- `POST /api/tareas/solicitud-cambio`
- `GET /api/tareas/solicitud-cambio/pendientes`
- `POST /api/tareas/solicitud-cambio/:id/resolver`
- `POST /api/tareas/:id/recurrencia`
- `GET /api/tareas/:id/recurrencia`
- `POST /api/tareas/:id/instancia`
- `GET /api/tareas/:id/instancias`
- `POST /api/marcaje/mark`
- `GET /api/marcaje/summary`
- `POST /api/marcaje/['undo-last-checkout', 'undo-last']`
- `POST /api/marcaje/['request-correction', 'correccion']`
- `POST /api/marcaje/gps-track`
- `POST /api/marcaje/gps-track-batch`
- `GET /api/marcaje/admin/solicitudes`
- `GET /api/marcaje/admin/sites`
- `GET /api/marcaje/admin/ips`
- `GET /api/marcaje/admin/devices`
- `GET /api/marcaje/admin/config`
- `GET /api/marcaje/admin/monitor`
- `GET /api/marcaje/admin/dashboard`
- `PUT /api/marcaje/admin/solicitudes/:id/resolver`
- `DELETE /api/marcaje/admin/asistencia/:id`
- `POST /api/marcaje/admin/reiniciar/:carnet`
- `GET /api/marcaje/admin/reportes`
- `POST /api/marcaje/admin/sites`
- `PUT /api/marcaje/admin/sites/:id`
- `DELETE /api/marcaje/admin/sites/:id`
- `POST /api/marcaje/admin/ips`
- `DELETE /api/marcaje/admin/ips/:id`
- `PUT /api/marcaje/admin/devices/:uuid`
- `POST /api/marcaje/geocerca/validar`
- `GET /api/marcaje/admin/geocercas/:carnet`
- `POST /api/marcaje/admin/geocercas`
- `DELETE /api/marcaje/admin/geocercas/:id`
- `GET /api/admin/security/users-access`
- `POST /api/admin/security/assign-menu`
- `DELETE /api/admin/security/assign-menu/:id`
- `GET /api/admin/security/profiles`
- `GET /api/admin/stats`
- `GET /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id/rol`
- `POST /api/admin/usuarios/:id/menu`
- `POST /api/admin/usuarios`
- `PATCH /api/admin/usuarios/:id`
- `GET /api/admin/usuarios/:id/visibilidad-efectiva`
- `GET /api/admin/roles`
- `POST /api/admin/roles`
- `PATCH /api/admin/roles/:id`
- `DELETE /api/admin/roles/:id`
- `GET /api/admin/logs`
- `GET /api/admin/audit-logs`
- `GET /api/admin/organigrama`
- `POST /api/admin/nodos`
- `POST /api/admin/usuarios-organizacion`
- `GET /api/admin/recycle-bin`
- `POST /api/admin/recycle-bin/restore`
- `DELETE /api/admin/usuarios/:id`
- `DELETE /api/admin/usuarios-organizacion/:idUsuario/:idNodo`
- `GET /api/admin/usuarios-inactivos`
- `GET /api/admin/backup/export`
- `GET /api/admin/import/template/empleados`
- `GET /api/admin/import/template/organizacion`
- `POST /api/admin/import/empleados`
- `POST /api/admin/import/organizacion`
- `POST /api/admin/import/asignaciones`
- `GET /api/admin/import/stats`
- `GET /api/_migration/status`
- `GET /api/_migration/progress`
- `GET /api/_migration/breakdown`
- `ANY /api/*` (responde 501 y confirma si ruta/método existe en NestJS)

## Archivos de control de migración

- Manifiesto base: `data/endpoints_manifest.json`
- Endpoints ya implementados en Rust: `data/implemented_endpoints.json`

## Regenerar manifiesto de endpoints

```bash
python3 scripts/generate_manifest.py
```

## Comandos

```bash
cargo run
cargo fmt -- --check
cargo check
```


## Configuración recomendada (runtime)

Variables opcionales de entorno para operar de forma más segura y observable:

- `HOST` (default `0.0.0.0`)
- `PORT` (default `3100`)
- `RUST_LOG` (default `backendrust=debug,tower_http=info`)
- `LOG_FORMAT` (`compact` | `pretty` | `json`, default `compact`)
- `MSSQL_HOST`, `MSSQL_PORT`, `MSSQL_DATABASE`, `MSSQL_USER`, `MSSQL_PASSWORD`
- `MSSQL_TRUST_CERT` (`true`/`false`)
- `MSSQL_POOL_MAX_SIZE` (default `10`)
- `MSSQL_POOL_MIN_IDLE` (opcional, capped a `MSSQL_POOL_MAX_SIZE`)
- `MSSQL_POOL_CONNECTION_TIMEOUT_SECS` (default `15`)

Ejemplo:

```bash
HOST=0.0.0.0 PORT=3100 RUST_LOG=backendrust=info LOG_FORMAT=json cargo run
```

El servidor soporta apagado elegante (graceful shutdown) ante `CTRL+C` y `SIGTERM`.
