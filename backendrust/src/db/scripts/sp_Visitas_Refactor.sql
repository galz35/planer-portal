-- =============================================
-- Migration: Zero Inline SQL - Modulo Visitas
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_Visita_ObtenerClientes]
CREATE OR ALTER PROCEDURE [dbo].[sp_Visita_ObtenerClientes]
AS
BEGIN
    SELECT id, codigo, nombre, zona, direccion, lat, lon 
    FROM vc_clientes 
    WHERE activo = 1
    ORDER BY nombre;
END
GO

-- 2. [sp_Visita_ObtenerStats]
CREATE OR ALTER PROCEDURE [dbo].[sp_Visita_ObtenerStats]
    @fecha NVARCHAR(10) -- YYYY-MM-DD
AS
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha) as visitas_hoy,
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha AND estado = 'FINALIZADA') as completadas_hoy,
        (SELECT COUNT(*) FROM vc_clientes WHERE activo = 1) as clientes_activos,
        (SELECT COUNT(*) FROM vc_visitas WHERE CAST(timestamp_inicio AS DATE) = @fecha AND valido_inicio = 0) as alertas_fuera_zona;
END
GO

-- 3. [sp_Visita_ObtenerListado]
CREATE OR ALTER PROCEDURE [dbo].[sp_Visita_ObtenerListado]
    @top INT = 100
AS
BEGIN
    SELECT TOP (@top) v.*, c.nombre as cliente_nombre 
    FROM vc_visitas v 
    LEFT JOIN vc_clientes c ON c.id = v.cliente_id 
    ORDER BY v.timestamp_inicio DESC;
END
GO

-- 4. [sp_Visita_ObtenerMetas]
CREATE OR ALTER PROCEDURE [dbo].[sp_Visita_ObtenerMetas]
    @carnet NVARCHAR(50) = NULL
AS
BEGIN
    SELECT * FROM vc_metas 
    WHERE @carnet IS NULL OR carnet = @carnet;
END
GO
