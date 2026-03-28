# Plan Portal -> Planificacion Sin Doble Login

Fecha: 2026-03-14

## Objetivo

Definir como integrar `planificacion` dentro de `portal` para que el usuario inicie sesion una sola vez en portal y luego pueda usar `planer-web` y `backendrust` sin login adicional.

Este documento no cubre compilacion ni pruebas. Eso queda diferido a Gemini, por instruccion del usuario.

## Resumen Ejecutivo

Hoy el doble login ocurre porque el frontend de planificacion ya reconoce la sesion de portal, pero el backend Rust de planificacion sigue exigiendo su propio `JWT Bearer`.

En otras palabras:

- `portal` autentica con sesion en servidor + cookies `portal_sid`, `portal_refresh`, `portal_csrf`.
- `backendrust` autentica con `Authorization: Bearer <jwt>`.
- `planer-web` ya consulta `GET /api/auth/me` de portal con `credentials: include`.
- Pero cuando `planer-web` llama a `backendrust`, ese backend no sabe usar la sesion de portal; solo entiende JWT local.

Conclusión:

- No hay que resolver otra pantalla de login.
- Hay que resolver el puente de autenticacion entre `portal` y `backendrust`.

## Estado Actual Comparado

### 1. Portal

Flujo actual de autenticacion en `core-api`:

- `POST /api/auth/login-empleado`
- `GET /api/auth/me`
- `POST /api/auth/introspect`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/session-state`

Caracteristicas:

- Sesion persistida en base de datos.
- Cookies `HttpOnly` para sesion y refresh.
- Cookie CSRF separada.
- Resolucion de usuario actual por sesion, no por Bearer token.
- Autorizacion por `apps` y `permisos`.

Archivos clave:

- `D:\portal\core\core-api\src\modules\auth\http\handlers.rs`
- `D:\portal\core\core-api\src\shared\seguridad\cookies.rs`

### 2. Planificacion Nest en produccion

Flujo actual de autenticacion en `v2backend`:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/change-password`
- endpoints protegidos por `AuthGuard('jwt')`

Caracteristicas:

- `Authorization: Bearer <token>`.
- `refreshTokenHash` en SQL.
- Login local propio.
- El frontend espera token de acceso para llamar endpoints protegidos.

Archivos clave:

- `D:\planificacion\v2sistema\v2backend\src\auth\auth.service.ts`
- `D:\planificacion\v2sistema\v2backend\src\auth\jwt.strategy.ts`

### 3. Planificacion Rust (`backendrust`)

Flujo actual de autenticacion:

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/change-password`
- extractores `AuthUser` que exigen header `Authorization`

Caracteristicas:

- Tambien usa login local propio.
- Tambien emite access token + refresh token.
- Tambien guarda `refreshTokenHash` en SQL.
- La mayoria de handlers protegidos esperan `AuthUser`.

Archivos clave:

- `D:\planificacion\rustsistema\backendrust\src\auth.rs`
- `D:\planificacion\rustsistema\backendrust\src\handlers\auth.rs`
- `D:\planificacion\rustsistema\backendrust\src\router.rs`

### 4. Frontend de planificacion dentro del portal

`planer-web` ya esta pensado para vivir dentro de portal:

- consulta `GET /api/auth/me`
- usa `credentials: include`
- redirige a `/login-empleado?returnUrl=/app/planer`
- valida acceso con `apps.includes("planer") || permisos.includes("app.planer")`

Archivos clave:

- `D:\portal\planer\planer-web\src\shared\api\coreSessionApi.ts`
- `D:\portal\planer\planer-web\src\app\auth\SessionBootstrap.tsx`

## Causa Exacta Del Doble Login

El problema no es la UI de login.

El problema real es este:

1. El usuario entra a portal y obtiene cookies de sesion.
2. `planer-web` detecta correctamente que el usuario ya esta autenticado en portal.
3. Pero `backendrust` no acepta esa sesion; solo acepta un JWT local de planificacion.
4. Entonces el usuario debe autenticarse otra vez en planificacion para obtener ese JWT.

Mientras `backendrust` siga dependiendo de `Bearer JWT` propio para todos sus endpoints protegidos, el doble login no desaparece.

## Meta Correcta

La meta no debe ser "hacer otro login silencioso".

La meta correcta es:

- `portal` se vuelve la fuente de verdad de identidad.
- `planificacion` se vuelve una aplicacion consumidora de identidad.
- el usuario inicia sesion una sola vez en portal.
- `backendrust` acepta acceso derivado de la sesion valida de portal.

## Opciones De Integracion

### Opcion A. `backendrust` valida directamente la sesion de portal en cada request

Flujo:

1. El frontend manda requests a `backendrust` con cookies de portal.
2. `backendrust` llama a `portal /api/auth/introspect` en cada request o en requests protegidos.
3. Si portal responde autenticado y con acceso a `planer`, se procesa la peticion.

Ventajas:

- Modelo mas limpio a largo plazo.
- Una sola fuente de autenticacion real.
- Se elimina dependencia del JWT propio de planificacion.

Desventajas:

- Requiere tocar el extractor `AuthUser` o meter un middleware nuevo para casi toda la API.
- Impacta muchos handlers porque hoy todos esperan claims JWT locales.
- Aumenta acoplamiento directo request-a-request con portal.

Veredicto:

- Es la mejor arquitectura final.
- No es la mejor primera fase si buscas menor riesgo.

### Opcion B. `backendrust` hace intercambio de sesion de portal por token interno de planificacion

Flujo:

1. El usuario entra a portal.
2. `planer-web` confirma sesion con `GET /api/auth/me`.
3. `planer-web` llama un nuevo endpoint de `backendrust`, por ejemplo `POST /auth/portal/exchange`, enviando cookies de portal.
4. `backendrust` valida la sesion contra portal por `POST /api/auth/introspect`.
5. Si el usuario tiene acceso a `planer`, `backendrust` emite su JWT interno de corta duracion.
6. El frontend usa ese JWT interno para llamar el resto de endpoints de planificacion.

Ventajas:

- Cambia poco el backend protegido actual.
- Reaprovecha `AuthUser` y casi toda la API existente.
- Quita el doble login sin reescribir todos los handlers.
- Es el camino de menor riesgo para migracion.

Desventajas:

- Mantiene dos modelos de auth durante la transicion:
  portal session como identidad fuente
  planning JWT como token derivado
- Hay que definir expiracion, refresh y logout entre ambos sistemas.

Veredicto:

- Es la opcion recomendada para fase 1.

### Opcion C. Reemplazar todo por cookies/sesion server-side tambien en `backendrust`

Flujo:

- `backendrust` deja de emitir JWT y usa su propia sesion o reutiliza la de portal.

Ventajas:

- Uniformidad con portal.

Desventajas:

- Requiere reescribir mucho mas codigo.
- Rompe compatibilidad inmediata con el frontend/Nest actual.
- No es la via rapida.

Veredicto:

- No recomendada para la primera migracion.

## Recomendacion Final

Implementar dos fases:

### Fase 1. Puente estable sin doble login

Usar `portal` como Identity Provider y `backendrust` como consumidor, mediante un endpoint de intercambio.

Objetivo:

- El usuario inicia sesion solo en portal.
- `planer-web` obtiene un token interno de `backendrust` sin pedir credenciales otra vez.
- El resto de la API de `backendrust` sigue funcionando casi igual que hoy.

### Fase 2. Unificacion completa

Cuando `backendrust` este estable y el frontend ya no dependa del login local:

- deshabilitar login local en produccion
- dejarlo solo para desarrollo/contingencia
- evaluar migrar de token puente a validacion directa de sesion portal

## Arquitectura Objetivo Recomendada

### Flujo de login unico

1. El usuario entra a portal con `POST /api/auth/login-empleado`.
2. Portal entrega:
   - `portal_sid`
   - `portal_refresh`
   - `portal_csrf`
3. `planer-web` arranca y llama `GET /api/auth/me`.
4. Si el usuario tiene acceso a `planer`, `planer-web` llama `POST /auth/portal/exchange` en `backendrust`.
5. `backendrust` reenvia validacion a portal con `POST /api/auth/introspect` o `GET /api/auth/me`.
6. `backendrust` verifica:
   - sesion portal valida
   - acceso a app `planer`
   - usuario local de planificacion existente y activo
7. `backendrust` emite token interno corto para su propia API.
8. `planer-web` usa ese token en memoria para llamadas posteriores.

### Flujo de refresh recomendado

1. Si vence el token interno de planificacion:
2. `planer-web` llama `POST /auth/portal/exchange` otra vez o `POST /auth/portal/refresh`.
3. `backendrust` vuelve a validar sesion portal.
4. Si portal sigue autenticado, emite nuevo token corto.

Esto evita depender de refresh tokens largos en planificacion cuando el portal ya es la fuente de verdad.

### Flujo de logout recomendado

1. Si el usuario hace logout global desde portal:
   - portal invalida `portal_sid`
   - `planer-web` pierde sesion central
2. El token interno de planning debe expirar pronto o invalidarse explicitamente.
3. Opcional: `planer-web` llama `POST /auth/logout` de `backendrust` al cerrar sesion.

## Cambios Requeridos En `backendrust`

### 1. Mantener login local, pero solo como fallback

No eliminar `POST /auth/login` todavia.

Recomendacion:

- agregar `AUTH_MODE=local|portal_bridge|dual`
- produccion inicial: `dual`
- luego: `portal_bridge`

Esto permite rollback facil.

### 2. Agregar endpoints nuevos para portal bridge

Endpoints recomendados:

- `POST /auth/portal/exchange`
- `POST /auth/portal/logout` o reutilizar `POST /auth/logout`
- `GET /auth/portal/session` opcional para debug interno

Comportamiento de `POST /auth/portal/exchange`:

- recibe request del frontend con cookies de portal
- toma header `cookie`
- llama server-to-server a portal
- valida identidad y acceso
- resuelve usuario local
- emite token corto de planning

### 3. Agregar cliente HTTP hacia portal

`backendrust` ya tiene `reqwest`, por lo que no hace falta meter otra libreria.

Agregar configuracion:

- `PORTAL_AUTH_BASE_URL`
- `PORTAL_TIMEOUT_MS`
- opcional `PORTAL_FORWARD_HOST`

Archivos candidatos:

- `src/config.rs`
- `src/state.rs`
- nuevo modulo `src/services/portal_sso.rs` o `src/integrations/portal_auth.rs`

### 4. Resolver usuario local de planificacion desde identidad de portal

`backendrust` ya puede buscar usuarios por `correo` o `carnet` en `p_Usuarios`.

La resolucion recomendada es:

1. buscar por `carnet`
2. si no existe, buscar por `correo`
3. validar `activo = 1`
4. si no existe usuario local, devolver `403` o `404` de onboarding interno

Regla:

- portal autentica identidad
- planning decide si esa identidad existe y esta autorizada en su propio dominio

### 5. Emitir token interno corto

No usar access token largo para el puente.

Recomendado:

- access token interno de `5 a 15 minutos`
- sin refresh token propio o con refresh muy corto
- permitir re-exchange silencioso contra portal

Esto reduce riesgo si el token de planning se filtra.

### 6. No confiar en el frontend para identidad

El frontend no debe mandar `correo`, `carnet`, `rol`, `apps` como verdad.

Siempre:

- `backendrust` valida con portal server-to-server
- extrae identidad desde respuesta de portal
- decide acceso desde backend

### 7. Mantener compatibilidad con la API actual

La mayor parte de endpoints protegidos puede seguir usando `AuthUser`.

La diferencia es que el token JWT ya no vendra de login manual, sino del bridge con portal.

Eso evita reescribir toda la API en la primera fase.

## Cambios Requeridos En Portal

Portal ya tiene casi todo lo necesario.

Se usaran principalmente:

- `GET /api/auth/me`
- `POST /api/auth/introspect`

Recomendado para `backendrust`:

- preferir `POST /api/auth/introspect`
- porque devuelve estado de autenticacion + sesion + identidad
- y ya esta diseñado para validacion backend

Condicion de acceso a planificacion:

- `apps` contiene `planer`
  o
- `permisos` contiene `app.planer`

Posible mejora futura en portal:

- crear un helper especifico de acceso tipo `identity_has_planer_access`
- hoy ya existe el patron con `identity_has_vacantes_rh_access`

## Cambios Requeridos En `planer-web`

`planer-web` ya tiene la mitad del trabajo.

Lo que ya existe:

- bootstrap de sesion desde portal
- redirect a `/login-empleado`
- validacion de acceso por `apps`/`permisos`

Lo que falta:

1. despues de `getMe()` exitoso, llamar `POST /auth/portal/exchange`
2. guardar el token de planning solo en memoria
3. adjuntar `Authorization: Bearer <token>` en requests a `backendrust`
4. si recibe `401`, reintentar exchange una vez
5. si falla exchange, redirigir a login portal o sin acceso

Importante:

- no usar `localStorage` para el token si puedes evitarlo
- mejor un store en memoria del frontend
- si el usuario recarga la pagina, se vuelve a hacer el exchange silencioso

## Seguridad

### Reglas obligatorias

- Nunca confiar en `getMe()` del frontend como fuente suficiente de identidad.
- La validacion verdadera debe ser server-to-server.
- Verificar acceso a `planer` con `apps`/`permisos` en backend.
- Mantener expiracion corta del token de planning.
- Registrar auditoria de `portal_exchange_success` y `portal_exchange_failed`.
- Bloquear modo debug o backdoor en produccion.

### Riesgos si se implementa mal

- suplantacion si el backend acepta identidad enviada por JS
- sesion desalineada si portal logout no invalida planning bridge
- escalacion de privilegios si solo se valida autenticacion y no acceso a `planer`
- abuso de token si se deja TTL largo o storage persistente inseguro

## Compatibilidad Futura

La integracion futura con portal es viable y esta alineada con la arquitectura correcta.

De hecho, esta es la direccion correcta:

- portal como proveedor de identidad
- planificacion como aplicacion interna autorizada por `apps` y `permisos`

Lo importante es no intentar saltar directo a "sin JWT en planning" si eso obliga a reescribir toda la API de golpe.

Primero:

- bridge con portal
- cero doble login
- frontend sin cambios de UX

Despues:

- decidir si el JWT interno sigue existiendo o si planning valida sesion portal de forma nativa

## Plan De Implementacion Recomendado

### Etapa 1. Preparacion

- introducir `AUTH_MODE`
- introducir configuracion de portal en `backendrust`
- crear servicio `portal_sso`

### Etapa 2. Bridge inicial

- agregar `POST /auth/portal/exchange`
- validar cookies contra `portal /api/auth/introspect`
- mapear usuario local por `carnet/correo`
- emitir token corto de planning

### Etapa 3. Frontend

- al iniciar `planer-web`, hacer `getMe()`
- si hay sesion y acceso, hacer exchange silencioso
- guardar token solo en memoria
- consumir `backendrust` con Bearer token

### Etapa 4. Seguridad y operacion

- auditar exchange y fallos
- definir expiracion corta
- definir logout coordinado
- deshabilitar login local en produccion cuando el exchange quede estable

### Etapa 5. Limpieza futura

- ocultar pantalla de login local para usuarios normales
- dejar fallback solo para dev/soporte
- evaluar migracion posterior a validacion directa de sesion portal

## Estrategia De Rollout

### Modo recomendado

`AUTH_MODE=dual`

Eso significa:

- el login local sigue existiendo
- el exchange con portal tambien existe
- el frontend nuevo usa exchange
- si algo falla, se puede volver temporalmente al login local

### Corte final

Cuando el exchange este estable:

- frontend deja de mostrar login local
- produccion usa `AUTH_MODE=portal_bridge`

## Decision

La mejor solucion para eliminar el doble login sin romper `backendrust` es:

1. mantener el backend Rust con SQL puro y su contrato actual
2. usar `portal` como autenticacion maestra
3. crear un puente de autenticacion `portal -> backendrust`
4. dejar el login local solo como fallback temporal

Eso permite que el frontend apunte a Rust y el usuario sienta que sigue dentro del mismo sistema, sin autenticarse dos veces.

## Proximo Trabajo Recomendado

Orden exacto:

1. documentar contrato del endpoint `POST /auth/portal/exchange`
2. implementar cliente `portal_sso` en `backendrust`
3. resolver mapping `portal identity -> p_Usuarios`
4. integrar `planer-web` al exchange silencioso
5. despues dejar a Gemini la validacion runtime completa

