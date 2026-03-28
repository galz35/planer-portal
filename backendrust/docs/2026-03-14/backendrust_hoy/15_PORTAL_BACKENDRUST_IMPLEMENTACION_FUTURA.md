# Portal Y Backendrust Implementacion Futura

Fecha: 2026-03-14

## Objetivo

Definir la implementacion futura para que `backendrust` de planificacion funcione dentro de `portal` sin pedir doble login, pero sin romper el backend actual ni obligar a una reescritura completa.

## Principio Arquitectonico

A futuro:

- `portal` debe ser el proveedor de identidad
- `backendrust` debe ser consumidor de identidad
- `planer-web` debe iniciar sesion una sola vez a traves de portal

No se recomienda intentar resolver esto quitando JWT de `backendrust` de golpe.

La via mas segura es:

- mantener JWT interno corto en `backendrust`
- obtenerlo mediante un bridge desde la sesion de portal

## Modelo Recomendado

### Fase 1. Bridge de autenticacion

Agregar un endpoint nuevo en `backendrust`:

- `POST /auth/portal/exchange`

Flujo:

1. usuario inicia sesion en `portal`
2. portal entrega cookies:
   - `portal_sid`
   - `portal_refresh`
   - `portal_csrf`
3. `planer-web` confirma sesion usando `GET /api/auth/me`
4. `planer-web` llama `POST /auth/portal/exchange`
5. `backendrust` valida la sesion con `portal /api/auth/introspect`
6. si hay acceso a `planer`, `backendrust` emite un access token corto propio
7. el frontend usa ese token para el resto de endpoints de planificacion

### Fase 2. Desactivar login local en produccion

Una vez estable el exchange:

- ocultar login local al usuario normal
- dejar `POST /auth/login` solo como fallback operativo o modo dev

### Fase 3. Unificacion opcional

Si mas adelante se quiere:

- evaluar abandonar JWT interno
- o mantenerlo solo como token tecnico derivado

## Por que esta opcion es la correcta

Porque `backendrust` hoy protege casi toda su API con `AuthUser` y `Bearer JWT`.

Reescribir todo para sesion por cookies desde el inicio seria mas caro y mas riesgoso.

Con un exchange:

- se elimina el doble login
- se reaprovecha casi toda la seguridad ya existente en Rust
- el frontend cambia poco
- el rollout es reversible

## Contrato Recomendado De `POST /auth/portal/exchange`

### Request

Metodo:

- `POST`

Headers esperados:

- `cookie` con cookies de portal
- opcional `x-csrf-token` si se decide exigirlo para introspection fuerte

Body recomendado:

```json
{
  "returnUrl": "/app/planer"
}
```

Notas:

- `returnUrl` es opcional
- la identidad no debe venir en el body
- no aceptar `correo`, `carnet`, `rol`, `apps` enviados por frontend como verdad

### Respuesta exitosa sugerida

Debe parecerse al contrato actual de auth en Rust/Nest:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt_corto_backendrust",
    "refresh_token": null,
    "user": {
      "idUsuario": 23,
      "nombre": "Juan Perez",
      "correo": "juan@empresa.com",
      "carnet": "500708",
      "rol": null,
      "rolGlobal": "LEADER",
      "pais": "NI",
      "idOrg": 10,
      "cargo": "Supervisor",
      "departamento": "Operaciones",
      "subordinateCount": 3,
      "menuConfig": {
        "profileType": "LEADER"
      }
    },
    "source": "portal"
  },
  "message": null,
  "errorCode": null,
  "statusCode": 200,
  "timestamp": "2026-03-14T00:00:00Z",
  "path": "/auth/portal/exchange"
}
```

Notas:

- puedes omitir `refresh_token` o devolver `null`
- si decides mantener refresh propio, que sea corto y solo tecnico

### Errores recomendados

#### 401

- sesion portal no valida
- sesion portal expirada
- cookies ausentes

#### 403

- usuario autenticado en portal pero sin acceso a `planer`
- usuario existe en portal pero no existe o no esta activo en `p_Usuarios`

#### 500

- error de llamada a portal
- error SQL al resolver usuario local

## Llamada Server To Server Requerida

`backendrust` debe llamar a portal:

- preferido: `POST /api/auth/introspect`
- alternativo: `GET /api/auth/me`

Recomendacion:

- usar `introspect`
- porque devuelve sesion + identidad
- y esta pensado para validacion backend

### Respuesta relevante que `backendrust` debe consumir

Campos utiles:

- `authenticated`
- `session.idSesionPortal`
- `session.idCuentaPortal`
- `identity.usuario`
- `identity.nombre`
- `identity.correo`
- `identity.carnet`
- `identity.apps`
- `identity.permisos`

### Regla de acceso a planificacion

Permitir exchange solo si:

- `identity.apps` contiene `planer`
  o
- `identity.permisos` contiene `app.planer`

## Variables De Entorno Nuevas Recomendadas

Para `backendrust`:

- `AUTH_MODE=local|dual|portal_bridge`
- `PORTAL_AUTH_BASE_URL=http://127.0.0.1:8082`
- `PORTAL_TIMEOUT_MS=4000`
- `PORTAL_REQUIRE_CSRF=false`

Comportamiento sugerido:

### `AUTH_MODE=local`

- solo login local

### `AUTH_MODE=dual`

- login local activo
- exchange portal activo
- mejor modo para rollout inicial

### `AUTH_MODE=portal_bridge`

- se privilegia portal
- login local queda como fallback interno o deshabilitado para usuarios finales

## Archivos Que Habria Que Tocar En Backendrust

### Configuracion y estado

- `src/config.rs`
- `src/state.rs`

Agregar:

- config de portal
- modo de auth
- cliente http compartido opcional

### Auth

- `src/router.rs`
- `src/handlers/auth.rs`
- `src/auth.rs`
- `src/security.rs`

Agregar:

- ruta `POST /auth/portal/exchange`
- request/response DTOs
- politica de auth mixta durante transicion

### Integracion nueva

Crear modulo nuevo sugerido:

- `src/services/portal_sso.rs`
  o
- `src/integrations/portal_auth.rs`

Responsabilidades:

- reenviar cookies a portal
- llamar `introspect`
- parsear identidad
- decidir acceso `planer`
- devolver identidad lista para mapping local

### Mapping local de usuario

En `src/handlers/auth.rs` o repo dedicado:

- resolver por `carnet`
- fallback por `correo`
- validar `activo = 1`
- reutilizar `resolve_menu_config`
- reutilizar `load_subordinate_count`

## Cambios Requeridos En Frontend

En `planer-web`:

- `src/app/auth/SessionBootstrap.tsx`
- `src/shared/api/coreSessionApi.ts`
- cliente API de planning

### Flujo nuevo recomendado

1. `getMe()` contra portal
2. si no hay sesion:
   - redirect a `/login-empleado?returnUrl=/app/planer`
3. si hay sesion pero no acceso:
   - redirect a `/sin-acceso`
4. si hay sesion y acceso:
   - llamar `POST /auth/portal/exchange`
5. guardar token corto de planning solo en memoria
6. usar `Authorization: Bearer <token>`

### Manejo de expiracion

Si `backendrust` responde `401`:

1. reintentar `portal/exchange` una vez
2. si vuelve a fallar:
   - preguntar otra vez a portal con `getMe()`
   - si ya no hay sesion, redirigir a login portal

## Seguridad

### Reglas obligatorias

- nunca confiar en identidad enviada por JS
- siempre validar portal desde backend
- emitir token corto de planning
- registrar auditoria de exchange exitoso y fallido
- no usar `localStorage` si puede evitarse
- preferir memoria del frontend

### Sobre CSRF

Si `portal /api/auth/introspect` requiere CSRF para el exchange:

- el frontend puede reenviar el valor de `portal_csrf`
- `backendrust` reenvia `x-csrf-token` a portal

Si no se exige en esta fase:

- usar `requireCsrf=false` inicialmente
- endurecer despues

## Logging y Auditoria Recomendados

Registrar eventos nuevos en `backendrust`:

- `PORTAL_EXCHANGE_ATTEMPT`
- `PORTAL_EXCHANGE_SUCCESS`
- `PORTAL_EXCHANGE_FORBIDDEN`
- `PORTAL_EXCHANGE_UNAUTHORIZED`
- `PORTAL_EXCHANGE_ERROR`

Detalles utiles:

- `correo`
- `carnet`
- `idCuentaPortal`
- `idSesionPortal`
- `ip`
- `userAgent`
- `authMode`

## Rollout Recomendado

### Etapa 1

- implementar exchange
- activar `AUTH_MODE=dual`
- no quitar login local

### Etapa 2

- frontend usa exchange
- login local solo para contingencia

### Etapa 3

- medir errores y expiraciones
- ajustar TTL del token de planning

### Etapa 4

- ocultar login local en produccion
- dejar portal como auth principal

## Rollback

Si falla el bridge:

- volver a `AUTH_MODE=local`
- frontend temporalmente vuelve al login local

Esto hace la migracion reversible y segura.

## Que no recomiendo

- no recomiendo quitar JWT de planning de golpe
- no recomiendo confiar en `getMe()` del frontend como unica validacion
- no recomiendo reescribir todos los handlers para sesion cookie nativa en la primera etapa

## Orden Correcto De Trabajo

1. terminar `backendrust` local contra Nest
2. despues implementar `portal/exchange`
3. despues integrar `planer-web`
4. despues certificar runtime y rollout

## Conclusion

La integracion futura correcta no es "otro login invisible".

La integracion correcta es:

- portal autentica
- backendrust verifica portal
- backendrust emite un token tecnico corto
- el frontend trabaja como si fuera un backend unico

Eso elimina doble login con el menor riesgo tecnico posible.

