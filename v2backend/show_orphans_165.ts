
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function showOrphans165() {
    try {
        const result = await ejecutarQuery(`
            SELECT t.idTarea, t.nombre, t.idCreador, u.nombre as creadorActual
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            LEFT JOIN p_Usuarios u ON t.idCreador = u.idUsuario
            WHERE t.idProyecto = 165 AND t.activo = 1 AND ta.idUsuario IS NULL
        `);
        console.log('Orphan count in 165:', result.length);
        if (result.length > 0) {
            console.log('List of orphans (ID and name):');
            result.forEach((t: any) => console.log(`[${t.idTarea}] ${t.nombre} - Creador: ${t.creadorActual || t.idCreador}`));
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

showOrphans165();
