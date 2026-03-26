/**
 * Centralizador de Rutas y Configuración de Entorno (Planer v2)
 */

export const APP_BASE = import.meta.env.VITE_BASE_PATH || "/";

// URL base de la API de Planer
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/Planer_api";

// URL del portal central (para redirecciones de salida)
export const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || "http://localhost:5173";

export const AUTH_STORAGE_KEYS = {
    token: 'planer_clarity_token',
    refreshToken: 'planer_clarity_refresh_token',
    user: 'planer_clarity_user',
} as const;

export function appPath(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${APP_BASE}${cleanPath}`.replace(/\/+/g, '/');
}
