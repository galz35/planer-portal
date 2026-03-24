import { ejecutarQuery } from '../../src/db/base.repo';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    console.log('🚀 Iniciando creación de tabla de notificaciones...');
    const sqlPath = path.join(__dirname, 'migrations', 'create_table_notificaciones.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Dividir por GO o ejecutar en bloques si es necesario, 
    // pero como son comandos simples de CREATE TABLE los mandaré por separado.
    const commands = sql.split(';').filter(cmd => cmd.trim().length > 0);

    for (const cmd of commands) {
        try {
            await ejecutarQuery(cmd);
            console.log('✅ Comando ejecutado con éxito.');
        } catch (error) {
            if (error.message.includes('already an object named')) {
                console.warn('⚠️ La tabla o índice ya existe.');
            } else {
                console.error('❌ Error ejecutando comando:', error.message);
            }
        }
    }
    console.log('🏁 Proceso finalizado.');
    process.exit(0);
}

run();
