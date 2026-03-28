# Checklist de Avances

Fecha de apertura: 2026-03-27

## Base documental

- [x] Carpeta de trabajo creada para 2026-03-27.
- [x] `backendrust` copiado dentro de `/opt/apps/porta-planer`.
- [x] Inventario HTTP actual de `v2backend` generado.
- [x] Inventario de SP y SQL directo generado.
- [x] Diff inicial NestJS vs Rust generado.
- [x] Plan de fases y subfases definido.

## Faltantes reales detectados hoy

- [x] No hay faltantes reales de ruta; solo queda certificar paridad funcional.

## Prioridad inmediata sugerida

- [x] POST /auth/sso-login
- [x] POST /auth/portal-session
- [x] POST /auth/sso-sync-user
- [x] GET /tareas/mias
- [x] PATCH /tareas/:id
- [x] POST /tareas/rapida
- [x] GET /planning/workload
- [x] GET /planning/plans
- [x] POST /planning/plans
- [x] GET /planning/pending
- [x] GET /planning/approvals
- [x] POST /planning/request-change
- [x] POST /planning/resolve
- [x] POST /planning/approval/resolve
- [x] GET /proyectos/:id

## Fortalecimiento Rust y SQL Server

- [x] Carpeta de investigación creada en `/root/rust`.
- [x] Skills creadas: `rust-backendrust-sqlserver` y `rust-docs-research`.
- [x] `row_to_json` endurecido para `decimal/numeric`, `money`, `uuid`, `datetimeoffset` y `time`.
- [x] Pool MSSQL vuelto configurable por entorno.
- [x] `GET /tareas/solicitud-cambio/pendientes` alineado con filtro de admin/equipo directo de NestJS.
- [x] Flujo `planning` de solicitud/aprobacion/resolucion alineado con validaciones y permisos base de NestJS.
- [x] `POST /planning/check-permission` endurecido con `404` real, control de acceso y reglas de aprobación alineadas a NestJS.
- [x] `GET /planning/mi-asignacion` alineado con filtro `pendientes`, progreso y atraso usados por React.
- [x] `notas/notes` migrado a stored procedures y shape consumido por React.
- [x] Colaboradores de proyecto endurecidos con permisos/paridad NestJS y soporte real para `permisosCustom` en camelCase desde React.
- [x] `GET /proyectos/:id/mis-permisos` alineado con la misma detección de admin global usada por NestJS.
- [x] `planning/tasks/:id/clone`, `history`, `avance-mensual`, `crear-grupo`, `agregar-fase` y `planning/grupos/:idGrupo` alineados con validación de acceso y errores base de NestJS.
- [x] Contrato `GET/POST /planning/tasks/:id/avance-mensual` alineado con keys y shape real de NestJS.
- [x] Procedures `_rust` faltantes del core `tareas/recurrencia` creados e instalados en SQL Server (`recurrencia`, `instancias`, `creacion masiva`, `revalidar`, `recordatorio`, `reasignacion`).
- [x] `recordatorios` realineado con la tabla viva `p_TareaRecordatorios` y el contrato real de NestJS.
- [x] Auditoria runtime `_rust` reducida de `30` a `23` faltantes, dejando el remanente fuera del core principal de `portal-planer`.
- [x] Wrappers `_rust` instalados para `marcaje`, `visita-admin` y `campo`, cerrando el faltante residual de esos modulos activos.
- [x] Auditoria runtime `_rust` cerrada en `0` faltantes reales en SQL Server (`127/127`).

## Certificación funcional

- [x] Definir payloads reales del frontend para rutas críticas.
- [x] Capturar responses NestJS de referencia.
- [x] Comparar response shape Rust vs NestJS.
- [x] Comparar side effects en BD.
- [x] Comparar códigos HTTP y errores.
- [x] Validar aliases legacy como `/tasks`, `/notes` y `/mi-dia/checkin`.

## Alcance vigente

- `notes/notas` queda fuera del criterio de cierre del release REST activo desde el 2026-03-28.
- `marcaje web`, `campo/recorrido` y `visita-cliente/suite` pasan a fase 2 experimental desde el 2026-03-28.
- si vuelve a aparecer una dependencia real en React, se reabre como backlog puntual.

## Nota operativa nueva

- para endpoints Rust que dependan de `sp_*_rust`, el procedure se crea o altera antes del primer compare vivo.
- en endpoints criticos no se acepta un `200` con `[]` si el origen real fue una falla SQL; el handler debe dejar visible el error.

## Riesgo histórico arrastrado desde backendrust

- [x] Revisar 89 endpoints marcados previamente como no certificados.
- [x] Confirmar cuáles siguen pendientes en el código actual.
- [x] Reducir la lista a backlog ejecutable por módulo.
- [x] Auditar procedures `_rust` usados por handlers contra `sys.procedures` de SQL Server.


## Nota de validación

- [x] Instalar toolchain Rust y dependencias de compilación en el servidor.
- [x] Ejecutar `cargo check` exitoso en `backendrust` con `CC=gcc-10 CXX=g++-10`.
- [x] Ejecutar prueba unitaria dirigida para parsing de pool MSSQL (`test_pool_config_from_map`).
- [x] Ejecutar pruebas unitarias de `planning` para mapeo/normalizacion del flujo de cambios.
- [x] Expandir pruebas unitarias de `planning` para validación de payloads y rangos de avance mensual.
- [x] Ejecutar pruebas unitarias dirigidas de `proyectos` para jerarquía/permiso de colaboradores y parseo de `permisosCustom`.
- [x] Ejecutar prueba funcional real del binario contra entorno completo.
- [x] Ejecutar prueba unitaria dirigida `planning_parse_query_date_accepts_frontend_formats`.
- [x] Validar `bacon --headless -j check-sp` en el repo real.

## Lote crítico certificado en vivo

- [x] `GET /auth/config`
- [x] `POST /auth/config`
- [x] `GET /mi-dia`
- [x] `POST /checkins`
- [x] `POST /mi-dia/checkin`
- [x] `POST /tasks`
- [x] `POST /auth/login`
- [x] `GET /config`
- [x] `POST /config`
- [x] `GET /planning/stats/performance?mes=3&anio=2026`
- [x] `GET /planning/stats/bottlenecks`
- [x] `GET /planning/plans?mes=3&anio=2026&idUsuario=23`
- [x] `POST /planning/update-operative`
- [x] `POST /proyectos`
- [x] `PATCH /proyectos/:id`
- [x] `DELETE /proyectos/:id`
- [x] `POST /planning/tasks/:id/avance-mensual`
- [x] `GET /planning/tasks/:id/avance-mensual`
- [x] `POST /planning/tasks/:id/crear-grupo`
- [x] `POST /planning/tasks/:id/agregar-fase`
- [x] `GET /planning/grupos/:idGrupo`
- [x] `GET /planning/my-projects`
- [x] `GET /planning/mi-asignacion`
- [x] `GET /planning/workload`
- [x] `GET /planning/workload` con `startDate/endDate` en ISO completo del frontend
- [x] `GET /planning/stats?mes=3&anio=2026`
- [x] `GET /notas`
- [x] `POST /notas`
- [x] `PATCH /notas/:id`
- [x] `DELETE /notas/:id`
- [x] `GET /proyectos/roles-colaboracion`
- [x] `GET /planning/pending`
- [x] `GET /planning/approvals`
- [x] `GET /tareas/solicitud-cambio/pendientes`
- [x] `GET /proyectos/205`
- [x] `POST /planning/check-permission`
- [x] `POST /tareas/rapida` con payload válido
- [x] `POST /tareas/rapida` con payload inválido
- [x] `DELETE /tareas/:id`
- [x] `GET /recordatorios`
- [x] `POST /tareas/:id/recordatorio`
- [x] `DELETE /recordatorios/:id`
- [x] `GET /tareas/:id/recurrencia`
- [x] `GET /marcaje/admin/devices`
- [x] `GET /marcaje/admin/config`
- [x] `GET /marcaje/admin/ips`
- [x] `GET /acceso/delegacion`
- [x] `GET /acceso/delegacion/delegado/:carnetDelegado`
- [x] `GET /acceso/delegacion/delegante/:carnetDelegante`
- [x] `POST /acceso/delegacion` con validación real `400` y limpieza posterior de registro de prueba
- [x] `GET /acceso/permiso-area`
- [x] `GET /acceso/permiso-area/:carnetRecibe`
- [x] `POST /acceso/permiso-area` con receptor inválido (`400`) alineado
- [x] `DELETE /acceso/permiso-area/:id` con envelope de soft delete alineado
- [x] `GET /acceso/permiso-empleado`
- [x] `GET /acceso/permiso-empleado/:carnetRecibe`
- [x] `POST /acceso/permiso-empleado` con validación real `400` y limpieza posterior de registro de prueba
- [x] `DELETE /acceso/permiso-empleado/:id` con envelope de soft delete alineado
- [x] `DELETE /acceso/delegacion/:id` con envelope de soft delete alineado
- [x] `GET /acceso/organizacion/nodo/AREA`
- [x] `GET /acceso/organizacion/nodo/AREA/preview?alcance=SUBARBOL`
- [x] `GET /visita-campo/clientes`
- [x] `GET /visita-campo/usuarios-tracking`
- [x] `GET /visita-admin/visitas`
- [x] `GET /visita-admin/dashboard`
- [x] `GET /visita-admin/metas`
- [x] `GET /campo/recorrido/admin`

## Nota viva del 2026-03-28

- en `marcaje/visita/campo` los wrappers `_rust` iniciales no bastaban; hubo que convertirlos a procedures reales y cambiar joins desde `rrhh.Colaboradores` hacia `p_Usuarios` porque esta BD no expone el esquema `rrhh`.
- el Nest desplegado sigue en `500` para `GET /visita-admin/visitas`, `GET /visita-admin/metas` y `GET /campo/recorrido/admin`; Rust ya responde `200`, por lo que hoy se trata como mejora funcional sobre un origen roto, no como paridad cerrada.
- `GET /marcaje/admin/config` sigue abierto como diferencia de comportamiento: Nest devuelve vacío en este despliegue y Rust devuelve `1` registro real.
- se habilitó una ruta paralela de prueba sin tocar el portal principal: `/portal/planer-rust/` + `/api-portal-planer-rust/`.
- el error productivo `nvarchar -> datetime` de `sp_Planning_ObtenerAgenda_rust` quedó corregido; tras reinicio en PM2, `GET /planning/workload` volvió a coincidir en vivo con Nest usando fechas ISO completas (`users=43`, `tasks=1975`, `agenda=39`).
- `acceso` ya no acepta payloads inválidos con `200`: quedaron alineados `400` y envelopes de soft delete; además se corrigió el tipado de `idOrg` para aceptar valores string/sintéticos como `AREA`, igual que Nest.
- las pruebas inválidas ejecutadas antes de ese fix sí dejaron 2 registros temporales en la BD compartida; fueron desactivados en la misma tanda para no dejar residuo funcional.
- en `jornada`, el Nest desplegado devolvió `500` para `GET /jornada/asignaciones`, `GET /jornada/horarios` y `GET /jornada/patrones`, mientras Rust ya responde `200` con datos; por ahora se trata como mejora funcional sobre un origen roto y no como paridad cerrada.
- ajuste adicional en `jornada`: Rust ya devuelve `detalle` completo en `GET /jornada/patrones`, `duracion_horas` numérico en `GET /jornada/horarios` y `fecha_fin/activo/total_dias` en `GET /jornada/asignaciones`; el problema restante ya no es caída del handler sino certificación final frente a un Nest que hoy sigue en `500`.
