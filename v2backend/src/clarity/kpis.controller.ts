import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('KPIs & Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('kpis')
export class KpisController {
  constructor(private readonly tasksService: TasksService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener KPIs del dashboard ejecutivo' })
  async getKpisDashboard(@Request() req) {
    return this.tasksService.getDashboardKPIs(req.user.carnet);
  }
}

