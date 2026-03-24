
-- =============================================
-- MIGRACIÓN CLARITY: SPs CARNET-FIRST FINAL
-- Fecha: 2026-01-26
-- =============================================

-- 1. SP: Obtener Proyectos
CREATE OR ALTER PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT p.*
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) -- Fallback
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO

-- 2. SP: Crear Tarea
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Crear]
    @nombre NVARCHAR(500),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @idUsuario INT = 0, -- Legacy / Fallback
    @carnet NVARCHAR(50) = NULL, -- Creador Carnet
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(20) = 'SIMPLE',
    @idTareaPadre INT = NULL,
    @idPlan INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idCreadorFinal INT = @idUsuario;
    DECLARE @carnetFinal NVARCHAR(50) = @carnet;

    -- Resolver ID si no viene
    IF @idCreadorFinal = 0 AND @carnetFinal IS NOT NULL
        SELECT @idCreadorFinal = idUsuario FROM p_Usuarios WHERE carnet = @carnetFinal;
    
    -- Resolver Carnet si no viene
    IF @carnetFinal IS NULL AND @idCreadorFinal <> 0
        SELECT @carnetFinal = carnet FROM p_Usuarios WHERE idUsuario = @idCreadorFinal;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, idTareaPadre, idPlan, orden, activo
    )
    VALUES (
        @nombre, @descripcion, @idProyecto, 'Pendiente', @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @idCreadorFinal, @carnetFinal,
        GETDATE(), @porcentaje, @comportamiento, @idTareaPadre, @idPlan, @orden, 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END;
GO

-- 3. SP: Clonar Tarea
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Clonar]
    @idTareaFuente INT,
    @ejecutorCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idEjecutor INT;
    SELECT @idEjecutor = idUsuario FROM p_Usuarios WHERE carnet = @ejecutorCarnet;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo, idPlan
    )
    SELECT 
        nombre + ' (Copia)', descripcion, idProyecto, 'Pendiente', prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, @idEjecutor, @ejecutorCarnet,
        GETDATE(), 0, comportamiento, linkEvidencia, 1, idPlan
    FROM p_Tareas
    WHERE idTarea = @idTareaFuente;

    SET @NewId = SCOPE_IDENTITY();

    -- Clonar asignados
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT @NewId, idUsuario, carnet, tipo, GETDATE()
    FROM p_TareaAsignados
    WHERE idTarea = @idTareaFuente;

    SELECT @NewId as idTarea;
END;
GO

-- 4. SP: Reasignar Tareas masivamente
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_Reasignar_PorCarnet]
    @taskIdsCsv NVARCHAR(MAX),
    @toCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idDestino INT;
    SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @toCarnet;

    IF @idDestino IS NULL RETURN;

    -- Eliminar asignaciones previas de tipo 'Responsable'
    DELETE FROM p_TareaAsignados 
    WHERE idTarea IN (SELECT value FROM STRING_SPLIT(@taskIdsCsv, ','))
      AND tipo = 'Responsable';

    -- Insertar nuevas asignaciones
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT CAST(value AS INT), @idDestino, @toCarnet, 'Responsable', GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',');
END;
GO
