import { api } from './api';

export interface UserAccessInfo {
    idUsuario: number;
    nombre: string;
    carnet: string;
    cargo: string;
    departamento: string;
    subordinateCount: number;
    menuType: 'ADMIN' | 'LEADER' | 'EMPLOYEE' | 'CUSTOM';
    hasCustomMenu: boolean;
    rolGlobal: string;
}

export interface SecurityProfile {
    id: number;
    nombre: string;
    menuJson: string;
    permisos: string[];
    activo: boolean;
}

export const adminService = {
    getUsersAccess: async (): Promise<UserAccessInfo[]> => {
        const { data } = await api.get<any>('/admin/security/users-access');
        return data.data;
    },

    assignMenu: async (idUsuario: number, customMenu: string | null): Promise<void> => {
        await api.post('/admin/security/assign-menu', { idUsuario, customMenu });
    },

    removeCustomMenu: async (idUsuario: number): Promise<void> => {
        await api.delete(`/admin/security/assign-menu/${idUsuario}`);
    },

    getProfiles: async (): Promise<SecurityProfile[]> => {
        const { data } = await api.get<any>('/admin/security/profiles');
        return data.data;
    },

    // Recycle Bin
    getDeletedItems: async (): Promise<any[]> => {
        const { data } = await api.get<any>('/admin/recycle-bin');
        return data.data || [];
    },

    restoreItem: async (tipo: 'Proyecto' | 'Tarea', id: number): Promise<void> => {
        await api.post(`/admin/recycle-bin/restore`, { tipo, id });
    },

    getUsuariosInactivos: async (fecha?: string): Promise<any[]> => {
        const { data } = await api.get<any>('/admin/usuarios-inactivos', { params: { fecha } });
        return data.data || [];
    }
};
