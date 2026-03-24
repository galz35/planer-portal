
-- 1. SP para Obtener Tareas de Usuario (Optimizado para Carnet-First)
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario]
    @carnet NVARCHAR(50), 
    @estado NVARCHAR(50) = NULL,
    @idProyecto INT = NULL,
    @query NVARCHAR(100) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        t.idTarea, t.idProyecto, 
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion as fechaUltActualizacion,
        t.idTareaPadre,
        t.idPlan,
        p.nombre as proyectoNombre 
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    
    WHERE (
        t.creadorCarnet = @carnet 
        OR ta.carnet = @carnet
        -- Fallback por si la sincronización falló en algún registro nuevo
        OR t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
    )
      AND t.activo = 1
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE '%' + @query + '%' OR t.descripcion LIKE '%' + @query + '%'))
      AND (
          (@startDate IS NULL OR @endDate IS NULL) 
          OR (t.fechaObjetivo >= @startDate AND t.fechaObjetivo <= @endDate)
      )
    ORDER BY t.fechaObjetivo ASC;
END
GO
