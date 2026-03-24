CREATE OR ALTER PROCEDURE dbo.sp_marcaje_reporte_asistencia
    @fecha_inicio DATE,
    @fecha_fin    DATE,
    @carnet       VARCHAR(20) = NULL  -- NULL = todos
AS
BEGIN
    SET NOCOUNT ON;

    WITH Numerados AS (
        SELECT 
            carnet,
            CAST(fecha AS DATE) AS dia,
            lat,
            long,
            tipo_marcaje,
            ROW_NUMBER() OVER(PARTITION BY carnet, CAST(fecha AS DATE), tipo_marcaje ORDER BY fecha ASC) as rn_asc,
            ROW_NUMBER() OVER(PARTITION BY carnet, CAST(fecha AS DATE), tipo_marcaje ORDER BY fecha DESC) as rn_desc
        FROM marcaje_asistencias
        WHERE CAST(fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
          AND estado = 'ACEPTADA'
          AND (@carnet IS NULL OR carnet = @carnet)
    )
    SELECT
        c.Carnet AS carnet,
        c.Colaborador AS nombre_empleado,
        CAST(a.fecha AS DATE) AS dia,
        MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END) AS primera_entrada,
        MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END) AS ultima_salida,
        DATEDIFF(MINUTE,
            MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END),
            MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END)
        ) AS minutos_jornada,
        SUM(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN 1 ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END) AS total_salidas,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_EXTRA' THEN 1 ELSE 0 END) AS sesiones_extra,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_COMPENSADA' THEN 1 ELSE 0 END) AS sesiones_compensada,
        SUM(CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END) AS total_warnings,
        SUM(CASE WHEN a.motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END) AS fuera_geofence,
        COUNT(*) AS total_marcajes,
        -- Obtenemos coordenadas lat y long de la primera entrada del dia
        (SELECT TOP 1 n.lat FROM Numerados n WHERE n.carnet = a.carnet AND n.dia = CAST(a.fecha AS DATE) AND n.tipo_marcaje = 'ENTRADA' AND n.rn_asc = 1) AS lat,
        (SELECT TOP 1 n.long FROM Numerados n WHERE n.carnet = a.carnet AND n.dia = CAST(a.fecha AS DATE) AND n.tipo_marcaje = 'ENTRADA' AND n.rn_asc = 1) AS long
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE CAST(a.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
      AND a.estado = 'ACEPTADA'
      AND (@carnet IS NULL OR a.carnet = @carnet)
    GROUP BY c.Carnet, c.Colaborador, CAST(a.fecha AS DATE), a.carnet
    ORDER BY dia DESC, c.Colaborador;
END;
GO
