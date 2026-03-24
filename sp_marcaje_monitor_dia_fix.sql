-- ============================================================
-- SP 1: sp_marcaje_monitor_dia
-- Ver todos los marcajes del día con nombre del empleado
-- Para la pantalla de "Monitor en Tiempo Real"
-- ==================================================
==========
CREATE   PROCEDURE dbo.sp_marcaje_monitor_dia
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 =
 DATEADD(DAY, 1, @inicio);

    -- Result Set 1: Marcajes del día
    SELECT
        a.id,
        a.carnet,
        c.Colaborador AS nombre_empleado,
        a.tipo_marcaje,
        a.tipo_device,
        a.fecha,
        a.estado,
        a.motivo,
    
    a.lat,
        a.long,
        a.accuracy,
        a.ip,
        a.device_uuid,
        a.offline_id,
        CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END AS tiene_warn
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet 
= a.carnet
    WHERE a.fecha >= @inicio
      AND a.fecha < @fin
      AND a.estado = 'ACEPTADA'
    ORDER BY a.fecha DESC;
END;
