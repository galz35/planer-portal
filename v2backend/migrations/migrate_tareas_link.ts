
import * as dotenv from 'dotenv';
dotenv.config();

import { ejecutarQuery } from '../src/db/base.repo';

async function migrateTareasLink() {
    try {
        console.log('Verificando tabla p_Tareas...');

        // Check if linkEvidencia exists
        const checkCol = await ejecutarQuery(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'p_Tareas' AND COLUMN_NAME = 'linkEvidencia'
        `);

        if (checkCol.length === 0) {
            console.log('Agregando columna linkEvidencia a p_Tareas...');
            // NVARCHAR(MAX) or 500 for URLs
            await ejecutarQuery(`ALTER TABLE p_Tareas ADD linkEvidencia NVARCHAR(MAX) NULL`);
            console.log('✅ Columna linkEvidencia agregada.');
        } else {
            console.log('ℹ️ Columna linkEvidencia ya existe.');
        }

    } catch (e) {
        console.error('❌ Error migrando p_Tareas:', e);
    }
}

migrateTareasLink();
