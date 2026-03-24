-- ============================================================
-- STORED PROCEDURES: MÓDULO VISITA A CLIENTE
-- Dependencia: fn_haversine_metros, tablas vc_*
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SP 1: sp_vc_checkin
-- Registra la llegada del técnico al cliente
-- Valida geofence y calcula distancia al centro del cliente
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_checkin
    @carnet      VARCHAR(20),
    @cliente_id  INT,
    @lat         DECIMAL(10,7),
    @lon         DECIMAL(10,7),
    @accuracy    DECIMAL(10,2) = NULL,
    @timestamp   DATETIME2 = NULL,
    @agenda_id   INT = NULL,
    @offline_id  VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp, GETDATE());

    -- ========================================
    -- 1. IDEMPOTENCIA: Si offline_id ya existe → retornar existente
    -- ========================================
    IF @offline_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM vc_visitas WHERE offline_id = @offline_id
    )
    BEGIN
        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.offline_id = @offline_id;
        RETURN;
    END

    -- ========================================
    -- 2. VERIFICAR QUE NO HAY VISITA ABIERTA AL MISMO CLIENTE HOY
    -- ========================================
    IF EXISTS (
        SELECT 1 FROM vc_visitas
        WHERE carnet = @carnet
          AND cliente_id = @cliente_id
          AND estado = 'EN_CURSO'
          AND CAST(timestamp_inicio AS DATE) = CAST(@ahora AS DATE)
    )
    BEGIN
        -- Retornar la visita existente en vez de crear duplicado
        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
               CAST(0 AS BIT) AS nueva, 'Visita ya en curso para este cliente hoy' AS mensaje
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.carnet = @carnet
          AND v.cliente_id = @cliente_id
          AND v.estado = 'EN_CURSO'
          AND CAST(v.timestamp_inicio AS DATE) = CAST(@ahora AS DATE);
        RETURN;
    END

    -- ========================================
    -- 3. OBTENER DATOS DEL CLIENTE
    -- ========================================
    DECLARE @cli_lat DECIMAL(10,7);
    DECLARE @cli_lon DECIMAL(10,7);
    DECLARE @cli_radio INT;
    DECLARE @cli_nombre NVARCHAR(200);

    SELECT @cli_lat = lat, @cli_lon = long,
           @cli_radio = radio_metros, @cli_nombre = nombre
    FROM vc_clientes
    WHERE id = @cliente_id AND activo = 1;

    IF @cli_lat IS NULL
    BEGIN
        -- Cliente sin GPS configurado → aceptar sin validación
        INSERT INTO vc_visitas (
            carnet, cliente_id, agenda_id,
            lat_inicio, long_inicio, accuracy_inicio,
            timestamp_inicio, distancia_inicio_m, valido_inicio,
            estado, offline_id
        )
        VALUES (
            @carnet, @cliente_id, @agenda_id,
            @lat, @lon, @accuracy,
            @ahora, NULL, 1,
            'EN_CURSO', @offline_id
        );

        -- Actualizar agenda si aplica
        IF @agenda_id IS NOT NULL
            UPDATE vc_agenda_dia SET estado = 'EN_CURSO', visita_id = SCOPE_IDENTITY()
            WHERE id = @agenda_id;

        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
               CAST(1 AS BIT) AS nueva, 'Check-in registrado (cliente sin GPS)' AS mensaje
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.id = SCOPE_IDENTITY();
        RETURN;
    END

    -- ========================================
    -- 4. CALCULAR DISTANCIA Y VALIDAR GEOFENCE
    -- ========================================
    DECLARE @distancia_m INT;
    SET @distancia_m = CAST(dbo.fn_haversine_metros(@lat, @lon, @cli_lat, @cli_lon) AS INT);

    DECLARE @valido BIT = 1;
    DECLARE @motivo_fuera NVARCHAR(300) = NULL;

    IF @distancia_m > @cli_radio
    BEGIN
        SET @valido = 0;
        SET @motivo_fuera = CONCAT('Fuera de zona: ', @distancia_m, 'm del centro (radio: ', @cli_radio, 'm)');
    END

    -- ========================================
    -- 5. INSERTAR VISITA
    -- ========================================
    INSERT INTO vc_visitas (
        carnet, cliente_id, agenda_id,
        lat_inicio, long_inicio, accuracy_inicio,
        timestamp_inicio, distancia_inicio_m, valido_inicio,
        estado, motivo_fuera_zona, offline_id
    )
    VALUES (
        @carnet, @cliente_id, @agenda_id,
        @lat, @lon, @accuracy,
        @ahora, @distancia_m, @valido,
        'EN_CURSO', @motivo_fuera, @offline_id
    );

    DECLARE @new_id INT = SCOPE_IDENTITY();

    -- Actualizar agenda si aplica
    IF @agenda_id IS NOT NULL
        UPDATE vc_agenda_dia SET estado = 'EN_CURSO', visita_id = @new_id
        WHERE id = @agenda_id;

    -- ========================================
    -- 6. RETORNAR RESULTADO
    -- ========================================
    SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
           CAST(1 AS BIT) AS nueva,
           CASE WHEN @valido = 1
                THEN CONCAT('Check-in válido (', @distancia_m, 'm del centro)')
                ELSE CONCAT('Check-in registrado FUERA de zona (', @distancia_m, 'm, radio: ', @cli_radio, 'm)')
           END AS mensaje
    FROM vc_visitas v
    JOIN vc_clientes c ON c.id = v.cliente_id
    WHERE v.id = @new_id;
END;
GO

-- ============================================================
-- SP 2: sp_vc_checkout
-- Cierra una visita: registra GPS final, evidencia, observación
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_checkout
    @visita_id    INT,
    @carnet       VARCHAR(20),
    @lat          DECIMAL(10,7) = NULL,
    @lon          DECIMAL(10,7) = NULL,
    @accuracy     DECIMAL(10,2) = NULL,
    @timestamp    DATETIME2 = NULL,
    @observacion  NVARCHAR(MAX) = NULL,
    @foto_path    NVARCHAR(500) = NULL,
    @firma_path   NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp, GETDATE());

    -- ========================================
    -- 1. VERIFICAR QUE LA VISITA EXISTE Y ESTÁ EN CURSO
    -- ========================================
    DECLARE @estado_actual VARCHAR(20);
    DECLARE @carnet_visita VARCHAR(20);
    DECLARE @agenda_id INT;

    SELECT @estado_actual = estado, @carnet_visita = carnet, @agenda_id = agenda_id
    FROM vc_visitas
    WHERE id = @visita_id;

    IF @estado_actual IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Visita no encontrada' AS mensaje;
        RETURN;
    END

    IF @carnet_visita <> @carnet
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'No tienes permiso para cerrar esta visita' AS mensaje;
        RETURN;
    END

    IF @estado_actual <> 'EN_CURSO'
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('La visita ya está en estado: ', @estado_actual) AS mensaje;
        RETURN;
    END

    -- ========================================
    -- 2. ACTUALIZAR VISITA CON DATOS DE CIERRE
    -- ========================================
    UPDATE vc_visitas
    SET lat_fin = @lat,
        long_fin = @lon,
        accuracy_fin = @accuracy,
        timestamp_fin = @ahora,
        observacion = @observacion,
        foto_path = @foto_path,
        firma_path = @firma_path,
        estado = 'FINALIZADA'
    WHERE id = @visita_id;

    -- Actualizar agenda si aplica
    IF @agenda_id IS NOT NULL
        UPDATE vc_agenda_dia SET estado = 'FINALIZADA' WHERE id = @agenda_id;

    -- ========================================
    -- 3. RETORNAR RESULTADO
    -- ========================================
    SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
           CAST(1 AS BIT) AS ok,
           CONCAT('Visita finalizada. Duración: ', v.duracion_minutos, ' minutos') AS mensaje
    FROM vc_visitas v
    JOIN vc_clientes c ON c.id = v.cliente_id
    WHERE v.id = @visita_id;
END;
GO

-- ============================================================
-- SP 3: sp_vc_calculo_km_dia
-- Calcula km totales del día filtrando ruido GPS
-- Algoritmo:
--   1. Ordenar puntos por timestamp
--   2. Descartar precisión > 50m
--   3. Descartar saltos > 1km en < 30 seg (velocidad irreal > 120 km/h)
--   4. Sumar distancias Haversine consecutivas
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_calculo_km_dia
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin    DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Puntos válidos del día ordenados por timestamp
    -- Combinar tracking GPS + puntos de check-in/out
    ;WITH puntos_raw AS (
        -- Puntos de tracking GPS
        SELECT lat, long AS lon, accuracy, timestamp, fuente, ROW_NUMBER() OVER (ORDER BY timestamp) AS rn
        FROM vc_tracking_gps
        WHERE carnet = @carnet
          AND timestamp >= @inicio
          AND timestamp < @fin
          AND valido = 1
        UNION ALL
        -- Puntos de check-in
        SELECT lat_inicio, long_inicio, accuracy_inicio, timestamp_inicio, 'CHECK_IN', 0
        FROM vc_visitas
        WHERE carnet = @carnet
          AND timestamp_inicio >= @inicio
          AND timestamp_inicio < @fin
        UNION ALL
        -- Puntos de check-out
        SELECT lat_fin, long_fin, accuracy_fin, timestamp_fin, 'CHECK_OUT', 0
        FROM vc_visitas
        WHERE carnet = @carnet
          AND timestamp_fin >= @inicio
          AND timestamp_fin < @fin
          AND lat_fin IS NOT NULL
    ),
    -- Filtrar y reordenar
    puntos_filtrados AS (
        SELECT lat, lon, accuracy, timestamp,
               ROW_NUMBER() OVER (ORDER BY timestamp) AS seq
        FROM puntos_raw
        WHERE lat IS NOT NULL
          AND lon IS NOT NULL
          AND (accuracy IS NULL OR accuracy <= 50)  -- Descartar precisión baja
    ),
    -- Calcular distancias entre puntos consecutivos
    segmentos AS (
        SELECT
            p1.seq,
            p1.lat AS lat1, p1.lon AS lon1, p1.timestamp AS ts1,
            p2.lat AS lat2, p2.lon AS lon2, p2.timestamp AS ts2,
            dbo.fn_haversine_metros(p1.lat, p1.lon, p2.lat, p2.lon) AS distancia_m,
            DATEDIFF(SECOND, p1.timestamp, p2.timestamp) AS segundos
        FROM puntos_filtrados p1
        JOIN puntos_filtrados p2 ON p2.seq = p1.seq + 1
    ),
    -- Filtrar segmentos con velocidad irreal
    segmentos_validos AS (
        SELECT *,
            CASE
                WHEN segundos > 0
                THEN (distancia_m / segundos) * 3.6  -- m/s → km/h
                ELSE 0
            END AS velocidad_kmh
        FROM segmentos
        WHERE segundos > 0               -- Evitar div/0
          AND distancia_m <= 1000         -- No más de 1km entre puntos
          AND (distancia_m / NULLIF(segundos, 0)) * 3.6 <= 130  -- No más de 130 km/h
    )
    SELECT
        @carnet AS carnet,
        @fecha AS fecha,
        ISNULL(SUM(distancia_m) / 1000.0, 0) AS km_total,
        COUNT(*) AS segmentos_validos,
        (SELECT COUNT(*) FROM puntos_raw) AS puntos_totales,
        (SELECT COUNT(*) FROM puntos_filtrados) AS puntos_validos_accuracy,
        (SELECT COUNT(*) FROM segmentos) - COUNT(*) AS segmentos_descartados_velocidad
    FROM segmentos_validos;
END;
GO

-- ============================================================
-- SP 4: sp_vc_agenda_hoy
-- Retorna la agenda del día para un técnico
-- Ordenada por distancia al GPS actual (si se proporciona)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_hoy
    @carnet     VARCHAR(20),
    @lat_actual DECIMAL(10,7) = NULL,
    @lon_actual DECIMAL(10,7) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);

    SELECT
        a.id AS agenda_id,
        a.orden,
        a.estado AS agenda_estado,
        a.notas,
        a.visita_id,
        c.id AS cliente_id,
        c.codigo,
        c.nombre AS cliente_nombre,
        c.direccion,
        c.telefono,
        c.contacto,
        c.lat AS cliente_lat,
        c.long AS cliente_lon,
        c.radio_metros,
        c.zona,
        -- Distancia calculada al GPS actual
        CASE
            WHEN @lat_actual IS NOT NULL AND c.lat IS NOT NULL
            THEN CAST(dbo.fn_haversine_metros(@lat_actual, @lon_actual, c.lat, c.long) AS INT)
            ELSE NULL
        END AS distancia_actual_m,
        -- Info de la visita si ya se hizo
        v.timestamp_inicio AS visita_inicio,
        v.timestamp_fin AS visita_fin,
        v.duracion_minutos,
        v.estado AS visita_estado,
        v.valido_inicio,
        v.foto_path,
        v.firma_path
    FROM vc_agenda_dia a
    JOIN vc_clientes c ON c.id = a.cliente_id
    LEFT JOIN vc_visitas v ON v.id = a.visita_id
    WHERE a.carnet = @carnet
      AND a.fecha = @hoy
      AND c.activo = 1
    ORDER BY
        -- Primero las pendientes, luego en curso, luego finalizadas
        CASE a.estado
            WHEN 'PENDIENTE' THEN 1
            WHEN 'EN_CURSO' THEN 2
            WHEN 'FINALIZADA' THEN 3
            ELSE 4
        END,
        -- Dentro de pendientes, ordenar por distancia si hay GPS
        CASE
            WHEN @lat_actual IS NOT NULL AND c.lat IS NOT NULL
            THEN dbo.fn_haversine_metros(@lat_actual, @lon_actual, c.lat, c.long)
            ELSE a.orden * 1000.0   -- Fallback: usar orden manual
        END ASC;
END;
GO

-- ============================================================
-- SP 5: sp_vc_resumen_dia
-- KPIs del día para el dashboard del técnico
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_resumen_dia
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin    DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Conteos de visitas
    DECLARE @completadas INT = 0;
    DECLARE @pendientes INT = 0;
    DECLARE @en_curso INT = 0;
    DECLARE @total_agenda INT = 0;
    DECLARE @duracion_total INT = 0;
    DECLARE @fuera_zona INT = 0;

    SELECT
        @completadas = SUM(CASE WHEN estado = 'FINALIZADA' THEN 1 ELSE 0 END),
        @en_curso = SUM(CASE WHEN estado = 'EN_CURSO' THEN 1 ELSE 0 END),
        @duracion_total = ISNULL(SUM(CASE WHEN duracion_minutos IS NOT NULL THEN duracion_minutos ELSE 0 END), 0),
        @fuera_zona = SUM(CASE WHEN valido_inicio = 0 THEN 1 ELSE 0 END)
    FROM vc_visitas
    WHERE carnet = @carnet
      AND timestamp_inicio >= @inicio
      AND timestamp_inicio < @fin;

    SELECT @total_agenda = COUNT(*),
           @pendientes = SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END)
    FROM vc_agenda_dia
    WHERE carnet = @carnet AND fecha = @fecha;

    -- Meta
    DECLARE @meta_visitas INT = 10;
    DECLARE @costo_km DECIMAL(10,4) = 0.15;

    SELECT @meta_visitas = ISNULL(meta_visitas, 10),
           @costo_km = ISNULL(costo_km, 0.15)
    FROM vc_metas
    WHERE carnet = @carnet AND activo = 1
      AND vigente_desde <= @fecha
      AND (vigente_hasta IS NULL OR vigente_hasta >= @fecha);

    -- Km del día (ejecutar cálculo inline para evitar SP anidado)
    DECLARE @km_total DECIMAL(10,2) = 0;

    -- Calcular km con la misma lógica de sp_vc_calculo_km_dia pero inline
    ;WITH puntos_filtrados AS (
        SELECT lat, long AS lon, timestamp,
               ROW_NUMBER() OVER (ORDER BY timestamp) AS seq
        FROM vc_tracking_gps
        WHERE carnet = @carnet
          AND timestamp >= @inicio
          AND timestamp < @fin
          AND valido = 1
          AND (accuracy IS NULL OR accuracy <= 50)
    ),
    segmentos AS (
        SELECT
            dbo.fn_haversine_metros(p1.lat, p1.lon, p2.lat, p2.lon) AS distancia_m,
            DATEDIFF(SECOND, p1.timestamp, p2.timestamp) AS segundos
        FROM puntos_filtrados p1
        JOIN puntos_filtrados p2 ON p2.seq = p1.seq + 1
    )
    SELECT @km_total = ISNULL(SUM(distancia_m) / 1000.0, 0)
    FROM segmentos
    WHERE segundos > 0
      AND distancia_m <= 1000
      AND (distancia_m / NULLIF(segundos, 0)) * 3.6 <= 130;

    -- Retornar resultado
    SELECT
        @carnet AS carnet,
        @fecha AS fecha,
        ISNULL(@completadas, 0) AS visitas_completadas,
        ISNULL(@en_curso, 0) AS visitas_en_curso,
        ISNULL(@pendientes, 0) AS visitas_pendientes,
        @total_agenda AS total_agenda,
        @meta_visitas AS meta_visitas,
        CASE WHEN @meta_visitas > 0
             THEN CAST((ISNULL(@completadas, 0) * 100.0 / @meta_visitas) AS DECIMAL(5,1))
             ELSE 0
        END AS cumplimiento_pct,
        @duracion_total AS duracion_total_min,
        @km_total AS km_total,
        CAST(@km_total * @costo_km AS DECIMAL(10,2)) AS costo_estimado,
        @costo_km AS costo_km_config,
        ISNULL(@fuera_zona, 0) AS visitas_fuera_zona;
END;
GO

-- ============================================================
-- SP 6: sp_vc_tracking_batch
-- Inserta múltiples puntos GPS en lote (sync offline)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_tracking_batch
    @carnet VARCHAR(20),
    @puntos NVARCHAR(MAX)  -- JSON array
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO vc_tracking_gps (carnet, lat, long, accuracy, velocidad, timestamp, fuente)
    SELECT
        @carnet,
        CAST(JSON_VALUE(p.value, '$.lat') AS DECIMAL(10,7)),
        CAST(JSON_VALUE(p.value, '$.lon') AS DECIMAL(10,7)),
        CAST(JSON_VALUE(p.value, '$.accuracy') AS DECIMAL(10,2)),
        CAST(JSON_VALUE(p.value, '$.velocidad') AS DECIMAL(10,2)),
        CAST(JSON_VALUE(p.value, '$.timestamp') AS DATETIME2),
        ISNULL(JSON_VALUE(p.value, '$.fuente'), 'FOREGROUND')
    FROM OPENJSON(@puntos) AS p;

    SELECT @@ROWCOUNT AS insertados;
END;
GO

PRINT '✅ Stored Procedures de VISITA A CLIENTE creados exitosamente';
GO
