-- =============================================
-- Migration: Zero Inline SQL - Modulo Marcaje Admin
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Marcaje_Admin_ObtenerSolicitudes]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerSolicitudes]
AS
BEGIN
    SELECT TOP 200 s.*, c.Colaborador as colaborador_nombre
    FROM marcaje_solicitudes s
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = s.carnet
    ORDER BY s.creado_en DESC;
END
GO

-- 2. [sp_Marcaje_Admin_ObtenerSites]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerSites]
AS
BEGIN
    SELECT * FROM marcaje_sites ORDER BY id ASC;
END
GO

-- 3. [sp_Marcaje_Admin_ObtenerIps]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerIps]
AS
BEGIN
    SELECT * FROM marcaje_ip_whitelist ORDER BY id ASC;
END
GO

-- 4. [sp_Marcaje_Admin_ObtenerDevices]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerDevices]
AS
BEGIN
    SELECT TOP 200 d.*, c.Colaborador as colaborador_nombre 
    FROM marcaje_devices d
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = d.carnet
    ORDER BY d.last_login DESC;
END
GO

-- 5. [sp_Marcaje_Admin_ObtenerConfigResumen]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerConfigResumen]
AS
BEGIN
    SELECT TOP 100 c.Carnet, c.Colaborador,
        (SELECT COUNT(*) FROM marcaje_asistencias WHERE carnet = c.Carnet) as total_marcajes
    FROM rrhh.Colaboradores c
    WHERE EXISTS (SELECT 1 FROM marcaje_asistencias WHERE carnet = c.Carnet)
    ORDER BY c.Colaborador;
END
GO

-- 6. [sp_Marcaje_Admin_GestionGeocerca]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_GestionGeocerca]
    @accion NVARCHAR(20), -- 'CREAR', 'BORRAR'
    @carnet NVARCHAR(50) = NULL,
    @id_site INT = NULL,
    @id INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @accion = 'CREAR'
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM marcaje_usuario_geocercas WHERE carnet = @carnet AND id_site = @id_site AND activo = 1)
        BEGIN
            INSERT INTO marcaje_usuario_geocercas (carnet, id_site, activo) VALUES (@carnet, @id_site, 1);
        END
    END
    ELSE IF @accion = 'BORRAR'
    BEGIN
        UPDATE marcaje_usuario_geocercas SET activo = 0 WHERE id = @id;
    END
END
GO

-- 7. [sp_Marcaje_Admin_GestionIp]
CREATE OR ALTER PROCEDURE [dbo].[sp_Marcaje_Admin_GestionIp]
    @accion NVARCHAR(20), -- 'CREAR', 'ELIMINAR'
    @id INT = NULL,
    @nombre NVARCHAR(100) = NULL,
    @ip NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @accion = 'CREAR'
        INSERT INTO marcaje_ip_whitelist (nombre, ip) VALUES (@nombre, @ip);
    ELSE IF @accion = 'ELIMINAR'
        DELETE FROM marcaje_ip_whitelist WHERE id = @id;
END
GO
