
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkAnyOrphan() {
    try {
        const result = await ejecutarQuery(`
            SELECT TOP 10 t.idTarea, t.nombre, t.idProyecto, p.nombre as proyecto
            FROM p_Tareas t
            LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            WHERE t.activo = 1 
              AND ta.idUsuario IS NULL
        `);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkAnyOrphan();
