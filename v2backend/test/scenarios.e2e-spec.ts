import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { JwtService } from '@nestjs/jwt';
import { TasksService } from './../src/clarity/tasks.service';
import { AdminService } from './../src/admin/admin.service';
import { ReportsService } from './../src/clarity/reports.service';

describe('Multi-Role Scenarios (E2E)', () => {
  let app: NestFastifyApplication;
  let jwtService: JwtService;

  // Tokens
  let adminToken: string;
  let managerToken: string;
  let employeeToken: string;

  const mockAdminService = {
    usuariosListarTodos: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    logsListar: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };

  const mockTasksService = {
    getEquipoHoy: jest.fn().mockResolvedValue({
      miembros: [],
      resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
    }),
    getEquipoBacklog: jest.fn().mockResolvedValue([]),
    miDiaGet: jest.fn().mockResolvedValue({
      checkinHoy: null,
      arrastrados: [],
      bloqueosActivos: [],
      bloqueosMeCulpan: [],
      tareasDisponibles: [],
    }),
  };

  const mockReportsService = {
    getReporteProductividad: jest.fn().mockResolvedValue([]),
    getReporteBloqueosTrend: jest.fn().mockResolvedValue([]),
    getReporteEquipoPerformance: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AdminService)
      .useValue(mockAdminService)
      .overrideProvider(TasksService)
      .useValue(mockTasksService)
      .overrideProvider(ReportsService)
      .useValue(mockReportsService)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    jwtService = app.get<JwtService>(JwtService);

    // Generate Tokens for Scenario (Mocking Identity)
    const secret = process.env.JWT_SECRET || 'secretKey';
    adminToken = jwtService.sign(
      { sub: 1, email: 'admin@claro.com.ni', rol: 'Admin' },
      { secret },
    );
    managerToken = jwtService.sign(
      { sub: 2, email: 'manager@claro.com.ni', rol: 'Gerente' },
      { secret },
    );
    employeeToken = jwtService.sign(
      { sub: 3, email: 'empleado@claro.com.ni', rol: 'Empleado' },
      { secret },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario A: User Administration (Admin)', () => {
    it('should list all users', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow admin to see logs', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Scenario B: Team Management (Manager)', () => {
    it('should view team dashboard (Equipo Hoy)', async () => {
      const today = new Date().toISOString().split('T')[0];
      await request(app.getHttpServer())
        .get(`/api/equipo/hoy?fecha=${today}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should see team backlog', async () => {
      const today = new Date().toISOString().split('T')[0];
      await request(app.getHttpServer())
        .get(`/api/equipo/backlog?fecha=${today}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });
  });

  describe('Scenario C: Daily Workflow (Employee)', () => {
    it('should get My Day data', async () => {
      const today = new Date().toISOString().split('T')[0];
      await request(app.getHttpServer())
        .get(`/api/mi-dia?fecha=${today}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);
    });

    it('should fail if accessing admin route', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/usuarios')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });
  });

  describe('Scenario D: Reporting (Director/Manager)', () => {
    it('should get productivity report', async () => {
      await request(app.getHttpServer())
        .get('/api/reportes/productividad')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });

    it('should get performance report', async () => {
      await request(app.getHttpServer())
        .get('/api/reportes/equipo-performance')
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);
    });
  });
});
