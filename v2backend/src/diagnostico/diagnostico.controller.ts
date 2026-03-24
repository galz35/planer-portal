/**
 * Controlador de diagnóstico para verificar conexión a SQL Server
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  DateTime,
} from '../db/base.repo';

@ApiTags('Sistema/Diagnóstico')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('diagnostico')
export class DiagnosticoController {
  /**
   * Ping simple a SQL Server
   * GET /api/diagnostico/ping
   */
  @Get('ping')
  async ping() {
    try {
      const result = await ejecutarQuery<{ ok: number }>('SELECT 1 AS ok');
      return {
        success: true,
        db: 'SQL Server',
        resultado: result[0],
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        db: 'SQL Server',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Conteo de registros en tablas principales
   * GET /api/diagnostico/stats
   */
  @Get('stats')
  async stats() {
    try {
      const tablas = [
        'p_Usuarios',
        'p_Proyectos',
        'p_Tareas',
        'p_Checkins',
        'p_Bloqueos',
      ];
      const stats: Record<string, number> = {};

      for (const tabla of tablas) {
        const result = await ejecutarQuery<{ cnt: number }>(
          `SELECT COUNT(*) as cnt FROM ${tabla}`,
        );
        stats[tabla] = result[0]?.cnt ?? 0;
      }

      return {
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Información de contexto de BD y proceso (Nuevo GPT-5.2 Req)
   * GET /api/diagnostico/contexto
   */
  @Get('contexto')
  async getContexto() {
    try {
      const res = await ejecutarQuery<{
        db: string;
        server: string;
        schema: string;
      }>(`
                SELECT DB_NAME() AS db, @@SERVERNAME AS server, SCHEMA_NAME() AS [schema],
                OBJECT_ID(N'dbo.p_Tareas') AS obj_dbo,
                OBJECT_ID(N'p_Tareas') AS obj_resuelto
            `);
      return {
        context: res[0],
        processId: process.pid,
        uptime: process.uptime(),
        nodeEnv: process.env.NODE_ENV,
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * TEST: Crear tarea usando SP directamente
   * GET /api/diagnostico/test-tarea
   */
  @Get('test-tarea')
  async testTarea() {
    try {
      const res = await ejecutarSP<{ idTarea: number }>('sp_Tarea_Crear', {
        nombre: { valor: 'Test Diagnostico ' + Date.now(), tipo: NVarChar },
        idUsuario: { valor: 1, tipo: Int },
        idProyecto: { valor: null, tipo: Int },
        descripcion: { valor: null, tipo: NVarChar },
        estado: { valor: 'Pendiente', tipo: NVarChar },
        prioridad: { valor: 'Media', tipo: NVarChar },
        esfuerzo: { valor: null, tipo: NVarChar },
        tipo: { valor: 'Administrativa', tipo: NVarChar },
        fechaInicioPlanificada: { valor: null, tipo: DateTime },
        fechaObjetivo: { valor: null, tipo: DateTime },
        porcentaje: { valor: 0, tipo: Int },
        orden: { valor: 0, tipo: Int },
      });

      return {
        success: true,
        message: 'Tarea creada via SP',
        idTarea: res[0].idTarea,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        stack: e.stack?.split('\n').slice(0, 5),
      };
    }
  }

  /**
   * TEST: Query directa con idCreador
   * GET /api/diagnostico/test-idcreador
   */
  @Get('test-idcreador')
  async testIdCreador() {
    try {
      const result = await ejecutarQuery(`
                SELECT TOP 1 idTarea, nombre, idCreador 
                FROM p_Tareas
            `);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
