import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { winstonConfig } from './common/logger/winston.config';
import { WinstonModule } from 'nest-winston';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import fastifyHelmet from '@fastify/helmet';

import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

  // ══════════════════════════════════════════════════════════════
  // 1. ADAPTADOR FASTIFY
  // ══════════════════════════════════════════════════════════════
  const adapter = new FastifyAdapter({
    logger: false,
    bodyLimit: 10485760, // 10MB
  });

  // ══════════════════════════════════════════════════════════════
  // 2. CORS — Restringido a dominios conocidos en producción
  // ══════════════════════════════════════════════════════════════
  const allowedOrigins = [
    'https://www.rhclaroni.com',
    'https://rhclaroni.com',
    'http://localhost:5173', // Vite dev
    'http://localhost:4173', // Vite preview
    'http://localhost:3000', // Self
    'http://localhost:5175', // Planner Port
    'http://190.56.16.85', // Temporary IP access HTTP
    'https://190.56.16.85', // Temporary IP access HTTPS
  ];

  adapter.enableCors({
    origin: isProduction ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { logger: WinstonModule.createLogger(winstonConfig) },
  );

  // ══════════════════════════════════════════════════════════════
  // 3. PLUGINS DE SEGURIDAD FASTIFY
  // ══════════════════════════════════════════════════════════════
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'clarity-v2-secret-cookie-key-2026',
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  app.setGlobalPrefix('api');

  // ══════════════════════════════════════════════════════════════
  // 4. PIPES, FILTROS E INTERCEPTORES GLOBALES
  // ══════════════════════════════════════════════════════════════
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ══════════════════════════════════════════════════════════════
  // 5. SWAGGER — Solo disponible en desarrollo
  // ══════════════════════════════════════════════════════════════
  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Clarity API v2')
      .setDescription(
        'API Backend para sistema Clarity (Fastify + GraphQL + tRPC)',
      )
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(
      `📚 Swagger docs: http://localhost:${process.env.PORT || 3000}/api/docs`,
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 6. ARRANCAR SERVIDOR
  // ══════════════════════════════════════════════════════════════
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `🚀 Clarity v2 running on port ${port} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`,
  );
  logger.log(`⚡ Engine: Fastify | GraphQL: /graphql | tRPC: /trpc`);
}
bootstrap();
