import { Module } from '@nestjs/common';
import { SoftwareController } from './software.controller';
import { SoftwareService } from './software.service';
import { VisibilidadService } from '../acceso/visibilidad.service';

@Module({
  controllers: [SoftwareController],
  providers: [SoftwareService, VisibilidadService],
})
export class SoftwareModule {}
