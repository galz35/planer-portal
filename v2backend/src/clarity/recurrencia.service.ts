/**
 * Servicio de Recurrencia (Agenda Diaria / Mi Día)
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import * as recurrenciaRepo from './recurrencia.repo';
import { AuditService } from '../common/audit.service';

@Injectable()
export class RecurrenciaService {
  constructor(private auditService: AuditService) {}

  /**
   * Crea una tarea recurrente
   */
  async crearTareaRecurrente(
    idTarea: number,
    config: {
      tipoRecurrencia: 'SEMANAL' | 'MENSUAL';
      diasSemana?: string;
      diaMes?: number;
      fechaInicioVigencia: Date;
      fechaFinVigencia?: Date;
    },
    idUsuario: number,
  ) {
    const id = await recurrenciaRepo.crearRecurrencia({
      idTarea,
      tipoRecurrencia: config.tipoRecurrencia,
      diasSemana: config.diasSemana,
      diaMes: config.diaMes,
      fechaInicioVigencia: config.fechaInicioVigencia,
      fechaFinVigencia: config.fechaFinVigencia,
      idCreador: idUsuario,
    });

    await this.auditService.log({
      accion: 'TAREA_ACTUALIZADA',
      recurso: 'Tarea',
      recursoId: String(idTarea),
      idUsuario,
      detalles: { tipo: 'CrearRecurrencia', config },
    });

    return { id, message: 'Recurrencia creada' };
  }

  /**
   * Obtiene la configuración de recurrencia de una tarea
   */
  async obtenerRecurrencia(idTarea: number) {
    return await recurrenciaRepo.obtenerRecurrenciaPorTarea(idTarea);
  }

  /**
   * Marca una instancia (hecha/omitida/reprogramada)
   */
  async marcarInstancia(
    idTarea: number,
    fechaProgramada: Date,
    estadoInstancia: 'HECHA' | 'OMITIDA' | 'REPROGRAMADA',
    comentario?: string,
    idUsuario?: number,
    fechaReprogramada?: Date,
  ) {
    // Verificar si ya existe instancia para esa fecha
    const existente = await recurrenciaRepo.obtenerInstanciaPorFecha(
      idTarea,
      fechaProgramada,
    );

    if (existente) {
      // Actualizar existente
      await recurrenciaRepo.actualizarEstadoInstancia(
        existente.id,
        estadoInstancia,
        comentario,
        fechaReprogramada,
      );
      return { id: existente.id, updated: true };
    } else {
      // Crear nueva instancia
      const recurrencia =
        await recurrenciaRepo.obtenerRecurrenciaPorTarea(idTarea);
      const id = await recurrenciaRepo.crearInstancia({
        idTarea,
        idRecurrencia: recurrencia?.id,
        fechaProgramada,
        estadoInstancia,
        comentario,
        idUsuarioEjecutor: idUsuario,
        fechaReprogramada,
      });
      return { id, created: true };
    }
  }

  /**
   * Obtiene bitácora de instancias de una tarea
   */
  async obtenerInstancias(idTarea: number, limit: number = 30) {
    return await recurrenciaRepo.obtenerInstanciasPorTarea(idTarea, limit);
  }

  /**
   * Obtiene recurrencias que aplican para una fecha (agenda diaria)
   */
  async obtenerAgendaRecurrente(fecha: Date, carnet: string) {
    return await recurrenciaRepo.obtenerAgendaRecurrente(fecha, carnet);
  }

  /**
   * Verifica si un día específico aplica según el patrón de recurrencia (lógica JS)
   */
  verificarDiaAplica(
    recurrencia: {
      tipoRecurrencia: string;
      diasSemana?: string;
      diaMes?: number;
      fechaInicioVigencia: Date;
      fechaFinVigencia?: Date;
    },
    fecha: Date,
  ): boolean {
    // Verificar vigencia
    if (fecha < recurrencia.fechaInicioVigencia) return false;
    if (recurrencia.fechaFinVigencia && fecha > recurrencia.fechaFinVigencia)
      return false;

    if (recurrencia.tipoRecurrencia === 'SEMANAL') {
      // getDay(): dom=0, lun=1... Convertir a ISO: lun=1, dom=7
      let diaISO = fecha.getDay();
      if (diaISO === 0) diaISO = 7;

      const diasPermitidos =
        recurrencia.diasSemana?.split(',').map(Number) || [];
      return diasPermitidos.includes(diaISO);
    }

    if (recurrencia.tipoRecurrencia === 'MENSUAL') {
      return fecha.getDate() === recurrencia.diaMes;
    }

    return false;
  }
}
