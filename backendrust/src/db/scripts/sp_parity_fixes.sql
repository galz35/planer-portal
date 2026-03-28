-- Parity Fixes
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ObtenerProyectos_rust') DROP PROCEDURE dbo.sp_ObtenerProyectos_rust;
GO
CREATE PROCEDURE dbo.sp_ObtenerProyectos_rust @carnet nvarchar(50), @filtroNombre nvarchar(100) = NULL, @filtroEstado nvarchar(50) = NULL AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerProyectos @carnet, @filtroNombre, @filtroEstado; END;
GO
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Visibilidad_ObtenerCarnets_rust') DROP PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets_rust;
GO
CREATE PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets_rust @carnetSolicitante nvarchar(50) = NULL AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante; END;
GO
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Organizacion_ObtenerEstructura_rust') DROP PROCEDURE dbo.sp_Organizacion_ObtenerEstructura_rust;
GO
CREATE PROCEDURE dbo.sp_Organizacion_ObtenerEstructura_rust AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_Organizacion_ObtenerEstructura; END;
GO
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Usuarios_Buscar_rust') DROP PROCEDURE dbo.sp_Usuarios_Buscar_rust;
GO
CREATE PROCEDURE dbo.sp_Usuarios_Buscar_rust
    @termino NVARCHAR(100),
    @limite INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @t NVARCHAR(260) = '%' + ISNULL(@termino,'') + '%';
    SELECT TOP (@limite) *
    FROM dbo.p_Usuarios
    WHERE activo = 1
      AND (
           LOWER(nombreCompleto) LIKE LOWER(@t) OR
           carnet LIKE @t OR
           LOWER(correo) LIKE LOWER(@t)
      )
    ORDER BY nombreCompleto ASC;
END
GO
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_PermisoArea_ListarActivos_rust') DROP PROCEDURE dbo.sp_PermisoArea_ListarActivos_rust;
GO
CREATE PROCEDURE dbo.sp_PermisoArea_ListarActivos_rust AS BEGIN SET NOCOUNT ON; SELECT * FROM p_permiso_area WHERE activo = 1 ORDER BY creado_en DESC; END;
GO
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_PermisoEmpleado_ListarActivos_rust') DROP PROCEDURE dbo.sp_PermisoEmpleado_ListarActivos_rust;
GO
CREATE PROCEDURE dbo.sp_PermisoEmpleado_ListarActivos_rust AS BEGIN SET NOCOUNT ON; SELECT * FROM p_permiso_empleado WHERE activo = 1 ORDER BY creado_en DESC; END;
GO

-- Marcaje Admin SPs
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Marcaje_Admin_ObtenerSolicitudes_rust') DROP PROCEDURE dbo.sp_Marcaje_Admin_ObtenerSolicitudes_rust;
GO
CREATE PROCEDURE sp_Marcaje_Admin_ObtenerSolicitudes_rust
AS
BEGIN
    SELECT TOP 200 s.*, u.nombreCompleto as colaborador_nombre
    FROM marcaje_solicitudes s
    LEFT JOIN p_Usuarios u ON u.carnet = s.carnet
    ORDER BY s.creado_en DESC
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Marcaje_Admin_ObtenerSites_rust') DROP PROCEDURE dbo.sp_Marcaje_Admin_ObtenerSites_rust;
GO
CREATE PROCEDURE sp_Marcaje_Admin_ObtenerSites_rust
AS
BEGIN
    SELECT * FROM marcaje_sites ORDER BY id ASC
END
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Marcaje_Admin_ObtenerIps_rust') DROP PROCEDURE dbo.sp_Marcaje_Admin_ObtenerIps_rust;
GO
CREATE PROCEDURE sp_Marcaje_Admin_ObtenerIps_rust
AS
BEGIN
    SELECT * FROM marcaje_ip_whitelist ORDER BY id ASC
END
GO

-- Proyectos
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Proyecto_Listar_rust') DROP PROCEDURE dbo.sp_Proyecto_Listar_rust;
GO
CREATE PROCEDURE dbo.sp_Proyecto_Listar_rust
    @carnet NVARCHAR(50) = NULL,
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 2000
AS
BEGIN
    SET NOCOUNT ON;
    -- Si el carnet es Admin, usamos sp_Proyectos_Listar (Admin)
    -- Si no, usamos sp_ObtenerProyectos (Usuario)
    DECLARE @idRol INT;
    SELECT @idRol = idRol FROM p_Usuarios WHERE carnet = @carnet;

    IF @idRol = 1 -- Admin
    BEGIN
        EXEC dbo.sp_Proyectos_Listar @nombre, @estado, @gerencia, @subgerencia, @area, @tipo, @pageNumber, @pageSize;
    END
    ELSE
    BEGIN
        EXEC dbo.sp_ObtenerProyectos @carnet, @nombre, @estado;
    END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Checkin_Upsert_rust
    @usuarioCarnet NVARCHAR(50),
    @fecha DATE,
    @prioridad1 NVARCHAR(255) = NULL,
    @prioridad2 NVARCHAR(255) = NULL,
    @prioridad3 NVARCHAR(255) = NULL,
    @entregableTexto NVARCHAR(MAX) = NULL,
    @nota NVARCHAR(MAX) = NULL,
    @linkEvidencia NVARCHAR(1000) = NULL,
    @estadoAnimo NVARCHAR(50) = NULL,
    @energia INT = NULL,
    @idNodo INT = NULL,
    @tareasJson NVARCHAR(MAX) = NULL,
    @autoStartEntrego BIT = 0,
    @registrarAgendaAudit BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario
    FROM dbo.p_Usuarios
    WHERE carnet = @usuarioCarnet;

    IF @idUsuario IS NULL
    BEGIN
        THROW 50001, 'Usuario no encontrado por carnet.', 1;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idCheckin INT;

        SELECT @idCheckin = idCheckin
        FROM dbo.p_Checkins WITH (UPDLOCK, HOLDLOCK)
        WHERE idUsuario = @idUsuario
          AND CAST(fecha AS DATE) = @fecha;

        IF @idCheckin IS NULL
        BEGIN
            INSERT INTO dbo.p_Checkins(
                idUsuario,
                usuarioCarnet,
                fecha,
                prioridad1,
                prioridad2,
                prioridad3,
                entregableTexto,
                nota,
                linkEvidencia,
                estadoAnimo,
                energia,
                idNodo,
                fechaCreacion
            )
            VALUES(
                @idUsuario,
                @usuarioCarnet,
                @fecha,
                @prioridad1,
                @prioridad2,
                @prioridad3,
                @entregableTexto,
                @nota,
                @linkEvidencia,
                @estadoAnimo,
                @energia,
                @idNodo,
                GETDATE()
            );

            SET @idCheckin = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.p_Checkins
            SET prioridad1 = @prioridad1,
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

        DELETE FROM dbo.p_CheckinTareas
        WHERE idCheckin = @idCheckin;

        IF ISJSON(@tareasJson) = 1
        BEGIN
            INSERT INTO dbo.p_CheckinTareas (
                idCheckin,
                idTarea,
                tipo
            )
            SELECT
                @idCheckin,
                TRY_CAST(JSON_VALUE(j.value, '$.idTarea') AS INT),
                JSON_VALUE(j.value, '$.tipo')
            FROM OPENJSON(@tareasJson) AS j
            WHERE TRY_CAST(JSON_VALUE(j.value, '$.idTarea') AS INT) IS NOT NULL
              AND JSON_VALUE(j.value, '$.tipo') IN ('Entrego', 'Avanzo', 'Extra');
        END

        IF @autoStartEntrego = 1 AND ISJSON(@tareasJson) = 1
        BEGIN
            UPDATE t
            SET t.estado = 'En Curso',
                t.fechaInicioReal = ISNULL(t.fechaInicioReal, GETDATE()),
                t.fechaActualizacion = GETDATE()
            FROM dbo.p_Tareas t
            INNER JOIN OPENJSON(@tareasJson) AS j
                ON TRY_CAST(JSON_VALUE(j.value, '$.idTarea') AS INT) = t.idTarea
            WHERE JSON_VALUE(j.value, '$.tipo') = 'Entrego'
              AND t.estado IN ('Pendiente', 'Nueva', 'Por Hacer');
        END

        IF @registrarAgendaAudit = 1
        BEGIN
            DECLARE @totalTareas INT = 0;

            IF ISJSON(@tareasJson) = 1
            BEGIN
                SELECT @totalTareas = COUNT(1)
                FROM OPENJSON(@tareasJson) AS j
                WHERE TRY_CAST(JSON_VALUE(j.value, '$.idTarea') AS INT) IS NOT NULL;
            END

            INSERT INTO dbo.p_Auditoria (
                idUsuario,
                carnet,
                accion,
                entidad,
                entidadId,
                datosNuevos,
                fecha
            )
            VALUES (
                @idUsuario,
                @usuarioCarnet,
                'CHECKIN_DIARIO',
                'Agenda',
                CONVERT(NVARCHAR(10), @fecha, 23),
                CONCAT('{"totalTareas":', @totalTareas, '}'),
                GETDATE()
            );
        END

        COMMIT;

        SELECT @idCheckin AS idCheckin;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK;
        THROW;
    END CATCH
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Proyecto_ObtenerDetalle_rust') DROP PROCEDURE dbo.sp_Proyecto_ObtenerDetalle_rust;
GO
CREATE PROCEDURE dbo.sp_Proyecto_ObtenerDetalle_rust
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
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
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE p.idProyecto = @idProyecto;
END;
GO

-- Tareas
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerPorId_rust') DROP PROCEDURE dbo.sp_Tareas_ObtenerPorId_rust;
GO
CREATE PROCEDURE dbo.sp_Tareas_ObtenerPorId_rust
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        t.*,
        t.porcentaje as progreso, -- Alias para paridad
        responsableNombre = uR.nombre,
        responsableCarnet = uR.carnet,
        creadorNombre = uC.nombre,
        proyectoNombre = p.nombre
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios uR ON ta.carnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON t.idCreador = uC.idUsuario
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_ObtenerDetalle_rust') DROP PROCEDURE dbo.sp_Tarea_ObtenerDetalle_rust;
GO
CREATE PROCEDURE dbo.sp_Tarea_ObtenerDetalle_rust
    @idTarea INT
AS
BEGIN
    EXEC dbo.sp_Tareas_ObtenerPorId_rust @idTarea;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tareas_ObtenerPorUsuario_rust') DROP PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario_rust;
GO
CREATE PROCEDURE dbo.sp_Tareas_ObtenerPorUsuario_rust
    @carnet NVARCHAR(50),
    @estado NVARCHAR(50) = NULL,
    @idProyecto INT = NULL,
    @query NVARCHAR(100) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerPorUsuario
        @carnet,
        @estado,
        @idProyecto,
        @query,
        @startDate,
        @endDate;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_Actualizar_rust') DROP PROCEDURE dbo.sp_Tarea_Actualizar_rust;
GO
CREATE PROCEDURE dbo.sp_Tarea_Actualizar_rust
    @idTarea INT,
    @titulo NVARCHAR(200) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @idProyecto INT = NULL,
    @idResponsable INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @tipo NVARCHAR(50) = NULL,
    @esfuerzo NVARCHAR(50) = NULL,
    @comportamiento NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET nombre = ISNULL(@titulo, nombre),
        descripcion = ISNULL(@descripcion, descripcion),
        estado = ISNULL(@estado, estado),
        prioridad = ISNULL(@prioridad, prioridad),
        porcentaje = ISNULL(@progreso, porcentaje),
        idProyecto = ISNULL(NULLIF(@idProyecto, 0), idProyecto),
        fechaObjetivo = ISNULL(@fechaObjetivo, fechaObjetivo),
        fechaInicioPlanificada = ISNULL(@fechaInicioPlanificada, fechaInicioPlanificada),
        linkEvidencia = ISNULL(@linkEvidencia, linkEvidencia),
        idTareaPadre = ISNULL(NULLIF(@idTareaPadre, 0), idTareaPadre),
        tipoTarea = ISNULL(@tipo, tipoTarea),
        esfuerzo = ISNULL(@esfuerzo, esfuerzo),
        comportamiento = ISNULL(@comportamiento, comportamiento),
        fechaActualizacion = GETDATE()
    WHERE idTarea = @idTarea;

    IF @idResponsable IS NOT NULL AND @idResponsable > 0
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet, fechaAsignacion)
        SELECT @idTarea, idUsuario, 'Responsable', carnet, GETDATE() FROM p_Usuarios WHERE idUsuario = @idResponsable;
    END
END;
GO

-- Planning
IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_ObtenerAgenda_rust') DROP PROCEDURE dbo.sp_Planning_ObtenerAgenda_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_ObtenerAgenda_rust
    @carnetsList NVARCHAR(MAX),
    @startDate NVARCHAR(64),
    @endDate NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @startDateTime DATETIME = COALESCE(
        TRY_CONVERT(DATETIME, @startDate, 126),
        TRY_CONVERT(DATETIME, @startDate, 121),
        TRY_CONVERT(DATETIME, @startDate, 120),
        TRY_CONVERT(DATETIME, LEFT(@startDate, 10), 23)
    );

    DECLARE @endDateTime DATETIME = COALESCE(
        TRY_CONVERT(DATETIME, @endDate, 126),
        TRY_CONVERT(DATETIME, @endDate, 121),
        TRY_CONVERT(DATETIME, @endDate, 120),
        TRY_CONVERT(DATETIME, LEFT(@endDate, 10), 23)
    );

    IF @startDateTime IS NULL OR @endDateTime IS NULL
    BEGIN
        RAISERROR('sp_Planning_ObtenerAgenda_rust: startDate/endDate invalidos.', 16, 1);
        RETURN;
    END;

    SELECT
        ct.idTarea,
        c.fecha,
        c.usuarioCarnet
    FROM p_Checkins c
    INNER JOIN p_CheckinTareas ct ON c.idCheckin = ct.idCheckin
    WHERE c.usuarioCarnet IN (
        SELECT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@carnetsList, ',')
        WHERE LTRIM(RTRIM(value)) <> ''
    )
      AND c.fecha >= @startDateTime
      AND c.fecha <= @endDateTime
    ORDER BY c.fecha ASC, c.usuarioCarnet ASC, ct.idTarea ASC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_CheckPermission_rust') DROP PROCEDURE dbo.sp_Planning_CheckPermission_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_CheckPermission_rust
    @idTarea INT,
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idProyecto INT,
            @idCreador INT,
            @proyectoTipo NVARCHAR(50),
            @reqAprob BIT;

    SELECT
        @idProyecto = t.idProyecto,
        @idCreador = t.idCreador,
        @proyectoTipo = ISNULL(p.tipo, 'General'),
        @reqAprob = ISNULL(p.requiereAprobacion, 0)
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;

    DECLARE @isAssigned BIT = 0;
    IF EXISTS (
        SELECT 1
        FROM p_TareaAsignados
        WHERE idTarea = @idTarea
          AND idUsuario = @idUsuario
    )
        SET @isAssigned = 1;

    SELECT
        @idProyecto AS idProyecto,
        @idCreador AS idCreador,
        @proyectoTipo AS proyectoTipo,
        @reqAprob AS requiereAprobacion,
        @isAssigned AS isAssigned;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_SolicitudCambio_ObtenerPendientes_rust') DROP PROCEDURE dbo.sp_SolicitudCambio_ObtenerPendientes_rust;
GO
CREATE PROCEDURE dbo.sp_SolicitudCambio_ObtenerPendientes_rust
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.*,
        t.nombre AS tareaNombre,
        u.nombre AS solicitanteNombre,
        u.carnet AS solicitanteCarnet,
        p.nombre AS proyectoNombre
    FROM p_SolicitudesCambio s
    INNER JOIN p_Tareas t ON s.idTarea = t.idTarea
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    INNER JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
    WHERE s.estado = 'Pendiente'
    ORDER BY s.fechaSolicitud DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_SolicitudCambio_ObtenerPendientesPorCarnets_rust') DROP PROCEDURE dbo.sp_SolicitudCambio_ObtenerPendientesPorCarnets_rust;
GO
CREATE PROCEDURE dbo.sp_SolicitudCambio_ObtenerPendientesPorCarnets_rust
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.*,
        t.nombre AS tareaNombre,
        u.nombre AS solicitanteNombre,
        u.carnet AS solicitanteCarnet,
        p.nombre AS proyectoNombre
    FROM p_SolicitudesCambio s
    INNER JOIN p_Tareas t ON s.idTarea = t.idTarea
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    INNER JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
    WHERE s.estado = 'Pendiente'
      AND u.carnet IN (
        SELECT LTRIM(RTRIM(value))
        FROM STRING_SPLIT(@carnetsList, ',')
        WHERE LTRIM(RTRIM(value)) <> ''
      )
    ORDER BY s.fechaSolicitud DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_ActualizarTarea_rust') DROP PROCEDURE dbo.sp_ActualizarTarea_rust;
GO
CREATE PROCEDURE dbo.sp_ActualizarTarea_rust
    @idTarea INT,
    @titulo NVARCHAR(500) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.sp_ActualizarTarea
        @idTarea = @idTarea,
        @titulo = @titulo,
        @descripcion = @descripcion,
        @estado = @estado,
        @prioridad = @prioridad,
        @progreso = @progreso,
        @fechaObjetivo = @fechaObjetivo,
        @fechaInicioPlanificada = @fechaInicioPlanificada,
        @linkEvidencia = @linkEvidencia,
        @idTareaPadre = @idTareaPadre;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_StatsPerformance_rust') DROP PROCEDURE dbo.sp_Planning_StatsPerformance_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_StatsPerformance_rust
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.gerencia,
        p.area,
        AVG(CAST(t.porcentaje AS FLOAT)) AS avgProgress,
        COUNT(t.idTarea) AS totalTasks,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) AS doneTasks
    FROM dbo.p_Proyectos p
    JOIN dbo.p_Tareas t ON p.idProyecto = t.idProyecto
    WHERE t.activo = 1
      AND (
            t.fechaObjetivo IS NULL
            OR (MONTH(t.fechaObjetivo) = @mes AND YEAR(t.fechaObjetivo) = @anio)
          )
    GROUP BY p.gerencia, p.area
    ORDER BY avgProgress DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_StatsBottlenecks_rust') DROP PROCEDURE dbo.sp_Planning_StatsBottlenecks_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_StatsBottlenecks_rust
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 10
        u.nombre,
        ta.carnet,
        COUNT(t.idTarea) AS delayedCount,
        MAX(DATEDIFF(DAY, t.fechaObjetivo, GETDATE())) AS maxDelayDays
    FROM dbo.p_Tareas t
    JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    JOIN dbo.p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.estado IN ('Pendiente', 'EnCurso')
      AND t.fechaObjetivo < GETDATE()
      AND t.activo = 1
    GROUP BY u.nombre, ta.carnet
    ORDER BY delayedCount DESC;

    SELECT TOP 10
        u.nombre,
        COUNT(b.idBloqueo) AS activeBlockers
    FROM dbo.p_Bloqueos b
    JOIN dbo.p_Usuarios u ON b.idUsuario = u.idUsuario
    WHERE b.estado = 'Activo'
    GROUP BY u.nombre
    ORDER BY activeBlockers DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Usuarios_ObtenerDetallesPorId_rust') DROP PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorId_rust;
GO
CREATE PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorId_rust
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.cargo,
        u.departamento,
        u.idRol,
        u.idOrg,
        u.jefeCarnet,
        u.activo,
        r.nombre AS rolNombre,
        r.descripcion AS rolDescripcion,
        r.esSistema AS rolEsSistema,
        r.reglas AS rolReglas,
        r.defaultMenu AS rolDefaultMenu
    FROM dbo.p_Usuarios u
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    WHERE u.idUsuario = @idUsuario
      AND u.activo = 1;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_UpsertPlan_rust') DROP PROCEDURE dbo.sp_Planning_UpsertPlan_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_UpsertPlan_rust
    @idUsuario INT,
    @mes INT,
    @anio INT,
    @objetivos NVARCHAR(MAX),
    @estado NVARCHAR(50),
    @idCreador INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idPlan INT;
    DECLARE @carnet NVARCHAR(50);

    SELECT @carnet = carnet
    FROM dbo.p_Usuarios
    WHERE idUsuario = @idUsuario;

    SELECT @idPlan = idPlan
    FROM dbo.p_PlanesTrabajo
    WHERE idUsuario = @idUsuario
      AND mes = @mes
      AND anio = @anio;

    IF @idPlan IS NOT NULL
    BEGIN
        UPDATE dbo.p_PlanesTrabajo
        SET objetivos = @objetivos,
            estado = @estado,
            fechaActualizacion = GETDATE()
        WHERE idPlan = @idPlan;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.p_PlanesTrabajo (
            idUsuario,
            mes,
            anio,
            carnet,
            objetivos,
            estado,
            fechaCreacion
        )
        VALUES (
            @idUsuario,
            @mes,
            @anio,
            @carnet,
            @objetivos,
            @estado,
            GETDATE()
        );

        SET @idPlan = SCOPE_IDENTITY();
    END

    SELECT idPlan, idUsuario, mes, anio, objetivos, estado
    FROM dbo.p_PlanesTrabajo
    WHERE idPlan = @idPlan;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Plan_Cerrar_rust') DROP PROCEDURE dbo.sp_Plan_Cerrar_rust;
GO
CREATE PROCEDURE dbo.sp_Plan_Cerrar_rust
    @idPlan INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Plan_Cerrar @idPlan = @idPlan;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_SolicitudCambio_Resolver_rust') DROP PROCEDURE dbo.sp_SolicitudCambio_Resolver_rust;
GO
CREATE PROCEDURE dbo.sp_SolicitudCambio_Resolver_rust
    @idSolicitud INT,
    @estado NVARCHAR(50),
    @idUsuarioResolutor INT,
    @comentarioResolucion NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.p_SolicitudesCambio
    SET estado = @estado,
        idUsuarioResolutor = @idUsuarioResolutor,
        fechaResolucion = GETDATE(),
        comentarioResolucion = @comentarioResolucion
    OUTPUT INSERTED.*
    WHERE idSolicitud = @idSolicitud;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_StatsDashboard_rust') DROP PROCEDURE dbo.sp_Planning_StatsDashboard_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_StatsDashboard_rust
    @idsStr NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.idProyecto,
        p.nombre,
        p.estado,
        (
            SELECT ISNULL(AVG(CAST(st.porcentaje AS FLOAT)), 0)
            FROM dbo.p_Tareas st
            WHERE st.idProyecto = p.idProyecto
              AND st.estado NOT IN ('Eliminada', 'Archivada')
        ) AS globalProgress,
        ISNULL(p.subgerencia, 'General') AS subgerencia,
        ISNULL(p.area, '') AS area,
        ISNULL(p.gerencia, '') AS gerencia,
        p.fechaInicio,
        p.fechaFin,
        COUNT(DISTINCT ta.idTarea) AS totalTasks,
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) AS hechas,
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) AS enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) AS pendientes,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) AS bloqueadas,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND ta.idUsuario IS NOT NULL AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) AS atrasadas
    FROM dbo.p_Proyectos p
    LEFT JOIN dbo.p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN dbo.p_TareaAsignados ta
        ON t.idTarea = ta.idTarea
       AND ta.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
       )
    GROUP BY
        p.idProyecto,
        p.nombre,
        p.estado,
        p.subgerencia,
        p.area,
        p.gerencia,
        p.fechaInicio,
        p.fechaFin

    UNION ALL

    SELECT
        0 AS idProyecto,
        'Tareas Sin Proyecto' AS nombre,
        'Activo' AS estado,
        0 AS globalProgress,
        'General' AS subgerencia,
        '' AS area,
        '' AS gerencia,
        NULL AS fechaInicio,
        NULL AS fechaFin,
        COUNT(DISTINCT t.idTarea) AS totalTasks,
        ISNULL(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END), 0) AS hechas,
        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) AS enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) AS pendientes,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) AS bloqueadas,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) AS atrasadas
    FROM dbo.p_Tareas t
    INNER JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE (t.idProyecto IS NULL OR t.idProyecto = 0)
      AND ta.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
      )
      AND t.estado NOT IN ('Eliminada', 'Archivada')
    HAVING COUNT(t.idTarea) > 0;

    SELECT
        t.idTarea,
        ISNULL(t.idProyecto, 0) AS idProyecto,
        t.nombre AS titulo,
        t.estado,
        ISNULL(t.porcentaje, 0) AS progreso,
        t.prioridad,
        t.fechaInicioPlanificada AS fechaInicio,
        t.fechaObjetivo,
        u.nombre AS asignado,
        CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS isDelayed
    FROM dbo.p_Tareas t
    INNER JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    INNER JOIN dbo.p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE ta.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
      )
      AND t.estado NOT IN ('Eliminada', 'Archivada')
    ORDER BY t.fechaObjetivo ASC;

    SELECT DISTINCT ta.idUsuario
    FROM dbo.p_TareaAsignados ta
    INNER JOIN dbo.p_Tareas t ON ta.idTarea = t.idTarea
    WHERE ta.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
      )
      AND t.estado IN ('Pendiente', 'EnCurso');

    SELECT TOP 10
        t.idTarea,
        t.nombre AS titulo,
        t.fechaObjetivo,
        DATEDIFF(DAY, t.fechaObjetivo, GETDATE()) AS diasRetraso,
        u.nombre AS asignado
    FROM dbo.p_Tareas t
    INNER JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    INNER JOIN dbo.p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE ta.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
      )
      AND t.estado IN ('Pendiente', 'EnCurso')
      AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE)
    ORDER BY diasRetraso DESC;

    SELECT TOP 20
        b.idBloqueo AS id,
        ISNULL(t.nombre, 'Sin tarea') AS tarea,
        ISNULL(p.nombre, 'General') AS proyecto,
        u.nombre AS usuario,
        b.motivo,
        DATEDIFF(DAY, b.fechaCreacion, GETDATE()) AS dias
    FROM dbo.p_Bloqueos b
    LEFT JOIN dbo.p_Tareas t ON b.idTarea = t.idTarea
    LEFT JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN dbo.p_Usuarios u ON b.idUsuario = u.idUsuario
    WHERE b.idUsuario IN (
            SELECT TRY_CAST(value AS INT)
            FROM STRING_SPLIT(@idsStr, ',')
            WHERE TRY_CAST(value AS INT) IS NOT NULL
      )
      AND b.estado = 'Activo'
    ORDER BY b.fechaCreacion DESC;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_StatsCompliance_rust') DROP PROCEDURE dbo.sp_Planning_StatsCompliance_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_StatsCompliance_rust
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        estado,
        COUNT(*) AS count,
        AVG(CAST(IIF(ISNULL(objetivos, '') <> '', 1, 0) AS FLOAT)) * 100.0 AS hasGoalsPercent
    FROM dbo.p_PlanesTrabajo
    WHERE mes = @mes
      AND anio = @anio
    GROUP BY estado;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Planning_ObtenerPlanDetalle_rust') DROP PROCEDURE dbo.sp_Planning_ObtenerPlanDetalle_rust;
GO
CREATE PROCEDURE dbo.sp_Planning_ObtenerPlanDetalle_rust
    @idPlan INT = 0,
    @carnet NVARCHAR(50) = NULL,
    @mes INT = NULL,
    @anio INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @idPlan = 0 AND @carnet IS NOT NULL
    BEGIN
        SELECT @idPlan = idPlan
        FROM dbo.p_PlanesTrabajo
        WHERE carnet = @carnet
          AND mes = @mes
          AND anio = @anio;
    END

    SELECT
        p.*,
        u.nombre AS usuarioNombre
    FROM dbo.p_PlanesTrabajo p
    LEFT JOIN dbo.p_Usuarios u ON p.carnet = u.carnet
    WHERE p.idPlan = @idPlan;

    SELECT
        t.*,
        t.nombre AS titulo,
        t.porcentaje AS progreso,
        pr.nombre AS proyectoNombre,
        pr.tipo AS proyectoTipo
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos pr ON t.idProyecto = pr.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.orden ASC, t.semana ASC, t.idTarea ASC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Recurrencia_Crear_rust
    @idTarea INT,
    @tipoRecurrencia NVARCHAR(20),
    @diasSemana NVARCHAR(50) = NULL,
    @diaMes INT = NULL,
    @fechaInicioVigencia DATE,
    @fechaFinVigencia DATE = NULL,
    @idCreador INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.p_TareaRecurrencia (
        idTarea,
        tipoRecurrencia,
        diasSemana,
        diaMes,
        fechaInicioVigencia,
        fechaFinVigencia,
        activo,
        idCreador
    )
    VALUES (
        @idTarea,
        @tipoRecurrencia,
        @diasSemana,
        @diaMes,
        @fechaInicioVigencia,
        @fechaFinVigencia,
        1,
        @idCreador
    );

    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Recurrencia_ObtenerPorTarea_rust
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.p_TareaRecurrencia
    WHERE idTarea = @idTarea
      AND activo = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Instancia_Upsert_rust
    @idTarea INT,
    @idRecurrencia INT = NULL,
    @fechaProgramada DATE,
    @estadoInstancia NVARCHAR(20),
    @comentario NVARCHAR(MAX) = NULL,
    @idUsuarioEjecutor INT = NULL,
    @fechaReprogramada DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.p_TareaInstancia
        WHERE idTarea = @idTarea
          AND fechaProgramada = @fechaProgramada
    )
    BEGIN
        UPDATE dbo.p_TareaInstancia
        SET estadoInstancia = @estadoInstancia,
            comentario = @comentario,
            fechaEjecucion = CASE
                WHEN @estadoInstancia IN ('HECHA', 'OMITIDA') THEN GETDATE()
                ELSE fechaEjecucion
            END,
            fechaReprogramada = @fechaReprogramada,
            idUsuarioEjecutor = @idUsuarioEjecutor
        WHERE idTarea = @idTarea
          AND fechaProgramada = @fechaProgramada;

        SELECT id
        FROM dbo.p_TareaInstancia
        WHERE idTarea = @idTarea
          AND fechaProgramada = @fechaProgramada;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.p_TareaInstancia (
            idTarea,
            idRecurrencia,
            fechaProgramada,
            estadoInstancia,
            comentario,
            idUsuarioEjecutor,
            fechaEjecucion,
            fechaReprogramada
        )
        VALUES (
            @idTarea,
            @idRecurrencia,
            @fechaProgramada,
            @estadoInstancia,
            @comentario,
            @idUsuarioEjecutor,
            CASE
                WHEN @estadoInstancia IN ('HECHA', 'OMITIDA') THEN GETDATE()
                ELSE NULL
            END,
            @fechaReprogramada
        );

        SELECT SCOPE_IDENTITY() AS id;
    END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tarea_CreacionMasiva_rust
    @idUsuariosCSV NVARCHAR(MAX),
    @titulo NVARCHAR(200),
    @descripcion NVARCHAR(MAX),
    @idProyecto INT,
    @prioridad NVARCHAR(50),
    @esfuerzo NVARCHAR(10),
    @tipo NVARCHAR(50),
    @idCreador INT,
    @fechaInicio DATETIME,
    @fechaObjetivo DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @idTareaNew INT;
        DECLARE @idU INT;

        DECLARE user_cursor CURSOR FOR
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@idUsuariosCSV, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL;

        OPEN user_cursor;
        FETCH NEXT FROM user_cursor INTO @idU;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            INSERT INTO dbo.p_Tareas (
                nombre,
                descripcion,
                idProyecto,
                prioridad,
                esfuerzo,
                tipo,
                idCreador,
                fechaCreacion,
                fechaInicioPlanificada,
                fechaObjetivo,
                estado
            )
            VALUES (
                @titulo,
                @descripcion,
                @idProyecto,
                @prioridad,
                @esfuerzo,
                @tipo,
                @idCreador,
                GETDATE(),
                @fechaInicio,
                @fechaObjetivo,
                'Pendiente'
            );

            SET @idTareaNew = SCOPE_IDENTITY();

            DECLARE @carnet NVARCHAR(50);
            SELECT @carnet = carnet
            FROM dbo.p_Usuarios
            WHERE idUsuario = @idU;

            INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, carnet)
            VALUES (@idTareaNew, @idU, @carnet);

            FETCH NEXT FROM user_cursor INTO @idU;
        END

        CLOSE user_cursor;
        DEALLOCATE user_cursor;

        COMMIT TRANSACTION;

        SELECT 1 AS success;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('global', 'user_cursor') >= -1
        BEGIN
            CLOSE user_cursor;
            DEALLOCATE user_cursor;
        END

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tarea_Revalidar_rust
    @idTarea INT,
    @accion NVARCHAR(50),
    @idUsuarioOtro INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @nuevoEstado NVARCHAR(50) = NULL;
    DECLARE @porcentaje FLOAT = NULL;
    DECLARE @fechaObjetivoHoy BIT = 0;

    IF @accion = 'Sigue'
        SET @fechaObjetivoHoy = 1;
    ELSE IF @accion = 'HechaPorOtro'
    BEGIN
        SET @nuevoEstado = 'Hecha';
        SET @porcentaje = 100.0;
    END
    ELSE IF @accion = 'NoAplica'
        SET @nuevoEstado = 'Descartada';
    ELSE IF @accion = 'Reasignar' AND @idUsuarioOtro IS NOT NULL
    BEGIN
        DELETE FROM dbo.p_TareaAsignados
        WHERE idTarea = @idTarea
          AND tipo = 'Responsable';

        INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, carnet)
        SELECT @idTarea, idUsuario, 'Responsable', carnet
        FROM dbo.p_Usuarios
        WHERE idUsuario = @idUsuarioOtro;
    END

    IF @nuevoEstado IS NOT NULL
    BEGIN
        UPDATE dbo.p_Tareas
        SET estado = @nuevoEstado,
            porcentaje = @porcentaje
        WHERE idTarea = @idTarea;
    END
    ELSE IF @fechaObjetivoHoy = 1
    BEGIN
        UPDATE dbo.p_Tareas
        SET fechaObjetivo = GETDATE()
        WHERE idTarea = @idTarea;
    END

    SELECT ISNULL(@nuevoEstado, 'Mismo') AS nuevoEstado;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tarea_UpsertRecordatorio_rust
    @idTarea INT,
    @idUsuario INT,
    @fechaHoraRecordatorio DATETIME,
    @nota NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idRecordatorio INT;

    SELECT TOP 1
        @idRecordatorio = idRecordatorio
    FROM dbo.p_TareaRecordatorios
    WHERE idTarea = @idTarea
      AND idUsuario = @idUsuario
      AND ISNULL(enviado, 0) = 0
    ORDER BY idRecordatorio DESC;

    IF @idRecordatorio IS NOT NULL
    BEGIN
        UPDATE dbo.p_TareaRecordatorios
        SET fechaHoraRecordatorio = @fechaHoraRecordatorio,
            nota = @nota,
            enviado = 0
        WHERE idRecordatorio = @idRecordatorio;

        SELECT @idRecordatorio AS id;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.p_TareaRecordatorios (
            idTarea,
            idUsuario,
            fechaHoraRecordatorio,
            nota
        )
        OUTPUT INSERTED.idRecordatorio AS id
        VALUES (
            @idTarea,
            @idUsuario,
            @fechaHoraRecordatorio,
            @nota
        );
    END
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Tareas_Reasignar_PorCarnet_rust
    @taskIdsCsv NVARCHAR(MAX),
    @toCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idDestino INT;

    SELECT @idDestino = idUsuario
    FROM dbo.p_Usuarios
    WHERE carnet = @toCarnet;

    IF @idDestino IS NULL
        RETURN;

    DELETE FROM dbo.p_TareaAsignados
    WHERE idTarea IN (
        SELECT TRY_CAST(value AS INT)
        FROM STRING_SPLIT(@taskIdsCsv, ',')
        WHERE TRY_CAST(value AS INT) IS NOT NULL
    )
      AND tipo = 'Responsable';

    INSERT INTO dbo.p_TareaAsignados (
        idTarea,
        idUsuario,
        carnet,
        tipo,
        fechaAsignacion
    )
    SELECT
        TRY_CAST(value AS INT),
        @idDestino,
        @toCarnet,
        'Responsable',
        GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',')
    WHERE TRY_CAST(value AS INT) IS NOT NULL;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marcaje_Admin_ObtenerDevices_rust
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 200
        d.*,
        u.nombreCompleto AS colaborador_nombre
    FROM marcaje_devices d
    LEFT JOIN p_Usuarios u ON u.carnet = d.carnet
    ORDER BY d.last_login DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marcaje_Admin_ObtenerConfigResumen_rust
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 100
        u.carnet AS Carnet,
        u.nombreCompleto AS Colaborador,
        (
            SELECT COUNT(*)
            FROM marcaje_asistencias
            WHERE carnet = u.carnet
        ) AS total_marcajes
    FROM p_Usuarios u
    WHERE EXISTS (
        SELECT 1
        FROM marcaje_asistencias
        WHERE carnet = u.carnet
    )
    ORDER BY u.nombreCompleto;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marcaje_Admin_GestionGeocerca_rust
    @accion NVARCHAR(20),
    @carnet NVARCHAR(50) = NULL,
    @id_site INT = NULL,
    @id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Marcaje_Admin_GestionGeocerca
        @accion = @accion,
        @carnet = @carnet,
        @id_site = @id_site,
        @id = @id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Marcaje_Admin_GestionIp_rust
    @accion NVARCHAR(20),
    @id INT = NULL,
    @nombre NVARCHAR(100) = NULL,
    @ip NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Marcaje_Admin_GestionIp
        @accion = @accion,
        @id = @id,
        @nombre = @nombre,
        @ip = @ip;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Visita_ObtenerClientes_rust
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM vc_clientes
    WHERE activo = 1
    ORDER BY nombre;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Visita_ObtenerStats_rust
    @fecha NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fecha_real DATE = TRY_CAST(@fecha AS DATE);
    SET @fecha_real = ISNULL(@fecha_real, CAST(GETDATE() AS DATE));

    SELECT
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha_real) AS visitas_hoy,
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha_real AND estado = 'FINALIZADA') AS completadas_hoy,
        (SELECT COUNT(*) FROM vc_clientes WHERE activo = 1) AS clientes_activos,
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha_real AND valido_inicio = 0) AS alertas_fuera_zona;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Visita_ObtenerListado_rust
    @top INT = 500,
    @fecha NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @fecha_real DATE = TRY_CAST(@fecha AS DATE);

    SELECT TOP (@top)
        v.*,
        c.nombre AS cliente_nombre,
        c.codigo AS cliente_codigo,
        c.zona
    FROM vc_visitas v
    LEFT JOIN vc_clientes c ON c.id = v.cliente_id
    WHERE @fecha_real IS NULL
       OR CAST(v.timestamp_inicio AS DATE) = @fecha_real
    ORDER BY v.timestamp_inicio DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Visita_ObtenerMetas_rust
    @carnet NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        m.*,
        u.nombreCompleto AS nombre_empleado
    FROM vc_metas m
    LEFT JOIN p_Usuarios u ON u.carnet = m.carnet
    WHERE m.activo = 1
      AND (@carnet IS NULL OR m.carnet = @carnet)
    ORDER BY m.carnet;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_campo_recorrido_activo_rust
    @carnet NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_recorrido_activo @carnet = @carnet;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_campo_recorrido_puntos_rust
    @id_recorrido INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_recorrido_puntos @id_recorrido = @id_recorrido;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_campo_recorrido_historial_rust
    @carnet NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_recorrido_historial @carnet = @carnet;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_campo_admin_recorridos_rust
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    SELECT
        r.*,
        u.nombreCompleto AS nombre_colaborador,
        (
            SELECT COUNT(*)
            FROM campo_recorrido_puntos
            WHERE id_recorrido = r.id_recorrido
        ) AS total_puntos
    FROM campo_recorridos r
    LEFT JOIN p_Usuarios u ON u.carnet = r.carnet
    WHERE r.fecha = @fecha
    ORDER BY r.hora_inicio DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_checkout_rust
    @visita_id INT,
    @carnet VARCHAR(20),
    @lat DECIMAL(10,7) = NULL,
    @lon DECIMAL(10,7) = NULL,
    @accuracy DECIMAL(10,2) = NULL,
    @timestamp DATETIME2 = NULL,
    @observacion NVARCHAR(MAX) = NULL,
    @foto_path NVARCHAR(500) = NULL,
    @firma_path NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_checkout
        @visita_id = @visita_id,
        @carnet = @carnet,
        @lat = @lat,
        @lon = @lon,
        @accuracy = @accuracy,
        @timestamp = @timestamp,
        @observacion = @observacion,
        @foto_path = @foto_path,
        @firma_path = @firma_path;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_usuarios_con_tracking_rust
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_usuarios_con_tracking;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_crear_rust
    @codigo VARCHAR(50),
    @nombre NVARCHAR(200),
    @direccion NVARCHAR(500) = NULL,
    @telefono VARCHAR(20) = NULL,
    @contacto NVARCHAR(100) = NULL,
    @lat DECIMAL(10,7) = NULL,
    @long DECIMAL(10,7) = NULL,
    @radio_metros INT = 100,
    @zona NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_cliente_crear
        @codigo = @codigo,
        @nombre = @nombre,
        @direccion = @direccion,
        @telefono = @telefono,
        @contacto = @contacto,
        @lat = @lat,
        @long = @long,
        @radio_metros = @radio_metros,
        @zona = @zona;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_actualizar_rust
    @id INT,
    @codigo VARCHAR(50),
    @nombre NVARCHAR(200),
    @direccion NVARCHAR(500) = NULL,
    @telefono VARCHAR(20) = NULL,
    @contacto NVARCHAR(100) = NULL,
    @lat DECIMAL(10,7) = NULL,
    @long DECIMAL(10,7) = NULL,
    @radio_metros INT = 100,
    @zona NVARCHAR(100) = NULL,
    @activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_cliente_actualizar
        @id = @id,
        @codigo = @codigo,
        @nombre = @nombre,
        @direccion = @direccion,
        @telefono = @telefono,
        @contacto = @contacto,
        @lat = @lat,
        @long = @long,
        @radio_metros = @radio_metros,
        @zona = @zona,
        @activo = @activo;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_eliminar_rust
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_cliente_eliminar @id = @id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_crear_rust
    @carnet VARCHAR(20),
    @cliente_id INT,
    @fecha DATE,
    @orden INT = 0,
    @notas NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_agenda_crear
        @carnet = @carnet,
        @cliente_id = @cliente_id,
        @fecha = @fecha,
        @orden = @orden,
        @notas = @notas;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_reordenar_rust
    @agenda_id INT,
    @nuevo_orden INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_agenda_reordenar
        @agenda_id = @agenda_id,
        @nuevo_orden = @nuevo_orden;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_eliminar_rust
    @agenda_id INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_agenda_eliminar @agenda_id = @agenda_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_meta_set_rust
    @carnet VARCHAR(20),
    @meta_visitas INT = 10,
    @costo_km DECIMAL(10,4) = 0.15,
    @vigente_desde DATE = NULL,
    @vigente_hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_meta_set
        @carnet = @carnet,
        @meta_visitas = @meta_visitas,
        @costo_km = @costo_km,
        @vigente_desde = @vigente_desde,
        @vigente_hasta = @vigente_hasta;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_Eliminar_rust
    @id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_DelegacionVisibilidad_Desactivar @id = @id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_Admin_Usuarios_Importar_rust
    @nombre NVARCHAR(200),
    @correo NVARCHAR(200),
    @carnet NVARCHAR(50) = NULL,
    @cargo NVARCHAR(200) = NULL,
    @idOrg INT = NULL,
    @idJefe INT = NULL,
    @idRol INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    DECLARE @jefeCarnet NVARCHAR(50) = NULL;
    DECLARE @rolNombre NVARCHAR(100) = NULL;
    DECLARE @rolGlobal NVARCHAR(50) = NULL;
    DECLARE @accion NVARCHAR(10) = 'UPDATE';

    IF @idJefe IS NOT NULL
    BEGIN
        SELECT @jefeCarnet = carnet
        FROM dbo.p_Usuarios
        WHERE idUsuario = @idJefe;
    END

    IF @idRol IS NOT NULL
    BEGIN
        SELECT @rolNombre = nombre
        FROM dbo.p_Roles
        WHERE idRol = @idRol;

        SET @rolGlobal = CASE
            WHEN @rolNombre IN ('Admin', 'Administrador', 'SuperAdmin') THEN 'Admin'
            ELSE 'User'
        END;
    END

    SELECT TOP 1
        @idUsuario = idUsuario
    FROM dbo.p_Usuarios
    WHERE (LTRIM(RTRIM(correo)) = LTRIM(RTRIM(@correo)))
       OR (@carnet IS NOT NULL AND LTRIM(RTRIM(ISNULL(carnet, ''))) = LTRIM(RTRIM(@carnet)));

    IF @idUsuario IS NULL
    BEGIN
        SET @accion = 'INSERT';

        INSERT INTO dbo.p_Usuarios (
            nombre,
            correo,
            carnet,
            cargo,
            idOrg,
            idRol,
            rolGlobal,
            jefeCarnet,
            activo,
            pais,
            fechaCreacion,
            fechaActualizacion,
            eliminado
        )
        VALUES (
            @nombre,
            @correo,
            @carnet,
            @cargo,
            CAST(@idOrg AS NVARCHAR(50)),
            @idRol,
            @rolGlobal,
            @jefeCarnet,
            1,
            'NI',
            GETDATE(),
            GETDATE(),
            0
        );

        SET @idUsuario = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.p_Usuarios
        SET nombre = @nombre,
            correo = @correo,
            carnet = COALESCE(@carnet, carnet),
            cargo = COALESCE(@cargo, cargo),
            idOrg = COALESCE(CAST(@idOrg AS NVARCHAR(50)), idOrg),
            idRol = COALESCE(@idRol, idRol),
            rolGlobal = COALESCE(@rolGlobal, rolGlobal),
            jefeCarnet = COALESCE(@jefeCarnet, jefeCarnet),
            activo = 1,
            eliminado = 0,
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario;
    END

    IF @idUsuario IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM dbo.p_UsuariosCredenciales WHERE idUsuario = @idUsuario)
    BEGIN
        INSERT INTO dbo.p_UsuariosCredenciales (idUsuario, passwordHash)
        VALUES (@idUsuario, '');
    END

    IF @idUsuario IS NOT NULL AND @idOrg IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM dbo.p_UsuariosOrganizacion
            WHERE idUsuario = @idUsuario
              AND idNodo = @idOrg
       )
    BEGIN
        INSERT INTO dbo.p_UsuariosOrganizacion (idUsuario, idNodo, esResponsable)
        VALUES (@idUsuario, @idOrg, 0);
    END

    SELECT
        @idUsuario AS idUsuario,
        @accion AS accion;
END;
GO
