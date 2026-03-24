
-- ========================================================
-- MIGRACIÓN FINAL: CONSOLIDACIÓN DE CARNET EN TODO EL BACKEND
-- Fecha: 2026-01-25
-- ========================================================

-- 1. Agregar columnas carnet donde falten
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Tareas' AND COLUMN_NAME = 'creadorCarnet')
    ALTER TABLE p_Tareas ADD creadorCarnet NVARCHAR(50);

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Tareas' AND COLUMN_NAME = 'asignadoCarnet')
    ALTER TABLE p_Tareas ADD asignadoCarnet NVARCHAR(50); -- Responsable principal denormalizado

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Notas' AND COLUMN_NAME = 'carnet')
    ALTER TABLE p_Notas ADD carnet NVARCHAR(50);

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_CheckinTareas' AND COLUMN_NAME = 'carnet')
    ALTER TABLE p_CheckinTareas ADD carnet NVARCHAR(50);

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_Bloqueos' AND COLUMN_NAME = 'carnetOrigen')
    ALTER TABLE p_Bloqueos ADD carnetOrigen NVARCHAR(50), carnetDestino NVARCHAR(50);

GO

-- 2. Sincronizar Datos Iniciales
UPDATE t SET t.creadorCarnet = u.carnet FROM p_Tareas t JOIN p_Usuarios u ON t.idCreador = u.idUsuario WHERE t.creadorCarnet IS NULL;
UPDATE ta SET ta.carnet = u.carnet FROM p_TareaAsignados ta JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario WHERE ta.carnet IS NULL;
UPDATE n SET n.carnet = u.carnet FROM p_Notas n JOIN p_Usuarios u ON n.idUsuario = u.idUsuario WHERE n.carnet IS NULL;
UPDATE c SET c.carnet = u.carnet FROM p_CheckinTareas c JOIN p_Usuarios u ON c.idUsuario = u.idUsuario WHERE c.carnet IS NULL;
UPDATE b SET b.carnetOrigen = u.carnet FROM p_Bloqueos b JOIN p_Usuarios u ON b.idOrigenUsuario = u.idUsuario WHERE b.carnetOrigen IS NULL;
UPDATE b SET b.carnetDestino = u.carnet FROM p_Bloqueos b JOIN p_Usuarios u ON b.idDestinoUsuario = u.idUsuario WHERE b.carnetDestino IS NULL;

-- 3. Crear Indices de Altura (Performance)
CREATE INDEX IX_p_Tareas_CreadorCarnet ON p_Tareas(creadorCarnet) WHERE activo = 1;
CREATE INDEX IX_p_TareaAsignados_Carnet ON p_TareaAsignados(carnet);
CREATE INDEX IX_p_Notas_Carnet ON p_Notas(carnet);
CREATE INDEX IX_p_CheckinTareas_Carnet ON p_CheckinTareas(carnet);

GO

-- 4. Actualizar SPs para usar Carnet como parámetro dominante
CREATE OR ALTER PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario]
    @carnet NVARCHAR(50), 
    @estado NVARCHAR(50) = NULL,
    @idProyecto INT = NULL,
    @query NVARCHAR(100) = NULL,
    @startDate DATETIME = NULL,
    @endDate DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT
        t.*, 
        p.nombre as proyectoNombre,
        ta_resp.idUsuario as idResponsable,
        u_resp.carnet as responsableCarnet,
        u_resp.nombreCompleto as responsableNombre
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    LEFT JOIN p_TareaAsignados ta_resp ON t.idTarea = ta_resp.idTarea AND ta_resp.tipo = 'Responsable'
    LEFT JOIN p_Usuarios u_resp ON ta_resp.idUsuario = u_resp.idUsuario
    WHERE (t.creadorCarnet = @carnet OR ta.carnet = @carnet)
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (@query IS NULL OR (t.nombre LIKE '%' + @query + '%' OR t.descripcion LIKE '%' + @query + '%'))
      AND (
          (@startDate IS NULL OR @endDate IS NULL) 
          OR (t.fechaObjetivo >= @startDate AND t.fechaObjetivo <= @endDate)
      )
      AND t.activo = 1
    ORDER BY t.fechaObjetivo ASC;
END
GO
