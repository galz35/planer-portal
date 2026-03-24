/**
 * RecorridoController — REST API para Recorridos de Campo
 *
 * Endpoints del operador móvil:
 *   POST /campo/recorrido/iniciar        → Empezar recorrido
 *   POST /campo/recorrido/punto          → Registrar punto GPS
 *   POST /campo/recorrido/puntos-batch   → Sync offline
 *   POST /campo/recorrido/finalizar      → Terminar recorrido
 *   GET  /campo/recorrido/activo         → Recorrido en curso
 *   GET  /campo/recorrido/puntos/:id     → Puntos para mapa
 *   GET  /campo/recorrido/historial      → Mis recorridos
 *   GET  /campo/recorrido/admin          → Todos (admin)
 */
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecorridoService } from './recorrido.service';

@Controller('campo/recorrido')
@UseGuards(AuthGuard('jwt'))
export class RecorridoController {
    constructor(private readonly recorridoService: RecorridoService) { }

    @Post('iniciar')
    async iniciar(@Req() req: any, @Body() body: any) {
        return this.recorridoService.iniciarRecorrido(
            req.user.carnet,
            body.lat,
            body.lon,
        );
    }

    @Post('finalizar')
    async finalizar(@Req() req: any, @Body() body: any) {
        return this.recorridoService.finalizarRecorrido(
            req.user.carnet,
            body.lat,
            body.lon,
            body.notas,
        );
    }

    @Post('punto')
    async registrarPunto(@Req() req: any, @Body() body: any) {
        return this.recorridoService.registrarPunto(req.user.carnet, body);
    }

    @Post('puntos-batch')
    async registrarBatch(
        @Req() req: any,
        @Body() body: { puntos: any[] },
    ) {
        return this.recorridoService.registrarPuntosBatch(
            req.user.carnet,
            body.puntos,
        );
    }

    @Get('activo')
    async getActivo(@Req() req: any) {
        return this.recorridoService.getRecorridoActivo(req.user.carnet);
    }

    @Get('puntos/:id')
    async getPuntos(@Param('id') id: string) {
        return this.recorridoService.getPuntosRecorrido(+id);
    }

    @Get('historial')
    async getHistorial(@Req() req: any) {
        return this.recorridoService.getHistorialRecorridos(req.user.carnet);
    }

    @Get('admin')
    async adminGetRecorridos(@Query('fecha') fecha?: string) {
        return this.recorridoService.adminGetRecorridos(fecha);
    }
}
