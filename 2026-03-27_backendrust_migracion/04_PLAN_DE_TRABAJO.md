# Plan de Trabajo

Fecha base: 2026-03-27

## Decisión vigente

- `backendrust` se deja con `API REST/HTTP` como interfaz principal.
- `gRPC` queda fuera del alcance inmediato y se retoma solo después de cerrar la paridad total del backend REST.
- La migración de datos se orienta a `stored procedures` como estándar de cierre.
- Regla operativa: `0 SQL de negocio en handlers`. La lógica SQL debe vivir en SP legacy compartidos o en nuevos `sp_*_rust`.

## Objetivo

- reemplazar `v2backend` por `backendrust` sin que el frontend note el cambio.
- dejar el backend REST funcional al `100%` por contrato HTTP, permisos, side effects y acceso a datos.
- mover el acceso a datos crítico a procedures para acelerar mantenimiento, reducir regresiones y evitar duplicación NestJS/Rust.

## Principios de trabajo

- `REST-first`: primero se certifica lo que ya usa React y lo que hoy existe en NestJS.
- `SP-first`: escrituras, aprobaciones, visibilidad, cierres y flujos críticos deben quedar en procedures.
- `SP-bootstrap-first`: si Rust va a invocar un `sp_*_rust`, ese procedure se crea o altera antes del primer compare vivo.
- `Parity-first`: se preserva comportamiento observable antes de refactors estéticos.
- `One source of truth`: NestJS actual define el contrato objetivo hasta completar la sustitución.
- `gRPC later`: no se abre trabajo de migración gRPC mientras REST no esté certificado.
- `Scope discipline`: `notes/notas` queda fuera del alcance activo mientras no bloquee React y se perfila para retiro futuro.
- `Experimental later`: `marcaje web` y `visita-cliente/suite` quedan como fase 2 mientras sigan siendo módulos experimentales y no bloqueen el corte principal de `portal-planer`.

## Fase 0. Congelación de alcance y reglas

Subfase 0.1

- fijar formalmente `REST` como camino principal de migración.
- congelar inventario HTTP, SPs, SQL directo y módulos críticos.
- artefactos base: `01_INVENTARIO_API_V2BACKEND.md`, `02_INVENTARIO_CONSULTAS_Y_SP_V2BACKEND.md`, `03_BRECHAS_BACKENDRUST_VS_V2BACKEND.md`.

Subfase 0.2

- definir la política `SP-first` del proyecto.
- clasificar queries actuales en tres grupos: `ya en SP`, `migrar a SP _rust`, `temporal y pendiente de eliminar`.
- prohibir SQL nuevo de negocio dentro de handlers.

Subfase 0.3

- priorizar por criticidad real del frontend, uso diario y riesgo de side effects.
- mantener `gRPC` solo como backlog futuro, no como frente activo.

## Fase 1. Capa SQL Server por procedures

Subfase 1.1

- inventariar todo SQL inline restante en `backendrust`.
- mover primero escrituras, aprobaciones, cambios de estado, accesos por visibilidad y lecturas multi-join a procedures.

Subfase 1.2

- crear procedures `_rust` cuando Rust necesite contrato o comportamiento distinto sin romper legacy.
- reutilizar SP legacy existentes cuando ya representen la verdad del negocio.
- default operativo: `CREATE OR ALTER PROCEDURE`; si la firma vieja puede dejar basura o confusión, usar `DROP/CREATE` de forma explícita en el script de paridad.

Subfase 1.3

- estandarizar nombres y alcance:
- shared legacy: `sp_*`.
- adaptadores de migración: `sp_*_rust`.
- dejar documentado qué handler usa qué SP.

Subfase 1.4

- objetivo técnico de cierre: acceso a datos crítico del backend REST por procedures.
- SQL residual permitido solo de forma temporal y documentada hasta ser absorbido por SP antes del cierre `100%`.

## Fase 2. Auth y sesión REST

Subfase 2.1

- certificar `POST /auth/login`, `POST /auth/refresh`, `POST /auth/change-password`, `GET /auth/config` y `POST /auth/config`.

Subfase 2.2

- certificar `POST /auth/sso-login`, `POST /auth/portal-session` y `POST /auth/sso-sync-user`.

Subfase 2.3

- cerrar side effects: refresh token hash, `ultimoLogin`, auditoría, menú y configuración.

## Fase 3. Tareas, planning y proyectos REST

Subfase 3.1

- cerrar contratos críticos ya usados por frontend:
- `GET /tareas/mias`
- `PATCH /tareas/:id`
- `POST /tareas/rapida`
- `POST /tasks/:id/clone`
- `POST /planning/check-permission`
- `POST /planning/request-change`
- `GET /planning/approvals`
- `POST /planning/approvals/:idSolicitud/resolve`
- `GET /planning/workload`
- `GET /planning/my-projects`
- `GET /planning/mi-asignacion`
- `GET /proyectos/:id`

Subfase 3.2

- certificar bloqueos, solicitud de cambios, colaboradores, historial, avances mensuales, grupos, fases y planes.

Subfase 3.3

- mover a procedures cualquier write path o validación compleja que todavía dependa de SQL inline.

## Fase 4. Módulos secundarios pero obligatorios

Subfase 4.1

- `mi-dia`, `recordatorios` y aliases legacy que sigan afectando React.
- `notes/notas` queda fuera del alcance activo salvo que reaparezca como dependencia real del frontend.

Subfase 4.2

- `acceso`, `visibilidad`, `admin` y organización.

Subfase 4.3

- `jornada`.

Subfase 4.4

- `marcaje web`, `campo/recorrido` y `visita-cliente` pasan a fase 2 experimental.
- no bloquean la declaración de `backendrust` al `100%` para el frente principal mientras `portal-planer` no dependa de ellos como flujo crítico diario.

## Fase 5. Certificación real con frontend

Subfase 5.1

- capturar payloads reales desde React.
- comparar respuesta Nest vs Rust en cuerpo, códigos HTTP, nullables y arrays vacíos.

Subfase 5.2

- validar side effects en SQL Server para create, update, approve, resolve, delete y clone.
- certificar permisos, jerarquía, visibilidad y auditoría.

Subfase 5.3

- smoke test funcional por módulo.
- certificar que React no note la sustitución de NestJS por Rust.

## Fase 6. Cierre técnico

Subfase 6.1

- ejecutar `cargo check` limpio y pruebas unitarias dirigidas de lógica crítica.
- dejar checklist final de endpoints certificados y procedures usados.

Subfase 6.2

- identificar SQL residual pendiente y eliminarlo antes de declarar `100%`.
- dejar `gRPC` formalmente como fase futura, no como dependencia del corte productivo REST.

## Fase 7. Réplica controlada a clima-portal

Subfase 7.1

- esta fase solo inicia cuando `backendrust` quede `100%` certificado en `porta-planer`.
- fuente de copia: `/opt/apps/porta-planer/backendrust`
- destino previsto: `/opt/apps/clima-portal/backendrust`

Subfase 7.2

- no reutilizar `.env` de `porta-planer`.
- tomar como base el backend activo de clima en `/opt/apps/clima-portal/clima-api-nest/.env`.
- mapear `JWT_SECRET`, SQL Server, `PORTAL_API_URL`, `CORS_ORIGIN`, correo y cualquier flag propia de clima.

Subfase 7.3

- mientras Nest de clima siga activo en `3025`, levantar Rust en puertos paralelos para prueba controlada.
- propuesta inicial para despliegue paralelo:
- REST Rust clima: `3125`
- gRPC Rust clima: `50065`
- los puertos definitivos se confirman al momento del corte para evitar choque con servicios existentes.

Subfase 7.4

- crear nombre de proceso independiente en PM2 para clima.
- ajustar frontend `clima-portal/v2frontend` para apuntar al backend Rust de clima solo en entorno de prueba.
- no tocar el frontend principal de clima hasta que la prueba paralela esté certificada.

Subfase 7.5

- documentar diferencias de entorno, ajustes de `.env`, puertos, rutas proxy, PM2 y hallazgos específicos de clima.
- dejar cierre final en documentación Rust de `/root/rust` para que el patrón se reutilice en futuros clones.

## Backlog explícito para después

- investigar `Flutter + gRPC` cuando REST ya esté cerrado.
- rediseñar el servidor gRPC reutilizando la misma capa de negocio y la misma base de procedures.
- evaluar si conviene `grpc-web/Connect` para web o si React debe seguir únicamente por REST.
- retomar `marcaje web`, `campo/recorrido` y `visita-cliente` como fase 2 una vez cerrado el núcleo productivo de `portal-planer`.

## Definición de terminado

Un módulo solo se marca `100%` cuando cumple todo esto:

- contrato HTTP igual o compatible con NestJS.
- permisos y visibilidad certificados.
- side effects SQL verificados.
- acceso a datos crítico resuelto por procedures.
- frontend funcionando sin ajustes por cambio de tecnología.
