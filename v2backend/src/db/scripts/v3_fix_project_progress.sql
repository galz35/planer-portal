
-- ========================================================
-- MIGRACIÓN: UNIFICACIÓN DE CÁLCULO DE PROGRESO DE PROYECTOS
-- Fecha: 2026-02-23
-- Descripción: Asegura que todos los listados de proyectos (Admin, Visibilidad, Usuario)
--              calculen el progreso de forma consistente basándose en tareas de nivel 0.
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
        idProyecto, nombre, descripcion, estado, prioridad, 
        fechaInicio, fechaFin, fechaCreacion, area, gerencia, subgerencia, 
        responsableCarnet, creadorCarnet, tipo,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
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
    SELECT DISTINCT p.*,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
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

    SELECT DISTINCT p.*,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM dbo.p_Proyectos p
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
