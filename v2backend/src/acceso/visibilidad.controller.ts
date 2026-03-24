import { Controller, Get, Param } from '@nestjs/common';
import { VisibilidadService } from './visibilidad.service';

/**
 * VisibilidadController - Endpoints para consultar visibilidad
 */
@Controller('visibilidad')
export class VisibilidadController {
  constructor(private readonly visibilidadService: VisibilidadService) {}

  @Get(':carnet')
  async listarCarnetsVisibles(@Param('carnet') carnet: string) {
    return this.visibilidadService.obtenerCarnetsVisibles(carnet);
  }

  @Get(':carnet/empleados')
  async listarEmpleadosVisibles(@Param('carnet') carnet: string) {
    return this.visibilidadService.obtenerEmpleadosVisibles(carnet);
  }

  @Get(':carnet/puede-ver/:carnetObjetivo')
  async verificarVisibilidad(
    @Param('carnet') carnet: string,
    @Param('carnetObjetivo') carnetObjetivo: string,
  ) {
    return this.visibilidadService.puedeVer(carnet, carnetObjetivo);
  }

  // @Get('organizacion/:idorg/subarbol')
  // async obtenerSubarbol(@Param('idorg') idorg: string) {
  //     return this.visibilidadService.obtenerSubarbolOrganizacion(idorg);
  // }

  @Get(':carnet/actores')
  async obtenerActores(@Param('carnet') carnet: string) {
    return this.visibilidadService.obtenerActoresEfectivos(carnet);
  }

  @Get(':carnet/quien-puede-verme')
  async quienPuedeVerme(@Param('carnet') carnet: string) {
    return this.visibilidadService.obtenerQuienPuedeVer(carnet);
  }
}
