-- =============================================================================
-- SQL Server DDL - Módulo Acceso (Permisos/Visibilidad)
-- Para crear en la base de datos de Planificación (SQL Server)
-- =============================================================================

-- =============================================================================
-- 1) p_organizacion_nodos (PK = idorg)
-- =============================================================================
IF OBJECT_ID('dbo.p_delegacion_visibilidad', 'U') IS NOT NULL DROP TABLE dbo.p_delegacion_visibilidad;
IF OBJECT_ID('dbo.p_permiso_empleado', 'U') IS NOT NULL DROP TABLE dbo.p_permiso_empleado;
IF OBJECT_ID('dbo.p_permiso_area', 'U') IS NOT NULL DROP TABLE dbo.p_permiso_area;
IF OBJECT_ID('dbo.p_empleados', 'U') IS NOT NULL DROP TABLE dbo.p_empleados;
IF OBJECT_ID('dbo.p_organizacion_nodos', 'U') IS NOT NULL DROP TABLE dbo.p_organizacion_nodos;
GO

CREATE TABLE dbo.p_organizacion_nodos
(
    idorg        BIGINT NOT NULL,
    padre        BIGINT NULL,
    descripcion  NVARCHAR(100) NULL,
    tipo         NVARCHAR(50) NULL,
    estado       NVARCHAR(50) NULL,
    nivel        NVARCHAR(200) NULL,
    updated_at   DATETIME2(0) NOT NULL CONSTRAINT DF_p_org_updated DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_p_organizacion_nodos PRIMARY KEY CLUSTERED (idorg),
    CONSTRAINT FK_p_org_padre FOREIGN KEY (padre) REFERENCES dbo.p_organizacion_nodos(idorg)
);
GO

CREATE INDEX IX_p_org_padre ON dbo.p_organizacion_nodos(padre);
GO


-- =============================================================================
-- 2) p_empleados (PK = carnet)
-- =============================================================================
CREATE TABLE dbo.p_empleados
(
    carnet          NVARCHAR(100) NOT NULL,
    nombre_completo NVARCHAR(203) NULL,
    correo          NVARCHAR(100) NULL,
    cargo           NVARCHAR(100) NULL,

    idorg           BIGINT NULL,
    carnet_jefe1    NVARCHAR(100) NULL,
    carnet_jefe2    NVARCHAR(100) NULL,
    carnet_jefe3    NVARCHAR(100) NULL,
    carnet_jefe4    NVARCHAR(100) NULL,

    fechabaja       DATETIME NULL,
    activo          AS (CASE WHEN fechabaja IS NULL OR CONVERT(date,fechabaja) = CONVERT(date,'0001-01-01') THEN 1 ELSE 0 END) PERSISTED,

    updated_at      DATETIME2(0) NOT NULL CONSTRAINT DF_p_emp_updated DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_p_empleados PRIMARY KEY CLUSTERED (carnet),
    CONSTRAINT FK_p_emp_org FOREIGN KEY (idorg) REFERENCES dbo.p_organizacion_nodos(idorg)
);
GO

CREATE UNIQUE INDEX UX_p_emp_correo ON dbo.p_empleados(correo) WHERE correo IS NOT NULL;
CREATE INDEX IX_p_emp_idorg ON dbo.p_empleados(idorg);
CREATE INDEX IX_p_emp_jefe1 ON dbo.p_empleados(carnet_jefe1);
GO


-- =============================================================================
-- 3) p_permiso_area
-- =============================================================================
CREATE TABLE dbo.p_permiso_area
(
    id              BIGINT IDENTITY(1,1) NOT NULL,
    carnet_otorga   NVARCHAR(100) NULL,
    carnet_recibe   NVARCHAR(100) NOT NULL,
    idorg_raiz      BIGINT NOT NULL,

    alcance         NVARCHAR(20) NOT NULL CONSTRAINT DF_perm_area_alc DEFAULT ('SUBARBOL'),
    activo          BIT NOT NULL CONSTRAINT DF_perm_area_act DEFAULT (1),

    fecha_inicio    DATE NOT NULL CONSTRAINT DF_perm_area_ini DEFAULT (CONVERT(date, GETDATE())),
    fecha_fin       DATE NULL,
    motivo          NVARCHAR(300) NULL,
    creado_en       DATETIME2(0) NOT NULL CONSTRAINT DF_perm_area_creado DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_p_permiso_area PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_perm_area_otorga FOREIGN KEY (carnet_otorga) REFERENCES dbo.p_empleados(carnet),
    CONSTRAINT FK_perm_area_recibe FOREIGN KEY (carnet_recibe) REFERENCES dbo.p_empleados(carnet),
    CONSTRAINT FK_perm_area_idorg FOREIGN KEY (idorg_raiz) REFERENCES dbo.p_organizacion_nodos(idorg),
    CONSTRAINT CK_perm_area_alcance CHECK (alcance IN ('SUBARBOL', 'SOLO_NODO'))
);
GO

CREATE INDEX IX_perm_area_recibe_act ON dbo.p_permiso_area(carnet_recibe, activo) INCLUDE (idorg_raiz, fecha_fin, alcance);
GO


-- =============================================================================
-- 4) p_permiso_empleado
-- =============================================================================
CREATE TABLE dbo.p_permiso_empleado
(
    id              BIGINT IDENTITY(1,1) NOT NULL,
    carnet_otorga   NVARCHAR(100) NULL,
    carnet_recibe   NVARCHAR(100) NOT NULL,
    carnet_objetivo NVARCHAR(100) NOT NULL,

    activo          BIT NOT NULL CONSTRAINT DF_perm_emp_act DEFAULT (1),

    fecha_inicio    DATE NOT NULL CONSTRAINT DF_perm_emp_ini DEFAULT (CONVERT(date, GETDATE())),
    fecha_fin       DATE NULL,
    motivo          NVARCHAR(300) NULL,
    creado_en       DATETIME2(0) NOT NULL CONSTRAINT DF_perm_emp_creado DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_p_permiso_empleado PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_perm_emp_otorga FOREIGN KEY (carnet_otorga) REFERENCES dbo.p_empleados(carnet),
    CONSTRAINT FK_perm_emp_recibe FOREIGN KEY (carnet_recibe) REFERENCES dbo.p_empleados(carnet),
    CONSTRAINT FK_perm_emp_objetivo FOREIGN KEY (carnet_objetivo) REFERENCES dbo.p_empleados(carnet)
);
GO

CREATE UNIQUE INDEX UX_perm_emp_recibe_obj_act ON dbo.p_permiso_empleado(carnet_recibe, carnet_objetivo) WHERE activo = 1;
CREATE INDEX IX_perm_emp_recibe_act ON dbo.p_permiso_empleado(carnet_recibe, activo) INCLUDE (carnet_objetivo, fecha_fin);
GO


-- =============================================================================
-- 5) p_delegacion_visibilidad
-- =============================================================================
CREATE TABLE dbo.p_delegacion_visibilidad
(
    id               BIGINT IDENTITY(1,1) NOT NULL,
    carnet_delegante NVARCHAR(100) NOT NULL,
    carnet_delegado  NVARCHAR(100) NOT NULL,

    activo           BIT NOT NULL CONSTRAINT DF_deleg_act DEFAULT (1),
    fecha_inicio     DATE NOT NULL CONSTRAINT DF_deleg_ini DEFAULT (CONVERT(date, GETDATE())),
    fecha_fin        DATE NULL,
    motivo           NVARCHAR(300) NULL,
    creado_en        DATETIME2(0) NOT NULL CONSTRAINT DF_deleg_creado DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_p_delegacion_visibilidad PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_deleg_delegante FOREIGN KEY (carnet_delegante) REFERENCES dbo.p_empleados(carnet),
    CONSTRAINT FK_deleg_delegado FOREIGN KEY (carnet_delegado) REFERENCES dbo.p_empleados(carnet)
);
GO

CREATE UNIQUE INDEX UX_deleg_pair_act ON dbo.p_delegacion_visibilidad(carnet_delegante, carnet_delegado) WHERE activo = 1;
CREATE INDEX IX_deleg_delegado_act ON dbo.p_delegacion_visibilidad(carnet_delegado, activo) INCLUDE (carnet_delegante, fecha_fin);
GO

-- Verificación
SELECT 
    t.name AS tabla,
    COUNT(c.name) AS columnas
FROM sys.tables t
JOIN sys.columns c ON t.object_id = c.object_id
WHERE t.name IN ('p_organizacion_nodos', 'p_empleados', 'p_permiso_area', 'p_permiso_empleado', 'p_delegacion_visibilidad')
GROUP BY t.name
ORDER BY t.name;
