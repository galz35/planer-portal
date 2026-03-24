// @ts-nocheck
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as baseRepo from './../src/db/base.repo';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';

async function massiveTest() {
    process.env.REDIS_URL = 'memory';
    const jwtSecret = process.env.JWT_SECRET || 'secret';
    console.log('--- INICIO TEST MASIVO DE APIS (Bdplaner_Test) ---');

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(CACHE_MANAGER)
        .useValue({ get: () => null, set: () => null, del: () => null, reset: () => null })
        .compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    const httpServer = app.getHttpServer();

    try {
        const req = await baseRepo.crearRequest();
        const resUsers = await req.query(`
            SELECT idUsuario, carnet, nombreCompleto, correo, rolGlobal, activo
            FROM p_Usuarios
            WHERE activo = 1 AND carnet IS NOT NULL AND carnet <> ''
        `);

        const users = resUsers.recordset;
        console.log(`\nUsuarios totales activos para el test masivo: ${users.length}`);

        let rolesCount: any = {};
        users.forEach((u: any) => {
            const r = u.rolGlobal || 'Sin Rol';
            rolesCount[r] = (rolesCount[r] || 0) + 1;
        });
        console.table(rolesCount);

        const results = { exitos: 0, errores: 0, fallos404: 0, msj: [] as string[] };

        // Endpoints genéricos para probar (Asegurado que existe y es pesado)
        const endpoints = [
            { name: 'GET /proyectos', url: '/proyectos' },
            { name: 'GET /foco', url: '/foco?fecha=2026-02-28' },
            { name: 'GET /foco/estadisticas', url: '/foco/estadisticas?month=2&year=2026' },
            { name: 'GET /equipo/hoy', url: '/equipo/hoy' }
        ];

        for (const user of users) {
            console.log(`\n▶️ Probando: ${user.nombreCompleto} (ID: ${user.idUsuario} | Rol: ${user.rolGlobal})`);

            // Generamos un token válido para nuestra prueba
            const tokenPayload = {
                sub: user.idUsuario,
                username: user.correo,
                roles: [user.rolGlobal]
            };
            const token = jwt.sign(tokenPayload, jwtSecret);
            const headers = { Authorization: `Bearer ${token}` };

            for (const ep of endpoints) {
                const start = Date.now();
                try {
                    const apiRes = await request(httpServer).get(ep.url).set(headers);
                    const time = Date.now() - start;

                    if (apiRes.status >= 200 && apiRes.status < 400) {
                        console.log(`   ✅ [${apiRes.status}] ${ep.name} (${time}ms) `);
                        results.exitos++;
                    } else if (apiRes.status === 404) {
                        console.log(`   ⏭️ [${apiRes.status}] ${ep.name} (${time}ms) - No Encontrado`);
                        results.fallos404++;
                    } else {
                        console.log(`   ❌ [${apiRes.status}] ${ep.name} (${time}ms) - ERR: ${apiRes.body?.message || apiRes.text?.substring(0, 30)}`);
                        results.errores++;
                        results.msj.push(`[ID:${user.idUsuario}] ${ep.url} -> HTTP ${apiRes.status}`);
                    }
                } catch (err: any) {
                    console.log(`   ☠️ [500] ${ep.name} - CRITICAL FAIL: ${err.message}`);
                    results.errores++;
                }
            }
        }

        console.log('\n=======================================');
        console.log('--- REPORTE FINAL DE TEST APIS (TODA LA COMPAñÍA) ---');
        console.log(`🟢 Éxitos: ${results.exitos}`);
        console.log(`🔴 Errores Críticos: ${results.errores}`);
        if (results.errores > 0) {
            console.log('\nDetalles de errores:');
            results.msj.forEach(m => console.log(' ->', m));
        }
        console.log('=======================================');

    } catch (e: any) {
        console.error('❌ Error general:', e.message);
    } finally {
        await app.close();
        process.exit();
    }
}
massiveTest();
