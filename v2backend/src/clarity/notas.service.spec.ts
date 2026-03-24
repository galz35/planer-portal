import { Test, TestingModule } from '@nestjs/testing';
import { NotasService } from './notas.service';
import * as clarityRepo from './clarity.repo';

jest.mock('./clarity.repo', () => ({
    obtenerNotaPorId: jest.fn(),
    actualizarNota: jest.fn(),
    eliminarNota: jest.fn(),
}));

describe('NotasService', () => {
    let service: NotasService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [NotasService],
        }).compile();

        service = module.get<NotasService>(NotasService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('Protección de Notas', () => {
        it('✅ Propietario puede editar su nota', async () => {
            (clarityRepo.obtenerNotaPorId as jest.Mock).mockResolvedValue({
                idNota: 5,
                carnet: 'PROPIETARIO',
            });
            (clarityRepo.actualizarNota as jest.Mock).mockResolvedValue({});

            await expect(
                service.notaActualizar(5, 'Titulo', 'Content', 'PROPIETARIO'),
            ).resolves.toEqual({ success: true });
        });

        it('❌ Otro usuario NO puede editar la nota', async () => {
            (clarityRepo.obtenerNotaPorId as jest.Mock).mockResolvedValue({
                idNota: 5,
                carnet: 'OTRO_USUARIO',
            });

            await expect(
                service.notaActualizar(5, 'Titulo', 'Content', 'PROPIETARIO'),
            ).rejects.toThrow('No puedes editar notas de otro usuario.');
        });

        it('❌ Otro usuario NO puede eliminar la nota', async () => {
            (clarityRepo.obtenerNotaPorId as jest.Mock).mockResolvedValue({
                idNota: 5,
                carnet: 'OTRO_USUARIO',
            });

            await expect(service.notaEliminar(5, 'PROPIETARIO')).rejects.toThrow(
                'No puedes eliminar notas de otro usuario.',
            );
        });
    });
});
