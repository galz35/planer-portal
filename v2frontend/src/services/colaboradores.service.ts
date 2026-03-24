import { api } from './api';

export interface ColaboradorBase {
    id: number;
    idProyecto: number;
    idUsuario: number;
    rolColaboracion: string;
    permisosCustom: string | null;
    fechaInvitacion: string;
    fechaExpiracion: string | null;
    activo: boolean;
    notas: string | null;
}

export interface Colaborador extends ColaboradorBase {
    nombreUsuario: string;
    correo: string;
    carnet: string;
    cargo: string;
    invitadoPor: number;
    invitadoPorNombre: string;
}

export interface RolesDisponibles {
    id: number;
    nombre: string;
    permisos: string;
    esSistema: boolean;
    orden: number;
}

export interface MisPermisos {
    rolColaboracion: string;
    permisos: string[];
    esDuenoProyecto: boolean;
    esAdminGlobal: boolean;
}

export const colaboradoresService = {
    // 1. Obtener todos los colaboradores de un proyecto
    listar: async (idProyecto: number): Promise<{ data: Colaborador[], rolesDisponibles: RolesDisponibles[], proyecto: any }> => {
        const { data } = await api.get(`/proyectos/${idProyecto}/colaboradores`);
        return (data as any).data;
    },

    // 2. Invitar un nuevo colaborador
    invitar: async (
        idProyecto: number,
        idUsuario: number,
        rolColaboracion: string,
        fechaExpiracion?: string,
        notas?: string
    ): Promise<void> => {
        await api.post(`/proyectos/${idProyecto}/colaboradores`, {
            idUsuario,
            rolColaboracion,
            fechaExpiracion,
            notas,
        });
    },

    // 3. Actualizar rol/permisos
    actualizar: async (
        idProyecto: number,
        idUsuario: number, // Usuario a modificar, no el que ejecuta
        updates: {
            rolColaboracion?: string;
            permisosCustom?: string[];
            fechaExpiracion?: string;
        }
    ): Promise<void> => {
        await api.patch(`/proyectos/${idProyecto}/colaboradores/${idUsuario}`, updates);
    },

    // 4. Revocar acceso
    revocar: async (idProyecto: number, idUsuario: number): Promise<void> => {
        await api.delete(`/proyectos/${idProyecto}/colaboradores/${idUsuario}`);
    },

    // 5. Ver mis propios permisos en este proyecto
    obtenerMisPermisos: async (idProyecto: number): Promise<MisPermisos> => {
        const { data } = await api.get(`/proyectos/${idProyecto}/mis-permisos`);
        return (data as any).data;
    },

    // 6. Obtener global roles validos si se necesita para combos sin estar en el config del proyecto
    listarRoles: async (): Promise<RolesDisponibles[]> => {
        const { data } = await api.get('/proyectos/roles-colaboracion');
        return (data as any).data;
    }
};
