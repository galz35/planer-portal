
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 3 (Tareas Proyecto y Multiples)
-- Fecha: 2026-01-25
-- =============================================

-- 8. SP para Obtener Tareas de un Proyecto
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
    ORDER BY t.orden ASC, t.fechaObjetivo ASC;
END
GO

-- 9. SP para Obtener Tareas de Múltiples Usuarios (Por Carnets)
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerMultiplesUsuarios]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.idTarea, t.nombre as titulo, t.estado, t.prioridad, 
        t.fechaInicioPlanificada, t.fechaObjetivo, t.porcentaje,
        ta.idUsuario,
        u.carnet as usuarioCarnet
    FROM p_Tareas t
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    INNER JOIN STRING_SPLIT(@carnetsList, ',') as L ON u.carnet = L.value
    WHERE t.activo = 1;
END
GO

-- 10. SP para Actualizar Nota
CREATE OR ALTER PROCEDURE [dbo].[sp_Nota_Actualizar]
    @idNota INT,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Notas 
    SET titulo = @titulo, 
        contenido = @contenido, 
        fechaModificacion = GETDATE()
    WHERE idNota = @idNota;
END
GO

-- 11. SP para Eliminar Nota
CREATE OR ALTER PROCEDURE [dbo].[sp_Nota_Eliminar]
    @id INT -- idNota
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM p_Notas WHERE idNota = @id;
END
GO
