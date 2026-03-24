
-- 4. SP: Clonar Tarea
IF OBJECT_ID('sp_Tarea_Clonar', 'P') IS NOT NULL DROP PROCEDURE sp_Tarea_Clonar;
GO
CREATE PROCEDURE sp_Tarea_Clonar
    @idTareaFuente INT,
    @idUsuarioEjecutor INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador,
        fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo
    )
    SELECT 
        nombre + ' (Copia)', descripcion, idProyecto, 'Pendiente', prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, @idUsuarioEjecutor,
        GETDATE(), 0, comportamiento, linkEvidencia, 1
    FROM p_Tareas
    WHERE idTarea = @idTareaFuente;

    SET @NewId = SCOPE_IDENTITY();

    -- Clonar asignados (opcional, aquí solo clonamos la estructura básica)
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
    SELECT @NewId, idUsuario, tipo, GETDATE()
    FROM p_TareaAsignados
    WHERE idTarea = @idTareaFuente;

    SELECT @NewId as idTarea;
END;
GO

-- 5. SP: Reasignar Tareas masivamente
IF OBJECT_ID('sp_Tareas_Reasignar', 'P') IS NOT NULL DROP PROCEDURE sp_Tareas_Reasignar;
GO
CREATE PROCEDURE sp_Tareas_Reasignar
    @taskIdsCsv NVARCHAR(MAX),
    @toUserId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Eliminar asignaciones previas de tipo 'Responsable' (manteniendo otros si existen)
    DELETE FROM p_TareaAsignados 
    WHERE idTarea IN (SELECT value FROM STRING_SPLIT(@taskIdsCsv, ','))
      AND tipo = 'Responsable';

    -- Insertar nuevas asignaciones
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
    SELECT CAST(value AS INT), @toUserId, 'Responsable', GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',');
END;
GO

-- 6. SP: Cerrar Plan de Trabajo
IF OBJECT_ID('sp_Plan_Cerrar', 'P') IS NOT NULL DROP PROCEDURE sp_Plan_Cerrar;
GO
CREATE PROCEDURE sp_Plan_Cerrar
    @idPlan INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_PlanesTrabajo 
    SET estado = 'Cerrado', fechaActualizacion = GETDATE()
    WHERE idPlan = @idPlan;
END;
GO
