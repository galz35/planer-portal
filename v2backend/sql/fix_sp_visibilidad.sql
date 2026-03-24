-- =================================================================
-- FIX: sp_Visibilidad_ObtenerCarnets
-- Problema: El SP anterior devolvía TODOS los carnets sin importar quién preguntaba.
-- Solución: Calcular visibilidad real basándose en:
--   1. El propio usuario (siempre se ve a sí mismo)
--   2. Jerarquía directa (subordinados por jefeCarnet, recursivo)
--   3. Permisos por empleado (p_permiso_empleado ALLOW activos)
--   4. Permisos por área (p_permiso_area → usuarios cuya gerencia/subgerencia/primer_nivel coincida)
--   5. Delegaciones activas (hereda la visibilidad del delegante)
-- =================================================================

ALTER PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets]
    @carnetSolicitante NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetSolicitante, N'')));
    IF @c = '' RETURN;

    -- Verificar si el usuario es Admin (ve todo)
    DECLARE @esAdmin BIT = 0;
    SELECT @esAdmin = CASE 
        WHEN rolGlobal IN ('Admin', 'Administrador', 'SuperAdmin') THEN 1 
        ELSE 0 
    END
    FROM p_Usuarios 
    WHERE LTRIM(RTRIM(carnet)) = @c AND activo = 1;

    IF @esAdmin = 1
    BEGIN
        -- Admin ve todos los activos
        SELECT DISTINCT LTRIM(RTRIM(carnet)) AS carnet
        FROM p_Usuarios
        WHERE activo = 1 AND carnet IS NOT NULL AND carnet <> '';
        RETURN;
    END;

    -- Tabla temporal para acumular carnets visibles
    CREATE TABLE #visibles (carnet NVARCHAR(50) COLLATE Latin1_General_CI_AS PRIMARY KEY);

    -- 1. Siempre se ve a sí mismo
    INSERT INTO #visibles (carnet) VALUES (@c);

    -- 2. Subordinados directos (jefeCarnet), recursivo hasta 5 niveles
    ;WITH SubordinadosCTE AS (
        -- Nivel 1: subordinados directos
        SELECT LTRIM(RTRIM(carnet)) AS carnet
        FROM p_Usuarios
        WHERE LTRIM(RTRIM(ISNULL(jefeCarnet, ''))) = @c 
          AND activo = 1 
          AND carnet IS NOT NULL AND carnet <> ''

        UNION ALL

        -- Niveles siguientes
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet
        FROM p_Usuarios u
        INNER JOIN SubordinadosCTE s ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = s.carnet
        WHERE u.activo = 1 
          AND u.carnet IS NOT NULL AND u.carnet <> ''
    )
    INSERT INTO #visibles (carnet)
    SELECT DISTINCT carnet FROM SubordinadosCTE
    WHERE carnet NOT IN (SELECT carnet FROM #visibles)
    OPTION (MAXRECURSION 5);

    -- 3. Permisos por empleado (ALLOW)
    INSERT INTO #visibles (carnet)
    SELECT DISTINCT LTRIM(RTRIM(pe.carnet_objetivo))
    FROM p_permiso_empleado pe
    WHERE LTRIM(RTRIM(pe.carnet_recibe)) = @c
      AND pe.activo = 1
      AND pe.tipo_acceso = 'ALLOW'
      AND pe.carnet_objetivo IS NOT NULL AND pe.carnet_objetivo <> ''
      AND LTRIM(RTRIM(pe.carnet_objetivo)) NOT IN (SELECT carnet FROM #visibles);

    -- 4. Permisos por área: buscar el nombre del nodo de organización (descripcion)
    --    y hacer match contra primer_nivel, subgerencia o gerencia de p_Usuarios
    INSERT INTO #visibles (carnet)
    SELECT DISTINCT LTRIM(RTRIM(u.carnet))
    FROM p_permiso_area pa
    LEFT JOIN p_organizacion_nodos org ON pa.idorg_raiz = org.idorg
    INNER JOIN p_Usuarios u ON u.activo = 1 AND u.carnet IS NOT NULL AND u.carnet <> ''
      AND (
        -- Match por idOrg directo si el usuario tiene idOrg
        u.idOrg = pa.idorg_raiz
        -- O match por nombre si no tiene idOrg pero sí nombre_area o descripción del nodo
        OR LTRIM(RTRIM(ISNULL(u.primer_nivel, ''))) = LTRIM(RTRIM(ISNULL(COALESCE(pa.nombre_area, org.descripcion), '')))
        OR LTRIM(RTRIM(ISNULL(u.subgerencia, ''))) = LTRIM(RTRIM(ISNULL(COALESCE(pa.nombre_area, org.descripcion), '')))
        OR LTRIM(RTRIM(ISNULL(u.gerencia, ''))) = LTRIM(RTRIM(ISNULL(COALESCE(pa.nombre_area, org.descripcion), '')))
      )
    WHERE LTRIM(RTRIM(pa.carnet_recibe)) = @c
      AND pa.activo = 1
      AND (pa.tipo_acceso IS NULL OR pa.tipo_acceso = 'ALLOW')
      AND LTRIM(RTRIM(u.carnet)) NOT IN (SELECT carnet FROM #visibles);

    -- 5. Delegaciones: heredar visibilidad del delegante
    INSERT INTO #visibles (carnet)
    SELECT DISTINCT LTRIM(RTRIM(u.carnet))
    FROM p_delegacion_visibilidad dv
    INNER JOIN p_Usuarios delegante ON LTRIM(RTRIM(delegante.carnet)) = LTRIM(RTRIM(dv.carnet_delegante)) AND delegante.activo = 1
    INNER JOIN p_Usuarios u ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = LTRIM(RTRIM(dv.carnet_delegante)) AND u.activo = 1
    WHERE LTRIM(RTRIM(dv.carnet_delegado)) = @c
      AND dv.activo = 1
      AND (dv.fecha_fin IS NULL OR dv.fecha_fin >= GETDATE())
      AND u.carnet IS NOT NULL AND u.carnet <> ''
      AND LTRIM(RTRIM(u.carnet)) NOT IN (SELECT carnet FROM #visibles);

    -- 6. Remover los DENY explícitos
    DELETE v FROM #visibles v
    WHERE EXISTS (
        SELECT 1 FROM p_permiso_empleado pe
        WHERE LTRIM(RTRIM(pe.carnet_recibe)) = @c
          AND LTRIM(RTRIM(pe.carnet_objetivo)) = v.carnet
          AND pe.activo = 1
          AND pe.tipo_acceso = 'DENY'
    );

    -- Resultado final
    SELECT carnet FROM #visibles ORDER BY carnet;

    DROP TABLE #visibles;
END;
GO
