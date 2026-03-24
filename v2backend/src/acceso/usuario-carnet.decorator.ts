import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para obtener el carnet del usuario autenticado
 *
 * Uso:
 * @Get('mi-perfil')
 * obtenerPerfil(@UsuarioCarnet() carnet: string) { ... }
 */
export const UsuarioCarnet = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user || {};

    // Busca carnet en varias propiedades posibles del usuario
    const carnet = user.carnet || user.sub || user.correo || '';

    return String(carnet).trim();
  },
);
