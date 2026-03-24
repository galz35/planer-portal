import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AssignMenuDto {
  @IsNumber()
  idUsuario: number;

  @IsOptional()
  @IsString()
  customMenu?: string | null;
}

export class UserAccessInfoDto {
  idUsuario: number;
  nombre: string;
  carnet: string;
  cargo: string;
  departamento: string;
  subordinateCount: number;
  menuType: 'ADMIN' | 'LEADER' | 'EMPLOYEE' | 'CUSTOM';
  hasCustomMenu: boolean;
  rolGlobal: string;
}
