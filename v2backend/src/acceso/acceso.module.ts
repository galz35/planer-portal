import { Module } from '@nestjs/common';
import { AccesoService } from './acceso.service';
import { VisibilidadService } from './visibilidad.service';
import { AccesoController } from './acceso.controller';
import { VisibilidadController } from './visibilidad.controller';
import { VisibilidadGuard } from './visibilidad.guard';

@Module({
  controllers: [AccesoController, VisibilidadController],
  providers: [AccesoService, VisibilidadService, VisibilidadGuard],
  exports: [AccesoService, VisibilidadService, VisibilidadGuard],
})
export class AccesoModule {}
