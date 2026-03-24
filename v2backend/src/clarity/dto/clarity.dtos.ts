import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  IsIn,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { Trim } from 'class-sanitizer';
import { Type, Transform } from 'class-transformer';

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

export class ProyectoFilterDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gerencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subgerencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  area?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  fechaInicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsDateString()
  fechaFin?: string;
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
}

export class FechaQueryDto {
  @ApiProperty({ example: '2025-12-17' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CheckinUpsertDto {
  @ApiProperty({ example: 123, required: false })
  @IsInt()
  @IsOptional()
  idUsuario!: number;

  @ApiProperty({ example: '2025-12-17' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ example: 'Entrego versión 1' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @MaxLength(4000)
  entregableTexto!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(600)
  nota?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  linkEvidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idNodo?: number;

  @ApiProperty({ type: [Number] })
  @IsOptional()
  @IsArray()
  entrego?: number[];

  @ApiProperty({ type: [Number] })
  @IsOptional()
  @IsArray()
  avanzo?: number[];

  @ApiProperty({ type: [Number] })
  @IsOptional()
  @IsArray()
  extras?: number[];

  @ApiProperty({ enum: ['Tope', 'Bien', 'Bajo'] })
  @IsOptional()
  @IsIn(['Tope', 'Bien', 'Bajo'])
  estadoAnimo?: 'Tope' | 'Bien' | 'Bajo';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  usuarioCarnet?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prioridad1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prioridad2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prioridad3?: string;
}

export class TareaCrearRapidaDto {
  @ApiProperty({ example: 123, required: false })
  @IsInt()
  @IsOptional()
  idUsuario!: number;

  @ApiPropertyOptional({ example: 7 })
  @IsInt()
  @IsOptional()
  idProyecto?: number;

  @ApiProperty({ example: 'Endpoint workers' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @MaxLength(220)
  titulo!: string;

  @ApiProperty({ required: false, enum: ['Alta', 'Media', 'Baja'] })
  @IsOptional()
  @IsIn(['Alta', 'Media', 'Baja'])
  prioridad?: string;

  @ApiProperty({ required: false, enum: ['S', 'M', 'L'] })
  @IsOptional()
  @IsIn(['S', 'M', 'L'])
  esfuerzo?: string;

  @ApiProperty({
    required: false,
    enum: [
      'Logistica',
      'Administrativa',
      'administrativo',
      'Estrategica',
      'Estrategico',
      'AMX',
      'Otros',
      'CENAM',
      'Operativo',
    ],
    default: 'Administrativa',
  })
  @IsOptional()
  @IsIn([
    'Logistica',
    'Administrativa',
    'administrativo',
    'Estrategica',
    'Estrategico',
    'AMX',
    'Otros',
    'CENAM',
    'Operativo',
  ])
  tipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fechaInicioPlanificada?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idResponsable?: number;

  @ApiProperty({ type: [Number], required: false })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  coasignados?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  fechaObjetivo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ required: false, enum: ['SIMPLE', 'RECURRENTE', 'LARGA'] })
  @IsOptional()
  @IsIn(['SIMPLE', 'RECURRENTE', 'LARGA'])
  comportamiento?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkEvidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idTareaPadre?: number;
}

export class TareaActualizarDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(500)
  titulo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn([
    'Pendiente',
    'EnCurso',
    'Bloqueada',
    'Revision',
    'Hecha',
    'Descartada',
  ])
  estado?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsIn(['Alta', 'Media', 'Baja'])
  prioridad?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progreso?: number;

  @IsOptional()
  @IsIn(['S', 'M', 'L'])
  esfuerzo?: string;

  @ApiProperty({
    required: false,
    enum: [
      'Logistica',
      'Administrativa',
      'administrativo',
      'Estrategica',
      'Estrategico',
      'AMX',
      'Otros',
      'CENAM',
      'Operativo',
    ],
  })
  @IsOptional()
  @IsIn([
    'Logistica',
    'Administrativa',
    'administrativo',
    'Estrategica',
    'Estrategico',
    'AMX',
    'Otros',
    'CENAM',
    'Operativo',
  ])
  tipo?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  fechaInicioPlanificada?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  fechaObjetivo?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(2000)
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string; // Para solicitudes de cambio

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivoBloqueo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alcance?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comentario?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkEvidencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idTareaPadre?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idResponsable?: number;
}

export class TareaRevalidarDto {
  // Removed unused idUsuario to prevent validation errors

  @ApiProperty({ enum: ['Sigue', 'HechaPorOtro', 'NoAplica', 'Reasignar'] })
  @IsIn(['Sigue', 'HechaPorOtro', 'NoAplica', 'Reasignar'])
  accion!: 'Sigue' | 'HechaPorOtro' | 'NoAplica' | 'Reasignar';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  idUsuarioOtro?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  razon?: string;
}

export class TareaMasivaDto {
  @ApiProperty()
  @Type(() => TareaCrearRapidaDto)
  tareaBase!: TareaCrearRapidaDto;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  idUsuarios!: number[];
}

export class BloqueoCrearDto {
  @ApiProperty({ example: 123, required: false })
  @IsInt()
  @IsOptional()
  idOrigenUsuario!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  idTarea?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  idDestinoUsuario?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(120)
  destinoTexto?: string;

  @ApiProperty({ example: 'Necesito acceso...' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @MaxLength(400)
  motivo!: string;

  @ApiProperty({ required: false, description: 'Qué haré mientras espero' })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(300)
  accionMitigacion?: string;
}

export class BloqueoResolverDto {
  @ApiProperty({ example: 123 })
  @IsInt()
  idUsuario!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(300)
  comentario?: string;
}

export class TareaAsignarResponsableDto {
  @ApiProperty({
    example: 101,
    description: 'ID del usuario al que se le asigna la tarea',
  })
  @IsInt()
  idResponsable!: number;
}

export class TareaRegistrarAvanceDto {
  @ApiProperty({ example: 123 })
  @IsInt()
  idUsuario!: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  progreso!: number;

  @ApiProperty({ example: 'Comentario...' })
  @IsString()
  @Trim()
  @MaxLength(1000)
  comentario!: string;
}

export class ProyectoCrearDto {
  @ApiProperty({ example: 'Nuevo Proyecto' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @MaxLength(300)
  nombre!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(2000)
  descripcion?: string;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  idNodoDuenio?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  area?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subgerencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  gerencia?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fechaInicio?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fechaFin?: string;

  @ApiProperty({
    required: false,
    enum: ['administrativo', 'Administrativa', 'Logistica', 'AMX', 'Estrategico', 'Estrategica', 'Operativo', 'CENAM', 'Otros'],
    default: 'administrativo',
  })
  @IsOptional()
  @IsString()
  @IsIn(['administrativo', 'Administrativa', 'Logistica', 'AMX', 'Estrategico', 'Estrategica', 'Operativo', 'CENAM', 'Otros'])
  tipo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  responsableCarnet?: string;

  @ApiProperty({
    required: false,
    enum: ['JERARQUIA', 'COLABORADOR', 'JERARQUIA_COLABORADOR'],
    default: 'JERARQUIA',
    description: 'Modo de visibilidad del proyecto',
  })
  @IsOptional()
  @IsString()
  @IsIn(['JERARQUIA', 'COLABORADOR', 'JERARQUIA_COLABORADOR'])
  modoVisibilidad?: string;
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

export class TaskFilterDto extends PaginationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idProyecto?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Trim()
  estado?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idUsuario?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class DateRangeDto {
  @ApiProperty({ example: '2025-01-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-01-31' })
  @IsDateString()
  endDate!: string;
}

export class TareaReordenarDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  ids!: number[];
}

export class ReportFilterDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  month?: number;

  @ApiProperty({ required: false, example: 2026 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  year?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  idProyecto?: number;
}

// --- Foco Diario DTOs ---
import { IsBoolean } from 'class-validator';

export class FocoAgregarDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  idTarea!: number;

  @ApiProperty({ example: '2026-01-12' })
  @IsDateString()
  fecha!: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  esEstrategico?: boolean;
}

export class FocoActualizarDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  esEstrategico?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  completado?: boolean;
}

export class FocoReordenarDto {
  @ApiProperty({ type: [Number], description: 'IDs de focos en orden' })
  @IsArray()
  @IsInt({ each: true })
  ids!: number[];
}

export class SolicitudCambioDto {
  @ApiProperty()
  @IsInt()
  idTarea!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  campo!: string;

  @ApiProperty()
  @IsString()
  valorNuevo!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}
