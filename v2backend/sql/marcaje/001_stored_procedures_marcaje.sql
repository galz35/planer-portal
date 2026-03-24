-- ============================================================
-- STORED PROCEDURES: MÓDULO MARCAJE WEB
-- Dependencia: fn_haversine_metros
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SP 1: sp_marcaje_registrar
-- Registra un marcaje (entrada/salida/extras/compensada)
-- REGLA DE ORO: NUNCA rechazar. Si hay irregularidad → WARN en motivo.
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_registrar
    @carnet          VARCHAR(20),
    @tipo_marcaje    VARCHAR(30),      -- ENTRADA | SALIDA | INICIO_EXTRA | FIN_EXTRA | INICIO_COMPENSADA | FIN_COMPENSADA
    @tipo_device     VARCHAR(20),      -- MOBILE | DESKTOP
    @lat             DECIMAL(10,7) = NULL,
    @lon             DECIMAL(10,7) = NULL,
    @accuracy        DECIMAL(10,2) = NULL,
    @ip              VARCHAR(50) = NULL,
    @user_agent      NVARCHAR(500) = NULL,
    @device_uuid     VARCHAR(100) = NULL,
    @timestamp_marca DATETIME2 = NULL,
    @offline_id      VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp_marca, GETDATE());
    DECLARE @motivo NVARCHAR(500) = NULL;
    DECLARE @estado VARCHAR(20) = 'ACEPTADA';

    -- ========================================
    -- 1. IDEMPOTENCIA: Si ya existe este offline_id, retornar el existente
    -- ========================================
    IF @offline_id IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM marcaje_asistencias WHERE offline_id = @offline_id)
        BEGIN
            SELECT * FROM marcaje_asistencias WHERE offline_id = @offline_id;
            RETURN;
        END
    END

    -- ========================================
    -- 2. ANTI-SPAM: últimos 60 segundos
    -- ========================================
    DECLARE @ultimo_marcaje DATETIME2;
    SELECT TOP 1 @ultimo_marcaje = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    IF @ultimo_marcaje IS NOT NULL AND DATEDIFF(SECOND, @ultimo_marcaje, @ahora) < 60
    BEGIN
        -- NO rechazar, registrar con WARN
        SET @motivo = CONCAT('WARN: Anti-spam activo (', DATEDIFF(SECOND, @ultimo_marcaje, @ahora), 's desde último marcaje)');
    END

    -- ========================================
    -- 3. VALIDAR PERMISOS DE DISPOSITIVO
    -- ========================================
    DECLARE @permitir_movil BIT = 1;
    DECLARE @permitir_escritorio BIT = 1;

    SELECT @permitir_movil = permitir_movil,
           @permitir_escritorio = permitir_escritorio
    FROM marcaje_config_usuario
    WHERE carnet = @carnet AND activo = 1;

    IF @tipo_device = 'MOBILE' AND @permitir_movil = 0
    BEGIN
        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje móvil no autorizado para este usuario';
    END

    IF @tipo_device = 'DESKTOP' AND @permitir_escritorio = 0
    BEGIN
        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje escritorio no autorizado para este usuario';
    END

    -- ========================================
    -- 4. VALIDACIÓN GEOFENCE (solo si tiene GPS)
    -- ========================================
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        DECLARE @min_distancia FLOAT = NULL;
        DECLARE @zona_cercana NVARCHAR(200) = NULL;

        SELECT TOP 1
            @min_distancia = dbo.fn_haversine_metros(@lat, @lon, lat, long),
            @zona_cercana = nombre
        FROM marcaje_sites
        WHERE activo = 1
        ORDER BY dbo.fn_haversine_metros(@lat, @lon, lat, long) ASC;

        -- Verificar si está dentro de alguna zona
        IF @min_distancia IS NOT NULL
        BEGIN
            DECLARE @dentro_zona BIT = 0;

            IF EXISTS (
                SELECT 1 FROM marcaje_sites
                WHERE activo = 1
                  AND dbo.fn_haversine_metros(@lat, @lon, lat, long) <= radio_metros
                  AND (@accuracy IS NULL OR @accuracy <= accuracy_max)
            )
            BEGIN
                SET @dentro_zona = 1;
            END

            IF @dentro_zona = 0
            BEGIN
                SET @motivo = ISNULL(@motivo + ' | ', '') +
                    CONCAT('WARN: Fuera de zona (más cercana: ', @zona_cercana,
                           ' a ', CAST(CAST(@min_distancia AS INT) AS VARCHAR), 'm)');
            END
        END
    END

    -- ========================================
    -- 5. VALIDACIÓN IP WHITELIST (solo DESKTOP)
    -- ========================================
    IF @tipo_device = 'DESKTOP' AND @ip IS NOT NULL
    BEGIN
        DECLARE @hay_whitelist BIT = 0;
        IF EXISTS (SELECT 1 FROM marcaje_ip_whitelist WHERE activo = 1)
            SET @hay_whitelist = 1;

        IF @hay_whitelist = 1
        BEGIN
            -- Validación simplificada: match exacto del primer octeto de CIDR
            -- Para producción usar fn_ip_in_cidr con conversiones binarias
            DECLARE @ip_autorizada BIT = 0;

            IF EXISTS (
                SELECT 1 FROM marcaje_ip_whitelist
                WHERE activo = 1
                  AND @ip LIKE REPLACE(REPLACE(cidr, '.0/8', '.%'), '.0.0/16', '.%')
            )
                SET @ip_autorizada = 1;

            -- Fallback: match exacto
            IF @ip_autorizada = 0 AND EXISTS (
                SELECT 1 FROM marcaje_ip_whitelist
                WHERE activo = 1 AND cidr = @ip
            )
                SET @ip_autorizada = 1;

            IF @ip_autorizada = 0
            BEGIN
                SET @motivo = ISNULL(@motivo + ' | ', '') +
                    CONCAT('WARN: IP no autorizada (', @ip, ')');
            END
        END
    END

    -- ========================================
    -- 6. STALE SHIFT CHECK (> 20 horas sin salida)
    -- ========================================
    IF @tipo_marcaje = 'ENTRADA'
    BEGIN
        DECLARE @ultima_entrada DATETIME2;
        SELECT TOP 1 @ultima_entrada = fecha
        FROM marcaje_asistencias
        WHERE carnet = @carnet
          AND tipo_marcaje = 'ENTRADA'
          AND estado = 'ACEPTADA'
          AND NOT EXISTS (
              SELECT 1 FROM marcaje_asistencias sub
              WHERE sub.carnet = @carnet
                AND sub.tipo_marcaje = 'SALIDA'
                AND sub.estado = 'ACEPTADA'
                AND sub.fecha > marcaje_asistencias.fecha
          )
        ORDER BY fecha DESC;

        IF @ultima_entrada IS NOT NULL AND DATEDIFF(HOUR, @ultima_entrada, @ahora) > 20
        BEGIN
            SET @motivo = ISNULL(@motivo + ' | ', '') +
                CONCAT('WARN: Turno anterior abierto sin salida desde ',
                       CONVERT(VARCHAR(19), @ultima_entrada, 120));
        END
    END

    -- ========================================
    -- 7. INSERTAR MARCAJE
    -- ========================================
    INSERT INTO marcaje_asistencias (
        carnet, lat, long, accuracy, ip, user_agent, device_uuid,
        tipo_device, tipo_marcaje, fecha, estado, motivo, offline_id
    )
    VALUES (
        @carnet, @lat, @lon, @accuracy, @ip, @user_agent, @device_uuid,
        @tipo_device, @tipo_marcaje, @ahora, @estado, @motivo, @offline_id
    );

    -- Retornar el registro insertado
    SELECT * FROM marcaje_asistencias WHERE id = SCOPE_IDENTITY();
END;
GO

-- ============================================================
-- SP 2: sp_marcaje_resumen_diario
-- Retorna el estado completo del día para un empleado
-- Multiple result sets: historial + flags + timestamps
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_resumen_diario
    @carnet VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @inicio_dia DATETIME2 = CAST(@hoy AS DATETIME2);
    DECLARE @fin_dia DATETIME2 = DATEADD(DAY, 1, @inicio_dia);

    -- ========================================
    -- RESULT SET 1: Historial del día
    -- ========================================
    SELECT
        id, carnet, tipo_marcaje, tipo_device, fecha, estado, motivo,
        lat, long, accuracy, ip, device_uuid, offline_id
    FROM marcaje_asistencias
    WHERE carnet = @carnet
      AND fecha >= @inicio_dia
      AND fecha < @fin_dia
      AND estado = 'ACEPTADA'
    ORDER BY fecha ASC;

    -- ========================================
    -- Cálculos de estado
    -- ========================================
    DECLARE @ultimo_tipo VARCHAR(30) = NULL;
    DECLARE @ultima_fecha DATETIME2 = NULL;

    -- Último marcaje global (no solo de hoy, para staleShift de ayer)
    SELECT TOP 1
        @ultimo_tipo = tipo_marcaje,
        @ultima_fecha = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    -- Flags de estado
    DECLARE @isClockedIn BIT = 0;
    DECLARE @isOvertimeActive BIT = 0;
    DECLARE @isCompensatedActive BIT = 0;
    DECLARE @staleShift BIT = 0;

    -- Determinar isClockedIn: última fue ENTRADA y no hay SALIDA después
    IF @ultimo_tipo = 'ENTRADA' SET @isClockedIn = 1;

    -- Determinar isOvertimeActive: último fue INICIO_EXTRA sin FIN_EXTRA después
    IF @ultimo_tipo = 'INICIO_EXTRA' SET @isOvertimeActive = 1;

    -- Determinar isCompensatedActive: último fue INICIO_COMPENSADA sin FIN_COMPENSADA
    IF @ultimo_tipo = 'INICIO_COMPENSADA' SET @isCompensatedActive = 1;

    -- StaleShift: si está clockedIn y han pasado > 20 horas
    IF @isClockedIn = 1 AND @ultima_fecha IS NOT NULL
    BEGIN
        IF DATEDIFF(HOUR, @ultima_fecha, GETDATE()) > 20
            SET @staleShift = 1;
    END

    -- También verificar si staleShift aplica a overtime
    IF @isOvertimeActive = 1 AND @ultima_fecha IS NOT NULL
    BEGIN
        IF DATEDIFF(HOUR, @ultima_fecha, GETDATE()) > 20
            SET @staleShift = 1;
    END

    -- Timestamps clave
    DECLARE @lastCheckIn DATETIME2 = NULL;
    DECLARE @lastCheckOut DATETIME2 = NULL;

    SELECT TOP 1 @lastCheckIn = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND tipo_marcaje = 'ENTRADA' AND estado = 'ACEPTADA'
      AND fecha >= @inicio_dia AND fecha < @fin_dia
    ORDER BY fecha DESC;

    SELECT TOP 1 @lastCheckOut = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND tipo_marcaje = 'SALIDA' AND estado = 'ACEPTADA'
      AND fecha >= @inicio_dia AND fecha < @fin_dia
    ORDER BY fecha DESC;

    -- ========================================
    -- RESULT SET 2: Flags de estado
    -- ========================================
    SELECT
        @isClockedIn        AS isClockedIn,
        @isOvertimeActive   AS isOvertimeActive,
        @isCompensatedActive AS isCompensatedActive,
        @staleShift         AS staleShift,
        @lastCheckIn        AS lastCheckIn,
        @lastCheckOut       AS lastCheckOut,
        @ultima_fecha       AS lastRecordTimestamp,
        @ultimo_tipo        AS lastRecordType;
END;
GO

-- ============================================================
-- SP 3: sp_marcaje_deshacer_ultimo
-- Elimina el último marcaje del tipo especificado
-- Solo se permite deshacer SALIDA/FIN_EXTRA/FIN_COMPENSADA
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_deshacer_ultimo
    @carnet VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    DECLARE @tipo VARCHAR(30);

    SELECT TOP 1 @id = id, @tipo = tipo_marcaje
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    -- Solo se puede deshacer salidas (no entradas, para evitar estado incoherente)
    IF @tipo IN ('SALIDA', 'FIN_EXTRA', 'FIN_COMPENSADA')
    BEGIN
        DELETE FROM marcaje_asistencias WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'Último registro eliminado' AS mensaje, @tipo AS tipo_eliminado;
    END
    ELSE
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Solo se puede deshacer una salida, no una entrada' AS mensaje, @tipo AS tipo_actual;
    END
END;
GO

-- ============================================================
-- SP 4: sp_marcaje_solicitar_correccion
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_solicitar_correccion
    @carnet          VARCHAR(20),
    @asistencia_id   INT = NULL,
    @tipo_solicitud  VARCHAR(50),
    @motivo          NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO marcaje_solicitudes (carnet, asistencia_id, tipo_solicitud, motivo, estado)
    VALUES (@carnet, @asistencia_id, @tipo_solicitud, @motivo, 'PENDIENTE');

    SELECT * FROM marcaje_solicitudes WHERE id = SCOPE_IDENTITY();
END;
GO

-- ============================================================
-- SP 5: sp_marcaje_gps_batch
-- Inserta múltiples puntos GPS de tracking en lote
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_marcaje_gps_batch
    @carnet VARCHAR(20),
    @puntos NVARCHAR(MAX)  -- JSON array: [{"lat":12.1,"lon":-86.2,"accuracy":10,"timestamp":"2026-...","fuente":"BACKGROUND"},...]
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO marcaje_gps_tracking (carnet, lat, long, accuracy, timestamp, fuente)
    SELECT
        @carnet,
        JSON_VALUE(p.value, '$.lat'),
        JSON_VALUE(p.value, '$.lon'),
        JSON_VALUE(p.value, '$.accuracy'),
        JSON_VALUE(p.value, '$.timestamp'),
        ISNULL(JSON_VALUE(p.value, '$.fuente'), 'BACKGROUND')
    FROM OPENJSON(@puntos) AS p;

    SELECT @@ROWCOUNT AS insertados;
END;
GO

PRINT '✅ Stored Procedures de MARCAJE WEB creados exitosamente';
GO
