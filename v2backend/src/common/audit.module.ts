import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Módulo global de auditoría
 * Se puede inyectar en cualquier servicio sin importar explícitamente
 * Migrado a SQL Server directo (sin TypeORM)
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
