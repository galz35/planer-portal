
-- ========================================================
-- MIGRACIÓN: AGREGAR CONTEO DE TAREAS Y NOMBRES A LISTADOS DE PROYECTOS
-- Fecha: 2026-03-02
-- Descripción: Agrega totalTareas, tareasCompletadas y nombres de responsable/creador.
-- ========================================================

GO

-- 1. Actualizar sp_Proyectos_Listar (Admin)
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyectos_Listar]
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    SELECT 
        p.idProyecto, p.nombre, p.descripcion, p.estado, p.prioridad, 
        p.fechaInicio, p.fechaFin, p.fechaCreacion, p.area, p.gerencia, p.subgerencia, 
        p.responsableCarnet, 
        responsableNombre = uR.nombre,
        p.creadorCarnet,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        p.tipo,
        p.modoVisibilidad,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE 
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
        AND (@area IS NULL OR p.area = @area)
        AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE);
END
GO

-- 2. Actualizar sp_ObtenerProyectos (Usuario)
CREATE OR ALTER PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO

-- 3. Actualizar sp_Proyecto_ObtenerVisibles (Jerarquía)
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerVisibles]
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, 
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM dbo.p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE 
        (
            p.idCreador = @idUsuario
            OR EXISTS (
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
GO
