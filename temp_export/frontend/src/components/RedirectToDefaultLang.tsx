import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function RedirectToDefaultLang() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Prepend /en to the current path
        const newPath = `/en${location.pathname}`;
        navigate(newPath, { replace: true });
    }, [navigate, location]);

    return null;
}
