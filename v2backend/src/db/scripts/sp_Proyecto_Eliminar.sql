
-- ========================================================
-- MIGRACIÓN CLARITY: ELIMINACIÓN SEGURA DE PROYECTOS V4
-- Fecha: 2026-01-28
-- Corrección: Manejo de SolicitudesCambio, Jerarquía Dual (idPadre/idTareaPadre)
-- ========================================================

CREATE OR ALTER PROCEDURE [dbo].[sp_Proyecto_Eliminar_V2]
    @idProyecto INT,
    @forceCascade BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @fechaCreacion DATE;
    DECLARE @nombreProyecto NVARCHAR(200);
    
    SELECT @fechaCreacion = CAST(fechaCreacion AS DATE), @nombreProyecto = nombre 
    FROM p_Proyectos WHERE idProyecto = @idProyecto;

    IF @fechaCreacion IS NULL
    BEGIN
        -- Idempotente: si no existe, terminar con éxito
        RETURN;
    END

    -- Regla de Negocio: 
    -- 1. Si se creó hoy, se permite borrado completo (fue un error de captura).
    -- 2. Si es de días anteriores, solo se permite si no tiene tareas activas O si se fuerza la cascada.
    
    DECLARE @esHoy BIT = 0;
    IF @fechaCreacion = CAST(GETDATE() AS DATE) SET @esHoy = 1;

    IF @esHoy = 0 AND @forceCascade = 0
    BEGIN
        -- Verificar si tiene tareas activas
        IF EXISTS (SELECT 1 FROM p_Tareas WHERE idProyecto = @idProyecto AND activo = 1)
        BEGIN
            RAISERROR('El proyecto "%s" tiene tareas activas y no fue creado el día de hoy. Borre las tareas primero o use forceCascade=1 para limpieza total.', 16, 1, @nombreProyecto);
            RETURN;
        END
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Obtener lista de tareas a eliminar
        DECLARE @tareas TABLE (idTarea INT);
        INSERT INTO @tareas (idTarea)
        SELECT idTarea FROM p_Tareas WHERE idProyecto = @idProyecto;

        -- 1. Solicitudes de Cambio
        DELETE FROM p_SolicitudesCambio WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 2. CheckinTareas
        DELETE FROM p_CheckinTareas WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 3. TareaAvances
        DELETE FROM p_TareaAvances WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 4. Bloqueos
        DELETE FROM p_Bloqueos WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 5. TareaAsignados
        DELETE FROM p_TareaAsignados WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 6. Recurrencia e Instancias
        DELETE FROM p_TareaInstancia WHERE idTarea IN (SELECT idTarea FROM @tareas);
        DELETE FROM p_TareaRecurrencia WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 7. Romper jerarquía de tareas internas (ambas columnas legacy y nuevas)
        UPDATE p_Tareas SET idTareaPadre = NULL, idPadre = NULL WHERE idProyecto = @idProyecto;

        -- 8. Tareas
        DELETE FROM p_Tareas WHERE idProyecto = @idProyecto;

        -- 9. Finalmente, el Proyecto
        DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
