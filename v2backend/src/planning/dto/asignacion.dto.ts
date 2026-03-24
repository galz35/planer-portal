import {
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
} from 'class-validator';

// =========================================
// ENUMS
// =========================================

export enum TipoAsignacion {
  RESPONSABLE = 'RESPONSABLE',
  COLABORADOR = 'COLABORADOR',
  REVISOR = 'REVISOR',
}

export enum MotivoCambio {
  ASIGNACION_INICIAL = 'ASIGNACION_INICIAL',
  REASIGNACION = 'REASIGNACION',
  TRANSFERENCIA_AREA = 'TRANSFERENCIA_AREA',
  BAJA_EMPLEADO = 'BAJA_EMPLEADO',
  SOLICITUD_EMPLEADO = 'SOLICITUD_EMPLEADO',
  CARGA_TRABAJO = 'CARGA_TRABAJO',
  DESASIGNACION = 'DESASIGNACION',
}

// =========================================
// DTOs
// =========================================

export class AsignarTareaDto {
  @IsNumber()
  idTarea: number;

  @IsOptional()
  @IsNumber()
  idUsuarioAsignado: number | null; // null = dejar sin asignar

  @IsOptional()
  @IsEnum(TipoAsignacion)
  tipoAsignacion?: TipoAsignacion;

  @IsOptional()
  @IsString()
  motivoCambio?: string;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ReasignarTareaDto {
  @IsNumber()
  idTarea: number;

  @IsOptional()
  @IsNumber()
  idNuevoUsuario: number | null; // null = quitar asignación

  @IsEnum(MotivoCambio)
  motivoCambio: MotivoCambio;

  @IsOptional()
  @IsString()
  notas?: string;
}

export class ReasignarMasivoDto {
  @IsNumber()
  idUsuarioOrigen: number;

  @IsOptional()
  @IsNumber()
  idUsuarioDestino: number | null; // null = dejar sin asignar

  @IsString()
  motivoCambio: string;

  @IsOptional()
  @IsString()
  notas?: string;

  @IsOptional()
  @IsBoolean()
  soloActivas?: boolean; // default true
}

// =========================================
// Response DTOs (interfaces, solo para tipado)
// =========================================

export interface HistorialAsignacionDto {
  id: number;
  idTarea: number;
  tituloTarea: string;
  usuarioAsignado: {
    id: number | null;
    nombre: string | null;
    correo: string | null;
  };
  usuarioAsignador: {
    id: number;
    nombre: string;
    correo: string;
  };
  fechaInicio: Date;
  fechaFin: Date | null;
  duracionDias: number | null;
  tipoAsignacion: string;
  motivoCambio: string;
  notas: string | null;
  activo: boolean;
}

export interface EstadisticasUsuarioDto {
  tareasActuales: number;
  tareasCompletadasHistorico: number;
  tareasReasignadasA: number;
  tareasReasignadasDesde: number;
  tiempoPromedioTareaDias: number;
}

export interface ReasignacionMasivaResultDto {
  tareasReasignadas: number;
  tareasAfectadas: number[];
}
