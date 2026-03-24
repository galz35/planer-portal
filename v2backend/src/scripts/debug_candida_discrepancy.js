const sql = require('mssql');
require('dotenv').config();

async function debugCandida() {
    const config = {
        server: process.env.MSSQL_HOST || 'localhost',
        port: parseInt(process.env.MSSQL_PORT || '1433'),
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        database: process.env.MSSQL_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    };

    try {
        const pool = await sql.connect(config);
        const carnet = '772';
        const hoy = new Date().toISOString().split('T')[0];

        console.log(`--- Debugging Candida Sanchez (Carnet ${carnet}) for ${hoy} ---`);

        // 1. Get summary from sp_Equipo_ObtenerHoy
        const resSummary = await pool.request()
            .input('carnetsList', sql.NVarChar, carnet)
            .input('fecha', sql.Date, hoy)
            .execute('sp_Equipo_ObtenerHoy');

        console.log('Summary (sp_Equipo_ObtenerHoy):');
        console.table(resSummary.recordset);

        // 2. Get detailed tasks from sp_Tareas_ObtenerPorUsuario
        const resTasks = await pool.request()
            .input('carnet', sql.NVarChar, carnet)
            .execute('sp_Tareas_ObtenerPorUsuario');

        console.log(`Total tasks from sp_Tareas_ObtenerPorUsuario: ${resTasks.recordset.length}`);

        // Filter delayed according to sp_Equipo_ObtenerHoy logic
        const delayedStates = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'];
        const d0 = new Date(hoy);

        const delayed = resTasks.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        });

        console.log(`Delayed tasks (as per SP logic): ${delayed.length}`);
        delayed.forEach(t => {
            console.log(`[DELAYED] ID: ${t.idTarea} | Titulo: ${t.titulo} | Estado: ${t.estado} | Objetivo: ${t.fechaObjetivo ? t.fechaObjetivo.toISOString().split('T')[0] : 'NULL'}`);
        });

        // Other tasks that might be considered "retrasadas" by user
        const otherPossibleDelayed = resTasks.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            const isActive = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'].includes(estado);
            const isVencida = t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
            const isNoObjetivoVencida = !t.fechaObjetivo && new Date(t.fechaCreacion) < d0;
            return !delayed.find(d => d.idTarea === t.idTarea) && isActive && (isVencida || isNoObjetivoVencida);
        });

        if (otherPossibleDelayed.length > 0) {
            console.log('--- Other tasks that MIGHT be considered delayed (e.g. no objective but old creation date) ---');
            otherPossibleDelayed.forEach(t => {
                console.log(`[POSSIBLE] ID: ${t.idTarea} | Titulo: ${t.titulo} | Estado: ${t.estado} | Objetivo: ${t.fechaObjetivo ? t.fechaObjetivo.toISOString().split('T')[0] : 'NULL'} | Creacion: ${t.fechaCreacion ? t.fechaCreacion.toISOString().split('T')[0] : 'NULL'}`);
            });
        }

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

debugCandida();
