/*
  FIX AGENDA V4:
  1. Add linkEvidencia to output.
  2. Ensure standard columns match Repo expectations.
*/

CREATE   PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario
    @carnet     NVARCHAR(50),
    @estado     NVARCHAR(50) = NULL,
    @idProyecto INT         = NULL,
    @query      NVARCHAR(100)= NULL,
    @startDate  DATETIME    = NULL,
    @endDate    DATETIME    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    DECLARE @idUsuario INT;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1. Assigned to me
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_TareaAsignados ta
    INNER JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (ta.carnet = @carnet OR (ta.carnet IS NULL AND ta.idUsuario = @idUsuario))
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate);

    -- 2. Created by me (Orphan)
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND (t.creadorCarnet = @carnet OR (t.creadorCarnet IS NULL AND t.idCreador = @idUsuario))
      AND NOT EXISTS (SELECT 1 FROM dbo.p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
      
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
      AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea);

    -- 3. Project Owner/Creator
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    INNER JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.activo = 1
      AND (p.responsableCarnet = @carnet OR p.creadorCarnet = @carnet OR (p.idCreador = @idUsuario AND p.creadorCarnet IS NULL))
      
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
      AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea);

    SELECT
        t.idTarea, t.idProyecto,
        t.nombre AS titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion,
        t.idTareaPadre,
        t.linkEvidencia, -- Added
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    INNER JOIN dbo.p_Tareas t     ON t.idTarea = x.idTarea
    LEFT  JOIN dbo.p_Proyectos p  ON p.idProyecto = t.idProyecto
    ORDER BY 
        CASE WHEN t.fechaObjetivo IS NULL THEN 1 ELSE 0 END,
        t.fechaObjetivo ASC, 
        t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END