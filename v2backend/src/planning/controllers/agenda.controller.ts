import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlanningService } from '../planning.service';

@Controller('mi-dia')
@UseGuards(AuthGuard('jwt'))
export class AgendaController {
  constructor(private readonly planningService: PlanningService) {}

  @Get()
  async getAgenda(@Request() req: any, @Query('fecha') fecha: string) {
    const idUsuario = req.user.idUsuario || req.user.userId || req.user.id;
    return await this.planningService.getMiDia(Number(idUsuario), fecha);
  }

  @Post('checkin')
  async checkin(@Request() req: any, @Body() body: any) {
    const idUsuario = req.user.idUsuario || req.user.userId || req.user.id;
    return await this.planningService.saveCheckin(Number(idUsuario), body);
  }
}
