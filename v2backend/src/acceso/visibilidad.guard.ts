import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { VisibilidadService } from './visibilidad.service';

type Target =
  | { kind: 'none' }
  | { kind: 'carnet'; value: string }
  | { kind: 'idUsuario'; value: number };

@Injectable()
export class VisibilidadGuard implements CanActivate {
  constructor(private readonly visibilidadService: VisibilidadService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user || {};

    // 1) Resolver carnet solicitante
    const carnetSolicitante = await this.getCarnetSolicitante(req, user);
    if (!carnetSolicitante) {
      throw new ForbiddenException(
        'No se pudo resolver carnet del usuario autenticado.',
      );
    }

    // 2) Resolver objetivo
    const target = this.getTarget(req);
    if (target.kind === 'none') return true;

    // 3) Validación por carnet
    if (target.kind === 'carnet') {
      if (carnetSolicitante === target.value) return true;

      const ok = await this.visibilidadService.puedeVer(
        carnetSolicitante,
        target.value,
      );

      if (!ok) {
        throw new ForbiddenException(
          `Sin permiso para ver carnet: ${target.value}`,
        );
      }
      return true;
    }

    // 4) Validación por idUsuario
    if (target.kind === 'idUsuario') {
      const idSolicitante = this.getIdUsuarioFromUser(user);

      // Auto-acceso por ID
      if (idSolicitante && idSolicitante === target.value) return true;

      // Si tenemos ID del solicitante, usamos verificarAccesoPorId
      if (idSolicitante) {
        const ok = await this.visibilidadService.verificarAccesoPorId(
          idSolicitante,
          target.value,
        );
        if (!ok) {
          throw new ForbiddenException(
            `Sin permiso para ver idUsuario: ${target.value}`,
          );
        }
        return true;
      }

      // Fallback: resolver carnet del objetivo
      const carnetObjetivo = await this.visibilidadService.obtenerCarnetPorId(
        target.value,
      );
      if (!carnetObjetivo) {
        throw new ForbiddenException(
          'No se pudo resolver carnet del objetivo.',
        );
      }

      const ok = await this.visibilidadService.puedeVer(
        carnetSolicitante,
        carnetObjetivo,
      );

      if (!ok) {
        throw new ForbiddenException(
          `Sin permiso para ver idUsuario: ${target.value}`,
        );
      }
      return true;
    }

    return true;
  }

  private async getCarnetSolicitante(
    req: any,
    user: any,
  ): Promise<string | null> {
    if (req.__carnetSolicitante) return req.__carnetSolicitante;

    const carnet = this.cleanStr(user.carnet);
    if (carnet) {
      req.__carnetSolicitante = carnet;
      return carnet;
    }

    const idUsuario = this.getIdUsuarioFromUser(user);
    if (idUsuario) {
      const carnetDb =
        await this.visibilidadService.obtenerCarnetPorId(idUsuario);
      if (carnetDb) {
        req.__carnetSolicitante = carnetDb;
        return carnetDb;
      }
    }
    return null;
  }

  private getIdUsuarioFromUser(user: any): number | null {
    const candidates = [user.idUsuario, user.sub, user.userId];
    for (const c of candidates) {
      const n = this.toInt(c);
      if (n && n > 0) return n;
    }
    return null;
  }

  private getTarget(req: any): Target {
    const params = req.params || {};
    const body = req.body || {};
    const query = req.query || {};

    const id =
      this.toInt(params.idUsuarioObjetivo) ||
      this.toInt(params.idUsuario) ||
      this.toInt(body.idUsuarioObjetivo) ||
      this.toInt(body.idUsuario) ||
      this.toInt(query.idUsuarioObjetivo) ||
      this.toInt(query.idUsuario);

    if (id && id > 0) return { kind: 'idUsuario', value: id };

    const carnet =
      this.cleanStr(params.carnetObjetivo) ||
      this.cleanStr(params.carnet) ||
      this.cleanStr(body.carnetObjetivo) ||
      this.cleanStr(query.carnetObjetivo);

    if (carnet) return { kind: 'carnet', value: carnet };

    return { kind: 'none' };
  }

  private cleanStr(x: any): string | null {
    const s = String(x ?? '').trim();
    return s.length ? s : null;
  }

  private toInt(x: any): number | null {
    if (x === null || x === undefined) return null;
    const n = Number(x);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
}
