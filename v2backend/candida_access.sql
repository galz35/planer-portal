-- ------------------------------------------------------------------
-- SQL SCRIPT PARA CREAR USUARIO candida CON ACCESO A TABLAS p_
-- ------------------------------------------------------------------

USE [Bdplaner];
GO

-- 1. Crear Login en el servidor
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'candida')
BEGIN
    CREATE LOGIN candida WITH PASSWORD = 'Candida123';
END
GO

-- 2. Crear Usuario en la base de datos
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'candida')
BEGIN
    CREATE USER candida FOR LOGIN candida;
END
GO

-- 3. Asegurar que no tenga roles por defecto que den acceso extra
EXEC sp_droprolemember 'db_datareader', 'candida';
EXEC sp_droprolemember 'db_datawriter', 'candida';
GO

-- 4. Asignar permisos sobre las tablas que empiezan con p_
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_ProyectoColaboradores] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Notificaciones_Enviadas] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_AuditLog] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Auditoria] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Bloqueos] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Checkins] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_CheckinTareas] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_delegacion_visibilidad] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Dispositivos] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_FocoDiario] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Logs] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_LogSistema] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Notas] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_organizacion_nodos] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_OrganizacionNodos] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_permiso_area] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_permiso_empleado] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_PlanesTrabajo] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Proyectos] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Roles] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_SeguridadPerfiles] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_SlowQueries] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_SolicitudCambios] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_SolicitudesCambio] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaAsignacionLog] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaAsignados] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaAvanceMensual] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaAvances] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaInstancia] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaRecordatorios] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_TareaRecurrencia] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Tareas] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_UsuarioCredenciales] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Usuarios] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_Usuarios_OLD] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_UsuariosConfig] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_UsuariosCredenciales] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_UsuariosOrganizacion] TO candida;
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[p_RolesColaboracion] TO candida;
