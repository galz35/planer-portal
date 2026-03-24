import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import * as clarityRepo from './clarity.repo';
import * as planningRepo from '../planning/planning.repo';
import * as tasksRepo from './tasks.repo';
import * as authRepo from '../auth/auth.repo';
import * as colaboradoresRepo from '../colaboradores/colaboradores.repo';
import { ProyectoFilterDto, ProyectoCrearDto } from './dto/clarity.dtos';
import { AuditService } from '../common/audit.service';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { PlanningService } from '../planning/planning.service';
import { isAdminRole } from '../common/role-utils';

@Injectable()
export class ProyectoService {
    constructor(
        private auditService: AuditService,
        private visibilidadService: VisibilidadService,
        private planningService: PlanningService,
    ) { }

    // ===============================================
    // PROYECTOS
    // ===============================================

    async proyectoListar(idUsuario: number, filter?: ProyectoFilterDto) {
        // 1. Obtener info del usuario
        const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (!usuario) return { items: [], total: 0, page: 1, lastPage: 1 };

        // 2. Si es Admin, ve todos los proyectos (con filtros)
        if (isAdminRole(usuario.rolGlobal)) {
            const projects = await planningRepo.obtenerTodosProyectos(filter);
            return { items: projects, total: projects.length, page: 1, lastPage: 1 };
        }

        // 3. Para usuarios normales, filtrar por visibilidad y parámetros extra
        const projects = await planningRepo.obtenerProyectosVisibles(
            idUsuario,
            usuario,
            filter,
        );
        return {
            items: projects,
            total: projects.length,
            page: 1,
            lastPage: 1,
        };
    }

    async assertCanManageProject(idProyecto: number, idUsuario: number) {
        const proyecto = await planningRepo.obtenerProyectoPorId(idProyecto);
        if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

        // Admin puede todo
        const user = await authRepo.obtenerUsuarioPorId(idUsuario);
        if (isAdminRole(user?.rolGlobal) || user?.idRol === 1) return;

        // Creador puede
        if (proyecto.idCreador === idUsuario) return;

        // Responsable puede
        if (user?.carnet && proyecto.responsableCarnet === user.carnet) return;

        // Colaborador Invitado puede
        const isColaborator = await colaboradoresRepo.esColaborador(idProyecto, idUsuario);
        if (isColaborator) return;

        throw new ForbiddenException(
            'No tienes permiso para gestionar este proyecto (Se requiere ser Admin, Creador, Responsable o Colaborador).',
        );
    }

    async proyectoCrear(dto: ProyectoCrearDto, idUsuario: number) {
        const carnet = await this.resolveCarnet(idUsuario);
        const idProyecto = await planningRepo.crearProyecto({
            nombre: dto.nombre,
            descripcion: dto.descripcion,
            idNodoDuenio: dto.idNodoDuenio,
            area: dto.area,
            subgerencia: dto.subgerencia,
            gerencia: dto.gerencia,
            fechaInicio: dto.fechaInicio ? new Date(dto.fechaInicio) : undefined,
            fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : undefined,
            idCreador: idUsuario,
            creadorCarnet: carnet,
            responsableCarnet: dto.responsableCarnet,
            tipo: dto.tipo,
        });
        return await planningRepo.obtenerProyectoPorId(idProyecto);
    }

    async proyectoClonar(
        idOriginal: number,
        nuevoNombre: string,
        idUsuario: number,
    ) {
        // 1. Get original project
        const original = await planningRepo.obtenerProyectoPorId(idOriginal);
        if (!original)
            throw new NotFoundException('Proyecto original no encontrado');

        // 2. Create new project (Clone metadata)
        const carnet = await this.resolveCarnet(idUsuario);
        const idNuevo = await planningRepo.crearProyecto({
            nombre: nuevoNombre,
            descripcion: original.descripcion || undefined,
            idNodoDuenio: original.idNodoDuenio || undefined,
            area: original.area || undefined,
            subgerencia: original.subgerencia || undefined,
            gerencia: original.gerencia || undefined,
            fechaInicio: undefined,
            fechaFin: undefined,
            idCreador: idUsuario,
            tipo: original.tipo || undefined,
        });

        if (carnet) {
            await planningRepo.actualizarDatosProyecto(idNuevo, {
                creadorCarnet: carnet,
            } as any);
        }

        // 3. Get tasks
        const tareas = await clarityRepo.obtenerTareasPorProyecto(idOriginal);

        // 4. Clone tasks (Resetting status and assignees)
        for (const t of tareas) {
            await tasksRepo.crearTarea({
                titulo: t.titulo,
                descripcion: t.descripcion,
                idCreador: idUsuario,
                idProyecto: idNuevo,
                prioridad: t.prioridad,
                esfuerzo: t.esfuerzo,
                tipo: t.tipo || 'Administrativa',
                // Copy dates
                fechaInicioPlanificada: t.fechaInicioPlanificada,
                fechaObjetivo: t.fechaObjetivo,
                // Reset status
                estado: 'Pendiente',
                // Al no enviar idResponsable, el repo usará idCreador (el clonador) por defecto
                comportamiento: t.comportamiento,
            });
        }

        return await planningRepo.obtenerProyectoPorId(idNuevo);
    }

    async proyectoObtener(id: number, idSolicitante?: number) {
        const proyecto = await planningRepo.obtenerProyectoPorId(id);
        if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

        // Si se proporciona idSolicitante, verificar acceso
        if (idSolicitante) {
            const user = await authRepo.obtenerUsuarioPorId(idSolicitante);
            // Admin puede todo
            if (isAdminRole(user?.rolGlobal) || user?.idRol === 1) return proyecto;
            // Creador puede
            if (proyecto.idCreador === idSolicitante) return proyecto;
            // Responsable puede
            if (user?.carnet && proyecto.responsableCarnet === user.carnet)
                return proyecto;
            // Verificar visibilidad por jerarquía (proyectos visibles)
            const proyectosVisibles = await planningRepo.obtenerProyectosVisibles(
                idSolicitante,
                user,
            );
            const tieneAcceso = proyectosVisibles.some(
                (p: any) => p.idProyecto === id,
            );
            if (!tieneAcceso)
                throw new ForbiddenException('No tienes acceso a este proyecto.');
        }

        return proyecto;
    }

    async proyectoActualizar(
        id: number,
        dto: Partial<ProyectoCrearDto>,
        idUsuario: number,
    ) {
        await this.assertCanManageProject(id, idUsuario);
        const proyectoActual = await planningRepo.obtenerProyectoPorId(id);
        if (!proyectoActual) throw new NotFoundException('Proyecto no encontrado');

        const updates: any = { ...dto };
        if (dto.fechaInicio) updates.fechaInicio = new Date(dto.fechaInicio);
        if (dto.fechaFin) updates.fechaFin = new Date(dto.fechaFin);

        await planningRepo.actualizarDatosProyecto(id, updates);

        // Auditoría
        await this.auditService.log({
            accion: 'PROYECTO_ACTUALIZADO',
            recurso: 'Proyecto',
            recursoId: String(id),
            idUsuario,
            datosAnteriores: proyectoActual,
            datosNuevos: { ...proyectoActual, ...updates },
        });

        return await planningRepo.obtenerProyectoPorId(id);
    }

    async proyectoEnllavar(id: number, enllavado: boolean, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        await planningRepo.actualizarDatosProyecto(id, {
            requiereAprobacion: enllavado,
        });
        return { success: true };
    }

    async proyectoEliminar(id: number, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        await planningRepo.eliminarProyecto(id);
        return { success: true };
    }

    async confirmarProyecto(id: number, idUsuario: number) {
        await this.assertCanManageProject(id, idUsuario);
        // Logic to confirm project plan (update status)
        await planningRepo.actualizarDatosProyecto(id, { estado: 'Confirmado' });
        return { success: true };
    }

    async tareasDeProyecto(idProyecto: number, idUsuario: number) {
        const tareas = await clarityRepo.obtenerTareasPorProyecto(idProyecto);

        // Merge with Pending Requests counts
        try {
            const requests =
                await planningRepo.obtenerSolicitudesPendientesPorProyecto(idProyecto);
            const reqMap = new Map<number, number>();
            requests.forEach((r: any) => reqMap.set(r.idTarea, r.total));

            return tareas.map((t: any) => ({
                ...t,
                pendingRequests: reqMap.get(t.idTarea) || 0,
            }));
        } catch (e) {
            console.warn('Error fetching pending requests for project tasks', e);
            return tareas;
        }
    }

    // Solicitudes de cambio
    async getSolicitudesPendientes(idUsuario: number) {
        return await this.planningService.getSolicitudesPendientes(idUsuario);
    }

    async resolverSolicitud(
        id: number,
        accion: string,
        idUsuario: number,
        comentario?: string,
    ) {
        return await this.planningService.resolverSolicitud(
            idUsuario,
            id,
            accion as 'Aprobar' | 'Rechazar',
            comentario,
        );
    }

    // Helpers
    private async resolveCarnet(idUsuario: number): Promise<string> {
        return (await this.visibilidadService.obtenerCarnetPorId(idUsuario)) || '';
    }
}
