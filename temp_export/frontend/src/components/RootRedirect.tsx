import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function RootRedirect() {
    const { i18n } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        // Detect current language or default to 'en'
        const currentLang = i18n.language || 'en';
        // Redirect to /:lang
        navigate(`/${currentLang}`, { replace: true });
    }, [i18n, navigate]);

    return null;
}
