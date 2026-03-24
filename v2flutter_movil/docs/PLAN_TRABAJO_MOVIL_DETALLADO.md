# Plan de trabajo detallado - App móvil Momentus (sin Admin)

## 0) Objetivo y restricción
Construir app móvil nativa enfocada en:
- Login
- Hoy/Agenda
- Pendientes
- Proyectos
- Equipos
- Reportes/Dashboard
- Notas
- Mi Asignación

No incluir módulo Admin en MVP móvil.

---

## 1) Arquitectura funcional objetivo

## 1.1 Navegación propuesta
- **Stack Auth**
  - Login
  - Recuperación básica de sesión
- **Shell principal (tabs + rutas internas)**
  - Hoy
  - Pendientes
  - Proyectos
  - Equipos
  - Dashboard
  - Notas
  - Mi Asignación

> Para UX móvil, mantener tabs principales de mayor uso y enviar módulos secundarios a rutas internas.

## 1.2 Capas técnicas
- Presentación (pantallas + estado)
- Dominio (casos de uso)
- Data
  - Remote (API NestJS)
  - Local (SQLite offline-first)
- Sincronización
  - Cola de eventos + retry exponencial

## 1.3 Seguridad
- JWT access + refresh
- Secure storage para refresh token
- Logout por revocación de sesión

---

## 2) Fases de implementación

## Fase 1 - Base crítica (2 semanas)
### Entregables
1. Login real integrado con backend (`/auth/login`, `/auth/refresh`).
2. Guardado seguro de sesión.
3. Guard global de sesión en app.
4. Estructura de navegación final móvil (sin admin).

### Criterio de aceptación
- Usuario inicia sesión y mantiene sesión al reabrir app.
- Si expira access token, refresh funciona sin expulsar al usuario.

---

## Fase 2 - Hoy/Agenda + Pendientes (2 a 3 semanas)
### Entregables
1. Hoy Día con resumen operativo.
2. Agenda (calendario + bitácora resumida).
3. Pendientes totalmente operativos (listar, actualizar estado, buscar, filtrar).
4. Sync de cambios offline de tareas.

### Criterio de aceptación
- Usuario puede operar pendientes sin red.
- Al volver red, se sincroniza sin perder cambios.

---

## Fase 3 - Proyectos + Equipos (3 semanas)
### Entregables
1. Lista de proyectos y detalle.
2. Timeline simplificado en móvil.
3. Vista Mi Equipo y agenda de miembro.
4. Bloqueos del equipo.

### Criterio de aceptación
- Líder puede consultar su equipo y proyectos desde móvil.
- Se respetan permisos del backend actual.

---

## Fase 4 - Dashboard/Reportes + Notas (2 semanas)
### Entregables
1. Dashboard ejecutivo móvil (KPI clave).
2. Reportes resumidos por periodo.
3. Notas de reunión con guardado local + sync.

### Criterio de aceptación
- Reportes cargan sin bloquear UI.
- Notas guardan local y sincronizan al recuperar red.

---

## Fase 5 - Mi Asignación (1 a 2 semanas)
### Entregables
1. Módulo nuevo Mi Asignación.
2. Lista de asignaciones actuales y próximas.
3. Estado y acción rápida por asignación.

### Criterio de aceptación
- Usuario identifica en <10s qué tiene asignado hoy.

---

## Fase 6 - Hardening y Release (2 semanas)
### Entregables
1. Observabilidad (errores, tiempos de respuesta).
2. QA funcional completo por módulo.
3. Checklist release stores.

### Criterio de aceptación
- Crash-free > 99.5% en beta interna.

---

## 3) Matriz de prioridad por módulo

## Prioridad Alta (MVP obligatorio)
- Login
- Hoy/Agenda
- Pendientes
- Proyectos
- Equipos

## Prioridad Media
- Dashboard/Reportes
- Notas

## Prioridad Alta de negocio (nuevo)
- Mi Asignación

---

## 4) Lista de endpoints a integrar por módulo

## Auth
- `POST /auth/login`
- `POST /auth/refresh`

## Planning/Proyectos
- `GET /planning/my-projects`
- `GET /planning/plans`
- `POST /planning/plans`
- `GET /planning/stats`
- `GET /planning/approvals`
- `POST /planning/approvals/:idSolicitud/resolve`

## Equipo/Agenda/Tareas (controlador Clarity)
- Agenda por usuario
- Equipo por líder
- Bloqueos
- Workload
- Proyectos y tareas por proyecto

> Donde el backend no tenga endpoint móvil directo, definir contrato adicional en `/mobile/*` sin romper web existente.

---

## 5) Definición de “no inventar datos” para implementación
- No usar JSON mock estático en producción.
- Todo dato visible debe provenir de:
  1) API backend real, o
  2) SQLite local generado por acciones reales del usuario y sincronizado después.
- Cualquier pantalla no integrada aún debe mostrar estado técnico explícito (“pendiente de integración API”), no números falsos.

---

## 6) Riesgos y mitigación
1. **Riesgo:** retraso por auth móvil.
   - **Mitigación:** implementar auth primero (Fase 1).
2. **Riesgo:** conflictos offline al editar la misma tarea.
   - **Mitigación:** versión de registro + estrategia de resolución.
3. **Riesgo:** sobrecarga de módulos en móvil.
   - **Mitigación:** release incremental por fases.

---

## 7) Resultado esperado al cierre
Una app móvil usable y alineada con la web en módulos clave (sin admin), con login real, operación diaria productiva, sincronización offline robusta y roadmap claro para escalar.
