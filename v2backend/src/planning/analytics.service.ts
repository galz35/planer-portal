import { Injectable, BadRequestException } from '@nestjs/common';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { ejecutarQuery, Int, NVarChar } from '../db/base.repo';
import * as accesoRepo from '../acceso/acceso.repo';

@Injectable()
export class AnalyticsService {
  constructor(private readonly visibilidadService: VisibilidadService) {}

  async getDashboardStats(managerId: number, month: number, year: number) {
    console.log(
      `[Analytics] Solicitando dashboard para ManagerID: ${managerId} (Mes: ${month}, Año: ${year}) - vFixed_NombreColumn`,
    );
    try {
      // 1. Get user's carnet first, then get visible employees
      const carnet = await accesoRepo.obtenerCarnetDeUsuario(managerId);
      console.log(`[Analytics] Carnet encontrado: ${carnet}`);

      if (!carnet) {
        console.warn(
          `[Analytics] No se encontró carnet para el usuario ${managerId}`,
        );
        return this.getEmptyStats();
      }

      const visibleUsers =
        await this.visibilidadService.obtenerEmpleadosVisibles(carnet);
      console.log(
        `[Analytics] Usuarios visibles brutos: ${visibleUsers.length}`,
      );

      const visibleUserIds = visibleUsers
        .map((u: any) => u.idUsuario)
        .filter(Boolean);
      console.log(
        `[Analytics] IDs de usuarios visibles: ${visibleUserIds.length}`,
      );

      if (visibleUserIds.length === 0) {
        console.warn(
          `[Analytics] No se encontraron IDs de usuario para los colaboradores visibles.`,
        );
        return this.getEmptyStats();
      }

      const idsStr = visibleUserIds.join(',');
      console.log(
        `[Analytics] Consultando proyectos para ${visibleUserIds.length} miembros del equipo...`,
      );

      // 2. Fetch projects logic: All Projects (aligned with ProyectosPage) + "Tareas Sin Proyecto"
      const queryRaw = `
                -- First part: All formal projects
                SELECT 
                    p.idProyecto,
                    p.nombre,
                    p.estado,
                    (SELECT ISNULL(AVG(CAST(st.porcentaje AS FLOAT)), 0) FROM p_Tareas st WHERE st.idProyecto = p.idProyecto AND st.estado NOT IN ('Eliminada', 'Archivada')) as globalProgress,
                    ISNULL(p.subgerencia, 'General') as subgerencia,
                    ISNULL(p.area, '') as area,
                    ISNULL(p.gerencia, '') as gerencia,
                    p.fechaInicio,
                    p.fechaFin,
                    -- Count only tasks assigned to our team
                    COUNT(DISTINCT ta.idTarea) as totalTasks,
                    ISNULL(SUM(CASE WHEN t.estado = 'Hecha' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as hechas,
                    ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as enCurso,
                    ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as pendientes,
                    ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' AND ta.idUsuario IS NOT NULL THEN 1 ELSE 0 END), 0) as bloqueadas,
                    ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND ta.idUsuario IS NOT NULL AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
                FROM p_Proyectos p
                LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
                LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.idUsuario IN (${idsStr})
                GROUP BY p.idProyecto, p.nombre, p.estado, p.subgerencia, p.area, p.gerencia, p.fechaInicio, p.fechaFin

                UNION ALL

                -- Second part: Tasks without project (managed as a pseudo-project)
                SELECT 
                    0 as idProyecto,
                    'Tareas Sin Proyecto' as nombre,
                    'Activo' as estado,
                    0 as globalProgress,
                    'General' as subgerencia,
                    '' as area,
                    '' as gerencia,
                    NULL as fechaInicio,
                    NULL as fechaFin,
                    COUNT(DISTINCT t.idTarea) as totalTasks,
                    ISNULL(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END), 0) as hechas,
                    ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
                    ISNULL(SUM(CASE WHEN t.estado = 'Pendiente' THEN 1 ELSE 0 END), 0) as pendientes,
                    ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,
                    ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) as atrasadas
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                WHERE (t.idProyecto IS NULL OR t.idProyecto = 0)
                  AND ta.idUsuario IN (${idsStr})
                  AND t.estado NOT IN ('Eliminada', 'Archivada')
                HAVING COUNT(t.idTarea) > 0

                ORDER BY nombre
            `;

      const projectsRaw = await ejecutarQuery<any>(queryRaw);
      console.log(
        `[Analytics] Proyectos encontrados (con team stats): ${projectsRaw.length}`,
      );

      // 3. Fetch all tasks for visible users to enable drill-down in frontend
      const allTasksRaw = await ejecutarQuery<{
        idTarea: number;
        idProyecto: number;
        titulo: string;
        estado: string;
        progreso: number;
        prioridad: string;
        fechaInicio: string;
        fechaObjetivo: string;
        asignado: string;
        isDelayed: number;
      }>(`
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
                    CASE WHEN t.estado IN ('Pendiente', 'EnCurso') AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END as isDelayed
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado NOT IN ('Eliminada', 'Archivada')
                ORDER BY t.fechaObjetivo ASC
            `);

      // 4. Calculate global statistics and group tasks by project
      let totalAll = 0,
        hechasAll = 0,
        atrasadasAll = 0,
        bloqueadasAll = 0;
      const projectsStats = projectsRaw.map((p) => {
        const progress =
          p.totalTasks > 0 ? Math.round((p.hechas / p.totalTasks) * 100) : 0;
        const projectTasks = allTasksRaw.filter(
          (t) => t.idProyecto === p.idProyecto,
        );

        // Calculate expected progress based on dates
        let expectedProgress = 0;
        if (p.fechaInicio && p.fechaFin) {
          const start = new Date(p.fechaInicio).getTime();
          const end = new Date(p.fechaFin).getTime();
          const now = Date.now();
          if (now >= end) expectedProgress = 100;
          else if (now <= start) expectedProgress = 0;
          else
            expectedProgress = Math.round(
              ((now - start) / (end - start)) * 100,
            );
        }

        totalAll += p.totalTasks;
        hechasAll += p.hechas;
        atrasadasAll += p.atrasadas;
        bloqueadasAll += p.bloqueadas;

        return {
          id: p.idProyecto,
          nombre: p.nombre,
          estado: p.estado,
          globalProgress: p.globalProgress,
          subgerencia: p.subgerencia,
          area: p.area,
          gerencia: p.gerencia,
          totalTasks: p.totalTasks,
          hechas: p.hechas,
          enCurso: p.enCurso,
          pendientes: p.pendientes,
          bloqueadas: p.bloqueadas,
          atrasadas: p.atrasadas,
          progress,
          expectedProgress,
          deviation: progress - expectedProgress,
          tareas: projectTasks,
        };
      });

      // 4. Group by subgerencia for hierarchy breakdown
      const subgerenciaMap = new Map<
        string,
        {
          pendientes: number;
          enCurso: number;
          hechas: number;
          bloqueadas: number;
          atrasadas: number;
          total: number;
        }
      >();

      projectsRaw.forEach((p) => {
        const key = p.subgerencia || 'General';
        const existing = subgerenciaMap.get(key) || {
          pendientes: 0,
          enCurso: 0,
          hechas: 0,
          bloqueadas: 0,
          atrasadas: 0,
          total: 0,
        };
        existing.pendientes += p.pendientes;
        existing.enCurso += p.enCurso;
        existing.hechas += p.hechas;
        existing.bloqueadas += p.bloqueadas;
        existing.atrasadas += p.atrasadas;
        existing.total += p.totalTasks;
        subgerenciaMap.set(key, existing);
      });

      const hierarchyBreakdown = Array.from(subgerenciaMap.entries()).map(
        ([name, stats]) => ({
          name,
          ...stats,
        }),
      );

      // 5. Get top delays (tasks most overdue)
      const topDelays = await ejecutarQuery<{
        idTarea: number;
        titulo: string;
        fechaObjetivo: string;
        diasRetraso: number;
        asignado: string;
      }>(`
                SELECT TOP 10
                    t.idTarea,
                    t.nombre as titulo,
                    t.fechaObjetivo,
                    DATEDIFF(DAY, t.fechaObjetivo, GETDATE()) as diasRetraso,
                    u.nombre as asignado
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado IN ('Pendiente', 'EnCurso')
                  AND CAST(t.fechaObjetivo AS DATE) < CAST(GETDATE() AS DATE)
                ORDER BY diasRetraso DESC
            `);

      // 6. Identify users without active tasks (Users Without Plan)
      // Get all users who have at least one active task (Pendiente/EnCurso)
      const usersWithActiveTasks = await ejecutarQuery<{ idUsuario: number }>(`
                SELECT DISTINCT ta.idUsuario
                FROM p_TareaAsignados ta
                INNER JOIN p_Tareas t ON ta.idTarea = t.idTarea
                WHERE ta.idUsuario IN (${idsStr})
                  AND t.estado IN ('Pendiente', 'EnCurso')
            `);

      const activeUserIds = new Set(
        usersWithActiveTasks.map((u) => u.idUsuario),
      );
      const usersWithoutPlan = visibleUsers
        .filter((u: any) => !activeUserIds.has(u.idUsuario))
        .map((u: any) => ({
          id: u.idUsuario,
          nombre: u.nombre || u.nombreCompleto,
          cargo: u.cargo || 'Sin cargo',
          avatar: u.avatar || null,
        }));

      // 7. Get blockers detail
      const blockersDetail = await ejecutarQuery<{
        id: number;
        tarea: string;
        proyecto: string;
        usuario: string;
        motivo: string;
        dias: number;
      }>(`
                SELECT TOP 20
                    b.idBloqueo as id,
                    ISNULL(t.nombre, 'Sin tarea') as tarea,
                    ISNULL(p.nombre, 'General') as proyecto,
                    u.nombre as usuario,
                    b.motivo,
                    DATEDIFF(DAY, b.fechaCreacion, GETDATE()) as dias
                FROM p_Bloqueos b
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
                LEFT JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
                WHERE b.idUsuario IN (${idsStr})
                  AND b.estado = 'Activo'
                ORDER BY b.fechaCreacion DESC
            `);

      const globalCompletion =
        totalAll > 0 ? Math.round((hechasAll / totalAll) * 100) : 0;

      return {
        statusDistribution: [
          {
            name: 'Pendientes',
            value: totalAll - hechasAll - atrasadasAll,
            fill: '#94a3b8',
          },
          { name: 'Atrasadas', value: atrasadasAll, fill: '#f43f5e' },
          { name: 'Hechas', value: hechasAll, fill: '#10b981' },
        ],
        globalCompletion,
        totalActivePlans: projectsStats.length,
        usersWithoutPlanCount: usersWithoutPlan.length,
        usersWithoutPlan: usersWithoutPlan,
        hierarchyBreakdown,
        topDelays,
        projectsStats,
        blockersDetail,
        visibleTeamCount: visibleUsers.length,
        bottlenecks: topDelays.slice(0, 5),
        tasksDetails: allTasksRaw || [],
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return this.getEmptyStats();
    }
  }

  private ensureMonthYear(mes: number, anio: number) {
    if (!mes || Number.isNaN(mes) || mes < 1 || mes > 12) {
      throw new BadRequestException('mes inválido (1-12).');
    }
    if (!anio || Number.isNaN(anio) || anio < 2000 || anio > 2100) {
      throw new BadRequestException('anio inválido (2000-2100).');
    }
  }

  async getGlobalCompliance(month: number, year: number) {
    this.ensureMonthYear(month, year);

    const sql = `
            SELECT 
                estado,
                COUNT(*) as count,
                AVG(CAST(COALESCE(objetivos, '') <> '' AS INT)) * 100 as hasGoalsPercent
            FROM p_PlanesTrabajo
            WHERE mes = @month AND anio = @year
            GROUP BY estado
        `;
    const items = await ejecutarQuery(sql, {
      month: { valor: month, tipo: Int },
      year: { valor: year, tipo: Int },
    });

    // Calculate global % (simplified: count of confirmed vs total)
    const total = items.reduce((acc: number, curr: any) => acc + curr.count, 0);
    const confirmed =
      items.find(
        (i: any) => i.estado === 'Confirmado' || i.estado === 'Cerrado',
      )?.count || 0;
    const compliance = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    return {
      month,
      year,
      compliance,
      totalPlans: total,
      breakdown: items,
    };
  }

  async getAreaPerformance(month: number, year: number) {
    this.ensureMonthYear(month, year);

    const sql = `
            SELECT 
                p.gerencia,
                p.area,
                AVG(CAST(t.porcentaje AS FLOAT)) as avgProgress,
                COUNT(t.idTarea) as totalTasks,
                SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as doneTasks
            FROM p_Proyectos p
            JOIN p_Tareas t ON p.idProyecto = t.idProyecto
            WHERE t.activo = 1
              AND (t.fechaObjetivo IS NULL OR (MONTH(t.fechaObjetivo) = @month AND YEAR(t.fechaObjetivo) = @year))
            GROUP BY p.gerencia, p.area
            ORDER BY avgProgress DESC
        `;
    return await ejecutarQuery(sql, {
      month: { valor: month, tipo: Int },
      year: { valor: year, tipo: Int },
    });
  }

  async getBottlenecks() {
    // Identify users with most delayed tasks
    const delayedTasksSql = `
            SELECT TOP 10
                u.nombre,
                ta.carnet,
                COUNT(t.idTarea) as delayedCount,
                MAX(DATEDIFF(DAY, t.fechaObjetivo, GETDATE())) as maxDelayDays
            FROM p_Tareas t
            JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
            JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
            WHERE t.estado IN ('Pendiente', 'EnCurso')
              AND t.fechaObjetivo < GETDATE()
              AND t.activo = 1
            GROUP BY u.nombre, ta.carnet
            ORDER BY delayedCount DESC
        `;

    const blockersSql = `
            SELECT TOP 10
                u.nombre,
                COUNT(b.idBloqueo) as activeBlockers
            FROM p_Bloqueos b
            JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
            WHERE b.estado = 'Activo'
            GROUP BY u.nombre
            ORDER BY activeBlockers DESC
        `;

    const delayed = await ejecutarQuery(delayedTasksSql);
    const blockers = await ejecutarQuery(blockersSql);

    return {
      topDelayedUsers: delayed,
      topBlockers: blockers,
    };
  }

  private getEmptyStats() {
    return {
      statusDistribution: [],
      globalCompletion: 0,
      totalActivePlans: 0,
      usersWithoutPlanCount: 0,
      usersWithoutPlan: [],
      hierarchyBreakdown: [],
      topDelays: [],
      projectsStats: [],
      blockersDetail: [],
      bottlenecks: [],
      tasksDetails: [],
    };
  }
}
