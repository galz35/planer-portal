import { Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';

/**
 * Guard de Rate Limiting adaptado para Fastify.
 * El ThrottlerGuard por defecto asume Express y falla con Fastify
 * porque los objetos Request/Response son distintos.
 */
@Injectable()
export class FastifyThrottlerGuard extends NestThrottlerGuard {
  // Fastify usa req.ip directamente (no req.ips)
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ip);
  }
}
