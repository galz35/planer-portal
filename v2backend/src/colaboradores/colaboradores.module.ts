import { Module } from '@nestjs/common';
import { ColaboradoresService } from './colaboradores.service';

@Module({
  providers: [ColaboradoresService],
  exports: [ColaboradoresService],
})
export class ColaboradoresModule { }
