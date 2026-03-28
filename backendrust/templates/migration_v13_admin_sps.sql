-- =========================================================
-- v13_admin_management_sps.sql
-- Stored Procedures para el módulo de Administración
-- =========================================================

-- ─────────────────────────────────────────────────────
-- SP: sp_Admin_Security_UsersAccess
-- Obtiene el listado de usuarios con conteo de subordinados y tipo de menú
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_Admin_Security_UsersAccess
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.idUsuario,
        u.nombre,
        u.carnet,
        u.cargo,
        u.departamento,
        u.rolGlobal,
        ISNULL(sc.subordinateCount, 0) AS subordinateCount,
        CASE
            WHEN u.rolGlobal IN ('ADMIN', 'SUPERVISOR') THEN 'ADMIN'
            WHEN c.menuPersonalizado IS NOT NULL THEN 'CUSTOM'
            WHEN ISNULL(sc.subordinateCount, 0) > 0 THEN 'LEADER'
            ELSE 'EMPLOYEE'
        END AS menuType,
        CASE WHEN c.menuPersonalizado IS NOT NULL THEN 1 ELSE 0 END AS hasCustomMenu
    FROM p_Usuarios u
    LEFT JOIN p_UsuariosConfig c ON u.idUsuario = c.idUsuario
    LEFT JOIN (
        SELECT jefeCarnet, COUNT(*) AS subordinateCount
        FROM p_Usuarios
        WHERE activo = 1
        GROUP BY jefeCarnet
    ) sc ON sc.jefeCarnet = u.carnet
    WHERE u.activo = 1
    ORDER BY u.nombre ASC;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_Admin_Usuarios_Listar
-- Listado de usuarios con paginación
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_Admin_Usuarios_Listar
    @Offset INT = 0,
    @Limit  INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- Total para paginación (primer result set)
    SELECT COUNT(*) as total FROM p_Usuarios;

    -- Datos (segundo result set)
    SELECT u.idUsuario, u.nombre, u.correo, u.carnet, u.activo, u.rolGlobal, u.pais, u.cargo, u.departamento, r.nombre as rolNombre 
    FROM p_Usuarios u 
    LEFT JOIN p_Roles r ON u.idRol = r.idRol 
    ORDER BY u.nombre
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_Admin_RecycleBin_Listar
-- Obtiene elementos en la papelera (Proyectos y Tareas)
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_Admin_RecycleBin_Listar
AS
BEGIN
    SET NOCOUNT ON;

    -- Proyectos
    SELECT p.idProyecto as id, 'Proyecto' as tipo, p.nombre, p.fechaCreacion as fechaEliminacion, u.nombre as eliminadoPor, NULL as proyecto
    FROM p_Proyectos p 
    LEFT JOIN p_Usuarios u ON p.idCreador = u.idUsuario 
    WHERE p.estado IN ('Cancelado', 'Eliminado')
    
    UNION ALL

    -- Tareas
    SELECT t.idTarea as id, 'Tarea' as tipo, t.nombre, t.fechaCreacion as fechaEliminacion, u.nombre as eliminadoPor, p.nombre as proyecto
    FROM p_Tareas t 
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto 
    LEFT JOIN p_Usuarios u ON t.idCreador = u.idUsuario 
    WHERE t.activo = 0 OR t.estado IN ('Eliminada', 'Descartada')
    
    ORDER BY fechaEliminacion DESC;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_Admin_Usuarios_Inactivos
-- Detecta usuarios que no han tenido actividad reciente (>30 días)
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_Admin_Usuarios_Inactivos
    @Dias INT = 30
AS
BEGIN
    SET NOCOUNT ON;

    SELECT u.idUsuario, u.nombre, u.correo, u.carnet, u.cargo, 
           DATEDIFF(day, ISNULL(u.fechaActualizacion, u.fechaCreacion), GETDATE()) as diasInactivo 
    FROM p_Usuarios u 
    WHERE u.activo = 1 
      AND DATEDIFF(day, ISNULL(u.fechaActualizacion, u.fechaCreacion), GETDATE()) > @Dias 
    ORDER BY diasInactivo DESC;
END;
GO

PRINT '✅ v13 — Stored Procedures de Administración creados correctamente';
GO
