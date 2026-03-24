-- =================================================================
-- FIX: Mejorar búsqueda de nodos de organización para visibilidad
-- Ignorando p_OrganizacionNodos y basándose al 100% en los 
-- datos reales de p_Usuarios (gerencia, subgerencia, primer_nivel)
-- y p_organizacion_nodos (de RRHH)
-- =================================================================

ALTER PROCEDURE dbo.sp_Organizacion_BuscarNodos
  @termino NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @t NVARCHAR(210) = N'%' + ISNULL(@termino, N'') + N'%';

  -- Tabla temporal para unificar resultados
  CREATE TABLE #resultados (
    idOrg NVARCHAR(100),
    nombre NVARCHAR(255),
    descripcion NVARCHAR(255),
    tipo NVARCHAR(50)
  );

  -- Fuente 1: Valores únicos de GERENCIA en p_Usuarios
  INSERT INTO #resultados (idOrg, nombre, descripcion, tipo)
  SELECT DISTINCT 
    'GER_' + CAST(ROW_NUMBER() OVER (ORDER BY gerencia) AS NVARCHAR(20)),
    gerencia,
    gerencia,
    'GERENCIA'
  FROM p_Usuarios
  WHERE activo = 1
    AND gerencia IS NOT NULL AND gerencia <> '' AND gerencia <> 'NO APLICA'
    AND LOWER(gerencia) LIKE LOWER(@t)
    AND gerencia NOT IN (SELECT nombre FROM #resultados);

  -- Fuente 2: Valores únicos de SUBGERENCIA en p_Usuarios
  INSERT INTO #resultados (idOrg, nombre, descripcion, tipo)
  SELECT DISTINCT
    'SUB_' + CAST(ROW_NUMBER() OVER (ORDER BY subgerencia) AS NVARCHAR(20)),
    subgerencia,
    subgerencia,
    'SUBGERENCIA'
  FROM p_Usuarios
  WHERE activo = 1
    AND subgerencia IS NOT NULL AND subgerencia <> '' AND subgerencia <> 'NO APLICA'
    AND LOWER(subgerencia) LIKE LOWER(@t)
    AND subgerencia NOT IN (SELECT nombre FROM #resultados);

  -- Fuente 3: Valores únicos de PRIMER_NIVEL en p_Usuarios
  INSERT INTO #resultados (idOrg, nombre, descripcion, tipo)
  SELECT DISTINCT
    'PN_' + CAST(ROW_NUMBER() OVER (ORDER BY primer_nivel) AS NVARCHAR(20)),
    primer_nivel,
    primer_nivel,
    'COORDINACION'
  FROM p_Usuarios
  WHERE activo = 1
    AND primer_nivel IS NOT NULL AND primer_nivel <> '' AND primer_nivel <> 'NO APLICA'
    AND LOWER(primer_nivel) LIKE LOWER(@t)
    AND primer_nivel NOT IN (SELECT nombre FROM #resultados);

  -- Fuente 4: Tabla p_organizacion_nodos (nodos RH reales)
  INSERT INTO #resultados (idOrg, nombre, descripcion, tipo)
  SELECT TOP 20
    CAST(idorg AS NVARCHAR(100)),
    descripcion,
    descripcion,
    ISNULL(tipo, 'NODO')
  FROM dbo.p_organizacion_nodos
  WHERE LOWER(ISNULL(descripcion, '')) LIKE LOWER(@t)
    AND estado = 'ACTIVO'
    AND descripcion NOT IN (SELECT nombre FROM #resultados);

  SELECT TOP 40 * FROM #resultados ORDER BY tipo, nombre;
  DROP TABLE #resultados;
END;
GO
