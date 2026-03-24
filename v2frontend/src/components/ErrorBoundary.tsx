import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Captura errores de React y muestra una UI amigable
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });

        // En desarrollo, mostrar errores en consola
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
                    <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-500 to-rose-600 p-6 text-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                    <AlertTriangle size={28} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold">Algo salió mal</h1>
                                    <p className="text-rose-100 text-sm">Ha ocurrido un error inesperado</p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600">
                                Lo sentimos, la aplicación encontró un problema. Puedes intentar recargar la página o volver al inicio.
                            </p>

                            {import.meta.env.DEV && this.state.error && (
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <p className="text-xs font-mono text-rose-600 break-all">
                                        {this.state.error.toString()}
                                    </p>
                                    {this.state.errorInfo?.componentStack && (
                                        <pre className="text-xs font-mono text-slate-500 mt-2 overflow-x-auto max-h-32">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={this.handleReload}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors"
                            >
                                <RefreshCw size={16} />
                                Recargar Página
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                <Home size={16} />
                                Ir al Inicio
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
