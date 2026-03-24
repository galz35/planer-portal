
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkCols() {
    try {
        const result = await ejecutarQuery(`
            SELECT TOP 1 * FROM p_Tareas WHERE idProyecto = 165
        `);
        console.log('Columnas p_Tareas:', Object.keys(result[0] || {}).join(', '));

        const tasks = await ejecutarQuery(`
            SELECT idTarea, nombre, idResponsable FROM p_Tareas WHERE idProyecto = 165
        `);
        console.log('Tareas 165:', JSON.stringify(tasks, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkCols();
