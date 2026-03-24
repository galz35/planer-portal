/**
 * ¿QUÉ ES?: Servicio principal de Clarity. (Updated Sync 2026-02-18)
 * ¿PARA QUÉ SE USA?: Contiene todas las funciones que realizan peticiones HTTP específicas para 
 * tareas, proyectos, el equipo, administración y reportes.
 * ¿QUÉ SE ESPERA?: Que centralice la lógica de comunicación con el backend, devolviendo datos tipados
 * y manejando los parámetros necesarios para cada consulta.
 */

import { api } from './api';
import type { ApiResponse } from '../types/api';
import type {
    Checkin, Tarea, Bloqueo, CheckinUpsertDto, BloqueoCrearDto, TareaCrearRapidaDto, TareaRegistrarAvanceDto,
    Usuario, Proyecto, TareaAvanceMensual
} from '../types/modelos';
import type { EquipoHoyResponse } from '../types/equipo';

/**
 * Agrupa todas las funciones relacionadas con la funcionalidad de "Clarity".
 */

export const clarityService = {
    // === MÓDULO: MI DÍA & AGENDA ===
    // Estas funciones manejan lo que el usuario ve al inicio de su jornada.
    getMiDia: async (fecha: string, startDate?: string, endDate?: string) => {
        const { data: response } = await api.get<ApiResponse<{
            checkinHoy: Checkin | null;
            tareasSugeridas: Tarea[]; // Unified list from backend
            backlog: Tarea[];        // New backlog list
            bloqueosActivos?: Bloqueo[];
            bloqueosMeCulpan?: Bloqueo[];
        }>>(`/mi-dia`, { params: { fecha, startDate, endDate } });
        return response.data;
    },

    getMemberAgenda: async (userId: string, fecha: string, startDate?: string, endDate?: string) => {
        const { data: response } = await api.get<ApiResponse<{
            checkinHoy: Checkin | null;
            tareasSugeridas: Tarea[];
            backlog: Tarea[];
            bloqueosActivos?: Bloqueo[];
            bloqueosMeCulpan?: Bloqueo[];
        }>>(`/agenda/${userId}`, { params: { fecha, startDate, endDate } });
        return response.data;
    },

    postCheckin: async (dto: CheckinUpsertDto) => {
        const { data: response } = await api.post<ApiResponse<Checkin>>('/checkins', dto);
        return response.data;
    },

    // === MÓDULO: TAREAS ===
    // Funciones para crear, actualizar, reordenar y gestionar el ciclo de vida de las tareas.
    postTareaRapida: async (dto: TareaCrearRapidaDto) => {
        const { data: response } = await api.post<ApiResponse<Tarea>>('/tareas/rapida', dto);
        return response.data;
    },

    postTarea: async (dto: TareaCrearRapidaDto & { comportamiento?: 'SIMPLE' | 'RECURRENTE' | 'LARGA' }) => {
        const { data: response } = await api.post<ApiResponse<Tarea>>('/tareas/rapida', dto);
        return response.data;
    },

    syncParticipantes: async (idTarea: number, coasignados: number[]) => {
        const { data: response } = await api.post<ApiResponse<Tarea>>(`/tareas/${idTarea}/participantes`, { coasignados });
        return response.data;
    },

    // ====== RECORDATORIOS ======
    crearRecordatorio: async (idTarea: number, fechaHora: string, nota?: string) => {
        const { data: response } = await api.post<ApiResponse<any>>(`/tareas/${idTarea}/recordatorio`, { fechaHora, nota });
        return response.data;
    },

    eliminarRecordatorio: async (idRecordatorio: number) => {
        const { data: response } = await api.delete<ApiResponse<any>>(`/recordatorios/${idRecordatorio}`);
        return response.data;
    },

    obtenerRecordatorios: async () => {
        const { data: response } = await api.get<ApiResponse<any[]>>('/recordatorios');
        return response.data;
    },

    getMisTareas: async (filters?: { estado?: string, idProyecto?: number, startDate?: string, endDate?: string, query?: string }) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>('/tareas/mias', { params: filters });

        // NORMALIZACIÓN
        if (response.data) {
            response.data = response.data.map(t => {
                if ((t as any).porcentaje !== undefined && t.progreso === undefined) {
                    t.progreso = (t as any).porcentaje;
                }
                return t;
            });
        }

        return response.data;
    },

    getTareasHistorico: async (carnet: string, dias: number = 30) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>(`/tareas/historico/${carnet}`, { params: { dias } });
        return response.data;
    },

    getTaskById: async (id: number) => {
        const { data: response } = await api.get<ApiResponse<Tarea>>(`/tareas/${id}`);
        return response.data;
    },

    getTareasUsuario: async (idUsuario: number) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>(`/equipo/miembro/${idUsuario}/tareas`);
        return response.data;
    },

    postProyecto: async (nombre: string, idNodoDuenio?: number, descripcion?: string, tipo?: string) => {
        const { data: response } = await api.post<ApiResponse>('/proyectos', { nombre, idNodoDuenio, descripcion, tipo });
        return response.data;
    },

    toggleBloqueoProyecto: async (idProyecto: number, enllavado: boolean) => {
        const { data: response } = await api.patch<ApiResponse>(`/proyectos/${idProyecto}/enllavar`, { enllavado });
        return response.data;
    },


    actualizarTarea: async (idTarea: number, dto: Partial<Pick<Tarea, 'titulo' | 'descripcion' | 'estado' | 'prioridad' | 'progreso' | 'tipo' | 'esfuerzo' | 'fechaObjetivo' | 'fechaInicioPlanificada' | 'linkEvidencia' | 'idTareaPadre' | 'idResponsable'>> & { motivo?: string }) => {
        const { data: response } = await api.patch<ApiResponse<Tarea>>(`/tareas/${idTarea}`, dto);
        return response.data;
    },

    moverTarea: async (idTarea: number, idProyectoDestino: number, moverSubtareas: boolean = true) => {
        const { data: response } = await api.post<ApiResponse<any>>(`/tareas/${idTarea}/mover`, { idProyectoDestino, moverSubtareas });
        return response.data;
    },

    updateTareaOrden: async (idTarea: number, orden: number) => {
        const { data: response } = await api.patch<ApiResponse>(`/tareas/${idTarea}/orden`, { orden });
        return response.data;
    },

    reorderTareas: async (ids: number[]) => {
        const { data: response } = await api.patch<ApiResponse>('/tareas/reordenar', { ids });
        return response.data;
    },


    solicitarCambio: async (idTarea: number, campo: string, valorNuevo: string, motivo: string) => {
        const { data: response } = await api.post<ApiResponse<any>>('/tareas/solicitud-cambio', { idTarea, campo, valorNuevo, motivo });
        return response.data;
    },

    toggleBloqueoTarea: async (idTarea: number, enllavado: boolean) => {
        const { data: response } = await api.patch<ApiResponse<Tarea>>(`/tareas/${idTarea}/lock`, { enllavado });
        return response.data;
    },

    descartarTarea: async (idTarea: number) => {
        const { data: response } = await api.post<ApiResponse>(`/tareas/${idTarea}/descartar`, {});
        return response.data;
    },

    postAvance: async (idTarea: number, dto: TareaRegistrarAvanceDto) => {
        const { data: response } = await api.post<ApiResponse>(`/tareas/${idTarea}/avance`, dto);
        return response.data;
    },

    deleteAvance: async (idLog: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/tareas/avance/${idLog}`);
        return response.data;
    },

    // ==========================================
    // AVANCE MENSUAL (Tareas C - Avance Mensual)
    // ==========================================

    getAvancesMensuales: async (idTarea: number) => {
        const { data: response } = await api.get<ApiResponse<{ historial: TareaAvanceMensual[], acumulado: number }>>(`/tareas/${idTarea}/avance-mensual`);
        return response.data;
    },

    postAvanceMensual: async (idTarea: number, dto: { anio: number, mes: number, porcentajeMes: number, comentario?: string }) => {
        const { data: response } = await api.post<ApiResponse<{ historial: TareaAvanceMensual[], acumulado: number }>>(`/tareas/${idTarea}/avance-mensual`, dto);
        return response.data;
    },

    deleteTarea: async (idTarea: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/tareas/${idTarea}`);
        return response.data;
    },

    revalidarTarea: async (idTarea: number, accion: 'Sigue' | 'HechaPorOtro' | 'NoAplica' | 'Reasignar', idUsuarioOtro?: number) => {
        const { data } = await api.post<ApiResponse>(`/tareas/${idTarea}/revalidar`, { accion, idUsuarioOtro });
        return data.data;
    },

    // ==========================================
    // RECURRENCIA (Tareas A - Agenda Diaria)
    // ==========================================

    crearRecurrencia: async (idTarea: number, dto: {
        tipoRecurrencia: 'SEMANAL' | 'MENSUAL';
        diasSemana?: string;
        diaMes?: number;
        fechaInicioVigencia: string;
        fechaFinVigencia?: string;
    }) => {
        const { data: response } = await api.post<ApiResponse>(`/tareas/${idTarea}/recurrencia`, dto);
        return response.data;
    },

    obtenerRecurrencia: async (idTarea: number) => {
        const { data: response } = await api.get<ApiResponse>(`/tareas/${idTarea}/recurrencia`);
        return response.data;
    },

    marcarInstancia: async (idTarea: number, dto: {
        fechaProgramada: string;
        estadoInstancia: 'HECHA' | 'OMITIDA' | 'REPROGRAMADA';
        comentario?: string;
        fechaReprogramada?: string;
    }) => {
        const { data: response } = await api.post<ApiResponse>(`/tareas/${idTarea}/instancia`, dto);
        return response.data;
    },

    obtenerInstancias: async (idTarea: number, limit: number = 30) => {
        const { data: response } = await api.get<ApiResponse>(`/tareas/${idTarea}/instancias`, { params: { limit } });
        return response.data;
    },

    obtenerAgendaRecurrente: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse>(`/agenda-recurrente`, { params: { fecha } });
        return response.data;
    },

    // === MÓDULO: BLOQUEOS ===
    // Maneja los impedimentos que detienen el progreso de las tareas.
    postBloqueo: async (dto: BloqueoCrearDto) => {
        const { data: response } = await api.post<ApiResponse<Bloqueo>>('/bloqueos', dto);
        return response.data;
    },

    resolverBloqueo: async (idBloqueo: number) => {
        const { data: response } = await api.patch<ApiResponse>(`/bloqueos/${idBloqueo}/resolver`, {});
        return response.data;
    },

    // === MÓDULO: JEFATURA & EQUIPO ===
    // Funciones exclusivas para visualización del equipo por parte de gerentes o jefes.
    getEquipoHoy: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse<EquipoHoyResponse>>('/equipo/hoy', { params: { fecha } });
        return response.data;
    },

    getEquipoInform: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse<EquipoHoyResponse>>('/equipo/inform', { params: { fecha } });
        return response.data;
    },

    getMyTeam: async () => {
        const { data: response } = await api.get<ApiResponse<any[]>>('/planning/team');
        return response.data || [];
    },

    getEquipoBloqueos: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse<Bloqueo[]>>('/equipo/bloqueos', { params: { fecha } });
        return response.data;
    },

    getEquipoBacklog: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>('/equipo/backlog', { params: { fecha } });
        return response.data;
    },

    getEquipoActividad: async (page: number = 1, limit: number = 50, query?: string) => {
        try {
            const { data: response } = await api.get<any>('/equipo/actividad', { params: { page, limit, query } });
            return response;
        } catch (e) {
            console.error('Error getEquipoActividad', e);
            throw e;
        }
    },

    getAuditLogDetalle: async (id: number) => {
        try {
            const { data } = await api.get<any>(`/equipo/actividad/${id}`);
            return data;
        } catch (e) {
            console.error('Error fetching log detail', e);
            throw e;
        }
    },

    getEquipoMiembroTareas: async (idUsuario: number) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>(`/equipo/miembro/${idUsuario}/tareas`);
        return response.data || [];
    },

    getBloqueosMiembro: async (idUsuario: number) => {
        const { data: response } = await api.get<ApiResponse<any[]>>(`/equipo/miembro/${idUsuario}/bloqueos`);
        return response.data || [];
    },

    getEquipoMiembro: async (idUsuario: number) => {
        const { data: response } = await api.get<ApiResponse<Usuario>>(`/equipo/miembro/${idUsuario}`);
        return response.data;
    },

    // === MÓDULO: PROYECTOS ===
    // Gestión de proyectos de alto nivel.
    getProyectos: async (filters?: any) => {
        const cleanFilters = filters ? Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        ) : {};
        console.log('[ClarityService] getProyectos params:', cleanFilters);
        const { data: response } = await api.get<ApiResponse<{ items: Proyecto[], total: number, page: number, lastPage: number }>>('/proyectos', { params: cleanFilters });

        // NORMALIZACIÓN: Asegurar que porcentaje -> progreso para consistencia UI
        if (response.data?.items) {
            response.data.items = response.data.items.map(p => {
                if ((p as any).porcentaje !== undefined && p.progreso === undefined) {
                    p.progreso = (p as any).porcentaje;
                }
                return p;
            });
        }

        return response.data;
    },

    getProyecto: async (id: number) => {
        const { data: response } = await api.get<ApiResponse<Proyecto>>(`/proyectos/${id}`);
        const p = response.data;
        if (p && (p as any).porcentaje !== undefined && p.progreso === undefined) {
            p.progreso = (p as any).porcentaje;
        }
        return p;
    },

    updateProyecto: async (id: number, dto: { nombre?: string, descripcion?: string, idNodoDuenio?: number, fechaInicio?: string, fechaFin?: string, tipo?: string }) => {
        const { data: response } = await api.patch<ApiResponse>(`/proyectos/${id}`, dto);
        return response.data;
    },

    deleteProyecto: async (id: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/proyectos/${id}`);
        return response.data;
    },

    cloneProyecto: async (idProyecto: number, nombre: string) => {
        const { data: response } = await api.post<ApiResponse<Proyecto>>(`/proyectos/${idProyecto}/clonar`, { nombre });
        return response.data;
    },

    cloneTarea: async (idTarea: number) => {
        const { data: response } = await api.post<ApiResponse>(`/planning/tasks/${idTarea}/clone`);
        return response.data;
    },

    confirmarProyecto: async (idProyecto: number) => {
        const { data: response } = await api.post<ApiResponse<any>>(`/proyectos/${idProyecto}/confirmar`);
        return response.data;
    },

    getProyectosTareas: async (idProyecto: number) => {
        const { data: response } = await api.get<ApiResponse<Tarea[]>>(`/proyectos/${idProyecto}/tareas`);

        // NORMALIZACIÓN
        if (response.data) {
            response.data = response.data.map(t => {
                if ((t as any).porcentaje !== undefined && t.progreso === undefined) {
                    t.progreso = (t as any).porcentaje;
                }
                return t;
            });
        }

        return response.data;
    },

    getProyectoHistorial: async (idProyecto: number, page: number = 1, limit: number = 50) => {
        const { data: response } = await api.get<ApiResponse<any>>(`/proyectos/${idProyecto}/historial`, { params: { page, limit } });
        return response.data;
    },

    // Config
    // Fetch user agenda visibility preferences
    getConfig: async () => {
        const { data: response } = await api.get<ApiResponse<{ agendaShowGestion: boolean, agendaShowRapida: boolean, menuPersonalizado?: string }>>('/auth/config');
        return response.data;
    },

    setConfig: async (dto: { agendaShowGestion?: boolean, agendaShowRapida?: boolean, menuPersonalizado?: string }) => {
        const { data: response } = await api.post<ApiResponse>('/auth/config', dto);
        return response.data;
    },

    // ==========================================
    // NOTAS (CRUD)
    // ==========================================
    getNotes: async () => {
        const { data: response } = await api.get<ApiResponse>('/notas');
        return response.data;
    },
    createNote: async (dto: { title: string, content: string }) => {
        const { data: response } = await api.post<ApiResponse>('/notas', dto);
        return response.data;
    },
    updateNote: async (id: string | number, dto: { title: string, content: string }) => {
        const { data: response } = await api.patch<ApiResponse>(`/notas/${id}`, dto);
        return response.data;
    },
    deleteNote: async (id: string | number) => {
        const { data: response } = await api.delete<ApiResponse>(`/notas/${id}`);
        return response.data;
    },



    getLogs: async (page: number = 1, limit: number = 100) => {
        const { data: response } = await api.get<ApiResponse<{
            items: { idLog: number, nivel: string, origen: string, mensaje: string, fecha: string }[],
            total: number,
            page: number,
            lastPage: number
        }>>('/admin/logs', { params: { page, limit } });
        return response.data;
    },

    getAuditLogs: async (params: { page?: number, limit?: number, idUsuario?: number, accion?: string, recurso?: string, query?: string, entidad?: string, entidadId?: string }) => {
        const { data: response } = await api.get<ApiResponse<{
            items: { idAuditLog: number, accion: string, entidad: string, idEntidad: number, datosAnteriores: string | null, datosNuevos: string | null, idUsuario: number, fecha: string }[],
            total: number,
            page: number,
            totalPages: number
        }>>('/admin/audit-logs', { params });
        return response.data;
    },

    getAuditLogsByTask: async (idTarea: number) => {
        const { data: response } = await api.get<ApiResponse<any[]>>(`/audit-logs/task/${idTarea}`);
        return response.data;
    },

    // Admin Users
    getUsuarios: async (page: number = 1, limit: number = 50) => {
        const { data: response } = await api.get<ApiResponse<{
            datos?: Usuario[],
            items?: Usuario[],
            total: number,
            pagina?: number,
            page?: number,
            totalPaginas?: number,
            lastPage?: number
        }>>('/admin/usuarios', { params: { page, limit } });
        const raw = response.data;
        // Normalizar campos para compatibilidad
        return {
            items: raw?.items || raw?.datos || [],
            total: raw?.total || 0,
            page: raw?.page || raw?.pagina || 1,
            lastPage: raw?.lastPage || raw?.totalPaginas || 1
        };
    },
    getAdminStats: async () => {
        const { data: response } = await api.get<ApiResponse>('/admin/stats');
        return response.data;
    },
    crearUsuario: async (dto: any) => {
        const { data: response } = await api.post<ApiResponse>('/admin/usuarios', dto);
        return response.data;
    },
    updateUsuario: async (id: number, dto: any) => {
        const { data: response } = await api.patch<ApiResponse>(`/admin/usuarios/${id}`, dto);
        return response.data;
    },
    deleteUsuario: async (id: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/admin/usuarios/${id}`);
        return response.data;
    },
    removerUsuarioNodo: async (idUsuario: number, idNodo: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/admin/usuarios-organizacion/${idUsuario}/${idNodo}`);
        return response.data;
    },
    async getVisibilidadEfectiva(idUsuario: number) {
        const { data: response } = await api.get<ApiResponse>(`/admin/usuarios/${idUsuario}/visibilidad-efectiva`);
        return response.data;
    },

    // === DASHBOARD ALERTS ===
    getDashboardAlerts: async () => {
        const { data: response } = await api.get<ApiResponse<{ overdue: any[], today: any[] }>>('/planning/dashboard/alerts');
        return response.data;
    },
    updateUsuarioRol: async (idUsuario: number, rol: string, idRol?: number) => {
        const { data: response } = await api.patch<ApiResponse>(`/admin/usuarios/${idUsuario}/rol`, { rol, idRol });
        return response.data;
    },

    resetPassword: async (correo: string, nuevaPassword?: string) => {
        const { data: response } = await api.post<ApiResponse>(`/admin/empleados/${correo}/reset-password`, { nuevaPassword });
        return response.data;
    },

    importEmpleados: async (empleados: any[]) => {
        const { data: response } = await api.post<ApiResponse>('/admin/import/empleados', { empleados });
        return response.data;
    },

    updateRoleMenu: async (idRol: number, menu: any) => {
        const { data: response } = await api.post<ApiResponse>(`/admin/roles/${idRol}/menu`, { menu });
        return response.data;
    },

    updateCustomMenu: async (idUsuario: number, menu: any) => {
        const { data: response } = await api.post<ApiResponse>(`/admin/usuarios/${idUsuario}/menu`, { menu });
        return response.data;
    },

    // Admin Roles
    getRoles: async () => {
        const { data: response } = await api.get<ApiResponse<{ idRol: number, nombre: string, descripcion: string, esSistema: boolean, reglas: string | object[], defaultMenu?: string }[]>>('/admin/roles');
        return response.data;
    },
    createRol: async (dto: { nombre: string, descripcion?: string, reglas?: object[] }) => {
        const { data: response } = await api.post<ApiResponse>('/admin/roles', dto);
        return response.data;
    },
    updateRol: async (id: number, dto: { nombre?: string, descripcion?: string, reglas?: object[] }) => {
        const { data: response } = await api.patch<ApiResponse>(`/admin/roles/${id}`, dto);
        return response.data;
    },
    deleteRol: async (id: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/admin/roles/${id}`);
        return response.data;
    },



    // === MÓDULO: REPORTES ===
    // Obtención de métricas, productividad y descarga de archivos Excel.
    getGerenciaResumen: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse>('/gerencia/resumen', { params: { fecha } });
        return response.data;
    },
    getAgendaCompliance: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse>('/reports/agenda-compliance', { params: { fecha } });
        return response.data;
    },
    getReporteProductividad: async (month?: number, year?: number, idProyecto?: number) => {
        const { data: response } = await api.get<ApiResponse<{ date: string, count: number }[]>>('/reportes/productividad', { params: { month, year, idProyecto } });
        return response.data;
    },

    getBloqueosTrend: async (month?: number, year?: number, idProyecto?: number) => {
        const { data: response } = await api.get<ApiResponse<{ date: string, count: number }[]>>('/reportes/bloqueos-trend', { params: { month, year, idProyecto } });
        return response.data;
    },

    getEquipoPerformance: async (month?: number, year?: number, idProyecto?: number) => {
        const { data: response } = await api.get<ApiResponse<{
            nombre: string,
            total: number,
            hechas: number,
            atrasadas: number,
            enCurso: number,
            porcentaje: number
        }[]>>('/reportes/equipo-performance', { params: { month, year, idProyecto } });
        return response.data;
    },

    exportarReporte: async (tipo: string, month?: number, year?: number, idProyecto?: number) => {
        const response = await api.get('/reportes/exportar', {
            params: { tipo, month, year, idProyecto },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Reporte-${tipo}-${new Date().toISOString().split('T')[0]}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    getWorkload: async (startDate?: string, endDate?: string) => {
        const { data: response } = await api.get<ApiResponse<{ users: Usuario[], tasks: Tarea[], agenda: { idTarea: number, fecha: string, usuarioCarnet: string }[] }>>('/planning/workload', { params: { startDate, endDate } });
        return response.data;
    },

    // Admin Organigrama
    getOrganigrama: async () => {
        const { data: response } = await api.get<ApiResponse>('/admin/organigrama');
        return response.data;
    },
    createNodo: async (dto: { nombre: string, tipo: string, idPadre?: number }) => {
        const { data: response } = await api.post<ApiResponse>('/admin/nodos', dto);
        return response.data;
    },
    asignarUsuarioNodo: async (dto: { idUsuario: number, idNodo: number, rol: string }) => {
        const { data: response } = await api.post<ApiResponse>('/admin/usuarios-organizacion', dto);
        return response.data;
    },

    // --- FOCO DIARIO ---
    getFocoDelDia: async (fecha: string) => {
        const { data: response } = await api.get<ApiResponse<FocoItem[]>>('/foco', { params: { fecha } });
        return response.data || [];
    },

    agregarAlFoco: async (dto: { idTarea: number, fecha: string, esEstrategico?: boolean }) => {
        const { data: response } = await api.post<ApiResponse<FocoItem>>('/foco', dto);
        return response.data;
    },

    actualizarFoco: async (idFoco: number, fecha: string, dto: { esEstrategico?: boolean, completado?: boolean }) => {
        const { data: response } = await api.patch<ApiResponse<FocoItem>>(`/foco/${idFoco}`, dto, { params: { fecha } });
        return response.data;
    },

    quitarDelFoco: async (idFoco: number) => {
        const { data: response } = await api.delete<ApiResponse>(`/foco/${idFoco}`);
        return response.data;
    },

    reordenarFocos: async (fecha: string, ids: number[]) => {
        const { data: response } = await api.post<ApiResponse>('/foco/reordenar', { ids }, { params: { fecha } });
        return response.data;
    },

    getEstadisticasFoco: async (month?: number, year?: number) => {
        const { data: response } = await api.get<ApiResponse<FocoStats>>('/foco/estadisticas', { params: { month, year } });
        return response.data;
    },

    // Planning Analytics
    getDashboardKPIs: async () => {
        const { data: response } = await api.get<ApiResponse<any>>('/kpis/dashboard');
        return response.data;
    },

    getDashboardStats: async (mes: number, anio: number) => {
        const { data: response } = await api.get<ApiResponse<any>>('/planning/stats', { params: { mes, anio } });
        return response.data;
    },

    // --- ACCESO & VISIBILIDAD ---
    getPermisosArea: async (carnetRecibe: string) => {
        const { data: response } = await api.get<ApiResponse>(`/acceso/permiso-area/${carnetRecibe}`);
        return response.data;
    },
    crearPermisoArea: async (dto: { carnetRecibe: string, idOrgRaiz: string | number, alcance?: 'SUBARBOL' | 'SOLO_NODO', tipoAcceso?: 'ALLOW' | 'DENY', nombreArea?: string, tipoNivel?: string }) => {
        const { data: response } = await api.post<ApiResponse>('/acceso/permiso-area', dto);
        return response.data;
    },
    eliminarPermisoArea: async (id: string | number) => {
        const { data: response } = await api.delete<ApiResponse>(`/acceso/permiso-area/${id}`);
        return response.data;
    },

    getPermisosEmpleado: async (carnetRecibe: string) => {
        const { data: response } = await api.get<ApiResponse>(`/acceso/permiso-empleado/${carnetRecibe}`);
        return response.data;
    },
    crearPermisoEmpleado: async (dto: { carnetRecibe: string, carnetObjetivo: string, tipoAcceso?: 'ALLOW' | 'DENY' }) => {
        const { data: response } = await api.post<ApiResponse>('/acceso/permiso-empleado', dto);
        return response.data;
    },
    eliminarPermisoEmpleado: async (id: string | number) => {
        const { data: response } = await api.delete<ApiResponse>(`/acceso/permiso-empleado/${id}`);
        return response.data;
    },

    buscarNodosAcceso: async (q: string) => {
        const { data: response } = await api.get<ApiResponse>('/acceso/organizacion/buscar', { params: { q } });
        return response.data;
    },
    buscarEmpleadosAcceso: async (q: string) => {
        const { data: response } = await api.get<ApiResponse>('/acceso/empleados/buscar', { params: { q, limit: 10 } });
        return response.data;
    },

    getEmpleadosSelector: async () => {
        const { data: response } = await api.get<any>('/acceso/empleados');
        return Array.isArray(response) ? response : (response?.data || []);
    },

    getEmpleadosPorGerencia: async (gerencia: string) => {
        const { data } = await api.get<Usuario[]>(`/acceso/empleados/gerencia/${encodeURIComponent(gerencia)}`);
        return data;
    },

    getEstructuraUsuarios: async () => {
        const { data: response } = await api.get<ApiResponse<{ gerencia: string, subgerencia: string, area: string }[]>>('/organizacion/estructura-usuarios');
        return response.data;
    },

    getCatalogoOrganizacion: async () => {
        const { data: response } = await api.get<ApiResponse<{ id: number, ogerencia: string, subgerencia: string, area: string }[]>>('/organizacion/catalogo');
        return response.data;
    },
    // --- SEGURIDAD ---
    changePassword: async (oldPassword: string, newPassword: string) => {
        const { data: response } = await api.post<ApiResponse>('/auth/change-password', { oldPassword, newPassword });
        return response.data;
    },

    // --- MI ASIGNACIÓN ---
    getMiAsignacion: async (estado?: string) => {
        const params = estado ? { estado } : {};
        const { data: response } = await api.get<ApiResponse<any>>('/planning/mi-asignacion', { params });
        return response.data;
    },

    getSupervision: async () => {
        const { data: response } = await api.get<ApiResponse<{ usuariosSinTarea: any[], proyectosSinTarea: any[] }>>('/planning/supervision');
        return response.data;
    },

};

// Types for Foco
export interface FocoItem {
    idFoco: number;
    idTarea: number;
    tarea: Tarea;
    esEstrategico: boolean;
    diasArrastre: number;
    fechaPrimerFoco: string;
    completado: boolean;
    completadoEnFecha: string | null;
    orden: number;
}

export interface FocoStats {
    total: number;
    completados: number;
    pendientes: number;
    porcentajeCompletado: number;
    estrategicos: {
        total: number;
        completados: number;
        porcentaje: number;
    };
    promedioArrastre: string;
}
