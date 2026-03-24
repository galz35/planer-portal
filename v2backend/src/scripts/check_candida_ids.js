const sql = require('mssql');
require('dotenv').config();

async function checkIds() {
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
        const idUsuario = 26;
        const hoy = new Date().toISOString().split('T')[0];
        const d0 = new Date(hoy);
        const delayedStates = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'];

        const res = await pool.request()
            .input('id', sql.Int, idUsuario)
            .input('carnet', sql.NVarChar, carnet)
            .query(`
                SELECT ta.idTarea, ta.carnet, ta.idUsuario, t.nombre, t.estado, t.fechaObjetivo
                FROM p_TareaAsignados ta
                INNER JOIN p_Tareas t ON t.idTarea = ta.idTarea
                WHERE (ta.idUsuario = @id OR ta.carnet = @carnet)
                AND t.activo = 1
            `);

        const tasks = res.recordset;
        console.log(`Total active assignments found: ${tasks.length}`);

        const delayed = tasks.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        });

        console.log(`Total delayed tasks found for Candida: ${delayed.length}`);

        const joinedByCarnet = delayed.filter(t => t.carnet === carnet).length;
        const joinedByIdOnly = delayed.filter(t => t.carnet !== carnet && t.idUsuario === idUsuario).length;

        console.log(`Delayed joined by CARNET: ${joinedByCarnet}`);
        console.log(`Delayed joined by ID_USUARIO ONLY: ${joinedByIdOnly}`);

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

checkIds();
