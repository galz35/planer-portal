-- Tareas Historico Fix
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_ObtenerHistorico_rust') DROP PROCEDURE dbo.sp_Tarea_ObtenerHistorico_rust;
GO
CREATE PROCEDURE dbo.sp_Tarea_ObtenerHistorico_rust 
    @carnet nvarchar(50), 
    @dias INT = 30 
AS 
BEGIN 
    SET NOCOUNT ON; 
    SELECT DISTINCT
        t.idTarea, t.idProyecto,
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipoTarea as tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado as fechaHecha,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.fechaActualizacion as fechaUltActualizacion,
        p.nombre as proyectoNombre,
        CAST(c.fecha AS DATE) as fechaTrabajada,
        ct.tipo as tipoCheckin,
        COALESCE(c.fecha, t.fechaCreacion) as fechaOrden
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_CheckinTareas ct ON t.idTarea = ct.idTarea
    LEFT JOIN p_Checkins c ON ct.idCheckin = c.idCheckin
    WHERE (t.creadorCarnet = @carnet OR ta.carnet = @carnet)
        AND t.activo = 1
        AND (
        c.fecha >= DATEADD(day, -@dias, GETDATE())
        OR t.fechaCreacion >= DATEADD(day, -@dias, GETDATE())
        OR t.fechaCompletado >= DATEADD(day, -@dias, GETDATE())
        )
    ORDER BY fechaOrden DESC; 
END;
GO
