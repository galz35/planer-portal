
-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 4 (PLANNING & RECURRENCIA)
-- Fecha: 2026-01-25
-- Descripción: SPs para eliminar SQL inline en Planning y Recurrencia.
-- =============================================

-- --- RECURRENCIA ---

CREATE OR ALTER PROCEDURE [dbo].[sp_Recurrencia_Crear]
    @idTarea INT,
    @tipoRecurrencia NVARCHAR(20),
    @diasSemana NVARCHAR(50) = NULL,
    @diaMes INT = NULL,
    @fechaInicioVigencia DATE,
    @fechaFinVigencia DATE = NULL,
    @idCreador INT
AS
BEGIN
    INSERT INTO p_TareaRecurrencia (idTarea, tipoRecurrencia, diasSemana, diaMes, fechaInicioVigencia, fechaFinVigencia, activo, idCreador)
    VALUES (@idTarea, @tipoRecurrencia, @diasSemana, @diaMes, @fechaInicioVigencia, @fechaFinVigencia, 1, @idCreador);
    SELECT SCOPE_IDENTITY() as id;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_Recurrencia_ObtenerPorTarea]
    @idTarea INT
AS
BEGIN
    SELECT * FROM p_TareaRecurrencia WHERE idTarea = @idTarea AND activo = 1;
END
GO

CREATE OR ALTER PROCEDURE [dbo].[sp_Instancia_Upsert]
    @idTarea INT,
    @idRecurrencia INT = NULL,
    @fechaProgramada DATE,
    @estadoInstancia NVARCHAR(20),
    @comentario NVARCHAR(MAX) = NULL,
    @idUsuarioEjecutor INT = NULL,
    @fechaReprogramada DATE = NULL
AS
BEGIN
    IF EXISTS (SELECT 1 FROM p_TareaInstancia WHERE idTarea = @idTarea AND fechaProgramada = @fechaProgramada)
    BEGIN
        UPDATE p_TareaInstancia 
        SET estadoInstancia = @estadoInstancia,
            comentario = @comentario,
            fechaEjecucion = CASE WHEN @estadoInstancia IN ('HECHA', 'OMITIDA') THEN GETDATE() ELSE fechaEjecucion END,
            fechaReprogramada = @fechaReprogramada,
            idUsuarioEjecutor = @idUsuarioEjecutor
        WHERE idTarea = @idTarea AND fechaProgramada = @fechaProgramada;
        SELECT id FROM p_TareaInstancia WHERE idTarea = @idTarea AND fechaProgramada = @fechaProgramada;
    END
    ELSE
    BEGIN
        INSERT INTO p_TareaInstancia (idTarea, idRecurrencia, fechaProgramada, estadoInstancia, comentario, idUsuarioEjecutor, fechaEjecucion, fechaReprogramada)
        VALUES (@idTarea, @idRecurrencia, @fechaProgramada, @estadoInstancia, @comentario, @idUsuarioEjecutor, 
                CASE WHEN @estadoInstancia IN ('HECHA', 'OMITIDA') THEN GETDATE() ELSE NULL END,
                @fechaReprogramada);
        SELECT SCOPE_IDENTITY() as id;
    END
END
GO

-- --- PLANNING ---

CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @idUsuario INT,
    @mes INT,
    @anio INT
AS
BEGIN
    DECLARE @idPlan INT;
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo WHERE idUsuario = @idUsuario AND mes = @mes AND anio = @anio;

    IF @idPlan IS NULL SELECT NULL as idPlan;
    ELSE
    BEGIN
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END
GO
