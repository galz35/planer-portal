
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function count165() {
    const result = await ejecutarQuery(`SELECT COUNT(*) as total FROM p_Tareas WHERE idProyecto = 165 AND activo = 1`);
    console.log('Total Activas Proyecto 165:', result[0].total);
    process.exit(0);
}

count165();
