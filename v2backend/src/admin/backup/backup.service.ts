import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Servicio encargado de generar respaldos de la base de datos SQL Server.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private configService: ConfigService) {}

  async generateSqlBackup(): Promise<string> {
    // Obtener credenciales del .env
    const host = this.configService.get<string>('MSSQL_HOST') || '';
    const user = this.configService.get<string>('MSSQL_USER') || '';
    const pass = this.configService.get<string>('MSSQL_PASSWORD') || '';
    const db = this.configService.get<string>('MSSQL_DATABASE') || '';

    const tempDir = path.join('d:\\planificacion', 'respaldo sql server');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${db}_${timestamp}.sql`;
    const filePath = path.join(tempDir, fileName);

    return new Promise((resolve, reject) => {
      const outputStream = fs.createWriteStream(filePath);

      this.logger.log(
        `Iniciando generación de script SQL para la base de datos ${db}...`,
      );

      /**
       * Ejecuta mssql-scripter via python -m mssqlscripter
       * Genera esquema y datos de Tablas, Vistas, SPs y Funciones.
       */
      const child = spawn(
        'python',
        [
          '-m',
          'mssqlscripter',
          '-S',
          host,
          '-d',
          db,
          '-U',
          user,
          '-P',
          pass,
          '--schema-and-data',
          '--include-objects',
          'Table',
          'View',
          'StoredProcedure',
          'UserDefinedFunction',
        ],
        { shell: true },
      );

      if (child.stdout) {
        child.stdout.pipe(outputStream);
      }

      let errorOutput = '';
      if (child.stderr) {
        child.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.log(`✅ Backup generado exitosamente: ${fileName}`);
          resolve(filePath);
        } else {
          this.logger.error(
            `❌ Error al generar backup. Código: ${code}. Salida: ${errorOutput}`,
          );
          reject(
            new Error(
              `mssql-scripter falló con código ${code}: ${errorOutput}`,
            ),
          );
        }
      });

      child.on('error', (err) => {
        this.logger.error(
          `❌ No se pudo iniciar el proceso de backup: ${err.message}`,
        );
        reject(err);
      });
    });
  }
}
