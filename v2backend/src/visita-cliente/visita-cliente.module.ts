import { Module } from '@nestjs/common';
import { VisitaRepo } from './repos/visita.repo';
import { ClienteRepo } from './repos/cliente.repo';
import { TrackingRepo } from './repos/tracking.repo';
import { VisitaCampoService } from './visita-campo.service';
import { VisitaAdminService } from './visita-admin.service';
import { VisitaCampoController } from './visita-campo.controller';
import { VisitaAdminController } from './visita-admin.controller';

@Module({
  controllers: [VisitaCampoController, VisitaAdminController],
  providers: [
    VisitaRepo,
    ClienteRepo,
    TrackingRepo,
    VisitaCampoService,
    VisitaAdminService,
  ],
  exports: [VisitaCampoService, VisitaAdminService],
})
export class VisitaClienteModule {}
