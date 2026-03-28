# Inventario API v2backend

Fecha: 2026-03-27

Fuente: controllers NestJS en `/opt/apps/porta-planer/v2backend/src`.

Total de endpoints HTTP detectados: 269

## acceso

- `GET` `/acceso/debug-raw-data` | controller `acceso/acceso.controller.ts` | linea 175
- `GET` `/acceso/delegacion` | controller `acceso/acceso.controller.ts` | linea 101
- `POST` `/acceso/delegacion` | controller `acceso/acceso.controller.ts` | linea 76
- `DELETE` `/acceso/delegacion/:id` | controller `acceso/acceso.controller.ts` | linea 105
- `GET` `/acceso/delegacion/delegado/:carnetDelegado` | controller `acceso/acceso.controller.ts` | linea 82
- `GET` `/acceso/delegacion/delegante/:carnetDelegante` | controller `acceso/acceso.controller.ts` | linea 93
- `GET` `/acceso/empleado/:carnet` | controller `acceso/acceso.controller.ts` | linea 112
- `GET` `/acceso/empleado/email/:correo` | controller `acceso/acceso.controller.ts` | linea 138
- `GET` `/acceso/empleados` | controller `acceso/acceso.controller.ts` | linea 122
- `GET` `/acceso/empleados/buscar` | controller `acceso/acceso.controller.ts` | linea 134
- `GET` `/acceso/empleados/gerencia/:nombre` | controller `acceso/acceso.controller.ts` | linea 129
- `GET` `/acceso/organizacion/buscar` | controller `acceso/acceso.controller.ts` | linea 151
- `GET` `/acceso/organizacion/nodo/:idOrg` | controller `acceso/acceso.controller.ts` | linea 161
- `GET` `/acceso/organizacion/nodo/:idOrg/preview` | controller `acceso/acceso.controller.ts` | linea 164
- `GET` `/acceso/organizacion/tree` | controller `acceso/acceso.controller.ts` | linea 157
- `GET` `/acceso/permiso-area` | controller `acceso/acceso.controller.ts` | linea 33
- `POST` `/acceso/permiso-area` | controller `acceso/acceso.controller.ts` | linea 21
- `GET` `/acceso/permiso-area/:carnetRecibe` | controller `acceso/acceso.controller.ts` | linea 29
- `DELETE` `/acceso/permiso-area/:id` | controller `acceso/acceso.controller.ts` | linea 38
- `GET` `/acceso/permiso-empleado` | controller `acceso/acceso.controller.ts` | linea 62
- `POST` `/acceso/permiso-empleado` | controller `acceso/acceso.controller.ts` | linea 48
- `GET` `/acceso/permiso-empleado/:carnetRecibe` | controller `acceso/acceso.controller.ts` | linea 57
- `DELETE` `/acceso/permiso-empleado/:id` | controller `acceso/acceso.controller.ts` | linea 69
- `GET` `/visibilidad/:carnet` | controller `acceso/visibilidad.controller.ts` | linea 9
- `GET` `/visibilidad/:carnet/actores` | controller `acceso/visibilidad.controller.ts` | linea 26
- `GET` `/visibilidad/:carnet/empleados` | controller `acceso/visibilidad.controller.ts` | linea 13
- `GET` `/visibilidad/:carnet/puede-ver/:carnetObjetivo` | controller `acceso/visibilidad.controller.ts` | linea 18
- `GET` `/visibilidad/:carnet/quien-puede-verme` | controller `acceso/visibilidad.controller.ts` | linea 30

## admin

- `GET` `/admin/audit-logs` | controller `admin/admin.controller.ts` | linea 139
- `GET` `/admin/backup/export` | controller `admin/backup/backup.controller.ts` | linea 26
- `POST` `/admin/import/asignaciones` | controller `admin/import.controller.ts` | linea 200
- `POST` `/admin/import/empleados` | controller `admin/import.controller.ts` | linea 144
- `POST` `/admin/import/organizacion` | controller `admin/import.controller.ts` | linea 172
- `GET` `/admin/import/stats` | controller `admin/import.controller.ts` | linea 221
- `GET` `/admin/import/template/empleados` | controller `admin/import.controller.ts` | linea 42
- `GET` `/admin/import/template/organizacion` | controller `admin/import.controller.ts` | linea 100
- `GET` `/admin/logs` | controller `admin/admin.controller.ts` | linea 133
- `POST` `/admin/nodos` | controller `admin/admin.controller.ts` | linea 148
- `GET` `/admin/organigrama` | controller `admin/admin.controller.ts` | linea 145
- `GET` `/admin/recycle-bin` | controller `admin/admin.controller.ts` | linea 162
- `POST` `/admin/recycle-bin/restore` | controller `admin/admin.controller.ts` | linea 167
- `GET` `/admin/roles` | controller `admin/admin.controller.ts` | linea 105
- `POST` `/admin/roles` | controller `admin/admin.controller.ts` | linea 109
- `DELETE` `/admin/roles/:id` | controller `admin/admin.controller.ts` | linea 124
- `PATCH` `/admin/roles/:id` | controller `admin/admin.controller.ts` | linea 115
- `POST` `/admin/security/assign-menu` | controller `admin/admin-security.controller.ts` | linea 43
- `DELETE` `/admin/security/assign-menu/:id` | controller `admin/admin-security.controller.ts` | linea 54
- `GET` `/admin/security/profiles` | controller `admin/admin-security.controller.ts` | linea 62
- `GET` `/admin/security/users-access` | controller `admin/admin-security.controller.ts` | linea 34
- `GET` `/admin/stats` | controller `admin/admin.controller.ts` | linea 54
- `GET` `/admin/usuarios` | controller `admin/admin.controller.ts` | linea 57
- `POST` `/admin/usuarios` | controller `admin/admin.controller.ts` | linea 85
- `GET` `/admin/usuarios-inactivos` | controller `admin/admin.controller.ts` | linea 195
- `POST` `/admin/usuarios-organizacion` | controller `admin/admin.controller.ts` | linea 154
- `DELETE` `/admin/usuarios-organizacion/:idUsuario/:idNodo` | controller `admin/admin.controller.ts` | linea 182
- `DELETE` `/admin/usuarios/:id` | controller `admin/admin.controller.ts` | linea 174
- `PATCH` `/admin/usuarios/:id` | controller `admin/admin.controller.ts` | linea 91
- `POST` `/admin/usuarios/:id/menu` | controller `admin/admin.controller.ts` | linea 75
- `PATCH` `/admin/usuarios/:id/rol` | controller `admin/admin.controller.ts` | linea 67
- `GET` `/admin/usuarios/:id/visibilidad-efectiva` | controller `admin/admin.controller.ts` | linea 100

## app.controller.ts

- `GET` `/` | controller `app.controller.ts` | linea 5

## auth

- `POST` `/auth/change-password` | controller `auth/auth.controller.ts` | linea 60
- `GET` `/auth/config` | controller `auth/auth.controller.ts` | linea 75
- `POST` `/auth/config` | controller `auth/auth.controller.ts` | linea 83
- `POST` `/auth/login` | controller `auth/auth.controller.ts` | linea 33
- `POST` `/auth/portal-session` | controller `auth/auth.controller.ts` | linea 106
- `POST` `/auth/refresh` | controller `auth/auth.controller.ts` | linea 48
- `POST` `/auth/sso-login` | controller `auth/auth.controller.ts` | linea 95
- `POST` `/auth/sso-sync-user` | controller `auth/auth.controller.ts` | linea 123

## campo

- `GET` `/campo/recorrido/activo` | controller `campo/recorrido.controller.ts` | linea 43
- `GET` `/campo/recorrido/admin` | controller `campo/recorrido.controller.ts` | linea 59
- `POST` `/campo/recorrido/finalizar` | controller `campo/recorrido.controller.ts` | linea 17
- `GET` `/campo/recorrido/historial` | controller `campo/recorrido.controller.ts` | linea 53
- `POST` `/campo/recorrido/iniciar` | controller `campo/recorrido.controller.ts` | linea 9
- `POST` `/campo/recorrido/punto` | controller `campo/recorrido.controller.ts` | linea 29
- `POST` `/campo/recorrido/puntos-batch` | controller `campo/recorrido.controller.ts` | linea 33
- `GET` `/campo/recorrido/puntos/:id` | controller `campo/recorrido.controller.ts` | linea 47

## clarity

- `GET` `/agenda-recurrente` | controller `clarity/recurrencia.controller.ts` | linea 93
- `GET` `/agenda/:targetCarnet` | controller `clarity/clarity.controller.ts` | linea 161
- `POST` `/asignaciones` | controller `clarity/clarity.controller.ts` | linea 272
- `GET` `/audit-logs/task/:idTarea` | controller `clarity/clarity.controller.ts` | linea 224
- `POST` `/bloqueos` | controller `clarity/clarity.controller.ts` | linea 235
- `PATCH` `/bloqueos/:id/resolver` | controller `clarity/clarity.controller.ts` | linea 246
- `POST` `/checkins` | controller `clarity/clarity.controller.ts` | linea 65
- `GET` `/config` | controller `clarity/clarity.controller.ts` | linea 46
- `POST` `/config` | controller `clarity/clarity.controller.ts` | linea 53
- `GET` `/equipo/actividad` | controller `clarity/equipo.controller.ts` | linea 115
- `GET` `/equipo/actividad/:id` | controller `clarity/equipo.controller.ts` | linea 137
- `GET` `/equipo/backlog` | controller `clarity/equipo.controller.ts` | linea 53
- `GET` `/equipo/bloqueos` | controller `clarity/equipo.controller.ts` | linea 36
- `GET` `/equipo/hoy` | controller `clarity/equipo.controller.ts` | linea 30
- `GET` `/equipo/inform` | controller `clarity/equipo.controller.ts` | linea 42
- `GET` `/equipo/miembro/:idUsuario` | controller `clarity/equipo.controller.ts` | linea 59
- `GET` `/equipo/miembro/:idUsuario/bloqueos` | controller `clarity/equipo.controller.ts` | linea 93
- `GET` `/equipo/miembro/:idUsuario/tareas` | controller `clarity/equipo.controller.ts` | linea 80
- `GET` `/foco` | controller `clarity/foco.controller.ts` | linea 31
- `POST` `/foco` | controller `clarity/foco.controller.ts` | linea 37
- `DELETE` `/foco/:id` | controller `clarity/foco.controller.ts` | linea 59
- `PATCH` `/foco/:id` | controller `clarity/foco.controller.ts` | linea 43
- `GET` `/foco/estadisticas` | controller `clarity/foco.controller.ts` | linea 79
- `POST` `/foco/reordenar` | controller `clarity/foco.controller.ts` | linea 65
- `GET` `/gerencia/resumen` | controller `clarity/reportes.controller.ts` | linea 50
- `GET` `/kpis/dashboard` | controller `clarity/kpis.controller.ts` | linea 18
- `GET` `/notas` | controller `clarity/notas.controller.ts` | linea 28
- `POST` `/notas` | controller `clarity/notas.controller.ts` | linea 36
- `DELETE` `/notas/:id` | controller `clarity/notas.controller.ts` | linea 67
- `PATCH` `/notas/:id` | controller `clarity/notas.controller.ts` | linea 48
- `POST` `/notes` | controller `clarity/notas.controller.ts` | linea 37
- `PATCH` `/notes/:id` | controller `clarity/notas.controller.ts` | linea 49
- `PUT` `/notes/:id` | controller `clarity/notas.controller.ts` | linea 50
- `GET` `/organizacion/catalogo` | controller `clarity/organizacion.controller.ts` | linea 11
- `GET` `/organizacion/estructura-usuarios` | controller `clarity/organizacion.controller.ts` | linea 26
- `GET` `/planning/workload` | controller `clarity/clarity.controller.ts` | linea 218
- `GET` `/proyectos` | controller `clarity/proyectos.controller.ts` | linea 39
- `POST` `/proyectos` | controller `clarity/proyectos.controller.ts` | linea 46
- `DELETE` `/proyectos/:id` | controller `clarity/proyectos.controller.ts` | linea 75
- `GET` `/proyectos/:id` | controller `clarity/proyectos.controller.ts` | linea 61
- `PATCH` `/proyectos/:id` | controller `clarity/proyectos.controller.ts` | linea 67
- `POST` `/proyectos/:id/clonar` | controller `clarity/proyectos.controller.ts` | linea 52
- `GET` `/proyectos/:id/colaboradores` | controller `clarity/proyectos.controller.ts` | linea 101
- `POST` `/proyectos/:id/colaboradores` | controller `clarity/proyectos.controller.ts` | linea 110
- `DELETE` `/proyectos/:id/colaboradores/:idUsuario` | controller `clarity/proyectos.controller.ts` | linea 155
- `PATCH` `/proyectos/:id/colaboradores/:idUsuario` | controller `clarity/proyectos.controller.ts` | linea 131
- `GET` `/proyectos/:id/historial` | controller `clarity/proyectos.controller.ts` | linea 87
- `GET` `/proyectos/:id/mis-permisos` | controller `clarity/proyectos.controller.ts` | linea 171
- `GET` `/proyectos/:id/tareas` | controller `clarity/proyectos.controller.ts` | linea 81
- `GET` `/proyectos/roles-colaboracion` | controller `clarity/proyectos.controller.ts` | linea 34
- `GET` `/recordatorios` | controller `clarity/clarity.controller.ts` | linea 156
- `DELETE` `/recordatorios/:id` | controller `clarity/clarity.controller.ts` | linea 151
- `GET` `/reportes/bloqueos-trend` | controller `clarity/reportes.controller.ts` | linea 35
- `GET` `/reportes/equipo-performance` | controller `clarity/reportes.controller.ts` | linea 41
- `GET` `/reportes/exportar` | controller `clarity/reportes.controller.ts` | linea 67
- `GET` `/reportes/productividad` | controller `clarity/reportes.controller.ts` | linea 29
- `GET` `/reports/agenda-compliance` | controller `clarity/reportes.controller.ts` | linea 56
- `POST` `/seed` | controller `clarity/seed.controller.ts` | linea 8
- `DELETE` `/tareas/:id` | controller `clarity/clarity.controller.ts` | linea 181
- `GET` `/tareas/:id` | controller `clarity/clarity.controller.ts` | linea 116
- `PATCH` `/tareas/:id` | controller `clarity/clarity.controller.ts` | linea 122
- `POST` `/tareas/:id/avance` | controller `clarity/clarity.controller.ts` | linea 208
- `GET` `/tareas/:id/bloqueos` | controller `clarity/clarity.controller.ts` | linea 241
- `POST` `/tareas/:id/clonar` | controller `clarity/clarity.controller.ts` | linea 128
- `POST` `/tareas/:id/descartar` | controller `clarity/clarity.controller.ts` | linea 187
- `POST` `/tareas/:id/instancia` | controller `clarity/recurrencia.controller.ts` | linea 61
- `GET` `/tareas/:id/instancias` | controller `clarity/recurrencia.controller.ts` | linea 84
- `POST` `/tareas/:id/mover` | controller `clarity/clarity.controller.ts` | linea 193
- `POST` `/tareas/:id/participantes` | controller `clarity/clarity.controller.ts` | linea 140
- `POST` `/tareas/:id/recordatorio` | controller `clarity/clarity.controller.ts` | linea 146
- `GET` `/tareas/:id/recurrencia` | controller `clarity/recurrencia.controller.ts` | linea 55
- `POST` `/tareas/:id/recurrencia` | controller `clarity/recurrencia.controller.ts` | linea 26
- `POST` `/tareas/:id/revalidar` | controller `clarity/clarity.controller.ts` | linea 134
- `GET` `/tareas/:idTarea/avance-mensual` | controller `clarity/avance-mensual.controller.ts` | linea 19
- `POST` `/tareas/:idTarea/avance-mensual` | controller `clarity/avance-mensual.controller.ts` | linea 35
- `DELETE` `/tareas/avance/:id` | controller `clarity/clarity.controller.ts` | linea 213
- `GET` `/tareas/historico/:carnet` | controller `clarity/clarity.controller.ts` | linea 171
- `POST` `/tareas/masiva` | controller `clarity/clarity.controller.ts` | linea 94
- `GET` `/tareas/mias` | controller `clarity/clarity.controller.ts` | linea 103
- `POST` `/tareas/rapida` | controller `clarity/clarity.controller.ts` | linea 74
- `POST` `/tareas/solicitud-cambio` | controller `clarity/clarity.controller.ts` | linea 230
- `POST` `/tareas/solicitud-cambio/:id/resolver` | controller `clarity/clarity.controller.ts` | linea 257
- `GET` `/tareas/solicitud-cambio/pendientes` | controller `clarity/clarity.controller.ts` | linea 251
- `POST` `/tasks` | controller `clarity/clarity.controller.ts` | linea 74
- `PATCH` `/tasks/:id` | controller `clarity/clarity.controller.ts` | linea 122
- `POST` `/tasks/:id/clone` | controller `clarity/clarity.controller.ts` | linea 128
- `GET` `/tasks/me` | controller `clarity/clarity.controller.ts` | linea 103

## common

- `POST` `/notifications/device-token` | controller `common/notification.controller.ts` | linea 18
- `GET` `/notifications/status` | controller `common/notification.controller.ts` | linea 164
- `GET` `/notifications/test-email` | controller `common/notification.controller.ts` | linea 80
- `GET` `/notifications/test-email-public` | controller `common/notification.controller.ts` | linea 121
- `GET` `/notifications/test-overdue-redesign` | controller `common/notification.controller.ts` | linea 190
- `GET` `/notifications/test-push` | controller `common/notification.controller.ts` | linea 45

## diagnostico

- `GET` `/diagnostico/contexto` | controller `diagnostico/diagnostico.controller.ts` | linea 69
- `GET` `/diagnostico/ping` | controller `diagnostico/diagnostico.controller.ts` | linea 17
- `GET` `/diagnostico/stats` | controller `diagnostico/diagnostico.controller.ts` | linea 36
- `GET` `/diagnostico/test-idcreador` | controller `diagnostico/diagnostico.controller.ts` | linea 125
- `GET` `/diagnostico/test-tarea` | controller `diagnostico/diagnostico.controller.ts` | linea 94

## jornada

- `GET` `/jornada/asignaciones` | controller `jornada/jornada.controller.ts` | linea 51
- `POST` `/jornada/asignaciones` | controller `jornada/jornada.controller.ts` | linea 57
- `DELETE` `/jornada/asignaciones/:id` | controller `jornada/jornada.controller.ts` | linea 63
- `GET` `/jornada/horarios` | controller `jornada/jornada.controller.ts` | linea 19
- `POST` `/jornada/horarios` | controller `jornada/jornada.controller.ts` | linea 28
- `DELETE` `/jornada/horarios/:id` | controller `jornada/jornada.controller.ts` | linea 38
- `PUT` `/jornada/horarios/:id` | controller `jornada/jornada.controller.ts` | linea 32
- `GET` `/jornada/patrones` | controller `jornada/jornada.controller.ts` | linea 43
- `POST` `/jornada/patrones` | controller `jornada/jornada.controller.ts` | linea 48
- `GET` `/jornada/resolver/:carnet` | controller `jornada/jornada.controller.ts` | linea 9
- `GET` `/jornada/semana/:carnet` | controller `jornada/jornada.controller.ts` | linea 13

## marcaje

- `DELETE` `/marcaje/admin/asistencia/:id` | controller `marcaje/marcaje.controller.ts` | linea 141
- `GET` `/marcaje/admin/config` | controller `marcaje/marcaje.controller.ts` | linea 113
- `GET` `/marcaje/admin/dashboard` | controller `marcaje/marcaje.controller.ts` | linea 122
- `GET` `/marcaje/admin/devices` | controller `marcaje/marcaje.controller.ts` | linea 110
- `PUT` `/marcaje/admin/devices/:uuid` | controller `marcaje/marcaje.controller.ts` | linea 205
- `POST` `/marcaje/admin/geocercas` | controller `marcaje/marcaje.controller.ts` | linea 231
- `GET` `/marcaje/admin/geocercas/:carnet` | controller `marcaje/marcaje.controller.ts` | linea 225
- `DELETE` `/marcaje/admin/geocercas/:id` | controller `marcaje/marcaje.controller.ts` | linea 241
- `GET` `/marcaje/admin/ips` | controller `marcaje/marcaje.controller.ts` | linea 109
- `POST` `/marcaje/admin/ips` | controller `marcaje/marcaje.controller.ts` | linea 196
- `DELETE` `/marcaje/admin/ips/:id` | controller `marcaje/marcaje.controller.ts` | linea 201
- `GET` `/marcaje/admin/monitor` | controller `marcaje/marcaje.controller.ts` | linea 116
- `POST` `/marcaje/admin/reiniciar/:carnet` | controller `marcaje/marcaje.controller.ts` | linea 151
- `GET` `/marcaje/admin/reportes` | controller `marcaje/marcaje.controller.ts` | linea 166
- `GET` `/marcaje/admin/sites` | controller `marcaje/marcaje.controller.ts` | linea 105
- `POST` `/marcaje/admin/sites` | controller `marcaje/marcaje.controller.ts` | linea 176
- `DELETE` `/marcaje/admin/sites/:id` | controller `marcaje/marcaje.controller.ts` | linea 192
- `PUT` `/marcaje/admin/sites/:id` | controller `marcaje/marcaje.controller.ts` | linea 184
- `GET` `/marcaje/admin/solicitudes` | controller `marcaje/marcaje.controller.ts` | linea 100
- `PUT` `/marcaje/admin/solicitudes/:id/resolver` | controller `marcaje/marcaje.controller.ts` | linea 127
- `POST` `/marcaje/correccion` | controller `marcaje/marcaje.controller.ts` | linea 72
- `POST` `/marcaje/geocerca/validar` | controller `marcaje/marcaje.controller.ts` | linea 213
- `POST` `/marcaje/gps-track` | controller `marcaje/marcaje.controller.ts` | linea 85
- `POST` `/marcaje/gps-track-batch` | controller `marcaje/marcaje.controller.ts` | linea 90
- `POST` `/marcaje/mark` | controller `marcaje/marcaje.controller.ts` | linea 37
- `POST` `/marcaje/request-correction` | controller `marcaje/marcaje.controller.ts` | linea 72
- `GET` `/marcaje/summary` | controller `marcaje/marcaje.controller.ts` | linea 61
- `POST` `/marcaje/undo-last` | controller `marcaje/marcaje.controller.ts` | linea 66
- `POST` `/marcaje/undo-last-checkout` | controller `marcaje/marcaje.controller.ts` | linea 66

## planning

- `GET` `/mi-dia` | controller `planning/controllers/agenda.controller.ts` | linea 18
- `POST` `/mi-dia/checkin` | controller `planning/controllers/agenda.controller.ts` | linea 24
- `GET` `/planning/approvals` | controller `planning/planning.controller.ts` | linea 81
- `POST` `/planning/approvals/:idSolicitud/resolve` | controller `planning/planning.controller.ts` | linea 116
- `POST` `/planning/check-permission` | controller `planning/planning.controller.ts` | linea 33
- `GET` `/planning/dashboard/alerts` | controller `planning/planning.controller.ts` | linea 336
- `GET` `/planning/debug` | controller `planning/planning.controller.ts` | linea 367
- `GET` `/planning/grupos/:idGrupo` | controller `planning/planning.controller.ts` | linea 329
- `GET` `/planning/mi-asignacion` | controller `planning/planning.controller.ts` | linea 346
- `GET` `/planning/my-projects` | controller `planning/planning.controller.ts` | linea 223
- `GET` `/planning/pending` | controller `planning/planning.controller.ts` | linea 72
- `GET` `/planning/plans` | controller `planning/planning.controller.ts` | linea 156
- `POST` `/planning/plans` | controller `planning/planning.controller.ts` | linea 181
- `POST` `/planning/plans/:id/close` | controller `planning/planning.controller.ts` | linea 270
- `POST` `/planning/reassign` | controller `planning/planning.controller.ts` | linea 237
- `POST` `/planning/request-change` | controller `planning/planning.controller.ts` | linea 48
- `POST` `/planning/resolve` | controller `planning/planning.controller.ts` | linea 89
- `GET` `/planning/stats` | controller `planning/planning.controller.ts` | linea 186
- `GET` `/planning/stats/bottlenecks` | controller `planning/planning.controller.ts` | linea 211
- `GET` `/planning/stats/compliance` | controller `planning/planning.controller.ts` | linea 198
- `GET` `/planning/stats/performance` | controller `planning/planning.controller.ts` | linea 203
- `GET` `/planning/supervision` | controller `planning/planning.controller.ts` | linea 359
- `POST` `/planning/tasks/:id/agregar-fase` | controller `planning/planning.controller.ts` | linea 317
- `GET` `/planning/tasks/:id/avance-mensual` | controller `planning/planning.controller.ts` | linea 293
- `POST` `/planning/tasks/:id/avance-mensual` | controller `planning/planning.controller.ts` | linea 275
- `POST` `/planning/tasks/:id/clone` | controller `planning/planning.controller.ts` | linea 232
- `POST` `/planning/tasks/:id/crear-grupo` | controller `planning/planning.controller.ts` | linea 306
- `GET` `/planning/tasks/:id/history` | controller `planning/planning.controller.ts` | linea 257
- `GET` `/planning/team` | controller `planning/planning.controller.ts` | linea 218
- `POST` `/planning/update-operative` | controller `planning/planning.controller.ts` | linea 140

## software

- `GET` `/software/dashboard-stats` | controller `software/software.controller.ts` | linea 13

## visita-cliente

- `POST` `/visita-admin/agenda` | controller `visita-cliente/visita-admin.controller.ts` | linea 79
- `GET` `/visita-admin/agenda/:carnet` | controller `visita-cliente/visita-admin.controller.ts` | linea 71
- `DELETE` `/visita-admin/agenda/:id` | controller `visita-cliente/visita-admin.controller.ts` | linea 99
- `PUT` `/visita-admin/agenda/:id/reordenar` | controller `visita-cliente/visita-admin.controller.ts` | linea 92
- `POST` `/visita-admin/clientes` | controller `visita-cliente/visita-admin.controller.ts` | linea 33
- `DELETE` `/visita-admin/clientes/:id` | controller `visita-cliente/visita-admin.controller.ts` | linea 43
- `PUT` `/visita-admin/clientes/:id` | controller `visita-cliente/visita-admin.controller.ts` | linea 35
- `GET` `/visita-admin/dashboard` | controller `visita-cliente/visita-admin.controller.ts` | linea 52
- `POST` `/visita-admin/importar-clientes` | controller `visita-cliente/visita-admin.controller.ts` | linea 28
- `GET` `/visita-admin/metas` | controller `visita-cliente/visita-admin.controller.ts` | linea 103
- `POST` `/visita-admin/metas` | controller `visita-cliente/visita-admin.controller.ts` | linea 110
- `GET` `/visita-admin/reportes/km` | controller `visita-cliente/visita-admin.controller.ts` | linea 57
- `GET` `/visita-admin/tracking/:carnet` | controller `visita-cliente/visita-admin.controller.ts` | linea 64
- `GET` `/visita-admin/visitas` | controller `visita-cliente/visita-admin.controller.ts` | linea 47
- `GET` `/visita-campo/agenda` | controller `visita-cliente/visita-campo.controller.ts` | linea 28
- `POST` `/visita-campo/checkin` | controller `visita-cliente/visita-campo.controller.ts` | linea 42
- `POST` `/visita-campo/checkout` | controller `visita-cliente/visita-campo.controller.ts` | linea 47
- `GET` `/visita-campo/clientes` | controller `visita-cliente/visita-campo.controller.ts` | linea 37
- `GET` `/visita-campo/resumen` | controller `visita-cliente/visita-campo.controller.ts` | linea 52
- `GET` `/visita-campo/stats/km` | controller `visita-cliente/visita-campo.controller.ts` | linea 62
- `POST` `/visita-campo/tracking-batch` | controller `visita-cliente/visita-campo.controller.ts` | linea 57
- `GET` `/visita-campo/tracking-raw` | controller `visita-cliente/visita-campo.controller.ts` | linea 67
- `GET` `/visita-campo/usuarios-tracking` | controller `visita-cliente/visita-campo.controller.ts` | linea 75
