
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function fixOrphansByCarnet() {
    try {
        const result = await ejecutarQuery(`
            INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion, carnet)
            SELECT 
                t.idTarea, 
                u.idUsuario, 
                'Responsable', 
                GETDATE(),
                u.carnet
            FROM p_Tareas t
            INNER JOIN p_Usuarios u ON t.creadorCarnet = u.carnet
            WHERE t.activo = 1 
              AND NOT EXISTS (
                  SELECT 1 FROM p_TareaAsignados ta 
                  WHERE ta.idTarea = t.idTarea AND ta.tipo = 'Responsable'
              )
        `);
        console.log('Corrección por carnet aplicada.');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

fixOrphansByCarnet();
