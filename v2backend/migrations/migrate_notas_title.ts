
import * as dotenv from 'dotenv';
dotenv.config();

import { ejecutarQuery } from '../src/db/base.repo';

async function migrateNotas() {
    try {
        console.log('Verificando tabla p_Notas...');

        // Check if titulo exists
        const checkCol = await ejecutarQuery(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'p_Notas' AND COLUMN_NAME = 'titulo'
        `);

        if (checkCol.length === 0) {
            console.log('Agregando columna titulo a p_Notas...');
            await ejecutarQuery(`ALTER TABLE p_Notas ADD titulo NVARCHAR(300) NULL`);
            console.log('✅ Columna titulo agregada.');
        } else {
            console.log('ℹ️ Columna titulo ya existe.');
        }

    } catch (e) {
        console.error('❌ Error migrando p_Notas:', e);
    }
}

migrateNotas();
