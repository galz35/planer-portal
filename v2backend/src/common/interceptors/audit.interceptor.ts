import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../audit.service';

/**
 * Interceptor que registra automáticamente:
 * - Errores del sistema
 * - Acciones de usuarios
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;
    const className = context.getClass().name;
    const handlerName = context.getHandler().name;

    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - startTime;

        // Log info para operaciones POST/PUT/PATCH/DELETE
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          this.auditService.info(
            `${className}.${handlerName}`,
            `${method} ${url} - ${duration}ms`,
            user?.idUsuario,
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Registrar error
        this.auditService.error(
          `${className}.${handlerName}`,
          `${method} ${url} - Error: ${error.message} (${duration}ms)`,
          error,
          user?.idUsuario,
        );

        return throwError(() => error);
      }),
    );
  }
}
