export interface Usuario {
    idUsuario: number;
    nombre: string;
    correo: string;
    telefono?: string;
    activo: boolean;
    rolGlobal: string; // 'Admin' | 'Empleado'
    idRol?: number;
    carnet?: string;  // Carnet UNIFICADO
    rol?: { // Relación con entidad Rol
        idRol: number;
        nombre: string;
    };
    // === CAMPOS UNIFICADOS RRHH (Desde p_Usuarios) ===
    nombreCompleto?: string;
    cargo?: string;
    departamento?: string; // Departamento
    orgDepartamento?: string; // oDEPARTAMENTO
    orgGerencia?: string; // OGERENCIA
    idOrg?: number; // Converted to number by backend if numeric
    jefeCarnet?: string;
    jefeNombre?: string;
    jefeCorreo?: string;
    fechaIngreso?: string;
    genero?: string;
    username?: string;
    pais?: string;

    // Campos de jerarquía organizacional (de RRHH.csv)
    primerNivel?: string; // Área
    segundoNivel?: string; // Subgerencia
    tercerNivel?: string; // Gerencia

    // Legacy fields handling
    area?: string; // Deprecated or mapped to departamento
    tipoArea?: string;
}


export interface OrganizacionNodo {
    idNodo: number;
    idPadre?: number;
    tipo: 'Gerencia' | 'Equipo';
    nombre: string;
    activo: boolean;
}

export interface Proyecto {
    idProyecto: number;
    nombre: string;
    descripcion?: string;
    idNodoDuenio?: number;
    estado: 'Borrador' | 'Confirmado' | 'EnEjecucion' | 'Cerrado' | 'Activo'; // 'Activo' kept for legacy
    fechaCreacion?: string;
    enllavado?: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    area?: string;
    subgerencia?: string;
    gerencia?: string;
    creadorNombre?: string;
    creadorCarnet?: string;
    responsableCarnet?: string;
    responsableNombre?: string;
    progreso?: number;
    requiereAprobacion?: boolean;
    tipo?: string;
    totalTareas?: number;
    tareasCompletadas?: number;
}

export interface SolicitudCambio {
    idSolicitud: number;
    idTarea: number;
    idUsuarioSolicitante: number;
    campoAfectado: string;
    valorAnterior: string | null;
    valorNuevo: string | null;
    motivo: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    fechaSolicitud: string;
}

export type Prioridad = 'Alta' | 'Media' | 'Baja';
export type Esfuerzo = 'S' | 'M' | 'L';
export type EstadoTarea = 'Pendiente' | 'En Curso' | 'EnCurso' | 'Pausa' | 'Bloqueada' | 'Revision' | 'Revisión' | 'Hecha' | 'Descartada';
export type TipoTarea = 'Logistica' | 'Administrativa' | 'Estrategica' | 'AMX' | 'Otros' | 'Operativo' | 'CENAM';
export type AlcanceTarea = 'Local' | 'Regional' | 'AMX';

export interface Tarea {
    idTarea: number;
    idProyecto: number;
    proyecto?: Proyecto;
    proyectoNombre?: string;
    titulo: string;
    descripcion?: string;
    estado: EstadoTarea;
    prioridad: Prioridad;
    esfuerzo: Esfuerzo;
    tipo?: TipoTarea;
    alcance?: AlcanceTarea;
    fechaInicioPlanificada?: string | null;
    fechaObjetivo?: string | null;
    fechaEnCurso?: string;
    fechaHecha?: string;
    idCreador: number;
    creador?: {
        nombre: string;
        correo?: string;
    };
    idAsignadoPor?: number;
    asignados?: TareaAsignado[];
    // Campos directos para responsable (alternativa a asignados[])
    idResponsable?: number;
    responsableNombre?: string;
    responsableCarnet?: string;
    fechaUltActualizacion: string;
    fechaCreacion?: string;
    progreso: number; // 0-100
    orden: number;
    comentario?: string;
    motivoBloqueo?: string;
    requiereEvidencia?: boolean;
    idEntregable?: number;
    // Campos para tipos A/B/C
    comportamiento?: 'SIMPLE' | 'RECURRENTE' | 'LARGA';
    idGrupo?: number;
    numeroParte?: number;
    fechaInicioReal?: string;
    fechaFinReal?: string;
    linkEvidencia?: string | null;
    idTareaPadre?: number | null;
    subtareas?: Tarea[];
    avances?: TareaAvance[];
    pendingRequests?: number;
}

export interface TareaAvance {
    idLog: number;
    idTarea: number;
    idUsuario: number;
    progreso: number;
    comentario: string;
    fecha: string;
}

export interface TareaRegistrarAvanceDto {
    idUsuario: number;
    progreso: number;
    comentario: string;
}

export interface TareaAsignado {
    idAsignacion: number;
    idTarea: number;
    idUsuario: number;
    usuario?: Usuario;
    tipo: 'Responsable' | 'Colaborador';
}

export interface Checkin {
    idCheckin: number;
    fecha: string; // YYYY-MM-DD
    idUsuario: number;
    usuarioCarnet?: string; // Carnet-First
    usuario?: Usuario;
    entregableTexto?: string;
    nota?: string;
    linkEvidencia?: string;
    idNodo?: number;
    estadoAnimo?: 'Tope' | 'Bien' | 'Bajo';
    prioridad1?: string;
    prioridad2?: string;
    prioridad3?: string;
    energia?: number;
    tareas?: CheckinTarea[];
    fechaCreacion?: string;
}

export interface CheckinTarea {
    idCheckinTarea: number;
    idCheckin: number;
    idTarea: number;
    tarea?: Tarea;
    tipo: 'Entrego' | 'Avanzo' | 'Extra';
}

export interface Bloqueo {
    idBloqueo: number;
    idTarea?: number;
    tarea?: Tarea;
    idOrigenUsuario: number;
    origenUsuario?: Usuario;
    idDestinoUsuario?: number;
    destinoUsuario?: Usuario;
    destinoTexto?: string;
    motivo: string;
    accionMitigacion?: string;
    estado: 'Activo' | 'Resuelto';
    fechaCreacion: string;
    fechaResolucion?: string;
}

// DTOs para Formularios
export interface CheckinUpsertDto {
    idUsuario: number;
    usuarioCarnet?: string;
    fecha: string;
    entregableTexto: string;
    prioridad1?: string;
    prioridad2?: string;
    prioridad3?: string;
    energia?: number;
    nota?: string;
    linkEvidencia?: string;
    estadoAnimo?: 'Tope' | 'Bien' | 'Bajo';
    idNodo?: number;
    entrego?: number[]; // IDs de tareas
    avanzo?: number[]; // IDs de tareas
    extras?: number[]; // IDs de tareas (opcional, max 5)
}

export interface TareaCrearRapidaDto {
    titulo: string;
    idProyecto?: number;
    prioridad: Prioridad;
    esfuerzo: Esfuerzo;
    tipo?: TipoTarea;
    idUsuario: number; // Creador
    idResponsable?: number;
    fechaInicioPlanificada?: string;
    fechaObjetivo?: string;
    descripcion?: string;
}

export interface BloqueoCrearDto {
    idTarea?: number;
    idOrigenUsuario: number;
    idDestinoUsuario?: number;
    destinoTexto?: string;
    motivo: string;
    accionMitigacion?: string;
}

export interface PlanTrabajo {
    idPlan: number;
    nombre?: string;
    idProyecto?: number;
    idUsuario: number;
    usuario?: Usuario;
    mes: number; // 1-12
    anio: number; // 2026
    estado: 'Borrador' | 'Confirmado' | 'Cerrado';
    objetivoGeneral?: string;
    resumenCierre?: string;
    idCreador: number;
    creador?: Usuario;
    // Campos organizacionales
    area?: string;
    subgerencia?: string;
    gerencia?: string;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    tareas?: Tarea[];
}

// ==========================================
// TIPOS PARA TAREAS A/B/C
// ==========================================

export type ComportamientoTarea = 'SIMPLE' | 'RECURRENTE' | 'LARGA';
export type TipoRecurrencia = 'SEMANAL' | 'MENSUAL';
export type EstadoInstancia = 'PENDIENTE' | 'HECHA' | 'OMITIDA' | 'REPROGRAMADA';

// Configuración de recurrencia de tarea
export interface TareaRecurrencia {
    id: number;
    idTarea: number;
    tipoRecurrencia: TipoRecurrencia;
    diasSemana?: string;  // '1,3,5' = lun, mie, vie (ISO)
    diaMes?: number;      // 15 = día 15 del mes
    fechaInicioVigencia: string;
    fechaFinVigencia?: string;
    activo: boolean;
    fechaCreacion: string;
    idCreador: number;
}

// Instancia de tarea recurrente (bitácora)
export interface TareaInstancia {
    id: number;
    idTarea: number;
    idRecurrencia?: number;
    fechaProgramada: string;
    fechaEjecucion?: string;
    estadoInstancia: EstadoInstancia;
    comentario?: string;
    idUsuarioEjecutor?: number;
    fechaRegistro: string;
    fechaReprogramada?: string;
    esInstanciaReal?: boolean;  // false = pendiente virtual
}

// Avance mensual de tarea larga (solo Plan de Trabajo)
export interface TareaAvanceMensual {
    id: number;
    idTarea: number;
    mes: number;
    anio: number;
    porcentajeMes: number;
    porcentajeAcumulado?: number;  // Calculado
    comentario?: string;
    idUsuarioActualizador: number;
    fechaActualizacion: string;
}

// DTOs para crear recurrencia e instancias
export interface CrearRecurrenciaDto {
    tipoRecurrencia: TipoRecurrencia;
    diasSemana?: string;
    diaMes?: number;
    fechaInicioVigencia: string;
    fechaFinVigencia?: string;
}

export interface MarcarInstanciaDto {
    fechaProgramada: string;
    estadoInstancia: EstadoInstancia;
    comentario?: string;
    fechaReprogramada?: string;
}

export interface AvanceMensualDto {
    anio: number;
    mes: number;
    porcentajeMes: number;
    comentario?: string;
}
