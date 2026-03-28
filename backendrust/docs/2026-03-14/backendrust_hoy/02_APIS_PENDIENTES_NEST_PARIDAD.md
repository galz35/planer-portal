# APIs Pendientes De Paridad Con Nest

Fecha: 2026-03-14

## Criterio

Aqui se listan APIs que hoy existen en Rust pero siguen sin quedar certificadas como equivalentes a Nest o tienen pendiente de runtime/contrato.

## Prioridad alta

### Auth

- `POST /auth/login`
  - Bloqueo runtime pendiente.
- `GET /auth/config`
  - Existe, pero aun aparece como no certificado en la metrica conservadora.
- `POST /auth/config`
  - Existe, pero aun aparece como no certificado en la metrica conservadora.

### Planning / tareas / claridad

- `GET /planning/workload`
- `POST /planning/check-permission`
- `GET /mi-dia`
- `GET /planning/mi-asignacion`
- `GET /planning/plans`
- `POST /planning/plans`
- `GET /planning/stats/bottlenecks`
- `GET /planning/stats/performance`
- `POST /planning/update-operative`
- `GET /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/crear-grupo`
- `POST /planning/tasks/:id/agregar-fase`

- `GET /tareas/mias`
- `PATCH /tareas/:id`
- `POST /tareas/rapida`
- `GET /tareas/solicitud-cambio/pendientes`
- `POST /tareas/solicitud-cambio/:id/resolver`
- `GET /config`
- `POST /config`

### Proyectos

- `GET /proyectos/:id`
- `PATCH /proyectos/:id`
- `DELETE /proyectos/:id`
- `GET /proyectos/:id/colaboradores`
- `POST /proyectos/:id/colaboradores`
- `PATCH /proyectos/:id/colaboradores/:idUsuario`
- `DELETE /proyectos/:id/colaboradores/:idUsuario`
- `GET /proyectos/roles-colaboracion`

## Prioridad media

### Jornada

- `GET /jornada/horarios`
- `POST /jornada/horarios`
- `PUT /jornada/horarios/:id`
- `DELETE /jornada/horarios/:id`
- `GET /jornada/patrones`
- `POST /jornada/patrones`
- `GET /jornada/asignaciones`
- `POST /jornada/asignaciones`

### Marcaje

- `GET /marcaje/admin/sites`
- `POST /marcaje/admin/sites`
- `PUT /marcaje/admin/sites/:id`
- `DELETE /marcaje/admin/sites/:id`
- `GET /marcaje/admin/ips`
- `POST /marcaje/admin/ips`
- `GET /marcaje/admin/geocercas/:carnet`
- `POST /marcaje/admin/geocercas`
- `DELETE /marcaje/admin/geocercas/:id`
- `PUT /marcaje/admin/devices/:uuid`
- `PUT /marcaje/admin/solicitudes/:id/resolver`
- `DELETE /marcaje/admin/asistencia/:id`
- `POST /marcaje/admin/reiniciar/:carnet`
- `POST /marcaje/request-correction`
- `POST /marcaje/correccion`
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
- `PUT /visita-admin/clientes/:id`
- `DELETE /visita-admin/clientes/:id`
- `POST /visita-admin/importar-clientes`
- `GET /visita-admin/metas`
- `POST /visita-admin/metas`

### Notas

- `GET /notas`
- `POST /notas`
- `PATCH /notas/:id`
- `DELETE /notas/:id`
- `PATCH /notes/:id`
- `PUT /notes/:id`

## Nota final

La mayoria de estas APIs ya existen y muchas ya tienen SQL real.

Lo pendiente hoy no es solo "crear endpoint"; es:

- certificar contrato JSON
- validar side-effects SQL
- validar errores y codigos HTTP
- cerrar smoke runtime real contra BD
