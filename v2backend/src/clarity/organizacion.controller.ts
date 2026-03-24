import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ejecutarSP } from '../db/base.repo';

@ApiTags('Organizacion')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('organizacion')
export class OrganizacionController {
  @Get('catalogo')
  @ApiOperation({
    summary: 'Obtener catálogo de estructura organizacional (Gerencias, etc)',
  })
  async getCatalogo() {
    // Optimización 2026-01-27: Usar SP optimizado
    const result = await ejecutarSP<{
      ogerencia: string;
      subgerencia: string;
      area: string;
    }>('sp_Organizacion_ObtenerCatalogo');

    return result.map((row, index) => ({
      id: index + 1,
      ogerencia: row.ogerencia,
      subgerencia: row.subgerencia,
      area: row.area,
    }));
  }

  @Get('estructura-usuarios')
  @ApiOperation({ summary: 'Obtener estructura plana de usuarios' })
  async getEstructuraUsuarios() {
    // Optimización 2026-01-27: Usar SP optimizado
    return await ejecutarSP('sp_Organizacion_ObtenerEstructura');
  }
}
