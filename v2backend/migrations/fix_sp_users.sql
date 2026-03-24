-- =============================================
-- Migration: Fix User Lookup Performance
-- Author: Antigravity (AI)
-- Date: 2026-01-27
-- Description: 
-- Creates sp_Usuarios_ObtenerPorLista to optimize bulk user retrieval
-- using proper JOINs and avoiding ad-hoc inline SQL.
-- =============================================

USE Bdplaner;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Retrieve user details for a list of carnets
    -- Optimizes the inline query: 
    -- SELECT u.*, r.nombre as rolNombre ... INNER JOIN STRING_SPLIT ...
    
    SELECT 
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.idRol,
        u.cargo,
        r.nombre as rolNombre
    FROM p_Usuarios u
    LEFT JOIN p_Roles r ON u.idRol = r.idRol
    INNER JOIN STRING_SPLIT(@carnetsList, ',') L ON u.carnet = L.value
    WHERE u.activo = 1
    OPTION (RECOMPILE); -- Optimize for the specific list size

END
GO
