
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkDetails() {
    console.log('--- Analizando 6 Tareas Huérfanas ---');
    try {
        const result = await ejecutarQuery(`
            SELECT TOP 6 t.idTarea, t.nombre, t.idCreador, t.creadorCarnet, t.idProyecto
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            WHERE t.activo = 1 
              AND ta.idUsuario IS NULL
              AND (t.idCreador IS NOT NULL OR t.creadorCarnet IS NOT NULL)
        `);
        console.log('Detalles:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkDetails();
