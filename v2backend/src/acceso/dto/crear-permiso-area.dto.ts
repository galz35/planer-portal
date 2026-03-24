import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';

/**
 * DTO para crear un permiso por área/subárbol
 */
export class CrearPermisoAreaDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetOtorga?: string;

  @IsString()
  @MaxLength(100)
  carnetRecibe: string;

  @IsString()
  idOrgRaiz: string; // bigint como string o ID sintético como GER_1

  @IsOptional()
  @IsIn(['SUBARBOL', 'SOLO_NODO'])
  alcance?: 'SUBARBOL' | 'SOLO_NODO';

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;

  @IsOptional()
  @IsIn(['ALLOW', 'DENY'])
  tipoAcceso?: 'ALLOW' | 'DENY';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoNivel?: string;
}
