import { Module } from '@nestjs/common';
import { ClarityController } from './clarity.controller';
import { OrganizacionController } from './organizacion.controller';
import { KpisController } from './kpis.controller';
import { FocoController } from './foco.controller';
import { ProyectosController } from './proyectos.controller';
import { ReportesController } from './reportes.controller';
import { EquipoController } from './equipo.controller';
import { RecurrenciaController } from './recurrencia.controller';
import { NotasController } from './notas.controller';
import { AvanceMensualController } from './avance-mensual.controller';
import { TasksService } from './tasks.service';
import { RecurrenciaService } from './recurrencia.service';
import { FocoService } from './foco.service';
import { ReportsService } from './reports.service';
import { PlanningModule } from '../planning/planning.module';
import { AccesoModule } from '../acceso/acceso.module';
import { NotificationModule } from '../common/notification.module';
import { ColaboradoresModule } from '../colaboradores/colaboradores.module';
import { CronService } from './cron.service';
import { NotasService } from './notas.service';
import { BloqueosService } from './bloqueos.service';
import { EquipoService } from './equipo.service';
import { ProyectoService } from './proyecto.service';

@Module({
  imports: [PlanningModule, AccesoModule, NotificationModule, ColaboradoresModule],
  controllers: [
    ClarityController,
    OrganizacionController,
    KpisController,
    FocoController,
    ProyectosController,
    ReportesController,
    EquipoController,
    RecurrenciaController,
    NotasController,
    AvanceMensualController,
  ],
  providers: [TasksService, RecurrenciaService, FocoService, ReportsService, CronService, NotasService, BloqueosService, EquipoService, ProyectoService],
  exports: [TasksService, RecurrenciaService, FocoService, ReportsService, NotasService, BloqueosService, EquipoService, ProyectoService],
})
export class ClarityModule { }
