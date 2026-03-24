import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { TRPCModule as TrpcModule } from '@mguay/nestjs-trpc';
import { join } from 'path';
import { FastifyThrottlerGuard } from './common/guards/fastify-throttler.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClarityModule } from './clarity/clarity.module';
import { AdminModule } from './admin/admin.module';
import { PlanningModule } from './planning/planning.module';
import { AccesoModule } from './acceso/acceso.module';
import { AuditModule } from './common/audit.module';
import { DbModule } from './db/db.module';
import { DiagnosticoModule } from './diagnostico/diagnostico.module';
import { SoftwareModule } from './software/software.module';
import { NotificationModule } from './common/notification.module';
import { ColaboradoresModule } from './colaboradores/colaboradores.module';
import { UsersModule } from './users/users.module';
import { MarcajeModule } from './marcaje/marcaje.module';
import { JornadaModule } from './jornada/jornada.module';
import { CampoModule } from './campo/campo.module';
import { VisitaClienteModule } from './visita-cliente/visita-cliente.module';

import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    // Caché Global (Redis Oficial) para balanceadores y alta disponibilidad
    CacheModule.registerAsync({
      isGlobal: true, // Disponible en toda la app (incluyendo VisibilidadService)
      useFactory: async () => ({
        // Permite caer en un caché de memoria RAM local si el dev no tiene el contenedor levantado (Fallback Graceful)
        store:
          (await redisStore({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
          }).catch(() => null as any)) || 'memory',
      }),
    }),

    // 2. Vía tRPC
    TrpcModule.forRoot({
      basePath: '/trpc',
      autoSchemaFile: join(
        process.cwd(),
        '../v2frontend/src/utils/trpc-router.ts',
      ),
    }),

    ConfigModule.forRoot({ isGlobal: true }),
    DbModule, // Pool SQL Server directo
    ScheduleModule.forRoot(), // Cron Jobs

    // Rate Limiting - Protección contra abuso
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 50, // Aumentado (antes 10)
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 200, // Aumentado (antes 50)
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 500, // Aumentado (antes 100)
      },
    ]),

    // Módulos de la aplicación
    AuthModule,
    ClarityModule,
    AdminModule,
    PlanningModule,
    AccesoModule,
    AuditModule,
    DiagnosticoModule,
    SoftwareModule,
    NotificationModule,
    ColaboradoresModule,

    // Módulo de demostración Arquitectura Doble Entrada
    UsersModule,

    // Módulo experimental: Marcaje Web (solo carnet 500708)
    MarcajeModule,
    VisitaClienteModule,

    // Módulo de Jornada Laboral (Horarios, Patrones, Asignaciones)
    JornadaModule,

    // Módulo de Recorridos de Campo (GPS, rutas, visitas)
    CampoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard global de Rate Limiting (Throttler)
    {
      provide: APP_GUARD,
      useClass: FastifyThrottlerGuard,
    },
  ],
})
export class AppModule { }
