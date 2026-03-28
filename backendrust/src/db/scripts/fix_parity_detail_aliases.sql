-- =============================================
-- Migration: Corregir Paridad de Alias en SPs de Detalle
-- Target: sp_Tareas_ObtenerPorId_rust y sp_Planning_ObtenerPlanDetalle
-- Reason: Frontend espera 'titulo' y 'progreso' en lugar de 'nombre' y 'porcentaje'.
-- =============================================

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerPorId_rust')
    DROP PROCEDURE dbo.sp_Tareas_ObtenerPorId_rust;
GO

CREATE PROCEDURE dbo.sp_Tareas_ObtenerPorId_rust
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        t.*,
        t.nombre as titulo,       -- ALIAS CRITICO
        t.porcentaje as progreso, -- ALIAS CRITICO
        responsableNombre = uR.nombre,
        responsableCarnet = uR.carnet,
        creadorNombre = uC.nombre,
        proyectoNombre = p.nombre
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios uR ON ta.carnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON t.idCreador = uC.idUsuario
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_ObtenerPlanDetalle_rust')
    DROP PROCEDURE dbo.sp_Planning_ObtenerPlanDetalle_rust;
GO

CREATE PROCEDURE dbo.sp_Planning_ObtenerPlanDetalle_rust
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
    SELECT 
        t.*, 
        t.nombre as titulo,
        t.porcentaje as progreso,
        pr.nombre as proyectoNombre
    FROM p_Tareas t
    LEFT JOIN p_Proyectos pr ON t.idProyecto = pr.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.semana, t.idTarea;
END;
GO

-- Asegurar que sp_Tarea_ObtenerDetalle_rust use el SP corregido
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_ObtenerDetalle_rust')
    DROP PROCEDURE dbo.sp_Tarea_ObtenerDetalle_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_ObtenerDetalle_rust
    @idTarea INT
AS
BEGIN
    EXEC dbo.sp_Tareas_ObtenerPorId_rust @idTarea;
END;
GO
