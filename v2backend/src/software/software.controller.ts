import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { SoftwareService } from './software.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Software')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('software')
export class SoftwareController {
  constructor(private readonly softwareService: SoftwareService) {}

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Obtener estadísticas avanzadas para el dashboard de software',
  })
  async getDashboardStats(
    @Request() req,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    const userId = req.user.userId;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    return this.softwareService.getDashboardStats(userId, m, y);
  }
}
