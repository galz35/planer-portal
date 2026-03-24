process.env.REDIS_URL = 'redis://invalid_host:6379'; // Force fallback to memory
import { Test, TestingModule } from '@nestjs/testing';

import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { CACHE_MANAGER } from '@nestjs/cache-manager';


describe('Gustavo Live Database Test (E2E)', () => {
    let app: NestFastifyApplication;
    let authToken: string;

    const gustavoUser = {
        correo: 'gustavo.lira@claro.com.ni',
        password: 'password123', // Usando el password por defecto o el que tenga en DB
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(CACHE_MANAGER)
            .useValue({
                get: jest.fn(),
                set: jest.fn(),
                del: jest.fn(),
                reset: jest.fn(),
            })
            .compile();

        app = moduleFixture.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
        );
        app.setGlobalPrefix('api');
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();
        await app.getHttpAdapter().getInstance().ready();

        // Intentar login real con password corregido 123456 (según logs anteriores)
        const loginRes = await request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ correo: 'gustavo.lira@claro.com.ni', password: '123456' });

        if (loginRes.status === 201 || loginRes.status === 200) {
            authToken = loginRes.body.data.access_token;
            console.log('Login exitoso para Gustavo');
        } else {
            console.error('Login fallido para Gustavo:', loginRes.body);
        }
    });

    afterAll(async () => {
        await app.close();
    });

    it('Debe devolver el perfil de Gustavo con rol Admin (Database Real)', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(res.body.data.correo).toBe('gustavo.lira@claro.com.ni');
        expect(res.body.data.rolGlobal).toBe('Admin');
    });

    it('Debe listar todos los proyectos (Admin visibility en Bdplaner_Test)', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/proyectos?page=1&limit=2000')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        const projects = res.body.data.items;
        console.log(`Gustavo ve ${projects.length} proyectos en DB enviada`);

        // Verificamos que al menos vea los 127 de los que hablamos
        expect(projects.length).toBeGreaterThanOrEqual(127);
    });

    it('Debe poder ver el "Mi Día" de Gustavo', async () => {
        const today = new Date().toISOString().split('T')[0];
        await request(app.getHttpServer())
            .get(`/api/mi-dia?fecha=${today}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
    });
});
