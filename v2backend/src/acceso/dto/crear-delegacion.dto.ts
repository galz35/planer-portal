import {
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
} from 'class-validator';

/**
 * DTO para crear una delegación de visibilidad
 * Ejemplo: secretaria hereda visibilidad del gerente
 */
export class CrearDelegacionDto {
  @IsString()
  @MaxLength(100)
  carnetDelegante: string; // El gerente

  @IsString()
  @MaxLength(100)
  carnetDelegado: string; // La secretaria

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
}
