
-- =============================================
-- Migration: Create Stored Procedures for Clarity V2
-- Date: 2026-01-24
-- =============================================

-- 1. SP: Obtener Proyectos
IF OBJECT_ID('sp_ObtenerProyectos', 'P') IS NOT NULL DROP PROCEDURE sp_ObtenerProyectos;
GO
CREATE PROCEDURE sp_ObtenerProyectos
    @idUsuario INT,
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Lógica de visibilidad simplificada (Usuario ve lo que creó O donde está asignado)
    -- Se puede extender con lógica de jerarquía si se requiere
    SELECT DISTINCT p.*
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE 
        (p.idCreador = @idUsuario OR ta.idUsuario = @idUsuario)
        AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
        AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO

-- 2. SP: Crear Tarea
IF OBJECT_ID('sp_CrearTarea', 'P') IS NOT NULL DROP PROCEDURE sp_CrearTarea;
GO
CREATE PROCEDURE sp_CrearTarea
    @nombre NVARCHAR(500),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT,
    @prioridad NVARCHAR(50), -- 'Alta', 'Media', 'Baja'
    @esfuerzo NVARCHAR(20),  -- 'S', 'M', 'L'
    @tipo NVARCHAR(50),      -- 'Logistica', etc.
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @idUsuarioCreador INT,
    @idResponsable INT = NULL, -- Puede ser NULL si se asigna después, pero MVP suele pedirlo
    @comportamiento NVARCHAR(20) = 'SIMPLE',
    @linkEvidencia NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;

    -- Validaciones básicas
    IF @idProyecto IS NOT NULL AND NOT EXISTS (SELECT 1 FROM p_Proyectos WHERE idProyecto = @idProyecto)
    BEGIN
        THROW 51000, 'El proyecto especificado no existe.', 1;
    END

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador,
        fechaCreacion, porcentaje, comportamiento, linkEvidencia
    )
    VALUES (
        @nombre, @descripcion, @idProyecto, 'Pendiente', @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @idUsuarioCreador,
        GETDATE(), 0, @comportamiento, @linkEvidencia
    );

    SET @NewId = SCOPE_IDENTITY();

    -- Asignación automática al Responsable
    IF @idResponsable IS NOT NULL
    BEGIN
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
        VALUES (@NewId, @idResponsable, 'Responsable', GETDATE());
    END

    -- Retornar ID creado
    SELECT @NewId as idTarea;
END;
GO

-- 3. SP: Actualizar Tarea
IF OBJECT_ID('sp_ActualizarTarea', 'P') IS NOT NULL DROP PROCEDURE sp_ActualizarTarea;
GO
CREATE PROCEDURE sp_ActualizarTarea
    @idTarea INT,
    @nombre NVARCHAR(500) = NULL,
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
        nombre = COALESCE(@nombre, nombre),
        descripcion = COALESCE(@descripcion, descripcion),
        estado = COALESCE(@estado, estado),
        prioridad = COALESCE(@prioridad, prioridad),
        porcentaje = COALESCE(@progreso, porcentaje),
        fechaObjetivo = COALESCE(@fechaObjetivo, fechaObjetivo),
        fechaInicioPlanificada = COALESCE(@fechaInicioPlanificada, fechaInicioPlanificada),
        linkEvidencia = COALESCE(@linkEvidencia, linkEvidencia)
    WHERE idTarea = @idTarea;
END;
GO
