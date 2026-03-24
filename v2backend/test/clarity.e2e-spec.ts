import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

describe('Clarity E2E', () => {
  let app: NestFastifyApplication;
  let authToken: string;

  // Assuming seeded data: juan@empresa.com / 123456
  const testUser = {
    correo: 'juan@empresa.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Login logic
    // Note: E2E tests often run against a separate DB. This assumes Dev DB availability.
    // Ideally we would mock the DB connection or use an in-memory DB.
  });

  afterAll(async () => {
    await app.close();
  });

  // Basic health check
  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  // Future: Add real Auth flow test once test DB environment is robust
});
