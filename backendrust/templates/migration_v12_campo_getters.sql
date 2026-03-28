-- =========================================================
-- v12_campo_recorridos_getters.sql
-- Complemento para el módulo de Campo: Getters y Reportes
-- =========================================================

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_recorrido_activo
-- Obtiene el recorrido actual del usuario con estadísticas
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_recorrido_activo
    @carnet     NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT r.*, 
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos, 
        DATEDIFF(MINUTE, r.hora_inicio, GETDATE()) AS minutos_transcurridos 
    FROM campo_recorridos r 
    WHERE r.carnet = @carnet AND r.estado = 'EN_CURSO';
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_recorrido_puntos
-- Obtiene los puntos GPS de un recorrido específico
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_recorrido_puntos
    @id_recorrido   INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT lat, lon, accuracy, velocidad_kmh, timestamp_gps, tipo, id_cliente, notas 
    FROM campo_recorrido_puntos 
    WHERE id_recorrido = @id_recorrido 
    ORDER BY timestamp_gps ASC;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_recorrido_historial
-- Obtiene el historial reciente de recorridos del usuario
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_recorrido_historial
    @carnet     NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 50 r.*, 
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos 
    FROM campo_recorridos r 
    WHERE r.carnet = @carnet 
      AND r.fecha >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE)) 
    ORDER BY r.hora_inicio DESC;
END;
GO

-- ─────────────────────────────────────────────────────
-- SP: sp_campo_admin_recorridos
-- Reporte de recorridos para administración por fecha
-- ─────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_campo_admin_recorridos
    @fecha      DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @fecha IS NULL SET @fecha = CAST(GETDATE() AS DATE);

    SELECT r.*, c.Colaborador AS nombre_colaborador, 
        (SELECT COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = r.id_recorrido) AS total_puntos 
    FROM campo_recorridos r 
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = r.carnet 
    WHERE r.fecha = @fecha 
    ORDER BY r.hora_inicio DESC;
END;
GO

PRINT '✅ v12 — Getters de Recorridos Campo creados correctamente';
GO
