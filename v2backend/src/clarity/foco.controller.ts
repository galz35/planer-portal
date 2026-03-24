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
import { FocoService } from './foco.service';
import {
    FechaQueryDto,
    FocoAgregarDto,
    FocoActualizarDto,
    FocoReordenarDto,
    ReportFilterDto,
} from './dto/clarity.dtos';

@ApiTags('Clarity - Foco Diario')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('foco')
export class FocoController {
    constructor(private readonly focoService: FocoService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener foco del día' })
    async getFocoDelDia(@Request() req, @Query() query: FechaQueryDto) {
        return this.focoService.getFocoDelDia(req.user.userId, query.fecha);
    }

    @Post()
    @ApiOperation({ summary: 'Agregar tarea al foco del día' })
    async agregarAlFoco(@Request() req, @Body() dto: FocoAgregarDto) {
        return this.focoService.agregarAlFoco(req.user.userId, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Actualizar foco' })
    async actualizarFoco(
        @Request() req,
        @Param('id') id: number,
        @Body() dto: FocoActualizarDto,
        @Query() query: FechaQueryDto,
    ) {
        return this.focoService.actualizarFoco(
            id,
            req.user.userId,
            dto,
            query.fecha,
        );
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Quitar tarea del foco' })
    async quitarDelFoco(@Request() req, @Param('id') id: number) {
        return this.focoService.quitarDelFoco(id, req.user.userId);
    }

    @Post('reordenar')
    @ApiOperation({ summary: 'Reordenar focos' })
    async reordenarFocos(
        @Request() req,
        @Body() dto: FocoReordenarDto,
        @Query() query: FechaQueryDto,
    ) {
        return this.focoService.reordenarFocos(
            req.user.userId,
            query.fecha,
            dto.ids,
        );
    }

    @Get('estadisticas')
    async getEstadisticasFoco(@Request() req, @Query() filter: ReportFilterDto) {
        const d = new Date();
        return this.focoService.getEstadisticasFoco(
            req.user.userId,
            filter.month || d.getMonth() + 1,
            filter.year || d.getFullYear(),
        );
    }
}
