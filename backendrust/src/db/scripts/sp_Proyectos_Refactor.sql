-- =============================================
-- Migration: Zero Inline SQL - Modulo Proyectos
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Proyecto_ObtenerDetalle]
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerDetalle]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.*, 
        creadorNombre = uc.nombre,
        responsableNombre = ur.nombre,
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios uc ON p.idCreador = uc.idUsuario
    LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet
    WHERE p.idProyecto = @idProyecto;
END
GO

-- 2. [sp_Tareas_ObtenerPorProyecto]
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto]
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
        t.idTareaPadre,
        p.nombre as proyectoNombre,
        u.nombreCompleto as responsableNombre,
        u.carnet as responsableCarnet
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.idProyecto = @idProyecto
      AND t.activo = 1
      AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
    ORDER BY t.semana ASC, t.orden ASC;
END
GO
