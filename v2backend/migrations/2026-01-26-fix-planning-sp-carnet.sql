
-- --- PLANNING CORREGIDO PARA CARNET-FIRST ---

CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idPlan INT;
    
    -- Buscar usando la nueva columna carnet
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
    WHERE carnet = @carnet AND mes = @mes AND anio = @anio;

    IF @idPlan IS NULL 
    BEGIN
        -- Fallback por si hay registros viejos sin carnet lleno
        SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet) 
          AND mes = @mes AND anio = @anio;
    END

    IF @idPlan IS NULL SELECT NULL as idPlan;
    ELSE
    BEGIN
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        -- Las tareas ya tienen asignadoCarnet o creadorCarnet
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END
GO
