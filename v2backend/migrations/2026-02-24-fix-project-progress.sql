-- Fix 1: sp_Proyectos_Listar
-- We only calculate percentage based on root tasks, avoiding Descartadas.
ALTER PROCEDURE [dbo].[sp_Proyectos_Listar]
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
        p.idProyecto,
        p.nombre,
        p.descripcion,
        p.estado,
        p.prioridad,
        p.fechaInicio,
        p.fechaFin,
        p.fechaCreacion,
        p.area,
        p.gerencia,
        p.subgerencia,
        p.responsableCarnet,
        responsableNombre = ur.nombre,
        p.creadorCarnet,
        creadorNombre = COALESCE(u1.nombre, u2.nombre),
        p.tipo,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios u1 ON p.idCreador = u1.idUsuario
    LEFT JOIN p_Usuarios u2 ON p.creadorCarnet = u2.carnet AND p.idCreador IS NULL
    LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet
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

-- Fix 2: sp_Tareas_ObtenerPorProyecto
-- Exclude 'Descartada', 'Eliminada', 'Anulada', 'Cancelada'
ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.idTarea, t.idProyecto,
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion as fechaUltActualizacion,
        t.idTareaPadre,
        p.nombre as proyectoNombre,
        ta.idUsuario as idResponsable,
        u.nombreCompleto as responsableNombre,
        u.carnet as responsableCarnet
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.idProyecto = @idProyecto
      AND t.activo = 1
      AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
    ORDER BY t.orden ASC, t.fechaObjetivo ASC;
END
GO
