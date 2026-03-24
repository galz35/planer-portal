
const { ejecutarQuery } = require('./src/db/base.repo');
require('dotenv').config();

async function fixOrphans() {
    console.log('--- Corrigiendo Tareas Huérfanas ---');
    try {
        const result = await ejecutarQuery(`
            INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion, carnet)
            SELECT 
                t.idTarea, 
                t.idCreador, 
                'Responsable', 
                GETDATE(),
                u.carnet
            FROM p_Tareas t
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            INNER JOIN p_Usuarios u ON t.idCreador = u.idUsuario
            WHERE t.activo = 1 
              AND ta.idUsuario IS NULL
              AND t.idCreador IS NOT NULL;
        `);
        console.log('Filas afectadas:', result.rowsAffected || 'N/A');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

fixOrphans();
