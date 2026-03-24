require('dotenv').config();
const sql = require('mssql');

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.MSSQL_USER,
            password: process.env.MSSQL_PASSWORD,
            database: process.env.MSSQL_DATABASE,
            server: process.env.MSSQL_HOST,
            port: parseInt(process.env.MSSQL_PORT),
            options: { encrypt: false, trustServerCertificate: true }
        });

        const sqlText = `
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_DescartarConSubtareas]
    @idTarea INT,
    @carnet   NVARCHAR(100) = NULL,
    @motivo   NVARCHAR(MAX) = 'Descarte manual'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Iniciar transacción para asegurar atomicidad
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Descartar la tarea principal (Soft Delete)
        UPDATE p_Tareas 
        SET activo = 0, 
            estado = 'Descartada', 
            fechaActualizacion = GETDATE(),
            descripcion = ISNULL(descripcion, '') + CHAR(13) + CHAR(10) + 'Motivo descarte: ' + @motivo
        WHERE idTarea = @idTarea;

        -- 2. Identificar y descartar recursivamente todas las subtareas vivas
        -- Usamos un Common Table Expression (CTE) para navegar el árbol de tareas
        ;WITH Jerarquia AS (
            SELECT idTarea 
            FROM p_Tareas 
            WHERE idTareaPadre = @idTarea
            
            UNION ALL
            
            SELECT t.idTarea 
            FROM p_Tareas t
            INNER JOIN Jerarquia j ON t.idTareaPadre = j.idTarea
        )
        UPDATE p_Tareas
        SET activo = 0,
            estado = 'Descartada',
            fechaActualizacion = GETDATE()
        FROM p_Tareas t
        INNER JOIN Jerarquia j ON t.idTarea = j.idTarea
        WHERE t.activo = 1;

        COMMIT TRANSACTION;
        SELECT 1 as success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH
END
`;
        await pool.request().query(sqlText);
        console.log('✅ SP [sp_Tarea_DescartarConSubtareas] creado/actualizado exitosamente en ' + process.env.MSSQL_DATABASE);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

run();
