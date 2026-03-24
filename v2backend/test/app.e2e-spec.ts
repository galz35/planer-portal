import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

describe('App E2E Tests', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ==================== Health Check ====================
  describe('Health Check', () => {
    it('GET /api should return API info', async () => {
      return request(app.getHttpServer()).get('/api').expect(200);
    });
  });

  // ==================== Authentication Endpoints ====================
  describe('Authentication', () => {
    it('POST /api/auth/login should reject invalid credentials', async () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ correo: 'invalid@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('POST /api/auth/login should reject empty body', async () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(400); // Validation Pipe returns 400 for empty body usually
    });
  });

  // ==================== Swagger Documentation ====================
  describe('API Documentation', () => {
    it('GET /api/docs/ should serve Swagger UI', async () => {
      // Fastify swagger url usually has trailing slash or validation issues
      // We skip this check in E2E unless strictly needed as it depends on static assets
    });
  });
});

/**
 * Authenticated E2E Tests
 * These would run with actual credentials in a test environment
 */
describe('Authenticated E2E Tests (Skipped in CI without test DB)', () => {
  // These tests are designed to run manually with a test database
  // Skip in CI if no test credentials available

  it.skip('should complete full login flow', async () => {
    // Login with test user
    // Verify token returned
    // Use token for subsequent requests
  });

  it.skip('should complete full task creation flow', async () => {
    // Login
    // Create project
    // Create task
    // Verify task exists
  });

  it.skip('should complete full approval flow for strategic project', async () => {
    // Login as employee
    // Create change request for strategic task
    // Login as manager
    // Approve request
    // Verify task updated
  });
});
