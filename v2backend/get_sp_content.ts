
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function fetchSP() {
    try {
        const result = await ejecutarQuery(`
            SELECT text FROM syscomments 
            WHERE id = OBJECT_ID('sp_Tareas_ObtenerPorProyecto')
            ORDER BY colid
        `);
        console.log('SP Content:');
        result.forEach((r: any) => console.log(r.text));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

fetchSP();
