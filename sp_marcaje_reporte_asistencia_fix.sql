-- ============================================================
-- SP 6: sp_marcaje_reporte_asistencia
-- Reporte consolidado de asistencia por rango de fechas
-- Pivot: primera entrada, última salida, horas por día/empleado
-- ===========================
=================================
CREATE   PROCEDURE dbo.sp_marcaje_reporte_asistencia
    @fecha_inicio DATE,
    @fecha_fin    DATE,
    @carnet       VARCHAR(20) = NULL  -- NULL = todos
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Carnet AS carne
t,
        c.Colaborador AS nombre_empleado,
        CAST(a.fecha AS DATE) AS dia,
        MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END) AS primera_entrada,
        MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END) AS ultima_salida,
 
       DATEDIFF(MINUTE,
            MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END),
            MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END)
        ) AS minutos_jornada,
        SUM(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN 1 ELS
E 0 END) AS total_entradas,
        SUM(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END) AS total_salidas,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_EXTRA' THEN 1 ELSE 0 END) AS sesiones_extra,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_COM
PENSADA' THEN 1 ELSE 0 END) AS sesiones_compensada,
        SUM(CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END) AS total_warnings,
        SUM(CASE WHEN a.motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END) AS fuera_geofence,
        COUNT(*) AS total_marc
ajes
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE CAST(a.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
      AND a.estado = 'ACEPTADA'
      AND (@carnet IS NULL OR a.carnet = @carnet)
    GROUP 
BY c.Carnet, c.Colaborador, CAST(a.fecha AS DATE)
    ORDER BY dia DESC, c.Colaborador;
END;
