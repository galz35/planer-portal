-- ============================================================
-- MIGRACIÓN MASIVA: Wrappers _rust para Backend Rust
-- Generado por PowerShell
-- ============================================================

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ProyectoColaboradores_Invitar_rust')
    DROP PROCEDURE dbo.sp_ProyectoColaboradores_Invitar_rust;
GO

CREATE PROCEDURE dbo.sp_ProyectoColaboradores_Invitar_rust
    @idProyecto int = NULL,
    @idUsuario int = NULL,
    @rolColaboracion nvarchar(50) = NULL,
    @invitadoPor int = NULL,
    @fechaExpiracion datetime = NULL,
    @notas nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Invitar @idProyecto, @idUsuario, @rolColaboracion, @invitadoPor, @fechaExpiracion, @notas;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_registrar_rust')
    DROP PROCEDURE dbo.sp_marcaje_registrar_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_registrar_rust
    @carnet varchar(20) = NULL,
    @tipo_marcaje varchar(30) = NULL,
    @tipo_device varchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @ip varchar(50) = NULL,
    @user_agent nvarchar(500) = NULL,
    @device_uuid varchar(100) = NULL,
    @timestamp_marca datetime2 = NULL,
    @offline_id varchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_registrar @carnet, @tipo_marcaje, @tipo_device, @lat, @lon, @accuracy, @ip, @user_agent, @device_uuid, @timestamp_marca, @offline_id;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_admin_reiniciar_rust')
    DROP PROCEDURE dbo.sp_marcaje_admin_reiniciar_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_admin_reiniciar_rust
    @carnet varchar(20) = NULL,
    @admin_carnet varchar(20) = NULL,
    @motivo nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_reiniciar @carnet, @admin_carnet, @motivo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_jornada_resolver_rust')
    DROP PROCEDURE dbo.sp_jornada_resolver_rust;
GO

CREATE PROCEDURE dbo.sp_jornada_resolver_rust
    @carnet nvarchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_jornada_resolver @carnet, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_solicitar_correccion_rust')
    DROP PROCEDURE dbo.sp_marcaje_solicitar_correccion_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_solicitar_correccion_rust
    @carnet varchar(20) = NULL,
    @asistencia_id int = NULL,
    @tipo_solicitud varchar(50) = NULL,
    @motivo nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_solicitar_correccion @carnet, @asistencia_id, @tipo_solicitud, @motivo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Equipo_ObtenerHoy_rust')
    DROP PROCEDURE dbo.sp_Equipo_ObtenerHoy_rust;
GO

CREATE PROCEDURE dbo.sp_Equipo_ObtenerHoy_rust
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Equipo_ObtenerHoy @carnetsList, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_geocercas_usuario_rust')
    DROP PROCEDURE dbo.sp_marcaje_geocercas_usuario_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_geocercas_usuario_rust
    @carnet nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_geocercas_usuario @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_gps_batch_rust')
    DROP PROCEDURE dbo.sp_marcaje_gps_batch_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_gps_batch_rust
    @carnet varchar(20) = NULL,
    @puntos nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_gps_batch @carnet, @puntos;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Usuarios_ObtenerDetallesPorCarnets_rust')
    DROP PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorCarnets_rust;
GO

CREATE PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorCarnets_rust
    @CarnetsCsv nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Usuarios_ObtenerDetallesPorCarnets @CarnetsCsv;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_reporte_asistencia_rust')
    DROP PROCEDURE dbo.sp_marcaje_reporte_asistencia_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_reporte_asistencia_rust
    @fecha_inicio date = NULL,
    @fecha_fin date = NULL,
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_reporte_asistencia @fecha_inicio, @fecha_fin, @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ProyectoColaboradores_Revocar_rust')
    DROP PROCEDURE dbo.sp_ProyectoColaboradores_Revocar_rust;
GO

CREATE PROCEDURE dbo.sp_ProyectoColaboradores_Revocar_rust
    @idProyecto int = NULL,
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Revocar @idProyecto, @idUsuario;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_CrearGrupoInicial_rust')
    DROP PROCEDURE dbo.sp_CrearGrupoInicial_rust;
GO

CREATE PROCEDURE dbo.sp_CrearGrupoInicial_rust
    @idTarea int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_CrearGrupoInicial @idTarea;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Usuarios_BuscarPorCarnet_rust')
    DROP PROCEDURE dbo.sp_Usuarios_BuscarPorCarnet_rust;
GO

CREATE PROCEDURE dbo.sp_Usuarios_BuscarPorCarnet_rust
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Usuarios_BuscarPorCarnet @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerPorProyecto_rust')
    DROP PROCEDURE dbo.sp_Tareas_ObtenerPorProyecto_rust;
GO

CREATE PROCEDURE dbo.sp_Tareas_ObtenerPorProyecto_rust
    @idProyecto int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerPorProyecto @idProyecto;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_resumen_diario_rust')
    DROP PROCEDURE dbo.sp_marcaje_resumen_diario_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_resumen_diario_rust
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_resumen_diario @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_checkin_rust')
    DROP PROCEDURE dbo.sp_vc_checkin_rust;
GO

CREATE PROCEDURE dbo.sp_vc_checkin_rust
    @carnet varchar(20) = NULL,
    @cliente_id int = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @timestamp datetime2 = NULL,
    @agenda_id int = NULL,
    @offline_id varchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_checkin @carnet, @cliente_id, @lat, @lon, @accuracy, @timestamp, @agenda_id, @offline_id;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerMultiplesUsuarios_rust')
    DROP PROCEDURE dbo.sp_Tareas_ObtenerMultiplesUsuarios_rust;
GO

CREATE PROCEDURE dbo.sp_Tareas_ObtenerMultiplesUsuarios_rust
    @carnetsList nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerMultiplesUsuarios @carnetsList;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_admin_device_rust')
    DROP PROCEDURE dbo.sp_marcaje_admin_device_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_admin_device_rust
    @uuid varchar(100) = NULL,
    @estado varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_device @uuid, @estado;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_tracking_batch_rust')
    DROP PROCEDURE dbo.sp_vc_tracking_batch_rust;
GO

CREATE PROCEDURE dbo.sp_vc_tracking_batch_rust
    @carnet varchar(20) = NULL,
    @puntos nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_tracking_batch @carnet, @puntos;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Eliminar_rust')
    DROP PROCEDURE dbo.sp_Tarea_Eliminar_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_Eliminar_rust
    @idTarea int = NULL,
    @carnetSolicitante nvarchar(50) = NULL,
    @motivo nvarchar(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Eliminar @idTarea, @carnetSolicitante, @motivo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_tracking_por_dia_rust')
    DROP PROCEDURE dbo.sp_vc_tracking_por_dia_rust;
GO

CREATE PROCEDURE dbo.sp_vc_tracking_por_dia_rust
    @carnet varchar(20) = NULL,
    @fecha datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_tracking_por_dia @carnet, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_dashboard_kpis_rust')
    DROP PROCEDURE dbo.sp_marcaje_dashboard_kpis_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_dashboard_kpis_rust
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_dashboard_kpis @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Visibilidad_ObtenerMiEquipo_rust')
    DROP PROCEDURE dbo.sp_Visibilidad_ObtenerMiEquipo_rust;
GO

CREATE PROCEDURE dbo.sp_Visibilidad_ObtenerMiEquipo_rust
    @idUsuario int = NULL,
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Visibilidad_ObtenerMiEquipo @idUsuario, @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Dispositivos_ObtenerPorUsuario_rust')
    DROP PROCEDURE dbo.sp_Dispositivos_ObtenerPorUsuario_rust;
GO

CREATE PROCEDURE dbo.sp_Dispositivos_ObtenerPorUsuario_rust
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dispositivos_ObtenerPorUsuario @idUsuario;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_AgregarFaseGrupo_rust')
    DROP PROCEDURE dbo.sp_AgregarFaseGrupo_rust;
GO

CREATE PROCEDURE dbo.sp_AgregarFaseGrupo_rust
    @idGrupo int = NULL,
    @idTareaNueva int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_AgregarFaseGrupo @idGrupo, @idTareaNueva;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_resumen_dia_rust')
    DROP PROCEDURE dbo.sp_vc_resumen_dia_rust;
GO

CREATE PROCEDURE dbo.sp_vc_resumen_dia_rust
    @carnet varchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_resumen_dia @carnet, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_calculo_km_dia_rust')
    DROP PROCEDURE dbo.sp_vc_calculo_km_dia_rust;
GO

CREATE PROCEDURE dbo.sp_vc_calculo_km_dia_rust
    @carnet varchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_calculo_km_dia @carnet, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Dispositivos_Registrar_rust')
    DROP PROCEDURE dbo.sp_Dispositivos_Registrar_rust;
GO

CREATE PROCEDURE dbo.sp_Dispositivos_Registrar_rust
    @idUsuario int = NULL,
    @tokenFCM nvarchar(500) = NULL,
    @plataforma nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dispositivos_Registrar @idUsuario, @tokenFCM, @plataforma;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_DelegacionVisibilidad_ObtenerActivas_rust')
    DROP PROCEDURE dbo.sp_DelegacionVisibilidad_ObtenerActivas_rust;
GO

CREATE PROCEDURE dbo.sp_DelegacionVisibilidad_ObtenerActivas_rust
    @carnetDelegado nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_DelegacionVisibilidad_ObtenerActivas @carnetDelegado;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Visibilidad_ObtenerCarnets_rust')
    DROP PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets_rust;
GO

CREATE PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets_rust
    @carnetSolicitante nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_monitor_dia_rust')
    DROP PROCEDURE dbo.sp_marcaje_monitor_dia_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_monitor_dia_rust
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_monitor_dia @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Clonar_rust')
    DROP PROCEDURE dbo.sp_Tarea_Clonar_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_Clonar_rust
    @idTareaFuente int = NULL,
    @ejecutorCarnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Clonar @idTareaFuente, @ejecutorCarnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_resolver_solicitud_rust')
    DROP PROCEDURE dbo.sp_marcaje_resolver_solicitud_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_resolver_solicitud_rust
    @solicitud_id int = NULL,
    @accion varchar(20) = NULL,
    @admin_comentario nvarchar(500) = NULL,
    @admin_carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_resolver_solicitud @solicitud_id, @accion, @admin_comentario, @admin_carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Bloquear_rust')
    DROP PROCEDURE dbo.sp_Tarea_Bloquear_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_Bloquear_rust
    @idTarea int = NULL,
    @carnetOrigen nvarchar(50) = NULL,
    @carnetDestino nvarchar(50) = NULL,
    @motivo nvarchar(255) = NULL,
    @destinoTexto nvarchar(255) = NULL,
    @accionMitigacion nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Bloquear @idTarea, @carnetOrigen, @carnetDestino, @motivo, @destinoTexto, @accionMitigacion;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_campo_registrar_punto_rust')
    DROP PROCEDURE dbo.sp_campo_registrar_punto_rust;
GO

CREATE PROCEDURE dbo.sp_campo_registrar_punto_rust
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @velocidad_kmh decimal = NULL,
    @tipo nvarchar(20) = NULL,
    @id_cliente int = NULL,
    @notas nvarchar(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_registrar_punto @carnet, @lat, @lon, @accuracy, @velocidad_kmh, @tipo, @id_cliente, @notas;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_ObtenerProyectosAsignados_rust')
    DROP PROCEDURE dbo.sp_Planning_ObtenerProyectosAsignados_rust;
GO

CREATE PROCEDURE dbo.sp_Planning_ObtenerProyectosAsignados_rust
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Planning_ObtenerProyectosAsignados @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Dashboard_Kpis_rust')
    DROP PROCEDURE dbo.sp_Dashboard_Kpis_rust;
GO

CREATE PROCEDURE dbo.sp_Dashboard_Kpis_rust
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dashboard_Kpis @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_RecalcularJerarquia_rust')
    DROP PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_rust
    @idTareaInicio int = NULL,
    @idPadreDirecto int = NULL,
    @maxDepth int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_RecalcularJerarquia_v2 @idTareaInicio, @idPadreDirecto, @maxDepth;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_CrearCompleta_rust')
    DROP PROCEDURE dbo.sp_Tarea_CrearCompleta_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_CrearCompleta_rust
    @nombre nvarchar(255) = NULL,
    @idUsuario int = NULL,
    @idProyecto int = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @idTareaPadre int = NULL,
    @idResponsable int = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @esfuerzo nvarchar(50) = NULL,
    @tipo nvarchar(50) = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @fechaObjetivo datetime = NULL,
    @porcentaje int = NULL,
    @orden int = NULL,
    @comportamiento nvarchar(50) = NULL,
    @requiereEvidencia bit = NULL,
    @idEntregable int = NULL,
    @semana int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_CrearCompleta_v2 @nombre, @idUsuario, @idProyecto, @descripcion, @idTareaPadre, @idResponsable, @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento, @requiereEvidencia, @idEntregable, @semana;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_UpsertAvanceMensual_rust')
    DROP PROCEDURE dbo.sp_UpsertAvanceMensual_rust;
GO

CREATE PROCEDURE dbo.sp_UpsertAvanceMensual_rust
    @idTarea int = NULL,
    @anio int = NULL,
    @mes int = NULL,
    @porcentajeMes decimal = NULL,
    @comentario nvarchar(MAX) = NULL,
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_UpsertAvanceMensual @idTarea, @anio, @mes, @porcentajeMes, @comentario, @idUsuario;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_DescartarConSubtareas_rust')
    DROP PROCEDURE dbo.sp_Tarea_DescartarConSubtareas_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_DescartarConSubtareas_rust
    @idTarea int = NULL,
    @carnet nvarchar(100) = NULL,
    @motivo nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_DescartarConSubtareas @idTarea, @carnet, @motivo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Admin_Usuario_Crear_rust')
    DROP PROCEDURE dbo.sp_Admin_Usuario_Crear_rust;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_Crear_rust
    @nombre nvarchar(200) = NULL,
    @correo nvarchar(200) = NULL,
    @carnet nvarchar(50) = NULL,
    @cargo nvarchar(100) = NULL,
    @telefono nvarchar(50) = NULL,
    @rol nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Admin_Usuario_Crear @nombre, @correo, @carnet, @cargo, @telefono, @rol;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_deshacer_ultimo_rust')
    DROP PROCEDURE dbo.sp_marcaje_deshacer_ultimo_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_deshacer_ultimo_rust
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_deshacer_ultimo @carnet;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Equipo_ObtenerInforme_rust')
    DROP PROCEDURE dbo.sp_Equipo_ObtenerInforme_rust;
GO

CREATE PROCEDURE dbo.sp_Equipo_ObtenerInforme_rust
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Equipo_ObtenerInforme @carnetsList, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_admin_eliminar_rust')
    DROP PROCEDURE dbo.sp_marcaje_admin_eliminar_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_admin_eliminar_rust
    @asistencia_id int = NULL,
    @admin_carnet varchar(20) = NULL,
    @motivo nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_eliminar @asistencia_id, @admin_carnet, @motivo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_MoverAProyecto_rust')
    DROP PROCEDURE dbo.sp_Tarea_MoverAProyecto_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_MoverAProyecto_rust
    @idTarea int = NULL,
    @idProyectoDestino int = NULL,
    @idUsuarioEjecutor int = NULL,
    @moverSubtareas bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_MoverAProyecto @idTarea, @idProyectoDestino, @idUsuarioEjecutor, @moverSubtareas;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_importar_clientes_rust')
    DROP PROCEDURE dbo.sp_vc_importar_clientes_rust;
GO

CREATE PROCEDURE dbo.sp_vc_importar_clientes_rust
    @clientes_json nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_importar_clientes @clientes_json;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Proyectos_Gestion_rust')
    DROP PROCEDURE dbo.sp_Proyectos_Gestion_rust;
GO

CREATE PROCEDURE dbo.sp_Proyectos_Gestion_rust
    @Accion nvarchar(50) = NULL,
    @idProyecto int = NULL,
    @nombre nvarchar(255) = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @idNodoDuenio int = NULL,
    @area nvarchar(255) = NULL,
    @subgerencia nvarchar(255) = NULL,
    @gerencia nvarchar(255) = NULL,
    @fechaInicio datetime = NULL,
    @fechaFin datetime = NULL,
    @idCreador int = NULL,
    @creadorCarnet nvarchar(50) = NULL,
    @responsableCarnet nvarchar(50) = NULL,
    @tipo nvarchar(100) = NULL,
    @estado nvarchar(50) = NULL,
    @UpdatesJSON nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Proyectos_Gestion @Accion, @idProyecto, @nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, @idCreador, @creadorCarnet, @responsableCarnet, @tipo, @estado, @UpdatesJSON;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Checkins_ObtenerPorEquipoFecha_rust')
    DROP PROCEDURE dbo.sp_Checkins_ObtenerPorEquipoFecha_rust;
GO

CREATE PROCEDURE dbo.sp_Checkins_ObtenerPorEquipoFecha_rust
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Checkins_ObtenerPorEquipoFecha @carnetsList, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_campo_iniciar_recorrido_rust')
    DROP PROCEDURE dbo.sp_campo_iniciar_recorrido_rust;
GO

CREATE PROCEDURE dbo.sp_campo_iniciar_recorrido_rust
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_iniciar_recorrido @carnet, @lat, @lon;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_admin_crud_site_rust')
    DROP PROCEDURE dbo.sp_marcaje_admin_crud_site_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_admin_crud_site_rust
    @accion varchar(20) = NULL,
    @id int = NULL,
    @nombre nvarchar(200) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @radio_metros int = NULL,
    @accuracy_max int = NULL,
    @activo bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_crud_site @accion, @id, @nombre, @lat, @lon, @radio_metros, @accuracy_max, @activo;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_DelegacionVisibilidad_Crear_rust')
    DROP PROCEDURE dbo.sp_DelegacionVisibilidad_Crear_rust;
GO

CREATE PROCEDURE dbo.sp_DelegacionVisibilidad_Crear_rust
    @delegante nvarchar(50) = NULL,
    @delegado nvarchar(50) = NULL,
    @motivo nvarchar(500) = NULL,
    @fecha_inicio nvarchar(50) = NULL,
    @fecha_fin nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_DelegacionVisibilidad_Crear @delegante, @delegado, @motivo, @fecha_inicio, @fecha_fin;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_campo_finalizar_recorrido_rust')
    DROP PROCEDURE dbo.sp_campo_finalizar_recorrido_rust;
GO

CREATE PROCEDURE dbo.sp_campo_finalizar_recorrido_rust
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @notas nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_finalizar_recorrido @carnet, @lat, @lon, @notas;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ActualizarTarea_rust')
    DROP PROCEDURE dbo.sp_ActualizarTarea_rust;
GO

CREATE PROCEDURE dbo.sp_ActualizarTarea_rust
    @titulo nvarchar(500) = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @progreso int = NULL,
    @fechaObjetivo datetime = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @linkEvidencia nvarchar(MAX) = NULL,
    @idTareaPadre int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ActualizarTarea @titulo, @descripcion, @estado, @prioridad, @progreso, @fechaObjetivo, @fechaInicioPlanificada, @linkEvidencia, @idTareaPadre;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ProyectoColaboradores_Actualizar_rust')
    DROP PROCEDURE dbo.sp_ProyectoColaboradores_Actualizar_rust;
GO

CREATE PROCEDURE dbo.sp_ProyectoColaboradores_Actualizar_rust
    @idProyecto int = NULL,
    @idUsuario int = NULL,
    @rolColaboracion nvarchar(50) = NULL,
    @permisosCustom nvarchar(MAX) = NULL,
    @fechaExpiracion datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Actualizar @idProyecto, @idUsuario, @rolColaboracion, @permisosCustom, @fechaExpiracion;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_vc_agenda_hoy_rust')
    DROP PROCEDURE dbo.sp_vc_agenda_hoy_rust;
GO

CREATE PROCEDURE dbo.sp_vc_agenda_hoy_rust
    @carnet varchar(20) = NULL,
    @lat_actual decimal = NULL,
    @lon_actual decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_agenda_hoy @carnet, @lat_actual, @lon_actual;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerPorUsuario_rust')
    DROP PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario_rust;
GO

CREATE PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario_rust
    @carnet nvarchar(50) = NULL,
    @estado nvarchar(50) = NULL,
    @idProyecto int = NULL,
    @query nvarchar(100) = NULL,
    @startDate datetime = NULL,
    @endDate datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerPorUsuario @carnet, @estado, @idProyecto, @query, @startDate, @endDate;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_marcaje_validar_geocerca_rust')
    DROP PROCEDURE dbo.sp_marcaje_validar_geocerca_rust;
GO

CREATE PROCEDURE dbo.sp_marcaje_validar_geocerca_rust
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_validar_geocerca @carnet, @lat, @lon;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_AsignarResponsable_rust')
    DROP PROCEDURE dbo.sp_Tarea_AsignarResponsable_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_AsignarResponsable_rust
    @idTarea int = NULL,
    @carnetUsuario nvarchar(50) = NULL,
    @tipo nvarchar(20) = NULL,
    @esReasignacion bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_AsignarResponsable @idTarea, @carnetUsuario, @tipo, @esReasignacion;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_jornada_semana_rust')
    DROP PROCEDURE dbo.sp_jornada_semana_rust;
GO

CREATE PROCEDURE dbo.sp_jornada_semana_rust
    @carnet nvarchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_jornada_semana @carnet, @fecha;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Admin_Usuario_Eliminar_rust')
    DROP PROCEDURE dbo.sp_Admin_Usuario_Eliminar_rust;
GO

CREATE PROCEDURE dbo.sp_Admin_Usuario_Eliminar_rust
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Admin_Usuario_Eliminar @idUsuario;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Crear_rust')
    DROP PROCEDURE dbo.sp_Tarea_Crear_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_Crear_rust
    @nombre nvarchar(200) = NULL,
    @idUsuario int = NULL,
    @idProyecto int = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @esfuerzo nvarchar(20) = NULL,
    @tipo nvarchar(50) = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @fechaObjetivo datetime = NULL,
    @porcentaje int = NULL,
    @orden int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Crear @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden;
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ProyectoColaboradores_Listar_rust')
    DROP PROCEDURE dbo.sp_ProyectoColaboradores_Listar_rust;
GO

CREATE PROCEDURE dbo.sp_ProyectoColaboradores_Listar_rust
    @idProyecto int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Listar @idProyecto;
END
GO

-- ============================================================
-- SPs NUEVOS (Logica manual corregida)
-- ============================================================

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Admin_Security_UsersAccess_rust') DROP PROCEDURE dbo.sp_Admin_Security_UsersAccess_rust;
GO
CREATE PROCEDURE sp_Admin_Security_UsersAccess_rust AS BEGIN SET NOCOUNT ON; SELECT u.idUsuario, u.carnet, u.nombre, u.correo, u.cargo, u.fechaActualizacion as ultimo_acceso, u.activo as estado, u.idRol FROM p_Usuarios u WHERE u.activo = 1 ORDER BY u.nombre; END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Admin_RecycleBin_Listar_rust') DROP PROCEDURE dbo.sp_Admin_RecycleBin_Listar_rust;
GO
CREATE PROCEDURE sp_Admin_RecycleBin_Listar_rust AS BEGIN SET NOCOUNT ON; SELECT 'Tarea' as tipo, idTarea as id, nombre, fechaCreacion as creadoEn, asignadoCarnet as eliminadoPor FROM p_Tareas WHERE activo = 0 ORDER BY fechaCreacion DESC; END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Admin_Usuarios_Inactivos_rust') DROP PROCEDURE dbo.sp_Admin_Usuarios_Inactivos_rust;
GO
CREATE PROCEDURE sp_Admin_Usuarios_Inactivos_rust @dias INT = 30 AS BEGIN SET NOCOUNT ON; SELECT idUsuario, carnet, nombre, correo, cargo, fechaActualizacion as ultimo_acceso FROM p_Usuarios WHERE activo = 1 ORDER BY fechaActualizacion ASC; END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Organizacion_ObtenerCatalogo_rust') DROP PROCEDURE dbo.sp_Organizacion_ObtenerCatalogo_rust;
GO
CREATE PROCEDURE sp_Organizacion_ObtenerCatalogo_rust AS BEGIN SET NOCOUNT ON; SELECT id, nombre, tipo, idPadre, orden, activo FROM p_OrganizacionNodos WHERE activo = 1 ORDER BY orden, nombre; END
GO




IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ObtenerProyectos_rust') DROP PROCEDURE dbo.sp_ObtenerProyectos_rust;
GO
CREATE PROCEDURE dbo.sp_ObtenerProyectos_rust @carnet nvarchar(50), @filtroNombre nvarchar(100) = NULL, @filtroEstado nvarchar(50) = NULL AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerProyectos @carnet, @filtroNombre, @filtroEstado; END;
GO
