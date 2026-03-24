/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                clarity: {
                    bg: '#f8f9fa', // Fondo gris muy claro
                    surface: '#ffffff',
                    primary: '#e11d48', // Rojo rosado vibrante (ej. Rose 600)
                    secondary: '#64748b', // Slate 500
                    success: '#10b981', // Emerald 500
                    warning: '#f59e0b', // Amber 500
                    danger: '#ef4444', // Red 500
                    text: '#0f172a', // Slate 900
                    muted: '#94a3b8', // Slate 400
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
