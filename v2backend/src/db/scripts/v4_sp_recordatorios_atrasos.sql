
-- ========================================================
-- SP: REPORTE DE TAREAS ATRASADAS PARA ESCALACIÓN (CRON)
-- Fecha: 2026-02-23
-- Descripción: Obtiene tareas atrasadas de proyectos específicos
--              (Estratégico, AMX, CENAM) e incluye datos del jefe.
-- ========================================================

CREATE OR ALTER PROCEDURE [dbo].[sp_Reporte_TareasAtrasadas_Cron]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.idTarea,
        t.nombre AS tituloTarea,
        t.fechaObjetivo,
        DATEDIFF(DAY, t.fechaObjetivo, GETDATE()) AS diasAtraso,
        p.nombre AS proyectoNombre,
        p.tipo AS proyectoTipo,
        -- Datos del Colaborador (Asignado)
        u.carnet AS carnetAsignado,
        u.nombre AS nombreAsignado,
        u.correo AS correoAsignado,
        -- Datos del Jefe Directo
        u.jefeNombre,
        u.jefeCorreo,
        u.jefeCarnet
    FROM p_Tareas t
    INNER JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.activo = 1
      AND t.estado NOT IN ('Hecha', 'Eliminada', 'Descartada', 'Anulada', 'Cancelada')
      AND t.fechaObjetivo < CAST(GETDATE() AS DATE) -- YA venció (ayer o antes)
      -- Filtro de Proyectos Críticos solicitado por el usuario
      AND (
          UPPER(p.tipo) LIKE '%ESTRATEGICO%' 
          OR UPPER(p.tipo) LIKE '%AMX%' 
          OR UPPER(p.tipo) LIKE '%CENAM%'
      )
    ORDER BY u.jefeCarnet, u.carnet, t.fechaObjetivo ASC;
END
GO
