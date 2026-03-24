-- ========================================================
-- MIGRACIÓN: AGREGAR VISIBILIDAD DE COLABORADORES A PROYECTOS
-- Fecha: 2026-03-02
-- Descripción: Permite que usuarios vean proyectos donde fueron invitados como colaboradores
-- ========================================================

GO

-- 1. Actualizar sp_ObtenerProyectos (Usuario)
CREATE OR ALTER PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    LEFT JOIN p_ProyectoColaboradores pc ON p.idProyecto = pc.idProyecto AND pc.activo = 1 AND pc.idUsuario = @idUsuario AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = @idUsuario
        OR pc.idProyecto IS NOT NULL -- ES COLABORADOR
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO

-- 2. Actualizar sp_Proyecto_ObtenerVisibles (Jerarquía)
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerVisibles]
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, 
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM dbo.p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE 
        (
            p.idCreador = @idUsuario  -- Es mi proyecto
            OR EXISTS (   -- Alguien de mi equipo fue asignado a una tarea de este proyecto
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
            OR EXISTS (  -- Yo o alguien de mi equipo es colaborador explícito del proyecto
                SELECT 1
                FROM dbo.p_ProyectoColaboradores pc
                INNER JOIN @idsEquipo team ON team.Id = pc.idUsuario
                WHERE pc.idProyecto = p.idProyecto AND pc.activo = 1 AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
            )
            OR EXISTS (  -- Yo soy colaborador explícito
                SELECT 1 
                FROM dbo.p_ProyectoColaboradores pc
                WHERE pc.idProyecto = p.idProyecto AND pc.idUsuario = @idUsuario AND pc.activo = 1 AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
GO
