
-- SP: Obtener Planes de Trabajo (Carnet-First)
CREATE OR ALTER PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idPlan INT;
    
    -- 1. Intentar buscar por carnet directo
    SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
    WHERE carnet = @carnet AND mes = @mes AND anio = @anio;

    -- 2. Fallback por si acaso (aunque la migración ya los llenó)
    IF @idPlan IS NULL
    BEGIN
        SELECT @idPlan = idPlan FROM p_PlanesTrabajo 
        WHERE idUsuario = (SELECT idUsuario FROM p_Usuarios WHERE carnet = @carnet)
          AND mes = @mes AND anio = @anio;
    END

    IF @idPlan IS NULL 
    BEGIN
        -- No existe, devolvemos resultset vacío o null
        SELECT NULL as idPlan;
    END
    ELSE
    BEGIN
        -- Devolver datos del plan
        SELECT * FROM p_PlanesTrabajo WHERE idPlan = @idPlan;
        
        -- Devolver tareas asociadas al plan
        SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.idPlan = @idPlan
        ORDER BY t.orden ASC;
    END
END
GO
