
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function findGlobalOrphans() {
    try {
        const result = await ejecutarQuery(`
            SELECT t.idTarea, t.nombre, t.idProyecto, t.idCreador, t.creadorCarnet
            FROM p_Tareas t
            WHERE t.activo = 1
              AND NOT EXISTS (
                  SELECT 1 FROM p_TareaAsignados ta 
                  WHERE ta.idTarea = t.idTarea AND ta.tipo = 'Responsable'
              )
        `);
        console.log('Huérfanas Globales:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

findGlobalOrphans();
