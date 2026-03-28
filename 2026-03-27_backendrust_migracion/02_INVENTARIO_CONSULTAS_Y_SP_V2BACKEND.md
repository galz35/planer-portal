# Inventario Consultas y SP v2backend

Fecha: 2026-03-27

## Dependencias a Stored Procedures

## acceso

- `acceso/acceso.repo.ts`
  SPs: `sp_DelegacionVisibilidad_Crear`, `sp_DelegacionVisibilidad_Desactivar`, `sp_DelegacionVisibilidad_ListarActivas`, `sp_DelegacionVisibilidad_ListarPorDelegante`, `sp_DelegacionVisibilidad_ObtenerActivas`, `sp_Organizacion_BuscarNodoPorId`, `sp_Organizacion_BuscarNodos`, `sp_Organizacion_ContarEmpleadosNodoDirecto`, `sp_Organizacion_ContarEmpleadosPorNodo`, `sp_Organizacion_ObtenerArbol`, `sp_Organizacion_ObtenerEmpleadosNodoDirecto`, `sp_Organizacion_SubarbolContarEmpleados`, `sp_Organizacion_SubarbolPreviewEmpleados`, `sp_PermisoArea_Crear`, `sp_PermisoArea_Desactivar`, `sp_PermisoArea_ListarActivos`, `sp_PermisoArea_ObtenerActivosPorRecibe`, `sp_PermisoEmpleado_Crear`, `sp_PermisoEmpleado_Desactivar`, `sp_PermisoEmpleado_ListarActivos`, `sp_PermisoEmpleado_ObtenerActivosPorRecibe`, `sp_Usuarios_Buscar`, `sp_Usuarios_BuscarPorCarnet`, `sp_Usuarios_BuscarPorCorreo`, `sp_Usuarios_ListarActivos`, `sp_Usuarios_ObtenerCarnetPorId`, `sp_Usuarios_ObtenerDetallesPorCarnets`, `sp_Visibilidad_ObtenerCarnets`, `sp_Visibilidad_ObtenerMiEquipo`

## admin

- `admin/admin.repo.ts`
  SPs: `sp_Admin_ReporteInactividad`, `sp_Admin_Usuario_Crear`, `sp_Admin_Usuario_Eliminar`, `sp_Admin_Usuario_RemoverNodo`

## campo

- `campo/recorrido.service.ts`
  SPs: `sp_campo_finalizar_recorrido`, `sp_campo_iniciar_recorrido`, `sp_campo_registrar_punto`

## clarity

- `clarity/clarity.repo.ts`
  SPs: `sp_Checkin_Upsert_v2`, `sp_Checkins_ObtenerPorEquipoFecha`, `sp_Checkins_ObtenerPorUsuarioFecha`, `sp_Equipo_ObtenerHoy`, `sp_Equipo_ObtenerInforme`, `sp_Nota_Actualizar`, `sp_Nota_Crear`, `sp_Nota_Eliminar`, `sp_Notas_Obtener`, `sp_ObtenerResumenDiarioEquipo`, `sp_Tarea_AsignarResponsable`, `sp_Tarea_Bloquear`, `sp_Tarea_DescartarConSubtareas`, `sp_Tarea_MoverAProyecto`, `sp_Tareas_ObtenerMultiplesUsuarios`, `sp_Tareas_ObtenerPorProyecto`, `sp_Tareas_ObtenerPorUsuario`, `sp_Usuarios_ObtenerDetallesPorCarnets`
- `clarity/organizacion.controller.ts`
  SPs: `sp_Organizacion_ObtenerCatalogo`, `sp_Organizacion_ObtenerEstructura`
- `clarity/recurrencia.repo.ts`
  SPs: `sp_Instancia_Upsert`, `sp_Recurrencia_Crear`, `sp_Recurrencia_ObtenerPorTarea`
- `clarity/tasks.repo.ts`
  SPs: `sp_Tarea_CrearCompleta_v2`, `sp_Tarea_RecalcularJerarquia_v2`
- `clarity/tasks.service.ts`
  SPs: `sp_Tarea_AgregarColaborador`, `sp_Tarea_RemoverColaborador`

## colaboradores

- `colaboradores/colaboradores.repo.ts`
  SPs: `sp_ProyectoColaboradores_Actualizar`, `sp_ProyectoColaboradores_Invitar`, `sp_ProyectoColaboradores_LimpiarExpirados`, `sp_ProyectoColaboradores_Listar`, `sp_ProyectoColaboradores_Revocar`, `sp_ProyectoColaboradores_VerificarPermiso`

## common

- `common/audit.repo.ts`
  SPs: `sp_Auditoria_Equipo_PorCarnet_Contar`, `sp_Auditoria_Equipo_PorCarnet_FAST`
- `common/notification.controller.ts`
  SPs: `sp_Dispositivos_Registrar`
- `common/notification.service.ts`
  SPs: `sp_Dispositivos_ObtenerPorUsuario`
- `common/reminder.service.ts`
  SPs: `sp_Reporte_TareasAtrasadas_Cron`

## diagnostico

- `diagnostico/diagnostico.controller.ts`
  SPs: `sp_Tarea_Crear`

## jornada

- `jornada/jornada.service.ts`
  SPs: `sp_jornada_resolver`, `sp_jornada_semana`

## marcaje

- `marcaje/marcaje.service.ts`
  SPs: `sp_marcaje_admin_crud_ip`, `sp_marcaje_admin_crud_site`, `sp_marcaje_admin_device`, `sp_marcaje_admin_eliminar`, `sp_marcaje_admin_reiniciar`, `sp_marcaje_dashboard_kpis`, `sp_marcaje_deshacer_ultimo`, `sp_marcaje_geocercas_usuario`, `sp_marcaje_gps_batch`, `sp_marcaje_monitor_dia`, `sp_marcaje_registrar`, `sp_marcaje_reporte_asistencia`, `sp_marcaje_resolver_solicitud`, `sp_marcaje_solicitar_correccion`, `sp_marcaje_validar_geocerca`

## planning

- `planning/avance-mensual.repo.ts`
  SPs: `sp_UpsertAvanceMensual`
- `planning/grupo.repo.ts`
  SPs: `sp_AgregarFaseGrupo`, `sp_CrearGrupoInicial`
- `planning/planning.repo.ts`
  SPs: `sp_ObtenerProyectos`, `sp_Plan_Cerrar`, `sp_Planning_ObtenerPlanes`, `sp_Planning_ObtenerProyectosAsignados`, `sp_Proyecto_ObtenerVisibles`, `sp_Proyectos_Gestion`, `sp_Proyectos_Listar`, `sp_Tarea_Clonar`, `sp_Tareas_ObtenerPorUsuario`, `sp_Tareas_Reasignar_PorCarnet`

## visita-cliente

- `visita-cliente/repos/cliente.repo.ts`
  SPs: `sp_vc_cliente_actualizar`, `sp_vc_cliente_crear`, `sp_vc_cliente_eliminar`, `sp_vc_importar_clientes`
- `visita-cliente/repos/tracking.repo.ts`
  SPs: `sp_vc_calculo_km_dia`, `sp_vc_tracking_batch`, `sp_vc_tracking_por_dia`, `sp_vc_usuarios_con_tracking`
- `visita-cliente/repos/visita.repo.ts`
  SPs: `sp_vc_agenda_hoy`, `sp_vc_checkin`, `sp_vc_checkout`, `sp_vc_resumen_dia`
- `visita-cliente/visita-admin.service.ts`
  SPs: `sp_vc_agenda_crear`, `sp_vc_agenda_eliminar`, `sp_vc_agenda_listar`, `sp_vc_agenda_reordenar`, `sp_vc_meta_listar`, `sp_vc_meta_set`

## Dependencias a SQL directo

## admin

- `admin/admin.repo.ts`
  Operaciones: `DELETE FROM`, `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `p_Logs`, `p_OrganizacionNodos`, `p_Proyectos`, `p_Roles`, `p_SeguridadPerfiles`, `p_Tareas`, `p_Usuarios`, `p_UsuariosConfig`, `p_UsuariosOrganizacion`, `para`
- `admin/import.service.ts`
  Operaciones: `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `p_OrganizacionNodos`, `p_Usuarios`, `p_UsuariosCredenciales`

## campo

- `campo/recorrido.service.ts`
  Operaciones: `SELECT`
  Tablas: `campo_recorrido_puntos`, `campo_recorridos`, `rrhh.Colaboradores`

## clarity

- `clarity/bloqueos.service.ts`
  Operaciones: `SELECT`
  Tablas: `p_Bloqueos`, `p_Tareas`, `p_Usuarios`
- `clarity/clarity.repo.ts`
  Operaciones: `DELETE FROM`, `SELECT`, `UPDATE`
  Tablas: `STRING_SPLIT`, `p_Bloqueos`, `p_CheckinTareas`, `p_Checkins`, `p_Notas`, `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`, `p_UsuariosConfig`, `sys.columns`
- `clarity/equipo.service.ts`
  Operaciones: `SELECT`
  Tablas: `STRING_SPLIT`, `p_Bloqueos`, `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`
- `clarity/foco.service.ts`
  Operaciones: `DELETE FROM`, `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `p_FocoDiario_v2`, `p_Tareas`
- `clarity/recurrencia.repo.ts`
  Operaciones: `SELECT`, `UPDATE`
  Tablas: `Inst`, `RecAplica`, `p_TareaInstancia`, `p_TareaRecurrencia`, `p_Tareas`
- `clarity/reports.service.ts`
  Operaciones: `SELECT`
  Tablas: `STRING_SPLIT`, `p_Bloqueos`, `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`
- `clarity/tasks.repo.ts`
  Operaciones: `DELETE FROM`, `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `Base`, `p_Proyectos`, `p_TareaAsignados`, `p_TareaAvances`, `p_TareaRecordatorios`, `p_Tareas`, `sys.tables`

## colaboradores

- `colaboradores/colaboradores.repo.ts`
  Operaciones: `SELECT`
  Tablas: `p_ProyectoColaboradores`, `p_RolesColaboracion`

## common

- `common/audit.repo.ts`
  Operaciones: `INSERT INTO`, `SELECT`
  Tablas: `Scope`, `p_Auditoria`, `p_Logs`, `p_Tareas`, `p_Usuarios`
- `common/notification.controller.ts`
  Operaciones: `SELECT`
  Tablas: `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`
- `common/notification.service.ts`
  Operaciones: `INSERT INTO`
  Tablas: `p_Notificaciones_Enviadas`

## db

- `db/base.repo.ts`
  Operaciones: `INSERT INTO`
  Tablas: `dbo.p_SlowQueries`, `object`

## diagnostico

- `diagnostico/diagnostico.controller.ts`
  Operaciones: `SELECT`
  Tablas: `p_Tareas`

## jornada

- `jornada/jornada.service.ts`
  Operaciones: `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `marcaje_asignacion`, `marcaje_horarios`, `marcaje_patrones`, `marcaje_patrones_detalle`, `rrhh.Colaboradores`

## marcaje

- `marcaje/marcaje.service.ts`
  Operaciones: `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `marcaje_asistencias`, `marcaje_devices`, `marcaje_ip_whitelist`, `marcaje_sites`, `marcaje_solicitudes`, `marcaje_usuario_geocercas`, `rrhh.Colaboradores`

## planning

- `planning/analytics.service.ts`
  Operaciones: `SELECT`
  Tablas: `p_Bloqueos`, `p_PlanesTrabajo`, `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`
- `planning/avance-mensual.repo.ts`
  Operaciones: `SELECT`
  Tablas: `p_TareaAvanceMensual`
- `planning/grupo.repo.ts`
  Operaciones: `SELECT`
  Tablas: `p_Tareas`
- `planning/planning.repo.ts`
  Operaciones: `INSERT INTO`, `SELECT`, `UPDATE`
  Tablas: `TareasEquipo`, `con`, `dbo.p_CheckinTareas`, `dbo.p_Checkins`, `dbo.p_Proyectos`, `dbo.p_TareaAsignados`, `dbo.p_Tareas`, `dbo.p_Usuarios`, `din`, `p_OrganizacionNodos`, `p_PlanesTrabajo`, `p_Proyectos`, `p_Roles`, `p_SolicitudesCambio`, `p_TareaAsignados`, `p_TareaAvances`, `p_Tareas`, `p_Usuarios`, `p_UsuariosOrganizacion`, `para`, `sys.columns`

## scripts

- `scripts/check_add_activo.ts`
  Operaciones: `SELECT`
  Tablas: `sys.columns`
- `scripts/check_add_audit_subtasks.ts`
  Operaciones: `SELECT`
  Tablas: `sys.columns`
- `scripts/check_carnet_missing.ts`
  Operaciones: `SELECT`
  Tablas: `INFORMATION_SCHEMA.COLUMNS`
- `scripts/check_columns.ts`
  Operaciones: `SELECT`
  Tablas: `INFORMATION_SCHEMA.COLUMNS`
- `scripts/generate_id_mapping.ts`
  Operaciones: `MERGE INTO`, `SELECT`
  Tablas: `p_Tareas`, `p_Usuarios`
- `scripts/validate_carnets.ts`
  Operaciones: `SELECT`
  Tablas: `p_Usuarios`
- `scripts/verify_soft_delete.ts`
  Operaciones: `INSERT INTO`, `SELECT`
  Tablas: `p_Tareas`

## software

- `software/software.service.ts`
  Operaciones: `SELECT`
  Tablas: `p_Bloqueos`, `p_Proyectos`, `p_TareaAsignados`, `p_Tareas`, `p_Usuarios`

## visita-cliente

- `visita-cliente/repos/cliente.repo.ts`
  Operaciones: `SELECT`
  Tablas: `vc_clientes`
- `visita-cliente/repos/visita.repo.ts`
  Operaciones: `SELECT`
  Tablas: `vc_clientes`, `vc_visitas`

## Nota operativa

- Si una API Nest usa SP, la migración a Rust debe probar el mismo SP o un reemplazo certificado.
- Si una API Nest usa SQL directo, hay que igualar joins, filtros, side effects y response shape.
