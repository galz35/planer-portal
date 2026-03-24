-- ============================================================
-- fn_haversine_metros
-- Calcula distancia en metros entre dos puntos GPS
-- Utilizada por: sp_marcaje_registrar, sp_vc_checkin,
--                sp_vc_calculo_km_dia, sp_vc_agenda_hoy
-- Precisión: ~0.5% error vs Vincenty (aceptable para ≤200km)
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER FUNCTION dbo.fn_haversine_metros(
    @lat1 FLOAT, @lon1 FLOAT,
    @lat2 FLOAT, @lon2 FLOAT
)
RETURNS FLOAT
AS
BEGIN
    -- Radio de la Tierra en metros
    DECLARE @R FLOAT = 6371000.0;

    -- Diferencias en radianes
    DECLARE @dLat FLOAT = RADIANS(@lat2 - @lat1);
    DECLARE @dLon FLOAT = RADIANS(@lon2 - @lon1);

    -- Fórmula Haversine
    DECLARE @a FLOAT =
        SIN(@dLat / 2.0) * SIN(@dLat / 2.0) +
        COS(RADIANS(@lat1)) * COS(RADIANS(@lat2)) *
        SIN(@dLon / 2.0) * SIN(@dLon / 2.0);

    DECLARE @c FLOAT = 2.0 * ATN2(SQRT(@a), SQRT(1.0 - @a));

    RETURN @R * @c;
END;
GO

-- ============================================================
-- VERIFICACIÓN: Managua → León ≈ 87.5 km
-- Coordenadas: Managua (12.1364, -86.2514) → León (12.4346, -86.8779)
-- ============================================================
SELECT
    dbo.fn_haversine_metros(12.1364, -86.2514, 12.4346, -86.8779) AS distancia_metros,
    dbo.fn_haversine_metros(12.1364, -86.2514, 12.4346, -86.8779) / 1000.0 AS distancia_km;
-- Esperado: ~76,000 metros (~76 km línea recta)
GO

PRINT '✅ fn_haversine_metros creada exitosamente';
GO
