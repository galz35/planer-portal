
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkOrphans() {
    console.log('--- Verificando Tareas Huérfanas ---');
    try {
        const result = await ejecutarQuery(`
            SELECT COUNT(*) as total
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            WHERE t.activo = 1 
              AND ta.idUsuario IS NULL
              AND t.idCreador IS NOT NULL;
        `);
        console.log('Total Huérfanas:', result[0]?.total || 0);
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkOrphans();
