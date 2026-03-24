
CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto]
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
    