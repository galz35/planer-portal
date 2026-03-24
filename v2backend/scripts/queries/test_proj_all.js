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
        idTareaPadre
      FROM p_Tareas 
      WHERE idProyecto = 92 
        AND activo = 1 
        AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
      ORDER BY idTareaPadre, idTarea
    `);
        const fs = require('fs');
        fs.writeFileSync('output3.json', JSON.stringify(result.recordset, null, 2), 'utf8');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        sql.close();
    }
}
run();
