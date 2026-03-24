
CREATE PROCEDURE dbo.sp_Visibilidad_ObtenerMiEquipo
(
    @idUsuario INT = NULL,
    @carnet    VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetSolicitante VARCHAR(20) = NULLIF(LTRIM(RTRIM(@carnet)), '');

    IF @carnetSolicitante IS NULL AND @idUsuario IS NOT NULL
    BEGIN
        SELECT TOP (1) @carnetSolicitante = NULLIF(LTRIM(RTRIM(u.carnet)), '')
        FROM dbo.p_Usuarios u WHERE u.idUsuario = @idUsuario;
    END

    IF @carnetSolicitante IS NULL
    BEGIN
        SELECT CAST(NULL AS INT) AS idUsuario WHERE 1 = 0;
        RETURN;
    END

    IF OBJECT_ID('tempdb..#UsuariosActivos') IS NOT NULL DROP TABLE #UsuariosActivos;
    CREATE TABLE #UsuariosActivos (
        idUsuario INT NOT NULL, carnet VARCHAR(20) NOT NULL PRIMARY KEY, nombreCompleto NVARCHAR(200),
        correo NVARCHAR(200), cargo NVARCHAR(200), gerencia NVARCHAR(200), orgGerencia NVARCHAR(200),
        ogerencia NVARCHAR(200), subgerencia NVARCHAR(200), orgDepartamento NVARCHAR(200),
        departamento NVARCHAR(200), area NVARCHAR(200), idOrgBigInt BIGINT NULL, jefeCarnet VARCHAR(20),
        carnet_jefe2 VARCHAR(20), carnet_jefe3 VARCHAR(20), carnet_jefe4 VARCHAR(20),
        rolGlobal NVARCHAR(200), primer_nivel NVARCHAR(200)
    );

    INSERT INTO #UsuariosActivos
    SELECT u.idUsuario, NULLIF(LTRIM(RTRIM(u.carnet)), '') AS carnet, u.nombreCompleto, u.correo,
           u.cargo, u.gerencia, u.orgGerencia, u.ogerencia, u.subgerencia, u.orgDepartamento,
           u.departamento, u.area, TRY_CONVERT(BIGINT, u.idOrg), NULLIF(LTRIM(RTRIM(u.jefeCarnet)), ''),
           NULLIF(LTRIM(RTRIM(u.carnet_jefe2)), ''), NULLIF(LTRIM(RTRIM(u.carnet_jefe3)), ''),
           NULLIF(LTRIM(RTRIM(u.carnet_jefe4)), ''), u.rolGlobal, u.primer_nivel
    FROM dbo.p_Usuarios u WHERE u.activo = 1 AND NULLIF(LTRIM(RTRIM(u.carnet)), '') IS NOT NULL;

    -- ADMIN CHECK
    IF EXISTS (SELECT 1 FROM #UsuariosActivos u WHERE u.carnet = @carnetSolicitante AND (u.rolGlobal = 'Admin' OR u.rolGlobal LIKE '%Admin%'))
    BEGIN
        SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.gerencia,
               COALESCE(u.orgGerencia, u.ogerencia, u.gerencia) AS orgGerencia, u.subgerencia, u.area AS Area,
               COALESCE(u.orgDepartamento, u.subgerencia, u.departamento) AS orgDepartamento,
               COALESCE(u.area, u.departamento) AS departamento, u.idOrgBigInt AS idOrg, u.jefeCarnet,
               1 AS nivel, 'ADMIN' AS fuente
        FROM #UsuariosActivos u WHERE u.carnet <> @carnetSolicitante ORDER BY u.nombreCompleto;
        RETURN;
    END

    IF OBJECT_ID('tempdb..#Carnets') IS NOT NULL DROP TABLE #Carnets;
    CREATE TABLE #Carnets (carnet VARCHAR(20) NOT NULL, nivel INT NULL, fuente VARCHAR(30) NOT NULL, CONSTRAINT PK_#Carnets PRIMARY KEY (carnet, fuente));

    -- Raices (solicitante + delegantes)
    IF OBJECT_ID('tempdb..#Raices') IS NOT NULL DROP TABLE #Raices;
    CREATE TABLE #Raices (carnetRaiz VARCHAR(20) NOT NULL PRIMARY KEY, fuente VARCHAR(30) NOT NULL);
    INSERT INTO #Raices VALUES (@carnetSolicitante, 'SOLICITANTE');
    INSERT INTO #Raices SELECT DISTINCT NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), ''), 'DELEGACION'
    FROM dbo.p_delegacion_visibilidad dv WHERE dv.activo = 1 AND NULLIF(LTRIM(RTRIM(dv.carnet_delegado)), '') = @carnetSolicitante
    AND NOT EXISTS (SELECT 1 FROM #Raices r WHERE r.carnetRaiz = NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), ''));

    -- JERARQUIA DIRECTA (Recursiva)
    ;WITH SubordinadosCTE AS (
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet, 1 AS nivel FROM #UsuariosActivos u
        INNER JOIN #Raices r ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = r.carnetRaiz 
        WHERE u.carnet <> @carnetSolicitante
        UNION ALL
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet, s.nivel + 1 AS nivel FROM #UsuariosActivos u
        INNER JOIN SubordinadosCTE s ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = s.carnet
        WHERE u.carnet <> @carnetSolicitante
    )
    INSERT INTO #Carnets(carnet, nivel, fuente) SELECT DISTINCT carnet, MIN(nivel), 'JERARQUIA' FROM SubordinadosCTE GROUP BY carnet OPTION (MAXRECURSION 5);

    -- PERMISOS EMPLEADO (ALLOW) - Usar carnet_objetivo en lugar de carnet_otorga
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), ''), 1, 'PERMISO_EMPLEADO'
    FROM dbo.p_permiso_empleado pe INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1 AND ISNULL(pe.tipo_acceso, 'ALLOW') = 'ALLOW'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), '') IS NOT NULL AND pe.carnet_objetivo <> @carnetSolicitante;

    -- PERMISOS AREA - Corregido para no usar p_organizacion_nodos sino machear nombre_area directamente como hicimos arriba
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT u.carnet, 1, 'PERMISO_AREA'
    FROM dbo.p_permiso_area pa
    INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pa.carnet_recibe)), '') = r.carnetRaiz
    INNER JOIN #UsuariosActivos u ON 
      LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.primer_nivel,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.subgerencia,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.gerencia,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR (pa.idorg_raiz > 0 AND u.idOrgBigInt = pa.idorg_raiz)
    WHERE pa.activo = 1 AND ISNULL(pa.tipo_acceso, 'ALLOW') = 'ALLOW' AND u.carnet <> @carnetSolicitante;

    -- DENY POR EMPLEADO
    DELETE c FROM #Carnets c WHERE EXISTS (
        SELECT 1 FROM dbo.p_permiso_empleado pe INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
        WHERE pe.activo = 1 AND pe.tipo_acceso = 'DENY' AND NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), '') = c.carnet COLLATE SQL_Latin1_General_CP1_CI_AS
    );

    -- Resultado Final, removiendo duplicados priorizando la misma forma
    ;WITH Unicos AS (
        SELECT c.carnet, c.nivel, c.fuente, ROW_NUMBER() OVER (
            PARTITION BY c.carnet ORDER BY CASE c.fuente WHEN 'JERARQUIA' THEN 1 WHEN 'PERMISO_EMPLEADO' THEN 2 WHEN 'PERMISO_AREA' THEN 3 ELSE 9 END, ISNULL(c.nivel, 999)
        ) AS rn FROM #Carnets c
    )
    SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.gerencia,
           COALESCE(u.orgGerencia, u.ogerencia, u.gerencia) AS orgGerencia, u.subgerencia, u.area AS Area,
           COALESCE(u.orgDepartamento, u.subgerencia, u.departamento) AS orgDepartamento,
           u.departamento AS departamento, u.idOrgBigInt AS idOrg, u.jefeCarnet, x.nivel, x.fuente
    FROM Unicos x INNER JOIN #UsuariosActivos u ON u.carnet = x.carnet COLLATE SQL_Latin1_General_CP1_CI_AS
    WHERE x.rn = 1 ORDER BY u.nombreCompleto;
END;
