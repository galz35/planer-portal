import {
  Controller,
  Get,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../admin.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Controlador para la gestión de respaldos administrativos.
 */
@ApiTags('Admin / Backup')
@ApiBearerAuth()
@Controller('admin/backup')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Genera y descarga un script SQL completo (Schema + Data)',
  })
  async exportBackup(@Res() res: any) {
    try {
      const filePath = await this.backupService.generateSqlBackup();
      const fileName = path.basename(filePath);

      this.logger.log(`Enviando archivo de backup: ${fileName}`);

      // Configuración de headers para descarga en Fastify/NestJS
      res.header('Content-Type', 'application/sql');
      res.header('Content-Disposition', `attachment; filename=${fileName}`);

      // Streaming del archivo al cliente
      const stream = fs.createReadStream(filePath);

      stream.on('open', () => {
        stream.pipe(res.raw); // res.raw es la respuesta nativa de Fastify/Node
      });

      stream.on('error', (err) => {
        this.logger.error(`Error en el stream de lectura: ${err.message}`);
        if (!res.sent) {
          res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .send({ message: 'Error al leer el archivo de backup' });
        }
      });

      stream.on('end', () => {
        // Limpieza: Eliminar archivo temporal después del envío
        fs.unlink(filePath, (err) => {
          if (err)
            this.logger.error(
              `No se pudo eliminar el archivo temporal: ${filePath}`,
            );
          else this.logger.log(`Archivo temporal eliminado: ${fileName}`);
        });
      });
    } catch (error) {
      this.logger.error(`Fallo en exportBackup: ${error.message}`);
      throw new InternalServerErrorException(
        'No se pudo generar el archivo de respaldo. Asegúrese de que mssql-scripter esté instalado en el servidor.',
      );
    }
  }
}
