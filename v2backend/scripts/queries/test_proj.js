const sql = require('mssql');
async function run() {
    try {
        await sql.connect('Server=190.56.16.85,1433;Database=Bdplaner;User Id=sa;Password=TuPasswordFuerte!2026;TrustServerCertificate=true');
        const req = new sql.Request();
        const result = await req.query(`
      SELECT 
        idTarea, 
        SUBSTRING(nombre, 1, 30) as nombre, 
        estado, 
        porcentaje, 
        CAST(CASE WHEN estado = 'Hecha' THEN 100 ELSE ISNULL(porcentaje, 0) END AS FLOAT) as calc 
      FROM p_Tareas 
      WHERE idProyecto = 92 
        AND idTareaPadre IS NULL 
        AND activo = 1 
        AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
    `);
        console.table(result.recordset);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        sql.close();
    }
}
run();
