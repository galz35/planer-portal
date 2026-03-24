-- =============================================================================
-- ETL/SYNC - Sincronización desde SIGHO1 hacia las tablas de Planificación
-- SQL Server (Planificación DB) obteniendo datos de SIGHO1
-- 
-- Ejecutar como job diario o cada X horas
-- =============================================================================

-- =============================================================================
-- 1) SYNC Organización
-- Desde: SIGHO1.dbo.organizacion
-- Hacia: dbo.p_organizacion_nodos
-- =============================================================================
PRINT '=== Sincronizando Organización ===';

-- Primero insertar nodos sin padre (raíces) para evitar FK violations
-- Luego el resto en orden
MERGE dbo.p_organizacion_nodos AS T
USING (
    SELECT
        CAST(idorg AS BIGINT) AS idorg,
        CAST(padre AS BIGINT) AS padre,
        descripcion,
        NULL AS tipo, -- Agregar si existe en tu tabla
        Estado AS estado,
        nivel
    FROM SIGHO1.dbo.organizacion
    WHERE idorg IS NOT NULL
) AS S
ON T.idorg = S.idorg
WHEN MATCHED THEN
    UPDATE SET
        T.padre = S.padre,
        T.descripcion = S.descripcion,
        T.tipo = S.tipo,
        T.estado = S.estado,
        T.nivel = S.nivel,
        T.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (idorg, padre, descripcion, tipo, estado, nivel)
    VALUES (S.idorg, NULL, S.descripcion, S.tipo, S.estado, S.nivel); -- padre null inicialmente

-- Actualizar padres en segunda pasada
UPDATE o
SET o.padre = s.padre
FROM dbo.p_organizacion_nodos o
JOIN (
    SELECT 
        CAST(idorg AS BIGINT) AS idorg,
        CAST(padre AS BIGINT) AS padre
    FROM SIGHO1.dbo.organizacion
    WHERE padre IS NOT NULL
) s ON o.idorg = s.idorg
WHERE o.padre IS NULL OR o.padre <> s.padre;

PRINT 'Organización sincronizada: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' registros';


-- =============================================================================
-- 2) SYNC Empleados
-- Desde: SIGHO1.dbo.EMP2024
-- Hacia: dbo.p_empleados
-- =============================================================================
PRINT '=== Sincronizando Empleados ===';

MERGE dbo.p_empleados AS T
USING (
    SELECT
        LTRIM(RTRIM(carnet)) AS carnet,
        nombre_completo,
        correo,
        cargo,
        CAST(idorg AS BIGINT) AS idorg,
        carnet_jefe1,
        carnet_jefe2,
        carnet_jefe3,
        carnet_jefe4,
        fechabaja
    FROM SIGHO1.dbo.EMP2024
    WHERE ISNULL(LTRIM(RTRIM(carnet)), '') <> ''
    -- Opcional: filtrar solo activos
    -- AND (fechabaja IS NULL OR CONVERT(date, fechabaja) = '0001-01-01')
) AS S
ON T.carnet = S.carnet COLLATE Latin1_General_CI_AS
WHEN MATCHED THEN
    UPDATE SET
        T.nombre_completo = S.nombre_completo,
        T.correo = S.correo,
        T.cargo = S.cargo,
        T.idorg = S.idorg,
        T.carnet_jefe1 = S.carnet_jefe1,
        T.carnet_jefe2 = S.carnet_jefe2,
        T.carnet_jefe3 = S.carnet_jefe3,
        T.carnet_jefe4 = S.carnet_jefe4,
        T.fechabaja = S.fechabaja,
        T.updated_at = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (carnet, nombre_completo, correo, cargo, idorg, carnet_jefe1, carnet_jefe2, carnet_jefe3, carnet_jefe4, fechabaja)
    VALUES (S.carnet, S.nombre_completo, S.correo, S.cargo, S.idorg, S.carnet_jefe1, S.carnet_jefe2, S.carnet_jefe3, S.carnet_jefe4, S.fechabaja);

PRINT 'Empleados sincronizados: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' registros';


-- =============================================================================
-- 3) VERIFICACIÓN
-- =============================================================================
PRINT '=== Verificación ===';

SELECT 'p_organizacion_nodos' AS tabla, COUNT(*) AS total FROM dbo.p_organizacion_nodos
UNION ALL
SELECT 'p_empleados', COUNT(*) FROM dbo.p_empleados
UNION ALL
SELECT 'p_empleados_activos', COUNT(*) FROM dbo.p_empleados WHERE activo = 1;

PRINT '=== Sync completado ===';
