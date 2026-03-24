// Estas interfaces reflejan las tablas de la Base de Datos (04_Base_Datos_PostgreSQL.sql)
// Se usan para tipar los resultados que vienen de los Stored Procedures.

export interface IRol {
  IdRol: number;
  Nombre: string;
}

export interface IUsuario {
  IdUsuario: number;
  Nombre: string;
  Correo: string;
  Telefono?: string;
  Activo: boolean;
  FechaCreacion: Date;
}

export interface IOrganizacionNodo {
  IdNodo: number;
  IdPadre?: number;
  Tipo: 'Gerencia' | 'Subgerencia' | 'Equipo';
  Nombre: string;
  Activo: boolean;
}

export interface IProyecto {
  IdProyecto: number;
  Nombre: string;
  Descripcion?: string;
  IdNodoDuenio?: number;
  Estado: 'Activo' | 'Inactivo' | 'Completado';
  FechaCreacion: Date;
}

export interface ITarea {
  IdTarea: number; // BigInt en DB viene como string o number dependiendo el driver
  IdProyecto: number;
  Titulo: string;
  Descripcion?: string;
  Estado:
    | 'Pendiente'
    | 'EnCurso'
    | 'Bloqueada'
    | 'Revision'
    | 'Hecha'
    | 'Descartada';
  Prioridad: 'Alta' | 'Media' | 'Baja';
  Esfuerzo: 'XS' | 'S' | 'M' | 'L' | 'XL';
  FechaObjetivo?: Date;
  FechaUltActualizacion: Date;
}

export interface IBloqueo {
  IdBloqueo: number;
  IdTarea?: number;
  IdOrigenUsuario: number;
  IdDestinoUsuario?: number;
  Motivo: string;
  Estado: 'Activo' | 'Resuelto' | 'Descartado';
  FechaCreacion: Date;
}

export interface ICheckin {
  IdCheckin: number;
  Fecha: Date;
  IdUsuario: number;
  EntregableTexto: string;
  Nota?: string;
}

export interface IUsuarioVisible {
  // Resultado de sp_Clarity_UsuariosVisibles
  IdUsuario: number;
  Nombre: string;
  IdNodo: number;
  NodoNombre: string;
  NodoJerarquia: string;
}
