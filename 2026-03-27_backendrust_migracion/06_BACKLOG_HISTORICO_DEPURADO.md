# Backlog Historico Depurado

Fecha: 2026-03-27

## Metodo usado

- se tomo la lista historica de riesgo en `03_BRECHAS_BACKENDRUST_VS_V2BACKEND.md`
- se excluyeron las 5 rutas extra propias de Rust que no forman parte del backlog Nest
- se cruzo cada endpoint con el trabajo ya aplicado, certificaciones vivas y aliases ya cubiertos por los mismos handlers

## Resultado actual

- total historico original con riesgo: `89` endpoints
- ya resueltos o alineados hoy: `54`
- fuera de alcance activo del corte principal por decision funcional o experimental: `27`
- pendientes reales de certificacion o cierre final dentro del alcance principal actual: `8`

## Endpoints ya resueltos o alineados

### auth

- `GET /auth/config`
- `POST /auth/config`
- `POST /auth/login`

### config

- `GET /config`
- `POST /config`

### mi-dia

- `GET /mi-dia`

### notas

- `GET /notas`
- `POST /notas`
- `PATCH /notas/:id`
- `DELETE /notas/:id`

### planning

- `POST /planning/approvals/:idSolicitud/resolve`
- `POST /planning/check-permission`
- `GET /planning/mi-asignacion`
- `GET /planning/plans`
- `POST /planning/plans`
- `GET /planning/stats/bottlenecks`
- `GET /planning/stats/performance`
- `POST /planning/tasks/:id/agregar-fase`
- `GET /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/avance-mensual`
- `POST /planning/tasks/:id/crear-grupo`
- `POST /planning/update-operative`
- `GET /planning/workload`

### proyectos

- `DELETE /proyectos/:id`
- `GET /proyectos/:id`
- `PATCH /proyectos/:id`
- `GET /proyectos/:id/colaboradores`
- `POST /proyectos/:id/colaboradores`
- `DELETE /proyectos/:id/colaboradores/:idUsuario`
- `PATCH /proyectos/:id/colaboradores/:idUsuario`
- `GET /proyectos/roles-colaboracion`

### tareas

- `PATCH /tareas/:id`
- `GET /tareas/mias`
- `POST /tareas/rapida`
- `POST /tareas/solicitud-cambio/:id/resolver`
- `GET /tareas/solicitud-cambio/pendientes`

### tasks

- `POST /tasks`
- `PATCH /tasks/:id`
- `GET /tasks/me`

### acceso

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

## Backlog real pendiente por modulo

### jornada

- `GET /jornada/asignaciones`
- `POST /jornada/asignaciones`
- `GET /jornada/horarios`
- `POST /jornada/horarios`
- `DELETE /jornada/horarios/:id`
- `PUT /jornada/horarios/:id`
- `GET /jornada/patrones`
- `POST /jornada/patrones`

### marcaje

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

### notes

- `PATCH /notes/:id`
- `PUT /notes/:id`

Nota:
- este alias queda fuera del alcance activo por decision funcional del 2026-03-28.
- `portal-planer` no lo toma como bloqueador.
- en el Nest vivo del 2026-03-27 `POST /notes` devolvio `404`, reforzando que no vale la pena invertir mas tiempo ahi para el corte REST actual.

### marcaje

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

Nota:
- este bloque pasa a fase 2 experimental por decision funcional del 2026-03-28.
- no bloquea el corte principal de `backendrust` mientras `portal-planer` no dependa de `marcaje web` como flujo diario.

### visita-admin

- `GET /visita-admin/agenda/:carnet`
- `DELETE /visita-admin/agenda/:id`
- `PUT /visita-admin/agenda/:id/reordenar`
- `DELETE /visita-admin/clientes/:id`
- `PUT /visita-admin/clientes/:id`
- `POST /visita-admin/importar-clientes`
- `GET /visita-admin/metas`
- `POST /visita-admin/metas`

Nota:
- `visita-cliente/suite` queda en fase 2 experimental por decision funcional del 2026-03-28.
- incluye el frente admin, tracking y recorridos asociados mientras siga siendo modulo crudo/no productivo.

## Prioridad practica

- prioridad activa del corte principal: `jornada`
- `acceso` ya quedó alineado en vivo el 2026-03-28 en lecturas base, validaciones `400`, soft delete y soporte de `idOrg` string/sintético (`AREA`) sin romper los handlers Rust
- fase 2 experimental: `marcaje`, `visita-admin`, `campo/recorrido`

## Lectura operativa

- el backlog historico ya no es `89`
- el numero real pendiente dentro del alcance principal hoy es `8`
- `notes` queda despriorizado y fuera del criterio de cierre del release REST actual
- `marcaje` y `visita-cliente` pasan a fase 2 experimental y dejan de contaminar el porcentaje del frente principal
- de esos `8`, ninguno pertenece ya al frente principal actual de `planning/proyectos/acceso`
- la auditoria runtime de SQL Server del 2026-03-28 ya quedo en `0` procedures `_rust` faltantes (`127/127`)
- el pendiente real ya no es de catalogo SQL faltante; ahora es certificacion funcional fina y comparacion contrato por contrato en backlog restante
