import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecurrenciaService } from './recurrencia.service';
import { TasksService } from './tasks.service';

@ApiTags('Clarity - Recurrencia')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class RecurrenciaController {
    constructor(
        private readonly recurrenciaService: RecurrenciaService,
        private readonly tasksService: TasksService,
    ) { }

    @Post('tareas/:id/recurrencia')
    @ApiOperation({ summary: 'Crear recurrencia para una tarea' })
    async crearRecurrencia(
        @Param('id') idTarea: number,
        @Body()
        body: {
            tipoRecurrencia: 'SEMANAL' | 'MENSUAL';
            diasSemana?: string;
            diaMes?: number;
            fechaInicioVigencia: string;
            fechaFinVigencia?: string;
        },
        @Request() req,
    ) {
        return this.recurrenciaService.crearTareaRecurrente(
            idTarea,
            {
                tipoRecurrencia: body.tipoRecurrencia,
                diasSemana: body.diasSemana,
                diaMes: body.diaMes,
                fechaInicioVigencia: new Date(body.fechaInicioVigencia),
                fechaFinVigencia: body.fechaFinVigencia
                    ? new Date(body.fechaFinVigencia)
                    : undefined,
            },
            req.user.userId,
        );
    }

    @Get('tareas/:id/recurrencia')
    @ApiOperation({ summary: 'Obtener configuración de recurrencia' })
    async obtenerRecurrencia(@Param('id') idTarea: number) {
        return this.recurrenciaService.obtenerRecurrencia(idTarea);
    }

    @Post('tareas/:id/instancia')
    @ApiOperation({ summary: 'Marcar instancia (hecha/omitida/reprogramada)' })
    async marcarInstancia(
        @Param('id') idTarea: number,
        @Body()
        body: {
            fechaProgramada: string;
            estadoInstancia: 'HECHA' | 'OMITIDA' | 'REPROGRAMADA';
            comentario?: string;
            fechaReprogramada?: string;
        },
        @Request() req,
    ) {
        return this.recurrenciaService.marcarInstancia(
            idTarea,
            new Date(body.fechaProgramada),
            body.estadoInstancia,
            body.comentario,
            req.user.userId,
            body.fechaReprogramada ? new Date(body.fechaReprogramada) : undefined,
        );
    }

    @Get('tareas/:id/instancias')
    @ApiOperation({ summary: 'Obtener bitácora de instancias' })
    async obtenerInstancias(
        @Param('id') idTarea: number,
        @Query('limit') limit: number = 30,
    ) {
        return this.recurrenciaService.obtenerInstancias(idTarea, limit);
    }

    @Get('agenda-recurrente')
    @ApiOperation({ summary: 'Obtener tareas recurrentes para una fecha' })
    async obtenerAgendaRecurrente(@Query('fecha') fecha: string, @Request() req) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.recurrenciaService.obtenerAgendaRecurrente(
            fecha ? new Date(fecha) : new Date(),
            carnet,
        );
    }
}
