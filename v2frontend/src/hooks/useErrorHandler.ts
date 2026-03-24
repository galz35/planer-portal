import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

interface ErrorOptions {
    showToast?: boolean;
    toastType?: 'error' | 'warning';
    fallbackMessage?: string;
}

/**
 * Hook personalizado para manejo centralizado de errores
 * Proporciona funciones helper para diferentes tipos de errores
 */
export const useErrorHandler = () => {
    const { showToast } = useToast();

    /**
     * Maneja errores de API de manera consistente
     */
    const handleApiError = useCallback((
        error: unknown,
        options: ErrorOptions = {}
    ): string => {
        const {
            showToast: shouldShowToast = true,
            toastType = 'error',
            fallbackMessage = 'Ha ocurrido un error. Por favor, intenta de nuevo.',
        } = options;

        let message = fallbackMessage;

        if (error instanceof Error) {
            message = error.message;
        } else if (typeof error === 'object' && error !== null) {
            const errorObj = error as Record<string, any>;
            // Manejo de errores de Axios
            if (errorObj.response?.data?.message) {
                message = errorObj.response.data.message;
            } else if (errorObj.message) {
                message = errorObj.message;
            }
        }

        if (shouldShowToast) {
            showToast(message, toastType);
        }

        return message;
    }, [showToast]);

    /**
     * Maneja errores de validación de formularios
     */
    const handleValidationError = useCallback((
        fieldErrors: Record<string, string>
    ): void => {
        const firstError = Object.values(fieldErrors)[0];
        if (firstError) {
            showToast(firstError, 'warning');
        }
    }, [showToast]);

    /**
     * Maneja errores de red/conectividad
     */
    const handleNetworkError = useCallback((): void => {
        showToast('Error de conexión. Verifica tu internet e intenta de nuevo.', 'error');
    }, [showToast]);

    /**
     * Maneja errores de autenticación
     */
    const handleAuthError = useCallback((): void => {
        showToast('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.', 'warning');
        // Opcional: redirigir al login
        // window.location.href = '/login';
    }, [showToast]);

    /**
     * Wrapper para try-catch con manejo automático de errores
     */
    const withErrorHandling = useCallback(async <T,>(
        asyncFn: () => Promise<T>,
        options: ErrorOptions = {}
    ): Promise<T | null> => {
        try {
            return await asyncFn();
        } catch (error) {
            handleApiError(error, options);
            return null;
        }
    }, [handleApiError]);

    return {
        handleApiError,
        handleValidationError,
        handleNetworkError,
        handleAuthError,
        withErrorHandling,
    };
};
