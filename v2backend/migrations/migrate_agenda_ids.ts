
import * as dotenv from 'dotenv';
dotenv.config(); // Load .env

import { ejecutarQuery } from '../src/db/base.repo';

async function migrateAgenda() {
    try {
        console.log('Iniciando migración de Agenda...');

        // 1. Verificar si existe la tabla p_Agenda
        const checkTable = await ejecutarQuery(`
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'p_Agenda'
        `);

        if (checkTable.length === 0) {
            console.log('⚠️ Tabla p_Agenda NO encontrada. Verificando alternativas...');
            // Check if user meant p_FocoDiario but logically it uses idUsuario
            return;
        }

        console.log('✅ Tabla p_Agenda detectada.');

        // 2. Verificar/Crear columna idUsuario
        const checkCol = await ejecutarQuery(`
            SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'p_Agenda' AND COLUMN_NAME = 'idUsuario'
        `);

        if (checkCol.length === 0) {
            console.log('Agregando columna idUsuario a p_Agenda...');
            await ejecutarQuery(`ALTER TABLE p_Agenda ADD idUsuario INT NULL`);
        } else {
            console.log('Columna idUsuario ya existe.');
        }

        // 3. Ejecutar migración masiva
        console.log('Ejecutando update cruzado con p_Usuarios...');
        await ejecutarQuery(`
            UPDATE a
            SET a.idUsuario = u.idUsuario
            FROM p_Agenda a
            JOIN p_Usuarios u ON a.carnet = u.carnet
            WHERE a.idUsuario IS NULL AND a.carnet IS NOT NULL
        `);

        // 4. Verificar resultados
        const stats = await ejecutarQuery(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN idUsuario IS NOT NULL THEN 1 ELSE 0 END) as migrados,
                SUM(CASE WHEN idUsuario IS NULL THEN 1 ELSE 0 END) as pendientes
            FROM p_Agenda
        `);

        console.log('Resultados:', stats[0]);
        console.log('✅ Migración completada exitosamente.');

    } catch (e) {
        console.error('❌ Error en migración:', e);
    }
}

migrateAgenda();
