import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
    SetMetadata,
    ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { EquipoService } from './equipo.service';
import { BloqueosService } from './bloqueos.service';
import { FechaQueryDto } from './dto/clarity.dtos';
import * as accesoRepo from '../acceso/acceso.repo';

@ApiTags('Clarity - Equipo')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('equipo')
export class EquipoController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly equipoService: EquipoService,
        private readonly bloqueosService: BloqueosService
    ) { }

    @Get('hoy')
    @ApiOperation({ summary: 'Obtener snapshot del equipo para el día de hoy' })
    async getEquipoHoy(@Request() req, @Query('fecha') fecha: string) {
        return this.equipoService.getEquipoHoy(req.user.carnet, fecha);
    }

    @Get('bloqueos')
    @ApiOperation({ summary: 'Obtener bloqueos del equipo' })
    async getEquipoBloqueos(@Request() req, @Query('fecha') fecha: string) {
        return this.equipoService.getEquipoBloqueos(req.user.userId, fecha);
    }

    @Get('inform')
    @ApiOperation({
        summary: 'Dashboard equipo: informe detallado independiente',
    })
    async getEquipoInform(@Request() req, @Query() query: FechaQueryDto) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.equipoService.getEquipoInform(carnet, query.fecha);
    }

    @Get('backlog')
    @ApiOperation({ summary: 'Dashboard equipo: backlog' })
    async getEquipoBacklog(@Request() req) {
        return this.equipoService.getEquipoBacklog(req.user.userId);
    }

    @Get('miembro/:idUsuario')
    @ApiOperation({
        summary: 'Obtener información básica de un miembro del equipo por ID',
    })
    async getMiembro(@Param('idUsuario') idUsuario: number, @Request() req) {
        const idLider = req.user.userId;
        const tieneAcceso = await this.tasksService.canManageUser(
            idLider,
            idUsuario,
            req.user.rolGlobal,
        );
        if (!tieneAcceso) {
            throw new ForbiddenException('No tienes permiso para ver a este perfil.');
        }

        const carnet = await accesoRepo.obtenerCarnetDeUsuario(idUsuario);
        if (!carnet) return null;
        const [emp] = await accesoRepo.obtenerDetallesUsuarios([carnet]);
        return emp;
    }

    @Get('miembro/:idUsuario/tareas')
    @ApiOperation({
        summary: 'MANAGER: Ver detalles de miembro de equipo (tareas)',
    })
    async getEquipoMemberTareas(
        @Param('idUsuario') idUsuario: number,
        @Request() req,
    ) {
        const idLider = req.user.userId;
        const res = await this.equipoService.equipoMiembro(idLider, idUsuario);
        return res.tareas;
    }

    @Get('miembro/:idUsuario/bloqueos')
    @ApiOperation({
        summary: 'Obtener bloqueos activos de un miembro del equipo',
    })
    async getEquipoMiembroBloqueos(
        @Param('idUsuario') idUsuario: number,
        @Request() req,
    ) {
        const idLider = req.user.userId;
        const tieneAcceso = await this.tasksService.canManageUser(
            idLider,
            idUsuario,
            req.user.rolGlobal,
        );
        if (!tieneAcceso) {
            throw new ForbiddenException(
                'No tienes permiso para ver los bloqueos de este miembro.',
            );
        }
        return this.bloqueosService.getBloqueosUsuario(idUsuario);
    }

    @Get('actividad')
    @ApiOperation({
        summary:
            'Obtener historial de actividad de los miembros que el usuario puede ver',
    })
    async getEquipoActividad(
        @Request() req,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Query('query') searchTerm?: string,
    ) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.equipoService.getEquipoActividad(
            carnet,
            page,
            limit,
            searchTerm,
        );
    }

    @Get('actividad/:id')
    @ApiOperation({ summary: 'Obtener detalle completo de un log' })
    async getLogDetalle(@Param('id') id: number) {
        return this.tasksService.getAuditLogById(id);
    }


}
