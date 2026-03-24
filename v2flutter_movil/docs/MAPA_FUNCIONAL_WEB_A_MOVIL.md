# Mapa funcional: Web actual -> App móvil objetivo

> Fuente base: rutas y módulos activos en `clarity-pwa/src/App.tsx`.

## Alcance móvil confirmado por negocio (sí entra)
1. Login
2. Hoy Día / Agenda
3. Pendientes
4. Proyectos
5. Equipos
6. Reportes / Dashboard
7. Notas
8. Mi Asignación (nuevo módulo móvil)

## Fuera de alcance móvil inicial (no entra)
- Todo módulo Admin (`/admin/*`).
- Importaciones administrativas y gestión de seguridad avanzada de admin.

---

## 1) Login
### Web actual
- `/login`

### Móvil objetivo
- Pantalla Login nativa.
- Gestión de sesión (access + refresh token).
- Renovación automática de token.

---

## 2) Hoy Día / Agenda
### Web actual
- `/app/hoy` (ExecutionView)
- `/app/hoy/calendario`
- `/app/hoy/bitacora`
- `/app/hoy/kpis`
- `/app/hoy/alertas`
- `/app/hoy/bloqueos`
- `/app/hoy/metricas`
- `/app/hoy/equipo`
- `/app/hoy/visibilidad`

### Móvil objetivo
- Home principal con resumen del día.
- Subsecciones móviles:
  - Agenda (calendario)
  - Bitácora
  - Alertas
  - Bloqueos
  - Métricas/KPIs (compacto)

---

## 3) Pendientes
### Web actual
- `/app/pendientes`

### Móvil objetivo
- Lista optimizada para captura y cierre rápido.
- Filtros rápidos + búsqueda.

---

## 4) Proyectos
### Web actual
- `/app/planning/proyectos`
- `/app/proyectos/:id`
- `/app/planning/timeline`
- `/app/planning/roadmap`
- `/app/planning/plan-trabajo`
- `/app/planning/approvals`
- `/app/planning/carga`
- `/app/planning/simulation`

### Móvil objetivo
- Listado de proyectos.
- Detalle de proyecto.
- Vista timeline simplificada.
- Aprobaciones operativas.

---

## 5) Equipos
### Web actual
- `/app/equipo`
- `/app/equipo/hoy`
- `/app/equipo/planning/:userId`
- `/app/equipo/bloqueos`
- `/app/equipo/mi-equipo`
- `/app/agenda/:userId`

### Móvil objetivo
- Mi equipo (vista compacta por miembro).
- Agenda de miembro.
- Bloqueos del equipo.

---

## 6) Reportes / Dashboard
### Web actual
- `/app/reports`
- `/app/software/dashboard`

### Móvil objetivo
- Dashboard ejecutivo móvil (cards KPI + tendencias clave).
- Reportes resumidos por periodo.

---

## 7) Notas
### Web actual
- `/app/notas`

### Móvil objetivo
- Notas de reunión móviles.
- Edición rápida + guardado local + sync.

---

## 8) Mi Asignación (nuevo en móvil)
### Web actual
- No existe como módulo explícito único; se deriva de agenda/equipo/planning.

### Móvil objetivo
- Módulo dedicado para ver:
  - Qué tengo asignado hoy.
  - Próximas asignaciones.
  - Estado de cada asignación.

---

## Backend: puntos base de reutilización (existentes)
- Auth: `/auth/login`, `/auth/refresh`.
- Planning: `/planning/plans`, `/planning/stats`, `/planning/my-projects`, `/planning/approvals`.
- Tareas/equipo/proyectos: endpoints expuestos en controlador de Clarity (`proyectos`, `equipo`, `agenda`, `workload`, etc.).

Este mapa define la estructura funcional de la app móvil sin inventar módulos fuera del sistema web actual, excepto `Mi Asignación` solicitado por negocio.
