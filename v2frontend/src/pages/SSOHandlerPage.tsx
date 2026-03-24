import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SSOHandlerPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');

        if (!token) {
            console.error('No SSO token provided');
            navigate('/login');
            return;
        }

        const performSSO = async () => {
            try {
                console.log('--- SSO HANDSHAKE START ---');
                
                // 1. Llamamos al backend de Planer para validar el token del Portal
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/sso-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('SSO Backend Error:', errorData);
                    throw new Error('SSO Authentication failed');
                }

                const { data: responseBody } = await response.json();
                
                if (!responseBody) throw new Error('Response body is empty');

                console.log(`👤 New Identity established: ${responseBody.user?.correo}`);
                
                // 3. Establecemos la sesión fresca
                login(responseBody.access_token, responseBody.refresh_token, responseBody.user);
                
                console.log('Session established, waiting for state commit...');
                
                // Agregamos un pequeño delay técnico para asegurar que Context API 
                // propague el estado del usuario antes de que ProtectedRoute lo evalúe
                setTimeout(() => {
                    console.log('🚀 Navigating to dashboard...');
                    navigate('/app/hoy', { replace: true });
                }, 500);
            } catch (error) {
                console.error('SSO Global Error:', error);
                navigate('/login?error=sso_failed');
            }
        };

        performSSO();
    }, [searchParams, login, navigate]);

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
