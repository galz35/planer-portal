
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 2 (CORREGIDO V2 - CAMPOS CARNET NATIVOS)
-- Fecha: 2026-01-25
-- =============================================

-- 4. SP para Bloquear Tarea
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Bloquear]
    @idTarea INT,
    @carnetOrigen NVARCHAR(50),
    @carnetDestino NVARCHAR(50) = NULL,
    @motivo NVARCHAR(255),
    @destinoTexto NVARCHAR(255) = NULL,
    @accionMitigacion NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idOrigen INT, @idDestino INT;
    SELECT @idOrigen = idUsuario FROM p_Usuarios WHERE carnet = @carnetOrigen;
    
    IF @carnetDestino IS NOT NULL
        SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @carnetDestino;

    IF @idOrigen IS NULL RETURN; 

    IF EXISTS (SELECT 1 FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto')
    BEGIN
        SELECT idBloqueo, 1 as yaExistia FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto';
        RETURN;
    END

    -- Insert
    INSERT INTO p_Bloqueos(idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
    VALUES(@idTarea, @idOrigen, @idDestino, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

    UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @idTarea;
    SELECT SCOPE_IDENTITY() as idBloqueo, 0 as yaExistia;
END
GO

-- 5. SP para KPIs Dashboard
CREATE OR ALTER PROCEDURE [dbo].[sp_Dashboard_Kpis]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Usamos ta.carnet directo para asignados.
    -- Para creador, seguimos dependiendo de JOIN o subquery si no hay columna en p_Tareas.
    
    -- 1. Resumen Global
    SELECT
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
        OR ta.carnet = @carnet -- Uso directo de columna Carnet si existe
    )
      AND t.activo = 1;

    -- 2. Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM p_Tareas t
    JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (
        t.idCreador = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
        OR ta.carnet = @carnet
    )
      AND t.activo = 1
    GROUP BY p.nombre, p.area;
END
GO

-- 6. SP para Obtener Notas
CREATE OR ALTER PROCEDURE [dbo].[sp_Notas_Obtener]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- Notas usan idUsuario? Si p_Notas tiene idUsuario, necesitamos resolver.
    -- Si migramos p_Notas a usar carnet, cambiaríamos esto. Asumimos standard behavior.
    
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT * FROM p_Notas 
    WHERE idUsuario = @idUsuario 
    ORDER BY fechaModificacion DESC, fechaCreacion DESC;
END
GO

-- 7. SP para Crear Nota
CREATE OR ALTER PROCEDURE [dbo].[sp_Nota_Crear]
    @carnet NVARCHAR(50),
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    IF @idUsuario IS NULL RETURN;

    INSERT INTO p_Notas(idUsuario, titulo, contenido, fechaCreacion, fechaModificacion)
    VALUES(@idUsuario, @titulo, @contenido, GETDATE(), GETDATE());
END
GO
