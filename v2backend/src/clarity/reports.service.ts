import { Injectable } from '@nestjs/common';
import { VisibilidadService } from '../acceso/visibilidad.service';
import { ejecutarQuery, Int, NVarChar } from '../db/base.repo';

// NOTA: ReportsService migrado parcialmente a SQL Server
// Funciones complejas con CTE RECURSIVE deshabilitadas temporalmente

@Injectable()
export class ReportsService {
  constructor(private visibilidadService: VisibilidadService) {}

  async getReporteProductividad(idLider: number, filter?: any) {
    try {
      // 1. Obtener carnet y equipo
      const carnetLider =
        await this.visibilidadService.obtenerCarnetPorId(idLider);
      if (!carnetLider) return { data: [] };

      const equipo =
        await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
      const carnetsStr = equipo.join(',');

      // 2. Query de productividad
      const sql = `
                SELECT 
                    u.nombre,
                    u.carnet,
                    COUNT(t.idTarea) as totalAsignadas,
                    SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as completadas,
                    SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso') AND t.fechaObjetivo < GETDATE() THEN 1 ELSE 0 END) as atrasadas,
                    CASE 
                        WHEN COUNT(t.idTarea) = 0 THEN 0 
                        ELSE (CAST(SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(t.idTarea)) * 100 
                    END as efectividad
                FROM p_Usuarios u
                LEFT JOIN p_TareaAsignados ta ON u.idUsuario = ta.idUsuario
                LEFT JOIN p_Tareas t ON ta.idTarea = t.idTarea
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                  AND t.activo = 1
                  AND t.fechaObjetivo >= DATEADD(MONTH, -1, GETDATE()) -- Último mes por defecto
                GROUP BY u.nombre, u.carnet
                ORDER BY efectividad DESC
            `;

      return await ejecutarQuery(sql, {
        carnets: { valor: carnetsStr, tipo: NVarChar },
      });
    } catch (error) {
      console.error('Error en getReporteProductividad:', error);
      return [];
    }
  }

  async getReporteBloqueosTrend(idLider: number, filter?: any) {
    try {
      const carnetLider =
        await this.visibilidadService.obtenerCarnetPorId(idLider);
      if (!carnetLider) return { data: [] };

      const equipo =
        await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
      const carnetsStr = equipo.join(',');

      // Agrupar bloqueos por semana
      const sql = `
                SELECT 
                    DATEPART(WEEK, b.creadoEn) as semana,
                    COUNT(b.idBloqueo) as total,
                    b.motivo
                FROM p_Bloqueos b
                INNER JOIN p_Usuarios u ON b.idUsuario = u.idUsuario
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                  AND b.creadoEn >= DATEADD(MONTH, -3, GETDATE())
                GROUP BY DATEPART(WEEK, b.creadoEn), b.motivo
                ORDER BY semana ASC
            `;

      return await ejecutarQuery(sql, {
        carnets: { valor: carnetsStr, tipo: NVarChar },
      });
    } catch (e) {
      return [];
    }
  }

  async getReporteEquipoPerformance(idLider: number, filter?: any) {
    return this.getReporteProductividad(idLider, filter); // Reutilizamos lógica por ahora
  }

  // ... equipoBloqueos se mantiene ...

  async equipoBloqueos(idUsuario: number, fecha: string) {
    try {
      const carnetLider =
        await this.visibilidadService.obtenerCarnetPorId(idUsuario);
      if (!carnetLider) return [];

      const equipo =
        await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
      const carnetsStr = equipo.join(',');

      // Consulta filtrada por equipo
      const sql = `
                SELECT TOP 50 b.*, 
                       u1.nombre as origenNombre,
                       u2.nombre as destinoNombre,
                       t.nombre as tareaNombre
                FROM p_Bloqueos b
                LEFT JOIN p_Usuarios u1 ON b.idOrigenUsuario = u1.idUsuario
                LEFT JOIN p_Usuarios u2 ON b.idDestinoUsuario = u2.idUsuario
                LEFT JOIN p_Tareas t ON b.idTarea = t.idTarea
                WHERE u1.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                   OR u2.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                ORDER BY b.creadoEn DESC
            `;
      return await ejecutarQuery(sql, {
        carnets: { valor: carnetsStr, tipo: NVarChar },
      });
    } catch (e) {
      console.error('Error in equipoBloqueos:', e);
      return [];
    }
  }

  async getWorkload(idLider: number) {
    try {
      const carnetLider =
        await this.visibilidadService.obtenerCarnetPorId(idLider);
      if (!carnetLider) return { users: [], tasks: [] };

      const equipo =
        await this.visibilidadService.obtenerCarnetsVisibles(carnetLider);
      const carnetsStr = equipo.join(',');

      // Usuarios y sus cargas
      const users = await ejecutarQuery(
        `
                SELECT u.idUsuario, u.nombre, u.carnet, u.cargo,
                       COUNT(t.idTarea) as activeTasks
                FROM p_Usuarios u
                LEFT JOIN p_TareaAsignados ta ON u.idUsuario = ta.idUsuario
                LEFT JOIN p_Tareas t ON ta.idTarea = t.idTarea AND t.estado IN ('Pendiente','EnCurso') AND t.activo = 1
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                GROUP BY u.idUsuario, u.nombre, u.carnet, u.cargo
            `,
        { carnets: { valor: carnetsStr, tipo: NVarChar } },
      );

      // Tareas detalladas para el Gantt/Workload view
      const tasks = await ejecutarQuery(
        `
                SELECT t.idTarea, t.nombre, t.estado, t.fechaInicioPlanificada, t.fechaObjetivo, ta.idUsuario
                FROM p_Tareas t
                INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
                INNER JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
                WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@carnets, ','))
                  AND t.activo = 1
                  AND t.estado IN ('Pendiente', 'EnCurso')
            `,
        { carnets: { valor: carnetsStr, tipo: NVarChar } },
      );

      return { users, tasks };
    } catch (e) {
      console.error(e);
      return { users: [], tasks: [] };
    }
  }

  async gerenciaResumen(idUsuario: number, fecha: string) {
    try {
      // Un resumen de alto nivel por proyectos
      const sql = `
                SELECT 
                    p.idProyecto,
                    p.nombre,
                    COUNT(t.idTarea) as totalTareas,
                    SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as completadas,
                    AVG(CAST(t.porcentaje AS FLOAT)) as progresoPromedio,
                    (SELECT COUNT(*) FROM p_Bloqueos b WHERE b.idTarea IN (SELECT idTarea FROM p_Tareas WHERE idProyecto = p.idProyecto) AND b.estado = 'Activo') as bloqueosActivos
                FROM p_Proyectos p
                LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto AND t.activo = 1
                GROUP BY p.idProyecto, p.nombre
                ORDER BY progresoPromedio DESC
            `;
      const stats = await ejecutarQuery(sql);
      return {
        fechaReporte: fecha || new Date().toISOString(),
        proyectos: stats,
        totalProyectos: stats.length,
      };
    } catch (e) {
      console.error('Error in gerenciaResumen:', e);
      return { proyectos: [], totalProyectos: 0 };
    }
  }

  async exportToExcel(data: any[], sheetName: string): Promise<Buffer> {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
