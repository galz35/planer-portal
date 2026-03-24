import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ejecutarSP } from '../db/base.repo';
import { NotificationService } from './notification.service';

interface TareaAtrasadaRaw {
  idTarea: number;
  tituloTarea: string;
  fechaObjetivo: Date;
  diasAtraso: number;
  proyectoNombre: string;
  proyectoTipo: string;
  carnetAsignado: string;
  nombreAsignado: string;
  correoAsignado: string;
  jefeNombre: string;
  jefeCorreo: string;
  jefeCarnet: string;
}

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(private readonly notificationService: NotificationService) { }

  // CRON: Todos los días a las 8:00 AM
  @Cron('0 0 8 * * *')
  async handleCronRecordatoriosAtraso() {
    this.logger.log(
      '🚀 Iniciando proceso de recordatorios de tareas atrasadas (8:00 AM)...',
    );

    try {
      // 1. Obtener datos de la BD
      const data = await ejecutarSP<TareaAtrasadaRaw>(
        'sp_Reporte_TareasAtrasadas_Cron',
      );

      if (!data || data.length === 0) {
        this.logger.log(
          '✅ No se encontraron tareas atrasadas críticas para reportar hoy.',
        );
        return;
      }

      // 2. Procesar Recordatorios Personales (Agrupados por Colaborador)
      await this.procesarRecordatoriosPersonales(data);

      // 3. Procesar Reportes de Escalación (Agrupados por Jefe)
      await this.procesarReportesEscalacion(data);

      this.logger.log('🏁 Proceso de recordatorios completado exitosamente.');
    } catch (error) {
      this.logger.error('❌ Error en el cron de recordatorios:', error);
    }
  }

  private async procesarRecordatoriosPersonales(data: TareaAtrasadaRaw[]) {
    const porColaborador = this.groupBy(data, 'carnetAsignado');
    const fechaHoy = new Date().toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const enlace = process.env.FRONTEND_URL || 'https://www.rhclaroni.com';

    for (const carnet in porColaborador) {
      const items = porColaborador[carnet];
      const meta = items[0];

      if (!meta.correoAsignado) continue;

      try {
        await this.notificationService.sendCriticalReminderEmail(
          meta.correoAsignado,
          {
            nombre: meta.nombreAsignado,
            tareas: items.map((i) => ({
              titulo: i.tituloTarea,
              proyecto: i.proyectoNombre,
              diasAtraso: i.diasAtraso,
            })),
            jefeNombre: meta.jefeNombre || 'tu jefe inmediato',
            enlace,
            fechaHoy,
            carnet: meta.carnetAsignado,
          },
        );
      } catch (err) {
        this.logger.error(
          `Error enviando correo personal a ${meta.correoAsignado}:`,
          err,
        );
      }
    }
  }

  private async procesarReportesEscalacion(data: TareaAtrasadaRaw[]) {
    const porJefe = this.groupBy(data, 'jefeCarnet');
    const fechaHoy = new Date().toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const enlace = process.env.FRONTEND_URL || 'https://www.rhclaroni.com';

    for (const jefeCarnet in porJefe) {
      const itemsJefe = porJefe[jefeCarnet];
      const metaJefe = itemsJefe[0];

      if (!metaJefe.jefeCorreo) continue;

      // Agrupar los items del jefe por subordinado para el template
      const porSubordinadoRaw = this.groupBy(itemsJefe, 'carnetAsignado');
      const subordinados = Object.keys(porSubordinadoRaw).map((carnetSub) => {
        const tareasSub = porSubordinadoRaw[carnetSub];
        return {
          nombre: tareasSub[0].nombreAsignado,
          tareas: tareasSub.map((t) => ({
            titulo: t.tituloTarea,
            proyecto: t.proyectoNombre,
            diasAtraso: t.diasAtraso,
          })),
        };
      });

      try {
        await this.notificationService.sendEscalationReportEmail(
          metaJefe.jefeCorreo,
          {
            jefeNombre: metaJefe.jefeNombre,
            subordinados,
            enlace,
            fechaHoy,
            jefeCarnet: metaJefe.jefeCarnet,
          },
        );
      } catch (err) {
        this.logger.error(
          `Error enviando reporte de escalación a ${metaJefe.jefeCorreo}:`,
          err,
        );
      }
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce(
      (acc, item) => {
        const val = String(item[key]);
        if (!acc[val]) acc[val] = [];
        acc[val].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }
}
