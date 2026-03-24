import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as accesoRepo from './acceso.repo';
import { CrearPermisoAreaDto } from './dto/crear-permiso-area.dto';
import { CrearPermisoEmpleadoDto } from './dto/crear-permiso-empleado.dto';
import { CrearDelegacionDto } from './dto/crear-delegacion.dto';

/**
 * AccesoService - CRUD para permisos y delegaciones
 * Migrado a SQL Server directo (sin TypeORM)
 */
@Injectable()
export class AccesoService {
  constructor() {}

  // ==========================================
  // PERMISO AREA
  // ==========================================

  async crearPermisoArea(dto: CrearPermisoAreaDto) {
    const empleadoRecibe = await accesoRepo.buscarUsuarioPorCarnet(
      dto.carnetRecibe,
    );
    if (!empleadoRecibe)
      throw new BadRequestException(
        `Empleado receptor no encontrado: ${dto.carnetRecibe}`,
      );

    const idOrgStr = (dto.idOrgRaiz || '').trim();
    const isNumericId = /^\d+$/.test(idOrgStr);
    let idOrgNum = 0;
    let nombreArea = dto.nombreArea?.trim() || null;

    if (isNumericId) {
      idOrgNum = Number(idOrgStr);
      const nodo = await accesoRepo.buscarNodoPorId(idOrgNum);
      if (!nodo)
        throw new BadRequestException(
          `Nodo organizacional no encontrado: ${dto.idOrgRaiz}`,
        );
      if (!nombreArea) {
        nombreArea = (nodo as any).descripcion || (nodo as any).nombre || null;
      }
    } else {
      // ID sintético (GER_1, SUB_2, PN_3) — el nombre es obligatorio
      if (!nombreArea)
        throw new BadRequestException(
          'nombreArea es requerido para IDs sintéticos de área',
        );
    }

    await accesoRepo.crearPermisoArea({
      carnet_otorga: dto.carnetOtorga?.trim() || null,
      carnet_recibe: dto.carnetRecibe.trim(),
      idorg_raiz: idOrgNum,
      alcance: dto.alcance || 'SUBARBOL',
      motivo: dto.motivo?.trim() || null,
      tipo_acceso: dto.tipoAcceso || 'ALLOW',
      nombre_area: nombreArea,
      tipo_nivel: dto.tipoNivel || 'GERENCIA',
    } as any);
    return { success: true, message: 'Permiso creado' };
  }

  async listarPermisosArea(carnetRecibe: string) {
    return accesoRepo.obtenerPermisosAreaActivos(carnetRecibe.trim());
  }

  async listarTodosPermisosArea() {
    return accesoRepo.listarTodosPermisosArea();
  }

  async desactivarPermisoArea(id: string | number) {
    await accesoRepo.desactivarPermisoArea(Number(id));
    return { success: true };
  }

  // ==========================================
  // PERMISO EMPLEADO
  // ==========================================

  async crearPermisoEmpleado(dto: CrearPermisoEmpleadoDto) {
    const carnetRecibe = dto.carnetRecibe.trim();
    const carnetObjetivo = dto.carnetObjetivo.trim();
    if (carnetRecibe === carnetObjetivo)
      throw new BadRequestException(
        'No tiene sentido crear un permiso hacia sí mismo.',
      );

    const empleadoRecibe =
      await accesoRepo.buscarUsuarioPorCarnet(carnetRecibe);
    if (!empleadoRecibe)
      throw new BadRequestException(
        `Empleado receptor no encontrado: ${carnetRecibe}`,
      );

    const empleadoObjetivo =
      await accesoRepo.buscarUsuarioPorCarnet(carnetObjetivo);
    if (!empleadoObjetivo)
      throw new BadRequestException(
        `Empleado objetivo no encontrado: ${carnetObjetivo}`,
      );

    await accesoRepo.crearPermisoEmpleado({
      carnet_otorga: dto.carnetOtorga?.trim() || null,
      carnet_recibe: carnetRecibe,
      carnet_objetivo: carnetObjetivo,
      motivo: dto.motivo?.trim() || null,
      tipo_acceso: dto.tipoAcceso || 'ALLOW',
    });
    return { success: true };
  }

  async listarPermisosEmpleado(carnetRecibe: string) {
    return accesoRepo.obtenerPermisosEmpleadoActivos(carnetRecibe.trim());
  }

  async listarTodosPermisosEmpleado() {
    return accesoRepo.listarTodosPermisosEmpleado();
  }

  async desactivarPermisoEmpleado(id: string | number) {
    await accesoRepo.desactivarPermisoEmpleado(Number(id));
    return { success: true };
  }

  // ==========================================
  // DELEGACIONES
  // ==========================================

  async crearDelegacion(dto: CrearDelegacionDto) {
    const carnetDelegante = dto.carnetDelegante.trim();
    const carnetDelegado = dto.carnetDelegado.trim();
    if (carnetDelegante === carnetDelegado)
      throw new BadRequestException(
        'La delegación a sí mismo no tiene sentido.',
      );

    const delegante = await accesoRepo.buscarUsuarioPorCarnet(carnetDelegante);
    if (!delegante)
      throw new BadRequestException(
        `Empleado delegante no encontrado: ${carnetDelegante}`,
      );

    const delegado = await accesoRepo.buscarUsuarioPorCarnet(carnetDelegado);
    if (!delegado)
      throw new BadRequestException(
        `Empleado delegado no encontrado: ${carnetDelegado}`,
      );

    await accesoRepo.crearDelegacion({
      carnet_delegante: carnetDelegante,
      carnet_delegado: carnetDelegado,
      motivo: dto.motivo?.trim() || null,
    });

    return { success: true, carnetDelegante, carnetDelegado };
  }

  async listarDelegacionesPorDelegado(carnetDelegado: string) {
    return accesoRepo.obtenerDelegacionesActivas(carnetDelegado);
  }

  async listarDelegacionesPorDelegante(carnetDelegante: string) {
    return accesoRepo.listarDelegacionesPorDelegante(carnetDelegante);
  }

  async listarTodasDelegaciones() {
    return accesoRepo.listarTodasDelegaciones();
  }

  async desactivarDelegacion(id: string | number) {
    await accesoRepo.desactivarDelegacion(Number(id));
    return { success: true };
  }

  // ==========================================
  // HELPERS & TREE
  // ==========================================

  async buscarEmpleadoPorCarnet(carnet: string) {
    return accesoRepo.buscarUsuarioPorCarnet(carnet);
  }

  async buscarEmpleadoPorCorreo(correo: string) {
    return accesoRepo.buscarUsuarioPorCorreo(correo);
  }

  async listarEmpleadosActivos() {
    return accesoRepo.listarEmpleadosActivos();
  }

  async listarEmpleadosPorGerencia(gerencia: string) {
    const todos = await accesoRepo.listarEmpleadosActivos();
    if (!gerencia) return todos;

    const g = gerencia.trim().toLowerCase();
    return todos.filter(
      (u) =>
        (u.gerencia && u.gerencia.toLowerCase() === g) ||
        (u.orgGerencia && u.orgGerencia.toLowerCase() === g) ||
        (u.departamento && u.departamento.toLowerCase() === g), // Fallback a departamento si gerencia no machea
    );
  }

  async buscarEmpleados(termino: string, limite: number = 10) {
    return accesoRepo.buscarUsuarios(termino, limite);
  }

  async buscarNodosOrganizacion(termino: string) {
    return accesoRepo.buscarNodosOrganizacion(termino);
  }

  async getDebugRawData(): Promise<any> {
    return { message: 'Migrado a SQL Server directo (sin debug raw)' };
  }

  async getNodosTree(): Promise<any[]> {
    const nodos = await accesoRepo.obtenerArbolOrganizacion();
    const conteos = await accesoRepo.contarEmpleadosPorNodo();

    const countMap: Record<string, number> = {};
    conteos.forEach((c: any) => (countMap[c.idOrg] = c.count));

    const nodeMap: Record<string, any> = {};
    nodos.forEach((n) => {
      const idStr = String(n.idorg);
      nodeMap[idStr] = {
        idOrg: idStr,
        descripcion: n.descripcion || 'Sin nombre',
        tipo: n.tipo,
        padre: n.padre ? String(n.padre) : null,
        nivel: n.nivel,
        empleadosDirectos: countMap[idStr] || 0,
        empleadosTotal: 0,
        hijos: [],
      };
    });

    const roots: any[] = [];
    Object.values(nodeMap).forEach((n) => {
      if (n.padre && nodeMap[n.padre]) {
        nodeMap[n.padre].hijos.push(n);
      } else {
        roots.push(n);
      }
    });

    const calcularTotal = (node: any, depth = 0): number => {
      if (depth > 20) return node.empleadosDirectos; // Protección contra ciclos
      let total = node.empleadosDirectos;
      for (const h of node.hijos) total += calcularTotal(h, depth + 1);
      node.empleadosTotal = total;
      return total;
    };
    roots.forEach((r) => calcularTotal(r));

    return roots;
  }

  async previewEmpleadosPorNodo(
    idOrgRaiz: string,
    alcance: 'SUBARBOL' | 'SOLO_NODO' = 'SUBARBOL',
  ): Promise<any> {
    if (alcance === 'SOLO_NODO') {
      const muestra = await accesoRepo.obtenerEmpleadosNodoDirecto(
        idOrgRaiz,
        50,
      );
      const total = await accesoRepo.contarEmpleadosNodoDirecto(idOrgRaiz);
      return { idOrgRaiz, alcance, total, muestra };
    } else {
      const muestra = await accesoRepo.previewEmpleadosSubarbol(idOrgRaiz, 50);
      const total = await accesoRepo.contarEmpleadosSubarbol(idOrgRaiz);
      return { idOrgRaiz, alcance, total, muestra };
    }
  }

  async getNodo(idOrg: string): Promise<any> {
    const nodo = await accesoRepo.buscarNodoPorId(Number(idOrg));
    if (!nodo) return null;
    const total = await accesoRepo.contarEmpleadosNodoDirecto(idOrg);
    return {
      ...nodo,
      idOrg: String(nodo.idorg),
      padre: nodo.padre ? String(nodo.padre) : null,
      empleadosDirectos: total,
    };
  }
}
