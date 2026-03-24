import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PlanningService } from '../planning/planning.service';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { RecurrenciaService } from './recurrencia.service';
import { NotificationService } from '../common/notification.service';

// Mock de Repositorios (estos son módulos, no clases inyectadas)
jest.mock('./clarity.repo', () => ({
  obtenerCheckinPorFecha: jest.fn(),
  obtenerMisTareas: jest.fn(),
  getTareasUsuario: jest.fn(),
  obtenerBacklog: jest.fn(),
  upsertCheckin: jest.fn(),
  asignarUsuarioTarea: jest.fn(),
  obtenerTareasMultiplesUsuarios: jest.fn(),
  obtenerEquipoHoy: jest.fn(),
  bloquearTarea: jest.fn(),
  resolverBloqueo: jest.fn(),
  ejecutarQuery: jest.fn(),
  obtenerNotaPorId: jest.fn(),
  actualizarNota: jest.fn(),
  eliminarNota: jest.fn(),
}));

jest.mock('./tasks.repo', () => ({
  crearTarea: jest.fn(),
  actualizarTarea: jest.fn(),
  crearAvance: jest.fn(),
  recalcularJerarquia: jest.fn(),
}));

jest.mock('../planning/planning.repo', () => ({
  obtenerTareaPorId: jest.fn(),
  actualizarTarea: jest.fn(),
  obtenerTodosProyectos: jest.fn(),
  obtenerProyectosVisibles: jest.fn(),
  crearProyecto: jest.fn(),
  obtenerProyectoPorId: jest.fn(),
  actualizarDatosProyecto: jest.fn(),
  eliminarProyecto: jest.fn(),
}));

jest.mock('../auth/auth.repo', () => ({
  obtenerUsuarioPorId: jest.fn(),
}));

// Importar los mocks para poder configurar sus retornos
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import * as authRepo from '../auth/auth.repo';
import * as tasksRepo from './tasks.repo';

describe('TasksService', () => {
  let service: TasksService;
  let planningService: PlanningService;
  let auditService: AuditService;
  let visibilidadService: VisibilidadService;

  const mockPlanningService = {
    checkEditPermission: jest.fn(),
    solicitarCambio: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
    getHistorialEntidad: jest.fn(),
  };

  const mockVisibilidadService = {
    verificarAccesoPorId: jest.fn(),
    obtenerEmpleadosVisibles: jest.fn(),
    obtenerCarnetPorId: jest.fn(),
  };

  const mockRecurrenciaService = {
    obtenerAgendaRecurrente: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PlanningService, useValue: mockPlanningService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: VisibilidadService, useValue: mockVisibilidadService },
        { provide: RecurrenciaService, useValue: mockRecurrenciaService },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    planningService = module.get<PlanningService>(PlanningService);
    auditService = module.get<AuditService>(AuditService);
    visibilidadService = module.get<VisibilidadService>(VisibilidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('miDiaGet', () => {
    it('should return day snapshot', async () => {
      const mockCheckin = { idCheckin: 1, entregableTexto: 'Test' };
      const mockTareas = [{ idTarea: 1, titulo: 'Task 1' }];

      (clarityRepo.obtenerCheckinPorFecha as jest.Mock).mockResolvedValue(
        mockCheckin,
      );
      (clarityRepo.getTareasUsuario as jest.Mock).mockResolvedValue(mockTareas);

      const result = await service.miDiaGet('C123', '2024-01-23');

      expect(result.checkinHoy).toEqual(mockCheckin);
      expect(result.tareasSugeridas).toEqual(mockTareas);
    });
  });

  describe('tareaCrearRapida', () => {
    it('should create and assign a task', async () => {
      const dto = { idUsuario: 1, titulo: 'New Task', idProyecto: 5 };
      (visibilidadService.obtenerCarnetPorId as jest.Mock).mockResolvedValue(
        'C123',
      );
      (tasksRepo.crearTarea as jest.Mock).mockResolvedValue(100);
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue({
        idTarea: 100,
        nombre: 'New Task',
      });

      const result = await service.tareaCrearRapida(dto as any);

      expect(tasksRepo.crearTarea).toHaveBeenCalled();
      expect(result.idTarea).toBe(100);
    });
  });

  describe('registrarAvance', () => {
    it('should update progress and log audit', async () => {
      const mockTarea = { idTarea: 1, porcentaje: 0 };
      (planningRepo.obtenerTareaPorId as jest.Mock).mockResolvedValue(
        mockTarea,
      );
      (planningRepo.actualizarTarea as jest.Mock).mockResolvedValue({});
      (authRepo.obtenerUsuarioPorId as jest.Mock).mockResolvedValue({
        carnet: 'C123',
      });

      await service.registrarAvance(1, 50, 'Halfway there', 1);

      expect(planningRepo.actualizarTarea).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ porcentaje: 50 }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'TAREA_ACTUALIZADA',
          recursoId: '1',
        }),
      );
    });
  });


});
