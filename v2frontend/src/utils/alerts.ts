import Swal from 'sweetalert2';

/**
 * Utilidad para mostrar alertas confirmación estandarizadas con el estilo de Clarity.
 */
export const alerts = {
    /**
     * Muestra un diálogo de confirmación asincrónico.
     * @param title Título de la alerta
     * @param text Texto descriptivo
     * @param icon Icono ('warning', 'info', 'question', 'error', 'success')
     * @returns Promesa que resuelve a true si se confirmó, false si se canceló
     */
    confirm: async (
        title: string,
        text: string = 'Esta acción no se puede deshacer.',
        icon: 'warning' | 'info' | 'question' | 'error' | 'success' = 'warning'
    ): Promise<boolean> => {
        const isDark = document.documentElement.classList.contains('dark');

        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: icon === 'warning' ? '#e11d48' : '#4f46e5', // Rose-600 para warnings, Indigo-600 para otros
            cancelButtonColor: '#94a3b8', // Slate-400
            background: isDark ? '#1e293b' : '#ffffff', // Slate-800 o White
            color: isDark ? '#f8fafc' : '#0f172a', // Slate-50 o Slate-900
            backdrop: `rgba(15, 23, 42, ${isDark ? '0.7' : '0.4'})`, // Slate-900 con opacidad
            customClass: {
                popup: 'rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl',
                title: 'text-xl font-black tracking-tight',
                htmlContainer: 'text-sm font-medium opacity-80',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold text-sm uppercase tracking-wider transition-transform active:scale-95',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-sm uppercase tracking-wider transition-transform active:scale-95',
            },
            buttonsStyling: true, // Usamos los colores definidos arriba pero con las clases custom para forma
        });

        return result.isConfirmed;
    },

    /**
     * Alerta simple de éxito
     */
    success: (title: string, text: string = '') => {
        const isDark = document.documentElement.classList.contains('dark');
        return Swal.fire({
            title,
            text,
            icon: 'success',
            confirmButtonColor: '#10b981',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
        });
    },

    /**
     * Alerta simple de error
     */
    error: (title: string, text: string = '') => {
        const isDark = document.documentElement.classList.contains('dark');
        return Swal.fire({
            title,
            text,
            icon: 'error',
            confirmButtonColor: '#ef4444',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
        });
    },
    /**
     * Alerta informativa
     */
    info: (title: string, text: string = '') => {
        const isDark = document.documentElement.classList.contains('dark');
        return Swal.fire({
            title,
            text,
            icon: 'info',
            confirmButtonColor: '#3b82f6',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
        });
    },
    /**
     * Alerta de advertencia
     */
    warning: (title: string, text: string = '') => {
        const isDark = document.documentElement.classList.contains('dark');
        return Swal.fire({
            title,
            text,
            icon: 'warning',
            confirmButtonColor: '#f59e0b',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
        });
    },
    /**
     * Muestra un diálogo de entrada de texto.
     */
    prompt: async (title: string, placeholder: string = ''): Promise<string | null> => {
        const isDark = document.documentElement.classList.contains('dark');
        const result = await Swal.fire({
            title,
            input: 'text',
            inputPlaceholder: placeholder,
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a',
        });

        return result.isConfirmed ? result.value : null;
    }
};
