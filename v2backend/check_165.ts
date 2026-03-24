
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkProject165() {
    console.log('--- Analizando Proyecto 165 ---');
    try {
        const result = await ejecutarQuery(`
            SELECT t.idTarea, t.nombre, t.idCreador, t.creadorCarnet, u.nombre as creadorActual
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            LEFT JOIN p_Usuarios u ON t.idCreador = u.idUsuario
            WHERE t.idProyecto = 165 
              AND ta.idUsuario IS NULL
        `);
        console.log('Detalles:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkProject165();
