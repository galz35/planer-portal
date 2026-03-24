require('dotenv').config();
const { ejecutarQuery, NVarChar } = require('./dist/src/db/base.repo');

async function checkHierarchy() {
    // 1. Ver jerarquía de usuarios activos
    const users = await ejecutarQuery(`
        SELECT carnet, nombre, correo, cargo, jefeCarnet, jefeNombre, jefeCorreo
        FROM p_Usuarios
        WHERE activo = 1 AND (eliminado IS NULL OR eliminado = 0)
        ORDER BY jefeNombre, nombre
    `, {});
    console.log('=== JERARQUÍA DE USUARIOS ACTIVOS ===');
    users.forEach(u => {
        console.log(`  [${u.carnet}] ${u.nombre} → Jefe: ${u.jefeNombre || 'NINGUNO'} (${u.jefeCarnet || '-'}) | Email jefe: ${u.jefeCorreo || 'N/A'}`);
    });

    // 2. Tareas atrasadas agrupadas por jefe
    const overdue = await ejecutarQuery(`
        SELECT ta.carnet, u.nombre, u.correo,
               u.jefeCarnet, u.jefeNombre, u.jefeCorreo,
               COUNT(*) as totalAtrasadas
        FROM p_Tareas t
        INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea
        INNER JOIN p_Usuarios u ON ta.carnet = u.carnet
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        WHERE t.activo = 1
          AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
          AND t.fechaObjetivo < CAST(GETDATE() as DATE)
          AND (t.idProyecto IS NULL OR p.estado = 'Activo')
          AND u.activo = 1
        GROUP BY ta.carnet, u.nombre, u.correo, u.jefeCarnet, u.jefeNombre, u.jefeCorreo
        ORDER BY u.jefeNombre, u.nombre
    `, {});

    console.log('\n=== CORREO DE JEFES: TAREAS ATRASADAS POR SUBORDINADO ===');
    let currentJefe = '';
    let jefeCount = 0;
    overdue.forEach(r => {
        if (r.jefeNombre !== currentJefe) {
            currentJefe = r.jefeNombre;
            jefeCount++;
            console.log(`\n📧 JEFE #${jefeCount}: ${r.jefeNombre || 'SIN JEFE'} (${r.jefeCarnet || '-'}) → ${r.jefeCorreo || 'sin correo'}`);
            console.log(`   -----------------------------------------------`);
        }
        console.log(`    👤 ${r.nombre} (${r.carnet}) → ${r.totalAtrasadas} tareas atrasadas | ${r.correo || 'sin email'}`);
    });
    console.log(`\nTotal de jefes que recibirían correo: ${jefeCount}`);
}

checkHierarchy().catch(console.error);
