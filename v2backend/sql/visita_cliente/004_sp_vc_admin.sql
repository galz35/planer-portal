-- ============================================================
-- STORED PROCEDURES ADMIN: MÓDULO VISITA A CLIENTE
-- Tracking raw, CRUD Agenda, Metas
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SP 1: sp_vc_tracking_por_dia
-- Retorna puntos GPS limpios del día para dibujar polyline
-- Filtros antiruido:
--   - accuracy <= 50m
--   - saltos > 1km en < 30s descartados
--   - velocidad > 130 km/h descartada
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_tracking_por_dia
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- 1. Obtener puntos filtrados
    ;WITH puntos_raw AS (
        SELECT id, lat, long AS lon, accuracy, velocidad, timestamp, fuente,
               ROW_NUMBER() OVER (ORDER BY timestamp) AS seq
        FROM vc_tracking_gps
        WHERE carnet = @carnet
          AND timestamp >= @inicio AND timestamp < @fin
          AND valido = 1
          AND (accuracy IS NULL OR accuracy <= 50)
    ),
    -- 2. Calcular delta al siguiente punto
    con_delta AS (
        SELECT p1.*,
            dbo.fn_haversine_metros(p1.lat, p1.lon, p2.lat, p2.lon) AS dist_siguiente_m,
            DATEDIFF(SECOND, p1.timestamp, p2.timestamp) AS seg_siguiente
        FROM puntos_raw p1
        LEFT JOIN puntos_raw p2 ON p2.seq = p1.seq + 1
    )
    -- 3. Filtrar ruido
    SELECT id, lat, lon, accuracy, velocidad, timestamp, fuente,
           dist_siguiente_m, seg_siguiente,
           CASE WHEN seg_siguiente > 0
                THEN CAST((dist_siguiente_m / seg_siguiente) * 3.6 AS DECIMAL(10,1))
                ELSE 0
           END AS velocidad_estimada_kmh
    FROM con_delta
    WHERE (dist_siguiente_m IS NULL OR dist_siguiente_m <= 1000)
      AND (seg_siguiente IS NULL OR seg_siguiente > 0)
      AND (dist_siguiente_m IS NULL OR seg_siguiente IS NULL
           OR (dist_siguiente_m / NULLIF(seg_siguiente, 0)) * 3.6 <= 130)
    ORDER BY timestamp ASC;
END;
GO

-- ============================================================
-- SP 2: sp_vc_admin_tracking_usuario
-- Admin ve tracking de CUALQUIER carnet (no solo el propio)
-- Reutiliza la misma lógica de sp_vc_tracking_por_dia +
-- agrega info de visitas del día para contexto
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_admin_tracking_usuario
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    -- Result 1: Puntos GPS (invoca la misma lógica)
    EXEC dbo.sp_vc_tracking_por_dia @carnet = @carnet, @fecha = @fecha;
END;
GO

-- ============================================================
-- SP 3: sp_vc_agenda_crear
-- Asignar un cliente a un técnico para una fecha específica
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_crear
    @carnet     VARCHAR(20),
    @cliente_id INT,
    @fecha      DATE,
    @orden      INT = 0,
    @notas      NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que no exista ya
    IF EXISTS (
        SELECT 1 FROM vc_agenda_dia
        WHERE carnet = @carnet AND cliente_id = @cliente_id AND fecha = @fecha
    )
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Este cliente ya está en la agenda de ese día' AS mensaje;
        RETURN;
    END

    -- Verificar que el cliente existe y está activo
    IF NOT EXISTS (SELECT 1 FROM vc_clientes WHERE id = @cliente_id AND activo = 1)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Cliente no encontrado o inactivo' AS mensaje;
        RETURN;
    END

    -- Si no se especifica orden, poner al final
    IF @orden = 0
    BEGIN
        SELECT @orden = ISNULL(MAX(orden), 0) + 1
        FROM vc_agenda_dia
        WHERE carnet = @carnet AND fecha = @fecha;
    END

    INSERT INTO vc_agenda_dia (carnet, cliente_id, fecha, orden, estado, notas)
    VALUES (@carnet, @cliente_id, @fecha, @orden, 'PENDIENTE', @notas);

    SELECT CAST(1 AS BIT) AS ok,
           'Cliente asignado a la agenda' AS mensaje,
           SCOPE_IDENTITY() AS id;
END;
GO

-- ============================================================
-- SP 4: sp_vc_agenda_reordenar
-- Cambiar orden de una visita en la agenda
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_reordenar
    @agenda_id  INT,
    @nuevo_orden INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE vc_agenda_dia SET orden = @nuevo_orden WHERE id = @agenda_id;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Agenda no encontrada' AS mensaje;
        RETURN;
    END

    SELECT CAST(1 AS BIT) AS ok, 'Orden actualizado' AS mensaje;
END;
GO

-- ============================================================
-- SP 5: sp_vc_agenda_eliminar
-- Quitar un cliente de la agenda (solo si PENDIENTE)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_eliminar
    @agenda_id INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @estado VARCHAR(20);
    SELECT @estado = estado FROM vc_agenda_dia WHERE id = @agenda_id;

    IF @estado IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Agenda no encontrada' AS mensaje;
        RETURN;
    END

    IF @estado <> 'PENDIENTE'
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('No se puede eliminar una agenda en estado: ', @estado) AS mensaje;
        RETURN;
    END

    DELETE FROM vc_agenda_dia WHERE id = @agenda_id;

    SELECT CAST(1 AS BIT) AS ok, 'Agenda eliminada' AS mensaje;
END;
GO

-- ============================================================
-- SP 6: sp_vc_agenda_listar
-- Listar agenda de un técnico para una fecha
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_agenda_listar
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

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
        c.zona,
        c.lat AS cliente_lat,
        c.long AS cliente_lon,
        v.timestamp_inicio AS visita_inicio,
        v.timestamp_fin AS visita_fin,
        v.duracion_minutos,
        v.estado AS visita_estado
    FROM vc_agenda_dia a
    JOIN vc_clientes c ON c.id = a.cliente_id
    LEFT JOIN vc_visitas v ON v.id = a.visita_id
    WHERE a.carnet = @carnet AND a.fecha = @fecha
    ORDER BY a.orden ASC;
END;
GO

-- ============================================================
-- SP 7: sp_vc_meta_set
-- Establecer/actualizar meta para un usuario
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_meta_set
    @carnet       VARCHAR(20),
    @meta_visitas  INT = 10,
    @costo_km      DECIMAL(10,4) = 0.15,
    @vigente_desde DATE = NULL,
    @vigente_hasta DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @vigente_desde = ISNULL(@vigente_desde, CAST(GETDATE() AS DATE));

    -- Desactivar metas anteriores
    UPDATE vc_metas
    SET activo = 0
    WHERE carnet = @carnet AND activo = 1;

    -- Insertar nueva meta
    INSERT INTO vc_metas (carnet, meta_visitas, costo_km, vigente_desde, vigente_hasta, activo)
    VALUES (@carnet, @meta_visitas, @costo_km, @vigente_desde, @vigente_hasta, 1);

    SELECT CAST(1 AS BIT) AS ok,
           'Meta configurada' AS mensaje,
           SCOPE_IDENTITY() AS id;
END;
GO

-- ============================================================
-- SP 8: sp_vc_meta_listar
-- Listar metas activas de todos o un carnet
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_meta_listar
    @carnet VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT m.*, c.Colaborador AS nombre_empleado
    FROM vc_metas m
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = m.carnet
    WHERE m.activo = 1
      AND (@carnet IS NULL OR m.carnet = @carnet)
    ORDER BY m.carnet;
END;
GO

-- ============================================================
-- SP 9: sp_vc_usuarios_con_tracking
-- Lista de usuarios que tienen datos de tracking GPS
-- (para el selector de usuario en el mapa)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_usuarios_con_tracking
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        t.carnet,
        c.Colaborador AS nombre_empleado,
        MAX(t.timestamp) AS ultimo_punto,
        COUNT(*) AS total_puntos
    FROM vc_tracking_gps t
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = t.carnet
    GROUP BY t.carnet, c.Colaborador
    ORDER BY MAX(t.timestamp) DESC;
END;
GO

PRINT '✅ Stored Procedures ADMIN de VISITA A CLIENTE creados exitosamente';
GO
