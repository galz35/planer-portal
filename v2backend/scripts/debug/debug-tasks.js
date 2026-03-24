require('dotenv').config();
const { ejecutarQuery, NVarChar } = require('./dist/src/db/base.repo');

async function debugGustavoTasks() {
    const carnet = '500708';
    const sql = `
        SELECT t.idTarea, t.nombre, t.fechaObjetivo, t.fechaCreacion, t.estado,
               p.nombre as proyecto,
               COALESCE(u.nombre, t.creadorCarnet, 'Sistema') as creador
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios u ON t.creadorCarnet = u.carnet
        INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea AND ta.carnet = @carnet
        WHERE t.activo = 1 
        AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
        AND (t.idProyecto IS NULL OR p.estado = 'Activo')
        ORDER BY t.fechaObjetivo ASC
    `;
    const tasks = await ejecutarQuery(sql, { carnet: { valor: carnet, tipo: NVarChar } });
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    console.log(`--- HOY: ${hoy.toLocaleDateString()} | CARNET: ${carnet} ---`);
    console.log(`--- TAREAS ASIGNADAS: ${tasks.length} ---`);
    tasks.forEach(t => {
        const fechaObj = t.fechaObjetivo ? new Date(t.fechaObjetivo) : null;
        if (fechaObj) fechaObj.setHours(0, 0, 0, 0);
        const isOverdue = fechaObj ? (fechaObj < hoy) : true;
        const dias = fechaObj ? Math.floor((hoy.getTime() - fechaObj.getTime()) / (1000 * 3600 * 24)) : '?';
        console.log(`[${t.idTarea}] ${t.nombre}\n    Proyecto: ${t.proyecto} | Creó: ${t.creador}\n    Límite: ${fechaObj ? fechaObj.toLocaleDateString() : 'N/A'} | Atraso: ${dias}d | Estado: ${t.estado}`);
    });
}

debugGustavoTasks().catch(console.error);
