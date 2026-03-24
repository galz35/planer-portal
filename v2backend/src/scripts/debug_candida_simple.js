const sql = require('mssql');
require('dotenv').config();

async function debugCandidaSimple() {
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

        const resSummary = await pool.request()
            .input('carnetsList', sql.NVarChar, carnet)
            .input('fecha', sql.Date, hoy)
            .execute('sp_Equipo_ObtenerHoy');

        console.log('SP_SUMMARY_RETRASADAS:', resSummary.recordset[0].retrasadas);

        const resTasks = await pool.request()
            .input('carnet', sql.NVarChar, carnet)
            .execute('sp_Tareas_ObtenerPorUsuario');

        const delayedStates = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'];
        const d0 = new Date(hoy);

        const countDelayedStrict = resTasks.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        }).length;

        const countDelayedWithCreation = resTasks.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            const isVencida = t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
            const isNoObjetivoVencida = !t.fechaObjetivo && new Date(t.fechaCreacion) < d0;
            return delayedStates.includes(estado) && (isVencida || isNoObjetivoVencida);
        }).length;

        console.log('CLIENT_TASKS_TOTAL:', resTasks.recordset.length);
        console.log('CALCULATED_DELAYED_STRICT:', countDelayedStrict);
        console.log('CALCULATED_DELAYED_WITH_CREATION:', countDelayedWithCreation);

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

debugCandidaSimple();
