require('dotenv').config();
const { ejecutarQuery, ejecutarSP, sql, Int, NVarChar } = require('./dist/src/db/base.repo');

async function debugProyecto55() {
    try {
        console.log("=== CHECK YESENIA ADMIN ===");
        const user = await ejecutarQuery(`SELECT idUsuario, carnet, correo, rolGlobal FROM p_Usuarios WHERE correo = 'yesenia.manzanarez@claro.com.ni'`);
        if (user.length === 0) return console.log("No found");
        console.log("Yesenia:", user[0]);
        const idUsuario = user[0].idUsuario;
        const carnet = user[0].carnet;

        console.log("\n=== CHECK MI EQUIPO (acceso.repo) ===");
        const accesoRepo = require('./dist/src/acceso/acceso.repo');
        const miEquipo = await accesoRepo.obtenerMiEquipoPorCarnet(carnet);
        const idsEquipo = [...new Set(miEquipo.map(u => u.idUsuario).filter(id => id))];
        console.log("Tamaño del equipo de Yesenia:", idsEquipo.length);
        console.log("Muestra:", idsEquipo.slice(0, 5));

        console.log("\n=== CORRIENDO sp_Proyecto_ObtenerVisibles ===");
        const tvpEquipo = new sql.Table('dbo.TVP_IntList');
        tvpEquipo.columns.add('Id', sql.Int);
        idsEquipo.forEach((id) => tvpEquipo.rows.add(id));

        const projects = await ejecutarSP('sp_Proyecto_ObtenerVisibles', {
            idUsuario: { valor: idUsuario, tipo: Int },
            idsEquipo: tvpEquipo,
        });

        const p55 = projects.find(p => p.idProyecto === 55);
        if (p55) {
            console.log("¡Proyecto 55 ENCONTRADO EN LA SALIDA DEL SP!");
            console.log(p55);
        } else {
            console.log("El proyecto 55 NO está en la salida del SP 'obtenerVisibles'.");
        }

        // Just to know WHY she sees it internally: 
        // We'll manually run the logic of the SP if it is visible.
        if (p55) {
            console.log("Averigüemos por qué está en la salida...");
            const q = `
                SELECT 
                    idProyecto, nombre, idCreador,
                    (SELECT COUNT(*) FROM p_Tareas t WHERE t.idProyecto = p_Proyectos.idProyecto AND t.idCreador IN (${idsEquipo.join(',')})) as TareasCreadasEquipo,
                    (SELECT COUNT(*) FROM p_Tareas t JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea JOIN p_Usuarios u ON ta.carnet = u.carnet WHERE t.idProyecto = p_Proyectos.idProyecto AND u.idUsuario IN (${idsEquipo.join(',')})) as TareasAsignadasEquipo,
                    (SELECT COUNT(*) FROM p_ProyectoColaboradores pc WHERE pc.idProyecto = p_Proyectos.idProyecto AND pc.idUsuario IN (${idsEquipo.join(',')})) as ColaboradorEquipo
                FROM p_Proyectos
                WHERE idProyecto = 55
            `;
            const analysis = await ejecutarQuery(q);
            console.log("Análisis de relaciones directas/equipo: ", analysis);
        }

    } catch (e) {
        console.error(e);
    }
}

debugProyecto55().then(() => process.exit(0));
