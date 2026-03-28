# API Por API Estado

Fecha: 2026-03-14

## Fuente de verdad

Revision completa API por API:

- `docs/2026-03-14/backendrust_hoy/planer_paridad/endpoint_matrix.csv`

Columnas utiles:

- `controller`
- `method`
- `path`
- `status`
- `rust_handler`

## Como leer `status`

- `manifest_real`
  - Implementado y marcado como real en la metrica legacy.
- `declared_untracked`
  - La ruta existe y tiene handler real en Rust, pero todavia no la doy por certificada igual a Nest.
- `generic`
  - Handler generico. Hoy esta en `0`.
- `missing`
  - Ruta faltante. Hoy esta en `0`.

## Modulos que todavia requieren mas trabajo funcional

### Auth

- `POST /auth/login`
- `GET /auth/config`
- `POST /auth/config`

### Planning

- `POST /planning/approvals/:idSolicitud/resolve`
- `POST /planning/check-permission`
- `GET /planning/plans`
- `POST /planning/plans`
- `GET /planning/stats/bottlenecks`
- `GET /planning/stats/performance`
- `POST /planning/tasks/:id/agregar-fase`
- `GET /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/crear-grupo`
- `POST /planning/update-operative`

### Clarity / tareas

- `GET /config`
- `POST /config`
- `PATCH /tareas/:id`
- `GET /tareas/mias`
- `POST /tareas/rapida`
- `POST /tareas/solicitud-cambio/:id/resolver`
- `GET /tareas/solicitud-cambio/pendientes`
- `POST /tasks`
- `PATCH /tasks/:id`
- `GET /tasks/me`

### Proyectos

- `DELETE /proyectos/:id`
- `GET /proyectos/:id`
- `PATCH /proyectos/:id`
- `GET /proyectos/:id/colaboradores`
- `POST /proyectos/:id/colaboradores`
- `DELETE /proyectos/:id/colaboradores/:idUsuario`
- `PATCH /proyectos/:id/colaboradores/:idUsuario`
- `GET /proyectos/roles-colaboracion`

### Jornada

- `GET /jornada/asignaciones`
- `POST /jornada/asignaciones`
- `GET /jornada/horarios`
- `POST /jornada/horarios`
- `DELETE /jornada/horarios/:id`
- `PUT /jornada/horarios/:id`
- `GET /jornada/patrones`
- `POST /jornada/patrones`

### Marcaje

- `DELETE /marcaje/admin/asistencia/:id`
- `PUT /marcaje/admin/devices/:uuid`
- `POST /marcaje/admin/geocercas`
- `GET /marcaje/admin/geocercas/:carnet`
- `DELETE /marcaje/admin/geocercas/:id`
- `GET /marcaje/admin/ips`
- `POST /marcaje/admin/ips`
- `POST /marcaje/admin/reiniciar/:carnet`
- `GET /marcaje/admin/sites`
- `POST /marcaje/admin/sites`
- `DELETE /marcaje/admin/sites/:id`
- `PUT /marcaje/admin/sites/:id`
- `PUT /marcaje/admin/solicitudes/:id/resolver`
- `POST /marcaje/correccion`
- `POST /marcaje/request-correction`
- `POST /marcaje/undo-last`
- `POST /marcaje/undo-last-checkout`

### Acceso

- `GET /acceso/delegacion`
- `POST /acceso/delegacion`
- `GET /acceso/delegacion/delegado/:carnetDelegado`
- `GET /acceso/delegacion/delegante/:carnetDelegante`
- `GET /acceso/empleados/gerencia/:nombre`
- `GET /acceso/organizacion/nodo/:idOrg`
- `GET /acceso/organizacion/nodo/:idOrg/preview`
- `GET /acceso/permiso-area`
- `POST /acceso/permiso-area`
- `GET /acceso/permiso-area/:carnetRecibe`
- `DELETE /acceso/permiso-area/:id`
- `GET /acceso/permiso-empleado`
- `POST /acceso/permiso-empleado`
- `GET /acceso/permiso-empleado/:carnetRecibe`
- `DELETE /acceso/permiso-empleado/:id`

### Visita admin

- `GET /visita-admin/agenda/:carnet`
- `DELETE /visita-admin/agenda/:id`
- `PUT /visita-admin/agenda/:id/reordenar`
- `DELETE /visita-admin/clientes/:id`
- `PUT /visita-admin/clientes/:id`
- `POST /visita-admin/importar-clientes`
- `GET /visita-admin/metas`
- `POST /visita-admin/metas`

### Notas

- `GET /notas`
- `POST /notas`
- `DELETE /notas/:id`
- `PATCH /notas/:id`
- `PATCH /notes/:id`
- `PUT /notes/:id`

## Nota

Que una API aparezca aqui no significa que "no exista".
Significa que todavia no la doy por equivalente a Nest con suficiente certeza.
