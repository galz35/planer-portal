const sql = require('mssql');
async function run() {
    try {
        await sql.connect('Server=190.56.16.85,1433;Database=Bdplaner;User Id=sa;Password=TuPasswordFuerte!2026;TrustServerCertificate=true');
        const req = new sql.Request();
        const result = await req.query(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Tareas_ObtenerPorProyecto')) AS def`);
        const fs = require('fs');
        fs.writeFileSync('sp_Tareas_ObtenerPorProyecto.txt', result.recordset[0].def, 'utf8');
        console.log('ok');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        sql.close();
    }
}
run();
