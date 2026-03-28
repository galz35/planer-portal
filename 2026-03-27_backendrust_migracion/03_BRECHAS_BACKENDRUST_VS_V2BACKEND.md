# Brechas backendrust vs v2backend

Fecha: 2026-03-27

## Faltantes reales del router Rust contra el v2backend actual

- Ninguno

## Rutas extra presentes en Rust

- `GET` `/_migration/breakdown`
- `GET` `/_migration/progress`
- `GET` `/_migration/status`
- `ANY` `/*tail`
- `GET` `/visibilidad/organizacion/:idorg/subarbol`

## Endpoints con riesgo histórico de paridad

## acceso

- `GET` `/acceso/delegacion` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/acceso/delegacion` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/delegacion/delegado/:carnetDelegado` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/delegacion/delegante/:carnetDelegante` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/empleados/gerencia/:nombre` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/organizacion/nodo/:idOrg` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/organizacion/nodo/:idOrg/preview` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/permiso-area` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/acceso/permiso-area` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/permiso-area/:carnetRecibe` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/acceso/permiso-area/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/permiso-empleado` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/acceso/permiso-empleado` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/acceso/permiso-empleado/:carnetRecibe` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/acceso/permiso-empleado/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## auth

- `GET` `/auth/config` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/auth/config` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/auth/login` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## config

- `GET` `/config` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/config` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## jornada

- `GET` `/jornada/asignaciones` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/jornada/asignaciones` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/jornada/horarios` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/jornada/horarios` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/jornada/horarios/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/jornada/horarios/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/jornada/patrones` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/jornada/patrones` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## marcaje

- `DELETE` `/marcaje/admin/asistencia/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/marcaje/admin/devices/:uuid` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/admin/geocercas` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/marcaje/admin/geocercas/:carnet` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/marcaje/admin/geocercas/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/marcaje/admin/ips` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/admin/ips` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/admin/reiniciar/:carnet` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/marcaje/admin/sites` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/admin/sites` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/marcaje/admin/sites/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/marcaje/admin/sites/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/marcaje/admin/solicitudes/:id/resolver` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/correccion` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/request-correction` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/undo-last` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/marcaje/undo-last-checkout` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## mi-dia

- `GET` `/mi-dia` | fuentes previas: `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## notas

- `GET` `/notas` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/notas` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/notas/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PATCH` `/notas/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## notes

- `PATCH` `/notes/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/notes/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## planning

- `POST` `/planning/approvals/:idSolicitud/resolve` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`
- `POST` `/planning/check-permission` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/mi-asignacion` | fuentes previas: `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/plans` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/planning/plans` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/stats/bottlenecks` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/stats/performance` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/planning/tasks/:id/agregar-fase` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/tasks/:id/avance-mensual` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/planning/tasks/:id/avance-mensual` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/planning/tasks/:id/crear-grupo` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/planning/update-operative` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/planning/workload` | fuentes previas: `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## proyectos

- `DELETE` `/proyectos/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/proyectos/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PATCH` `/proyectos/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/proyectos/:id/colaboradores` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/proyectos/:id/colaboradores` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/proyectos/:id/colaboradores/:idUsuario` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PATCH` `/proyectos/:id/colaboradores/:idUsuario` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/proyectos/roles-colaboracion` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## tareas

- `PATCH` `/tareas/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/tareas/mias` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/tareas/rapida` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/tareas/solicitud-cambio/:id/resolver` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/tareas/solicitud-cambio/pendientes` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## tasks

- `POST` `/tasks` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`
- `PATCH` `/tasks/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`
- `GET` `/tasks/me` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`

## visita-admin

- `GET` `/visita-admin/agenda/:carnet` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/visita-admin/agenda/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/visita-admin/agenda/:id/reordenar` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `DELETE` `/visita-admin/clientes/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `PUT` `/visita-admin/clientes/:id` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/visita-admin/importar-clientes` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `GET` `/visita-admin/metas` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`
- `POST` `/visita-admin/metas` | fuentes previas: `docs/2026-03-14/backendrust_hoy/06_API_POR_API_ESTADO.md`, `docs/2026-03-14/backendrust_hoy/02_APIS_PENDIENTES_NEST_PARIDAD.md`

## Conclusión técnica

- La nueva migración no debe empezar por qué ruta falta sino por qué contrato y qué acceso a datos sostiene cada flujo del frontend.
- Las brechas a cerrar son HTTP, funcionales y de datos.
