import { Test, TestingModule } from '@nestjs/testing';
import { PlanningService } from './planning.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as planningRepo from './planning.repo';
import * as authRepo from '../auth/auth.repo';
import * as tasksRepo from '../clarity/tasks.repo';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';

// Mock de módulos de repositorio
jest.mock('./planning.repo');
jest.mock('../auth/auth.repo');
jest.mock('../clarity/tasks.repo');

describe('PlanningService', () => {
  let service: PlanningService;
  let auditService: AuditService;
  let visibilidadService: VisibilidadService;

  beforeEach(async () => {
    jest.clearAllMocks();
    (planningRepo.esAsignado as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanningService,
        { provide: AuditService, useValue: { log: jest.fn() } },
        {
          provide: VisibilidadService,
          useValue: { verificarAccesoPorId: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PlanningService>(PlanningService);
    auditService = module.get<AuditService>(AuditService);
    visibilidadService = module.get<VisibilidadService>(VisibilidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== verificarAccesoTarea Tests ====================
  describe('verificarAccesoTarea', () => {
    it('✅ Admin puede ver cualquier tarea', async () => {
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 1,
        rolGlobal: 'Admin',
      });

      await expect(
        service.verificarAccesoTarea(1, { idTarea: 10 }),
      ).resolves.toBeTruthy();
    });

    it('✅ Creador/Dueño de la tarea puede verla', async () => {
      await expect(
        service.verificarAccesoTarea(10, { idTarea: 10, idUsuario: 10 }),
      ).resolves.toBeTruthy();
    });

    it('✅ Asignado de la tarea puede verla', async () => {
      (planningRepo.esAsignado as jest.Mock).mockResolvedValue(true);

      await expect(
        service.verificarAccesoTarea(20, { idTarea: 10, idUsuario: 10 }),
      ).resolves.toBeTruthy();
      expect(planningRepo.esAsignado).toHaveBeenCalledWith(10, 20);
    });

    it('✅ Jefe jerárquico del dueño puede verla', async () => {
      (planningRepo.esAsignado as jest.Mock).mockResolvedValue(false);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 30,
        rolGlobal: 'Empleado',
      });
      (visibilidadService.verificarAccesoPorId as jest.Mock).mockResolvedValue(
        true,
      );

      await expect(
        service.verificarAccesoTarea(30, { idTarea: 10, idUsuario: 10 }),
      ).resolves.toBeTruthy();
      expect(visibilidadService.verificarAccesoPorId).toHaveBeenCalledWith(
        30,
        10,
      );
    });

    it('✅ Responsable del proyecto puede ver tareas del proyecto', async () => {
      (planningRepo.esAsignado as jest.Mock).mockResolvedValue(false);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 40,
        rolGlobal: 'Empleado',
      });
      (visibilidadService.verificarAccesoPorId as jest.Mock).mockResolvedValue(
        false,
      );
      (planningRepo.obtenerProyectosVisibles as jest.Mock).mockResolvedValue([
        { idProyecto: 5 },
      ]);

      await expect(
        service.verificarAccesoTarea(40, { idTarea: 10, idProyecto: 5 }),
      ).resolves.toBeTruthy();
    });

    it('❌ Usuario sin relación NO puede verla', async () => {
      (planningRepo.esAsignado as jest.Mock).mockResolvedValue(false);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 50,
        rolGlobal: 'Empleado',
      });
      (visibilidadService.verificarAccesoPorId as jest.Mock).mockResolvedValue(
        false,
      );
      (planningRepo.obtenerProyectosVisibles as jest.Mock).mockResolvedValue(
        [],
      );
      (planningRepo.obtenerProyectoPorId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.verificarAccesoTarea(50, {
          idTarea: 10,
          idUsuario: 10,
          idProyecto: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('❌ Usuario de otra gerencia NO puede verla', async () => {
      (planningRepo.esAsignado as jest.Mock).mockResolvedValue(false);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 60,
        rolGlobal: 'Gerente',
        gerencia: 'Ventas',
      });
      (visibilidadService.verificarAccesoPorId as jest.Mock).mockResolvedValue(
        false,
      );
      (planningRepo.obtenerProyectosVisibles as jest.Mock).mockResolvedValue(
        [],
      );
      (planningRepo.obtenerProyectoPorId as jest.Mock).mockResolvedValue({
        idProyecto: 5,
        gerencia: 'IT',
      });

      await expect(
        service.verificarAccesoTarea(60, {
          idTarea: 10,
          idUsuario: 10,
          idProyecto: 5,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==================== checkEditPermission Tests ====================
  describe('checkEditPermission', () => {
    it('should allow free edit for personal tasks (no project)', async () => {
      const task = {
        idTarea: 1,
        nombre: 'Personal Task',
        idProyecto: null,
        idUsuarioAsignado: 10,
      };
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(task);

      const result = await service.checkEditPermission(1, 10);

      expect(result).toEqual({
        puedeEditar: true,
        requiereAprobacion: false,
        tipoProyecto: 'Personal',
      });
    });

    it('should require approval for strategic projects (non-admin)', async () => {
      const task = {
        idTarea: 1,
        nombre: 'Strategic Task',
        idProyecto: 1,
        proyectoTipo: 'Estrategico',
        proyectoRequiereAprobacion: true,
        idUsuarioAsignado: 10,
      };
      const user = { idUsuario: 10, rolGlobal: 'User' };

      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(task);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue(user);

      const result = await service.checkEditPermission(1, 10);

      expect(result).toEqual({
        puedeEditar: true,
        requiereAprobacion: true,
        tipoProyecto: 'Estrategico',
      });
    });

    it('should bypass approval for Admin on strategic projects', async () => {
      const task = {
        idTarea: 1,
        nombre: 'Strategic Task',
        idProyecto: 1,
        proyectoTipo: 'Estrategico',
        proyectoRequiereAprobacion: true,
        idUsuarioAsignado: 1,
      };
      const adminUser = { idUsuario: 1, rolGlobal: 'Admin' };

      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(task);
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue(adminUser);

      const result = await service.checkEditPermission(1, 1);

      expect(result).toEqual({
        puedeEditar: true,
        requiereAprobacion: false,
        tipoProyecto: 'Estrategico',
      });
    });

    it('should allow free edit for operative projects', async () => {
      const task = {
        idTarea: 1,
        nombre: 'Operative Task',
        idProyecto: 2,
        proyectoTipo: 'Operativo',
        proyectoRequiereAprobacion: false,
        idUsuarioAsignado: 10,
      };
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(task);

      const result = await service.checkEditPermission(1, 10);

      expect(result).toEqual({
        puedeEditar: true,
        requiereAprobacion: false,
        tipoProyecto: 'Operativo',
      });
    });

    it('should throw NotFoundException for non-existent task', async () => {
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(null);

      await expect(service.checkEditPermission(999, 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== solicitarCambio Tests ====================
  describe('solicitarCambio', () => {
    const existingTask = {
      idTarea: 1,
      nombre: 'Test Task',
      fechaObjetivo: '2024-01-15',
    };

    it('should create a change request', async () => {
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(
        existingTask,
      );
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 10,
        carnet: 'C123',
      });
      (planningRepo.crearSolicitudCambio as jest.Mock).mockResolvedValue({
        idSolicitud: 100,
      });

      const result = await service.solicitarCambio(
        10,
        1,
        'fechaObjetivo',
        '2024-02-15',
        'Need more time',
      );

      expect(planningRepo.crearSolicitudCambio).toHaveBeenCalledWith(
        expect.objectContaining({
          idTarea: 1,
          idUsuario: 10,
          campo: 'fechaObjetivo',
          valorAnterior: '2024-01-15',
          valorNuevo: '2024-02-15',
          motivo: 'Need more time',
        }),
      );
    });

    it('should throw NotFoundException for non-existent task', async () => {
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.solicitarCambio(10, 999, 'titulo', 'New', 'Reason'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== resolverSolicitud Tests ====================
  describe('resolverSolicitud', () => {
    const pendingSolicitud = {
      idSolicitud: 1,
      estado: 'Pendiente',
      idTarea: 10,
      campo: 'fechaObjetivo',
      valorNuevo: '2024-03-01',
    };

    it('should approve a request and apply changes', async () => {
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 5,
        rolGlobal: 'Admin',
      });
      (planningRepo.obtenerSolicitudPorId as jest.Mock).mockResolvedValue(
        pendingSolicitud,
      );
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue({
        idTarea: 10,
      });
      (tasksRepo.actualizarTarea as jest.Mock).mockResolvedValue({});
      (planningRepo.resolverSolicitud as jest.Mock).mockResolvedValue({});

      const result = await service.resolverSolicitud(5, 1, 'Aprobar');

      expect(tasksRepo.actualizarTarea).toHaveBeenCalled();
      expect(planningRepo.resolverSolicitud).toHaveBeenCalledWith(
        1,
        'Aprobado',
        5,
        'Aprobado por superior',
      );
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should reject a request without applying changes', async () => {
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 5,
        rolGlobal: 'Admin',
      });
      (planningRepo.obtenerSolicitudPorId as jest.Mock).mockResolvedValue(
        pendingSolicitud,
      );
      (planningRepo.resolverSolicitud as jest.Mock).mockResolvedValue({});

      const result = await service.resolverSolicitud(5, 1, 'Rechazar');

      expect(tasksRepo.actualizarTarea).not.toHaveBeenCalled();
      expect(planningRepo.resolverSolicitud).toHaveBeenCalledWith(
        1,
        'Rechazado',
        5,
        'Rechazado por superior',
      );
    });

    it('should throw NotFoundException for non-existent request', async () => {
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 5,
        rolGlobal: 'Admin',
      });
      (planningRepo.obtenerSolicitudPorId as jest.Mock).mockResolvedValue(null);

      await expect(
        service.resolverSolicitud(5, 999, 'Aprobar'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== updateTareaOperativa Tests ====================
  describe('updateTareaOperativa', () => {
    it('should update operative task and create audit log', async () => {
      const task = {
        idTarea: 1,
        nombre: 'Operative Task',
        idProyecto: 2,
        proyectoTipo: 'Operativo',
        idUsuarioAsignado: 10,
      };
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(task);
      (tasksRepo.actualizarTarea as jest.Mock).mockResolvedValue({});
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        idUsuario: 10,
        rolGlobal: 'Empleado',
      });

      const result = await service.updateTareaOperativa(10, 1, {
        nombre: 'Updated',
      });

      expect(tasksRepo.actualizarTarea).toHaveBeenCalledWith(1, {
        nombre: 'Updated',
      });
    });

    it('should throw ForbiddenException for strategic tasks (if user is not admin)', async () => {
      const strategicTask = {
        idTarea: 1,
        nombre: 'Strategic Task',
        idProyecto: 1,
        proyectoTipo: 'Estrategico',
        proyectoRequiereAprobacion: true,
        idUsuarioAsignado: 10,
      };
      const normalUser = { idUsuario: 10, rolGlobal: 'User' };

      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(
        strategicTask,
      );
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue(normalUser);

      await expect(
        service.updateTareaOperativa(10, 1, { nombre: 'Changed' }),
      ).rejects.toThrow(BadRequestException); // requires approval
    });
  });
});
