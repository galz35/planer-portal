import { Injectable } from '@nestjs/common';
import { ejecutarQuery, Int, NVarChar, BigInt } from '../db/base.repo';
import * as bcrypt from 'bcrypt';

interface ImportEmpleadoDto {
  nombre: string;
  correo: string;
  telefono?: string;
  activo?: boolean;
  nodoNombre?: string;
  rolEnNodo?: string;
}

interface ImportNodoDto {
  nombre: string;
  tipo: 'Dirección' | 'Gerencia' | 'Subgerencia' | 'Equipo';
  nombrePadre?: string;
  activo?: boolean;
}

interface ImportResult {
  success: boolean;
  message: string;
  created: number;
  updated: number;
  errors: string[];
  details?: any[];
}

@Injectable()
export class ImportService {
  /**
   * Importar empleados (Migrado a SQL Server)
   */
  async importEmpleados(
    empleados: ImportEmpleadoDto[],
    modo: 'crear' | 'actualizar' | 'upsert',
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      message: '',
      created: 0,
      updated: 0,
      errors: [],
      details: [],
    };

    for (const emp of empleados) {
      try {
        if (!emp.nombre || !emp.correo) {
          result.errors.push(
            `Empleado sin nombre o correo: ${JSON.stringify(emp)}`,
          );
          continue;
        }

        const correo = emp.correo.toLowerCase().trim();

        // Buscar si ya existe
        const existente = await ejecutarQuery<{ idUsuario: number }>(
          `SELECT idUsuario FROM p_Usuarios WHERE correo = @correo`,
          { correo: { valor: correo, tipo: NVarChar } },
        );

        if (existente.length > 0 && modo === 'crear') {
          result.errors.push(`Empleado ya existe (modo=crear): ${correo}`);
          continue;
        }

        if (existente.length === 0 && modo === 'actualizar') {
          result.errors.push(`Empleado no existe (modo=actualizar): ${correo}`);
          continue;
        }

        if (existente.length > 0) {
          // Actualizar
          await ejecutarQuery(
            `
                        UPDATE p_Usuarios SET nombre = @nombre, activo = @activo WHERE correo = @correo
                    `,
            {
              nombre: { valor: emp.nombre.trim(), tipo: NVarChar },
              activo: { valor: emp.activo !== false ? 1 : 0, tipo: Int },
              correo: { valor: correo, tipo: NVarChar },
            },
          );
          result.updated++;
        } else {
          // Crear
          const inserted = await ejecutarQuery<{ idUsuario: number }>(
            `
                        INSERT INTO p_Usuarios (nombre, correo, activo, rolGlobal)
                        OUTPUT INSERTED.idUsuario
                        VALUES (@nombre, @correo, 1, 'Empleado')
                    `,
            {
              nombre: { valor: emp.nombre.trim(), tipo: NVarChar },
              correo: { valor: correo, tipo: NVarChar },
            },
          );

          // Crear credenciales
          const passwordHash = await bcrypt.hash('Claro2024!', 10);
          await ejecutarQuery(
            `
                        INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash) VALUES (@id, @hash)
                    `,
            {
              id: { valor: inserted[0].idUsuario, tipo: Int },
              hash: { valor: passwordHash, tipo: NVarChar },
            },
          );

          result.created++;
        }
      } catch (error: any) {
        result.errors.push(`Error procesando ${emp.correo}: ${error.message}`);
      }
    }

    result.message = `Procesados ${empleados.length} empleados. Creados: ${result.created}, Actualizados: ${result.updated}`;
    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Importar nodos de organización (Migrado a SQL Server)
   */
  async importOrganizacion(
    nodos: ImportNodoDto[],
    modo: 'crear' | 'actualizar' | 'upsert',
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      message: '',
      created: 0,
      updated: 0,
      errors: [],
      details: [],
    };

    for (const nodo of nodos) {
      try {
        if (!nodo.nombre || !nodo.tipo) {
          result.errors.push(`Nodo sin nombre o tipo: ${JSON.stringify(nodo)}`);
          continue;
        }

        const nombre = nodo.nombre.trim();

        const existente = await ejecutarQuery<{ id: number }>(
          `SELECT id FROM p_OrganizacionNodos WHERE nombre = @nombre`,
          { nombre: { valor: nombre, tipo: NVarChar } },
        );

        if (existente.length > 0 && modo === 'crear') {
          result.errors.push(`Nodo ya existe: ${nombre}`);
          continue;
        }

        if (existente.length === 0 && modo === 'actualizar') {
          result.errors.push(`Nodo no existe: ${nombre}`);
          continue;
        }

        if (existente.length > 0) {
          await ejecutarQuery(
            `
                        UPDATE p_OrganizacionNodos SET tipo = @tipo, activo = @activo WHERE nombre = @nombre
                    `,
            {
              tipo: { valor: nodo.tipo, tipo: NVarChar },
              activo: { valor: nodo.activo !== false ? 1 : 0, tipo: Int },
              nombre: { valor: nombre, tipo: NVarChar },
            },
          );
          result.updated++;
        } else {
          await ejecutarQuery(
            `
                        INSERT INTO p_OrganizacionNodos (nombre, tipo, activo) VALUES (@nombre, @tipo, 1)
                    `,
            {
              nombre: { valor: nombre, tipo: NVarChar },
              tipo: { valor: nodo.tipo, tipo: NVarChar },
            },
          );
          result.created++;
        }
      } catch (error: any) {
        result.errors.push(
          `Error procesando nodo ${nodo.nombre}: ${error.message}`,
        );
      }
    }

    result.message = `Procesados ${nodos.length} nodos. Creados: ${result.created}, Actualizados: ${result.updated}`;
    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Importar asignaciones
   */
  async importAsignaciones(
    asignaciones: { correo: string; nodoNombre: string; rol: string }[],
  ): Promise<ImportResult> {
    return {
      success: false,
      message: 'Función en proceso de migración a SQL Server',
      created: 0,
      updated: 0,
      errors: ['Pendiente migración'],
    };
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    const empleados = await ejecutarQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM p_Usuarios`,
    );
    const activos = await ejecutarQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM p_Usuarios WHERE activo = 1`,
    );
    const nodos = await ejecutarQuery<{ total: number }>(
      `SELECT COUNT(*) as total FROM p_OrganizacionNodos`,
    );

    return {
      success: true,
      data: {
        empleados: {
          total: empleados[0]?.total || 0,
          activos: activos[0]?.total || 0,
        },
        nodos: {
          total: nodos[0]?.total || 0,
        },
      },
    };
  }
}
