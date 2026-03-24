import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as authRepo from '../auth/auth.repo';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { AuditService } from '../common/audit.service';
import { NVarChar } from '../db/base.repo';

@Injectable()
export class EquipoService {
    constructor(
        private readonly visibilidadService: VisibilidadService,
        private readonly auditService: AuditService,
    ) { }

    async equipoMiembro(idLider: number, idMiembro: number) {
        const tieneAcceso = await this.visibilidadService.verificarAccesoPorId(
            idLider,
            idMiembro,
        );
        if (!tieneAcceso)
            throw new ForbiddenException(
                'No tienes permisos suficientes para ver detalles de este miembro.',
            );

        const carnetMiembro =
            await this.visibilidadService.obtenerCarnetPorId(idMiembro);
        if (!carnetMiembro) throw new NotFoundException('Miembro no encontrado');

        const tasks = await clarityRepo.getTareasUsuario(carnetMiembro);
        const pendientes = tasks.filter((t) =>
            ['Pendiente', 'EnCurso'].includes(t.estado),
        ).length;
        const completadas = tasks.filter((t) => t.estado === 'Hecha').length;
        const usuario = await authRepo.obtenerUsuarioPorId(idMiembro);

        return {
            usuario, // Ahora sí devolvemos el usuario real
            estadisticas: {
                pendientes,
                completadas,
                total: tasks.length,
            },
            tareas: tasks,
        };
    }

    async getEquipoActividad(
        carnet: string,
        page: number = 1,
        limit: number = 50,
        query?: string,
    ) {
        return await this.auditService.listarAuditPorCarnet(
            carnet,
            page,
            limit,
            query,
        );
    }

    async getEquipoBacklog(idUsuarioLider: number) {
        try {
            const carnet =
                await this.visibilidadService.obtenerCarnetPorId(idUsuarioLider);
            if (!carnet) return [];

            const equipo =
                await this.visibilidadService.obtenerCarnetsVisibles(carnet);
            const str = equipo.join(',');

            // Backlog: Tareas activas, pendientes/encurso, cuya fechaObjetivo < Hoy O es NULL
            return await clarityRepo.ejecutarQuery(
                `
                SELECT t.idTarea, t.nombre, t.fechaObjetivo, t.prioridad, t.estado,
                       u.nombre as responsable, u.carnet
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@list, ','))
                  AND t.activo = 1
                  AND t.estado IN ('Pendiente', 'EnCurso')
                  AND (t.fechaObjetivo IS NULL OR t.fechaObjetivo < CAST(GETDATE() AS DATE))
                ORDER BY t.fechaObjetivo ASC
            `,
                { list: { valor: str, tipo: NVarChar } },
            );
        } catch (e) {
            return [];
        }
    }

    // Equipo Hoy (Optimizado)
    async getEquipoHoy(carnetLider: string, fecha: string) {
        try {
            // 1. Obtener carnets de miembros visibles via VisibilidadService (Ya optimizado para Carnet)
            const visibleMembers =
                await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);

            // 2. Obtener reporte de hoy para esos carnets directamente
            return await clarityRepo.obtenerEquipoHoy(visibleMembers, fecha);
        } catch (error) {
            console.error(
                `[EquipoService] Error fetching team snapshot for ${carnetLider} at ${fecha}:`,
                error,
            );
            return {
                miembros: [],
                resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
            };
        }
    }

    // Equipo Informe (NUEVO API Separado)
    async getEquipoInform(carnetLider: string, fecha: string) {
        try {
            const visibleMembers =
                await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
            return await clarityRepo.obtenerEquipoInforme(visibleMembers, fecha);
        } catch (error) {
            console.error(
                `[EquipoService] Error fetching team inform for ${carnetLider} at ${fecha}:`,
                error,
            );
            return {
                miembros: [],
                resumenAnimo: { feliz: 0, neutral: 0, triste: 0, promedio: 0 },
            };
        }
    }

    async getEquipoBloqueos(idUsuarioLider: number, fecha: string) {
        try {
            // 1. Obtener carnet para visibilidad
            const user = await authRepo.obtenerUsuarioPorId(idUsuarioLider);
            if (!user || !user.activo) return [];

            // 2. Obtener lista de usuarios visibles
            let visibleUsers: any[] = [];

            if (user.carnet) {
                visibleUsers = await this.visibilidadService.obtenerEmpleadosVisibles(
                    user.carnet,
                );
            } else {
                // Fallback para usuarios sin carnet (aunque debería tener) - solo ve sus propios bloqueos
                visibleUsers = [user];
            }

            // 3. IDs de usuarios visibles
            const ids = visibleUsers.map((u) => u.idUsuario).join(',');

            // 4. Query bloqueos
            return await clarityRepo.ejecutarQuery(`
                SELECT b.*, 
                       u1.nombre as origenNombre, 
                       u2.nombre as destinoNombre,
                       t.nombre as tareaNombre,
                       t.idProyecto,
                       p.nombre as proyectoNombre
                FROM p_Bloqueos b
                LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
                LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                WHERE b.estado = 'Activo'
                  AND (b.idOrigenUsuario IN (${ids}) OR b.idDestinoUsuario IN (${ids}))
                ORDER BY b.creadoEn DESC
            `);
        } catch (e) {
            return [];
        }
    }
}
