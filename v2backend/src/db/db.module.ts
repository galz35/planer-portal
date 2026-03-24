/**
 * Módulo de base de datos para NestJS
 * Provee el pool de conexiones como servicio inyectable
 */
import {
  Module,
  Global,
  OnModuleDestroy,
  OnModuleInit,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  obtenerPoolSql,
  cerrarPoolSql,
  isPoolConnected,
} from './sqlserver.provider';

/**
 * Servicio de base de datos inyectable
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    // Inicializar pool al arrancar el módulo con ConfigService
    await obtenerPoolSql(this.configService);
  }

  async onModuleDestroy() {
    // Cerrar pool al destruir el módulo
    await cerrarPoolSql();
  }

  isConnected(): boolean {
    return isPoolConnected();
  }
}

@Global()
@Module({
  providers: [
    DbService,
    {
      provide: 'DB_SERVICE',
      useExisting: DbService,
    },
  ],
  exports: ['DB_SERVICE', DbService],
})
export class DbModule {}
