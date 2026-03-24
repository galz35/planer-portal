
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function check165Again() {
    try {
        const result = await ejecutarQuery(`
            SELECT t.idTarea, t.nombre, ta.idUsuario as idResponsable
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            WHERE t.idProyecto = 165 AND t.activo = 1
        `);
        console.log('Tareas 165:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

check165Again();
