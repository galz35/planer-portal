
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function deepCheck165() {
    console.log('--- Análisis Profundo Tareas Proyecto 165 ---');
    try {
        const result = await ejecutarQuery(`
            SELECT 
                t.idTarea, 
                t.nombre, 
                t.idCreador,
                u_crea.nombre as nombreCreador,
                ta.idUsuario as idResponsable,
                u_resp.nombre as nombreResponsable,
                ta.tipo as tipoAsignacion
            FROM p_Tareas t
            LEFT JOIN p_Usuarios u_crea ON t.idCreador = u_crea.idUsuario
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            LEFT JOIN p_Usuarios u_resp ON ta.idUsuario = u_resp.idUsuario
            WHERE t.idProyecto = 165 AND t.activo = 1
        `);
        console.log('Resultado:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

deepCheck165();
