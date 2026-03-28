# Resumen Ejecutivo

Fecha: 2026-03-27

Ruta objetivo:

- `/opt/apps/porta-planer/2026-03-27_backendrust_migracion`

## Alcance confirmado hoy

- Backend fuente de verdad: `/opt/apps/porta-planer/v2backend`
- Backend Rust previo: `/opt/apps/porta-planer/backendrust`
- Módulos Nest activos detectados: 21
- Controllers Nest inspeccionados: 29
- Endpoints HTTP Nest inventariados: 269
- Rutas Rust inventariadas: 274
- Archivos Nest con SPs: 23
- Archivos Nest con SQL directo: 32

## Hallazgos principales

- La migración anterior en Rust no falló solo por faltantes de ruta. La evidencia previa del 2026-03-14 marca muchas APIs como no certificadas por contrato JSON, side effects SQL y códigos HTTP.
- Comparando el `v2backend` actual contra el router Rust actual, hay 0 faltantes reales de ruta.
- El backlog histórico de 89 endpoints ya fue depurado: 54 quedaron resueltos o alineados, 27 quedaron fuera del alcance principal actual por decisión funcional o experimental (`notes`, `marcaje web`, `visita-cliente/suite`) y 8 siguen pendientes reales de certificación o cierre final para el corte REST principal.
- `v2backend` mezcla stored procedures y SQL directo; por eso la migración nueva debe hacerse por contrato funcional y acceso a datos.

## Faltantes reales hoy en Rust

- Ninguno

## Avance aplicado hoy en backendrust

- Se implementaron las rutas faltantes de autenticación ya documentadas: `POST /auth/sso-login`, `POST /auth/portal-session` y `POST /auth/sso-sync-user`.
- Se agregó el alias `POST /tasks/:id/clone` para igualar el contrato legacy de NestJS.
- Se corrigió `GET /tareas/mias` para dejar de filtrar tareas sin proyecto en memoria, comportamiento que no existe en NestJS.
- Se ajustó `POST /tareas/rapida` para sincronizar `coasignados` al crear y devolver detalle de tarea más cercano a `planningRepo.obtenerTareaPorId`.
- Se ajustó `PATCH /tareas/:id` para forzar progreso 100 cuando la tarea pasa a `Hecha`, persistir `fechaCompletado`, recalcular jerarquía y responder con detalle completo.
- Se ajustó `POST /tareas/:id/participantes` para responder con detalle completo de tarea.
- Se corrigió `GET /planning/workload` para usar la misma ventana por defecto de NestJS: 7 días hacia atrás y 7 días hacia adelante.
- Se endurecieron `GET /planning/plans` y `POST /planning/plans` con validación de `mes/anio`, exigencia de `idUsuario` en el alta y control de visibilidad sobre el usuario objetivo.
- Se agregó control de acceso en `GET /proyectos/:id` para no exponer proyectos fuera del alcance visible del usuario autenticado.
- Se endureció `row_to_json` para mapear mejor tipos SQL Server críticos: `decimal/numeric`, `money`, `uniqueidentifier`, `datetimeoffset` y `time`.
- Se volvió configurable el pool MSSQL con `MSSQL_POOL_MAX_SIZE`, `MSSQL_POOL_MIN_IDLE` y `MSSQL_POOL_CONNECTION_TIMEOUT_SECS`.
- Se corrigió `GET /tareas/solicitud-cambio/pendientes` para igualar a NestJS: admin ve todo y líder ve solo solicitudes pendientes de su equipo directo.
- Se alinearon `POST /planning/request-change`, `GET /planning/pending`, `GET /planning/approvals`, `POST /planning/resolve` y `POST /planning/approval/resolve` con validaciones de campo/motivo, control de visibilidad, delegación al flujo real de solicitudes y aplicación controlada del cambio sobre `p_Tareas`.
- Se alineó `notas/notes` con NestJS usando `sp_Notas_Obtener`, `sp_Nota_Crear`, `sp_Nota_Actualizar` y `sp_Nota_Eliminar`, además de validación de propiedad por `carnet` y shape consumido por React.
- Se corrigió `POST /planning/check-permission` para usar el usuario del JWT, devolver `404` real cuando la tarea no existe, validar acceso antes de responder y respetar excepciones de admin/creador/dueño/asignado.
- Se alineó `GET /planning/mi-asignacion` con NestJS y React: filtro `estado=pendientes`, campos `progreso`/`esAtrasada`, título contextual cuando la tarea pertenece a otro responsable y resumen compatible.
- Se endureció el bloque de colaboradores de proyecto para igualar a NestJS: `GET /proyectos/:id/colaboradores`, `POST /proyectos/:id/colaboradores`, `PATCH /proyectos/:id/colaboradores/:idUsuario` y `DELETE /proyectos/:id/colaboradores/:idUsuario` ahora validan existencia del proyecto, permisos `VIEW_PROJECT`/`INVITE`/`MANAGE_COLLABORATORS`, no-escalamiento de rol, auto-revocación y `permisosCustom` en camelCase consumido por React.
- Se corrigió `GET /proyectos/:id/mis-permisos` para detectar admin global con la misma regla de roles usada en NestJS (`Admin`, `Administrador`, `SuperAdmin`).
- Se alinearon `POST /planning/tasks/:id/clone`, `GET /planning/tasks/:id/history`, `GET/POST /planning/tasks/:id/avance-mensual`, `POST /planning/tasks/:id/crear-grupo`, `POST /planning/tasks/:id/agregar-fase` y `GET /planning/grupos/:idGrupo` con validación de existencia, control de acceso y mensajes `400/403/404` más cercanos a NestJS.
- Se corrigió el contrato de `GET/POST /planning/tasks/:id/avance-mensual` para devolver historial mensual con keys de NestJS (`anio`, `mes`, `porcentajeMes`, `porcentajeAcumulado`, etc.) en lugar de un objeto wrapper distinto.
- Se corrigió compatibilidad JWT con NestJS usando `JWT_SECRET` como secreto raw y no priorizando decodificación base64, lo que permitió autenticar endpoints protegidos de `backendrust` con tokens reales emitidos por `v2backend`.
- Se creó e instaló `sp_Planning_ObtenerAgenda_rust`, cerrando la brecha real de `GET /planning/workload`: la agenda volvió a coincidir con NestJS en contenido y cardinalidad (`users=40`, `tasks=1973`, `agenda=62` para la muestra real del 2026-03-27).
- Corrección posterior del 2026-03-28 para `GET /planning/workload`: se detectó en producción que el frontend mezcla `startDate/endDate` como `YYYY-MM-DD` y como ISO completo (`toISOString()`), lo que provocaba `nvarchar -> datetime` al concatenar horas en Rust. Se normalizó el parseo de fecha en el handler, se endureció el endpoint para no esconder fallos SQL y se actualizó `sp_Planning_ObtenerAgenda_rust` para convertir fechas de forma segura con `TRY_CONVERT`.
- Se alineó `GET /auth/config` para omitir `customMenu` cuando viene nulo o vacío, igual que NestJS.
- Se crearon e instalaron `sp_SolicitudCambio_ObtenerPendientes_rust` y `sp_SolicitudCambio_ObtenerPendientesPorCarnets_rust`, eliminando el SQL inline restante del flujo `pendientes` y evitando falsos positivos silenciosos cuando no había datos.
- Se creó e instaló `sp_Planning_CheckPermission_rust`, cerrando otra dependencia faltante de BD en `POST /planning/check-permission`.
- Se alineó `POST /planning/check-permission` con el código HTTP real de NestJS (`201 Created`) manteniendo el mismo contrato JSON.
- Se normalizó `GET /proyectos/:id` y respuestas derivadas (`create/clone/update`) para devolver `progreso` y retirar `porcentaje`, `totalTareas` y `tareasCompletadas` extra que no existen en NestJS.
- Se alineó `POST /auth/config` con NestJS en código HTTP (`201 Created`) manteniendo side effect y payload `{ success: true }`.
- Se certificó en vivo el CRUD de `notas`: `POST /notas`, `PATCH /notas/:id` y `DELETE /notas/:id` ya limpian y responden como NestJS; `POST /notas` quedó ajustado a `201 Created`.
- Se endureció `POST /tareas/rapida` para rechazar payloads inválidos que NestJS rechaza (`titulo` vacío, `esfuerzo`, `prioridad`, `tipo`, `comportamiento` y fechas inválidas), evitando que Rust cree tareas con datos fuera de contrato.
- Se certificó en vivo `POST /tareas/rapida` con payload válido y `DELETE /tareas/:id` con limpieza real sobre tareas temporales; ambos quedaron alineados en status para el flujo feliz.
- Se separaron y alinearon los flujos `POST /checkins` y `POST /mi-dia/checkin`: ambos usan `sp_Checkin_Upsert_rust`, ya persisten tareas del checkin, y `mi-dia/checkin` además auto-inicia tareas `Entrego` y registra el side effect de auditoría tipo `CHECKIN_DIARIO`, igual que NestJS.
- Se corrigió `GET /mi-dia` para replicar la lógica real de NestJS: mismas reglas de backlog vs sugeridas, tareas sin fecha como candidatas del día, título contextual para tareas de otro responsable y el mismo orden final por proyecto asignado.
- Se volvió wrapper `sp_Tareas_ObtenerPorUsuario_rust` hacia `sp_Tareas_ObtenerPorUsuario` para heredar orden y semántica reales del backend Nest en flujos críticos como `tasks/me` y `mi-dia`.
- Se ajustó el envelope REST común de Rust para omitir campos `null` y emitir `timestamp` en milisegundos UTC, acercándolo más al contrato JSON real de NestJS.
- Se corrigieron respuestas REST críticas para usar el `path` realmente invocado y el mismo `statusCode` de NestJS en `POST /tasks`, `POST /planning/tasks/:id/avance-mensual`, `POST /planning/tasks/:id/crear-grupo`, `POST /planning/tasks/:id/agregar-fase`, `GET /planning/grupos/:idGrupo` y `DELETE /tareas/:id`.
- Se alinearon `POST /auth/login` y `GET/POST /config` con el contrato HTTP real de NestJS: wrapper `ApiResponse`, `path` correcto y `201 Created` en el `POST`.
- Se alinearon `GET /planning/stats/performance`, `GET /planning/stats/bottlenecks` y `POST /planning/update-operative`; este último quedó corrigiendo la firma de `sp_ActualizarTarea_rust`, validando permisos reales y manteniendo la lógica `SP-first`.
- Se alinearon `POST /proyectos`, `PATCH /proyectos/:id`, `DELETE /proyectos/:id` y `GET /proyectos/:id` en contrato HTTP; además se confirmó en vivo que `DELETE /proyectos/:id` es soft delete y deja el proyecto en estado `Cancelado`, igual que NestJS.
- Al 2026-03-28 se corrigió una falsa certificación en `planning stats`: `sp_Planning_StatsPerformance_rust` y `sp_Planning_StatsBottlenecks_rust` no existían todavía, así que Rust podía devolver `200` con `[]` al tragarse el error SQL. Ya se crearon ambos procedures, se aplicaron en SQL Server y los handlers pasaron a modo estricto para no ocultar fallos de BD en endpoints críticos.
- Al 2026-03-28 se ejecutó una auditoría runtime de procedures `_rust` usados por handlers: se detectaron `127` referencias, `36` faltantes reales en SQL Server y, tras la tanda previa, el faltante bajó a `30`.
- En la misma auditoría se corrigieron `sp_Usuarios_ObtenerDetallesPorId_rust`, `sp_Planning_UpsertPlan_rust`, `sp_Plan_Cerrar_rust`, `sp_SolicitudCambio_Resolver_rust`, `sp_Planning_StatsDashboard_rust`, `sp_Planning_StatsCompliance_rust` y `sp_Planning_ObtenerPlanDetalle_rust`.
- En la tanda actual del 2026-03-28 se crearon e instalaron `sp_Recurrencia_Crear_rust`, `sp_Recurrencia_ObtenerPorTarea_rust`, `sp_Instancia_Upsert_rust`, `sp_Tarea_CreacionMasiva_rust`, `sp_Tarea_Revalidar_rust`, `sp_Tarea_UpsertRecordatorio_rust` y `sp_Tareas_Reasignar_PorCarnet_rust`.
- También en la tanda actual se endurecieron `POST /tareas/masiva`, `POST /tareas/:id/revalidar` y `POST /tareas/:id/recordatorio` para no ocultar fallos SQL detrás de `200`.
- `recordatorios` quedó realineado con la base viva y con NestJS: Rust dejó de usar la tabla equivocada `p_Recordatorios` y ahora usa `p_TareaRecordatorios` con `fechaHoraRecordatorio`, `nota` e `idUsuario`.
- Tras cerrar ese bloque, la auditoría runtime del 2026-03-28 quedó en `127` references, `104` procedures `_rust` existentes y `23` faltantes reales.
- En la siguiente tanda del 2026-03-28 se instalaron wrappers `_rust` para `marcaje`, `visita-admin` y `campo`, y luego se cerraron los dos últimos faltantes (`sp_Admin_Usuarios_Importar_rust` y `sp_DelegacionVisibilidad_Eliminar_rust`).
- La auditoría runtime final del 2026-03-28 quedó en `127` references, `127` procedures `_rust` existentes y `0` faltantes reales en SQL Server.

## Validación pendiente

- Se instaló toolchain Rust mínima con `rustup`, además de `pkg-config`, `libssl-dev`, `gcc-10` y `g++-10` para compilar en Ubuntu 20.04.
- `cargo check` ya pasa en `/opt/apps/porta-planer/backendrust` usando `CC=gcc-10 CXX=g++-10` al 2026-03-27.
- `cargo test test_pool_config_from_map --lib` pasó exitosamente al 2026-03-27.
- `cargo test planning_ --lib -- --nocapture` pasó exitosamente al 2026-03-27 con 6 pruebas sobre mapeo/normalización del flujo de cambios, validación de `mes/anio/porcentaje` y compatibilidad de payloads en planning.
- `cargo test proyectos_ --lib -- --nocapture` pasó exitosamente al 2026-03-27 con 3 pruebas nuevas sobre jerarquía de roles, validación de permisos custom y parseo de `permisosCustom`.
- `cargo test decode_claims_accepts_tokens_signed_with_raw_secret --lib -- --nocapture` pasó exitosamente al 2026-03-27.
- `cargo test planning_normalize_agenda_rows_aligns_date_only_with_nest_iso_shape --lib -- --nocapture` pasó exitosamente al 2026-03-27.
- `cargo test build_user_config_value_omits_empty_custom_menu_like_nest --lib -- --nocapture` pasó exitosamente al 2026-03-27.
- `cargo test proyectos_normalize_detalle_aligns_progress_shape_with_nest --lib -- --nocapture` pasó exitosamente al 2026-03-27.
- Se ejecutó certificación funcional real contra entorno completo con login válido de producción (`gustavo.lira@claro.com.ni`) y comparación NestJS vs Rust por HTTP local sobre un lote crítico.
- En el lote crítico del 2026-03-27 quedaron alineados en vivo: `GET /auth/config`, `GET /planning/my-projects`, `GET /planning/mi-asignacion`, `GET /planning/workload`, `GET /planning/stats`, `GET /notas`, `GET /proyectos/roles-colaboracion`, `GET /planning/pending`, `GET /planning/approvals`, `GET /tareas/solicitud-cambio/pendientes`, `GET /proyectos/205` y `POST /planning/check-permission`.
- También quedaron alineados en vivo: `POST /auth/config`, `POST /notas`, `PATCH /notas/:id`, `DELETE /notas/:id`, `POST /tareas/rapida` (payload válido) y `DELETE /tareas/:id`.
- También quedaron alineados en vivo: `POST /tasks`, `POST /checkins`, `POST /mi-dia/checkin` y `GET /mi-dia`, incluyendo comparación de side effects en BD para arranque automático de tareas `Entrego`.
- También quedaron alineados en vivo: `POST /auth/login`, `GET /config` y `POST /config`.
- También quedaron alineados en vivo: `POST /planning/tasks/:id/avance-mensual`, `GET /planning/tasks/:id/avance-mensual`, `POST /planning/tasks/:id/crear-grupo`, `POST /planning/tasks/:id/agregar-fase` y `GET /planning/grupos/:idGrupo`.
- También quedaron alineados en vivo: `GET /planning/stats/performance`, `GET /planning/stats/bottlenecks` y `POST /planning/update-operative`.
- Revalidación real del 2026-03-28: `GET /planning/stats/performance` y `GET /planning/stats/bottlenecks` ya devuelven datos en Rust con el mismo token real usado contra Nest, cerrando el falso positivo anterior.
- Revalidación real del 2026-03-28: `GET /planning/plans?mes=3&anio=2026&idUsuario=23` volvió a quedar alineado en vivo con Nest tras corregir `sp_Planning_ObtenerPlanDetalle_rust` para usar `p_PlanesTrabajo` en lugar de `p_Planes`.
- Revalidación real del 2026-03-28: `GET /planning/workload` volvió a quedar alineado con Nest usando el formato ISO completo que manda el frontend (`startDate=2026-03-24T00:00:00.000Z`, `endDate=2026-03-30T23:59:59.000Z`), con coincidencia exacta en esa muestra viva: `users=43`, `tasks=1975`, `agenda=39`.
- Revalidación real del 2026-03-28: `GET /recordatorios`, `POST /tareas/:id/recordatorio`, `DELETE /recordatorios/:id` y `GET /tareas/:id/recurrencia` ya funcionan en Rust con login real. La prueba viva creó y limpió un recordatorio temporal sobre la tarea `235`, sin residuo final.
- Smoke real del 2026-03-28 en módulos activos del frontend: `GET /marcaje/admin/devices`, `GET /marcaje/admin/config`, `GET /marcaje/admin/ips`, `GET /visita-campo/clientes`, `GET /visita-campo/usuarios-tracking`, `GET /visita-admin/visitas`, `GET /visita-admin/dashboard`, `GET /visita-admin/metas` y `GET /campo/recorrido/admin` ya responden `200` en Rust después de instalar los wrappers `_rust`; se eliminó así el fallo por procedures faltantes en esos bloques.
- Corrección posterior del 2026-03-28: esos wrappers `_rust` no bastaban; varios seguían apoyándose en procedures base inexistentes o en `rrhh.Colaboradores`, tabla ausente en esta BD. Se reescribieron como procedures reales sobre `marcaje_*`, `vc_*`, `campo_*` y `p_Usuarios`, con lo que `GET /marcaje/admin/devices`, `GET /marcaje/admin/config`, `GET /visita-admin/metas`, `GET /campo/recorrido/admin` y `GET /visita-admin/dashboard` quedaron funcionales en Rust sin depender de objetos faltantes.
- Revisión viva inicial del 2026-03-28 sobre backlog principal: `GET /acceso/delegacion`, `GET /acceso/permiso-area` y `GET /acceso/permiso-empleado` ya devolvieron el mismo tipo de resultado y la misma cardinalidad en Nest y Rust.
- Cierre vivo adicional del 2026-03-28 en `acceso`: `POST /acceso/delegacion`, `POST /acceso/permiso-area` y `POST /acceso/permiso-empleado` ya devuelven `400` equivalentes a Nest en escenarios inválidos; `DELETE /acceso/delegacion/:id`, `DELETE /acceso/permiso-area/:id` y `DELETE /acceso/permiso-empleado/:id` ya responden con el mismo envelope `200` de soft delete.
- Corrección viva adicional del 2026-03-28 en `acceso`: `GET /acceso/organizacion/nodo/:idOrg` y `GET /acceso/organizacion/nodo/:idOrg/preview` ya aceptan `idOrg` como `string` igual que Nest; con `AREA` dejaron de romper en Rust y ahora responden `200` como el backend original.
- Hallazgo operativo del 2026-03-28: las primeras pruebas inválidas contra el Rust viejo sí crearon 2 registros de prueba en la BD compartida (`delegacion id=1` y `permiso-empleado id=6`) porque aún no existía la validación; quedaron desactivados y limpios en la misma tanda.
- Revisión viva inicial del 2026-03-28 sobre `jornada`: el Nest desplegado hoy devolvió `500` en `GET /jornada/asignaciones`, `GET /jornada/horarios` y `GET /jornada/patrones`, mientras Rust ya respondió `200` con datos. Se documenta como mejora funcional sobre un origen roto, no como paridad cerrada contra una referencia sana.
- Mejora adicional del 2026-03-28 en `jornada`: Rust ya sirve `GET /jornada/patrones` con `detalle` completo, `GET /jornada/horarios` con `duracion_horas` numérico y `GET /jornada/asignaciones` con `fecha_fin`, `activo` y `total_dias`; se cerró así el `502` propio que apareció durante esta misma tanda.
- Compare vivo posterior del 2026-03-28: `GET /visita-campo/clientes` quedó alineado en cardinalidad (`4` vs `4`) y `GET /marcaje/admin/devices` quedó alineado (`0` vs `0`). Persisten diferencias abiertas a decidir: el Nest desplegado devuelve vacío en `GET /marcaje/admin/config` mientras Rust devuelve `1` registro real; y el Nest desplegado sigue devolviendo `500` en `GET /visita-admin/visitas`, `GET /visita-admin/metas` y `GET /campo/recorrido/admin`, mientras Rust ya responde `200`.
- Hallazgo vivo del 2026-03-28: `GET /planning/stats/compliance?mes=3&anio=2026` responde `500` en el Nest desplegado por un error SQL de origen (`Incorrect syntax near the keyword 'AS'`). No se toma hoy como regresión de Rust ni como bloqueador del corte principal de `portal-planer`.
- También quedaron alineados en vivo: `POST /proyectos`, `PATCH /proyectos/:id`, `DELETE /proyectos/:id` y `GET /proyectos/:id`, incluyendo validación del soft delete (`estado = Cancelado`).
- En `POST /tareas/rapida` con payload inválido también quedó alineado el wrapper de validación base (`400`, `errorCode`, `message[]`, `timestamp`); la única diferencia observada en comparación localhost-vs-localhost es el prefijo natural del campo `path` (`/Planer_api/...` en Nest y `/api/...` en Rust) por el montaje distinto de cada backend.
- En los aliases legacy, `POST /tasks` y `POST /mi-dia/checkin` quedaron certificados; en el entorno Nest activo del 2026-03-27, `POST /notes` respondió `404`, por lo que no se considera bloqueador de paridad del frontend actual.
- Al 2026-03-28, `notes/notas` queda fuera del alcance activo por decisión funcional: no bloquea el corte REST de `portal-planer` y se perfila para eliminación futura.
- El backlog histórico pendiente dentro del alcance activo quedó reducido a 8 endpoints reales y documentado por módulo en `06_BACKLOG_HISTORICO_DEPURADO.md`.
- Sigue pendiente la certificación funcional del backlog restante del frente principal de `portal-planer`: `jornada`.
- `marcaje web`, `campo/recorrido` y `visita-cliente/suite` pasan a fase 2 experimental y no bloquean el hito principal mientras sigan fuera del uso diario productivo.
- Prueba segura paralela preparada el 2026-03-28 sin tocar el frontend principal: frontend estático en `/portal/planer-rust/` y proxy API en `/api-portal-planer-rust/` hacia `backendrust` (`127.0.0.1:3100/api/`). El login real por esa ruta ya respondió `200`.
- `backendrust` ya quedó registrado y persistido en PM2 como `portal-planer-rust`; al 2026-03-28 mostró `18.6 MB` recién arrancado y `45.5 MB` después de uso real del frontend, muy por debajo del Nest principal (`~540 MB`).
- Post-cierre ya definido: cuando `backendrust` quede `100%` en `porta-planer`, se replica a `/opt/apps/clima-portal/backendrust`, tomando como fuente de configuración `/opt/apps/clima-portal/clima-api-nest/.env` en lugar del `.env` de `porta-planer`.
- Contexto confirmado de clima para ese paso futuro: el backend Nest activo vive en `/opt/apps/clima-portal/clima-api-nest` y hoy usa `PORT=3025`; el pase a Rust se hará primero en paralelo con puertos dedicados antes de cualquier corte.


## Rutas extra en Rust

- `GET` `/_migration/breakdown`
- `GET` `/_migration/progress`
- `GET` `/_migration/status`
- `ANY` `/*tail`
- `GET` `/visibilidad/organizacion/:idorg/subarbol`

## Módulos y tamaño HTTP

- `acceso`: 28 endpoints HTTP, 2 controller(s)
- `admin`: 32 endpoints HTTP, 4 controller(s)
- `app.controller.ts`: 1 endpoints HTTP, 1 controller(s)
- `auth`: 8 endpoints HTTP, 1 controller(s)
- `campo`: 8 endpoints HTTP, 1 controller(s)
- `clarity`: 87 endpoints HTTP, 11 controller(s)
- `common`: 6 endpoints HTTP, 1 controller(s)
- `diagnostico`: 5 endpoints HTTP, 1 controller(s)
- `jornada`: 11 endpoints HTTP, 1 controller(s)
- `marcaje`: 29 endpoints HTTP, 1 controller(s)
- `planning`: 30 endpoints HTTP, 2 controller(s)
- `software`: 1 endpoints HTTP, 1 controller(s)
- `visita-cliente`: 23 endpoints HTTP, 2 controller(s)

## Archivos con mayor densidad de SP

- `acceso/acceso.repo.ts`: 29 SPs (sp_DelegacionVisibilidad_Crear, sp_DelegacionVisibilidad_Desactivar, sp_DelegacionVisibilidad_ListarActivas, sp_DelegacionVisibilidad_ListarPorDelegante, sp_DelegacionVisibilidad_ObtenerActivas, sp_Organizacion_BuscarNodoPorId, ...)
- `clarity/clarity.repo.ts`: 18 SPs (sp_Checkin_Upsert_v2, sp_Checkins_ObtenerPorEquipoFecha, sp_Checkins_ObtenerPorUsuarioFecha, sp_Equipo_ObtenerHoy, sp_Equipo_ObtenerInforme, sp_Nota_Actualizar, ...)
- `marcaje/marcaje.service.ts`: 15 SPs (sp_marcaje_admin_crud_ip, sp_marcaje_admin_crud_site, sp_marcaje_admin_device, sp_marcaje_admin_eliminar, sp_marcaje_admin_reiniciar, sp_marcaje_dashboard_kpis, ...)
- `planning/planning.repo.ts`: 10 SPs (sp_ObtenerProyectos, sp_Plan_Cerrar, sp_Planning_ObtenerPlanes, sp_Planning_ObtenerProyectosAsignados, sp_Proyecto_ObtenerVisibles, sp_Proyectos_Gestion, ...)
- `colaboradores/colaboradores.repo.ts`: 6 SPs (sp_ProyectoColaboradores_Actualizar, sp_ProyectoColaboradores_Invitar, sp_ProyectoColaboradores_LimpiarExpirados, sp_ProyectoColaboradores_Listar, sp_ProyectoColaboradores_Revocar, sp_ProyectoColaboradores_VerificarPermiso)
- `visita-cliente/visita-admin.service.ts`: 6 SPs (sp_vc_agenda_crear, sp_vc_agenda_eliminar, sp_vc_agenda_listar, sp_vc_agenda_reordenar, sp_vc_meta_listar, sp_vc_meta_set)
- `admin/admin.repo.ts`: 4 SPs (sp_Admin_ReporteInactividad, sp_Admin_Usuario_Crear, sp_Admin_Usuario_Eliminar, sp_Admin_Usuario_RemoverNodo)
- `visita-cliente/repos/cliente.repo.ts`: 4 SPs (sp_vc_cliente_actualizar, sp_vc_cliente_crear, sp_vc_cliente_eliminar, sp_vc_importar_clientes)

## Archivos con mayor densidad de SQL directo

- `planning/planning.repo.ts`: tablas TareasEquipo, con, dbo.p_CheckinTareas, dbo.p_Checkins, dbo.p_Proyectos, dbo.p_TareaAsignados, dbo.p_Tareas, dbo.p_Usuarios, ...
- `clarity/clarity.repo.ts`: tablas STRING_SPLIT, p_Bloqueos, p_CheckinTareas, p_Checkins, p_Notas, p_Proyectos, p_TareaAsignados, p_Tareas, ...
- `admin/admin.repo.ts`: tablas p_Logs, p_OrganizacionNodos, p_Proyectos, p_Roles, p_SeguridadPerfiles, p_Tareas, p_Usuarios, p_UsuariosConfig, ...
- `clarity/tasks.repo.ts`: tablas Base, p_Proyectos, p_TareaAsignados, p_TareaAvances, p_TareaRecordatorios, p_Tareas, sys.tables
- `marcaje/marcaje.service.ts`: tablas marcaje_asistencias, marcaje_devices, marcaje_ip_whitelist, marcaje_sites, marcaje_solicitudes, marcaje_usuario_geocercas, rrhh.Colaboradores
- `clarity/equipo.service.ts`: tablas STRING_SPLIT, p_Bloqueos, p_Proyectos, p_TareaAsignados, p_Tareas, p_Usuarios
- `clarity/reports.service.ts`: tablas STRING_SPLIT, p_Bloqueos, p_Proyectos, p_TareaAsignados, p_Tareas, p_Usuarios
- `planning/analytics.service.ts`: tablas p_Bloqueos, p_PlanesTrabajo, p_Proyectos, p_TareaAsignados, p_Tareas, p_Usuarios

## Siguiente lectura

- `01_INVENTARIO_API_V2BACKEND.md`
- `02_INVENTARIO_CONSULTAS_Y_SP_V2BACKEND.md`
- `03_BRECHAS_BACKENDRUST_VS_V2BACKEND.md`
- `04_PLAN_DE_TRABAJO.md`
- `05_CHECKLIST_AVANCES.md`
