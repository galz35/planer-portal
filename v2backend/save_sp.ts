
import { ejecutarQuery } from './src/db/base.repo';
const fs = require('fs');
require('dotenv').config();

async function fetchAndSaveSP() {
    try {
        const result = await ejecutarQuery(`
            SELECT text FROM syscomments 
            WHERE id = OBJECT_ID('sp_Tareas_ObtenerPorProyecto')
            ORDER BY colid
        `);
        const content = result.map((r: any) => r.text).join('');
        fs.writeFileSync('sp_Tareas_ObtenerPorProyecto.sql', content);
        console.log('SP saved to sp_Tareas_ObtenerPorProyecto.sql');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

fetchAndSaveSP();
