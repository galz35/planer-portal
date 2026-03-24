import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { NVarChar, Int, ejecutarSP } from '../db/base.repo';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import * as admin from 'firebase-admin';

@Controller('notifications')
// @UseGuards(AuthGuard('jwt')) <-- Removido de aquí para permitir el endpoint público temporal
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) { }

  @Post('device-token')
  @UseGuards(AuthGuard('jwt'))
  async registerDeviceToken(
    @Req() req,
    @Body() body: { token: string; platform?: string },
  ) {
    const idUsuario = req.user.userId || req.user.idUsuario || req.user.id;
    const { token, platform } = body;

    if (!idUsuario) {
      this.logger.error('No user ID found in request');
      return { success: false, message: 'User not authenticated' };
    }

    this.logger.log(
      `Registering device token for user ${idUsuario}: ${token?.substring(0, 10)}...`,
    );

    if (!token) return { success: false, message: 'Token required' };

    await ejecutarSP('sp_Dispositivos_Registrar', {
      idUsuario: { valor: idUsuario, tipo: Int },
      tokenFCM: { valor: token, tipo: NVarChar },
      plataforma: { valor: platform || 'android', tipo: NVarChar },
    });

    return { success: true };
  }

  // ============================================================
  // ENDPOINTS DE PRUEBA — Para verificar push y correo en vivo
  // ============================================================

  /**
   * GET /api/notifications/test-push
   * Envía una push de prueba al celular del usuario logueado.
   */
  @Get('test-push')
  @UseGuards(AuthGuard('jwt'))
  async testPush(@Req() req) {
    const idUsuario = req.user.userId || req.user.idUsuario;
    this.logger.log(`Test Push para usuario #${idUsuario}`);

    const tokens = await this.notificationService.getTokensForUser(idUsuario);

    if (!tokens || tokens.length === 0) {
      return {
        success: false,
        message:
          'No se encontraron tokens FCM registrados. Abre la app movil primero.',
        idUsuario,
        tokensRegistrados: 0,
      };
    }

    const result = await this.notificationService.sendPushToUser(
      tokens,
      'Prueba de Planner-EF!',
      'Si ves esto, las notificaciones push estan funcionando.',
      { type: 'TEST', timestamp: new Date().toISOString() },
    );

    return {
      success: true,
      message: `Push enviado a ${tokens.length} dispositivo(s)`,
      idUsuario,
      tokensRegistrados: tokens.length,
      resultado: result
        ? { exitosos: result.successCount, fallidos: result.failureCount }
        : null,
    };
  }

  /**
   * GET /api/notifications/test-email
   * Envía un correo de prueba al email del usuario logueado.
   */
  @Get('test-email')
  @UseGuards(AuthGuard('jwt'))
  async testEmail(@Req() req) {
    const idUsuario = req.user.userId || req.user.idUsuario;
    this.logger.log(`Test Email para usuario #${idUsuario}`);

    const authRepo = require('../auth/auth.repo');
    const usuario = await authRepo.obtenerUsuarioPorId(idUsuario);

    if (!usuario || !usuario.correo) {
      return {
        success: false,
        message: 'No se encontro un correo electronico para tu usuario.',
        idUsuario,
      };
    }

    await this.notificationService.sendTaskAssignmentEmail(usuario.correo, {
      nombre: usuario.nombre || 'Usuario',
      asignadoPor: 'Sistema de Prueba',
      titulo: 'Tarea de Prueba - Verificacion de Correos',
      descripcion:
        'Este es un correo de prueba automatico. Si lo ves con el diseno de Planner-EF, todo esta funcionando perfectamente!',
      prioridad: 'Alta',
      fechaLimite: new Date().toLocaleDateString('es-NI', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      proyecto: 'Pruebas del Sistema',
      enlace: process.env.FRONTEND_URL || 'https://www.rhclaroni.com',
      carnet: usuario.carnet,
      idTarea: 0,
    });

    return {
      success: true,
      message: `Correo de prueba enviado a ${usuario.correo}`,
      idUsuario,
      correo: usuario.correo,
    };
  }

  /**
   * GET /api/notifications/test-email-public
   * Endpoint temporal sin TOKEN para pruebas en Linux.
   */
  @Get('test-email-public')
  async testEmailPublic() {
    const emailTest = 'gustavo.lira@claro.com.ni';
    this.logger.log(`Prueba PÚBLICA de Email para: ${emailTest}`);

    await this.notificationService.sendTaskAssignmentEmail(emailTest, {
      nombre: 'Gustavo Lira (Linux Test)',
      asignadoPor: 'Terminal de Linux',
      titulo: '🚀 ¡PUERTOS ABIERTOS!',
      descripcion: 'Si ves este correo, significa que la regla del Firewall en VMware está funcionando correctamente y el backend ya puede salir a Internet.',
      prioridad: 'Alta',
      fechaLimite: 'Hoy',
      proyecto: 'Infraestructura',
      enlace: 'https://rhclaroni.com',
    });

    // --- INTENTO DE PUSH ---
    const idGustavo = 23;
    const tokens = await this.notificationService.getTokensForUser(idGustavo);
    let pushStatus = 'No hay tokens registrados';

    if (tokens && tokens.length > 0) {
      const res = await this.notificationService.sendPushToUser(
        tokens,
        '🚀 ¡Prueba desde Linux!',
        'Las notificaciones Push también están funcionando para Gustavo.',
        { type: 'TEST', timestamp: new Date().toISOString() },
      );
      pushStatus = res ? `Enviado a ${res.successCount} dispositivos` : 'Fallo en envío';
    }

    return {
      success: true,
      email: `Correo enviado a ${emailTest}`,
      push: pushStatus,
      idUsuario: idGustavo
    };
  }

  /**
   * GET /api/notifications/status
   * Verifica el estado actual de Firebase y Email.
   */
  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  async getStatus(@Req() req) {
    const idUsuario = req.user.userId || req.user.idUsuario;
    const tokens = await this.notificationService.getTokensForUser(idUsuario);

    const firebaseOk = admin.apps.length > 0;

    return {
      firebase: {
        inicializado: firebaseOk,
        proyecto: firebaseOk
          ? (admin.app().options as any)?.credential?.projectId || 'configurado'
          : 'no configurado',
      },
      email: {
        configurado: !!process.env.MAIL_HOST,
        remitente: process.env.MAIL_FROM || 'no configurado',
      },
      tuDispositivo: {
        tokensRegistrados: tokens.length,
        tokens: tokens.map((t) => t.substring(0, 15) + '...'),
      },
      idUsuario,
    };
  }

  @Get('test-overdue-redesign')
  async testOverdueRedesign() {
    const emailTest = 'gustavo.lira@claro.com.ni';
    const carnetGustavo = '500708';

    this.logger.log(`Prueba de REDISEÑO de Email con Datos REALES PENDIENTES para: ${emailTest}`);

    try {
      const { ejecutarQuery, NVarChar } = require('../db/base.repo');

      // Solo tareas ASIGNADAS a Gustavo (como lo haría el job de 8AM)
      const sql = `
        SELECT 
            t.idTarea,
            t.nombre as titulo,
            t.fechaCreacion, t.fechaObjetivo,
            p.nombre as proyectoNombre,
            COALESCE(u.nombre, t.creadorCarnet, 'Sistema') as creadorNombre
        FROM p_Tareas t
        LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
        LEFT JOIN p_Usuarios u ON t.creadorCarnet = u.carnet
        INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea AND ta.carnet = @carnet
        WHERE t.activo = 1
          AND t.estado NOT IN ('Hecha', 'Descartada', 'Eliminada')
          AND (t.idProyecto IS NULL OR p.estado = 'Activo')
        ORDER BY t.fechaObjetivo ASC, t.fechaCreacion ASC
      `;

      const backlog = await ejecutarQuery(sql, {
        carnet: { valor: carnetGustavo, tipo: NVarChar },
      });

      this.logger.log(`Tareas ASIGNADAS a Gustavo: ${backlog.length}`);

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const tareasProcesadas = backlog.map(t => {
        const fechaObj = t.fechaObjetivo ? new Date(t.fechaObjetivo) : new Date(t.fechaCreacion);
        const diffMs = hoy.getTime() - fechaObj.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));

        return {
          titulo: t.titulo,
          proyecto: t.proyectoNombre || 'General',
          diasAtraso: diffDays > 0 ? diffDays : 0,
          fechaLimite: t.fechaObjetivo ? new Date(t.fechaObjetivo).toLocaleDateString('es-NI') : 'Sin fecha',
          creador: t.creadorNombre,
          asignado: 'Gustavo Lira',
        };
      });

      if (tareasProcesadas.length === 0) {
        return { success: false, message: 'No tienes tareas asignadas para probar el diseño.' };
      }

      await this.notificationService.sendOverdueTasksEmail(emailTest, {
        nombre: 'Gustavo Lira',
        totalAtrasadas: tareasProcesadas.length,
        tareas: tareasProcesadas,
        enlace: 'https://rhclaroni.com',
        carnet: carnetGustavo,
      });

      return {
        success: true,
        message: `Correo con TODAS tus tareas pendientes (${tareasProcesadas.length}) enviado a ${emailTest}`,
      };
    } catch (error) {
      this.logger.error('Error en prueba de diseño:', error);
      return { success: false, error: error.message };
    }
  }
}
