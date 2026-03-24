import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RoleRouteProps {
    allowedRoles: string[]; // Ej: ['Admin', 'Gerente']
}

export const RoleRoute = ({ allowedRoles }: RoleRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.rolGlobal)) {
        // Si está autenticado pero no tiene rol, mandar a acceso denegado o home
        // Preferiblemente home si no es algo crítico, o una página explicita
        return <Navigate to="/app/hoy" replace />;
    }

    return <Outlet />;
};
