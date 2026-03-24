USE [Bdplaner];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/*
  NOMBRE: sp_Equipo_ObtenerInforme
  DESCRIPCION: Obtiene estadísticas DETALLADAS de ejecución para 'Mi Equipo'.
  Separado de sp_Equipo_ObtenerHoy para evitar conflictos con Dashboards existentes.
  
  LOGICA (Solicitada por Usuario):
  1. Retrasadas: Tareas Activas (Pendiente, EnCurso, Bloqueada) con FechaObjetivo < @fecha.
  2. Planificadas (Activas): Tareas Activas con FechaObjetivo <= @fecha (Backlog activo + Hoy).
  3. EnCurso: Estado 'EnCurso'.
  4. Bloqueadas: Estado 'Bloqueada'.
  5. Hechas: Completadas HOY (comparación exacta de fecha).
  6. Descartadas: Descartadas HOY.
*/

CREATE OR ALTER PROCEDURE [dbo].[sp_Equipo_ObtenerInforme]
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

        -- PLANIFICADAS (Carga Activa): Activas y (FechaObjetivo <= Hoy O Null)
        ISNULL(SUM(CASE 
            WHEN t.estado IN ('Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Pausa') 
                 AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) <= @fechaDate)
            THEN 1 ELSE 0 END), 0) as planificadas,

        -- HECHAS (Solo hoy)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'Hecha' 
                 AND CAST(t.fechaCompletado AS DATE) = @fechaDate 
            THEN 1 ELSE 0 END), 0) as hechas,
            
        -- EN CURSO (Estado actual absoluto)
        ISNULL(SUM(CASE 
            WHEN t.estado = 'EnCurso' 
            THEN 1 ELSE 0 END), 0) as enCurso,

        -- BLOQUEADAS (Estado actual absoluto)
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
