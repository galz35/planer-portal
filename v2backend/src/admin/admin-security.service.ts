import { Injectable } from '@nestjs/common';
import * as adminRepo from './admin.repo';
import { UserAccessInfoDto } from './dto/admin-security.dto';
import { isAdminRole } from '../common/role-utils';

@Injectable()
export class AdminSecurityService {
  constructor() {}

  async getUsersWithAccessInfo(): Promise<UserAccessInfoDto[]> {
    // Obtener usuarios con metadata desde repo
    const users = await adminRepo.obtenerUsuariosAccessInfo();

    // Calcular lógica de negocio (menuType) en memoria
    return users.map((user) => {
      const hasCustomMenu = !!user.menuPersonalizado;
      let menuType: 'ADMIN' | 'LEADER' | 'EMPLOYEE' | 'CUSTOM';

      if (isAdminRole(user.rolGlobal)) {
        menuType = 'ADMIN';
      } else if (hasCustomMenu) {
        menuType = 'CUSTOM';
      } else if (user.subordinateCount > 0) {
        menuType = 'LEADER';
      } else {
        menuType = 'EMPLOYEE';
      }

      return {
        idUsuario: user.idUsuario,
        nombre: user.nombre || 'Sin nombre',
        carnet: user.carnet || '',
        cargo: user.cargo || 'Sin cargo',
        departamento: user.departamento || 'Sin departamento',
        subordinateCount: user.subordinateCount,
        menuType,
        hasCustomMenu,
        rolGlobal: user.rolGlobal,
      };
    });
  }

  async assignCustomMenu(
    idUsuario: number,
    customMenu: string | null,
  ): Promise<void> {
    await adminRepo.asignarMenuPersonalizado(idUsuario, customMenu);
  }

  async removeCustomMenu(idUsuario: number): Promise<void> {
    await adminRepo.asignarMenuPersonalizado(idUsuario, null);
  }

  async getSecurityProfiles() {
    return adminRepo.obtenerPerfilesSeguridad();
  }
}
