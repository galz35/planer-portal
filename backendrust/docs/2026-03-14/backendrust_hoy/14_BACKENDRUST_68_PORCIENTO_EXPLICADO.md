# Backendrust 68 Porciento Explicado

Fecha: 2026-03-14

## Que significa exactamente el 68%

El `68%` no significa:

- `68%` de rutas existentes
- `68%` de compilacion
- `68%` de lineas migradas

El `68%` significa esto:

`backendrust` esta aproximadamente al `68%` del objetivo real de reemplazar a `v2backend` de Nest sin obligar al frontend a cambiar su logica.

Ese objetivo de reemplazo real incluye todo esto al mismo tiempo:

- mismas rutas
- mismos metodos HTTP
- misma seguridad
- mismos payloads de entrada
- mismo shape JSON
- mismos codigos HTTP
- mismos side-effects SQL
- mismo comportamiento de auth
- mismo comportamiento observable desde frontend

## Por que no uso un solo porcentaje del repo

Porque el repo trae dos metricas internas que no coinciden:

- `endpoints_manifest.json` conservador: `130 / 264 = 49.2%`
- `implemented_endpoints.json` declarativo: `254 / 264 = 96.2%`

Ninguna de las dos por si sola dice la verdad operativa:

- `49.2%` castiga demasiado porque no todo lo implementado esta certificado en el manifiesto
- `96.2%` infla demasiado porque "declarado como implementado" no prueba equivalencia real con Nest

Por eso el `68%` es una estimacion operativa honesta y util para gestion.

## Como se compone ese 68%

### 1. Cobertura estructural

Esto ya esta muy alto:

- router: `100%`
- endpoints faltantes en router: `0`
- handlers genericos: `0`

Lectura:

- ya no estamos en fase "faltan rutas"
- la superficie externa principal ya existe en Rust

### 2. Seguridad y acceso

Esto tambien quedo alto:

- brechas reales de guards vs Nest: `0`

Lectura:

- Rust ya no esta claramente mas abierto que Nest
- cerrar brechas de guards reduce riesgo, pero no prueba por si solo paridad funcional

### 3. Salud tecnica base

Esto esta bien, pero no cierra negocio:

- `cargo check` venia pasando
- `GET /health` respondia

Lectura:

- el backend ya no esta roto estructuralmente
- pero compilar y responder health no significa reemplazo real

### 4. Paridad funcional certificada

Aqui sigue el hueco principal:

- metrica conservadora: `49.2%`

Eso quiere decir:

- una gran parte de endpoints ya existe
- pero no toda esa parte esta certificada como equivalente a Nest en contrato y runtime

### 5. Bloqueadores operativos

El principal sigue siendo:

- `POST /api/auth/login`

Mientras auth no quede realmente cerrada, no se puede decir que el backend esta listo para reemplazo.

## Traduccion practica del 68%

### Lo que si puedes afirmar hoy

- `backendrust` ya es un backend serio y avanzado
- la estructura externa ya esta casi al nivel de Nest
- la capa de seguridad ya no esta atras respecto a Nest
- gran parte del trabajo pesado de rutas ya esta hecho

### Lo que no puedes afirmar hoy

- que el frontend pueda cambiar a Rust y olvidarse de Nest
- que `auth` ya este cerrada por runtime
- que todas las respuestas JSON sean identicas a Nest
- que todos los side-effects SQL esten certificados

## Formula mental correcta

Si quieres una lectura ejecutiva:

- `100%` de superficie de rutas
- `100%` de cierre de faltantes/genericos
- `100%` de brechas de guards conocidas
- `~50%` de equivalencia funcional conservadora certificada
- `~68%` de reemplazo real estimado

## Modulos mas avanzados

Los que se ven mejor parados:

- `visita-campo`: `100%`
- `campo/recorrido`: `100%`
- `clarity/reportes`: `100%`
- `software`: `100%`
- `auth`: `80%`
- `diagnostico`: `80%`
- `equipo`: `77.8%`

## Modulos con mayor deuda

Los que mas empujan hacia abajo el reemplazo real:

- `clarity/notas`: `14.3%`
- `jornada`: `27.3%`
- `acceso`: `34.8%`
- `marcaje`: `41.4%`
- `proyectos`: `42.9%`
- `visita-admin`: `42.9%`
- `planning`: `60.7%`

## APIs que hoy mas pesan contra el 100%

### Auth

- `POST /auth/login`
- `GET /auth/config`
- `POST /auth/config`

### Planning / claridad / tareas

- `GET /planning/workload`
- `POST /planning/check-permission`
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

## Que falta para llegar a 100% real

1. cerrar `auth/login` en runtime
2. certificar contrato de `auth/config`, `refresh`, `change-password`
3. cerrar `planning`, `tareas` y `proyectos`
4. cerrar `jornada`, `marcaje`, `acceso`, `visita-admin`, `notas`
5. validar side-effects SQL y errores HTTP
6. hacer smoke y comparacion contra Nest endpoint por endpoint

## Conclusion

El `68%` es una metrica de reemplazo real estimado, no de codigo escrito.

La lectura correcta es:

- Rust ya hizo la parte pesada de estructura
- lo que falta es la parte cara: comportamiento exacto, auth, side-effects y contrato

