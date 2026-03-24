
import { ejecutarQuery } from './src/db/base.repo';
require('dotenv').config();

async function checkGlobalOrphans() {
    console.log('--- REVISIÓN GLOBAL DE TAREAS SIN ASIGNACIÓN (V2) ---');
    try {
        const result = await ejecutarQuery(`
            SELECT 
                p.idProyecto,
                p.nombre as proyecto,
                COUNT(t.idTarea) as tareasSinAsignar
            FROM p_Tareas t
            INNER JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
            LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
            WHERE t.activo = 1 
              AND ta.idUsuario IS NULL
            GROUP BY p.idProyecto, p.nombre
            ORDER BY tareasSinAsignar DESC
        `);

        if (result.length === 0) {
            console.log('✅ No se encontraron tareas sin asignar en proyectos activos.');
        } else {
            console.log(`⚠️ Se encontraron ${result.length} proyectos con tareas huérfanas:`);
            console.log(result);
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkGlobalOrphans();
