import { useEffect } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { NotificationPopup } from '@/components/notifications/NotificationPopup';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';

export function LanguageWrapper() {
    const { lang } = useParams<{ lang: string }>();
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const fetchSettings = useSettingsStore((state) => state.fetchSettings);
    const { user, accessToken } = useAuthStore();
    const { connect, disconnect } = useSocketStore();

    useEffect(() => {
        if (user && accessToken) {
            connect(accessToken);
        } else {
            disconnect();
        }
    }, [user, accessToken, connect, disconnect]);


    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (lang) {
            if (lang !== 'ar' && lang !== 'en') {
                const newPath = location.pathname.replace(/^\/[^/]+/, '/ar');
                navigate(newPath, { replace: true });
                return;
            }

            if (i18n.language !== lang) {
                i18n.changeLanguage(lang);
                document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
                document.documentElement.lang = lang;
            }
        }
    }, [lang, i18n, navigate, location]);

    return (
        <>
            <NotificationPopup />
            <Outlet />
        </>
    );
}


