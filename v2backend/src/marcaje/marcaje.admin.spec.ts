import { Test, TestingModule } from '@nestjs/testing';
import { MarcajeController } from './marcaje.controller';
import { MarcajeService } from './marcaje.service';

describe('MarcajeController (Admin Extended)', () => {
  let controller: MarcajeController;
  let service: MarcajeService;

  const mockMarcajeService = {
    adminGetSolicitudes: jest.fn(),
    adminGetSites: jest.fn(),
    adminGetIps: jest.fn(),
    adminGetDevices: jest.fn(),
    adminGetConfig: jest.fn(),
    adminGetMonitor: jest.fn(),
    adminGetDashboard: jest.fn(),
    adminResolverSolicitud: jest.fn(),
    adminEliminarMarcaje: jest.fn(),
    adminReiniciarEstado: jest.fn(),
    adminGetReportes: jest.fn(),
    adminCrearSite: jest.fn(),
    adminEditarSite: jest.fn(),
    adminEliminarSite: jest.fn(),
    adminCrearIp: jest.fn(),
    adminEliminarIp: jest.fn(),
    adminActualizarDevice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarcajeController],
      providers: [
        {
          provide: MarcajeService,
          useValue: mockMarcajeService,
        },
      ],
    }).compile();

    controller = module.get<MarcajeController>(MarcajeController);
    service = module.get<MarcajeService>(MarcajeService);
  });

  describe('Monitor & Dashboard', () => {
    it('getMonitor debería llamar al servicio', async () => {
      await controller.getMonitor('2026-02-22');
      expect(service.adminGetMonitor).toHaveBeenCalledWith('2026-02-22');
    });

    it('getDashboard debería llamar al servicio', async () => {
      await controller.getDashboard('2026-02-22');
      expect(service.adminGetDashboard).toHaveBeenCalledWith('2026-02-22');
    });
  });

  describe('Acciones Admin', () => {
    it('resolverSolicitud debería llamar al servicio', async () => {
      const req = { user: { carnet: 'ADMIN' } };
      await controller.resolverSolicitud(req, '1', {
        accion: 'APROBADA',
        comentario: 'OK',
      });
      expect(service.adminResolverSolicitud).toHaveBeenCalledWith(
        1,
        'APROBADA',
        'OK',
        'ADMIN',
      );
    });

    it('reiniciarEstado debería llamar al servicio', async () => {
      const req = { user: { carnet: 'ADMIN' } };
      await controller.reiniciarEstado(req, '123', { motivo: 'test' });
      expect(service.adminReiniciarEstado).toHaveBeenCalledWith(
        '123',
        'ADMIN',
        'test',
      );
    });
  });

  describe('CRUD Geocercas e IPs', () => {
    it('crearSite debería llamar al servicio', async () => {
      const dto = { nombre: 'Site Test', lat: 1, lon: 1 };
      await controller.crearSite(dto);
      expect(service.adminCrearSite).toHaveBeenCalledWith(dto);
    });

    it('crearIp debería llamar al servicio', async () => {
      const dto = { nombre: 'VPN', cidr: '1.2.3.4/32' };
      await controller.crearIp(dto);
      expect(service.adminCrearIp).toHaveBeenCalledWith(dto);
    });
  });
});
