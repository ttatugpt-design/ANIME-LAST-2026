import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export function RootRedirect() {
    const navigate = useNavigate();

    useEffect(() => {
        // Detect saved explicit language or default to 'ar'
        const savedLang = localStorage.getItem('i18nextLng');
        const currentLang = (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'ar';
        // Redirect to /:lang
        navigate(`/${currentLang}`, { replace: true });
    }, [navigate]);

    return null;
}
