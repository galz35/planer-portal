import { Test, TestingModule } from '@nestjs/testing';
import { VisitaAdminService } from './visita-admin.service';
import { ClienteRepo } from './repos/cliente.repo';
import { VisitaRepo } from './repos/visita.repo';
import { TrackingRepo } from './repos/tracking.repo';
import * as baseRepo from '../db/base.repo';

jest.mock('../db/base.repo', () => ({
  ejecutarSP: jest.fn(),
  NVarChar: jest.fn(val => ({ valor: val, tipo: 'NVarChar' })),
  Int: 'Int',
  DateTime: 'DateTime',
  Decimal: jest.fn((p, s) => ({ p, s, tipo: 'Decimal' })),
}));

describe('VisitaAdminService (Full Coverage)', () => {
  let service: VisitaAdminService;
  let tRepo: TrackingRepo;
  let cRepo: ClienteRepo;
  let vRepo: VisitaRepo;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitaAdminService,
        {
          provide: ClienteRepo,
          useValue: {
            importarClientes: jest.fn().mockResolvedValue([{ ok: true }]),
            crearCliente: jest.fn().mockResolvedValue([{ id: 1 }]),
            actualizarCliente: jest.fn().mockResolvedValue([{ id: 1 }]),
            eliminarCliente: jest.fn().mockResolvedValue([{ id: 1 }]),
          },
        },
        {
          provide: VisitaRepo,
          useValue: {
            adminGetVisitas: jest.fn().mockResolvedValue([]),
            adminGetDashboard: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TrackingRepo,
          useValue: {
            obtenerUsuariosConTracking: jest.fn().mockResolvedValue([]),
            calculoKmDia: jest.fn().mockResolvedValue([]),
            obtenerTrackingRaw: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<VisitaAdminService>(VisitaAdminService);
    tRepo = module.get<TrackingRepo>(TrackingRepo);
    cRepo = module.get<ClienteRepo>(ClienteRepo);
    vRepo = module.get<VisitaRepo>(VisitaRepo);
  });

  describe('CRUD Clientes & Visitas', () => {
    it('importarClientes debería llamar al clienteRepo con JSON', async () => {
      const data = [{ cod: 1 }];
      await service.importarClientes(data);
      expect(cRepo.importarClientes).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('actualizarCliente debería delegar al repo', async () => {
      await service.actualizarCliente(10, { nom: 'Test' });
      expect(cRepo.actualizarCliente).toHaveBeenCalledWith(10, { nom: 'Test' });
    });

    it('eliminarCliente debería delegar al repo', async () => {
      await service.eliminarCliente(10);
      expect(cRepo.eliminarCliente).toHaveBeenCalledWith(10);
    });

    it('obtenerVisitas debería delegar al repo', async () => {
      await service.obtenerVisitas('2026-01-01');
      expect(vRepo.adminGetVisitas).toHaveBeenCalledWith('2026-01-01');
    });
  });

  describe('Reportes & Dashboard', () => {
    it('obtenerDashboard debería delegar al repo', async () => {
      await service.obtenerDashboard('2026-01-01');
      expect(vRepo.adminGetDashboard).toHaveBeenCalledWith('2026-01-01');
    });

    it('obtenerTrackingUsuario debería delegar al repo', async () => {
      await service.obtenerTrackingUsuario('123', '2026-01-01');
      expect(tRepo.obtenerTrackingRaw).toHaveBeenCalledWith('123', '2026-01-01');
    });
  });

  describe('Agenda & Metas', () => {
    it('reordenarAgenda debería llamar al SP', async () => {
      (baseRepo.ejecutarSP as jest.Mock).mockResolvedValue([{ ok: true }]);
      await service.reordenarAgenda(1, 10);
      const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
      expect(args.agenda_id.valor).toBe(1);
      expect(args.nuevo_orden.valor).toBe(10);
    });

    it('eliminarAgenda debería llamar al SP', async () => {
      (baseRepo.ejecutarSP as jest.Mock).mockResolvedValue([{ ok: true }]);
      await service.eliminarAgenda(5);
      const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
      expect(args.agenda_id.valor).toBe(5);
    });

    it('listarMetas debería llamar al SP', async () => {
      await service.listarMetas('123');
      const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
      expect(args.carnet.valor).toBe('123');
    });

    it('setMeta debería manejar vigHasta nulo', async () => {
      await service.setMeta('123', 5, 0.5, '2026-01-01');
      const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
      expect(args.vigente_hasta).toBeNull();
    });
  });
});
