/**
 * ¿QUÉ ES?: El Contexto de Autenticación Global de la aplicación.
 * ¿PARA QUÉ SE USA?: Para gestionar el estado de la sesión del usuario (si está logueado o no)
 * y permitir que cualquier componente acceda a los datos del usuario actual o cierre sesión.
 * ¿QUÉ SE ESPERA?: Que guarde y recupere los tokens de seguridad en el almacenamiento local (localStorage)
 * y mantenga sincronizado el estado del usuario en toda la app.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Usuario } from '../types/modelos';
import { API_BASE } from '../constants/runtime';

type User = Usuario;
type AuthBootstrapResponse = {
    access_token: string;
    refresh_token: string;
    user: User;
};

interface AuthContextType {
    user: User | null;
    login: (token: string, refreshToken: string, userData: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const persistSession = (token: string, refreshToken: string, userData: User) => {
        const safeUser = { ...userData };
        const roleData = (userData as any).rol;

        if (typeof roleData === 'object' && roleData !== null) {
            (safeUser as any).reglas = roleData.reglas;
        }

        localStorage.setItem('clarity_token', token);
        localStorage.setItem('clarity_refresh_token', refreshToken);
        localStorage.setItem('clarity_user', JSON.stringify(safeUser));
        setUser(safeUser);
    };

    useEffect(() => {
        let cancelled = false;

        const bootstrapAuth = async () => {
            const token = localStorage.getItem('clarity_token');
            const savedUser = localStorage.getItem('clarity_user');

            if (token && savedUser) {
                try {
                    if (!cancelled) {
                        setUser(JSON.parse(savedUser));
                    }
                    return;
                } catch {
                    localStorage.removeItem('clarity_token');
                    localStorage.removeItem('clarity_refresh_token');
                    localStorage.removeItem('clarity_user');
                } finally {
                    if (!cancelled) {
                        setLoading(false);
                    }
                }
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/auth/portal-session`, {
                    method: 'POST',
                    credentials: 'include',
                });

                if (response.ok) {
                    const payload = await response.json();
                    const sessionData: AuthBootstrapResponse | undefined = payload?.data ?? payload;

                    if (sessionData?.access_token && sessionData?.refresh_token && sessionData?.user) {
                        if (!cancelled) {
                            persistSession(
                                sessionData.access_token,
                                sessionData.refresh_token,
                                sessionData.user,
                            );
                        }
                    }
                }
            } catch (error) {
                console.warn('Portal session bootstrap failed:', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void bootstrapAuth();

        return () => {
            cancelled = true;
        };
    }, []);

    const login = (token: string, refreshToken: string, userData: User) => {
        persistSession(token, refreshToken, userData);
    };

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

