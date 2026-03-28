-- =============================================
-- Migration: Unified Task & Planning Parity Fixes
-- Target: Tareas Update, Discard, and Approval Requests
-- =============================================

-- 1. FIX: BASE TAREA ACTUALIZAR (COMPLETO)
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Actualizar')
    DROP PROCEDURE dbo.sp_Tarea_Actualizar;
GO

CREATE PROCEDURE dbo.sp_Tarea_Actualizar
    @idTarea INT,
    @titulo NVARCHAR(500) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @idProyecto INT = NULL,
    @idResponsable INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @tipo NVARCHAR(50) = NULL,
    @esfuerzo NVARCHAR(20) = NULL,
    @comportamiento NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET nombre = ISNULL(@titulo, nombre),
        descripcion = ISNULL(@descripcion, descripcion),
        estado = ISNULL(@estado, estado),
        prioridad = ISNULL(@prioridad, prioridad),
        porcentaje = ISNULL(@progreso, porcentaje),
        idProyecto = ISNULL(NULLIF(@idProyecto, 0), idProyecto),
        fechaObjetivo = ISNULL(@fechaObjetivo, fechaObjetivo),
        fechaInicioPlanificada = ISNULL(@fechaInicioPlanificada, fechaInicioPlanificada),
        linkEvidencia = ISNULL(@linkEvidencia, linkEvidencia),
        idTareaPadre = ISNULL(NULLIF(@idTareaPadre, 0), idTareaPadre),
        tipoTarea = ISNULL(@tipo, tipoTarea),
        esfuerzo = ISNULL(@esfuerzo, esfuerzo),
        comportamiento = ISNULL(@comportamiento, comportamiento),
        fechaActualizacion = GETDATE()
    WHERE idTarea = @idTarea;

    IF @idResponsable IS NOT NULL AND @idResponsable > 0
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet, fechaAsignacion)
        SELECT @idTarea, idUsuario, 'Responsable', carnet, GETDATE()
        FROM p_Usuarios 
        WHERE idUsuario = @idResponsable;
    END

    SELECT * FROM p_Tareas WHERE idTarea = @idTarea;
END;
GO

-- 2. WRAPPER: TAREA ACTUALIZAR RUST (COMPLETO)
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Actualizar_rust')
    DROP PROCEDURE dbo.sp_Tarea_Actualizar_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_Actualizar_rust
    @idTarea INT,
    @titulo NVARCHAR(500) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @idProyecto INT = NULL,
    @idResponsable INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @tipo NVARCHAR(50) = NULL,
    @esfuerzo NVARCHAR(20) = NULL,
    @comportamiento NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Actualizar 
        @idTarea, @titulo, @descripcion, @estado, @prioridad, @progreso, @idProyecto, 
        @idResponsable, @fechaObjetivo, @fechaInicioPlanificada, @linkEvidencia, 
        @idTareaPadre, @tipo, @esfuerzo, @comportamiento;
END;
GO

-- 3. FIX: BASE TAREA DESCARTAR (CTE BUG)
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_DescartarConSubtareas')
    DROP PROCEDURE dbo.sp_Tarea_DescartarConSubtareas;
GO

CREATE PROCEDURE dbo.sp_Tarea_DescartarConSubtareas
    @idTarea INT,
    @carnet NVARCHAR(100) = NULL,
    @motivo NVARCHAR(MAX) = 'Descarte manual'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Identificar recursivamente la tarea y sus descendientes
        ;WITH Jerarquia AS (
            SELECT idTarea 
            FROM p_Tareas 
            WHERE idTarea = @idTarea  -- INCLUYE EL ANCLA (PADRE)
            UNION ALL
            SELECT t.idTarea 
            FROM p_Tareas t
            INNER JOIN Jerarquia j ON t.idTareaPadre = j.idTarea
        )
        UPDATE p_Tareas
        SET activo = 0,
            estado = 'Descartada',
            fechaActualizacion = GETDATE(),
            motivoDeshabilitacion = @motivo,
            fechaDeshabilitacion = GETDATE(),
            deshabilitadoPor = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
        FROM p_Tareas t
        INNER JOIN Jerarquia j ON t.idTarea = j.idTarea
        WHERE t.activo = 1;

        COMMIT TRANSACTION;
        SELECT 1 as success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- 4. BASE: SOLICITUD CAMBIO CREAR
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_SolicitudCambio_Crear')
    DROP PROCEDURE dbo.sp_SolicitudCambio_Crear;
GO

CREATE PROCEDURE dbo.sp_SolicitudCambio_Crear
    @idTarea INT,
    @idUsuarioSolicitante INT,
    @campo NVARCHAR(50),
    @valorAnterior NVARCHAR(MAX),
    @valorNuevo NVARCHAR(MAX),
    @motivo NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo, estado, fechaSolicitud)
    VALUES (@idTarea, @idUsuarioSolicitante, @campo, @valorAnterior, @valorNuevo, @motivo, 'Pendiente', GETDATE());
    
    SELECT SCOPE_IDENTITY() as idSolicitud;
END;
GO

-- 5. WRAPPER: SOLICITUD CAMBIO CREAR RUST
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_SolicitudCambio_Crear_rust')
    DROP PROCEDURE dbo.sp_SolicitudCambio_Crear_rust;
GO

CREATE PROCEDURE dbo.sp_SolicitudCambio_Crear_rust
    @idTarea INT,
    @idUsuarioSolicitante INT,
    @campo NVARCHAR(50),
    @valorAnterior NVARCHAR(MAX),
    @valorNuevo NVARCHAR(MAX),
    @motivo NVARCHAR(MAX)
AS
BEGIN
    EXEC dbo.sp_SolicitudCambio_Crear @idTarea, @idUsuarioSolicitante, @campo, @valorAnterior, @valorNuevo, @motivo;
END;
GO
