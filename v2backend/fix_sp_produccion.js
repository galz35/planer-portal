const mssql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const query = `
ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerVisibles]
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY,
    @nombre    NVARCHAR(200) = NULL,
    @estado    NVARCHAR(50)  = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT p.*,
           creadorNombre = COALESCE(u1.nombre, u2.nombre),
           responsableNombre = ur.nombre,
           progreso = ISNULL((
               SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 
                    ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
               FROM p_Tareas t
               WHERE t.idProyecto = p.idProyecto 
                 AND t.idTareaPadre IS NULL AND t.activo = 1
                 AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
           ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios u1 ON p.idCreador = u1.idUsuario
    LEFT JOIN p_Usuarios u2 ON p.creadorCarnet = u2.carnet
    LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet
    WHERE (
        -- 1. Acceso Directo: Admin o creador/responsable directo
        p.idCreador = @idUsuario
        OR p.idResponsable = @idUsuario

        -- 2. Modo JERARQUIA: visible si alguien del equipo es parte del proyecto
        OR (
            p.modoVisibilidad IN ('JERARQUIA', 'JERARQUIA_COLABORADOR')
            AND (
                -- Tiene tareas activas asignadas a alguien de mi equipo
                EXISTS (
                    SELECT 1
                    FROM dbo.p_Tareas t
                    INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                    INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                    WHERE t.idProyecto = p.idProyecto AND t.activo = 1
                )
                -- O el Creador pertenece a mi equipo (ESTE FUE EL FIX)
                OR p.idCreador IN (SELECT Id FROM @idsEquipo)
                -- O el Responsable pertenece a mi equipo (ESTE FUE EL FIX)
                OR p.idResponsable IN (SELECT Id FROM @idsEquipo)
            )
        )

        -- 3. Modo COLABORADOR explicito
        OR (
            p.modoVisibilidad IN ('COLABORADOR', 'JERARQUIA_COLABORADOR')
            AND EXISTS (
                SELECT 1
                FROM dbo.p_ProyectoColaboradores pc
                WHERE pc.idProyecto = p.idProyecto
                  AND pc.idUsuario = @idUsuario
                  AND pc.activo = 1
            )
        )
    )
    AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
    AND (@estado IS NULL OR p.estado = @estado)
    ORDER BY p.fechaCreacion DESC;
END
`;

async function applyFix() {
    let pool;
    try {
        console.log('Conectando a base de datos...');
        pool = await mssql.connect(config);
        console.log('Conexión exitosa. Ejecutando ALTER PROCEDURE...');
        await pool.request().query(query);
        console.log('✅ Procedimiento Almacenado sp_Proyecto_ObtenerVisibles actualizado correctamente.');
    } catch (err) {
        console.error('❌ Error aplicando script en base de datos:', err);
    } finally {
        if (pool) await pool.close();
    }
}

applyFix();
