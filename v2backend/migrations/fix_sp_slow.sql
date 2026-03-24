-- =============================================
-- Migration: Fix Slow SPs & Remove Inline SQL
-- Author: Antigravity (AI)
-- Date: 2026-01-27
-- Description: 
-- 1. Creates `sp_Checkins_ObtenerPorEquipoFecha` to optimize checkin retrieval and remove inline SQL.
-- 2. Creates `sp_Proyectos_Listar` for optimized project listing with pagination.
-- 3. Creates/Updates `sp_Tareas_ObtenerPorUsuario` if needed (seems ok provided indexes exist).
-- 4. Tuned indexes for `p_Proyectos` filtering.
-- =============================================

USE Bdplaner;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- =============================================
-- 1. OPTIMIZED CHECKIN RETRIEVAL
-- Replace inline query in clarity.repo.ts
-- Addresses: CAST(fecha as DATE) issue and Inline SQL
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Use TVP or String Split safely
    -- Ensure index IX_p_Checkins_Usuario_Fecha is used
    -- fecha column is DATE, so no CAST needed on column side.
    
    SELECT 
        c.idCheckin,
        c.usuarioCarnet,
        c.fecha,
        c.estadoAnimo,
        c.nota,
        c.entregableTexto,
        c.prioridad1,
        c.prioridad2,
        c.prioridad3,
        c.energia,
        c.linkEvidencia
    FROM p_Checkins c
    INNER JOIN STRING_SPLIT(@carnetsList, ',') s ON c.usuarioCarnet = s.value
    WHERE c.fecha = @fecha;

END
GO

-- =============================================
-- 2. OPTIMIZED PROJECT LISTING
-- Replace inline query in planning.repo.ts -> obtenerTodosProyectos
-- Addresses: Table Scans, Excessive SELECT *, Lack of Pagination
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[sp_Proyectos_Listar]
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    -- Dynamic SQL or sophisticated IF/ELSE is often needed for optional params to ensure index usage,
    -- but usually `(@p IS NULL OR col = @p)` is "okay" in modern SQL Server (Option Recompile).
    -- Given the simplicity, we'll stick to a clean query with OPTION (RECOMPILE).

    SELECT 
        idProyecto,
        nombre,
        descripcion,
        estado,
        prioridad,
        fechaInicio,
        fechaFin,
        fechaCreacion,
        area,
        gerencia,
        subgerencia,
        responsableCarnet,
        creadorCarnet,
        tipo,
        porcentaje = (SELECT AVG(porcentaje) FROM p_Tareas t WHERE t.idProyecto = p.idProyecto AND t.activo = 1) -- Keep efficient subquery or move to View if slow
    FROM p_Proyectos p
    WHERE 
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
        AND (@area IS NULL OR p.area = @area)
        AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE); -- Forces fresh plan for different parameter combinations (Critical for optional filters)

END
GO

-- =============================================
-- 3. INDEX OPTIMIZATION FOR PROYECTOS
-- Support the filtering columns
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_p_Proyectos_Filtros_Composite' AND object_id = OBJECT_ID('p_Proyectos'))
BEGIN
    CREATE NONCLUSTERED INDEX [IX_p_Proyectos_Filtros_Composite] ON [dbo].[p_Proyectos]
    (
        [estado] ASC,
        [gerencia] ASC,
        [subgerencia] ASC,
        [area] ASC,
        [tipo] ASC
    )
    INCLUDE ([nombre], [fechaCreacion], [responsableCarnet], [creadorCarnet])
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
END
GO
