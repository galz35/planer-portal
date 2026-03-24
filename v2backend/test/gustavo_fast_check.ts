import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProyectoService } from './../src/clarity/proyecto.service';
import * as authRepo from './../src/auth/auth.repo';

async function testEverythingStrongly() {
    process.env.REDIS_URL = 'memory'; // No redis

    console.log('--- INICIO TEST FUERTE: Bdplaner_Test ---');
    console.log('Usuario: gustavo.lira@claro.com.ni (ID: 139)');

    const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(CACHE_MANAGER)
        .useValue({ get: () => null, set: () => null, del: () => null, reset: () => null })
        .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    const proyectoService = app.get(ProyectoService);

    try {
        const idUsuario = 23; // Gustavo Lira

        // 1. Verificar Rol en DB real (vía Repo)
        const userDb = await authRepo.obtenerUsuarioPorId(idUsuario);
        console.log(`\n[1/3] Verificando Usuario en DB: ${userDb.nombre} [Rol: ${userDb.rolGlobal}]`);

        if (userDb.rolGlobal === 'Admin') {
            console.log('✅ Rol confirmado como Administrador en Bdplaner_Test.');

            // 2. Verificar Proyectos Visibles vía Service (Lógica de Negocio)
            console.log('\n[2/3] Verificando Visibilidad de Proyectos vía ProyectoService...');
            const proyectos = await proyectoService.proyectoListar(idUsuario, { limit: 2000, page: 1 });
            console.log(`✅ Resultado: Gustavo ve ${proyectos.items.length} proyectos.`);

            if (proyectos.items.length >= 127) {
                console.log('✅ ÉXITO: El Administrador ve todos los proyectos (127+).');
            } else {
                console.warn(`⚠️ ALERTA: Solo ve ${proyectos.items.length} de 127. Esto indica un filtro residual en el Backend.`);
            }

            // 3. Simular una búsqueda de proyecto puntual
            const searchResult = await proyectoService.proyectoListar(idUsuario, { nombre: 'Sigho', limit: 10 });
            console.log(`\n[3/3] Buscando "Sigho": Encontrados ${searchResult.items.length}`);

            console.log('\n=== DIAGNÓSTICO DE VISIBILIDAD COMPLETADO ===');
        } else {
            console.error('❌ ERROR: Gustavo no aparece con rol Admin en esta base de datos.');
        }

    } catch (e) {
        console.error('❌ Error durante el test:', e.message);
    } finally {
        await app.close();
        process.exit();
    }
}

testEverythingStrongly();
