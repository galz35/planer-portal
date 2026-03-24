import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminSecurityService } from './admin-security.service';
import { AssignMenuDto } from './dto/admin-security.dto';
import { InsufficientPermissionsException } from '../common/exceptions';
import { isAdminRole } from '../common/role-utils';

@ApiTags('Admin - Security')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin/security')
export class AdminSecurityController {
  constructor(private readonly securityService: AdminSecurityService) {}

  private checkAdminAccess(user: any) {
    if (!isAdminRole(user.rol) && !isAdminRole(user.rolGlobal)) {
      throw new InsufficientPermissionsException(
        'Solo administradores pueden acceder a esta función',
      );
    }
  }

  @Get('users-access')
  @ApiOperation({
    summary: 'Obtener lista de usuarios con información de acceso',
  })
  async getUsersAccess(@Request() req) {
    this.checkAdminAccess(req.user);
    return this.securityService.getUsersWithAccessInfo();
  }

  @Post('assign-menu')
  @ApiOperation({ summary: 'Asignar menú personalizado a un usuario' })
  async assignMenu(@Body() dto: AssignMenuDto, @Request() req) {
    this.checkAdminAccess(req.user);
    await this.securityService.assignCustomMenu(
      dto.idUsuario,
      dto.customMenu ?? null,
    );
    return { success: true, message: 'Menú asignado correctamente' };
  }

  @Delete('assign-menu/:id')
  @ApiOperation({ summary: 'Remover menú personalizado (volver a automático)' })
  async removeMenu(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.checkAdminAccess(req.user);
    await this.securityService.removeCustomMenu(id);
    return { success: true, message: 'Menú restablecido a automático' };
  }

  @Get('profiles')
  @ApiOperation({ summary: 'Obtener plantillas de perfiles de seguridad' })
  async getProfiles(@Request() req) {
    this.checkAdminAccess(req.user);
    return this.securityService.getSecurityProfiles();
  }
}
