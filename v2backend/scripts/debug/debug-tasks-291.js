require('dotenv').config();
const { ejecutarQuery, Int } = require('./dist/src/db/base.repo');

async function checkTask291() {
    const sql = `
        SELECT t.idTarea, t.nombre as tareaNombre, t.creadorCarnet, u.nombre as usuarioNombre
        FROM p_Tareas t
        LEFT JOIN p_Usuarios u ON t.creadorCarnet = u.carnet
        WHERE t.idTarea IN (291, 231)
    `;
    const result = await ejecutarQuery(sql, {});
    console.log(result);
}

checkTask291().catch(console.error);
