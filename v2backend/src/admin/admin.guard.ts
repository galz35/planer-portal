import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    // Check if user is Admin or Administrador
    const allowedAdmins = ['Admin', 'Administrador', 'SuperAdmin'];
    if (!allowedAdmins.includes(user.rol)) {
      throw new ForbiddenException('Se requiere rol de Administrador');
    }

    return true;
  }
}
