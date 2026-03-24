import { ejecutarQuery } from './src/db/base.repo';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
        const user = await ejecutarQuery(`
            SELECT idUsuario, carnet, nombre, correo 
            FROM p_Usuarios 
            WHERE correo = 'gustavo.lira@claro.com.ni'
        `);
        console.log('=== Detalle de Usuario Gustavo Lira ===');
        console.table(user);

        if (!user.length) {
            console.error('Usuario no encontrado');
            return;
        }

        const gustavo = user[0];

        // 1. Proyectos visibles
        const projects = await ejecutarQuery(`
            SELECT idProyecto, nombre, modoVisibilidad, idCreador, responsableCarnet
            FROM p_Proyectos
            WHERE (
                idCreador = ${gustavo.idUsuario}
                OR (
                    modoVisibilidad IN ('JERARQUIA', 'JERARQUIA_COLABORADOR')
                    AND EXISTS (
                        SELECT 1 FROM dbo.p_Tareas t
                        INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                        WHERE t.idProyecto = p_Proyectos.idProyecto AND t.activo = 1
                        AND ta.idUsuario = ${gustavo.idUsuario}
                    )
                )
                -- (Simplified logic for verification script)
            )
        `);
        console.log(`\nGustavo ve ${projects.length} proyectos bajo visibilidad básica.`);
        console.table(projects.slice(0, 5));

    } catch (e: any) {
        console.error('ERROR:', e.message);
    }
    await app.close();
    process.exit(0);
}
run();
