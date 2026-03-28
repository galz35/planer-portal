-- =============================================
-- Migration: Fix Base Task SPs (Column names)
-- =============================================

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_GestionarAvance')
    DROP PROCEDURE dbo.sp_Tarea_GestionarAvance;
GO

CREATE PROCEDURE dbo.sp_Tarea_GestionarAvance
    @idTarea INT,
    @idUsuario INT,
    @progreso FLOAT,
    @comentario NVARCHAR(MAX),
    @esCompleta BIT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF @esCompleta = 1
        BEGIN
            UPDATE p_Tareas 
            SET porcentaje = 100, estado = 'Hecha', fechaFinReal = GETDATE() 
            WHERE idTarea = @idTarea;
        END
        ELSE
        BEGIN
            UPDATE p_Tareas 
            SET porcentaje = CAST(@progreso AS INT), estado = 'EnCurso', 
                fechaInicioReal = ISNULL(fechaInicioReal, GETDATE()) 
            WHERE idTarea = @idTarea;
        END

        INSERT INTO p_TareaAvances (idTarea, idUsuario, progreso, comentario, fecha)
        VALUES (@idTarea, @idUsuario, @progreso, @comentario, GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_ObtenerHistorico')
    DROP PROCEDURE dbo.sp_Tarea_ObtenerHistorico;
GO

CREATE PROCEDURE dbo.sp_Tarea_ObtenerHistorico
    @carnet NVARCHAR(50),
    @dias INT = 30
AS
BEGIN
    SELECT t.idTarea, t.nombre as titulo, t.estado, t.prioridad, t.fechaObjetivo, 
           p.nombre as proyectoNombre, t.porcentaje as progreso 
    FROM p_Tareas t 
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto 
    LEFT JOIN p_TareaAsignados tu ON t.idTarea = tu.idTarea 
    WHERE tu.carnet = @carnet AND t.fechaActualizacion >= DATEADD(DAY, -@dias, GETDATE()) 
    ORDER BY t.fechaActualizacion DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Actualizar')
    DROP PROCEDURE dbo.sp_Tarea_Actualizar;
GO

CREATE PROCEDURE dbo.sp_Tarea_Actualizar
    @idTarea INT,
    @titulo NVARCHAR(200) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @idProyecto INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @idResponsable INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET nombre = ISNULL(@titulo, nombre),
        descripcion = ISNULL(@descripcion, descripcion),
        estado = ISNULL(@estado, estado),
        prioridad = ISNULL(@prioridad, prioridad),
        porcentaje = ISNULL(@progreso, porcentaje),
        idProyecto = ISNULL(@idProyecto, idProyecto),
        fechaObjetivo = ISNULL(@fechaObjetivo, fechaObjetivo),
        fechaActualizacion = GETDATE()
    WHERE idTarea = @idTarea;

    IF @idResponsable IS NOT NULL
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet)
        SELECT @idTarea, idUsuario, 'Responsable', carnet FROM p_Usuarios WHERE idUsuario = @idResponsable;
    END
END;
GO
