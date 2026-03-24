USE [Bdplaner];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/*
  NOMBRE: sp_Equipo_ObtenerHoy
  DESCRIPCION: Obtiene estadísticas de ejecución diaria para una lista de carnets.
  
  LOGICA DE CONTEO (Estandarizada 2026):
  1. Retrasadas: Tareas Activas (Pendiente, EnCurso, Bloqueada) con FechaObjetivo < @fecha (ayer o antes).
  2. Planificadas (Hoy): Tareas Activas con FechaObjetivo <= @fecha (incluye hoy y arrastradas no vencidas si se considera backlog, 
     pero estrictamente "Para Hoy" debería ser FechaObjetivo = @fecha OR (Activas y FechaObjetivo < @fecha)).
     * AJUSTE: Para dashboard diario, Planificadas = Tareas que debían hacerse hoy o antes y siguen abiertas.
  3. EnCurso: Tareas específicamente en estado 'EnCurso'.
  4. Bloqueadas: Tareas en estado 'Bloqueada'.
  5. Hechas: Tareas completadas EXCATAMENTE en la fecha @fecha (comparando CAST(FechaCompletado AS DATE)).
  6. Descartadas: Tareas descartadas en la fecha @fecha.
  
  PARAMETROS:
  @carnetsList: Lista separada por comas de carnets (NVARCHAR(MAX)).
  @fecha: Fecha de referencia (DATETIME/DATE).
*/

CREATE OR ALTER PROCEDURE [dbo].[sp_Equipo_ObtenerHoy]
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    -- Tabla temporal para los carnets a consultar
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT TRIM(value)
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE TRIM(value) <> '';

    -- Resultado final
    SELECT 
        c.carnet,
        
        -- RETRASADAS: Activas y FechaObjetivo < Hoy
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision') 
                 AND CAST(t.fechaObjetivo AS DATE) < @fechaDate 
            THEN 1 ELSE 0 END), 0) as retrasadas,

        -- PLANIFICADAS (HOY): Activas y (FechaObjetivo <= Hoy)
        -- Nota: Esto representa la "Carga de Trabajo" actual visible
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Pausa') 
                 AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) <= @fechaDate)
            THEN 1 ELSE 0 END), 0) as planificadas,

        -- HECHAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Hecha' 
                 AND CAST(t.fechaCompletado AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as hechas,
            
        -- EN CURSO (Estado actual)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'EnCurso' 
            THEN 1 ELSE 0 END), 0) as enCurso,

        -- BLOQUEADAS (Estado actual)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Bloqueada' 
            THEN 1 ELSE 0 END), 0) as bloqueadas,

        -- DESCARTADAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Descartada' 
                 AND CAST(t.fechaActualizacion AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as descartadas

    FROM #Carnets c
    LEFT JOIN dbo.p_TareaAsignados ta ON ta.carnet = c.carnet
    LEFT JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1
    GROUP BY c.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO
