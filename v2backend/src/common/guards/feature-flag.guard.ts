/**
 * Feature Flag Guard - Restricción por Carnet y/o Correo
 *
 * Protege módulos experimentales para que solo usuarios específicos
 * (por carnet o correo) puedan acceder. Usado por Marcaje Web y Visita a Cliente.
 *
 * Uso en Controller:
 *   @UseGuards(JwtAuthGuard, FeatureFlagGuard)
 *   @AllowedCarnets('500708')
 *   // o @AllowedEmails('gustavo.lira@claro.com.ni')
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const FEATURE_CARNETS_KEY = 'feature_carnets';
export const FEATURE_EMAILS_KEY = 'feature_emails';

/**
 * Decorador para marcar un controller/método con los carnets autorizados.
 * @example @AllowedCarnets('500708', '500123')
 */
export const AllowedCarnets = (...carnets: string[]) =>
  SetMetadata(FEATURE_CARNETS_KEY, carnets);

/**
 * Decorador para marcar un controller/método con los correos autorizados.
 * @example @AllowedEmails('gustavo.lira@claro.com.ni')
 */
export const AllowedEmails = (...emails: string[]) =>
  SetMetadata(FEATURE_EMAILS_KEY, emails);

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    // Obtener carnets y emails permitidos del decorador
    const allowedCarnets =
      this.reflector.getAllAndOverride<string[]>(FEATURE_CARNETS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const allowedEmails =
      this.reflector.getAllAndOverride<string[]>(FEATURE_EMAILS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // Si no hay restricción, permitir acceso
    if (allowedCarnets.length === 0 && allowedEmails.length === 0) {
      return true;
    }

    // Obtener carnet y correo del JWT (inyectado por JwtStrategy → validate())
    const request = context.switchToHttp().getRequest();
    const userCarnet = String(request.user?.carnet || '').trim();
    const userEmail = String(
      request.user?.username || request.user?.correo || '',
    )
      .trim()
      .toLowerCase();

    if (!userCarnet && !userEmail) {
      throw new ForbiddenException('Módulo requiere autenticación con carnet');
    }

    // Verificar si el carnet O el correo está en la lista permitida
    const carnetMatch =
      allowedCarnets.length > 0 &&
      allowedCarnets.some((c) => String(c).trim() === userCarnet);

    const emailMatch =
      allowedEmails.length > 0 &&
      allowedEmails.some((e) => String(e).trim().toLowerCase() === userEmail);

    if (!carnetMatch && !emailMatch) {
      throw new ForbiddenException(
        `No tienes acceso a este módulo experimental (${userCarnet})`,
      );
    }

    return true;
  }
}
