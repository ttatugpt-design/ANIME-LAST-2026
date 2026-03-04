import { useAuthStore } from '@/stores/auth-store';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
    children?: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { i18n } = useTranslation();
    const lang = i18n.language || 'en';

    if (!isAuthenticated) {
        return <Navigate to={`/${lang}/auth/login`} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};

