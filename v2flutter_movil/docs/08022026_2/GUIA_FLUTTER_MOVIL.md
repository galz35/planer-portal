# Guía de Flutter Movil (Proyecto Momentus)

Esta guía detalla el estado y funcionamiento del proyecto `flutter_movil` que se encuentra dentro del repositorio `planer`. Es un proyecto **distinto** al de `inventario`, optimizado para ser **Offline-First**.

---

## 1. Estado de la Descarga
**He descargado y actualizado la última versión.**
Se realizó un `git pull` hoy y el código incluye los últimos avances en el sistema de sincronización y el módulo de "Mi Asignación".

---

## 2. Lo que hace que este proyecto sea especial
A diferencia de otros proyectos, `flutter_movil` está diseñado para técnicos que pueden perder la conexión a internet en medio del trabajo.

### A. Estrategia Offline-First (Real)
1. **Escritura:** Cuando creas una tarea o nota, se guarda **primero en la base de datos local (SQLite)**.
2. **Cola de Sincronización:** El cambio se pone en una "cola" (`sync_queue`).
3. **Envío:** La app intenta enviar los pendientes al servidor en segundo plano cuando detecta internet.
4. **Resiliencia:** Si el servidor falla, la app reintenta con una espera cada vez mayor (backoff exponencial).

### B. Lectura Híbrida
*   La app intenta descargar datos frescos del API siempre.
*   **Si falla la red:** Muestra lo que tiene guardado en el "kv_cache" (cache local) y avisa al usuario: *"Mostrando caché local (sin conexión)"*.

---

## 3. Avance del Proyecto (Casi terminado: 96%)
Según los documentos internos (`docs/ESTADO_IMPLEMENTACION_MOVIL.md`):

| Módulo | Avance | Funcionalidades Listas |
| :--- | :--- | :--- |
| **Login / Sesión** | 88% | JWT real, Secure Storage, Refresh Token automático. |
| **Hoy / Agenda** | 86% | Vista de `/mi-dia`, métricas diarias operativas. |
| **Mi Asignación** | 92% | Lista de tareas asignadas al usuario logueado. |
| **Sincronización**| 95% | Cola de sync, retry automático, auto-sync al abrir app. |
| **Proyectos/Equipo**| 88% | Listado de proyectos y equipo del líder. |

---

## 4. Diferencias con el proyecto "Inventario"
*   **Enfoque:** `flutter_movil` está 100% amarrado al backend de `planer` (Momentus), mientras que `inventario` parece ser una versión más genérica o previa.
*   **Estado:** `flutter_movil` tiene una gestión de sync mucho más avanzada y profesional.
*   **Arquitectura:** Usa Clean Architecture con Provider de forma más madura.

---

## 5. Próximos Pasos Recomendados
1. **Notificaciones Push:** El código ya tiene los botones para activarlas en "Ajustes", pero falta conectar el servicio de Google/Apple (FCM/APNs) al servidor.
2. **Filtros Avanzados:** En las listas de tareas pendientes.
3. **QA Real:** Probar en dispositivos físicos Android/iOS reales para ver el comportamiento de la sincronización en campo.

---

## 6. Cómo probarlo localmente
Para ejecutarlo apuntando a un backend específico sin cambiar el código:
```bash
flutter run --dart-define=API_BASE_URL=http://TU_IP_LOCAL:3000
```
