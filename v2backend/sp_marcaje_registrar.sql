

-- ============================================================

-- SP 1: sp_marcaje_registrar

-- Registra un marcaje (entrada/salida/extras/compensada)

-- REGLA DE ORO: NUNCA rechazar. Si hay irregularidad â┼' WARN en motivo.

-- ============================================================

CREATE   PROCEDURE dbo.sp_marcaje_registrar

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

    -- 2. ANTI-SPAM: Ãºltimos 60 segundos

    -- ========================================

    DECLARE @ultimo_marcaje DATETIME2;

    SELECT TOP 1 @ultimo_marcaje = fecha

    FROM marcaje_asistencias

    WHERE carnet = @carnet AND estado = 'ACEPTADA'

    ORDER BY fecha DESC;



    IF @ultimo_marcaje IS NOT NULL AND DATEDIFF(SECOND, @ultimo_marcaje, @ahora) < 60

    BEGIN

        -- NO rechazar, registrar con WARN

        SET @motivo = CONCAT('WARN: Anti-spam activo (', DATEDIFF(SECOND, @ultimo_marcaje, @ahora), 's desde Ãºltimo marcaje)');

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

        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje mÃ³vil no autorizado para este usuario';

    END



    IF @tipo_device = 'DESKTOP' AND @permitir_escritorio = 0

    BEGIN

        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje escritorio no autorizado para este usuario';

    END



    -- ========================================

    -- 4. VALIDACIÃ"N GEOFENCE (solo si tiene GPS)

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



        -- Verificar si estÃ¡ dentro de alguna zona

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

                    CONCAT('WARN: Fuera de zona (mÃ¡s cercana: ', @zona_cercana,

                           ' a ', CAST(CAST(@min_distancia AS INT) AS VARCHAR), 'm)');

            END

        END

    END



    -- ========================================

    -- 5. VALIDACIÃ"N IP WHITELIST (solo DESKTOP)

    -- ========================================

    IF @tipo_device = 'DESKTOP' AND @ip IS NOT NULL

    BEGIN

        DECLARE @hay_whitelist BIT = 0;

        IF EXISTS (SELECT 1 FROM marcaje_ip_whitelist WHERE activo = 1)

            SET @hay_whitelist = 1;



        IF @hay_whitelist = 1

        BEGIN

            -- ValidaciÃ³n simplificada: match exacto del primer octeto de CIDR

            -- Para producciÃ³n usar fn_ip_in_cidr con conversiones binarias

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

