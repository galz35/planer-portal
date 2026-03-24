USE [Bdplaner];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/*
  FIX: Excluir tareas de proyectos inactivos de la agenda
  
  PROBLEMA: sp_Tareas_ObtenerPorUsuario no filtra por estado del proyecto.
  Cuando un proyecto se marca como Inactivo/Cerrado, sus tareas seguían
  apareciendo en la agenda del usuario.

  SOLUCIÓN: Agregar filtro (p.idProyecto IS NULL OR p.estado = 'Activo')
  en cada INSERT a #IdsTareas y en el SELECT final.
  
  Fecha: 2026-02-13
*/

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

    -- Normalize NULLs
    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    -- Get user ID once
    DECLARE @idUsuario INT;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- Temp table for unique IDs
    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1. Tasks where I am ASSIGNED (excluir proyectos inactivos)
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_TareaAsignados ta
    INNER JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE t.activo = 1
      AND ta.carnet = @carnet
      -- FIX: Solo tareas sin proyecto O de proyectos activos
      AND (t.idProyecto IS NULL OR p.estado = 'Activo')
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate);

    -- 2. Tasks CREATED by me but ORPHAN (No assignees, excluir proyectos inactivos)
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      -- CRITICAL FIX: Only if NO ONE is assigned
      AND NOT EXISTS (SELECT 1 FROM dbo.p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
      -- FIX: Solo tareas sin proyecto O de proyectos activos
      AND (t.idProyecto IS NULL OR p.estado = 'Activo')
      
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
      
      -- Avoid duplicates key error
      AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea);

    -- 3. Tasks by Creator ID (Fallback for old Personal Tasks, excluir proyectos inactivos)
    IF (@idUsuario IS NOT NULL)
    BEGIN
        INSERT INTO #IdsTareas (idTarea)
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
        WHERE t.activo = 1
          AND t.idCreador = @idUsuario
          -- CRITICAL FIX: Only if NO ONE is assigned in p_TareaAsignados
          AND NOT EXISTS (SELECT 1 FROM dbo.p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
          -- FIX: Solo tareas sin proyecto O de proyectos activos
          AND (t.idProyecto IS NULL OR p.estado = 'Activo')
          
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (@query IS NULL OR (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%'))
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
          AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea);
    END

    -- Final Select Joining back (doble-verificación de proyecto activo)
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
        t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    INNER JOIN dbo.p_Tareas t     ON t.idTarea = x.idTarea
    LEFT  JOIN dbo.p_Proyectos p  ON p.idProyecto = t.idProyecto
    WHERE (t.idProyecto IS NULL OR p.estado = 'Activo')
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END
GO

-- También actualizar obtenerBacklog para filtrar proyectos inactivos
-- Verificar si existe sp_Backlog o es query inline
PRINT 'Migration 2026-02-13: sp_Tareas_ObtenerPorUsuario actualizado para filtrar proyectos inactivos.';
GO
