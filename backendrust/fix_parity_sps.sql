-- FIX 1: sp_Proyecto_ObtenerDetalle_rust
ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerDetalle_rust]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet
    WHERE p.idProyecto = @idProyecto;
END;
GO

-- FIX 2: sp_Tareas_ObtenerPorId_rust
ALTER PROCEDURE [dbo].[sp_Tarea_ObtenerDetalle_rust]
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.idTarea, 
        t.idProyecto, 
        t.idTareaPadre, 
        t.idAsignado, 
        t.idPlan,
        titulo = t.nombre,
        t.descripcion, 
        t.estado, 
        t.prioridad, 
        t.esfuerzo, 
        t.tipo,
        t.fechaCreacion, 
        t.fechaObjetivo, 
        t.fechaCompletado,
        t.porcentaje,
        progreso = t.porcentaje,
        t.orden, 
        t.idCreador, 
        t.fechaInicioPlanificada,
        t.comportamiento, 
        t.linkEvidencia,
        t.esHito,
        idResponsable = uR.idUsuario,
        responsableNombre = uR.nombreCompleto,
        responsableCarnet = ta.carnet,
        creadorNombre = uC.nombre,
        creadorCorreo = uC.correo,
        proyectoTipo = p.tipo,
        proyectoRequiereAprobacion = p.requiereAprobacion
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios uR ON ta.carnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON t.idCreador = uC.idUsuario
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;
END;
GO
