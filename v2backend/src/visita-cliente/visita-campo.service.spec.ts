import { Test, TestingModule } from '@nestjs/testing';
import { VisitaCampoService } from './visita-campo.service';
import { VisitaRepo } from './repos/visita.repo';
import { ClienteRepo } from './repos/cliente.repo';
import { TrackingRepo } from './repos/tracking.repo';

describe('VisitaCampoService (Perfect Coverage)', () => {
  let service: VisitaCampoService;
  let vRepo: any;
  let tRepo: any;
  let cRepo: any;

  beforeEach(async () => {
    vRepo = {
      checkin: jest.fn().mockResolvedValue([{ id: 1 }]),
      checkout: jest.fn().mockResolvedValue([{ id: 1 }]),
      agendaHoy: jest.fn().mockResolvedValue([]),
      resumenDia: jest.fn().mockResolvedValue([{ km: 10 }])
    };
    tRepo = {
      insertarLoteGps: jest.fn().mockResolvedValue([{ insertados: 5 }]),
      calculoKmDia: jest.fn().mockResolvedValue([{ km_total: 0 }]),
      obtenerTrackingRaw: jest.fn().mockResolvedValue([]),
      obtenerUsuariosConTracking: jest.fn().mockResolvedValue([])
    };
    cRepo = {
      listarTodos: jest.fn().mockResolvedValue([])
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitaCampoService,
        { provide: VisitaRepo, useValue: vRepo },
        { provide: ClienteRepo, useValue: cRepo },
        { provide: TrackingRepo, useValue: tRepo }
      ],
    }).compile();

    service = module.get<VisitaCampoService>(VisitaCampoService);
  });

  it('debería registrar checkin y retornar primer elemento', async () => {
    const res = await service.registrarCheckin('123', {} as any);
    expect(res.id).toBe(1);
  });

  it('debería registrar checkout y retornar primer elemento', async () => {
    const res = await service.registrarCheckout('123', {} as any);
    expect(res.id).toBe(1);
  });

  it('debería obtener resumen y retornar primer elemento', async () => {
    const res = await service.obtenerResumen('123', '2026-01-01');
    expect(res.km).toBe(10);
    expect(vRepo.resumenDia).toHaveBeenCalledWith('123', '2026-01-01');
  });

  it('debería enviar tracking batch', async () => {
    const res = await service.enviarTrackingBatch('123', [{ lat: 1, lon: 1 }] as any);
    expect(res.insertados).toBe(5);
  });

  it('debería obtener tracking raw delegando al repo', async () => {
    await service.obtenerTrackingRaw('123', '2026-01-01');
    expect(tRepo.obtenerTrackingRaw).toHaveBeenCalledWith('123', '2026-01-01');
  });

  it('debería obtener usuarios con tracking delegando al repo', async () => {
    await service.obtenerUsuariosConTracking();
    expect(tRepo.obtenerUsuariosConTracking).toHaveBeenCalled();
  });

  it('debería obtener clientes delegando al repo', async () => {
    await service.obtenerClientes();
    expect(cRepo.listarTodos).toHaveBeenCalled();
  });
});
