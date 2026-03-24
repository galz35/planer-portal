-- ============================================================
-- STORED PROCEDURES ADMIN: MÓDULO MARCAJE WEB
-- Monitor, Resolver solicitudes, Reiniciar, Reportes, Dashboard
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SP 1: sp_marcaje_monitor_dia
-- Ver todos los marcajes del día con nombre del empleado
-- Para la pantalla de "Monitor en Tiempo Real"
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_monitor_dia
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Result Set 1: Marcajes del día
    SELECT
        a.id,
        a.carnet,
        c.Colaborador AS nombre_empleado,
        a.tipo_marcaje,
        a.tipo_device,
        a.fecha,
        a.estado,
        a.motivo,
        a.lat,
        a.long,
        a.accuracy,
        a.ip,
        a.device_uuid,
        a.offline_id,
        CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END AS tiene_warn
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE a.fecha >= @inicio
      AND a.fecha < @fin
      AND a.estado = 'ACEPTADA'
    ORDER BY a.fecha DESC;
END;
GO

-- ============================================================
-- SP 2: sp_marcaje_dashboard_kpis
-- KPIs agregados del día para el panel admin
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_dashboard_kpis
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Conteos
    DECLARE @total_marcajes INT = 0;
    DECLARE @total_entradas INT = 0;
    DECLARE @total_salidas INT = 0;
    DECLARE @empleados_marcaron INT = 0;
    DECLARE @total_warnings INT = 0;
    DECLARE @total_fuera_zona INT = 0;

    SELECT
        @total_marcajes = COUNT(*),
        @total_entradas = SUM(CASE WHEN tipo_marcaje = 'ENTRADA' THEN 1 ELSE 0 END),
        @total_salidas = SUM(CASE WHEN tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END),
        @empleados_marcaron = COUNT(DISTINCT carnet),
        @total_warnings = SUM(CASE WHEN motivo IS NOT NULL THEN 1 ELSE 0 END),
        @total_fuera_zona = SUM(CASE WHEN motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END)
    FROM marcaje_asistencias
    WHERE fecha >= @inicio AND fecha < @fin
      AND estado = 'ACEPTADA';

    -- Empleados con turno abierto (último marcaje fue ENTRADA sin SALIDA posterior)
    DECLARE @turnos_abiertos INT = 0;

    ;WITH ultimo_por_empleado AS (
        SELECT carnet, tipo_marcaje, fecha,
               ROW_NUMBER() OVER (PARTITION BY carnet ORDER BY fecha DESC) AS rn
        FROM marcaje_asistencias
        WHERE estado = 'ACEPTADA'
    )
    SELECT @turnos_abiertos = COUNT(*)
    FROM ultimo_por_empleado
    WHERE rn = 1 AND tipo_marcaje = 'ENTRADA';

    -- Stale shifts (> 20 horas sin salida)
    DECLARE @stale_shifts INT = 0;

    ;WITH ultimo_entrada AS (
        SELECT carnet, tipo_marcaje, fecha,
               ROW_NUMBER() OVER (PARTITION BY carnet ORDER BY fecha DESC) AS rn
        FROM marcaje_asistencias
        WHERE estado = 'ACEPTADA'
    )
    SELECT @stale_shifts = COUNT(*)
    FROM ultimo_entrada
    WHERE rn = 1
      AND tipo_marcaje = 'ENTRADA'
      AND DATEDIFF(HOUR, fecha, GETDATE()) > 20;

    -- Solicitudes pendientes
    DECLARE @solicitudes_pendientes INT = 0;
    SELECT @solicitudes_pendientes = COUNT(*)
    FROM marcaje_solicitudes
    WHERE estado = 'PENDIENTE';

    SELECT
        @fecha AS fecha,
        @total_marcajes AS total_marcajes,
        @total_entradas AS total_entradas,
        @total_salidas AS total_salidas,
        @empleados_marcaron AS empleados_marcaron,
        @total_warnings AS total_warnings,
        @total_fuera_zona AS total_fuera_zona,
        @turnos_abiertos AS turnos_abiertos,
        @stale_shifts AS stale_shifts,
        @solicitudes_pendientes AS solicitudes_pendientes;
END;
GO

-- ============================================================
-- SP 3: sp_marcaje_resolver_solicitud
-- Admin aprueba o rechaza una solicitud de corrección
-- Si aprobada + tipo ELIMINAR_SALIDA → elimina el marcaje
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_resolver_solicitud
    @solicitud_id     INT,
    @accion           VARCHAR(20),       -- 'APROBADA' | 'RECHAZADA'
    @admin_comentario NVARCHAR(500) = NULL,
    @admin_carnet     VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que la solicitud existe y está pendiente
    DECLARE @estado_actual VARCHAR(20);
    DECLARE @tipo_solicitud VARCHAR(50);
    DECLARE @asistencia_id INT;

    SELECT @estado_actual = estado,
           @tipo_solicitud = tipo_solicitud,
           @asistencia_id = asistencia_id
    FROM marcaje_solicitudes
    WHERE id = @solicitud_id;

    IF @estado_actual IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Solicitud no encontrada' AS mensaje;
        RETURN;
    END

    IF @estado_actual <> 'PENDIENTE'
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('La solicitud ya fue resuelta: ', @estado_actual) AS mensaje;
        RETURN;
    END

    -- Actualizar solicitud
    UPDATE marcaje_solicitudes
    SET estado = @accion,
        admin_comentario = @admin_comentario,
        resuelto_en = GETDATE()
    WHERE id = @solicitud_id;

    -- Si fue APROBADA y tipo = ELIMINAR_SALIDA, eliminar el marcaje referenciado
    IF @accion = 'APROBADA' AND @tipo_solicitud = 'ELIMINAR_SALIDA' AND @asistencia_id IS NOT NULL
    BEGIN
        DELETE FROM marcaje_asistencias WHERE id = @asistencia_id;
    END

    -- Retornar resultado
    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Solicitud ', @accion, ' correctamente') AS mensaje,
           @solicitud_id AS solicitud_id,
           @accion AS accion,
           @admin_carnet AS resuelta_por;
END;
GO

-- ============================================================
-- SP 4: sp_marcaje_admin_eliminar
-- Admin elimina un marcaje específico
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_admin_eliminar
    @asistencia_id INT,
    @admin_carnet  VARCHAR(20),
    @motivo        NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que existe
    IF NOT EXISTS (SELECT 1 FROM marcaje_asistencias WHERE id = @asistencia_id)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Marcaje no encontrado' AS mensaje;
        RETURN;
    END

    -- Obtener info antes de borrar (para log)
    DECLARE @carnet_borrado VARCHAR(20);
    DECLARE @tipo_borrado VARCHAR(30);
    DECLARE @fecha_borrada DATETIME2;

    SELECT @carnet_borrado = carnet,
           @tipo_borrado = tipo_marcaje,
           @fecha_borrada = fecha
    FROM marcaje_asistencias WHERE id = @asistencia_id;

    -- Eliminar
    DELETE FROM marcaje_asistencias WHERE id = @asistencia_id;

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Marcaje eliminado: ', @tipo_borrado, ' de ', @carnet_borrado,
                  ' del ', CONVERT(VARCHAR(19), @fecha_borrada, 120)) AS mensaje,
           @asistencia_id AS id_eliminado,
           @admin_carnet AS eliminado_por;
END;
GO

-- ============================================================
-- SP 5: sp_marcaje_admin_reiniciar
-- Forzar cierre de turno abierto para un empleado
-- Inserta una SALIDA forzada con motivo administrativo
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_admin_reiniciar
    @carnet       VARCHAR(20),
    @admin_carnet VARCHAR(20),
    @motivo       NVARCHAR(500) = 'Reinicio administrativo por error del empleado'
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que tiene turno abierto
    DECLARE @ultimo_tipo VARCHAR(30);
    DECLARE @ultima_fecha DATETIME2;

    SELECT TOP 1 @ultimo_tipo = tipo_marcaje, @ultima_fecha = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    IF @ultimo_tipo IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'No se encontraron marcajes para este empleado' AS mensaje;
        RETURN;
    END

    IF @ultimo_tipo NOT IN ('ENTRADA', 'INICIO_EXTRA', 'INICIO_COMPENSADA')
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('El empleado no tiene turno abierto. Último tipo: ', @ultimo_tipo) AS mensaje;
        RETURN;
    END

    -- Determinar tipo de salida según tipo de entrada
    DECLARE @tipo_salida VARCHAR(30) = CASE
        WHEN @ultimo_tipo = 'ENTRADA' THEN 'SALIDA'
        WHEN @ultimo_tipo = 'INICIO_EXTRA' THEN 'FIN_EXTRA'
        WHEN @ultimo_tipo = 'INICIO_COMPENSADA' THEN 'FIN_COMPENSADA'
        ELSE 'SALIDA'
    END;

    -- Insertar SALIDA forzada
    INSERT INTO marcaje_asistencias (
        carnet, tipo_marcaje, tipo_device, fecha, estado, motivo
    )
    VALUES (
        @carnet,
        @tipo_salida,
        'DESKTOP',
        GETDATE(),
        'ACEPTADA',
        CONCAT('ADMIN_RESET: ', @motivo, ' (por admin ', @admin_carnet, ')')
    );

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Estado reiniciado. Se registró ', @tipo_salida, ' forzada.') AS mensaje,
           SCOPE_IDENTITY() AS nuevo_id,
           @tipo_salida AS tipo_insertado,
           @admin_carnet AS reiniciado_por;
END;
GO

-- ============================================================
-- SP 6: sp_marcaje_reporte_asistencia
-- Reporte consolidado de asistencia por rango de fechas
-- Pivot: primera entrada, última salida, horas por día/empleado
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_reporte_asistencia
    @fecha_inicio DATE,
    @fecha_fin    DATE,
    @carnet       VARCHAR(20) = NULL  -- NULL = todos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Carnet AS carnet,
        c.Colaborador AS nombre_empleado,
        CAST(a.fecha AS DATE) AS dia,
        MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END) AS primera_entrada,
        MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END) AS ultima_salida,
        DATEDIFF(MINUTE,
            MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END),
            MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END)
        ) AS minutos_jornada,
        SUM(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN 1 ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END) AS total_salidas,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_EXTRA' THEN 1 ELSE 0 END) AS sesiones_extra,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_COMPENSADA' THEN 1 ELSE 0 END) AS sesiones_compensada,
        SUM(CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END) AS total_warnings,
        SUM(CASE WHEN a.motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END) AS fuera_geofence,
        COUNT(*) AS total_marcajes
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE CAST(a.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
      AND a.estado = 'ACEPTADA'
      AND (@carnet IS NULL OR a.carnet = @carnet)
    GROUP BY c.Carnet, c.Colaborador, CAST(a.fecha AS DATE)
    ORDER BY dia DESC, c.Colaborador;
END;
GO

-- ============================================================
-- SP 7: sp_marcaje_admin_crud_site
-- CRUD genérico para marcaje_sites
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_admin_crud_site
    @accion       VARCHAR(20),   -- 'CREAR' | 'EDITAR' | 'ELIMINAR'
    @id           INT = NULL,
    @nombre       NVARCHAR(200) = NULL,
    @lat          DECIMAL(10,7) = NULL,
    @lon          DECIMAL(10,7) = NULL,
    @radio_metros INT = 200,
    @accuracy_max INT = 100,
    @activo       BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @accion = 'CREAR'
    BEGIN
        INSERT INTO marcaje_sites (nombre, lat, long, radio_metros, accuracy_max, activo)
        VALUES (@nombre, @lat, @lon, @radio_metros, @accuracy_max, @activo);

        SELECT CAST(1 AS BIT) AS ok, 'Site creado' AS mensaje, SCOPE_IDENTITY() AS id;
    END
    ELSE IF @accion = 'EDITAR'
    BEGIN
        UPDATE marcaje_sites
        SET nombre = ISNULL(@nombre, nombre),
            lat = ISNULL(@lat, lat),
            long = ISNULL(@lon, long),
            radio_metros = ISNULL(@radio_metros, radio_metros),
            accuracy_max = ISNULL(@accuracy_max, accuracy_max),
            activo = @activo
        WHERE id = @id;

        SELECT CAST(1 AS BIT) AS ok, 'Site actualizado' AS mensaje, @id AS id;
    END
    ELSE IF @accion = 'ELIMINAR'
    BEGIN
        DELETE FROM marcaje_sites WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'Site eliminado' AS mensaje, @id AS id;
    END
END;
GO

-- ============================================================
-- SP 8: sp_marcaje_admin_crud_ip
-- CRUD para marcaje_ip_whitelist
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_admin_crud_ip
    @accion  VARCHAR(20),   -- 'CREAR' | 'ELIMINAR'
    @id      INT = NULL,
    @nombre  NVARCHAR(200) = NULL,
    @cidr    VARCHAR(50) = NULL,
    @activo  BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @accion = 'CREAR'
    BEGIN
        INSERT INTO marcaje_ip_whitelist (nombre, cidr, activo)
        VALUES (@nombre, @cidr, @activo);

        SELECT CAST(1 AS BIT) AS ok, 'IP agregada' AS mensaje, SCOPE_IDENTITY() AS id;
    END
    ELSE IF @accion = 'ELIMINAR'
    BEGIN
        DELETE FROM marcaje_ip_whitelist WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'IP eliminada' AS mensaje, @id AS id;
    END
END;
GO

-- ============================================================
-- SP 9: sp_marcaje_admin_device
-- Aprobar o bloquear dispositivo
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_admin_device
    @uuid   VARCHAR(100),
    @estado VARCHAR(20)    -- 'ACTIVE' | 'BLOCKED'
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE marcaje_devices
    SET estado = @estado,
        fecha_activacion = CASE WHEN @estado = 'ACTIVE' THEN GETDATE() ELSE fecha_activacion END
    WHERE uuid = @uuid;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Dispositivo no encontrado' AS mensaje;
        RETURN;
    END

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Dispositivo ', @estado) AS mensaje,
           @uuid AS uuid;
END;
GO

PRINT '✅ Stored Procedures ADMIN de MARCAJE creados exitosamente';
GO
