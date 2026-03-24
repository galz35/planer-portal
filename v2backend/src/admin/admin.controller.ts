import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminSecurityService } from './admin-security.service';
import {
  PaginationDto,
  AuditFilterDto,
  RolCrearDto,
  RolActualizarDto,
  OrganizacionNodoCrearDto,
  UsuarioOrganizacionAsignarDto,
  UsuarioCrearDto,
  UsuarioActualizarDto,
} from './dto/admin.dtos';

import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin', 'Administrador', 'SuperAdmin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly securityService: AdminSecurityService,
  ) {}

  // ============================
  // Helpers internos
  // ============================
  private getUserId(req: any): number {
    const id = req?.user?.userId ?? req?.user?.idUsuario ?? req?.user?.id;
    const num = Number(id);
    if (!num || Number.isNaN(num))
      throw new ForbiddenException('Token inválido (sin userId).');
    return num;
  }

  private clampInt(v: any, def: number, min: number, max: number): number {
    const n = Number(v);
    if (!n || Number.isNaN(n)) return def;
    return Math.max(min, Math.min(max, Math.trunc(n)));
  }

  // ==========================================
  // USUARIOS
  // ==========================================
  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('usuarios')
  async listarUsuarios(@Query() pag: PaginationDto) {
    const page = this.clampInt(pag.page, 1, 1, 10_000);
    const limit = this.clampInt(pag.limit, 50, 1, 200);
    return this.adminService.usuariosListarTodos(page, limit);
  }

  @Patch('usuarios/:id/rol')
  async cambiarRolUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body('rol') rol: string,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioCambiarRol(id, rol, actorId);
  }

  @Post('usuarios/:id/menu')
  async personalizarMenu(
    @Param('id', ParseIntPipe) id: number,
    @Body('menu') menu: any,
  ) {
    const menuJson = menu ? JSON.stringify(menu) : null;
    return this.securityService.assignCustomMenu(id, menuJson);
  }

  @Post('usuarios')
  async crearUsuario(@Body() dto: UsuarioCrearDto, @Req() req: any) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioCrear(dto, actorId);
  }

  @Patch('usuarios/:id')
  async actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UsuarioActualizarDto,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioActualizar(id, dto, actorId);
  }

  @Get('usuarios/:id/visibilidad-efectiva')
  async obtenerVisibilidadEfectiva(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getEfectiveVisibility(id);
  }

  // ==========================================
  // ROLES
  // ==========================================
  @Get('roles')
  async listarRoles() {
    return this.adminService.rolesListar();
  }

  @Post('roles')
  async crearRol(@Body() dto: RolCrearDto, @Req() req: any) {
    const actorId = this.getUserId(req);
    return this.adminService.rolCrear(dto, actorId);
  }

  @Patch('roles/:id')
  async actualizarRol(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RolActualizarDto,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.rolActualizar(id, dto, actorId);
  }

  @Delete('roles/:id')
  async eliminarRol(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorId = this.getUserId(req);
    return this.adminService.rolEliminar(id, actorId);
  }

  // ==========================================
  // LOGS & AUDIT
  // ==========================================
  @Get('logs')
  async listarLogs(@Query() pag: PaginationDto) {
    const page = this.clampInt(pag.page, 1, 1, 10_000);
    const limit = this.clampInt(pag.limit, 50, 1, 200);
    return this.adminService.logsListar(page, limit);
  }

  @Get('audit-logs')
  async listarAuditLogs(@Query() filtro: AuditFilterDto) {
    return this.adminService.auditLogsListar(filtro);
  }

  // ==========================================
  // ORGANIGRAMA
  // ==========================================
  @Get('organigrama')
  async obtenerOrganigrama() {
    return this.adminService.getOrganigrama();
  }

  @Post('nodos')
  async crearNodo(@Body() dto: OrganizacionNodoCrearDto, @Req() req: any) {
    const actorId = this.getUserId(req);
    return this.adminService.nodoCrear(dto, actorId);
  }

  @Post('usuarios-organizacion')
  async asignarUsuarioNodo(
    @Body() dto: UsuarioOrganizacionAsignarDto,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioAsignarANodo(dto, actorId);
  }

  // ==========================================
  // PAPELERA DE RECICLAJE
  // ==========================================
  @Get('recycle-bin')
  async getDeletedItems() {
    return this.adminService.getDeletedItems();
  }

  @Post('recycle-bin/restore')
  async restoreItem(
    @Body() body: { tipo: 'Proyecto' | 'Tarea'; id: number },
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.restoreItem(body.tipo, body.id, actorId);
  }

  @Delete('usuarios/:id')
  async eliminarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioEliminar(id, actorId);
  }

  @Delete('usuarios-organizacion/:idUsuario/:idNodo')
  async removerUsuarioNodo(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idNodo', ParseIntPipe) idNodo: number,
    @Req() req: any,
  ) {
    const actorId = this.getUserId(req);
    return this.adminService.usuarioRemoverDeNodo(idUsuario, idNodo, actorId);
  }

  @Get('usuarios-inactivos')
  async getUsuariosInactivos(@Query('fecha') fecha: string) {
    return this.adminService.getUsuariosInactivos(fecha);
  }
}
