import { useEffect } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { NotificationPopup } from '@/components/notifications/NotificationPopup';

export function GlobalWrapper() {
    const { lang } = useParams<{ lang: string }>();
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const fetchSettings = useSettingsStore(state => state.fetchSettings);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (lang) {
            if (lang !== 'ar' && lang !== 'en') {
                // If the lang param is not a valid language, it might be a valid route that got captured (e.g. /favicon.ico)
                // However, since we have explicit redirects for /dashboard, this usually catches garbage or single-segment paths.

                // If we want to correct /fr/dashboard -> /en/dashboard
                // The regex check helps ensure we are replacing the first segment
                const newPath = location.pathname.replace(/^\/[^/]+/, '/en');
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
