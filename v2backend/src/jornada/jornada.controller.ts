/**
 * JornadaController — REST API para Jornada Laboral
 *
 * Endpoints:
 *   GET  /jornada/resolver/:carnet       → Horario de hoy para un usuario
 *   GET  /jornada/semana/:carnet         → Semana completa
 *   GET  /jornada/horarios               → Listar horarios (turnos)
 *   POST /jornada/horarios               → Crear horario
 *   PUT  /jornada/horarios/:id           → Actualizar horario
 *   DEL  /jornada/horarios/:id           → Desactivar horario
 *   GET  /jornada/patrones               → Listar patrones con detalle
 *   POST /jornada/patrones               → Crear patrón
 *   GET  /jornada/asignaciones           → Listar asignaciones
 *   POST /jornada/asignaciones           → Asignar patrón a colaborador
 *   DEL  /jornada/asignaciones/:id       → Desactivar asignación
 */
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JornadaService } from './jornada.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('jornada')
@UseGuards(AuthGuard('jwt'))
export class JornadaController {
    constructor(private readonly jornadaService: JornadaService) { }

    // ─── RESOLVER ─────────────────────────────

    @Get('resolver/:carnet')
    async resolverJornada(
        @Param('carnet') carnet: string,
        @Query('fecha') fecha?: string,
    ) {
        return this.jornadaService.resolverJornada(carnet, fecha);
    }

    @Get('semana/:carnet')
    async obtenerSemana(
        @Param('carnet') carnet: string,
        @Query('fecha') fecha?: string,
    ) {
        return this.jornadaService.obtenerSemana(carnet, fecha);
    }

    // ─── HORARIOS (CRUD) ─────────────────────

    @Get('horarios')
    async listarHorarios() {
        return this.jornadaService.listarHorarios();
    }

    @Post('horarios')
    async crearHorario(@Body() body: any) {
        return this.jornadaService.crearHorario(body);
    }

    @Put('horarios/:id')
    async actualizarHorario(@Param('id') id: string, @Body() body: any) {
        return this.jornadaService.actualizarHorario(parseInt(id), body);
    }

    @Delete('horarios/:id')
    async desactivarHorario(@Param('id') id: string) {
        return this.jornadaService.desactivarHorario(parseInt(id));
    }

    // ─── PATRONES (CRUD) ─────────────────────

    @Get('patrones')
    async listarPatrones() {
        return this.jornadaService.listarPatrones();
    }

    @Post('patrones')
    async crearPatron(@Body() body: any) {
        return this.jornadaService.crearPatron(body);
    }

    // ─── ASIGNACIONES ────────────────────────

    @Get('asignaciones')
    async listarAsignaciones() {
        return this.jornadaService.listarAsignaciones();
    }

    @Post('asignaciones')
    async asignarPatron(@Body() body: any) {
        return this.jornadaService.asignarPatron(body);
    }

    @Delete('asignaciones/:id')
    async desactivarAsignacion(@Param('id') id: string) {
        return this.jornadaService.desactivarAsignacion(parseInt(id));
    }
}
