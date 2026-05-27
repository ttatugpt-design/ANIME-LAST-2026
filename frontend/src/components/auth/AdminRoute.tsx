import { useAuthStore } from '@/stores/auth-store';
import { Navigate, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactNode } from 'react';

interface AdminRouteProps {
    children?: ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const { i18n } = useTranslation();
    const lang = i18n.language || 'en';

    if (!isAuthenticated) {
        return <Navigate to={`/${lang}/auth/login`} replace />;
    }

    const isAdmin = user?.role?.name?.toLowerCase() === 'admin' || user?.role?.name?.toLowerCase() === 'super_admin';

    if (!isAdmin) {
        return <Navigate to={`/${lang}/`} replace />;
    }

    return children ? <>{children}</> : <Outlet />;
};
