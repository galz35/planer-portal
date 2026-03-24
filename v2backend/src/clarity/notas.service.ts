import { Injectable, ForbiddenException } from '@nestjs/common';
import * as clarityRepo from './clarity.repo';

@Injectable()
export class NotasService {

    // ==========================================
    // NOTAS
    // ==========================================

    async notasListar(carnet: string) {
        const notas = await clarityRepo.obtenerNotasUsuario(carnet);
        // Map to frontend format
        return notas.map((n: any) => ({
            id: n.idNota.toString(),
            title: n.titulo,
            content: n.contenido,
            date: n.fechaModificacion || n.fechaCreacion,
            status: 'saved',
            projectId: n.idProyecto, // If managed in future
        }));
    }

    async notaCrear(carnet: string, title: string, content: string) {
        await clarityRepo.crearNota({
            carnet,
            titulo: title,
            content,
        });
        return { success: true };
    }

    async notaActualizar(
        idNota: number,
        title: string,
        content: string,
        carnetSolicitante?: string,
    ) {
        // Verificar propiedad si se proporciona carnet
        if (carnetSolicitante) {
            const nota = await clarityRepo.obtenerNotaPorId(idNota);
            if (nota && nota.carnet && nota.carnet !== carnetSolicitante) {
                throw new ForbiddenException('No puedes editar notas de otro usuario.');
            }
        }
        await clarityRepo.actualizarNota(idNota, { titulo: title, content });
        return { success: true };
    }

    async notaEliminar(idNota: number, carnetSolicitante?: string) {
        // Verificar propiedad si se proporciona carnet
        if (carnetSolicitante) {
            const nota = await clarityRepo.obtenerNotaPorId(idNota);
            if (nota && nota.carnet && nota.carnet !== carnetSolicitante) {
                throw new ForbiddenException(
                    'No puedes eliminar notas de otro usuario.',
                );
            }
        }
        await clarityRepo.eliminarNota(idNota);
        return { success: true };
    }
}
