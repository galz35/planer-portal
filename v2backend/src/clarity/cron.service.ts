import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import * as tasksRepo from './tasks.repo';
import * as accesoRepo from '../acceso/acceso.repo';
import * as clarityRepo from './clarity.repo';

import { NotificationService } from '../common/notification.service';
import { TasksService } from './tasks.service';

@Injectable()
export class CronService {
    private readonly logger = new Logger(CronService.name);

    constructor(
        private notificationService: NotificationService,
        private tasksService: TasksService,
    ) { }

    // ===============================================
    // CRON: Recordatorios de Tareas (cada minuto)
    // ===============================================

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCronRecordatorios() {
        try {
            const pendientes = await tasksRepo.obtenerRecordatoriosPendientesAhora();
            if (pendientes.length === 0) return;

            this.logger.log(
                `⏰ ${pendientes.length} recordatorio(s) pendiente(s) de enviar`,
            );

            for (const rec of pendientes) {
                try {
                    const tokens = await this.notificationService.getTokensForUser(
                        rec.idUsuario,
                    );
                    if (tokens && tokens.length > 0) {
                        const titulo = `⏰ Recordatorio: ${rec.tituloTarea}`;
                        const cuerpo =
                            rec.nota ||
                            `Tu tarea "${rec.tituloTarea}" necesita atención (${rec.prioridad || 'Normal'})`;

                        await this.notificationService.sendPushToUser(
                            tokens,
                            titulo,
                            cuerpo,
                            {
                                type: 'REMINDER',
                                taskId: rec.idTarea,
                                reminderId: rec.idRecordatorio,
                            },
                        );
                    }

                    await tasksRepo.marcarRecordatorioEnviado(rec.idRecordatorio);
                    this.logger.log(
                        `✅ Recordatorio ${rec.idRecordatorio} enviado a usuario ${rec.idUsuario}`,
                    );
                } catch (err) {
                    this.logger.error(
                        `Error enviando recordatorio ${rec.idRecordatorio}:`,
                        err,
                    );
                }
            }
        } catch (error) {
            // Silenciar si la tabla aún no existe
            if (!String(error).includes('p_TareaRecordatorios')) {
                this.logger.error('Error en cron de recordatorios:', error);
            }
        }
    }

    // ===============================================
    // CRON: Tareas Atrasadas (8:00 AM, Diarios)
    // ===============================================
    @Cron('0 0 8 * * *', { timeZone: 'America/Managua' })
    async enviarNotificacionTareasAtrasadas() {
        try {
            this.logger.log('⏰ Iniciando revisión de tareas atrasadas (8:00 AM)');
            const usuarios = await accesoRepo.listarEmpleadosActivos();

            for (const user of usuarios) {
                if (!user.carnet || !user.correo) continue;

                try {
                    const backlog = await clarityRepo.obtenerBacklog(user.carnet);

                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);

                    // Filtrar las tareas que están asignadas directamente y están vencidas
                    // El repo ya filtra las vencidas por SQL (fecha < hoy), así que solo filtramos el rol
                    const atrasadas = backlog.filter(t => t.asignadoDirecto === true);

                    if (atrasadas.length > 0) {
                        // 1. Enviar PUSH
                        const tokens = await this.notificationService.getTokensForUser(user.idUsuario);
                        if (tokens && tokens.length > 0) {
                            await this.notificationService.sendPushToUser(
                                tokens,
                                '⚠️ Tareas Atrasadas',
                                `Tienes ${atrasadas.length} tarea(s) vencida(s) que requieren tu atención.`,
                                { type: 'BACKLOG_REMINDER' }
                            );
                        }

                        // 2. Enviar EMAIL con el nuevo diseño
                        await this.notificationService.sendOverdueTasksEmail(user.correo, {
                            nombre: user.nombre || user.nombreCompleto,
                            totalAtrasadas: atrasadas.length,
                            tareas: atrasadas.map(t => {
                                const fechaBase = t.fechaObjetivo ? new Date(t.fechaObjetivo) : new Date(t.fechaCreacion);
                                const diffMs = hoy.getTime() - fechaBase.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 3600 * 24));

                                return {
                                    titulo: t.titulo,
                                    proyecto: t.proyectoNombre || 'Carga Laboral',
                                    diasAtraso: diffDays > 0 ? diffDays : 0,
                                    fechaLimite: t.fechaObjetivo ? new Date(t.fechaObjetivo).toLocaleDateString('es-NI') : 'Sin fecha',
                                    creador: t.creadorNombre,
                                    asignado: user.nombre || user.nombreCompleto,
                                };
                            }),
                            enlace: process.env.FRONTEND_URL || 'https://rhclaroni.com',
                            carnet: user.carnet
                        });

                        this.logger.log(`📧 Notificación de atraso enviada a ${user.correo} (${atrasadas.length} tareas)`);
                    }
                } catch (err) {
                    this.logger.error(`Error procesando atrasos para ${user.carnet}:`, err);
                }
            }
        } catch (error) {
            this.logger.error('Error general en cron de tareas atrasadas:', error);
        }
    }

    // ===============================================
    // CRON: Resumen Semanal Equipo (Viernes 5 PM)
    // ===============================================

    @Cron('0 0 17 * * 5')
    async enviarResumenSemanal() {
        try {
            this.logger.log('Iniciando envío de resumen semanal (Viernes 5:00 PM)');
            const usuarios = await accesoRepo.listarEmpleadosActivos();

            for (const user of usuarios) {
                if (!user.carnet || !user.correo) continue;

                try {
                    const dateLastWeek = new Date();
                    dateLastWeek.setDate(dateLastWeek.getDate() - 7);
                    const startDate = dateLastWeek.toISOString().split('T')[0];
                    const endDate = new Date().toISOString().split('T')[0];

                    const workload = await this.tasksService.getWorkload(
                        user.carnet,
                        startDate,
                        endDate,
                    );

                    if (!workload || !workload.users || workload.users.length <= 1)
                        continue;

                    let totalCompletadas = 0;
                    let totalPendientes = 0;

                    const ranking = workload.users
                        .filter((u) => u.carnet !== user.carnet)
                        .map((u) => {
                            totalCompletadas += u.tareasCompletadas || 0;
                            totalPendientes += u.tareasActivas || 0;
                            return {
                                nombre: u.nombre,
                                completadas: u.tareasCompletadas || 0,
                            };
                        })
                        .sort((a, b) => b.completadas - a.completadas);

                    if (ranking.length > 0) {
                        await this.notificationService.sendEmailNotification(
                            user.correo,
                            `📊 Resumen Semanal de tu Equipo | Planner-EF`,
                            'resumen_semanal',
                            {
                                nombre: user.nombre || 'Líder',
                                totalCompletadas,
                                totalPendientes,
                                ranking,
                                enlace: process.env.FRONTEND_URL || 'https://www.rhclaroni.com',
                            },
                        );
                        this.logger.log(`Resumen semanal enviado a líder ${user.correo}`);
                    }
                } catch (err) {
                    this.logger.error(
                        `Error enviando resumen semanal a ${user.correo}:`,
                        err,
                    );
                }
            }
            this.logger.log('Fin de envío de resumen semanal.');
        } catch (error) {
            this.logger.error('Error general en cron de resumen semanal:', error);
        }
    }

    // ===============================================
    // CRON: Resumen Diario Equipo (Lunes a Viernes 5:50 PM)
    // ===============================================

    @Cron('50 17 * * 1-5', { timeZone: 'America/Managua' })
    async enviarResumenDiario() {
        try {
            this.logger.log('Iniciando envío de resumen diario (5:50 PM)');
            const usuarios = await accesoRepo.listarEmpleadosActivos();

            // Filtrar solo a los que tienen un equipo a cargo
            for (const jefe of usuarios) {
                if (!jefe.carnet || !jefe.correo) continue;

                try {
                    // Obtener subordinados directos del jefe
                    const equipo = await accesoRepo.obtenerEquipoDirecto(jefe.carnet);
                    const carnetsEquipo = equipo.map(e => e.carnet);

                    // Si no tiene equipo directo, ignoramos
                    if (carnetsEquipo.length === 0) continue;

                    // Excluir específicamente a jefes de JUAN.ORTUÑO si lo pide la regla dura
                    // (User pidió: "no se debe enviar nada al jefe de juan.ortuño")
                    // Si el jefe es el jefe de Juan Ortuño, esto lo filtrará:
                    // (Omitiremos si el jefe manda sobre Juan, para cumplir con el requirement estricto, 
                    // o simplemente quitamos a Juan de la lista de subordinados si es que él hizo algo hoy)
                    if (carnetsEquipo.some(c => c === '300042')) {
                        // El jefe de juan ortuño NO debe recibir notificación de sus avances.
                        console.log(`[Cron] Omitiendo Resumen Diario para ${jefe.nombre} porque es jefe de Juan Ortuño.`);
                        continue;
                    }

                    // Ejecutamos la consulta nueva
                    const resumen = await clarityRepo.obtenerResumenDiarioEquipo(carnetsEquipo);

                    if (!resumen || resumen.length === 0) continue;

                    // Agrupar por Proyecto para el Template
                    const proyectosMap = new Map<string, any>();

                    for (const row of resumen) {
                        if (!proyectosMap.has(row.proyectoNombre)) {
                            proyectosMap.set(row.proyectoNombre, {
                                nombre: row.proyectoNombre,
                                tareas: []
                            });
                        }

                        proyectosMap.get(row.proyectoNombre).tareas.push({
                            tipoAccion: row.tipoAccion,
                            usuarioNombre: row.usuarioNombre,
                            tareaTitulo: row.tareaTitulo,
                            progresoActual: row.progresoActual,
                            horasReales: row.horasReales,
                            esfuerzo: row.esfuerzo
                        });
                    }

                    const proyectosList = Array.from(proyectosMap.values());

                    // Solo enviamos si realmente hubo algún avance
                    if (proyectosList.length > 0) {
                        const fechaHoy = new Date().toLocaleDateString('es-NI', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        });

                        await this.notificationService.sendDailyTeamSummaryEmail(
                            jefe.correo,
                            {
                                jefeNombre: jefe.nombre || jefe.nombreCompleto || 'Líder',
                                proyectos: proyectosList,
                                enlace: process.env.FRONTEND_URL || 'https://www.rhclaroni.com',
                                fechaHoy: fechaHoy,
                                jefeCarnet: jefe.carnet
                            }
                        );
                        this.logger.log(`📧 Resumen diario enviado a jefe: ${jefe.correo}`);
                    }
                } catch (err) {
                    this.logger.error(`Error enviando resumen diario a ${jefe.correo}:`, err);
                }
            }
            this.logger.log('Fin de envío de resumen diario.');
        } catch (error) {
            this.logger.error('Error general en cron de resumen diario:', error);
        }
    }
}
