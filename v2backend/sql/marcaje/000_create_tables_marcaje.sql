-- ============================================================
-- DDL: MÓDULO MARCAJE WEB (TABLAS)
-- ============================================================

CREATE TABLE marcaje_sites (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    nombre        NVARCHAR(200) NOT NULL,
    lat           DECIMAL(10,7) NOT NULL,
    long          DECIMAL(10,7) NOT NULL,
    radio_metros  INT NOT NULL DEFAULT 200,
    accuracy_max  INT NOT NULL DEFAULT 100,
    activo        BIT NOT NULL DEFAULT 1,
    creado_en     DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE marcaje_ip_whitelist (
    id      INT IDENTITY(1,1) PRIMARY KEY,
    nombre  NVARCHAR(200) NOT NULL,
    cidr    VARCHAR(50) NOT NULL,    -- Ej: '10.0.0.0/8'
    activo  BIT NOT NULL DEFAULT 1
);

CREATE TABLE marcaje_devices (
    uuid              VARCHAR(100) PRIMARY KEY,
    carnet            VARCHAR(20) NOT NULL, -- FK a tabla empleados
    user_agent        NVARCHAR(500),
    last_login        DATETIME2,
    ip_ultimo         VARCHAR(50),
    estado            VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, ACTIVE, BLOCKED
    codigo_activacion VARCHAR(10),
    fecha_activacion  DATETIME2,
    activo            BIT NOT NULL DEFAULT 1,
    creado_en         DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE marcaje_asistencias (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    carnet         VARCHAR(20) NOT NULL,
    lat            DECIMAL(10,7),
    long           DECIMAL(10,7),
    accuracy       DECIMAL(10,2),
    ip             VARCHAR(50),
    user_agent     NVARCHAR(500),
    device_uuid    VARCHAR(100),
    tipo_device    VARCHAR(20) NOT NULL,       -- 'MOBILE' | 'DESKTOP'
    tipo_marcaje   VARCHAR(30) NOT NULL,       -- 'ENTRADA' | 'SALIDA' | 'INICIO_EXTRA' | 'FIN_EXTRA' | 'INICIO_COMPENSADA' | 'FIN_COMPENSADA'
    fecha          DATETIME2 NOT NULL,
    estado         VARCHAR(20) NOT NULL DEFAULT 'ACEPTADA',
    motivo         NVARCHAR(MAX),
    offline_id     VARCHAR(100),
    creado_en      DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_marcaje_asistencias_carnet_fecha ON marcaje_asistencias (carnet, fecha DESC);

CREATE TABLE marcaje_solicitudes (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    carnet            VARCHAR(20) NOT NULL,
    asistencia_id     INT NULL,  -- FK opcional a marcaje_asistencias
    tipo_solicitud    VARCHAR(50) NOT NULL,  -- 'CORRECCION_ASISTENCIA', 'ELIMINAR_SALIDA'
    motivo            NVARCHAR(MAX) NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE', -- PENDIENTE, APROBADA, RECHAZADA
    admin_comentario  NVARCHAR(500),
    creado_en         DATETIME2 NOT NULL DEFAULT GETDATE(),
    resuelto_en       DATETIME2
);

CREATE TABLE marcaje_config_usuario (
    carnet              VARCHAR(20) PRIMARY KEY,
    permitir_movil      BIT NOT NULL DEFAULT 1,
    permitir_escritorio BIT NOT NULL DEFAULT 1,
    gps_background      BIT NOT NULL DEFAULT 0,  -- Tracking GPS en segundo plano
    activo              BIT NOT NULL DEFAULT 1,
    actualizado_en      DATETIME2 NOT NULL DEFAULT GETDATE()
);

CREATE TABLE marcaje_gps_tracking (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    carnet     VARCHAR(20) NOT NULL,
    lat        DECIMAL(10,7) NOT NULL,
    long       DECIMAL(10,7) NOT NULL,
    accuracy   DECIMAL(10,2),
    timestamp  DATETIME2 NOT NULL,
    fuente     VARCHAR(20) DEFAULT 'BACKGROUND', -- BACKGROUND | FOREGROUND
    creado_en  DATETIME2 NOT NULL DEFAULT GETDATE()
);
CREATE INDEX IX_marcaje_gps_tracking_carnet ON marcaje_gps_tracking (carnet, timestamp DESC);

PRINT '✅ Tablas Marcaje Web creadas exitosamente'
