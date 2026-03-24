-- =========================================================
-- v10_jornada_horarios_patrones.sql
-- Módulo de Jornada Laboral: Horarios, Patrones y Asignaciones
-- Basado en estándar Oracle Cloud HCM (Work Shifts → Work Patterns → Work Schedules)
-- =========================================================

-- ─────────────────────────────────────────────────────
-- TABLA 1: marcaje_horarios (Work Shifts)
-- Define bloques de tiempo individuales (turnos)
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marcaje_horarios')
BEGIN
    CREATE TABLE marcaje_horarios (
        id_horario      INT IDENTITY(1,1) PRIMARY KEY,
        nombre          NVARCHAR(100) NOT NULL,         -- Ej: "Administrativo 08-17", "Vigilancia Noche"
        hora_entrada    TIME NOT NULL,                   -- Ej: 08:00:00
        hora_salida     TIME NOT NULL,                   -- Ej: 17:00:00
        duracion_horas  DECIMAL(4,2) NOT NULL DEFAULT 8, -- Horas esperadas de trabajo
        es_nocturno     BIT NOT NULL DEFAULT 0,          -- 1 = salida es al día siguiente (cruce medianoche)
        tolerancia_min  INT NOT NULL DEFAULT 10,         -- Minutos de tolerancia para retraso
        descanso_min    INT NOT NULL DEFAULT 60,         -- Minutos de almuerzo/descanso incluidos
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETDATE(),
        actualizado_en  DATETIME2 DEFAULT GETDATE()
    );

    PRINT '✅ Tabla marcaje_horarios creada';
END
ELSE
    PRINT '⚠️ Tabla marcaje_horarios ya existe';
GO

-- ─────────────────────────────────────────────────────
-- TABLA 2: marcaje_patrones (Work Patterns)
-- Define una secuencia cíclica de turnos
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marcaje_patrones')
BEGIN
    CREATE TABLE marcaje_patrones (
        id_patron       INT IDENTITY(1,1) PRIMARY KEY,
        nombre          NVARCHAR(100) NOT NULL,          -- Ej: "5x2 Admin", "4x4 Rotativo", "Semana A/B"
        total_dias      INT NOT NULL DEFAULT 7,          -- Longitud del ciclo (7=semanal, 8=4x4, 14=quincenal)
        descripcion     NVARCHAR(500) NULL,
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETDATE(),
        actualizado_en  DATETIME2 DEFAULT GETDATE()
    );

    PRINT '✅ Tabla marcaje_patrones creada';
END
ELSE
    PRINT '⚠️ Tabla marcaje_patrones ya existe';
GO

-- ─────────────────────────────────────────────────────
-- TABLA 3: marcaje_patrones_detalle (Work Pattern Details)
-- Cada fila = 1 día del ciclo con su horario asignado
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marcaje_patrones_detalle')
BEGIN
    CREATE TABLE marcaje_patrones_detalle (
        id              INT IDENTITY(1,1) PRIMARY KEY,
        id_patron       INT NOT NULL,
        nro_dia         INT NOT NULL,                    -- Día dentro del ciclo (1, 2, ... N)
        id_horario      INT NULL,                        -- NULL = día libre/OFF
        etiqueta        NVARCHAR(50) NULL,               -- Opcional: "Lunes", "Día 1", "Noche A"

        CONSTRAINT FK_patdet_patron FOREIGN KEY (id_patron) REFERENCES marcaje_patrones(id_patron),
        CONSTRAINT FK_patdet_horario FOREIGN KEY (id_horario) REFERENCES marcaje_horarios(id_horario),
        CONSTRAINT UQ_patron_dia UNIQUE (id_patron, nro_dia)
    );

    PRINT '✅ Tabla marcaje_patrones_detalle creada';
END
ELSE
    PRINT '⚠️ Tabla marcaje_patrones_detalle ya existe';
GO

-- ─────────────────────────────────────────────────────
-- TABLA 4: marcaje_asignacion (Work Schedules / Assignment)
-- Vincula un colaborador con su patrón y fecha de referencia
-- ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'marcaje_asignacion')
BEGIN
    CREATE TABLE marcaje_asignacion (
        id_asignacion   INT IDENTITY(1,1) PRIMARY KEY,
        carnet          NVARCHAR(20) NOT NULL,           -- FK a rrhh.Colaboradores
        id_patron       INT NOT NULL,
        fecha_inicio    DATE NOT NULL,                   -- Día 1 del ciclo para este usuario
        fecha_fin       DATE NULL,                       -- NULL = vigente indefinidamente
        activo          BIT NOT NULL DEFAULT 1,
        creado_en       DATETIME2 DEFAULT GETDATE(),
        actualizado_en  DATETIME2 DEFAULT GETDATE(),

        CONSTRAINT FK_asig_patron FOREIGN KEY (id_patron) REFERENCES marcaje_patrones(id_patron)
    );

    -- Índice para búsqueda rápida por carnet + fecha
    CREATE INDEX IX_asig_carnet_fecha ON marcaje_asignacion (carnet, fecha_inicio, fecha_fin)
        WHERE activo = 1;

    PRINT '✅ Tabla marcaje_asignacion creada';
END
ELSE
    PRINT '⚠️ Tabla marcaje_asignacion ya existe';
GO

-- ═════════════════════════════════════════════════════
-- STORED PROCEDURE: sp_jornada_resolver
-- Dado un carnet y una fecha, retorna el horario esperado
-- ═════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE sp_jornada_resolver
    @carnet     NVARCHAR(20),
    @fecha      DATE = NULL         -- NULL = hoy
AS
BEGIN
    SET NOCOUNT ON;

    -- Fecha de consulta
    DECLARE @fechaConsulta DATE = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    -- 1. Buscar asignación activa para este carnet en la fecha consultada
    DECLARE @id_patron INT, @fecha_inicio DATE, @total_dias INT;

    SELECT TOP 1
        @id_patron = a.id_patron,
        @fecha_inicio = a.fecha_inicio,
        @total_dias = p.total_dias
    FROM marcaje_asignacion a
    INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron AND p.activo = 1
    WHERE a.carnet = @carnet
      AND a.activo = 1
      AND a.fecha_inicio <= @fechaConsulta
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= @fechaConsulta)
    ORDER BY a.fecha_inicio DESC;

    -- Sin asignación → reportar como "sin horario definido"
    IF @id_patron IS NULL
    BEGIN
        SELECT
            'SIN_ASIGNACION' AS estado,
            @fechaConsulta AS fecha,
            NULL AS id_horario,
            NULL AS nombre_horario,
            NULL AS hora_entrada,
            NULL AS hora_salida,
            0 AS es_nocturno,
            0 AS es_dia_libre,
            NULL AS nro_dia_ciclo,
            NULL AS nombre_patron,
            NULL AS total_dias_ciclo;
        RETURN;
    END

    -- 2. Calcular en qué día del ciclo estamos
    DECLARE @diasDiff INT = DATEDIFF(DAY, @fecha_inicio, @fechaConsulta);
    DECLARE @diaActual INT = (@diasDiff % @total_dias) + 1;

    -- 3. Obtener el detalle del patrón para este día
    SELECT
        CASE
            WHEN d.id_horario IS NULL THEN 'DIA_LIBRE'
            ELSE 'DIA_LABORAL'
        END AS estado,
        @fechaConsulta AS fecha,
        h.id_horario,
        h.nombre AS nombre_horario,
        h.hora_entrada,
        h.hora_salida,
        ISNULL(h.es_nocturno, 0) AS es_nocturno,
        CASE WHEN d.id_horario IS NULL THEN 1 ELSE 0 END AS es_dia_libre,
        @diaActual AS nro_dia_ciclo,
        p.nombre AS nombre_patron,
        p.total_dias AS total_dias_ciclo,
        h.duracion_horas,
        h.tolerancia_min,
        h.descanso_min,
        d.etiqueta AS etiqueta_dia
    FROM marcaje_patrones_detalle d
    INNER JOIN marcaje_patrones p ON p.id_patron = d.id_patron
    LEFT JOIN marcaje_horarios h ON h.id_horario = d.id_horario
    WHERE d.id_patron = @id_patron
      AND d.nro_dia = @diaActual;
END;
GO


-- ═════════════════════════════════════════════════════
-- STORED PROCEDURE: sp_jornada_semana
-- Retorna los horarios de toda la semana para un carnet
-- ═════════════════════════════════════════════════════
CREATE OR ALTER PROCEDURE sp_jornada_semana
    @carnet     NVARCHAR(20),
    @fecha      DATE = NULL         -- Cualquier fecha de la semana deseada, NULL = hoy
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaBase DATE = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    -- Calcular inicio de semana (lunes)
    DECLARE @lunes DATE = DATEADD(DAY, -(DATEPART(WEEKDAY, @fechaBase) + @@DATEFIRST - 2) % 7, @fechaBase);

    -- Generar tabla de 7 días
    DECLARE @dias TABLE (fecha DATE, nro INT);
    INSERT INTO @dias VALUES
        (@lunes, 1),
        (DATEADD(DAY, 1, @lunes), 2),
        (DATEADD(DAY, 2, @lunes), 3),
        (DATEADD(DAY, 3, @lunes), 4),
        (DATEADD(DAY, 4, @lunes), 5),
        (DATEADD(DAY, 5, @lunes), 6),
        (DATEADD(DAY, 6, @lunes), 7);

    -- Buscar asignación vigente
    DECLARE @id_patron INT, @fecha_inicio DATE, @total_dias INT;

    SELECT TOP 1
        @id_patron = a.id_patron,
        @fecha_inicio = a.fecha_inicio,
        @total_dias = p.total_dias
    FROM marcaje_asignacion a
    INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron AND p.activo = 1
    WHERE a.carnet = @carnet
      AND a.activo = 1
      AND a.fecha_inicio <= DATEADD(DAY, 6, @lunes)
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= @lunes)
    ORDER BY a.fecha_inicio DESC;

    IF @id_patron IS NULL
    BEGIN
        SELECT
            dd.fecha,
            DATENAME(WEEKDAY, dd.fecha) AS dia_semana,
            'SIN_ASIGNACION' AS estado,
            NULL AS nombre_horario,
            NULL AS hora_entrada,
            NULL AS hora_salida,
            0 AS es_nocturno,
            1 AS es_dia_libre
        FROM @dias dd
        ORDER BY dd.nro;
        RETURN;
    END

    -- Para cada día, resolver el horario
    SELECT
        dd.fecha,
        DATENAME(WEEKDAY, dd.fecha) AS dia_semana,
        CASE
            WHEN det.id_horario IS NULL THEN 'DIA_LIBRE'
            ELSE 'DIA_LABORAL'
        END AS estado,
        h.nombre AS nombre_horario,
        h.hora_entrada,
        h.hora_salida,
        ISNULL(h.es_nocturno, 0) AS es_nocturno,
        CASE WHEN det.id_horario IS NULL THEN 1 ELSE 0 END AS es_dia_libre,
        (DATEDIFF(DAY, @fecha_inicio, dd.fecha) % @total_dias) + 1 AS nro_dia_ciclo,
        det.etiqueta AS etiqueta_dia,
        h.duracion_horas,
        h.tolerancia_min
    FROM @dias dd
    LEFT JOIN marcaje_patrones_detalle det
        ON det.id_patron = @id_patron
       AND det.nro_dia = (DATEDIFF(DAY, @fecha_inicio, dd.fecha) % @total_dias) + 1
    LEFT JOIN marcaje_horarios h ON h.id_horario = det.id_horario
    ORDER BY dd.nro;
END;
GO


-- ═════════════════════════════════════════════════════
-- DATOS INICIALES: Horarios y Patrones comunes
-- ═════════════════════════════════════════════════════

-- Solo insertar si no existe data
IF NOT EXISTS (SELECT 1 FROM marcaje_horarios)
BEGIN
    -- Horarios base
    INSERT INTO marcaje_horarios (nombre, hora_entrada, hora_salida, duracion_horas, es_nocturno, tolerancia_min, descanso_min)
    VALUES
        ('Administrativo 08:00-17:00',  '08:00', '17:00', 8.00, 0, 10, 60),
        ('Administrativo 07:00-16:00',  '07:00', '16:00', 8.00, 0, 10, 60),
        ('Medio Tiempo AM 08:00-12:00', '08:00', '12:00', 4.00, 0, 10, 0),
        ('Medio Tiempo PM 13:00-17:00', '13:00', '17:00', 4.00, 0, 10, 0),
        ('Turno Noche 22:00-06:00',     '22:00', '06:00', 8.00, 1, 10, 30),
        ('Turno Mixto 14:00-22:00',     '14:00', '22:00', 8.00, 0, 10, 30),
        ('Guardia 06:00-18:00',         '06:00', '18:00', 12.00, 0, 15, 60),
        ('Guardia Noche 18:00-06:00',   '18:00', '06:00', 12.00, 1, 15, 60);

    PRINT '✅ Horarios iniciales insertados (8)';
END
GO

IF NOT EXISTS (SELECT 1 FROM marcaje_patrones)
BEGIN
    -- Patrón 1: 5x2 Administrativo clásico (Lun-Vie trabajo, Sab-Dom libre)
    INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
    VALUES ('5x2 Administrativo', 7, 'Lunes a Viernes laboral, Sábado y Domingo libre');

    DECLARE @p1 INT = SCOPE_IDENTITY();
    INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta) VALUES
        (@p1, 1, 1, 'Lunes'),      -- Horario 1 = Admin 08-17
        (@p1, 2, 1, 'Martes'),
        (@p1, 3, 1, 'Miércoles'),
        (@p1, 4, 1, 'Jueves'),
        (@p1, 5, 1, 'Viernes'),
        (@p1, 6, NULL, 'Sábado'),   -- NULL = día libre
        (@p1, 7, NULL, 'Domingo');

    -- Patrón 2: 4x4 Rotativo (Guardia diurna)
    INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
    VALUES ('4x4 Rotativo Día', 8, '4 días de guardia diurna 06-18, 4 días libres');

    DECLARE @p2 INT = SCOPE_IDENTITY();
    INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta) VALUES
        (@p2, 1, 7, 'Día 1 - Guardia'),   -- Horario 7 = Guardia 06-18
        (@p2, 2, 7, 'Día 2 - Guardia'),
        (@p2, 3, 7, 'Día 3 - Guardia'),
        (@p2, 4, 7, 'Día 4 - Guardia'),
        (@p2, 5, NULL, 'Día 5 - Libre'),
        (@p2, 6, NULL, 'Día 6 - Libre'),
        (@p2, 7, NULL, 'Día 7 - Libre'),
        (@p2, 8, NULL, 'Día 8 - Libre');

    -- Patrón 3: 4x4 Rotativo Noche
    INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
    VALUES ('4x4 Rotativo Noche', 8, '4 noches de guardia 18-06, 4 días libres');

    DECLARE @p3 INT = SCOPE_IDENTITY();
    INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta) VALUES
        (@p3, 1, 8, 'Noche 1 - Guardia'),  -- Horario 8 = Guardia Noche 18-06
        (@p3, 2, 8, 'Noche 2 - Guardia'),
        (@p3, 3, 8, 'Noche 3 - Guardia'),
        (@p3, 4, 8, 'Noche 4 - Guardia'),
        (@p3, 5, NULL, 'Día 5 - Libre'),
        (@p3, 6, NULL, 'Día 6 - Libre'),
        (@p3, 7, NULL, 'Día 7 - Libre'),
        (@p3, 8, NULL, 'Día 8 - Libre');

    -- Patrón 4: 6x1 (6 días trabajo, 1 libre)
    INSERT INTO marcaje_patrones (nombre, total_dias, descripcion)
    VALUES ('6x1 Comercial', 7, '6 días de trabajo, Domingo libre');

    DECLARE @p4 INT = SCOPE_IDENTITY();
    INSERT INTO marcaje_patrones_detalle (id_patron, nro_dia, id_horario, etiqueta) VALUES
        (@p4, 1, 1, 'Lunes'),
        (@p4, 2, 1, 'Martes'),
        (@p4, 3, 1, 'Miércoles'),
        (@p4, 4, 1, 'Jueves'),
        (@p4, 5, 1, 'Viernes'),
        (@p4, 6, 1, 'Sábado'),
        (@p4, 7, NULL, 'Domingo');

    PRINT '✅ Patrones iniciales insertados (4 patrones con detalle)';
END
GO

PRINT '═══════════════════════════════════════════════════';
PRINT '✅ v10 — Módulo de Jornada Laboral completado';
PRINT '   Tablas: marcaje_horarios, marcaje_patrones,';
PRINT '           marcaje_patrones_detalle, marcaje_asignacion';
PRINT '   SPs:    sp_jornada_resolver, sp_jornada_semana';
PRINT '═══════════════════════════════════════════════════';
GO
