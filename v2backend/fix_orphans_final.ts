
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function fixOrphansFinal() {
    console.log('--- Corrigiendo Tareas Huérfanas (Fuerza Bruta) ---');
    try {
        // 1. Identificar tareas sin responsable
        const result = await ejecutarQuery(`
            INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion, carnet)
            SELECT 
                t.idTarea, 
                t.idCreador, 
                'Responsable', 
                GETDATE(),
                u.carnet
            FROM p_Tareas t
            INNER JOIN p_Usuarios u ON t.idCreador = u.idUsuario
            WHERE t.activo = 1 
              AND NOT EXISTS (
                  SELECT 1 FROM p_TareaAsignados ta 
                  WHERE ta.idTarea = t.idTarea AND ta.tipo = 'Responsable'
              )
        `);
        console.log('Corrección aplicada con éxito.');

        // 2. Reportar cuántas quedan sin poderse corregir (porque el creador no existe en p_Usuarios)
        const remains = await ejecutarQuery(`
            SELECT COUNT(*) as total
            FROM p_Tareas t
            WHERE t.activo = 1 
              AND NOT EXISTS (
                  SELECT 1 FROM p_TareaAsignados ta 
                  WHERE ta.idTarea = t.idTarea AND ta.tipo = 'Responsable'
              )
        `);
        console.log('Tareas que siguen sin responsable (Creador no existe):', remains[0].total);

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

fixOrphansFinal();
