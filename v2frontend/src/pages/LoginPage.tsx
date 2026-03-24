// Last Modified: 2026-01-24 20:38:55
/**
 * LoginPage - Clarity
 * - UX: loading, error amigable
 * - Robustez: TanStack Query mutation, normalización de correo, evita doble submit
 * - Accesibilidad: autocomplete + aria
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { ApiResponse } from '../types/api';

type LoginResponse = {
    access_token: string;
    refresh_token: string;
    user: any; // Ajusta al tipo real (UserDto) cuando lo tengas
};

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Error “UI” (solo para mostrar mensaje final)
    const [error, setError] = useState('');

    const login = useAuth().login;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // ✅ Validación mínima (sin librerías extra) + normalización
    const { correoNormalizado, puedeEnviar, errorValidacion } = useMemo(() => {
        const correo = email.trim().toLowerCase();
        const pwd = password;

        // Nota: Permitimos Correo o Carnet (Login Híbrido)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
        const isCarnet = /^[a-zA-Z0-0]{3,10}$/.test(correo); // Formato típico de carnet (solo letras/números, 3-10 caracteres)

        if (correo.length === 0) return { correoNormalizado: correo, puedeEnviar: false, errorValidacion: '' };
        if (!isEmail && !isCarnet) return { correoNormalizado: correo, puedeEnviar: false, errorValidacion: 'Ingresa un Correo o Carnet válido' };
        if (pwd.length > 0 && pwd.length < 6) return { correoNormalizado: correo, puedeEnviar: false, errorValidacion: 'La contraseña debe tener al menos 6 caracteres' };

        return { correoNormalizado: correo, puedeEnviar: correo.length > 0 && pwd.length >= 6, errorValidacion: '' };
    }, [email, password]);

    // ✅ Login con TanStack Query (coherente con tu stack)
    const loginMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
                correo: correoNormalizado,
                password,
            });

            if (!data.data) {
                throw new Error('Respuesta del servidor sin datos de sesión');
            }

            return data.data;
        },
        onMutate: () => {
            setError(''); // limpia error anterior al iniciar
        },
        onSuccess: async (data: LoginResponse) => {
            if (data) {
                // ✅ Limpia caché previo para evitar fugas de datos de otros usuarios
                queryClient.clear();

                // Paso extra: Obtener Carnet real desde AccesoService si no viene en el login
                let userData = data.user;
                try {
                    // Consulta segura para enriquecer el perfil
                    const extendedRes = await api.get(`/acceso/empleado/email/${encodeURIComponent(data.user.correo)}`);
                    if (extendedRes.data?.empleado?.carnet) {
                        userData = {
                            ...userData,
                            carnet: extendedRes.data.empleado.carnet,
                            // Enriquecer con datos de RRHH
                            nombreCompleto: extendedRes.data.empleado.nombreCompleto || userData.nombreCompleto,
                            cargo: extendedRes.data.empleado.cargo || userData.cargo,
                            // Datos de organización para pre-llenar formularios
                            gerencia: extendedRes.data.empleado.gerencia || userData.gerencia,
                            subgerencia: extendedRes.data.empleado.subgerencia || userData.subgerencia,
                            area: extendedRes.data.empleado.departamento || extendedRes.data.empleado.area || userData.area,
                        };
                        console.log('✅ Perfil enriquecido con Carnet:', userData.carnet);
                    }
                } catch (e) {
                    console.warn('⚠️ No se pudo obtener el carnet extendido:', e);
                }

                login(data.access_token, data.refresh_token, userData);
                navigate('/app/hoy', { replace: true });
            }
        },
        onError: (err: unknown) => {
            // Tipado defensivo
            const axiosErr = err as AxiosError<any>;
            const msg = axiosErr?.response?.data?.message;

            if (typeof msg === 'string' && /credenciales/i.test(msg)) {
                setError('Correo o contraseña incorrectos');
            } else if (axiosErr?.code === 'ECONNABORTED') {
                setError('Tiempo de espera agotado. Intenta de nuevo.');
            } else {
                setError('Error de conexión. Intenta de nuevo.');
            }
        },
    });

    const isLoading = loginMutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Si hay error de validación, se muestra sin pegarle al backend
        if (errorValidacion) {
            setError(errorValidacion);
            return;
        }

        if (!puedeEnviar || isLoading) return;

        loginMutation.mutate();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
            {/* PANEL IZQUIERDO */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center p-16">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(236,72,153,0.15),transparent_50%)]"></div>
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.15),transparent_50%)]"></div>
                </div>

                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

                <div className="relative z-10 text-center">
                    <div className="relative inline-block pb-24">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 blur-3xl opacity-20 hover:opacity-30 transition-opacity duration-500"></div>
                        <img
                            src="/momentus-logo2.png"
                            alt="Planner-EF"
                            className="h-64 w-auto relative z-10 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-max z-20">
                            <h1 className="text-7xl font-black text-white mb-2 tracking-tight leading-none drop-shadow-2xl uppercase">
                                PLANNER-EF
                            </h1>
                            <div className="flex justify-center mt-2">
                            </div>
                            <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 font-semibold drop-shadow-lg text-center uppercase">
                                Eficiencia y Legado
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PANEL DERECHO */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logotipo móvil */}
                    <div className="lg:hidden text-center mb-12">
                        <div className="relative inline-block pb-16">
                            <img src="/momentus-logo2.png" alt="Planner-EF" className="h-32 w-auto" />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-max">
                                <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase">PLANNER-EF</h1>
                                <p className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-600 font-bold uppercase">
                                    Eficiencia y Legado
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500"></div>

                        <div className="p-12">
                            <div className="mb-10 text-center">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Iniciar Sesión</h2>
                                <p className="text-slate-500 text-sm">Accede a tu cuenta</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                {/* Email */}
                                <div className="space-y-2">
                                    <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">Correo o Carnet</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        </div>
                                        <input
                                            id="login-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="username"
                                            inputMode="email"
                                            aria-invalid={!!error}
                                            aria-describedby={error ? 'login-error' : undefined}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                                            placeholder="tu@claro.com.ni o Carnet"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">Contraseña</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        </div>
                                        <input
                                            id="login-password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
                                            aria-invalid={!!error}
                                            aria-describedby={error ? 'login-error' : undefined}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div
                                        id="login-error"
                                        aria-live="polite"
                                        className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700"
                                    >
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={isLoading || !puedeEnviar}
                                    className="w-full mt-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 px-6 rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Ingresando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Ingresar</span>
                                                <LogIn className="h-5 w-5" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>

                            {/* Nota opcional: si quieres mostrar validación instantánea sin esperar submit,
                  puedes mostrar errorValidacion debajo de inputs. */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
