import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Query,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProyectoService } from './proyecto.service';
import { AuditService } from '../common/audit.service';
import {
    ProyectoFilterDto,
    ProyectoCrearDto,
} from './dto/clarity.dtos';
import { ColaboradoresService } from '../colaboradores/colaboradores.service';

@ApiTags('Clarity - Proyectos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('proyectos')
export class ProyectosController {
    constructor(
        private readonly proyectoService: ProyectoService,
        private readonly auditService: AuditService,
        private readonly colaboradoresService: ColaboradoresService,
    ) { }

    // ==========================================
    // CATÁLOGOS / ROLES
    // ==========================================

    @Get('roles-colaboracion')
    @ApiOperation({ summary: 'Listar roles de colaboración disponibles' })
    async listarRoles() {
        return this.colaboradoresService.listarRoles();
    }

    @Get()
    @ApiOperation({ summary: 'Listar proyectos' })
    async listarProyectos(@Request() req, @Query() filter: ProyectoFilterDto) {
        return this.proyectoService.proyectoListar(req.user.userId, filter);
    }

    @Post()
    @ApiOperation({ summary: 'Crear proyecto' })
    async crearProyecto(@Body() dto: ProyectoCrearDto, @Request() req) {
        return this.proyectoService.proyectoCrear(dto, req.user.userId);
    }

    @Post(':id/clonar')
    @ApiOperation({ summary: 'Clonar proyecto y sus tareas (sin asignar)' })
    async clonarProyecto(
        @Param('id') id: number,
        @Body() body: { nombre: string },
        @Request() req,
    ) {
        return this.proyectoService.proyectoClonar(id, body.nombre, req.user.userId);
    }

    @Get(':id')
    async getProyecto(@Param('id') id: number, @Request() req) {
        return this.proyectoService.proyectoObtener(id, req.user.userId);
    }

    @Patch(':id')
    async actualizarProyecto(
        @Param('id') id: number,
        @Body() dto: Partial<ProyectoCrearDto>,
        @Request() req,
    ) {
        return this.proyectoService.proyectoActualizar(id, dto, req.user.userId);
    }

    @Delete(':id')
    async eliminarProyecto(@Param('id') id: number, @Request() req) {
        return this.proyectoService.proyectoEliminar(id, req.user.userId);
    }

    @Get(':id/tareas')
    @ApiOperation({ summary: 'Obtener todas las tareas de un proyecto' })
    async getProyectosTareas(@Param('id') id: number, @Request() req) {
        return this.proyectoService.tareasDeProyecto(id, req.user.userId);
    }

    @Get(':id/historial')
    @ApiOperation({
        summary: 'Obtener historial completo (timeline) del proyecto',
    })
    async getProyectoHistorial(
        @Param('id') id: number,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
        @Request() req,
    ) {
        // Verificar que el usuario puede ver este proyecto antes de mostrar historial
        await this.proyectoService.proyectoObtener(id, req.user.userId);
        return this.auditService.getHistorialProyecto(id, page, limit);
    }

    // ==========================================
    // COLABORADORES
    // ==========================================

    @Get(':id/colaboradores')
    @ApiOperation({ summary: 'Listar colaboradores del proyecto' })
    async listarColaboradores(
        @Param('id') id: number,
        @Request() req: any,
    ) {
        const userId = req.user.userId || req.user.idUsuario;
        return this.colaboradoresService.listarColaboradores(id, userId);
    }

    @Post(':id/colaboradores')
    @ApiOperation({ summary: 'Invitar nuevo colaborador' })
    async invitarColaborador(
        @Param('id') id: number,
        @Body()
        body: {
            idUsuario: number;
            rolColaboracion: string;
            fechaExpiracion?: string;
            notas?: string;
        },
        @Request() req: any,
    ) {
        const userId = req.user.userId || req.user.idUsuario;
        return this.colaboradoresService.invitarColaborador(
            id,
            body.idUsuario,
            body.rolColaboracion,
            userId,
            body.fechaExpiracion,
            body.notas,
        );
    }

    @Patch(':id/colaboradores/:idUsuario')
    @ApiOperation({ summary: 'Actualizar rol/permisos de un colaborador' })
    async actualizarColaborador(
        @Param('id') id: number,
        @Param('idUsuario') idUsuarioObjetivo: number,
        @Body()
        body: {
            rolColaboracion?: string;
            permisosCustom?: string[];
            fechaExpiracion?: string;
        },
        @Request() req: any,
    ) {
        const userId = req.user.userId || req.user.idUsuario;
        return this.colaboradoresService.actualizarColaborador(
            id,
            idUsuarioObjetivo,
            userId,
            body.rolColaboracion,
            body.permisosCustom,
            body.fechaExpiracion,
        );
    }

    @Delete(':id/colaboradores/:idUsuario')
    @ApiOperation({ summary: 'Revocar acceso de un colaborador' })
    async revocarColaborador(
        @Param('id') id: number,
        @Param('idUsuario') idUsuarioObjetivo: number,
        @Request() req: any,
    ) {
        const userId = req.user.userId || req.user.idUsuario;
        return this.colaboradoresService.revocarColaborador(
            id,
            idUsuarioObjetivo,
            userId,
        );
    }

    @Get(':id/mis-permisos')
    @ApiOperation({ summary: 'Obtener mis permisos en un proyecto' })
    async obtenerMisPermisos(
        @Param('id') id: number,
        @Request() req: any,
    ) {
        const userId = req.user.userId || req.user.idUsuario;
        return this.colaboradoresService.obtenerMisPermisos(id, userId);
    }
}
