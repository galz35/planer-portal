-- ============================================================
-- DDL: MÓDULO VISITA A CLIENTE (TABLAS)
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

CREATE TABLE vc_clientes (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    codigo        VARCHAR(50) NOT NULL UNIQUE,       -- Código interno Claro
    nombre        NVARCHAR(200) NOT NULL,
    direccion     NVARCHAR(500),
    telefono      VARCHAR(20),
    contacto      NVARCHAR(100),
    lat           DECIMAL(10,7),
    long          DECIMAL(10,7),
    radio_metros  INT NOT NULL DEFAULT 100,           -- Radio geofence en metros
    zona          NVARCHAR(100),                      -- Norte, Sur, Centro, etc.
    activo        BIT NOT NULL DEFAULT 1,
    importado_en  DATETIME2 DEFAULT GETDATE(),
    creado_en     DATETIME2 DEFAULT GETDATE()
);
GO
CREATE INDEX IX_vc_clientes_zona ON vc_clientes(zona, activo);
GO

CREATE TABLE vc_visitas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    carnet          VARCHAR(20) NOT NULL,             -- FK a usuario
    cliente_id      INT NOT NULL,                     -- FK a vc_clientes
    agenda_id       INT NULL,                         -- FK opcional a agenda_dia
    
    -- Check-in
    lat_inicio      DECIMAL(10,7),
    long_inicio     DECIMAL(10,7),
    accuracy_inicio DECIMAL(10,2),
    timestamp_inicio DATETIME2 NOT NULL,
    distancia_inicio_m INT,                           -- Metros al centro del cliente al hacer check-in
    valido_inicio   BIT NOT NULL DEFAULT 1,           -- 0 si fuera de geofence
    
    -- Check-out
    lat_fin         DECIMAL(10,7),
    long_fin        DECIMAL(10,7),
    accuracy_fin    DECIMAL(10,2),
    timestamp_fin   DATETIME2 NULL,
    
    -- Resultado
    duracion_minutos AS DATEDIFF(MINUTE, timestamp_inicio, timestamp_fin) PERSISTED,
    estado          VARCHAR(20) NOT NULL DEFAULT 'EN_CURSO', -- EN_CURSO, FINALIZADA, CANCELADA, INCOMPLETA
    observacion     NVARCHAR(MAX),
    
    -- Evidencia
    foto_path       NVARCHAR(500) NULL,
    firma_path      NVARCHAR(500) NULL,
    
    -- Auditoría
    motivo_fuera_zona NVARCHAR(300) NULL,
    offline_id      VARCHAR(100) NULL UNIQUE,         -- Para idempotencia offline
    sincronizado    BIT NOT NULL DEFAULT 1,
    creado_en       DATETIME2 DEFAULT GETDATE()
);
GO
CREATE INDEX IX_vc_visitas_carnet_fecha ON vc_visitas(carnet, timestamp_inicio DESC);
GO
CREATE INDEX IX_vc_visitas_cliente ON vc_visitas(cliente_id, timestamp_inicio DESC);
GO

CREATE TABLE vc_formularios_respuestas (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    visita_id   INT NOT NULL,
    campo_id    VARCHAR(50) NOT NULL,
    campo_label NVARCHAR(200) NOT NULL,
    valor       NVARCHAR(MAX),               -- JSON o texto plano
    tipo        VARCHAR(20) NOT NULL,        -- texto, numero, foto, firma, seleccion
    creado_en   DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE vc_tracking_gps (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    carnet      VARCHAR(20) NOT NULL,
    lat         DECIMAL(10,7) NOT NULL,
    long        DECIMAL(10,7) NOT NULL,
    accuracy    DECIMAL(10,2),
    velocidad   DECIMAL(10,2),               -- m/s
    timestamp   DATETIME2 NOT NULL,
    valido      BIT NOT NULL DEFAULT 1,       -- 0 si fue descartado por algoritmo
    fuente      VARCHAR(20) DEFAULT 'FOREGROUND', -- FOREGROUND | BACKGROUND | CHECK_IN | CHECK_OUT
    creado_en   DATETIME2 DEFAULT GETDATE()
);
GO
CREATE INDEX IX_vc_tracking_carnet ON vc_tracking_gps(carnet, timestamp DESC);
GO

CREATE TABLE vc_agenda_dia (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    carnet      VARCHAR(20) NOT NULL,
    cliente_id  INT NOT NULL,
    fecha       DATE NOT NULL,
    orden       INT NOT NULL DEFAULT 1,       -- Orden sugerido de visita
    estado      VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, EN_CURSO, FINALIZADA, REPROGRAMADA
    notas       NVARCHAR(500),
    visita_id   INT NULL,                    -- Se llena cuando se hace la visita
    creado_en   DATETIME2 DEFAULT GETDATE()
);
GO
CREATE UNIQUE INDEX IX_vc_agenda_unica ON vc_agenda_dia(carnet, cliente_id, fecha);
GO

CREATE TABLE vc_metas (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    carnet          VARCHAR(20) NOT NULL,
    periodo         VARCHAR(10) NOT NULL,    -- DIARIO | SEMANAL | MENSUAL
    meta_visitas    INT NOT NULL DEFAULT 10,
    meta_km         DECIMAL(10,2) NULL,
    costo_km        DECIMAL(10,4) DEFAULT 0.15, -- USD por km
    vigente_desde   DATE NOT NULL,
    vigente_hasta   DATE NULL,
    activo          BIT DEFAULT 1
);
GO

PRINT '✅ Tablas Visita a Cliente creadas exitosamente'
