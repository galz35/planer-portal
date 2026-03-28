# Handoff Gemini Backendrust 2026-03-14

Fecha: 2026-03-14

## Contexto

Este handoff resume el estado real de `backendrust` y lo que se trabajo hoy para que Gemini continue sin repetir analisis ni recompilar a ciegas.

Repos principales:

- Planificacion Rust: `D:\planificacion\rustsistema\backendrust`
- Planificacion Nest produccion: `D:\planificacion\v2sistema\v2backend`
- Portal: `D:\portal\core\core-api`
- Frontend portal de planificacion: `D:\portal\planer\planer-web`

## Decision de alcance

Hoy el trabajo se enfoco en dos frentes:

1. paridad real de `backendrust` contra `v2backend`
2. diseno de integracion futura `Portal -> Planificacion` sin doble login

No se avanzo en integracion productiva con portal. Solo se dejo el plan tecnico.

## Estado Real De Backendrust

Numero honesto para reemplazo de Nest sin tocar frontend:

- `~68%`

Desglose util:

- cobertura de router: `100%`
- endpoints faltantes en router: `0`
- handlers genericos detectados: `0`
- brechas reales de guards vs Nest: `0`
- metrica legacy conservadora: `130 / 264 = 49.2%`
- metrica por `implemented_endpoints.json`: `254 / 264 = 96.2%`

Interpretacion:

- estructuralmente el backend ya esta mucho mas cerca de Nest
- pero la equivalencia funcional certificada endpoint por endpoint todavia no esta cerrada

## Lo Que Ya Quedo Avanzado

- router completo y sin faltantes
- cierre de brechas reales de guards detectadas por auditoria
- mejor alineacion del contrato de `auth` en respuestas positivas
- endurecimiento de auth/JWT respecto a defaults inseguros
- documentacion consolidada dentro de `backendrust/docs/2026-03-14/backendrust_hoy`

## Bloqueo Vivo Mas Importante

`POST /api/auth/login`

Estado observado:

- el servidor entra al handler
- no se dio por cerrado en runtime
- no se debe asumir resuelto sin validacion viva posterior

Esto sigue siendo el bloqueo tecnico principal del backend local de planificacion.

## Hallazgo Clave Sobre Portal

`planer-web` ya esta preparado para portal a nivel frontend:

- llama `GET /api/auth/me`
- usa `credentials: include`
- redirige a `/login-empleado?returnUrl=/app/planer`
- valida acceso por `apps.includes("planer") || permisos.includes("app.planer")`

Pero `backendrust` todavia exige JWT propio.

Eso significa:

- el doble login no nace en la UI
- nace en el backend de planificacion

## Conclusion Arquitectonica

Para eliminar doble login a futuro:

- `portal` debe ser la fuente maestra de identidad
- `backendrust` debe consumir esa identidad
- la primera fase recomendada no es reescribir toda la seguridad
- la primera fase recomendada es un `portal bridge`

## Recomendacion Tecnica Para Portal SSO

No cambiar todo el modelo de auth de golpe.

Implementar primero:

- `POST /auth/portal/exchange` en `backendrust`

Flujo:

1. `planer-web` confirma sesion portal con `GET /api/auth/me`
2. `planer-web` llama `POST /auth/portal/exchange`
3. `backendrust` valida server-to-server con `POST /api/auth/introspect` en portal
4. si la sesion es valida y tiene acceso a `planer`, `backendrust` emite un JWT corto interno
5. el frontend usa ese JWT para el resto de la API de planificacion

Esto evita doble login sin obligar a reescribir todos los handlers protegidos hoy.

## Documentos Que Ya Debes Leer Primero

Dentro de `D:\planificacion\rustsistema\backendrust\docs\2026-03-14\backendrust_hoy`:

- `00_RESUMEN_BACKENDRUST_HOY.md`
- `02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `04_BACKENDRUST_AVANCE_POR_MODULO.md`
- `06_API_POR_API_ESTADO.md`
- `12_PLAN_PORTAL_SSO_PLANIFICACION.md`

Si necesitas la matriz base:

- `planer_paridad/report.md`
- `planer_paridad/endpoint_matrix.csv`

## Archivos De Codigo Mas Importantes Para Continuar

### Backendrust auth

- `src/auth.rs`
- `src/handlers/auth.rs`
- `src/security.rs`
- `src/router.rs`
- `src/config.rs`
- `src/state.rs`

### Backendrust modulos criticos

- `src/handlers/planning.rs`
- `src/handlers/tareas.rs`
- `src/handlers/proyectos.rs`
- `src/handlers/marcaje.rs`
- `src/handlers/jornada.rs`
- `src/handlers/visita.rs`

### Portal auth

- `D:\portal\core\core-api\src\modules\auth\http\handlers.rs`
- `D:\portal\core\core-api\src\shared\seguridad\cookies.rs`

### Frontend portal planificacion

- `D:\portal\planer\planer-web\src\shared\api\coreSessionApi.ts`
- `D:\portal\planer\planer-web\src\app\auth\SessionBootstrap.tsx`

## Lo Que No Debes Asumir

- No asumir que `100% router` significa `100% reemplazo funcional`.
- No asumir que `cargo check` o build limpian el bloqueo del login.
- No asumir que portal SSO ya existe; hoy solo esta documentado.
- No asumir que el frontend puede cambiar a Rust "solo apuntando" hoy.

## Siguiente Bloque Correcto De Trabajo

Orden recomendado:

1. cerrar runtime de `POST /api/auth/login`
2. seguir `API por API` sin reabrir auditoria global innecesaria
3. mantener el foco solo en planificacion
4. dejar portal SSO como linea separada de trabajo, no mezclarla con el cierre de paridad local

## API Por API A Priorizar

Prioridad alta:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/change-password`
- `GET/POST /auth/config`
- `GET /planning/workload`
- `POST /planning/check-permission`
- `GET/POST /planning/plans`
- `GET /planning/stats/bottlenecks`
- `GET /planning/stats/performance`
- `PATCH /tareas/:id`
- `GET /tareas/mias`
- `POST /tareas/rapida`
- `GET/PATCH/DELETE /proyectos/:id`

Prioridad media:

- colaboradores de proyecto
- `jornada` CRUD
- `marcaje` admin
- `acceso` permisos/delegacion
- `visita-admin`
- `notas`

## Si Vas A Empezar Portal SSO

No tocarlo antes de cerrar el login local, salvo que el usuario cambie prioridad.

Si aun asi se empieza:

1. agregar configuracion:
   - `PORTAL_AUTH_BASE_URL`
   - `PORTAL_TIMEOUT_MS`
   - `AUTH_MODE`
2. crear servicio `portal_sso`
3. implementar `POST /auth/portal/exchange`
4. mapear identidad portal a `p_Usuarios`
5. emitir token interno corto

## Restricciones Del Usuario

- no gastar tiempo ahora en `cargo check -q`
- no gastar tiempo ahora en tests largos
- dejar compilacion y test mas profundos para Gemini
- documentar todo en la carpeta de `backendrust`
- mantener el foco en planificacion, no en portal como proyecto principal

## Riesgos Si Continuas Sin Este Orden

- perder tiempo en recompilar sin cerrar contrato
- mezclar paridad local con SSO futuro
- tocar portal antes de cerrar `backendrust`
- vender como listo algo que aun no tiene cierre runtime de login

## Estado Del Handoff

Este handoff deja listo el contexto para continuar con precision:

- paridad actual conocida
- bloqueo real vivo
- arquitectura futura recomendada
- orden de trabajo
- archivos de entrada

La tarea inmediata correcta sigue siendo `backendrust`, no portal.

