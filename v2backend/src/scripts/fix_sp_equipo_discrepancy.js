const sql = require('mssql');
require('dotenv').config();

async function fixSpEquipo() {
    const config = {
        server: process.env.MSSQL_HOST || 'localhost',
        port: parseInt(process.env.MSSQL_PORT || '1433'),
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        database: process.env.MSSQL_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    };

    try {
        const pool = await sql.connect(config);
        console.log('✅ Conectado a SQL Server');

        const spFixed = `
ALTER PROCEDURE [dbo].[sp_Equipo_ObtenerHoy]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    CREATE TABLE #Carnets ( carnet VARCHAR(20) NOT NULL PRIMARY KEY );
    INSERT INTO #Carnets(carnet) 
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value))) 
    FROM STRING_SPLIT(@carnetsList, ',') s 
    WHERE LTRIM(RTRIM(s.value)) <> '';

    ;WITH UsuariosFiltrados AS (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    ),
    TareasVisibles AS (
        -- Consolidamos todas las tareas que cada usuario debe gestionar
        -- Usamos la misma lógica de visibilidad que en el popup detallado
        SELECT uf.idUsuario, t.idTarea, t.estado, t.fechaObjetivo, t.fechaCompletado, t.fechaActualizacion
        FROM UsuariosFiltrados uf
        INNER JOIN p_Tareas t ON t.activo = 1
        WHERE (
            -- 1. Asignado explícitamente como Responsable (vía Carnet o ID)
            EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea AND (ta.carnet = uf.carnet OR ta.idUsuario = uf.idUsuario) AND ta.tipo = 'Responsable')
            
            -- 2. Creador de la tarea (si no tiene asignados)
            OR ( (t.creadorCarnet = uf.carnet OR t.idCreador = uf.idUsuario) AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea) )
            
            -- 3. Dueño/Creador del proyecto al que pertenece la tarea
            OR EXISTS (
                SELECT 1 FROM p_Proyectos p 
                WHERE t.idProyecto = p.idProyecto 
                AND (p.responsableCarnet = uf.carnet OR p.creadorCarnet = uf.carnet OR (p.idCreador = uf.idUsuario AND p.creadorCarnet IS NULL))
            )
        )
    )
    SELECT 
        uf.idUsuario, 
        uf.carnet,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND t.fechaObjetivo < @d0 THEN 1 ELSE 0 END) AS retrasadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND (t.fechaObjetivo >= @d0 OR t.fechaObjetivo IS NULL) THEN 1 ELSE 0 END) AS planificadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Hecha' AND COALESCE(t.fechaCompletado, t.fechaActualizacion) >= @d0 AND COALESCE(t.fechaCompletado, t.fechaActualizacion) < @d1 THEN 1 ELSE 0 END) AS hechas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'EnCurso' THEN 1 ELSE 0 END) AS enCurso,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Bloqueada' THEN 1 ELSE 0 END) AS bloqueadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Descartada' AND t.fechaActualizacion >= @d0 AND t.fechaActualizacion < @d1 THEN 1 ELSE 0 END) AS descartadas
    FROM UsuariosFiltrados uf
    LEFT JOIN TareasVisibles t ON t.idUsuario = uf.idUsuario
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
        `;

        await pool.request().query(spFixed);
        console.log('✅ SP sp_Equipo_ObtenerHoy actualizado con éxito.');

        // Aplicar la misma lógica a sp_Equipo_ObtenerInforme para consistencia
        const spInformeFixed = spFixed.replace('sp_Equipo_ObtenerHoy', 'sp_Equipo_ObtenerInforme');
        await pool.request().query(spInformeFixed);
        console.log('✅ SP sp_Equipo_ObtenerInforme actualizado con éxito.');

        await pool.close();
    } catch (err) {
        console.error('❌ Error actualizando SP:', err);
    }
}

fixSpEquipo();
