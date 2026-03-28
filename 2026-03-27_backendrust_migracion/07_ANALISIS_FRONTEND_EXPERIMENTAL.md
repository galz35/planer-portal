# Analisis Frontend Experimental

Fecha: 2026-03-28

## Pregunta

- si `marcaje web` y `visita-cliente/campo` ya son parte madura del producto
- o si todavia funcionan como frente experimental/incubadora

## Evidencia encontrada en el frontend

### 1. El propio frontend los marca como experimentales

- En [AppRoutes.tsx](/opt/apps/porta-planer/v2frontend/src/routes/AppRoutes.tsx) las rutas viven bajo el bloque comentado como `MARCAJE WEB + CAMPO (Experimentales — solo carnet 500708)`.
- En [appMenu.ts](/opt/apps/porta-planer/v2frontend/src/constants/appMenu.ts) aparecen en un grupo separado llamado `Experimental`.

## 2. El acceso esta hardcodeado a una sola persona

- En [AppRoutes.tsx](/opt/apps/porta-planer/v2frontend/src/routes/AppRoutes.tsx) `ExperimentalGuard` solo deja entrar si el usuario tiene carnet `500708` o email que contenga `gustavo.lira`.
- En [Sidebar.tsx](/opt/apps/porta-planer/v2frontend/src/components/layout/Sidebar.tsx) ese mismo criterio decide si se muestra el grupo `Experimental`.

Esto no es una bandera de producto madura; es una compuerta manual de incubacion.

## 3. Hay defaults personales y datos sembrados al flujo

- [VCTrackingPage.tsx](/opt/apps/porta-planer/v2frontend/src/pages/Campo/VCTrackingPage.tsx) arranca con `carnet = 500708` por defecto.
- [VCAgendaPage.tsx](/opt/apps/porta-planer/v2frontend/src/pages/Admin/VisitaCliente/VCAgendaPage.tsx) arranca con `500708` como técnico por defecto.
- [VCMetasPage.tsx](/opt/apps/porta-planer/v2frontend/src/pages/Admin/VisitaCliente/VCMetasPage.tsx) también prioriza `500708`.

Esto sugiere validacion manual de idea, no operacion multiusuario cerrada.

## 4. El frente tiene identidad propia separada del core

- El core del producto vive en `Mi Agenda`, `Gestión Proyectos`, `Mi Asignación`, `Mis Tareas`, `Mi Equipo`, `Aprobaciones`, `Carga Laboral` y `Admin`.
- `Marcaje Web` y `Campo` viven como subuniverso aparte: reloj, monitor, geocercas, tracking, dashboard, clientes, visitas, agenda, reportes y metas.

Conclusión:
- no es una extension organica y cerrada del core actual
- parece una suite en exploracion dentro del mismo portal

## 5. La UX esta avanzada, pero la gobernanza del modulo no

- Las pantallas tienen bastante trabajo visual y de flujo.
- Ejemplos: [AttendanceManager.tsx](/opt/apps/porta-planer/v2frontend/src/pages/MarcajeWeb/AttendanceManager.tsx) y [VCDashboardPage.tsx](/opt/apps/porta-planer/v2frontend/src/pages/Admin/VisitaCliente/VCDashboardPage.tsx).

Pero eso no significa madurez funcional. Lo que falta no es solo backend:
- reglas finales de negocio
- criterio de multiusuario
- alcance exacto del producto
- fuentes de datos definitivas
- decisiones de rollout

## Lectura honesta

La idea si existe, pero todavia no esta pegada como producto principal.

Hoy se ve mas como:
- laboratorio funcional
- suite personal controlada
- frente para explorar `marcaje web` + `visita a cliente`

Y menos como:
- modulo completamente integrado al flujo central diario de `portal-planer`

## Recomendacion para la migracion

### No medirlo igual que el core

- `planning`
- `mi-dia`
- `tareas`
- `proyectos`
- `equipo`
- `auth/config`

Ese bloque si es core y si debe definir el `100%` principal.

### Tratar `marcaje/visita` como producto incubado

Fase 2 correcta:
- estabilizar concepto
- decidir que subset vive de verdad
- definir usuarios reales y permisos
- cerrar contratos backend solo cuando el producto ya este claro

### Separacion util

Se recomienda pensar estos frentes asi:

- Core `portal-planer`:
  - agenda personal
  - tareas
  - planning
  - proyectos
  - equipo
  - aprobaciones

- Experimental incubado:
  - marcaje web
  - geocercas
  - tracking
  - recorrido
  - visita a cliente
  - dashboard/reportes/metas de campo

## Decision operativa sugerida

- `backendrust 100% principal` no debe depender de cerrar antes `marcaje/visita`
- esos modulos se mantienen documentados, funcionales hasta donde sea rentable y pasan a fase 2
- cuando la idea del producto quede mas clara, se reabre con backlog propio y criterio propio de terminado
