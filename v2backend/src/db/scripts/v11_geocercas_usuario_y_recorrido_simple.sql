-- =========================================================
-- v11_geocercas_usuario_y_recorrido_simple.sql
-- 1. Geocercas por usuario para marcaje
-- 2. Tabla recorridos simplificada para móvil
-- =========================================================

-- ─────────────────────────────────────────────────────
-- TABLA: marcaje_usuario_geocercas
-- Vincula usuarios con sus geocercas permitidas.
-- Un usuario puede tener MUCHAS geocercas.
-- El marcaje SIEMPRE se registra; si está fuera de
-- geocerca, solo jefe/admin ve la alerta.
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marcaje_usuario_geocercas')
BEGIN
    CREATE TABLE marcaje_usuario_geocercas (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        carnet          NVARCHAR(20) NOT NULL,
        id_site         INT NOT NULL,
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_ug_site FOREIGN KEY (id_site) REFERENCES marcaje_sites(id)
    );

    CREATE INDEX IX_ug_carnet ON marcaje_usuario_geocercas (carnet) WHERE activo = 1;

    PRINT '✅ Tabla marcaje_usuario_geocercas creada';
END
ELSE
    PRINT '⚠️ Tabla marcaje_usuario_geocercas ya existe';
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_marcaje_validar_geocerca
-- Valida si un usuario está dentro de alguna de sus
-- geocercas. Retorna resultado pero NO bloquea el marcaje.
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_marcaje_validar_geocerca
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7),
    @lon        DECIMAL(10,7)
AS
BEGIN
    SET NOCOUNT ON;

    -- Si no tiene geocercas asignadas → sin restricción
    IF NOT EXISTS (
        SELECT 1 FROM marcaje_usuario_geocercas
        WHERE carnet = @carnet AND activo = 1
    )
    BEGIN
        SELECT
            1 AS dentro_geocerca,
            'SIN_RESTRICCION' AS estado,
            NULL AS site_cercano,
            NULL AS distancia_metros,
            'Usuario sin geocercas asignadas' AS mensaje;
        RETURN;
    END

    -- Calcular distancia a cada geocerca del usuario
    -- Fórmula Haversine simplificada (aprox 111km por grado)
    DECLARE @resultados TABLE (
        id_site INT, nombre NVARCHAR(200),
        radio_metros INT, distancia_metros FLOAT
    );

    INSERT INTO @resultados
    SELECT
        s.id, s.nombre, s.radio_metros,
        -- Distancia aprox en metros (Haversine simplificado)
        SQRT(
            POWER((@lat - s.lat) * 111320, 2) +
            POWER((@lon - s.long) * 111320 * COS(RADIANS(@lat)), 2)
        ) AS distancia_metros
    FROM marcaje_usuario_geocercas ug
    INNER JOIN marcaje_sites s ON s.id = ug.id_site AND s.activo = 1
    WHERE ug.carnet = @carnet AND ug.activo = 1;

    -- ¿Está dentro de ALGUNA geocerca?
    DECLARE @dentro BIT = 0;
    IF EXISTS (SELECT 1 FROM @resultados WHERE distancia_metros <= radio_metros)
        SET @dentro = 1;

    -- Retornar el site más cercano
    SELECT TOP 1
        @dentro AS dentro_geocerca,
        CASE
            WHEN @dentro = 1 THEN 'DENTRO_GEOCERCA'
            ELSE 'FUERA_GEOCERCA'
        END AS estado,
        nombre AS site_cercano,
        CAST(distancia_metros AS INT) AS distancia_metros,
        CASE
            WHEN @dentro = 1 THEN 'Marcaje dentro de zona: ' + nombre
            ELSE 'Marcaje FUERA de zona. Más cercano: ' + nombre + ' (' + CAST(CAST(distancia_metros AS INT) AS NVARCHAR) + 'm)'
        END AS mensaje
    FROM @resultados
    ORDER BY distancia_metros ASC;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_marcaje_geocercas_usuario
-- Listar geocercas asignadas a un usuario
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_marcaje_geocercas_usuario
    @carnet     NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ug.id,
        ug.id_site,
        s.nombre,
        s.lat,
        s.long AS lon,
        s.radio_metros,
        s.accuracy_max,
        ug.activo,
        ug.creado_en
    FROM marcaje_usuario_geocercas ug
    INNER JOIN marcaje_sites s ON s.id = ug.id_site
    WHERE ug.carnet = @carnet
    ORDER BY ug.activo DESC, s.nombre;
END;
GO

-- ─────────────────────────────────────────────────────
-- TABLA: campo_recorridos
-- Registro simple de recorridos de campo (móvil)
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'campo_recorridos')
BEGIN
    CREATE TABLE campo_recorridos (
        id_recorrido    INT IDENTITY(1,1) PRIMARY KEY,
        carnet          NVARCHAR(20) NOT NULL,
        fecha           DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
        hora_inicio     DATETIME2 NOT NULL DEFAULT GETDATE(),
        hora_fin        DATETIME2 NULL,
        estado          NVARCHAR(20) NOT NULL DEFAULT 'EN_CURSO',  -- EN_CURSO, FINALIZADO
        km_total        DECIMAL(8,2) DEFAULT 0,
        duracion_min    INT DEFAULT 0,                              -- Duración total en minutos
        total_paradas   INT DEFAULT 0,                              -- Cuántas visitas/paradas hizo
        notas           NVARCHAR(500) NULL,
        creado_en       DATETIME2 DEFAULT GETDATE()
    );

    CREATE INDEX IX_recorrido_carnet ON campo_recorridos (carnet, fecha);

    PRINT '✅ Tabla campo_recorridos creada';
END
ELSE
    PRINT '⚠️ Tabla campo_recorridos ya existe';
GO

-- ─────────────────────────────────────────────────────
-- TABLA: campo_recorrido_puntos
-- Puntos GPS del recorrido (ruta seguida)
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'campo_recorrido_puntos')
BEGIN
    CREATE TABLE campo_recorrido_puntos (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        id_recorrido    INT NOT NULL,
        lat             DECIMAL(10,7) NOT NULL,
        lon             DECIMAL(10,7) NOT NULL,
        accuracy        DECIMAL(8,2) NULL,
        velocidad_kmh   DECIMAL(6,2) NULL,
        timestamp_gps   DATETIME2 NOT NULL DEFAULT GETDATE(),
        tipo            NVARCHAR(20) DEFAULT 'RUTA',   -- RUTA, PARADA, VISITA
        id_cliente      INT NULL,                       -- Si es VISITA, FK al cliente
        notas           NVARCHAR(200) NULL,

        CONSTRAINT FK_rp_recorrido FOREIGN KEY (id_recorrido) REFERENCES campo_recorridos(id_recorrido)
    );

    CREATE INDEX IX_rp_recorrido ON campo_recorrido_puntos (id_recorrido);

    PRINT '✅ Tabla campo_recorrido_puntos creada';
END
ELSE
    PRINT '⚠️ Tabla campo_recorrido_puntos ya existe';
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_iniciar_recorrido
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_iniciar_recorrido
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7) = NULL,
    @lon        DECIMAL(10,7) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar si ya tiene un recorrido en curso
    DECLARE @existente INT;
    SELECT @existente = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @existente IS NOT NULL
    BEGIN
        SELECT @existente AS id_recorrido, 'YA_EN_CURSO' AS estado,
            'Ya tienes un recorrido activo' AS mensaje;
        RETURN;
    END

    -- Crear nuevo recorrido
    INSERT INTO campo_recorridos (carnet) VALUES (@carnet);
    DECLARE @id INT = SCOPE_IDENTITY();

    -- Registrar punto inicial si hay coordenadas
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, tipo)
        VALUES (@id, @lat, @lon, 'INICIO');
    END

    SELECT @id AS id_recorrido, 'INICIADO' AS estado,
        'Recorrido iniciado correctamente' AS mensaje;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_finalizar_recorrido
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_finalizar_recorrido
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7) = NULL,
    @lon        DECIMAL(10,7) = NULL,
    @notas      NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    SELECT @id = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @id IS NULL
    BEGIN
        SELECT 0 AS id_recorrido, 'SIN_RECORRIDO' AS estado,
            'No hay recorrido activo' AS mensaje;
        RETURN;
    END

    -- Registrar punto final
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, tipo)
        VALUES (@id, @lat, @lon, 'FIN');
    END

    -- Calcular estadísticas
    DECLARE @totalPuntos INT, @totalParadas INT, @duracion INT;

    SELECT @totalPuntos = COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = @id;
    SELECT @totalParadas = COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = @id AND tipo IN ('PARADA', 'VISITA');

    SELECT @duracion = DATEDIFF(MINUTE, hora_inicio, GETDATE()) FROM campo_recorridos WHERE id_recorrido = @id;

    -- Calcular km total (sumar distancias entre puntos consecutivos)
    DECLARE @km DECIMAL(8,2) = 0;
    ;WITH puntos_ord AS (
        SELECT lat, lon, ROW_NUMBER() OVER (ORDER BY timestamp_gps) AS rn
        FROM campo_recorrido_puntos WHERE id_recorrido = @id
    )
    SELECT @km = ISNULL(SUM(
        SQRT(
            POWER((p2.lat - p1.lat) * 111.32, 2) +
            POWER((p2.lon - p1.lon) * 111.32 * COS(RADIANS(p1.lat)), 2)
        )
    ), 0)
    FROM puntos_ord p1
    INNER JOIN puntos_ord p2 ON p2.rn = p1.rn + 1;

    -- Actualizar recorrido
    UPDATE campo_recorridos SET
        estado = 'FINALIZADO',
        hora_fin = GETDATE(),
        km_total = @km,
        duracion_min = @duracion,
        total_paradas = @totalParadas,
        notas = @notas
    WHERE id_recorrido = @id;

    SELECT @id AS id_recorrido, 'FINALIZADO' AS estado,
        CAST(@km AS NVARCHAR) + ' km recorridos en ' + CAST(@duracion AS NVARCHAR) + ' min, ' + CAST(@totalParadas AS NVARCHAR) + ' paradas' AS mensaje,
        @km AS km_total,
        @duracion AS duracion_min,
        @totalParadas AS total_paradas;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_registrar_punto
-- Registra un punto GPS en el recorrido activo
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_registrar_punto
    @carnet         NVARCHAR(20),
    @lat            DECIMAL(10,7),
    @lon            DECIMAL(10,7),
    @accuracy       DECIMAL(8,2) = NULL,
    @velocidad_kmh  DECIMAL(6,2) = NULL,
    @tipo           NVARCHAR(20) = 'RUTA',
    @id_cliente     INT = NULL,
    @notas          NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    SELECT @id = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @id IS NULL
    BEGIN
        SELECT 0 AS ok, 'No hay recorrido activo' AS mensaje;
        RETURN;
    END

    INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, accuracy, velocidad_kmh, tipo, id_cliente, notas)
    VALUES (@id, @lat, @lon, @accuracy, @velocidad_kmh, @tipo, @id_cliente, @notas);

    SELECT 1 AS ok, 'Punto registrado' AS mensaje, @id AS id_recorrido;
END;
GO


PRINT '═══════════════════════════════════════════════════';
PRINT '✅ v11 — Geocercas por usuario + Recorridos campo';
PRINT '   Tablas: marcaje_usuario_geocercas,';
PRINT '           campo_recorridos, campo_recorrido_puntos';
PRINT '   SPs:    sp_marcaje_validar_geocerca,';
PRINT '           sp_marcaje_geocercas_usuario,';
PRINT '           sp_campo_iniciar_recorrido,';
PRINT '           sp_campo_finalizar_recorrido,';
PRINT '           sp_campo_registrar_punto';
PRINT '═══════════════════════════════════════════════════';
GO
