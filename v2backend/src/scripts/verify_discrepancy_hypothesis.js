const sql = require('mssql');
require('dotenv').config();

async function verifyHypothesis() {
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
        const d0 = new Date(hoy);
        const delayedStates = ['Pendiente', 'EnCurso', 'Pausa', 'Bloqueada', 'Revision'];

        // 1. Tasks where she IS in p_TareaAsignados
        const resAsignadas = await pool.request()
            .input('carnet', sql.NVarChar, carnet)
            .query(`
                SELECT t.idTarea, t.nombre, t.estado, t.fechaObjetivo
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                WHERE ta.carnet = @carnet AND t.activo = 1
            `);

        const delayedAsignadas = resAsignadas.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        });
        console.log('DELAYED_VIA_ASIGNADOS:', delayedAsignadas.length);

        // 2. Tasks where she is Creator but NOT in p_TareaAsignados
        const resCreadas = await pool.request()
            .input('carnet', sql.NVarChar, carnet)
            .query(`
                SELECT t.idTarea, t.nombre, t.estado, t.fechaObjetivo
                FROM p_Tareas t
                WHERE t.creadorCarnet = @carnet AND t.activo = 1
                AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
            `);

        const delayedCreadas = resCreadas.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        });
        console.log('DELAYED_VIA_CREADOR_ONLY:', delayedCreadas.length);

        // 3. Tasks where she is Project Owner
        const resProyecto = await pool.request()
            .input('carnet', sql.NVarChar, carnet)
            .query(`
                SELECT t.idTarea, t.nombre, t.estado, t.fechaObjetivo
                FROM p_Tareas t
                INNER JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                WHERE (p.responsableCarnet = @carnet OR p.creadorCarnet = @carnet)
                AND t.activo = 1
                AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea)
                AND (t.creadorCarnet <> @carnet OR t.creadorCarnet IS NULL)
            `);

        const delayedProyecto = resProyecto.recordset.filter(t => {
            const estado = t.estado ? t.estado.trim() : '';
            return delayedStates.includes(estado) && t.fechaObjetivo && new Date(t.fechaObjetivo) < d0;
        });
        console.log('DELAYED_VIA_PROYECTO_OWNER_ONLY:', delayedProyecto.length);

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

verifyHypothesis();
