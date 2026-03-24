require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');

async function debugY() {
    try {
        const u = await ejecutarQuery(`SELECT carnet FROM p_Usuarios WHERE correo = 'yesenia.manzanarez@claro.com.ni'`);
        const carnet = u[0].carnet;

        console.log("SQL EVALUADO EN APP CONTRA P55:");
        const isCreadora = await ejecutarQuery(`SELECT 1 as x FROM p_Proyectos WHERE idProyecto = 55 AND creadorCarnet = '${carnet}'`);
        console.log("Es creadora:", isCreadora.length > 0);

        const isColab = await ejecutarQuery(`SELECT 1 as x FROM p_ProyectoColaboradores JOIN p_Usuarios u ON p_ProyectoColaboradores.idUsuario = u.idUsuario WHERE idProyecto = 55 AND u.correo = 'yesenia.manzanarez@claro.com.ni'`);
        console.log("Es colab:", isColab.length > 0);

        const hasTask = await ejecutarQuery(`SELECT 1 as x FROM p_Tareas t JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea WHERE t.idProyecto = 55 AND ta.carnet = '${carnet}'`);
        console.log("Tiene tareas?", hasTask.length > 0);

        const p = await ejecutarQuery(`SELECT creadorCarnet FROM p_Proyectos WHERE idProyecto = 55`);
        if (p.length > 0) {
            const cC = p[0].creadorCarnet;
            console.log("Creador del proy 55: ", cC);
            const creadorInfo = await ejecutarQuery(`SELECT nombre, gerente, jefeInmediato FROM p_Usuarios WHERE carnet = '${cC}'`);
            console.log("Info del creador:", creadorInfo[0]);

            const yInfo = await ejecutarQuery(`SELECT nombre, gerente, jefeInmediato FROM p_Usuarios WHERE carnet = '${carnet}'`);
            console.log("Info de Yesenia:", yInfo[0]);
        }

        // CHECK VISIBILITY API QUERY LOGIC: Let's see how clarity.service gets team.
        // Or if it's because she is a director/gerente?

    } catch (e) { console.error(e) }
}
debugY().then(() => process.exit(0));
