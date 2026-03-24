USE [Bdplaner];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario
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

    /* 1. Tareas creadas por carnet */
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate);

    /* 2. Tareas asignadas */
    MERGE #IdsTareas AS target
    USING (
        SELECT t.idTarea
        FROM dbo.p_TareaAsignados ta
        INNER JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
        WHERE t.activo = 1
          AND ta.carnet = @carnet
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
    ) AS source ON target.idTarea = source.idTarea
    WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
    OPTION (RECOMPILE);

    /* 3. Fallback idCreador */
    IF (@idUsuario IS NOT NULL)
    BEGIN
        MERGE #IdsTareas AS target
        USING (
            SELECT t.idTarea
            FROM dbo.p_Tareas t
            WHERE t.activo = 1
              AND t.idCreador = @idUsuario
              AND (@estado IS NULL OR t.estado = @estado)
              AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
              AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
              AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
              AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
        ) AS source ON target.idTarea = source.idTarea
        WHEN NOT MATCHED THEN INSERT (idTarea) VALUES (source.idTarea)
        OPTION (RECOMPILE);
    END

    /* Final Select */
    SELECT
        t.idTarea, t.idProyecto,
        t.nombre AS titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion,
        t.idTareaPadre,
        t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    INNER JOIN dbo.p_Tareas t     ON t.idTarea = x.idTarea
    LEFT  JOIN dbo.p_Proyectos p  ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);
END
GO
