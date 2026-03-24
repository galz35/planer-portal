import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private configured = false;

  constructor(@Optional() private readonly mailerService?: MailerService) { }

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const hasFile = !!process.env.FIREBASE_CREDENTIALS_PATH;
    const hasInline = !!process.env.FIREBASE_KEY_JSON;

    if (!hasFile && !hasInline) {
      this.logger.warn(
        '⚠️ Firebase no configurado. Agrega FIREBASE_CREDENTIALS_PATH o FIREBASE_KEY_JSON en .env',
      );
      return;
    }

    try {
      if (admin.apps.length === 0) {
        let serviceAccount: any;

        if (hasInline) {
          // MÉTODO 1: JSON directo en variable de entorno (ideal para servidores aislados)
          serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
          this.logger.log(
            `📱 Firebase: Usando credenciales desde variable FIREBASE_KEY_JSON (proyecto: ${serviceAccount.project_id})`,
          );
        } else {
          // MÉTODO 2: Archivo físico en disco
          const path = require('path');
          const credPath = path.resolve(
            process.cwd(),
            process.env.FIREBASE_CREDENTIALS_PATH,
          );
          serviceAccount = require(credPath);
          this.logger.log(
            `📱 Firebase: Usando archivo ${process.env.FIREBASE_CREDENTIALS_PATH} (proyecto: ${serviceAccount.project_id})`,
          );
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        this.configured = true;
        this.logger.log('✅ Firebase Admin SDK inicializado correctamente');
      } else {
        this.configured = true;
      }
    } catch (error) {
      this.logger.error(
        '❌ Error inicializando Firebase Admin:',
        error.message || error,
      );
    }
  }

  async sendPushToUser(
    tokens: string[],
    title: string,
    body: string,
    data?: any,
  ) {
    if (!this.configured || tokens.length === 0) return;

    // Limpiar tokens invalidos o vacios
    const validTokens = [...new Set(tokens)].filter((t) => t && t.length > 10);
    if (validTokens.length === 0) return;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data: data ? this.sanitizeData(data) : {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(
        `Push sent: ${response.successCount} success, ${response.failureCount} failed out of ${validTokens.length} tokens.`,
      );

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            // TODO: Si el error es 'Unregistered', deberíamos borrar el token de BD
            this.logger.warn(
              `Failed token ${validTokens[idx]}: ${resp.error?.message}`,
            );
          }
        });
      }

      return response;
    } catch (error) {
      this.logger.error('Error sending push notification', error);
    }
  }

  // Firebase data payload values must be strings
  private sanitizeData(data: any): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key in data) {
      if (data[key] !== null && data[key] !== undefined) {
        result[key] = String(data[key]);
      }
    }
    return result;
  }
  async getTokensForUser(idUsuario: number): Promise<string[]> {
    const { ejecutarSP, NVarChar, Int } = require('../db/base.repo');
    try {
      const result = await ejecutarSP('sp_Dispositivos_ObtenerPorUsuario', {
        idUsuario: { valor: idUsuario, tipo: Int },
      });
      return result.map((r: any) => r.tokenFCM).filter(Boolean);
    } catch (error) {
      this.logger.error(`Error getting tokens for user ${idUsuario}`, error);
      return [];
    }
  }

  async sendEmailNotification(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
    meta?: { carnet?: string; idUsuario?: number; idEntidad?: string },
  ) {
    if (!this.mailerService) {
      this.logger.warn(`MailerService not configured, skipping email to ${to}`);
      return;
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context, // Envía las variables a la plantilla Pug
      });
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);

      // Guardar log de éxito
      await this.registrarNotificacion({
        correo: to,
        asunto: subject,
        tipo: template.toUpperCase(),
        estado: 'ENVIADO',
        carnet: meta?.carnet,
        idUsuario: meta?.idUsuario,
        idEntidad: meta?.idEntidad,
      });
    } catch (error) {
      this.logger.error(`Error sending email to ${to}`, error);

      // Guardar log de error
      await this.registrarNotificacion({
        correo: to,
        asunto: subject,
        tipo: template.toUpperCase(),
        estado: 'FALLIDO',
        error: error.message || String(error),
        carnet: meta?.carnet,
        idUsuario: meta?.idUsuario,
        idEntidad: meta?.idEntidad,
      });
    }
  }

  /**
   * Registra el envío en la base de datos
   */
  private async registrarNotificacion(datos: any) {
    const { ejecutarQuery, NVarChar, Int } = require('../db/base.repo');
    try {
      await ejecutarQuery(
        `
        INSERT INTO p_Notificaciones_Enviadas (idUsuario, carnet, correo, tipo, asunto, idEntidad, estado, error, fechaEnvio)
        VALUES (@idUsuario, @carnet, @correo, @tipo, @asunto, @idEntidad, @estado, @error, GETDATE())
      `,
        {
          idUsuario: { valor: datos.idUsuario || null, tipo: Int },
          carnet: { valor: datos.carnet || null, tipo: NVarChar },
          correo: { valor: datos.correo, tipo: NVarChar },
          tipo: { valor: datos.tipo, tipo: NVarChar },
          asunto: { valor: datos.asunto, tipo: NVarChar },
          idEntidad: { valor: String(datos.idEntidad || ''), tipo: NVarChar },
          estado: { valor: datos.estado, tipo: NVarChar },
          error: { valor: datos.error || null, tipo: NVarChar },
        },
      );
    } catch (err) {
      this.logger.error('Error registrando notificacion en DB', err);
    }
  }

  /**
   * Enviar notificación de asignación de tarea.
   */
  async sendTaskAssignmentEmail(
    to: string,
    data: {
      nombre: string;
      asignadoPor: string;
      titulo: string;
      descripcion: string;
      prioridad: string;
      fechaLimite: string;
      proyecto: string;
      enlace: string;
      carnet?: string;
      idTarea?: number;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `📋 ${data.asignadoPor} te asignó: ${data.titulo} | Planner-EF`,
      'asignacion_tarea',
      data,
      { carnet: data.carnet, idEntidad: String(data.idTarea || '') },
    );
  }

  /**
   * Enviar resumen de tareas atrasadas a un usuario.
   */
  async sendOverdueTasksEmail(
    to: string,
    data: {
      nombre: string;
      totalAtrasadas: number;
      tareas: Array<{
        titulo: string;
        proyecto: string;
        diasAtraso: number;
        fechaLimite: string;
        creador?: string;
        asignado?: string;
      }>;
      enlace: string;
      carnet?: string;
      fechaHoy?: string;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `⚠️ Tienes ${data.totalAtrasadas} tarea(s) atrasada(s) | Planner-EF`,
      'tareas_atrasadas',
      data,
      { carnet: data.carnet },
    );
  }

  /**
   * Enviar recordatorio de tareas atrasadas críticas al colaborador.
   */
  async sendCriticalReminderEmail(
    to: string,
    data: {
      nombre: string;
      tareas: Array<{ titulo: string; proyecto: string; diasAtraso: number }>;
      jefeNombre: string;
      enlace: string;
      fechaHoy: string;
      carnet?: string;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `⚠️ RECORDATORIO CRÍTICO: Tareas Atrasadas | Planner-EF`,
      'recordatorio_atraso_critico',
      data,
      { carnet: data.carnet },
    );
  }

  /**
   * Enviar reporte de escalación de tareas atrasadas al jefe inmediato.
   */
  async sendEscalationReportEmail(
    to: string,
    data: {
      jefeNombre: string;
      subordinados: Array<{
        nombre: string;
        tareas: Array<{ titulo: string; proyecto: string; diasAtraso: number }>;
      }>;
      enlace: string;
      fechaHoy: string;
      jefeCarnet?: string;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `📊 REPORTE DE ESCALACIÓN: Pendientes Críticos Equipo | Planner-EF`,
      'recordatorio_atraso_escalado',
      data,
      { carnet: data.jefeCarnet },
    );
  }

  /**
   * Enviar notificación de tarea compartida en agenda.
   */
  async sendSharedTaskEmail(
    to: string,
    data: {
      nombre: string;
      compartidoPor: string;
      titulo: string;
      descripcion: string;
      fecha: string;
      proyecto: string;
      enlace: string;
      carnet?: string;
      idTarea?: number;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `📅 ${data.compartidoPor} compartió una tarea contigo: ${data.titulo} | Planner-EF`,
      'tarea_compartida_agenda',
      data,
      { carnet: data.carnet, idEntidad: String(data.idTarea || '') },
    );
  }
  /**
   * Enviar resumen diario de avances al jefe inmediato.
   */
  async sendDailyTeamSummaryEmail(
    to: string,
    data: {
      jefeNombre: string;
      proyectos: Array<{
        nombre: string;
        tareas: Array<{
          tipoAccion: string;
          usuarioNombre: string;
          tareaTitulo: string;
          progresoActual: number;
          horasReales: number;
          esfuerzo?: string;
        }>;
      }>;
      enlace: string;
      fechaHoy: string;
      jefeCarnet?: string;
    },
  ) {
    await this.sendEmailNotification(
      to,
      `📊 Avances de tu equipo hoy - ${data.fechaHoy} | Planner-EF`,
      'resumen_diario_equipo',
      data,
      { carnet: data.jefeCarnet },
    );
  }
}
