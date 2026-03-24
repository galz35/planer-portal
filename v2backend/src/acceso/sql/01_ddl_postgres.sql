-- =============================================================================
-- DDL PostgreSQL - Módulo Acceso (Permisos/Visibilidad)
-- Planificación Backend
-- 
-- IMPORTANTE: Este script crea las tablas base para el sistema de permisos.
-- TypeORM con synchronize:true las creará automáticamente, pero este DDL
-- sirve como referencia o para crear manualmente en producción.
-- =============================================================================

-- =============================================================================
-- 1) p_organizacion_nodos - Árbol organizacional (desde SIGHO1.dbo.organizacion)
-- PK = idorg (el ID lógico real del nodo, NO el identity)
-- =============================================================================
DROP TABLE IF EXISTS p_empleados CASCADE;
DROP TABLE IF EXISTS p_permiso_area CASCADE;
DROP TABLE IF EXISTS p_permiso_empleado CASCADE;
DROP TABLE IF EXISTS p_delegacion_visibilidad CASCADE;
DROP TABLE IF EXISTS p_organizacion_nodos CASCADE;

CREATE TABLE p_organizacion_nodos
(
    idorg        BIGINT PRIMARY KEY,
    padre        BIGINT REFERENCES p_organizacion_nodos(idorg),
    descripcion  VARCHAR(100),
    tipo         VARCHAR(50),
    estado       VARCHAR(50),
    nivel        VARCHAR(200),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_p_org_padre ON p_organizacion_nodos(padre);

COMMENT ON TABLE p_organizacion_nodos IS 'Árbol organizacional sincronizado desde SIGHO1.dbo.organizacion';
COMMENT ON COLUMN p_organizacion_nodos.idorg IS 'ID lógico real del nodo (no el identity)';
COMMENT ON COLUMN p_organizacion_nodos.padre IS 'idorg del nodo padre (NULL para raíz)';


-- =============================================================================
-- 2) p_empleados - Empleados normalizados (desde SIGHO1.dbo.EMP2024)
-- PK = carnet (string único, clave de negocio)
-- =============================================================================
CREATE TABLE p_empleados
(
    carnet           VARCHAR(100) PRIMARY KEY,
    nombre_completo  VARCHAR(203),
    correo           VARCHAR(100) UNIQUE,
    cargo            VARCHAR(100),
    
    idorg            BIGINT REFERENCES p_organizacion_nodos(idorg),
    carnet_jefe1     VARCHAR(100),
    carnet_jefe2     VARCHAR(100),
    carnet_jefe3     VARCHAR(100),
    carnet_jefe4     VARCHAR(100),
    
    fechabaja        TIMESTAMP,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_p_empleados_idorg ON p_empleados(idorg);
CREATE INDEX ix_p_empleados_jefe1 ON p_empleados(carnet_jefe1);
CREATE INDEX ix_p_empleados_activo ON p_empleados(activo);

COMMENT ON TABLE p_empleados IS 'Empleados normalizados desde SIGHO1.dbo.EMP2024 - carnet como PK';
COMMENT ON COLUMN p_empleados.carnet IS 'Identificador único del empleado (PK)';
COMMENT ON COLUMN p_empleados.idorg IS 'FK al nodo organizacional donde pertenece';


-- =============================================================================
-- 3) p_permiso_area - Permiso por área/subárbol
-- "Este usuario puede ver este nodo y su subárbol"
-- =============================================================================
CREATE TABLE p_permiso_area
(
    id              BIGSERIAL PRIMARY KEY,
    carnet_otorga   VARCHAR(100) REFERENCES p_empleados(carnet),
    carnet_recibe   VARCHAR(100) NOT NULL REFERENCES p_empleados(carnet),
    idorg_raiz      BIGINT NOT NULL REFERENCES p_organizacion_nodos(idorg),
    
    alcance         VARCHAR(20) NOT NULL DEFAULT 'SUBARBOL',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    
    fecha_inicio    DATE DEFAULT CURRENT_DATE,
    fecha_fin       DATE,
    motivo          VARCHAR(300),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT ck_permiso_area_alcance CHECK (alcance IN ('SUBARBOL', 'SOLO_NODO'))
);

CREATE INDEX ix_permiso_area_recibe_activo ON p_permiso_area(carnet_recibe, activo);
CREATE INDEX ix_permiso_area_idorg ON p_permiso_area(idorg_raiz);

COMMENT ON TABLE p_permiso_area IS 'Permisos por área/subárbol organizacional';
COMMENT ON COLUMN p_permiso_area.alcance IS 'SUBARBOL: incluye hijos | SOLO_NODO: solo ese nodo';


-- =============================================================================
-- 4) p_permiso_empleado - Permiso puntual por empleado
-- "Este usuario puede ver a este empleado específico"
-- =============================================================================
CREATE TABLE p_permiso_empleado
(
    id              BIGSERIAL PRIMARY KEY,
    carnet_otorga   VARCHAR(100) REFERENCES p_empleados(carnet),
    carnet_recibe   VARCHAR(100) NOT NULL REFERENCES p_empleados(carnet),
    carnet_objetivo VARCHAR(100) NOT NULL REFERENCES p_empleados(carnet),
    
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    
    fecha_inicio    DATE DEFAULT CURRENT_DATE,
    fecha_fin       DATE,
    motivo          VARCHAR(300),
    creado_en       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Evita duplicados activos para el mismo par
CREATE UNIQUE INDEX ux_permiso_emp_recibe_objetivo_activo 
ON p_permiso_empleado(carnet_recibe, carnet_objetivo) 
WHERE activo = TRUE;

CREATE INDEX ix_permiso_emp_recibe_activo ON p_permiso_empleado(carnet_recibe, activo);

COMMENT ON TABLE p_permiso_empleado IS 'Permisos puntuales por empleado específico';


-- =============================================================================
-- 5) p_delegacion_visibilidad - Delegación de visibilidad
-- "La secretaria ve lo que ve el gerente"
-- =============================================================================
CREATE TABLE p_delegacion_visibilidad
(
    id               BIGSERIAL PRIMARY KEY,
    carnet_delegante VARCHAR(100) NOT NULL REFERENCES p_empleados(carnet),
    carnet_delegado  VARCHAR(100) NOT NULL REFERENCES p_empleados(carnet),
    
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    
    fecha_inicio     DATE DEFAULT CURRENT_DATE,
    fecha_fin        DATE,
    motivo           VARCHAR(300),
    creado_en        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Evita duplicados activos para el mismo par
CREATE UNIQUE INDEX ux_delegacion_pair_activo 
ON p_delegacion_visibilidad(carnet_delegante, carnet_delegado) 
WHERE activo = TRUE;

CREATE INDEX ix_delegacion_delegado_activo ON p_delegacion_visibilidad(carnet_delegado, activo);

COMMENT ON TABLE p_delegacion_visibilidad IS 'Delegación de visibilidad (ej: secretaria ve lo del gerente)';
COMMENT ON COLUMN p_delegacion_visibilidad.carnet_delegante IS 'El gerente que delega su visibilidad';
COMMENT ON COLUMN p_delegacion_visibilidad.carnet_delegado IS 'La secretaria que recibe la delegación';


-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('p_organizacion_nodos', 'p_empleados', 'p_permiso_area', 'p_permiso_empleado', 'p_delegacion_visibilidad')
ORDER BY table_name;
