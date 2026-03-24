
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 1 (CORREGIDO V2 - CAMPOS CARNET NATIVOS)
-- Fecha: 2026-01-25
-- Descripción: Usa campos 'creadorCarnet' y 'carnet' existentes en tablas par evitar JOINS innecesarios.
-- =============================================

-- 1. SP para Obtener Tareas de Usuario (Por Carnet directo)
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario]
    @carnet NVARCHAR(50), 
    @estado NVARCHAR(50) = NULL,
    @idProyecto INT = NULL,
    @query NVARCHAR(100) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        t.idTarea, t.idProyecto, 
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion as fechaUltActualizacion,
        t.idTareaPadre,
        p.nombre as proyectoNombre 
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    
    -- OPTIMIZACIÓN: Filtrado directo por columnas de Carnet
    -- Se asume existencia de columnas t.creadorCarnet (o JOIN simple si no) y ta.carnet
    -- Si t.creadorCarnet no existe, mantenemos el JOIN a usuario solo para creador, 
    -- pero para asignados usamos ta.carnet directo.
    WHERE (
        -- t.creadorCarnet = @carnet -- Descomentar si existe columna en p_Tareas
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) -- Fallback seguro si no columna
        OR ta.carnet = @carnet -- ESTO SÍ EXISTE SEGÚN USUARIO
    )
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE '%' + @query + '%' OR t.descripcion LIKE '%' + @query + '%'))
      AND (
          (@startDate IS NULL OR @endDate IS NULL) 
          OR (t.fechaObjetivo >= @startDate AND t.fechaObjetivo <= @endDate)
      )
    ORDER BY t.fechaObjetivo ASC;
END
GO

-- 2. SP para Asignar Responsable (Usa Carnet)
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_AsignarResponsable]
    @idTarea INT,
    @carnetUsuario NVARCHAR(50),
    @tipo NVARCHAR(20) = 'Responsable',
    @esReasignacion BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Necesitamos el ID para mantener integridad FK si la columna idUsuario es NOT NULL
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnetUsuario;
    
    IF @idUsuario IS NULL RETURN;

    IF @esReasignacion = 1
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
    END

    IF NOT EXISTS (SELECT 1 FROM p_TareaAsignados WHERE idTarea = @idTarea AND carnet = @carnetUsuario)
    BEGIN
        -- Insertamos TANTO el ID como el CARNET para mantener consistencia
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
        VALUES (@idTarea, @idUsuario, @carnetUsuario, @tipo, GETDATE());
    END
END
GO

-- 3. SP para Eliminar Tarea
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Eliminar]
    @idTarea INT,
    @carnetSolicitante NVARCHAR(50),
    @motivo NVARCHAR(255) = 'Eliminación manual'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetCreador NVARCHAR(50);
    DECLARE @fechaCreacion DATETIME;
    DECLARE @idSolicitante INT; 

    -- Obtener usando JOIN a usuarios para estar seguros del creador
    SELECT @carnetCreador = u.carnet, @fechaCreacion = t.fechaCreacion 
    FROM p_Tareas t
    JOIN p_Usuarios u ON t.idCreador = u.idUsuario
    WHERE t.idTarea = @idTarea;
    
    -- Resolver ID sol (para logs de auditoria si piden ID)
    SELECT @idSolicitante = idUsuario FROM p_Usuarios WHERE carnet = @carnetSolicitante;

    IF @carnetCreador IS NULL RETURN; 

    -- SIEMPRE Soft Delete (Inactivación)
    -- Se elimina lógica de borrado físico para preservar historial y auditoría.
    
    UPDATE p_Tareas 
    SET activo = 0,
        deshabilitadoPor = @idSolicitante, -- Mantener ID aqui si la columna es FK int
        fechaDeshabilitacion = GETDATE(),
        motivoDeshabilitacion = @motivo
    WHERE idTarea = @idTarea;
END
GO
