# Handoff para depuración local con Gemini 3

## Objetivo
Dejar el proyecto móvil listo para que en entorno local puedas:
1. levantar,
2. probar online/offline,
3. depurar con Gemini 3.

---

## 1) Checklist de arranque local

1. Instalar Flutter estable.
2. Entrar a `flutter_movil/`.
3. Ejecutar:
   - `flutter pub get`
   - `flutter run`
4. Configurar `AppConfig.apiBaseUrl` apuntando a tu backend real.

---

## 2) Qué validar primero (Smoke real)

1. Login correcto contra `/auth/login`.
2. Navegación a módulos: Hoy, Pendientes, Proyectos, Equipos, Dashboard, Notas, Mi Asignación.
3. Pendientes desde `/tareas/mias?estado=Pendiente`.
4. Marcar tarea hecha (`PATCH /tareas/:id`).
5. Sin internet:
   - abrir módulos ya consultados,
   - confirmar fallback a cache.
6. Volver internet:
   - confirmar auto-sync al resume y refresco de datos.

---

## 3) Estrategia de depuración con Gemini 3

## A) Errores API
- Revisar payload real de backend vs `unwrapApiData`/`unwrapApiList`.
- Si cambia contrato, ajustar parser en `api_utils.dart`.

## B) Errores de sesión
- Validar que `/auth/refresh` retorna claves esperadas.
- Ajustar mapeo de tokens en `ApiClient`/`AuthRepository`.

## C) Errores offline
- Revisar tablas SQLite:
  - `tasks`
  - `sync_queue`
  - `notes`
  - `kv_cache`
- Confirmar que cache keys y sync queue se actualizan.

---

## 4) Priorización para llegar a release
1. Background sync por conectividad real.
2. Endpoints backend para notas sincronizadas.
3. QA e2e offline/online por módulo.
4. Telemetría para producción.
