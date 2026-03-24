
-- =============================================
-- MIGRACIÓN CLARITY: CORRECCIÓN SP ACTUALIZAR TAREA
-- Fecha: 2026-01-26
-- =============================================

CREATE OR ALTER PROCEDURE [dbo].[sp_ActualizarTarea]
    @idTarea INT,
    @titulo NVARCHAR(500) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE p_Tareas
    SET 
        nombre = COALESCE(@titulo, nombre),
        descripcion = COALESCE(@descripcion, descripcion),
        estado = COALESCE(@estado, estado),
        prioridad = COALESCE(@prioridad, prioridad),
        porcentaje = COALESCE(@progreso, porcentaje),
        fechaObjetivo = COALESCE(@fechaObjetivo, fechaObjetivo),
        fechaInicioPlanificada = COALESCE(@fechaInicioPlanificada, fechaInicioPlanificada),
        linkEvidencia = COALESCE(@linkEvidencia, linkEvidencia),
        fechaActualizacion = GETDATE()
    WHERE idTarea = @idTarea;
END
GO
