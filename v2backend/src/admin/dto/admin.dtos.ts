import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsArray,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from 'class-sanitizer';

export class PaginationDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number = 50;
}

export class AuditFilterDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idUsuario?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recurso?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entidad?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entidadId?: string;
}

export class LogCrearDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  nivel!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  origen!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  mensaje!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  nota?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idNodo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  stack?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idUsuario?: number;
}

export class RolCrearDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  descripcion?: string;

  @ApiProperty({ type: [Object], description: 'Array of PermissionRule' })
  @IsOptional()
  @IsArray()
  reglas?: any[];
}

export class RolActualizarDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  reglas?: any[];
}

export class OrganizacionNodoCrearDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  nombre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  tipo!: string; // Gerencia, Equipo

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idPadre?: number;
}

export class UsuarioOrganizacionAsignarDto {
  @ApiProperty()
  @IsInt()
  idUsuario!: number;

  @ApiProperty()
  @IsInt()
  idNodo!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  rol!: string; // Lider, Miembro, Gerente
}

export class UsuarioCrearDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  nombre!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Trim()
  correo!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  carnet?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  cargo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  rol?: string; // Nombre del rol o profileType
}

export class UsuarioActualizarDto {
  @IsOptional()
  @IsString()
  @Trim()
  nombre?: string;

  @IsOptional()
  @IsString()
  @Trim()
  correo?: string;

  @IsOptional()
  @IsString()
  @Trim()
  carnet?: string;

  @IsOptional()
  @IsString()
  @Trim()
  cargo?: string;

  @IsOptional()
  @IsString()
  @Trim()
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
