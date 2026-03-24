import { Test, TestingModule } from '@nestjs/testing';
import { MarcajeService } from './marcaje.service';
import * as baseRepo from '../db/base.repo';

jest.mock('../db/base.repo', () => ({
    ejecutarSP: jest.fn(),
    ejecutarSPMulti: jest.fn(),
    ejecutarQuery: jest.fn(),
    NVarChar: jest.fn(val => ({ valor: val, tipo: 'NVarChar' })),
    Int: 'Int',
    DateTime: 'DateTime',
    Decimal: jest.fn((p, s) => ({ p, s, tipo: 'Decimal' })),
    Bit: 'Bit',
}));

describe('MarcajeService (Comprehensive)', () => {
    let service: MarcajeService;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [MarcajeService],
        }).compile();

        service = module.get<MarcajeService>(MarcajeService);
    });

    describe('Core Operations', () => {
        it('deshacerUltimoCheckout debería retornar ok del SP', async () => {
            (baseRepo.ejecutarSP as jest.Mock).mockResolvedValue([{ ok: 1, mensaje: 'Eliminado' }]);
            const res = await service.deshacerUltimoCheckout('123');
            expect(res.ok).toBe(true);
            expect(res.mensaje).toBe('Eliminado');
        });

        it('solicitarCorreccion debería llamar al SP con los parámetros correctos', async () => {
            (baseRepo.ejecutarSP as jest.Mock).mockResolvedValue([{ id: 1 }]);
            await service.solicitarCorreccion('123', { tipo_solicitud: 'CORRECCION_ASISTENCIA', motivo: 'Error' });
            expect(baseRepo.ejecutarSP).toHaveBeenCalledWith('sp_marcaje_solicitar_correccion', expect.anything(), undefined, 'MarcajeService.solicitarCorreccion');
        });
    });

    describe('GPS Tracking', () => {
        it('registrarGps (single) debería serializar un array de un solo punto', async () => {
            const punto = { lat: 1, lon: 2, timestamp: '2026-01-01' };
            await service.registrarGps('123', punto);
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(JSON.parse(args.puntos.valor)).toHaveLength(1);
        });
    });

    describe('Admin Read Operations', () => {
        it('adminGetSolicitudes debería manejar errores y retornar []', async () => {
            (baseRepo.ejecutarQuery as jest.Mock).mockRejectedValue(new Error('DB Fail'));
            const res = await service.adminGetSolicitudes();
            expect(res).toEqual([]);
        });

        it('adminGetMonitor debería pasar la fecha al SP como DateTime', async () => {
            await service.adminGetMonitor('2026-02-22');
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.fecha.tipo).toBe('DateTime');
        });

        it('adminGetReportes debería enviar rango de fechas', async () => {
            await service.adminGetReportes('2026-01-01', '2026-01-31', '123');
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.fecha_inicio).toBeDefined();
            expect(args.fecha_fin).toBeDefined();
            expect(args.carnet.valor).toBe('123');
        });
    });

    describe('Admin Write Operations (Resoluciones & CRUD)', () => {
        it('adminResolverSolicitud debería llamar al SP con acción y admin', async () => {
            await service.adminResolverSolicitud(1, 'APROBADA', 'Comentario', 'ADMIN1');
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.solicitud_id.valor).toBe(1);
            expect(args.accion.valor).toBe('APROBADA');
            expect(args.admin_carnet.valor).toBe('ADMIN1');
        });

        it('adminReiniciarEstado debería llamar al SP', async () => {
            await service.adminReiniciarEstado('USER1', 'ADMIN1', 'Test');
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.carnet.valor).toBe('USER1');
        });

        it('adminCrearSite debería pasar lat/lon como Decimal', async () => {
            await service.adminCrearSite({ nombre: 'S1', lat: 12.5, lon: -86.2 });
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.lat.tipo.tipo).toBe('Decimal');
            expect(args.lat.valor).toBe(12.5);
        });

        it('adminActualizarDevice debería llamar al SP con uuid y estado', async () => {
            await service.adminActualizarDevice('UUID-123', 'ACTIVE');
            const args = (baseRepo.ejecutarSP as jest.Mock).mock.calls[0][1];
            expect(args.uuid.valor).toBe('UUID-123');
            expect(args.estado.valor).toBe('ACTIVE');
        });
    });
});
