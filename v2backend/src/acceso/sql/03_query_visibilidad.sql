-- =============================================================================
-- QUERY MAESTRA: Obtener carnets visibles para un usuario
-- 
-- Combina:
-- 1. Actores efectivos (delegación secretaria-gerente)
-- 2. Seeds de árbol (idorg propio + permisos por área)
-- 3. Subárbol organizacional (CTE recursivo)
-- 4. Permisos puntuales por empleado
-- =============================================================================

-- =============================================================================
-- SQL SERVER VERSION
-- Parámetro: @carnetSolicitante
-- =============================================================================
DECLARE @carnetSolicitante NVARCHAR(100) = 'ABC123'; -- Reemplazar con el carnet real

;WITH
-- 1) Actores por delegación (secretaria hereda gerente)
Actores AS (
    SELECT @carnetSolicitante AS carnet
    UNION
    SELECT d.carnet_delegante
    FROM dbo.p_delegacion_visibilidad d
    WHERE d.carnet_delegado = @carnetSolicitante
      AND d.activo = 1
      AND (d.fecha_fin IS NULL OR d.fecha_fin >= CONVERT(date, GETDATE()))
),

-- 2) Semillas idorg: mi idorg + permisos por área activos
Seeds AS (
    -- Mi idorg personal
    SELECT e.idorg
    FROM dbo.p_empleados e
    JOIN Actores a ON a.carnet = e.carnet
    WHERE e.idorg IS NOT NULL

    UNION

    -- idorg de permisos por área
    SELECT pa.idorg_raiz
    FROM dbo.p_permiso_area pa
    JOIN Actores a ON a.carnet = pa.carnet_recibe
    WHERE pa.activo = 1
      AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CONVERT(date, GETDATE()))
),

-- 3) Árbol organizacional completo bajo Seeds (CTE recursivo)
Arbol AS (
    -- Ancla: los nodos semilla
    SELECT o.idorg
    FROM dbo.p_organizacion_nodos o
    WHERE o.idorg IN (SELECT idorg FROM Seeds)

    UNION ALL

    -- Recursión: hijos de cada nodo
    SELECT child.idorg
    FROM dbo.p_organizacion_nodos child
    JOIN Arbol parent ON child.padre = parent.idorg
),

-- 4) Empleados visibles por estar en el subárbol
VisiblesOrg AS (
    SELECT e.carnet
    FROM dbo.p_empleados e
    WHERE e.idorg IN (SELECT idorg FROM Arbol)
),

-- 5) Empleados visibles por permiso puntual
VisiblesPuntual AS (
    SELECT pe.carnet_objetivo AS carnet
    FROM dbo.p_permiso_empleado pe
    JOIN Actores a ON a.carnet = pe.carnet_recibe
    WHERE pe.activo = 1
      AND (pe.fecha_fin IS NULL OR pe.fecha_fin >= CONVERT(date, GETDATE()))
)

-- Resultado final: UNION de todos los visibles
SELECT DISTINCT v.carnet
FROM (
    SELECT carnet FROM VisiblesOrg
    UNION
    SELECT carnet FROM VisiblesPuntual
    UNION
    SELECT carnet FROM Actores -- Incluye al solicitante
) v
JOIN dbo.p_empleados e ON e.carnet = v.carnet
-- Filtrar solo activos
WHERE e.activo = 1
-- IMPORTANTE: Si el árbol es profundo
OPTION (MAXRECURSION 32767);


-- =============================================================================
-- POSTGRESQL VERSION
-- Parámetro: $1 (el carnet del solicitante)
-- =============================================================================
/*
WITH RECURSIVE
Actores AS (
    SELECT $1::text AS carnet
    UNION
    SELECT d.carnet_delegante
    FROM p_delegacion_visibilidad d
    WHERE d.carnet_delegado = $1
      AND d.activo = true
      AND (d.fecha_fin IS NULL OR d.fecha_fin >= CURRENT_DATE)
),

Seeds AS (
    SELECT e.idorg
    FROM p_empleados e
    JOIN Actores a ON a.carnet = e.carnet
    WHERE e.idorg IS NOT NULL

    UNION

    SELECT pa.idorg_raiz
    FROM p_permiso_area pa
    JOIN Actores a ON a.carnet = pa.carnet_recibe
    WHERE pa.activo = true
      AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CURRENT_DATE)
),

Arbol AS (
    SELECT idorg
    FROM p_organizacion_nodos
    WHERE idorg IN (SELECT idorg FROM Seeds)

    UNION ALL

    SELECT child.idorg
    FROM p_organizacion_nodos child
    JOIN Arbol parent ON child.padre = parent.idorg
),

VisiblesOrg AS (
    SELECT carnet FROM p_empleados WHERE idorg IN (SELECT idorg FROM Arbol)
),

VisiblesPuntual AS (
    SELECT carnet_objetivo AS carnet
    FROM p_permiso_empleado
    WHERE activo = true
      AND carnet_recibe IN (SELECT carnet FROM Actores)
      AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
)

SELECT DISTINCT v.carnet
FROM (
    SELECT carnet FROM VisiblesOrg
    UNION
    SELECT carnet FROM VisiblesPuntual
    UNION
    SELECT carnet FROM Actores
) v
JOIN p_empleados e ON e.carnet = v.carnet
WHERE e.activo = true;
*/
