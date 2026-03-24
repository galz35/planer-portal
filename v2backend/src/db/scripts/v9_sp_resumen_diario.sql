-- ========================================================
-- ROUTINE: sp_ObtenerResumenDiarioEquipo
-- ========================================================

IF TYPE_ID('dbo.TVP_StringList') IS NULL
BEGIN
    CREATE TYPE dbo.TVP_StringList AS TABLE
    (
        Item NVARCHAR(MAX)
    );
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_ObtenerResumenDiarioEquipo]
    @CarnetsCsv NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);


    SELECT 
        p.idProyecto,
        p.nombre AS proyectoNombre,
        t.idTarea,
        t.nombre AS tareaTitulo,
        t.estado AS estadoActual,
        t.porcentaje AS progresoActual,
        u.nombre AS usuarioNombre,
        u.carnet AS usuarioCarnet,
        t.fechaInicioReal,
        t.fechaFinReal,
        t.esfuerzo,
        -- Diferencia para sacar las horas reales aproximadas
        DATEDIFF(HOUR, t.fechaInicioReal, t.fechaFinReal) AS horasReales,
        -- Indicador
        CASE 
            WHEN CAST(t.fechaFinReal AS DATE) = @Hoy THEN 'COMPLETADA'
            ELSE 'AVANCE'
        END AS tipoAccion
    FROM p_Tareas t
    INNER JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    INNER JOIN p_Usuarios u ON t.asignadoCarnet = u.carnet
    INNER JOIN STRING_SPLIT(@CarnetsCsv, ',') eq ON eq.value = u.carnet
    WHERE 
        (CAST(t.fechaFinReal AS DATE) = @Hoy)
        OR 
        t.idTarea IN (
            -- Tareas que tuvieron al menos un avance guardado HOY por alguien del equipo
            SELECT a.idTarea 
            FROM p_TareaAvances a
            INNER JOIN p_Usuarios ua ON a.idUsuario = ua.idUsuario
            INNER JOIN STRING_SPLIT(@CarnetsCsv, ',') eqa ON eqa.value = ua.carnet
            WHERE CAST(a.fecha AS DATE) = @Hoy
        )
    ORDER BY p.nombre, tipoAccion DESC, u.nombre;
END
GO
