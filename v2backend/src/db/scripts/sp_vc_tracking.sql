CREATE OR ALTER PROCEDURE dbo.sp_vc_usuarios_con_tracking
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.carnet,
        ISNULL(u.nombre, t.carnet) AS nombre_empleado,
        MAX(t.timestamp) AS ultimo_punto,
        COUNT(t.id) AS total_puntos
    FROM vc_tracking_gps t
    LEFT JOIN p_Usuarios u ON t.carnet = CAST(u.carnet AS VARCHAR(MAX))
    GROUP BY t.carnet, u.nombre
    ORDER BY MAX(t.timestamp) DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_tracking_por_dia
    @carnet VARCHAR(20),
    @fecha DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @fecha IS NULL
        SET @fecha = CAST(GETDATE() AS DATE);
    ELSE
        SET @fecha = CAST(@fecha AS DATE);

    SELECT 
        id,
        CAST(lat AS FLOAT) AS lat,
        CAST(long AS FLOAT) AS lon,
        CAST(accuracy AS FLOAT) AS accuracy,
        CAST(velocidad AS FLOAT) AS velocidad,
        -- Conversión de m/s a km/h
        CAST(velocidad * 3.6 AS FLOAT) AS velocidad_estimada_kmh,
        timestamp,
        fuente
    FROM vc_tracking_gps
    WHERE carnet = @carnet 
      AND CAST(timestamp AS DATE) = @fecha
    ORDER BY timestamp ASC;
END;
GO
