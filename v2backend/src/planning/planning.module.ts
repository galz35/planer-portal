import { Module } from '@nestjs/common';
import { PlanningController } from './planning.controller';
import { PlanningService } from './planning.service';
import { AnalyticsService } from './analytics.service';
import { AccesoModule } from '../acceso/acceso.module';

// NOTA: AsignacionService/Controller removidos temporalmente (usan TypeORM)
// TODO: Migrar a SQL directo

import { AgendaController } from './controllers/agenda.controller';

@Module({
  imports: [AccesoModule],
  controllers: [PlanningController, AgendaController],
  providers: [PlanningService, AnalyticsService],
  exports: [PlanningService, AnalyticsService],
})
export class PlanningModule {}
