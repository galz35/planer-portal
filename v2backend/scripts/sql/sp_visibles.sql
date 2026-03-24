
-- 2. sp_Proyecto_ObtenerVisibles (Including Responsable Name)
CREATE   PROCEDURE dbo.sp_Proyecto_ObtenerVisibles
(
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, 
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT p.*,
        creadorNombre = COALESCE(u1.nombre, u2.nombre),
        responsableNombre = ur.nombre, -- New Column
        progreso = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0)
    FROM dbo.p_Proyectos p
    LEFT JOIN p_Usuarios u1 ON p.idCreador = u1.idUsuario
    LEFT JOIN p_Usuarios u2 ON p.creadorCarnet = u2.carnet AND p.idCreador IS NULL
    LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet -- New Join
    WHERE 
        (
            p.idCreador = @idUsuario
            OR EXISTS (
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
