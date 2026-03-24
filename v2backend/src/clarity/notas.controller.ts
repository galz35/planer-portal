import {
    Controller,
    Get,
    Post,
    Patch,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { NotasService } from './notas.service';

@ApiTags('Clarity - Notas')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class NotasController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly notasService: NotasService,
    ) { }

    @Get('notas')
    async getNotas(@Request() req) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.notasService.notasListar(carnet);
    }

    @Post('notas')
    @Post('notes') // Alias Sync Móvil
    async crearNota(
        @Body() body: { title: string; content: string },
        @Request() req,
    ) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.notasService.notaCrear(carnet, body.title, body.content);
    }

    @Patch('notas/:id')
    @Patch('notes/:id') // Alias Sync Móvil
    @Put('notes/:id') // Alias Sync Móvil
    async updateNota(
        @Param('id') id: number,
        @Body() body: { title: string; content: string },
        @Request() req,
    ) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.notasService.notaActualizar(
            id,
            body.title,
            body.content,
            carnet,
        );
    }

    @Delete('notas/:id')
    async deleteNota(@Param('id') id: number, @Request() req) {
        const carnet =
            req.user.carnet ||
            (await this.tasksService.resolveCarnet(req.user.userId));
        return this.notasService.notaEliminar(id, carnet);
    }
}
