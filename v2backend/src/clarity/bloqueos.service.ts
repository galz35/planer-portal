import { Injectable } from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import { BloqueoCrearDto } from './dto/clarity.dtos';
import { TasksService } from './tasks.service';
import { Int } from '../db/base.repo';

@Injectable()
export class BloqueosService {
    constructor(private tasksService: TasksService) { }

    async getBloqueosByTarea(idTarea: number) {
        return await clarityRepo.ejecutarQuery(
            `
             SELECT b.*, 
                   u1.nombreCompleto as origenNombre, 
                   u2.nombreCompleto as destinoNombre
            FROM p_Bloqueos b
            LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
            LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
            WHERE b.idTarea = @idTarea
            ORDER BY b.fechaCreacion DESC
        `,
            { idTarea: { valor: idTarea, tipo: Int } },
        );
    }

    async getBloqueosUsuario(idUsuario: number) {
        return await clarityRepo.ejecutarQuery(
            `
            SELECT b.*, t.nombre as tareaNombre, u1.nombreCompleto as origenNombre
            FROM p_Bloqueos b
            JOIN p_Tareas t ON b.idTarea = t.idTarea
            LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
            WHERE b.idDestinoUsuario = @idUsuario AND b.estado = 'Activo'
            ORDER BY b.fechaCreacion DESC
            `,
            { idUsuario: { valor: idUsuario, tipo: Int } },
        );
    }

    async bloqueoCrear(dto: BloqueoCrearDto) {
        const result = await clarityRepo.bloquearTarea(dto);

        // Notificar bloqueo
        if (dto.idTarea && dto.idOrigenUsuario) {
            const tarea = await planningRepo.obtenerTareaPorId(dto.idTarea);
            const destinos = dto.idDestinoUsuario
                ? [dto.idDestinoUsuario]
                : tarea
                    ? [tarea.idResponsable, tarea.idCreador].filter(Boolean)
                    : [];

            this.tasksService.notificarActualizacionTarea(
                dto.idTarea,
                dto.idOrigenUsuario,
                destinos as number[],
                'ha reportado un BLOQUEO 🚫',
                `Motivo: ${dto.motivo}`,
            );
        }

        return result;
    }

    async bloqueoResolver(idBloqueo: number, body: any, carnetResolver: string) {
        await clarityRepo.resolverBloqueo(
            idBloqueo,
            body.solucion || 'Resuelto manualmente',
        );

        // Opcional: Notificar que se resolvió, tendríamos que obtener de la DB quién lo bloqueó original o el idTarea
        // Por simplicidad y UX rápida lo dejamos silencioso en la UI, pero el backend lo registra.

        return { success: true };
    }
}
