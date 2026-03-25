import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PORTAL_URL } from '../constants/runtime';

export const SSOHandlerPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();

    // Monitor para navegar apenas la autenticación sea efectiva
    useEffect(() => {
        if (isAuthenticated) {
            console.log('🚀 Authenticated! Navigating to dashboard...');
            navigate('/app/hoy', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            console.error('No SSO token provided');
            // Si no hay token, volvemos al origen (Portal Central)
            window.location.href = PORTAL_URL;
            return;
        }

        const performSSO = async () => {
            try {
                console.log('--- SSO HANDSHAKE START ---');
                
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/sso-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!response.ok) {
                    throw new Error('SSO Authentication failed at backend');
                }

                const { data: responseBody } = await response.json();
                if (!responseBody) throw new Error('Response body is empty');

                console.log(`👤 New Identity established: ${responseBody.user?.correo}`);
                
                // Establecemos la sesión. El useEffect de arriba detectará el cambio y navegará.
                login(responseBody.access_token, responseBody.refresh_token, responseBody.user);
                
            } catch (error) {
                console.error('SSO Global Error:', error);
                // En caso de error, devolvemos al usuario al Portal Central
                window.location.href = `${PORTAL_URL}?error=sso_failed`;
            }
        };

        if (!isAuthenticated) {
            performSSO();
        }
    }, [searchParams, login, isAuthenticated]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-clarity-bg">
            <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <h2 className="text-xl font-semibold text-gray-700">Autenticando con Portal Central...</h2>
                <p className="text-gray-500">Espera un momento, estamos preparando tu sesión de Planer.</p>
            </div>
        </div>
    );
};
