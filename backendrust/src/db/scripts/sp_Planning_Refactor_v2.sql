-- =============================================
-- Migration: Zero Inline SQL - Planning Solicitudes y Planes
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Planning_ObtenerSolicitudes]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerSolicitudes]
    @tipo NVARCHAR(20) = 'PENDIENTES', -- 'PENDIENTES', 'APPROVALS'
    @idUsuario INT = NULL
AS
BEGIN
    IF @tipo = 'PENDIENTES'
    BEGIN
        SELECT TOP 50 s.idSolicitud, s.idTarea, s.estado, s.fechaSolicitud as fecha, s.motivo, s.campo, s.valorNuevo,
               u.nombre as solicitante
        FROM p_SolicitudesCambio s
        LEFT JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
        WHERE s.estado = 'Pendiente'
        ORDER BY s.fechaSolicitud DESC;
    END
    ELSE IF @tipo = 'APPROVALS'
    BEGIN
        SELECT TOP 50 s.idSolicitud, s.idTarea, s.estado, s.fechaSolicitud, s.motivo,
               u.nombre as solicitante, t.nombre as tarea
        FROM p_SolicitudesCambio s
        LEFT JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
        LEFT JOIN p_Tareas t ON s.idTarea = t.idTarea
        WHERE s.estado = 'Pendiente'
        ORDER BY s.fechaSolicitud DESC;
    END
END
GO

-- 2. [sp_Planning_UpsertPlan]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_UpsertPlan]
    @idUsuario INT,
    @mes INT,
    @anio INT,
    @objetivos NVARCHAR(MAX),
    @estado NVARCHAR(50),
    @idCreador INT
AS
BEGIN
    DECLARE @idPlan INT;
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio;

    IF @idPlan IS NOT NULL
    BEGIN
        UPDATE p_PlanesTrabajo 
        SET objetivos = @objetivos, estado = @estado, fechaActualizacion = GETDATE() 
        WHERE idPlan = @idPlan;
    END
    ELSE
    BEGIN
        INSERT INTO p_PlanesTrabajo (idUsuario, mes, anio, objetivos, estado, idCreador, fechaCreacion)
        VALUES (@idUsuario, @mes, @anio, @objetivos, @estado, @idCreador, GETDATE());
        SET @idPlan = SCOPE_IDENTITY();
    END

    SELECT idPlan, idUsuario, mes, anio, objetivos, estado FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
END
GO

-- 3. [sp_Planning_ObtenerPlanDetalle]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerPlanDetalle]
    @idPlan INT = 0,
    @carnet NVARCHAR(50) = NULL,
    @mes INT = NULL,
    @anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Si idPlan es 0, buscar por carnet/mes/anio
    IF @idPlan = 0 AND @carnet IS NOT NULL
    BEGIN
        SELECT @idPlan = idPlan FROM p_Planes 
        WHERE carnet = @carnet AND mes = @mes AND anio = @anio;
    END

    -- Resultset 1: Plan Header
    SELECT p.*, u.nombre as usuarioNombre
    FROM p_Planes p
    LEFT JOIN p_Usuarios u ON p.carnet = u.carnet
    WHERE idPlan = @idPlan;

    -- Resultset 2: Tareas del Plan
    SELECT t.*, pr.nombre as proyectoNombre
    FROM p_Tareas t
    LEFT JOIN p_Proyectos pr ON t.idProyecto = pr.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.semana, t.idTarea;
END
GO

-- 4. [sp_Planning_CheckPermission]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_CheckPermission]
    @idTarea INT,
    @idUsuario INT
AS
BEGIN
    DECLARE @idProyecto INT, @idCreador INT, @proyectoTipo NVARCHAR(50), @reqAprob BIT;

    SELECT @idProyecto = t.idProyecto, @idCreador = t.idCreador, 
           @proyectoTipo = ISNULL(p.tipo, 'General'), @reqAprob = ISNULL(p.requiereAprobacion, 0)
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;

    DECLARE @isAssigned BIT = 0;
    IF EXISTS (SELECT 1 FROM p_TareaAsignados WHERE idTarea = @idTarea AND idUsuario = @idUsuario)
        SET @isAssigned = 1;

    SELECT @idProyecto as idProyecto, @idCreador as idCreador, @proyectoTipo as proyectoTipo, @reqAprob as requiereAprobacion, @isAssigned as isAssigned;
END
GO
