import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// NOTA: Endpoints de seed/test deshabilitados temporalmente durante migración MSSQL
// Usaban sintaxis PostgreSQL ($1, $2...) incompatible con SQL Server

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
