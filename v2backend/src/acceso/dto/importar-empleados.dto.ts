import {
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsIn,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para un empleado individual en la importación
 * Todos los campos son opcionales excepto carnet
 */
export class EmpleadoImportDto {
  // Identificación (carnet es obligatorio)
  @IsString()
  @MaxLength(100)
  carnet: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  cedula?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  nombreCompleto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telefono?: string;

  // Ubicación organizacional
  @IsOptional()
  @IsString()
  idOrg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cargo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gerencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  empresa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  ubicacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  pais?: string;

  // Niveles organizacionales
  @IsOptional()
  @IsString()
  @MaxLength(200)
  primerNivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  segundoNivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tercerNivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cuartoNivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  quintoNivel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sextoNivel?: string;

  // Jefatura
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetJefe1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetJefe2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetJefe3?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carnetJefe4?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  jefe1Nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  jefe1Correo?: string;

  // Niveles y permisos
  @IsOptional()
  @IsNumber()
  userLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  managerLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipoEmpleado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tipoContrato?: string;

  // Fechas y estado
  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsDateString()
  fechaBaja?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/**
 * DTO para importación masiva de empleados
 */
export class ImportarEmpleadosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmpleadoImportDto)
  empleados: EmpleadoImportDto[];

  @IsOptional()
  @IsIn(['MERGE', 'REPLACE', 'INSERT_ONLY'])
  modo?: 'MERGE' | 'REPLACE' | 'INSERT_ONLY';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  importadoPor?: string;

  @IsOptional()
  @IsIn(['EXCEL', 'API', 'SIGHO1', 'MANUAL'])
  fuente?: 'EXCEL' | 'API' | 'SIGHO1' | 'MANUAL';
}

/**
 * DTO para importación de nodos organizacionales
 */
export class OrganizacionNodoImportDto {
  @IsString()
  idOrg: string;

  @IsOptional()
  @IsString()
  padre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nivel?: string;
}

/**
 * DTO para importación masiva de organización
 */
export class ImportarOrganizacionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrganizacionNodoImportDto)
  nodos: OrganizacionNodoImportDto[];

  @IsOptional()
  @IsIn(['MERGE', 'REPLACE'])
  modo?: 'MERGE' | 'REPLACE';
}
