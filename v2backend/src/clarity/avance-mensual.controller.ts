import {
    Controller,
    Get,
    Post,
    Body,
    UseGuards,
    Request,
    Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as avanceMensualRepo from '../planning/avance-mensual.repo';

@ApiTags('Clarity - Avance Mensual')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('tareas/:idTarea/avance-mensual')
export class AvanceMensualController {
    @Get()
    @ApiOperation({
        summary: 'Obtener historial de avances mensuales de una tarea',
    })
    async getHistorial(@Param('idTarea') idTarea: number) {
        const historial = await avanceMensualRepo.obtenerHistorialMensual(idTarea);
        const acumulado = await avanceMensualRepo.obtenerAcumulado(idTarea);
        return {
            success: true,
            data: {
                historial,
                acumulado,
            },
        };
    }

    @Post()
    @ApiOperation({ summary: 'Registrar avance mensual (upsert)' })
    async registrarAvance(
        @Param('idTarea') idTarea: number,
        @Body()
        body: {
            anio: number;
            mes: number;
            porcentajeMes: number;
            comentario?: string;
        },
        @Request() req,
    ) {
        console.log(`[API] registrarAvance idTarea=${idTarea}`, body);
        await avanceMensualRepo.upsertAvanceMensual(
            idTarea,
            body.anio,
            body.mes,
            body.porcentajeMes,
            body.comentario || null,
            req.user.userId,
        );

        // Devolver el estado actualizado
        const historial = await avanceMensualRepo.obtenerHistorialMensual(idTarea);
        const acumulado = await avanceMensualRepo.obtenerAcumulado(idTarea);

        console.log(`[API] Nuevo acumulado idTarea=${idTarea}: ${acumulado}`);

        return {
            success: true,
            message: `Avance de ${body.porcentajeMes}% registrado para ${body.mes}/${body.anio}`,
            data: { historial, acumulado },
        };
    }
}
