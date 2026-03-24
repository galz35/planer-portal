import { Module } from '@nestjs/common';
import { RecorridoController } from './recorrido.controller';
import { RecorridoService } from './recorrido.service';

@Module({
    controllers: [RecorridoController],
    providers: [RecorridoService],
    exports: [RecorridoService],
})
export class CampoModule { }
