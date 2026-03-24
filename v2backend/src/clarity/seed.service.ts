import { Injectable } from '@nestjs/common';

// NOTA: SeedService deshabilitado durante migración MSSQL
// Este servicio usaba TypeORM + sintaxis PostgreSQL no compatible

@Injectable()
export class SeedService {
  async seedSystem() {
    return {
      success: false,
      message:
        'Seed service deshabilitado durante migración a SQL Server. Usar scripts SQL manuales.',
    };
  }
}
