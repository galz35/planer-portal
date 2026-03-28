-- ============================================================
-- MIGRACIÓN: SPs exclusivos para Backend Rust
-- Convención: Nombre original + _rust
-- NO MODIFICAR SPs existentes de Nest.js
-- ============================================================

-- 1. sp_Checkin_Upsert_rust
--    Clon de sp_Checkin_Upsert_v2 SIN TVP (Tiberius no lo soporta)
--    Las tareas se insertan desde Rust en la misma transacción
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Checkin_Upsert_rust')
    DROP PROCEDURE dbo.sp_Checkin_Upsert_rust;
GO

CREATE PROCEDURE dbo.sp_Checkin_Upsert_rust
(
    @usuarioCarnet   NVARCHAR(50),
    @fecha           DATE,
    @prioridad1      NVARCHAR(255) = NULL,
    @prioridad2      NVARCHAR(255) = NULL,
    @prioridad3      NVARCHAR(255) = NULL,
    @entregableTexto NVARCHAR(MAX) = NULL,
    @nota            NVARCHAR(MAX) = NULL,
    @linkEvidencia   NVARCHAR(1000) = NULL,
    @estadoAnimo     NVARCHAR(50) = NULL,
    @energia         INT = NULL,
    @idNodo          INT = NULL
    -- SIN @tareas TVP: Rust insertará las tareas por separado en la misma transacción
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @usuarioCarnet;

    IF @idUsuario IS NULL
    BEGIN
        THROW 50001, 'Usuario no encontrado por carnet.', 1;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idCheckin INT;

        SELECT @idCheckin = idCheckin 
        FROM dbo.p_Checkins WITH (UPDLOCK, HOLDLOCK)
        WHERE idUsuario = @idUsuario AND CAST(fecha AS DATE) = @fecha;

        IF @idCheckin IS NULL
        BEGIN
            INSERT INTO dbo.p_Checkins(
                idUsuario, usuarioCarnet, fecha, 
                prioridad1, prioridad2, prioridad3, 
                entregableTexto, nota, linkEvidencia, 
                estadoAnimo, energia, idNodo
            )
            VALUES(
                @idUsuario, @usuarioCarnet, @fecha,
                @prioridad1, @prioridad2, @prioridad3,
                @entregableTexto, @nota, @linkEvidencia,
                @estadoAnimo, @energia, @idNodo
            );
            SET @idCheckin = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.p_Checkins
            SET 
                prioridad1 = @prioridad1,
                prioridad2 = @prioridad2,
                prioridad3 = @prioridad3,
                entregableTexto = @entregableTexto,
                nota = @nota,
                linkEvidencia = @linkEvidencia,
                estadoAnimo = @estadoAnimo,
                energia = @energia,
                idNodo = @idNodo
            WHERE idCheckin = @idCheckin;
        END

        -- Limpiar tareas anteriores (Rust re-insertará las nuevas después)
        DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;

        COMMIT;
        SELECT @idCheckin AS idCheckin;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO

-- 2. sp_Proyecto_Listar_rust  
--    Listar proyectos accesibles para un usuario por carnet
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Proyecto_Listar_rust')
    DROP PROCEDURE dbo.sp_Proyecto_Listar_rust;
GO

CREATE PROCEDURE dbo.sp_Proyecto_Listar_rust
(
    @carnet   NVARCHAR(50),
    @nombre   NVARCHAR(200) = NULL,
    @estado   NVARCHAR(50) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    SELECT 
        p.idProyecto,
        p.nombre,
        p.descripcion,
        p.estado,
        p.tipo,
        p.prioridad,
        p.fechaCreacion,
        p.fechaInicio,
        p.fechaFin,
        p.area,
        p.subgerencia,
        p.gerencia,
        p.pais,
        p.creadorCarnet,
        p.responsableCarnet,
        p.modoVisibilidad,
        uc.nombre AS creadorNombre,
        ur.nombre AS responsableNombre,
        (SELECT COUNT(*) FROM dbo.p_Tareas t WHERE t.idProyecto = p.idProyecto AND t.activo = 1) AS totalTareas,
        (SELECT COUNT(*) FROM dbo.p_Tareas t WHERE t.idProyecto = p.idProyecto AND t.activo = 1 AND t.estado = 'Hecha') AS tareasHechas
    FROM dbo.p_Proyectos p
    LEFT JOIN dbo.p_Usuarios uc ON uc.carnet = p.creadorCarnet
    LEFT JOIN dbo.p_Usuarios ur ON ur.carnet = p.responsableCarnet
    WHERE 
        -- Filtros opcionales
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        -- Visibilidad: creador, responsable, o colaborador
        AND (
            p.creadorCarnet = @carnet
            OR p.responsableCarnet = @carnet
            OR (@idUsuario IS NOT NULL AND p.idCreador = @idUsuario)
            OR (@idUsuario IS NOT NULL AND p.idResponsable = @idUsuario)
            OR EXISTS (
                SELECT 1 FROM dbo.p_ProyectoColaboradores pc 
                WHERE pc.idProyecto = p.idProyecto 
                AND pc.idUsuario = @idUsuario 
                AND pc.activo = 1
            )
            OR EXISTS (
                SELECT 1 FROM dbo.p_TareaAsignados ta 
                INNER JOIN dbo.p_Tareas t ON ta.idTarea = t.idTarea 
                WHERE t.idProyecto = p.idProyecto AND ta.carnet = @carnet
            )
        )
    ORDER BY p.fechaActualizacion DESC;
END
GO

PRINT '=== SPs Rust creados exitosamente ===';
GO
