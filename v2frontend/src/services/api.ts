/**
 * ¿QUÉ ES?: Este archivo configura una instancia de Axios (un cliente HTTP).
 * ¿PARA QUÉ SE USA?: Se utiliza para centralizar todas las peticiones al servidor (API). 
 * Gestiona automáticamente el envío de tokens de seguridad, reintentos en caso de fallos y la renovación de la sesión (Refresh Token).
 * ¿QUÉ SE ESPERA?: Que cualquier parte de la aplicación use esta instancia `api` para comunicarse con el backend de forma segura y consistente.
 */

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Configuración de reintentos automáticos
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

// Interfaz para extender la configuración de Axios con control de reintentos
interface CustomAxiosConfig extends InternalAxiosRequestConfig {
    _retryCount?: number;
    _isRetry?: boolean;
}

/**
 * Instancia central de Axios con la URL base y cabeceras por defecto.
 */
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // Tiempo máximo de espera: 30 segundos
});

// Variables para manejar la renovación del token cuando hay múltiples peticiones fallando al mismo tiempo
let isRefreshing = false;
interface QueueItem {
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}

let failedQueue: QueueItem[] = [];

/**
 * Procesa las peticiones que quedaron en espera mientras se renovaba el token.
 */
const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

/**
 * INTERCEPTOR DE PETICIÓN (Request):
 * Se ejecuta ANTES de que la petición salga al servidor.
 */
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('clarity_token');
    const selectedCountry = localStorage.getItem('clarity_selected_country');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    if (selectedCountry) {
        config.headers['x-country'] = selectedCountry;
    }

    // LOGGING PARA DEPURACIÓN (NestJS vs Rust)
    const isRust = config.baseURL?.includes('3100') || window.location.port === '5174';
    const serverLabel = isRust ? '🦀 RUST' : '🛡️ NESTJS';
    console.groupCollapsed(`%c [${serverLabel}] %c ${config.method?.toUpperCase()} %c ${config.url}`,
        `color: white; background: ${isRust ? '#e67300' : '#e0234e'}; font-weight: bold; border-radius: 3px; padding: 2px 5px`,
        'color: #888; font-weight: bold',
        'color: #222; font-weight: normal'
    );
    if (config.data) console.log('Payload:', config.data);
    if (config.params) console.log('Params:', config.params);
    console.groupEnd();

    return config;
});

/**
 * INTERCEPTOR DE RESPUESTA (Response):
 */
api.interceptors.response.use(
    (response) => {
        const isRust = response.config.baseURL?.includes('3100') || window.location.port === '5174';
        const serverLabel = isRust ? '🦀 RUST' : '🛡️ NESTJS';

        console.groupCollapsed(`%c [${serverLabel}] %c OK: ${response.config.url}`,
            `color: white; background: #22c55e; font-weight: bold; border-radius: 3px; padding: 2px 5px`,
            'color: #888; font-weight: normal'
        );
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
        console.groupEnd();

        return response;
    },
    async (error: AxiosError) => {
        const config = error.config as CustomAxiosConfig;

        // 1. Error de red o tiempo de espera - Se intenta reintentar la petición
        if (!error.response && config && (config._retryCount ?? 0) < MAX_RETRIES) {
            config._retryCount = (config._retryCount ?? 0) + 1;
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return api.request(config);
        }

        if (error.response) {
            const status = error.response.status;

            // Log del error para depuración
            console.error(`[API ERROR] ${status} ${config?.url}`, error.response.data);

            // 2. Manejo de Sesión Expirada (401)
            if (status === 401 && !config._isRetry) {
                console.warn('[API] Token expirado o inválido (401). Intentando refresh...');

                // Si ya se está refrescando, meter esta petición en cola
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then(token => {
                        config.headers.Authorization = `Bearer ${token}`;
                        return api.request(config);
                    }).catch(err => {
                        return Promise.reject(err);
                    });
                }

                config._isRetry = true;
                isRefreshing = true;

                const refreshToken = localStorage.getItem('clarity_refresh_token');

                if (refreshToken) {
                    try {
                        console.log('[API] Iniciando petición de refresco de token...');
                        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                        console.log('[API] Token refrescado exitosamente.');

                        const newTokens = data.data;
                        const accessToken = newTokens.access_token;
                        const newRefreshToken = newTokens.refresh_token;

                        // Guardar nuevos tokens
                        localStorage.setItem('clarity_token', accessToken);
                        localStorage.setItem('clarity_refresh_token', newRefreshToken);

                        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                        config.headers.Authorization = `Bearer ${accessToken}`;

                        processQueue(null, accessToken);
                        isRefreshing = false;

                        return api.request(config);
                    } catch (refreshError) {
                        console.error('[API] Falló el refresh token', refreshError);
                        processQueue(refreshError instanceof Error ? refreshError : new Error('Refresh failed'), null);
                        isRefreshing = false;

                        // Si el refresh falla, hay que cerrar sesión
                        localStorage.removeItem('clarity_token');
                        localStorage.removeItem('clarity_refresh_token');
                        localStorage.removeItem('clarity_user');

                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login';
                        }
                        return Promise.reject(refreshError);
                    }
                } else {
                    console.warn('[API] No hay refresh token disponible. Redirigiendo a login.');
                    isRefreshing = false;
                    localStorage.removeItem('clarity_token');
                    localStorage.removeItem('clarity_user');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login';
                    }
                }
            }

            // 3. Reintentar para errores temporales de servidor (5xx)
            if ([500, 502, 503, 504].includes(status)) {
                if (config && (config._retryCount ?? 0) < MAX_RETRIES) {
                    config._retryCount = (config._retryCount ?? 0) + 1;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * 2));
                    return api.request(config);
                }
            }
        }

        return Promise.reject(error);
    }
);

