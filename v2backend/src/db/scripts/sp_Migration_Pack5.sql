
-- ========================================================
-- MIGRACIÓN CLARITY: PAQUETE 5 (TAREA CREAR & REVALIDAR CARNET-FIRST)
-- Fecha: 2026-01-25
-- ========================================================

CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Crear]
    @nombre NVARCHAR(200),
    @idUsuario INT = NULL, -- Por compatibilidad
    @carnet NVARCHAR(50),
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(20) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Si no viene idUsuario, resolverlo para mantener FK structural
    IF @idUsuario IS NULL OR @idUsuario = 0
    BEGIN
        SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;
    END

    -- Si aun asi es NULL, error
    IF @idUsuario IS NULL 
    BEGIN
        RAISERROR('Usuario no encontrado por carnet.', 16, 1);
        RETURN;
    END

    INSERT INTO p_Tareas (
        nombre, idCreador, creadorCarnet, idProyecto, descripcion, estado, prioridad, esfuerzo, tipoTarea, 
        fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, fechaCreacion, activo
    )
    VALUES (
        @nombre, @idUsuario, @carnet, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo, 
        @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, GETDATE(), 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_Checkin_Upsert_v2]
    @usuarioCarnet NVARCHAR(50),
    @fecha DATE,
    @prioridad1 NVARCHAR(200) = NULL,
    @prioridad2 NVARCHAR(200) = NULL,
    @prioridad3 NVARCHAR(200) = NULL,
    @entregableTexto NVARCHAR(MAX) = NULL,
    @nota NVARCHAR(MAX) = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @estadoAnimo NVARCHAR(50) = NULL,
    @energia INT = NULL,
    @idNodo INT = NULL,
    @tareas dbo.TVP_CheckinTareas READONLY
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT, @idCheckin INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @usuarioCarnet;

    IF @idUsuario IS NULL RETURN;

    -- Upsert Checkin
    IF EXISTS (SELECT 1 FROM p_Checkins WHERE carnet = @usuarioCarnet AND CAST(fecha AS DATE) = @fecha)
    BEGIN
        SELECT @idCheckin = idCheckin FROM p_Checkins WHERE carnet = @usuarioCarnet AND CAST(fecha AS DATE) = @fecha;
        UPDATE p_Checkins 
        SET entregableTexto = @entregableTexto, nota = @nota, estadoAnimo = @estadoAnimo, energia = @energia,
            prioridad1 = @prioridad1, prioridad2 = @prioridad2, prioridad3 = @prioridad3,
            linkEvidencia = @linkEvidencia
        WHERE idCheckin = @idCheckin;
    END
    ELSE
    BEGIN
        INSERT INTO p_Checkins (idUsuario, carnet, fecha, entregableTexto, nota, estadoAnimo, energia, prioridad1, prioridad2, prioridad3, linkEvidencia)
        VALUES (@idUsuario, @usuarioCarnet, @fecha, @entregableTexto, @nota, @estadoAnimo, @energia, @prioridad1, @prioridad2, @prioridad3, @linkEvidencia);
        SET @idCheckin = SCOPE_IDENTITY();
    END

    -- Sync Tareas del Checkin
    DELETE FROM p_CheckinTareas WHERE idCheckin = @idCheckin;
    INSERT INTO p_CheckinTareas (idCheckin, idTarea, idUsuario, carnet, tipo, fechaCreacion)
    SELECT @idCheckin, t.idTarea, @idUsuario, @usuarioCarnet, t.tipo, GETDATE()
    FROM @tareas t;

    SELECT @idCheckin as idCheckin;
END
GO
