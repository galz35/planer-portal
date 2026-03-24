import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpException,
  Get,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { ImportService } from './import.service';

// DTOs para importación
interface ImportEmpleadoDto {
  nombre: string;
  correo: string;
  telefono?: string;
  activo?: boolean;
  nodoNombre?: string; // Nombre del nodo donde asignar
  rolEnNodo?: string; // Lider, Colaborador, Miembro
}

interface ImportNodoDto {
  nombre: string;
  tipo: 'Dirección' | 'Gerencia' | 'Subgerencia' | 'Equipo';
  nombrePadre?: string; // Nombre del nodo padre
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

@Controller('admin/import')
@UseGuards(AdminGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * GET /admin/import/template/empleados
   * Devuelve la estructura esperada para importar empleados
   */
  @Get('template/empleados')
  getEmpleadosTemplate() {
    return {
      success: true,
      data: {
        descripcion: 'Estructura para importar empleados desde Excel/JSON',
        campos: [
          {
            nombre: 'nombre',
            tipo: 'string',
            requerido: true,
            ejemplo: 'JUAN CARLOS PEREZ GOMEZ',
          },
          {
            nombre: 'correo',
            tipo: 'string',
            requerido: true,
            ejemplo: 'juan.perez@claro.com.ni',
          },
          {
            nombre: 'telefono',
            tipo: 'string',
            requerido: false,
            ejemplo: '88881234',
          },
          {
            nombre: 'activo',
            tipo: 'boolean',
            requerido: false,
            ejemplo: true,
            default: true,
          },
          {
            nombre: 'nodoNombre',
            tipo: 'string',
            requerido: false,
            ejemplo: 'NI GERENCIA DE RECURSOS HUMANOS',
          },
          {
            nombre: 'rolEnNodo',
            tipo: 'string',
            requerido: false,
            ejemplo: 'Colaborador',
            opciones: ['Lider', 'Colaborador', 'Miembro'],
          },
        ],
        ejemplo: [
          {
            nombre: 'JUAN CARLOS PEREZ GOMEZ',
            correo: 'juan.perez@claro.com.ni',
            telefono: '88881234',
            activo: true,
            nodoNombre: 'NI GERENCIA DE RECURSOS HUMANOS',
            rolEnNodo: 'Colaborador',
          },
        ],
      },
    };
  }

  /**
   * GET /admin/import/template/organizacion
   * Devuelve la estructura esperada para importar nodos de organización
   */
  @Get('template/organizacion')
  getOrganizacionTemplate() {
    return {
      success: true,
      data: {
        descripcion:
          'Estructura para importar nodos de organización desde Excel/JSON',
        campos: [
          {
            nombre: 'nombre',
            tipo: 'string',
            requerido: true,
            ejemplo: 'NI SUBGERENCIA DE CAPACITACION',
          },
          {
            nombre: 'tipo',
            tipo: 'string',
            requerido: true,
            opciones: ['Dirección', 'Gerencia', 'Subgerencia', 'Equipo'],
          },
          {
            nombre: 'nombrePadre',
            tipo: 'string',
            requerido: false,
            ejemplo: 'NI GERENCIA DE RECURSOS HUMANOS',
          },
          {
            nombre: 'activo',
            tipo: 'boolean',
            requerido: false,
            default: true,
          },
        ],
        ejemplo: [
          {
            nombre: 'NI SUBGERENCIA DE CAPACITACION',
            tipo: 'Subgerencia',
            nombrePadre: 'NI GERENCIA DE RECURSOS HUMANOS',
            activo: true,
          },
        ],
      },
    };
  }

  /**
   * POST /admin/import/empleados
   * Importa empleados desde un array JSON
   */
  @Post('empleados')
  async importEmpleados(
    @Body()
    body: {
      empleados: ImportEmpleadoDto[];
      modo?: 'crear' | 'actualizar' | 'upsert';
    },
  ): Promise<ImportResult> {
    const { empleados, modo = 'upsert' } = body;

    if (!empleados || !Array.isArray(empleados) || empleados.length === 0) {
      throw new HttpException(
        'Se requiere un array de empleados',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (empleados.length > 5000) {
      throw new HttpException(
        'Máximo 5000 empleados por lote',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.importService.importEmpleados(empleados, modo);
  }

  /**
   * POST /admin/import/organizacion
   * Importa nodos de organización desde un array JSON
   */
  @Post('organizacion')
  async importOrganizacion(
    @Body()
    body: {
      nodos: ImportNodoDto[];
      modo?: 'crear' | 'actualizar' | 'upsert';
    },
  ): Promise<ImportResult> {
    const { nodos, modo = 'upsert' } = body;

    if (!nodos || !Array.isArray(nodos) || nodos.length === 0) {
      throw new HttpException(
        'Se requiere un array de nodos',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (nodos.length > 1000) {
      throw new HttpException(
        'Máximo 1000 nodos por lote',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.importService.importOrganizacion(nodos, modo);
  }

  /**
   * POST /admin/import/asignaciones
   * Asigna empleados a nodos (sin crear nuevos)
   */
  @Post('asignaciones')
  async importAsignaciones(
    @Body()
    body: {
      asignaciones: { correo: string; nodoNombre: string; rol: string }[];
    },
  ): Promise<ImportResult> {
    const { asignaciones } = body;

    if (
      !asignaciones ||
      !Array.isArray(asignaciones) ||
      asignaciones.length === 0
    ) {
      throw new HttpException(
        'Se requiere un array de asignaciones',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.importService.importAsignaciones(asignaciones);
  }

  /**
   * GET /admin/import/stats
   * Estadísticas actuales de la base de datos
   */
  @Get('stats')
  async getStats() {
    return this.importService.getStats();
  }
}
