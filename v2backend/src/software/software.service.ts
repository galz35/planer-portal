import { Injectable } from '@nestjs/common';
import { ejecutarQuery, Int } from '../db/base.repo';
import { VisibilidadService } from '../acceso/visibilidad.service';
import * as authRepo from '../auth/auth.repo';

@Injectable()
export class SoftwareService {
  constructor(private visibilidadService: VisibilidadService) {}

  async getDashboardStats(userId: number, month: number, year: number) {
    try {
      // 1. Obtener carnet para visibilidad
      const user = await authRepo.obtenerUsuarioPorId(userId);
      if (!user || !user.carnet) return this.getEmptyStats();

      // 2. Obtener IDs de miembros visibles (incluido el mismo líder)
      const visibleUsers =
        await this.visibilidadService.obtenerEmpleadosVisibles(user.carnet);
      const ids =
        visibleUsers.length > 0
          ? visibleUsers.map((u) => u.idUsuario)
          : [userId];
      const idsStr = ids.join(',');

      // 3. Query consolidada de Proyectos (Idéntica lógica a ProyectosPage)
      // Traemos TODOS los proyectos activos, pero calculamos stats específicos para este equipo
      // 3. Query de Proyectos robusta (Extraemos stats vía subqueries para evitar GROUP BY en campos largos)
      const queryProjects = `
                SELECT 
                    p.idProyecto,
                    p.nombre,
                    p.descripcion,
                    p.estado,
                    p.area,
                    p.subgerencia,
                    p.gerencia,
                    p.fechaInicio,
                    p.fechaFin,
                    p.enllavado,
                    -- Stats Globales (Todo el universo de tareas del proyecto)
                    (SELECT COUNT(*) FROM p_Tareas t2 WHERE t2.idProyecto = p.idProyecto AND t2.estado <> 'Eliminada') as totalTasksGlobal,
                    (SELECT ISNULL(AVG(CAST(t2.porcentaje AS FLOAT)), 0) FROM p_Tareas t2 WHERE t2.idProyecto = p.idProyecto AND t2.estado <> 'Eliminada') as progressGlobal,
                    -- Stats del Equipo (Solo tareas asignadas a miembros de mi equipo)
                    (SELECT COUNT(DISTINCT ta2.idTarea) 
                     FROM p_TareaAsignados ta2 
                     JOIN p_Tareas t3 ON ta2.idTarea = t3.idTarea
                     WHERE t3.idProyecto = p.idProyecto AND ta2.idUsuario IN (${idsStr}) AND t3.estado <> 'Eliminada') as teamTasksCount,
                    (SELECT COUNT(DISTINCT ta2.idTarea) 
                     FROM p_TareaAsignados ta2 
                     JOIN p_Tareas t3 ON ta2.idTarea = t3.idTarea
                     WHERE t3.idProyecto = p.idProyecto AND ta2.idUsuario IN (${idsStr}) AND t3.estado = 'Hecha') as teamTasksDone,
                    (SELECT COUNT(DISTINCT ta2.idTarea) 
                     FROM p_TareaAsignados ta2 
                     JOIN p_Tareas t3 ON ta2.idTarea = t3.idTarea
                     WHERE t3.idProyecto = p.idProyecto AND ta2.idUsuario IN (${idsStr}) AND t3.estado IN ('Pendiente', 'EnCurso') AND t3.fechaObjetivo < DATEADD(day, DATEDIFF(day, 0, GETDATE()), 0)) as teamTasksDelayed
                FROM p_Proyectos p
                WHERE p.estado <> 'Eliminado'
                ORDER BY p.idProyecto DESC
            `;

      const projectsRaw = await ejecutarQuery<any>(queryProjects);

      // 4. Detalle de Tareas para Drilldown
      const queryTasks = `
                SELECT 
                    t.idTarea,
                    ISNULL(t.idProyecto, 0) as idProyecto,
                    t.nombre as titulo,
                    t.estado,
                    ISNULL(t.porcentaje, 0) as progreso,
                    t.prioridad,
                    t.fechaInicioPlanificada as fechaInicio,
                    t.fechaObjetivo,
                    u.nombre as asignado,
                    p.nombre as proyectoNombre,
                    CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND t.fechaObjetivo < DATEADD(day, DATEDIFF(day, 0, GETDATE()), 0) THEN 1 ELSE 0 END as isDelayed
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado NOT IN ('Eliminada', 'Archivada')
                ORDER BY t.fechaObjetivo ASC
            `;
      const tasksRaw = await ejecutarQuery<any>(queryTasks);

      // 5. Get top delays (tasks most overdue)
      const topDelays = await ejecutarQuery<any>(`
                SELECT TOP 10
                    t.idTarea as id,
                    t.nombre as titulo,
                    t.fechaObjetivo,
                    DATEDIFF(DAY, t.fechaObjetivo, GETDATE()) as diasRetraso,
                    u.nombre as asignado,
                    p.nombre as area -- Usamos p.nombre como fallback de area si es necesario
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado IN ('Pendiente', 'EnCurso')
                  AND t.fechaObjetivo < DATEADD(day, DATEDIFF(day, 0, GETDATE()), 0)
                ORDER BY diasRetraso DESC
            `);

      // 6. Get blockers detail
      const blockersDetail = await ejecutarQuery<any>(`
                SELECT TOP 20
                    b.idBloqueo as id,
                    ISNULL(t.nombre, 'Sin tarea') as tarea,
                    ISNULL(p.nombre, 'General') as proyecto,
                    u.nombre as usuario,
                    b.descripcion as motivo,
                    DATEDIFF(DAY, b.fechaCreacion, GETDATE()) as dias
                FROM p_Bloqueos b
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                LEFT JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
                WHERE b.idUsuario IN (${idsStr})
                  AND b.estado = 'Activo'
                ORDER BY b.fechaCreacion DESC
            `);

      // 7. Procesar KPIs globales
      let totalTeamTasks = 0;
      let teamTasksDone = 0;
      let teamTasksDelayed = 0;

      const projectsStats = projectsRaw.map((p) => {
        totalTeamTasks += p.teamTasksCount;
        teamTasksDone += p.teamTasksDone;
        teamTasksDelayed += p.teamTasksDelayed;

        return {
          id: p.idProyecto,
          idProyecto: p.idProyecto,
          nombre: p.nombre,
          estado: p.estado,
          area: p.area,
          subgerencia: p.subgerencia,
          gerencia: p.gerencia,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
          enllavado: p.enllavado,
          globalProgress: Math.round(p.progressGlobal),
          totalTasks: p.teamTasksCount,
          hechas: p.teamTasksDone,
          atrasadas: p.teamTasksDelayed,
          progress:
            p.teamTasksCount > 0
              ? Math.round((p.teamTasksDone / p.teamTasksCount) * 100)
              : 0,
        };
      });

      // 8. Hierarchy Breakdown mejorado
      const hierarchyMap = new Map();
      // Analizar TODAS las tareas para el desglose
      tasksRaw.forEach((t) => {
        const proj = projectsStats.find((ps) => ps.idProyecto === t.idProyecto);
        const key = proj?.subgerencia || 'General';

        const current = hierarchyMap.get(key) || {
          name: key,
          hechas: 0,
          atrasadas: 0,
          enCurso: 0,
          bloqueadas: 0,
          pendientes: 0,
          total: 0,
        };

        current.total++;
        if (t.estado === 'Hecha') current.hechas++;
        else if (t.estado === 'EnCurso') current.enCurso++;
        else if (t.estado === 'Bloqueada') current.bloqueadas++;
        else if (t.estado === 'Pendiente') current.pendientes++;

        if (t.isDelayed) current.atrasadas++;

        hierarchyMap.set(key, current);
      });

      const globalCompletion =
        totalTeamTasks > 0
          ? Math.round((teamTasksDone / totalTeamTasks) * 100)
          : 0;

      return {
        globalCompletion,
        visibleTeamCount: visibleUsers.length,
        totalActiveProjects: projectsStats.filter((p) => p.totalTasks > 0)
          .length,
        topDelays,
        projectsStats,
        blockersDetail,
        hierarchyBreakdown: Array.from(hierarchyMap.values()),
        tasksDetails: tasksRaw,
        period: { month, year },
      };
    } catch (error) {
      console.error('Error in SoftwareService.getDashboardStats:', error);
      return this.getEmptyStats();
    }
  }

  private getEmptyStats() {
    return {
      globalCompletion: 0,
      visibleTeamCount: 0,
      totalActiveProjects: 0,
      criticalDelays: 0,
      projectsStats: [],
      hierarchyBreakdown: [],
      tasksDetails: [],
      period: {},
    };
  }
}
