-- =============================================
-- Migration: Zero Inline SQL - Tareas Modulo
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Tarea_ObtenerAvanceMensual]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_ObtenerAvanceMensual]
    @idTarea INT
AS
BEGIN
    SELECT anio as [year], mes as [month], porcentajeMes as [progress] 
    FROM p_TareaAvanceMensual 
    WHERE idTarea = @idTarea 
    ORDER BY anio, mes;
END
GO

-- 2. [sp_Tarea_CreacionMasiva]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_CreacionMasiva]
    @idUsuariosCSV NVARCHAR(MAX),
    @titulo NVARCHAR(200),
    @descripcion NVARCHAR(MAX),
    @idProyecto INT,
    @prioridad NVARCHAR(50),
    @esfuerzo NVARCHAR(10),
    @tipo NVARCHAR(50),
    @idCreador INT,
    @fechaInicio DATETIME,
    @fechaObjetivo DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @idTareaNew INT;
        
        -- Cursor o loop para cada usuario
        DECLARE @idU INT;
        DECLARE user_cursor CURSOR FOR SELECT value FROM STRING_SPLIT(@idUsuariosCSV, ',');
        OPEN user_cursor;
        FETCH NEXT FROM user_cursor INTO @idU;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO p_Tareas (nombre, descripcion, idProyecto, prioridad, esfuerzo, tipo, idCreador, fechaCreacion, fechaInicioPlanificada, fechaObjetivo, estado)
            VALUES (@titulo, @descripcion, @idProyecto, @prioridad, @esfuerzo, @tipo, @idCreador, GETDATE(), @fechaInicio, @fechaObjetivo, 'Pendiente');
            
            SET @idTareaNew = SCOPE_IDENTITY();

            -- Obtener carnet del usuario
            DECLARE @carnet NVARCHAR(50);
            SELECT @carnet = carnet FROM p_Usuarios WHERE idUsuario = @idU;

            INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet)
            VALUES (@idTareaNew, @idU, @carnet);

            FETCH NEXT FROM user_cursor INTO @idU;
        END

        CLOSE user_cursor;
        DEALLOCATE user_cursor;
        
        COMMIT TRANSACTION;
        SELECT 1 as success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 3. [sp_Tarea_ObtenerDetalle]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_ObtenerDetalle]
    @idTarea INT
AS
BEGIN
    SELECT t.*, p.nombre as proyectoNombre 
    FROM p_Tareas t 
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto 
    WHERE t.idTarea = @idTarea;
END
GO

-- 4. [sp_Tarea_Revalidar]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Revalidar]
    @idTarea INT,
    @accion NVARCHAR(50),
    @idUsuarioOtro INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @nuevoEstado NVARCHAR(50) = NULL;
    DECLARE @porcentaje FLOAT = NULL;
    DECLARE @fechaObjetivoHoy BIT = 0;

    IF @accion = 'Sigue'
        SET @fechaObjetivoHoy = 1;
    ELSE IF @accion = 'HechaPorOtro'
    BEGIN
        SET @nuevoEstado = 'Hecha';
        SET @porcentaje = 100.0;
    END
    ELSE IF @accion = 'NoAplica'
        SET @nuevoEstado = 'Descartada';
    ELSE IF @accion = 'Reasignar' AND @idUsuarioOtro IS NOT NULL
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet)
        SELECT @idTarea, idUsuario, 'Responsable', carnet FROM p_Usuarios WHERE idUsuario = @idUsuarioOtro;
    END

    IF @nuevoEstado IS NOT NULL
        UPDATE p_Tareas SET estado = @nuevoEstado, porcentaje = @porcentaje WHERE idTarea = @idTarea;
    ELSE IF @fechaObjetivoHoy = 1
        UPDATE p_Tareas SET fechaObjetivo = GETDATE() WHERE idTarea = @idTarea;

    -- Roll-up
    EXEC sp_Tarea_RecalcularJerarquia_v2 @idTarea, NULL;

    SELECT ISNULL(@nuevoEstado, 'Mismo') as nuevoEstado;
END
GO

-- 5. [sp_Tarea_ActualizarParticipantes]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_ActualizarParticipantes]
    @idTarea INT,
    @participantesCSV NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Colaborador';
    
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet)
    SELECT @idTarea, u.idUsuario, 'Colaborador', u.carnet
    FROM STRING_SPLIT(@participantesCSV, ',') s
    JOIN p_Usuarios u ON CAST(s.value AS INT) = u.idUsuario;
END
GO

-- 6. [sp_Tarea_UpsertRecordatorio]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_UpsertRecordatorio]
    @idTarea INT,
    @mensaje NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM p_TareaRecordatorios WHERE idTarea = @idTarea)
    BEGIN
        UPDATE p_TareaRecordatorios SET mensaje = @mensaje, fechaModificacion = GETDATE() WHERE idTarea = @idTarea;
    END
    ELSE
    BEGIN
        INSERT INTO p_TareaRecordatorios (idTarea, mensaje, activo, fechaCreacion)
        VALUES (@idTarea, @mensaje, 1, GETDATE());
    END
END
GO
