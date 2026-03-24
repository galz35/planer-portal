import { Test, TestingModule } from '@nestjs/testing';
import { VisitaAdminController } from './visita-admin.controller';
import { VisitaAdminService } from './visita-admin.service';

describe('VisitaAdminController (Advanced)', () => {
  let controller: VisitaAdminController;
  let service: VisitaAdminService;

  const mockAdminService = {
    importarClientes: jest.fn(),
    crearCliente: jest.fn(),
    actualizarCliente: jest.fn(),
    eliminarCliente: jest.fn(),
    obtenerVisitas: jest.fn(),
    obtenerDashboard: jest.fn(),
    generarReporteKm: jest.fn(),
    obtenerTrackingUsuario: jest.fn(),
    listarAgenda: jest.fn(),
    crearAgenda: jest.fn(),
    reordenarAgenda: jest.fn(),
    eliminarAgenda: jest.fn(),
    listarMetas: jest.fn(),
    setMeta: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitaAdminController],
      providers: [
        {
          provide: VisitaAdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<VisitaAdminController>(VisitaAdminController);
    service = module.get<VisitaAdminService>(VisitaAdminService);
  });

  describe('CRUD Clientes', () => {
    it('crearCliente debería llamar al servicio', async () => {
      const body = { codigo: 'C1', nombre: 'Test' };
      await controller.crearCliente(body);
      expect(service.crearCliente).toHaveBeenCalledWith(body);
    });

    it('actualizarCliente debería llamar al servicio', async () => {
      const body = { nombre: 'Update' };
      await controller.actualizarCliente('1', body);
      expect(service.actualizarCliente).toHaveBeenCalledWith(1, body);
    });

    it('eliminarCliente debería llamar al servicio', async () => {
      await controller.eliminarCliente('1');
      expect(service.eliminarCliente).toHaveBeenCalledWith(1);
    });
  });

  describe('Reporte de Km', () => {
    it('debería retornar el reporte del servicio', async () => {
      const mockReport = [{ carnet: '123', km: 10 }];
      mockAdminService.generarReporteKm.mockResolvedValue(mockReport);

      const result = await controller.getReporteKm('2026-02-01', '2026-02-28');

      expect(result).toBe(mockReport);
      expect(service.generarReporteKm).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
    });
  });

  describe('Tracking', () => {
    it('getTrackingUsuario debería llamar al servicio con carnet y fecha', async () => {
      await controller.getTrackingUsuario('123', '2026-01-01');
      expect(service.obtenerTrackingUsuario).toHaveBeenCalledWith('123', '2026-01-01');
    });
  });

  describe('Agenda', () => {
    it('listarAgenda debería llamar al servicio', async () => {
      await controller.listarAgenda('123', '2026-01-01');
      expect(service.listarAgenda).toHaveBeenCalledWith('123', '2026-01-01');
    });

    it('crearAgenda debería pasar todos los campos al servicio', async () => {
      const body = {
        carnet: '123',
        cliente_id: 50,
        fecha: '2026-02-25',
        orden: 1,
        notas: 'Test nota',
      };
      await controller.crearAgenda(body);
      expect(service.crearAgenda).toHaveBeenCalledWith('123', 50, '2026-02-25', 1, 'Test nota');
    });

    it('reordenarAgenda debería llamar al servicio', async () => {
      await controller.reordenarAgenda('1', { nuevo_orden: 5 });
      expect(service.reordenarAgenda).toHaveBeenCalledWith(1, 5);
    });

    it('eliminarAgenda debería llamar al servicio', async () => {
      await controller.eliminarAgenda('1');
      expect(service.eliminarAgenda).toHaveBeenCalledWith(1);
    });
  });

  describe('Metas - Configuración', () => {
    it('listarMetas debería llamar al servicio', async () => {
      await controller.listarMetas('123');
      expect(service.listarMetas).toHaveBeenCalledWith('123');
    });

    it('setMeta debería pasar campos opcionales de vigencia', async () => {
      const body = {
        carnet: '123',
        meta_visitas: 5,
        costo_km: 0.20,
        vigente_desde: '2026-01-01',
        vigente_hasta: '2026-12-31',
      };
      await controller.setMeta(body);
      expect(service.setMeta).toHaveBeenCalledWith('123', 5, 0.20, '2026-01-01', '2026-12-31');
    });
  });
});
