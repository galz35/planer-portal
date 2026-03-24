
import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from '@nestjs/common';
import * as planningRepo from './planning/planning.repo';
import { obtenerPoolSql } from './db/sqlserver.provider';

async function testQuery() {
    const logger = new Logger('TestQuery');
    try {
        const pool = await obtenerPoolSql();
        const carnet = '500708'; // Ajustar carnet si es necesario para el test

        logger.log(`Testing sp_Tareas_ObtenerPorUsuario for carnet: ${carnet}`);

        const result = await planningRepo.obtenerMiAsignacion(carnet, { estado: 'pendientes' });

        console.log('--- RESULTADO ---');
        console.log(JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (e) {
        logger.error('Error en test', e);
        process.exit(1);
    }
}

testQuery();
