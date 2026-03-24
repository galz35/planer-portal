import type { Usuario } from './modelos';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errorCode?: string;
    statusCode: number;
    timestamp: string;
    path: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: {
        total: number;
        page: number;
        lastPage: number;
        limit: number;
    };
}

export interface AuthResponse {
    token: string;
    user: Pick<Usuario, 'idUsuario' | 'nombre' | 'correo' | 'rolGlobal'>; // Basic user info returned on auth
}
