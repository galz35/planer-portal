const sql = require('mssql');

const config = {
    user: 'sa',
    password: 'TuPasswordFuerte!2026',
    server: '190.56.16.85',
    database: 'Bdplaner',
    options: { encrypt: false, trustServerCertificate: true }
};

async function main() {
    try {
        await sql.connect(config);
        let result = await sql.query("SELECT idUsuario, carnet FROM p_Usuarios WHERE nombre LIKE '%ISLENY%' OR carnet LIKE '%ISLENY%'");
        if (result.recordset.length > 0) {
            const isleny = result.recordset[0];
            const carnet = isleny.carnet;

            let spTasks = await sql.query(`EXEC sp_Tareas_ObtenerPorUsuario @carnet = '${carnet}'`);
            console.log("=== SP TASKS OBTENIDAS ===");
            console.log(JSON.stringify(spTasks.recordset.map(t => ({ id: t.idTarea, titulo: t.titulo, estado: t.estado, proyecto: t.proyectoNombre, atrasada: t.esAtrasada })), null, 2));

            let spProjects = await sql.query(`EXEC sp_Planning_ObtenerProyectosAsignados @carnet = '${carnet}'`);
            console.log("=== PROYECTOS ===");
            console.log(JSON.stringify(spProjects.recordset.map(p => ({ id: p.idProyecto, nombre: p.nombre })), null, 2));
        }
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
main();
