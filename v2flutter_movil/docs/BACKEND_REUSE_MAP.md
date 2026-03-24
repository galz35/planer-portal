# Mapa de reutilización de backend actual (NestJS) para Flutter móvil

Este documento aterriza cómo conectar `flutter_movil` con el backend existente sin reescribir lógica de negocio.

## 1) Autenticación
- `POST /auth/login`: inicio de sesión.
- `POST /auth/refresh`: renovación de access token.

### Recomendación móvil
- Access token corto (10-15 min).
- Refresh token guardado en almacenamiento seguro (Keychain/Keystore).
- Renovación transparente en interceptor de `dio`.

## 2) Módulos de alto valor para MVP

### Mi Día / Tareas
(Controller de Clarity, múltiples endpoints de tareas y agenda)
- Consultar agenda diaria de usuario.
- Registrar avance de tarea.
- Historial de tareas.

### Planning
(Controller `planning`)
- `GET /planning/plans`
- `POST /planning/plans`
- `GET /planning/stats`
- `GET /planning/my-projects`
- `POST /planning/approvals/:idSolicitud/resolve`

### Equipo
- Endpoints de equipo/miembros y carga de trabajo.

## 3) Patrón recomendado de integración
1. Flutter guarda local en SQLite.
2. Encola evento de sync con payload JSON.
3. Si hay red, intenta push al backend.
4. Si falla, aplica retry exponencial.
5. Cuando backend responde OK, marca `synced=1`.

## 4) Contratos API que conviene definir ya
- `POST /mobile/sync/tasks` para sincronización por lotes.
- `GET /mobile/bootstrap` para cargar catálogos iniciales (estados, roles, permisos visibles).
- `GET /mobile/delta?since=<timestamp>` para sincronización incremental.

## 5) Seguridad y observabilidad
- Rotación de refresh tokens.
- Device ID y revocación por dispositivo.
- Rate limiting por usuario/dispositivo.
- Trazabilidad en auditoría de cambios hechos offline y sincronizados después.
