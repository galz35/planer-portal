import DOMPurify from 'dompurify';
import { useCallback } from 'react';

/**
 * Hook para sanitizar contenido HTML de forma segura.
 * Útil para mostrar descripciones, notas o comentarios que puedan contener HTML.
 */
export const useSecureHTML = () => {
    const sanitize = useCallback((html: string) => {
        return {
            __html: DOMPurify.sanitize(html)
        };
    }, []);

    return { sanitize };
};
