import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as accesoRepo from './acceso.repo';

/**
 * VisibilidadService - Servicio maestro para calcular visibilidad de empleados
 * Caching persistente y unificado usando Redis (vía CACHE_MANAGER)
 */
@Injectable()
export class VisibilidadService {
  private readonly logger = new Logger(VisibilidadService.name);

  // Expiración configurable para las resoluciones recurrentes
  // Lo reducimos porque ahora hay caché compartida, y confiaremos más en la BD o en limpiezas manuales.
  private readonly TTL_MS = 60_000 * 5; // 5 minutos por defecto, pero fácilmente evictable

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Asegura que el carnet sea string y sin espacios.
   */
  private limpiarCarnet(c: string | null | undefined): string {
    return (c ?? '').trim();
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }

  /**
   * Valida mes (1-12) y año (2000-2100).
   * Lanza BadRequestException si falla.
   */
  ensureMonthYear(mes: number, anio: number) {
    if (!mes || Number.isNaN(mes) || mes < 1 || mes > 12) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('mes inválido (1-12).');
    }
    if (!anio || Number.isNaN(anio) || anio < 2000 || anio > 2100) {
      const { BadRequestException } = require('@nestjs/common');
      throw new BadRequestException('anio inválido (2000-2100).');
    }
  }

  // ===========================
  // API pública
  // ===========================

  /**
   * Obtiene todos los carnets que un usuario puede ver.
   */
  async obtenerCarnetsVisibles(carnetSolicitante: string): Promise<string[]> {
    const cleanCarnet = this.limpiarCarnet(carnetSolicitante);
    if (!cleanCarnet) return [];

    const cacheKey = `visibilidad:${cleanCarnet}`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      const carnets = await accesoRepo.calcularCarnetsVisibles(cleanCarnet);

      const finalList =
        carnets && carnets.length > 0
          ? Array.from(
              new Set(
                carnets.map((c) => this.limpiarCarnet(c)).filter(Boolean),
              ),
            )
          : [cleanCarnet];

      await this.cacheManager.set(cacheKey, finalList);
      return finalList;
    } catch (error: any) {
      this.logger.warn(
        `Error calculando visibilidad para ${cleanCarnet} | ${error?.message || error}`,
      );
      const self = [cleanCarnet];
      await this.cacheManager.set(cacheKey, self);
      return self;
    }
  }

  /**
   * Verifica si el solicitante puede ver al objetivo.
   */
  async puedeVer(
    carnetSolicitante: string,
    carnetObjetivo: string,
  ): Promise<boolean> {
    const a = this.limpiarCarnet(carnetSolicitante);
    const b = this.limpiarCarnet(carnetObjetivo);
    if (!a || !b) return false;
    if (a === b) return true;

    const visibles = await this.obtenerCarnetsVisibles(a);
    return visibles.includes(b);
  }

  /**
   * Devuelve detalles de usuarios visibles.
   */
  async obtenerEmpleadosVisibles(carnetSolicitante: string): Promise<any[]> {
    const carnets = await this.obtenerCarnetsVisibles(carnetSolicitante);
    if (carnets.length === 0) return [];

    try {
      const CHUNK_SIZE = 300;
      const chunks = this.chunk(carnets, CHUNK_SIZE);
      const results: any[] = [];

      for (const part of chunks) {
        const rows = await accesoRepo.obtenerDetallesUsuarios(part);
        if (rows && rows.length) results.push(...rows);
      }

      return results;
    } catch (error: any) {
      this.logger.error(
        `Error fetching visible employees | ${error?.message || error}`,
      );
      return [];
    }
  }

  /**
   * Resuelve carnet de un idUsuario.
   */
  async obtenerCarnetPorId(idUsuario: number): Promise<string | null> {
    try {
      return await accesoRepo.obtenerCarnetDeUsuario(idUsuario);
    } catch (error: any) {
      this.logger.error(
        `Error resolving carnet for ID ${idUsuario}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Verifica acceso usando IDs numéricos.
   */
  async verificarAccesoPorId(
    idSolicitante: number,
    idObjetivo: number,
  ): Promise<boolean> {
    if (!idSolicitante || !idObjetivo) return false;
    if (idSolicitante === idObjetivo) return true;

    try {
      const [carnet1, carnet2] = await Promise.all([
        accesoRepo.obtenerCarnetDeUsuario(idSolicitante),
        accesoRepo.obtenerCarnetDeUsuario(idObjetivo),
      ]);

      const a = this.limpiarCarnet(carnet1);
      const b = this.limpiarCarnet(carnet2);

      if (!a || !b) return false;

      return await this.puedeVer(a, b);
    } catch (error: any) {
      this.logger.error(
        `Error verifying access by ID | ${error?.message || error}`,
      );
      return false;
    }
  }

  /**
   * Actores efectivos: Solicitante + delegantes activos.
   */
  async obtenerActoresEfectivos(carnetSolicitante: string): Promise<string[]> {
    const c = this.limpiarCarnet(carnetSolicitante);
    if (!c) return [];

    try {
      const delegaciones = await accesoRepo.obtenerDelegacionesActivas(c);
      const delegantes = (delegaciones || [])
        .map((d: any) => this.limpiarCarnet(d.carnet_delegante))
        .filter(Boolean);

      return Array.from(new Set([c, ...delegantes]));
    } catch (error: any) {
      this.logger.warn(
        `Error obteniendo actores efectivos | ${error?.message || error}`,
      );
      return [c];
    }
  }

  async obtenerQuienPuedeVer(carnetObjetivo: string): Promise<any[]> {
    return [];
  }

  /**
   * NUEVO: Obtener Mi Equipo (Jerarquía + Permisos)
   * Llama al SP carnet-first optimizado
   */
  async obtenerMiEquipo(carnetSolicitante: string): Promise<any[]> {
    const c = this.limpiarCarnet(carnetSolicitante);
    if (!c) return [];

    try {
      const rows = await accesoRepo.obtenerMiEquipoPorCarnet(c);
      return rows || [];
    } catch (error: any) {
      this.logger.error(
        `Error fetching team for ${c} | ${error?.message || error}`,
      );
      return [];
    }
  }

  async clearCache(): Promise<void> {
    // Cuando modifican permisos globalmente (Roles/Reglas), lo más seguro es resetear todo.
    // Esto lo hace a través de Redis si está configurado, matando todas las versiones obsoletas en todos los Pods.
    const cache = this.cacheManager as any;
    if (typeof cache.reset === 'function') {
      await cache.reset();
    } else if (typeof cache.clear === 'function') {
      await cache.clear();
    } else if (cache.stores) {
      for (const store of cache.stores) {
        if (typeof store.clear === 'function') await store.clear();
      }
    }
    this.logger.log(
      '🛑 [Visibilidad] Caché distribuida Reseteada por completo (Event-Driven)',
    );
  }
}
