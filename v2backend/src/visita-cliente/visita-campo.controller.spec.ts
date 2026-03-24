import { Test, TestingModule } from '@nestjs/testing';
import { VisitaCampoController } from './visita-campo.controller';
import { VisitaCampoService } from './visita-campo.service';

describe('VisitaCampoController', () => {
  let controller: VisitaCampoController;
  let service: VisitaCampoService;

  const mockVisitaSvc = {
    obtenerAgenda: jest.fn(),
    obtenerClientes: jest.fn(),
    registrarCheckin: jest.fn(),
    registrarCheckout: jest.fn(),
    obtenerResumen: jest.fn(),
    enviarTrackingBatch: jest.fn(),
    calcularKm: jest.fn(),
    obtenerTrackingRaw: jest.fn(),
    obtenerUsuariosConTracking: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisitaCampoController],
      providers: [
        {
          provide: VisitaCampoService,
          useValue: mockVisitaSvc,
        },
      ],
    }).compile();

    controller = module.get<VisitaCampoController>(VisitaCampoController);
    service = module.get<VisitaCampoService>(VisitaCampoService);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('Agenda y Clientes', () => {
    it('getAgenda debería llamar al servicio', async () => {
      const req = { user: { carnet: '123' } };
      await controller.getAgenda(req, 12, -86);
      expect(service.obtenerAgenda).toHaveBeenCalledWith('123', 12, -86);
    });

    it('getTodosClientes debería llamar al servicio', async () => {
      await controller.getTodosClientes();
      expect(service.obtenerClientes).toHaveBeenCalled();
    });
  });

  describe('Checkin/Checkout', () => {
    it('checkin debería llamar al servicio', async () => {
      const req = { user: { carnet: '123' } };
      const dto = { cliente_id: 1, lat: 12, lon: -86 };
      await controller.checkin(req, dto as any);
      expect(service.registrarCheckin).toHaveBeenCalledWith('123', dto);
    });
  });

  describe('Tracking', () => {
    it('syncTracking debería llamar al servicio', async () => {
      const req = { user: { carnet: '123' } };
      const dto = { puntos: [{ lat: 12, lon: -86 }] };
      await controller.syncTracking(req, dto as any);
      expect(service.enviarTrackingBatch).toHaveBeenCalledWith(
        '123',
        dto.puntos,
      );
    });

    it('getTrackingRaw debería llamar al servicio', async () => {
      const req = { user: { carnet: '123' } };
      await controller.getTrackingRaw(req, '2026-01-01', '456');
      expect(service.obtenerTrackingRaw).toHaveBeenCalledWith(
        '456',
        '2026-01-01',
      );
    });

    it('getUsuariosConTracking debería llamar al servicio', async () => {
      await controller.getUsuariosConTracking();
      expect(service.obtenerUsuariosConTracking).toHaveBeenCalled();
    });
  });
});
