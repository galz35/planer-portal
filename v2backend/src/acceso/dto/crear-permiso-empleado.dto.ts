import {
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';

/**
 * DTO para crear un permiso puntual por empleado
 */
export class CrearPermisoEmpleadoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetOtorga?: string;

  @IsString()
  @MaxLength(100)
  carnetRecibe: string;

  @IsString()
  @MaxLength(100)
  carnetObjetivo: string;

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
  @IsString()
  @MaxLength(20)
  tipoAcceso?: string; // 'ALLOW' | 'DENY'
}
