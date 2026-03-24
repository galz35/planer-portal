/**
 * MarcajeModule — Registra el módulo de Marcaje Web en NestJS
 */
import { Module } from '@nestjs/common';
import { MarcajeController } from './marcaje.controller';
import { MarcajeService } from './marcaje.service';

@Module({
  controllers: [MarcajeController],
  providers: [MarcajeService],
  exports: [MarcajeService],
})
export class MarcajeModule {}
