-- =============================================
-- Migration: Zero Inline SQL for Planning Module
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Planning_StatsDashboard]
-- Reemplaza las 5 consultas paralelas de planning_stats
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_StatsDashboard]
    @idsStr NVARCHAR(MAX) -- CSV de idUsuario
AS
BEGIN
    SET NOCOUNT ON;

    -- [0] Proyectos (Resultset 0)
    SELECT 
        p.idProyecto, p.nombre, p.estado,
        (SELECT ISNULL(AVG(CAST(st.porcentaje AS FLOAT)), 0) FROM p_Tareas st WHERE st.idProyecto = p.idProyecto AND st.estado NOT IN ('Eliminada', 'Archivada')) as globalProgress,
        ISNULL(p.subgerencia, 'General') as subgerencia, ISNULL(p.area, '') as area, ISNULL(p.gerencia, '') as gerencia,
        p.fechaInicio, p.fechaFin,
        COUNT(DISTINCT ta.idTarea) as totalTasks,
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as hechas,
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as pendientes,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as bloqueadas,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND ta.idUsuario IS NOT NULL AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ','))
    GROUP BY p.idProyecto, p.nombre, p.estado, p.subgerencia, p.area, p.gerencia, p.fechaInicio, p.fechaFin
    UNION ALL
    SELECT 
        0 as idProyecto, 'Tareas Sin Proyecto' as nombre, 'Activo' as estado, 0 as globalProgress,
        'General' as subgerencia, '' as area, '' as gerencia, NULL as fechaInicio, NULL as fechaFin,
        COUNT(DISTINCT t.idTarea) as totalTasks,
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END), 0) as hechas,
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) as pendientes,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
    FROM p_Tareas t
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (t.idProyecto IS NULL OR t.idProyecto = 0) AND ta.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ',')) AND t.estado NOT IN ('Eliminada', 'Archivada')
    HAVING COUNT(t.idTarea) > 0;

    -- [1] Tareas Detalles (Resultset 1)
    SELECT 
        t.idTarea, ISNULL(t.idProyecto, 0) as idProyecto, t.nombre as titulo, t.estado,
        ISNULL(t.porcentaje, 0) as progreso, t.prioridad, t.fechaInicioPlanificada as fechaInicio,
        t.fechaObjetivo, u.nombre as asignado,
        CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as isDelayed
    FROM p_Tareas t
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE ta.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ',')) AND t.estado NOT IN ('Eliminada', 'Archivada')
    ORDER BY t.fechaObjetivo ASC;

    -- [2] Usuarios Activos (Resultset 2)
    SELECT DISTINCT ta.idUsuario
    FROM p_TareaAsignados ta
    INNER JOIN p_Tareas t ON ta.idTarea = t.idTarea
    WHERE ta.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ',')) AND t.estado IN ('Pendiente', 'EnCurso');

    -- [3] Top Retrasos (Resultset 3)
    SELECT TOP 10
        t.idTarea, t.nombre as titulo, t.fechaObjetivo,
        DATEDIFF(DAY, t.fechaObjetivo, GETDATE()) as diasRetraso, u.nombre as asignado
    FROM p_Tareas t
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE ta.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ',')) 
      AND t.estado IN ('Pendiente', 'EnCurso') 
      AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE)
    ORDER BY diasRetraso DESC;

    -- [4] Bloqueos Detalle (Resultset 4)
    SELECT TOP 20
        b.idBloqueo as id, ISNULL(t.nombre, 'Sin tarea') as tarea, ISNULL(p.nombre, 'General') as proyecto,
        u.nombre as usuario, b.motivo, DATEDIFF(DAY, b.fechaCreacion, GETDATE()) as dias
    FROM p_Bloqueos b
    LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
    WHERE b.idUsuario IN (SELECT value FROM STRING_SPLIT(@idsStr, ',')) AND b.estado = 'Activo'
    ORDER BY b.fechaCreacion DESC;
END
GO

-- 2. [sp_Planning_StatsCompliance]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_StatsCompliance]
    @mes INT,
    @anio INT
AS
BEGIN
    SELECT 
        estado,
        COUNT(*) as count,
        AVG(CAST(IIF(ISNULL(objetivos, '') <> '', 1, 0) AS FLOAT)) * 100.0 as hasGoalsPercent
    FROM p_PlanesTrabajo
    WHERE mes = @mes AND anio = @anio
    GROUP BY estado;
END
GO

-- 3. [sp_Planning_StatsPerformance]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_StatsPerformance]
    @mes INT,
    @anio INT
AS
BEGIN
    SELECT 
        p.gerencia,
        p.area,
        AVG(CAST(t.porcentaje AS FLOAT)) as avgProgress,
        COUNT(t.idTarea) as totalTasks,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as doneTasks
    FROM p_Proyectos p
    JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    WHERE t.activo = 1
      AND (t.fechaObjetivo IS NULL OR (MONTH(t.fechaObjetivo) = @mes AND YEAR(t.fechaObjetivo) = @anio))
    GROUP BY p.gerencia, p.area
    ORDER BY avgProgress DESC;
END
GO

-- 4. [sp_Planning_StatsBottlenecks]
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_StatsBottlenecks]
AS
BEGIN
    -- TOP Delayed Users
    SELECT TOP 10
        u.nombre,
        ta.carnet,
        COUNT(t.idTarea) as delayedCount,
        MAX(DATEDIFF(DAY, t.fechaObjetivo, GETDATE())) as maxDelayDays
    FROM p_Tareas t
    JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.estado IN ('Pendiente', 'EnCurso')
      AND t.fechaObjetivo < GETDATE()
      AND t.activo = 1
    GROUP BY u.nombre, ta.carnet
    ORDER BY delayedCount DESC;

    -- TOP Blockers
    SELECT TOP 10
        u.nombre,
        COUNT(b.idBloqueo) as activeBlockers
    FROM p_Bloqueos b
    JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
    WHERE b.estado = 'Activo'
    GROUP BY u.nombre
    ORDER BY activeBlockers DESC;
END
GO
