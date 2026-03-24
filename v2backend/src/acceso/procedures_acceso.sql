/* =========================================================
   CLARITY / MOMENTUS - STORE PROCEDURES PARA ACCESO Y VISIBILIDAD
   - Estrategia: Lógica centralizada, sin SQL inline en backend.
   - Compatibilidad: Backend NestJS (acceso.repo.ts)
   ========================================================= */

-- Eliminamos procedures anteriores para recrearlos limpios
-- (Solo como referencia, CREATE OR ALTER maneja la actualización)

-- =========================================================
-- 1) VISIBILIDAD
-- =========================================================
GO
CREATE OR ALTER PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets
    @carnetSolicitante NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnet NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetSolicitante, '')));
    IF (@carnet = '') 
    BEGIN
        SELECT CAST('' AS NVARCHAR(50)) AS carnet WHERE 1=0;
        RETURN;
    END;

    /* 
      Regla: el solicitante puede ver:
      - A sí mismo
      - Su subárbol jerárquico (por jefeCarnet en p_Usuarios)
      - Permisos explícitos por empleado (p_permiso_empleado con ALLOW)
      - Permisos por área (p_permiso_area) => todo el subárbol de la organización
      - Delegaciones activas (Veo lo que ven quienes me delegaron)
      
      EXCLUSIONES (DENY):
      - Si existe un registro DENY en p_permiso_empleado, se remueve de la lista final.
    */

    -- 1. Identificar Actores Efectivos (Yo + Quien me delegó)
    DECLARE @Actores TABLE (carnet NVARCHAR(50) PRIMARY KEY);

    INSERT INTO @Actores (carnet) VALUES (@carnet);

    INSERT INTO @Actores (carnet)
    SELECT DISTINCT LTRIM(RTRIM(d.carnet_delegante))
    FROM dbo.p_delegacion_visibilidad d
    WHERE LTRIM(RTRIM(d.carnet_delegado)) = @carnet
      AND d.activo = 1
      AND (d.fecha_inicio IS NULL OR d.fecha_inicio <= GETDATE())
      AND (d.fecha_fin   IS NULL OR d.fecha_fin   >= GETDATE())
      AND LTRIM(RTRIM(ISNULL(d.carnet_delegante,''))) <> ''
      AND NOT EXISTS (SELECT 1 FROM @Actores a WHERE a.carnet = LTRIM(RTRIM(d.carnet_delegante)));

    -- Tabla acumuladora de visibles
    DECLARE @Visibles TABLE (carnet NVARCHAR(50) PRIMARY KEY);

    -- Base: Los propios actores se ven a sí mismos (necesario para la lógica base)
    INSERT INTO @Visibles (carnet)
    SELECT carnet FROM @Actores;

    /* A) Jerarquía Directa: Subordinados de todos los actores */
    -- Usamos CTE recursivo para bajar por jefeCarnet
    ;WITH Raices AS (
        SELECT u.carnet
        FROM dbo.p_Usuarios u
        JOIN @Actores a ON LTRIM(RTRIM(u.carnet)) = a.carnet
        WHERE u.activo = 1
    ),
    Jerarquia AS (
        -- Nivel 0: Actores
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet
        FROM dbo.p_Usuarios u
        JOIN Raices r ON LTRIM(RTRIM(u.carnet)) = LTRIM(RTRIM(r.carnet))
        WHERE u.activo = 1

        UNION ALL

        -- Recursión: Hijos cuyo jefe es alguien de la jerarquía actual
        SELECT LTRIM(RTRIM(h.carnet)) AS carnet
        FROM dbo.p_Usuarios h
        JOIN Jerarquia j ON LTRIM(RTRIM(h.jefeCarnet)) = j.carnet
        WHERE h.activo = 1
    )
    INSERT INTO @Visibles (carnet)
    SELECT DISTINCT j.carnet
    FROM Jerarquia j
    WHERE j.carnet <> ''
      AND NOT EXISTS (SELECT 1 FROM @Visibles v WHERE v.carnet = j.carnet);

    /* B) Permisos por Empleado (ALLOW) */
    INSERT INTO @Visibles (carnet)
    SELECT DISTINCT LTRIM(RTRIM(pe.carnet_objetivo))
    FROM dbo.p_permiso_empleado pe
    JOIN @Actores a ON LTRIM(RTRIM(pe.carnet_recibe)) = a.carnet
    WHERE pe.activo = 1
      AND (pe.tipo_acceso IS NULL OR UPPER(LTRIM(RTRIM(pe.tipo_acceso))) <> 'DENY')
      AND LTRIM(RTRIM(ISNULL(pe.carnet_objetivo,''))) <> ''
      AND NOT EXISTS (SELECT 1 FROM @Visibles v WHERE v.carnet = LTRIM(RTRIM(pe.carnet_objetivo)));

    /* C) Permisos por Área (Subárbol Organizacional) */
    -- Primero obtenemos los IDs de org raíz a los que tienen acceso los actores
    ;WITH PermAreas AS (
        SELECT pa.idorg_raiz
        FROM dbo.p_permiso_area pa
        JOIN @Actores a ON LTRIM(RTRIM(pa.carnet_recibe)) = a.carnet
        WHERE pa.activo = 1
    ),
    -- Expandimos esos nodos hacia abajo (subárbol completo)
    NodosSub AS (
        SELECT o.id AS idorg
        FROM dbo.p_OrganizacionNodos o
        JOIN PermAreas p ON o.id = p.idorg_raiz
        WHERE o.activo = 1

        UNION ALL

        SELECT h.id
        FROM dbo.p_OrganizacionNodos h
        JOIN NodosSub ns ON h.idPadre = ns.idorg
        WHERE h.activo = 1
    )
    -- Insertamos todos los empleados que pertenezcan a esos nodos
    INSERT INTO @Visibles (carnet)
    SELECT DISTINCT LTRIM(RTRIM(u.carnet))
    FROM dbo.p_Usuarios u
    JOIN NodosSub ns ON u.idOrg = ns.idorg
    WHERE u.activo = 1
      AND LTRIM(RTRIM(ISNULL(u.carnet,''))) <> ''
      AND NOT EXISTS (SELECT 1 FROM @Visibles v WHERE v.carnet = LTRIM(RTRIM(u.carnet)));

    /* D) Aplicar Bloqueos (DENY) */
    DELETE v
    FROM @Visibles v
    WHERE EXISTS (
        SELECT 1
        FROM dbo.p_permiso_empleado pe
        JOIN @Actores a ON LTRIM(RTRIM(pe.carnet_recibe)) = a.carnet
        WHERE pe.activo = 1
          AND UPPER(LTRIM(RTRIM(ISNULL(pe.tipo_acceso,'')))) = 'DENY'
          AND LTRIM(RTRIM(pe.carnet_objetivo)) = v.carnet
    )
    AND v.carnet <> @carnet; -- Seguridad: El solicitante siempre debe verse a sí mismo (para evitar brickear su UI)

    -- Retornar lista plana
    SELECT v.carnet
    FROM @Visibles v
    ORDER BY v.carnet;
END
GO

-- =========================================================
-- 2) USUARIOS DETALLES (CSV -> JOIN)
-- =========================================================
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerDetallesPorCarnets
    @CarnetsCsv NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @csv NVARCHAR(MAX) = ISNULL(@CarnetsCsv, '');
    -- Limpieza básica
    SET @csv = REPLACE(@csv, CHAR(13), ''); 
    SET @csv = REPLACE(@csv, CHAR(10), '');
    SET @csv = REPLACE(@csv, ' ', '');

    ;WITH Carnets AS (
        SELECT DISTINCT LTRIM(RTRIM(value)) AS carnet
        FROM STRING_SPLIT(@csv, ',')
        WHERE LTRIM(RTRIM(ISNULL(value,''))) <> ''
    )
    SELECT 
        u.idUsuario, 
        u.carnet, 
        u.nombreCompleto,
        u.correo, 
        u.cargo, 
        u.departamento,
        u.orgDepartamento, 
        u.orgGerencia, 
        u.idOrg, 
        u.jefeCarnet, 
        u.jefeNombre, 
        u.jefeCorreo, 
        u.activo,
        u.gerencia, 
        u.subgerencia, 
        u.idRol, 
        u.rolGlobal,
        r.nombre AS rolNombre
    FROM dbo.p_Usuarios u
    JOIN Carnets c ON LTRIM(RTRIM(u.carnet)) = c.carnet
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    ORDER BY u.nombreCompleto;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerCarnetPorId
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 carnet FROM dbo.p_Usuarios WHERE idUsuario = @idUsuario;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_BuscarPorCarnet
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 * FROM dbo.p_Usuarios WHERE LTRIM(RTRIM(carnet)) = LTRIM(RTRIM(@carnet));
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_BuscarPorCorreo
    @correo NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 * FROM dbo.p_Usuarios WHERE LOWER(LTRIM(RTRIM(correo))) = LOWER(LTRIM(RTRIM(@correo)));
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ListarActivos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.p_Usuarios WHERE activo = 1 ORDER BY nombreCompleto ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_Buscar
    @termino NVARCHAR(200),
    @limite INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @t NVARCHAR(260) = '%' + ISNULL(@termino,'') + '%';
    
    SELECT TOP (@limite) *
    FROM dbo.p_Usuarios
    WHERE activo = 1
      AND (
           LOWER(nombreCompleto) LIKE LOWER(@t) OR
           carnet LIKE @t OR
           LOWER(correo) LIKE LOWER(@t)
      )
    ORDER BY nombreCompleto ASC;
END
GO

-- =========================================================
-- 3) DELEGACIONES
-- =========================================================
CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_ObtenerActivas
    @carnetDelegado NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM dbo.p_delegacion_visibilidad
    WHERE LTRIM(RTRIM(carnet_delegado)) = LTRIM(RTRIM(@carnetDelegado))
      AND activo = 1
      AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
      AND (fecha_fin   IS NULL OR fecha_fin   >= GETDATE())
    ORDER BY creado_en DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_Crear
    @delegante NVARCHAR(50),
    @delegado  NVARCHAR(50),
    @motivo    NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.p_delegacion_visibilidad (carnet_delegante, carnet_delegado, motivo, activo, creado_en)
    VALUES (LTRIM(RTRIM(@delegante)), LTRIM(RTRIM(@delegado)), @motivo, 1, GETDATE());
    SELECT SCOPE_IDENTITY() AS id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_Desactivar
    @id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.p_delegacion_visibilidad SET activo = 0 WHERE id = @id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_ListarActivas
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.p_delegacion_visibilidad WHERE activo = 1 ORDER BY creado_en DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_DelegacionVisibilidad_ListarPorDelegante
    @carnetDelegante NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.p_delegacion_visibilidad 
    WHERE LTRIM(RTRIM(carnet_delegante)) = LTRIM(RTRIM(@carnetDelegante)) 
    ORDER BY creado_en DESC;
END
GO

-- =========================================================
-- 4) PERMISOS ÁREA
-- =========================================================
CREATE OR ALTER PROCEDURE dbo.sp_PermisoArea_ObtenerActivosPorRecibe
    @carnetRecibe NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM dbo.p_permiso_area
    WHERE LTRIM(RTRIM(carnet_recibe)) = LTRIM(RTRIM(@carnetRecibe))
      AND activo = 1
    ORDER BY creado_en DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoArea_Crear
    @otorga NVARCHAR(50) = NULL,
    @recibe NVARCHAR(50),
    @idorg  BIGINT,
    @alcance NVARCHAR(50) = 'SUBARBOL',
    @motivo NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.p_permiso_area (
        carnet_otorga, carnet_recibe, idorg_raiz, alcance, motivo, activo, creado_en
    ) VALUES (
        @otorga, LTRIM(RTRIM(@recibe)), @idorg, @alcance, @motivo, 1, GETDATE()
    );
    SELECT SCOPE_IDENTITY() AS id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoArea_Desactivar
    @id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.p_permiso_area SET activo = 0 WHERE id = @id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoArea_ListarActivos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.p_permiso_area WHERE activo = 1 ORDER BY creado_en DESC;
END
GO

-- =========================================================
-- 5) PERMISOS EMPLEADO
-- =========================================================
CREATE OR ALTER PROCEDURE dbo.sp_PermisoEmpleado_ObtenerActivosPorRecibe
    @carnetRecibe NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM dbo.p_permiso_empleado
    WHERE LTRIM(RTRIM(carnet_recibe)) = LTRIM(RTRIM(@carnetRecibe))
      AND activo = 1
    ORDER BY creado_en DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoEmpleado_Crear
    @otorga  NVARCHAR(50) = NULL,
    @recibe  NVARCHAR(50),
    @objetivo NVARCHAR(50),
    @tipo    NVARCHAR(20) = 'ALLOW',
    @motivo  NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.p_permiso_empleado (
        carnet_otorga, carnet_recibe, carnet_objetivo, tipo_acceso, motivo, activo, creado_en
    ) VALUES (
        @otorga, LTRIM(RTRIM(@recibe)), LTRIM(RTRIM(@objetivo)), @tipo, @motivo, 1, GETDATE()
    );
    SELECT SCOPE_IDENTITY() AS id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoEmpleado_Desactivar
    @id BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.p_permiso_empleado SET activo = 0 WHERE id = @id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_PermisoEmpleado_ListarActivos
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.p_permiso_empleado WHERE activo = 1 ORDER BY creado_en DESC;
END
GO

-- =========================================================
-- 6) ORGANIGRAMA
-- =========================================================
CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ObtenerArbol
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id AS idorg, nombre, tipo, idPadre AS padre, orden, activo
    FROM dbo.p_OrganizacionNodos
    ORDER BY tipo, orden, nombre;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_BuscarNodoPorId
    @idorg BIGINT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 id AS idorg, nombre, tipo, idPadre AS padre, orden, activo
    FROM dbo.p_OrganizacionNodos
    WHERE id = @idorg;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_BuscarNodos
    @termino NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @t NVARCHAR(260) = '%' + ISNULL(@termino,'') + '%';
    SELECT TOP 50 id AS idorg, nombre, tipo, idPadre AS padre, orden, activo
    FROM dbo.p_OrganizacionNodos
    WHERE LOWER(nombre) LIKE LOWER(@t)
    ORDER BY nombre ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ContarEmpleadosPorNodo
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(idOrg AS NVARCHAR(50)) AS idOrg, COUNT(*) AS [count]
    FROM dbo.p_Usuarios
    WHERE activo = 1 AND idOrg IS NOT NULL
    GROUP BY idOrg;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_SubarbolPreviewEmpleados
    @idOrgRaiz NVARCHAR(50),
    @limite INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id BIGINT = TRY_CAST(@idOrgRaiz AS BIGINT);
    IF (@id IS NULL) BEGIN SELECT TOP 0 * FROM dbo.p_Usuarios; RETURN; END;

    ;WITH NodosSub AS (
        SELECT id AS idorg FROM dbo.p_OrganizacionNodos WHERE id = @id
        UNION ALL
        SELECT n.id FROM dbo.p_OrganizacionNodos n JOIN NodosSub ns ON n.idPadre = ns.idorg
    )
    SELECT TOP (@limite) 
        u.idUsuario, u.nombre, u.nombreCompleto, u.cargo, u.departamento, u.correo, u.carnet, u.idOrg
    FROM dbo.p_Usuarios u
    JOIN NodosSub ns ON u.idOrg = ns.idorg
    WHERE u.activo = 1
    ORDER BY u.nombreCompleto;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_SubarbolContarEmpleados
    @idOrgRaiz NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @id BIGINT = TRY_CAST(@idOrgRaiz AS BIGINT);
    IF (@id IS NULL) BEGIN SELECT 0 AS total; RETURN; END;

    ;WITH NodosSub AS (
        SELECT id AS idorg FROM dbo.p_OrganizacionNodos WHERE id = @id
        UNION ALL
        SELECT n.id FROM dbo.p_OrganizacionNodos n JOIN NodosSub ns ON n.idPadre = ns.idorg
    )
    SELECT COUNT(*) AS total
    FROM dbo.p_Usuarios u
    JOIN NodosSub ns ON u.idOrg = ns.idorg
    WHERE u.activo = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ObtenerEmpleadosNodoDirecto
    @idOrg INT,
    @limite INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP (@limite) *
    FROM dbo.p_Usuarios
    WHERE activo = 1 AND idOrg = @idOrg
    ORDER BY nombre ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Organizacion_ContarEmpleadosNodoDirecto
    @idOrg INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS total
    FROM dbo.p_Usuarios
    WHERE activo = 1 AND idOrg = @idOrg;
END
GO
