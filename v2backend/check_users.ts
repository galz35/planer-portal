
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkUsers() {
    try {
        const result = await ejecutarQuery(`
            SELECT idUsuario, carnet, nombre FROM p_Usuarios 
            WHERE idUsuario IN (123, 999)
        `);
        console.log('Usuarios encontrados:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkUsers();
