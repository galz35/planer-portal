/**
 * ¿QUÉ ES?: El Contexto de Autenticación Global de la aplicación.
 * ¿PARA QUÉ SE USA?: Para gestionar el estado de la sesión del usuario (si está logueado o no)
 * y permitir que cualquier componente acceda a los datos del usuario actual o cierre sesión.
 * ¿QUÉ SE ESPERA?: Que guarde y recupere los tokens de seguridad en el almacenamiento local (localStorage)
 * y mantenga sincronizado el estado del usuario en toda la app.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Usuario } from '../types/modelos';

type User = Usuario;

/**
 * Define las propiedades y funciones que el contexto ofrece a los componentes.
 */
interface AuthContextType {
    user: User | null;
    login: (token: string, refreshToken: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

/**
 * El objeto de Contexto creado por React.
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ¿QUÉ ES?: El Proveedor de Autenticación (AuthProvider).
 * ¿PARA QUÉ SE USA?: Envuelve toda la aplicación para que cualquier componente pueda usar `useAuth()`.
 * ¿QUÉ SE ESPERA?: Verificar si ya existe una sesión guardada al cargar la app (useEffect) y proveer
 * las funciones de login y logout.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Se ejecuta una sola vez cuando el navegador carga la página
    useEffect(() => {
        // Intentar "hidratar" (recuperar) la sesión desde el almacenamiento local
        const token = localStorage.getItem('clarity_token');
        const savedUser = localStorage.getItem('clarity_user');
        if (token && savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    /**
     * ¿QUÉ ES?: Función para iniciar sesión.
     * ¿PARA QUÉ SE USA?: Se llama desde la página de Login tras una respuesta exitosa del servidor.
     * ¿QUÉ SE ESPERA?: Guardar los tokens y los datos del usuario en localStorage y actualizar el estado global.
     */
    const login = (token: string, refreshToken: string, userData: User) => {
        const safeUser = { ...userData };
        const roleData = (userData as any).rol;

        // Si el usuario tiene reglas de permisos en su rol, las extraemos
        if (typeof roleData === 'object' && roleData !== null) {
            (safeUser as any).reglas = roleData.reglas;
        }

        localStorage.setItem('clarity_token', token);
        localStorage.setItem('clarity_refresh_token', refreshToken);
        localStorage.setItem('clarity_user', JSON.stringify(safeUser));
        setUser(safeUser);
    };

    /**
     * ¿QUÉ ES?: Función para cerrar sesión.
     * ¿PARA QUÉ SE USA?: Para limpiar los datos del usuario y obligarlo a volver al Login.
     */
    const logout = () => {
        localStorage.removeItem('clarity_token');
        localStorage.removeItem('clarity_refresh_token');
        localStorage.removeItem('clarity_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * ¿QUÉ ES?: Hook personalizado para usar la autenticación.
 * ¿PARA QUÉ SE USA?: Para obtener el usuario actual o llamar a login/logout de forma sencilla.
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

