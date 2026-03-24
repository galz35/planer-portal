const mssql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function repararTareasHuerfanas() {
    console.log('🚀 Iniciando script de reparación de tareas huérfanas...');
    console.log(`📡 Conectando a Base de Datos: ${config.server}:${config.port}/${config.database}`);

    let pool;
    try {
        pool = await mssql.connect(config);
        console.log('✅ Conexión establecida.\n');

        // Buscar todas las tareas que pertenecen a un proyecto pero NO tienen asignado
        console.log('🔍 Buscando tareas huérfanas (sin idAsignado ni asignadoCarnet)...');
        const queryTareas = `
            SELECT idTarea, idProyecto, nombre, idCreador AS tareaCreador 
            FROM p_Tareas 
            WHERE (idAsignado IS NULL AND asignadoCarnet IS NULL)
              AND idProyecto IS NOT NULL 
              AND activo = 1;
        `;

        const resTareas = await pool.request().query(queryTareas);
        const tareas = resTareas.recordset;

        if (tareas.length === 0) {
            console.log('🎉 ¡Excelente! No hay tareas huérfanas en proyectos activos.');
            process.exit(0);
        }

        console.log(`⚠️ Se encontraron ${tareas.length} tareas huérfanas validables.\n`);

        let reparadas = 0;
        let sinRescate = 0;

        for (let i = 0; i < tareas.length; i++) {
            const t = tareas[i];

            // Buscar datos del proyecto
            const queryProyecto = `
                SELECT idCreador, creadorCarnet, idResponsable, responsableCarnet, nombre
                FROM p_Proyectos
                WHERE idProyecto = @idProyecto
            `;
            const reqProy = pool.request();
            reqProy.input('idProyecto', mssql.Int, t.idProyecto);

            const resProy = await reqProy.query(queryProyecto);
            const proyecto = resProy.recordset[0];

            if (!proyecto) {
                console.log(`❌ [Tarea ${t.idTarea}] El proyecto asociado (${t.idProyecto}) ya no existe.`);
                sinRescate++;
                continue;
            }

            // LÓGICA DE HERENCIA: Preferir Responsable, sino usar Creador
            let idSalvador = null;
            let carnetSalvador = null;
            let origenSalvacion = '';

            if (proyecto.idResponsable || proyecto.responsableCarnet) {
                idSalvador = proyecto.idResponsable || null;
                carnetSalvador = proyecto.responsableCarnet || null;
                origenSalvacion = `Responsable del Proyecto (${carnetSalvador || idSalvador})`;
            } else if (proyecto.idCreador || proyecto.creadorCarnet) {
                idSalvador = proyecto.idCreador || null;
                carnetSalvador = proyecto.creadorCarnet || null;
                origenSalvacion = `Creador del Proyecto (${carnetSalvador || idSalvador})`;
            } else if (t.tareaCreador) {
                idSalvador = t.tareaCreador;
                origenSalvacion = `Creador de la Tarea (${idSalvador})`;
            }

            if (idSalvador || carnetSalvador) {
                // Actualizar tarea salvada
                const queryUpdate = `
                    UPDATE p_Tareas 
                    SET idAsignado = @idSalvador,
                        asignadoCarnet = @carnetSalvador
                    WHERE idTarea = @idTarea
                `;
                const reqUpd = pool.request();
                reqUpd.input('idSalvador', mssql.Int, idSalvador);
                reqUpd.input('carnetSalvador', mssql.NVarChar, carnetSalvador);
                reqUpd.input('idTarea', mssql.Int, t.idTarea);

                await reqUpd.query(queryUpdate);

                console.log(`✅ [Tarea ${t.idTarea} - ${t.nombre?.substring(0, 25) || 'Sin Título'}] -> Rescatada y asignada al: ${origenSalvacion}`);
                reparadas++;
            } else {
                console.log(`🚨 [Tarea ${t.idTarea} - ${t.nombre?.substring(0, 25) || 'Sin Título'}] -> No se encontró nadie a quien asignarla en el proyecto "${proyecto.nombre}".`);
                sinRescate++;
            }
        }

        console.log('\n==================================');
        console.log(`🏆 REPORTE FINAL DE RESCATE`);
        console.log(`✅ Tareas Asignadas Correctamente: ${reparadas}`);
        console.log(`❌ Tareas Sin Rescatador en Proyecto: ${sinRescate}`);
        console.log('==================================\n');

    } catch (error) {
        console.error('❌ Error crítico en la ejecución del script:', error);
    } finally {
        if (pool) await pool.close();
        process.exit(0);
    }
}

repararTareasHuerfanas();
