require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');
const fs = require('fs');

async function check() {
    try {
        const u = await ejecutarQuery(`SELECT idUsuario, carnet FROM p_Usuarios WHERE correo = 'yesenia.manzanarez@claro.com.ni'`);
        const idUsuario = u[0].idUsuario;
        const carnet = u[0].carnet;

        const accesoRepo = require('./dist/src/acceso/acceso.repo');
        const miEquipo = await accesoRepo.obtenerMiEquipoPorCarnet(carnet);
        const idsEquipo = [...new Set(miEquipo.map(uu => uu.idUsuario).filter(id => id))];

        const tareas = await ejecutarQuery(`
            SELECT t.idTarea, t.nombre, t.estado, ta.carnet, u.nombre as asignadoNombre
            FROM p_Tareas t 
            JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
            JOIN p_Usuarios u ON ta.carnet = u.carnet
            WHERE t.idProyecto = 55 AND u.idUsuario IN (${idsEquipo.join(',')})
        `);

        fs.writeFileSync('output_tareas_p55.json', JSON.stringify({ tareas, miEquipo: miEquipo.slice(0, 5) }, null, 2));
    } catch (e) { console.error(e) }
}
check().then(() => process.exit(0));
