import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { TasksService } from './tasks.service';
import {
    ReportFilterDto,
    FechaQueryDto,
} from './dto/clarity.dtos';

@ApiTags('Clarity - Reportes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class ReportesController {
    constructor(
        private readonly reportsService: ReportsService,
        private readonly tasksService: TasksService,
    ) { }

    @Get('reportes/productividad')
    @ApiOperation({ summary: 'Obtener reporte de productividad' })
    async getProductividad(@Request() req, @Query() filter: ReportFilterDto) {
        return this.reportsService.getReporteProductividad(req.user.userId, filter);
    }

    @Get('reportes/bloqueos-trend')
    @ApiOperation({ summary: 'Obtener tendencia de bloqueos' })
    async getBloqueosTrend(@Request() req, @Query() filter: ReportFilterDto) {
        return this.reportsService.getReporteBloqueosTrend(req.user.userId, filter);
    }

    @Get('reportes/equipo-performance')
    @ApiOperation({ summary: 'Obtener performance del equipo' })
    async getEquipoPerformance(@Request() req, @Query() filter: ReportFilterDto) {
        return this.reportsService.getReporteEquipoPerformance(
            req.user.userId,
            filter,
        );
    }

    @Get('gerencia/resumen')
    @ApiOperation({ summary: 'Obtener resumen gerencial' })
    async getGerenciaResumen(@Request() req, @Query() query: FechaQueryDto) {
        return this.reportsService.gerenciaResumen(req.user.userId, query.fecha);
    }

    @Get('reports/agenda-compliance')
    @ApiOperation({ summary: 'Obtener cumplimiento de agenda del equipo' })
    async getAgendaCompliance(@Request() req, @Query() query: FechaQueryDto) {
        const roles = req.user.roles || (req.user.rol ? [req.user.rol] : []);
        return this.tasksService.getAgendaCompliance(
            req.user.userId,
            roles,
            query.fecha,
        );
    }

    @Get('reportes/exportar')
    @ApiOperation({ summary: 'Exportar reporte a Excel' })
    async exportar(
        @Request() req,
        @Query() filter: ReportFilterDto,
        @Res() res: Response,
    ) {
        let data = await this.reportsService.getReporteProductividad(
            req.user.userId,
            filter,
        );

        // Si el servicio devolvió { data: [] } por algún error manejado, extraemos el array
        if (!Array.isArray(data) && (data as any).data) {
            data = (data as any).data;
        }

        // Si sigue sin ser array, forzamos uno vacío
        const dataToExport = Array.isArray(data) ? data : [];

        const buffer = await this.reportsService.exportToExcel(
            dataToExport,
            'Reporte',
        );

        res.set({
            'Content-Type':
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=reporte.xlsx',
            'Content-Length': buffer.length,
        });

        res.end(buffer);
    }
}
