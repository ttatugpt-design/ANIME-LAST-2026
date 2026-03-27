import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function loadGoogleAnalytics() {
    // Prevent loading multiple instances
    if (document.getElementById('ga-script')) return;

    const script = document.createElement('script');
    script.id = 'ga-script';
    // Use a placeholder ID or read from env
    script.src = `https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`;
    script.async = true;
    document.head.appendChild(script);

    const inlineScript = document.createElement('script');
    inlineScript.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XXXXXXXXXX');
    `;
    document.head.appendChild(inlineScript);
}

export const CookieConsent: React.FC = () => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie_consent');
        if (!consent) {
            setIsVisible(true);
        } else if (consent === 'accepted') {
            loadGoogleAnalytics();
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookie_consent', 'accepted');
        setIsVisible(false);
        loadGoogleAnalytics();
    };

    const handleDecline = () => {
        localStorage.setItem('cookie_consent', 'declined');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[99999] p-4 bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className={`flex-1 text-sm font-medium text-black ${isAr ? 'text-right' : 'text-left'}`}>
                {isAr 
                    ? 'نحن نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربتك على موقعنا، وتحليل حركة المرور من خلال (Google Analytics). يمكنك اختيار الموافقة لتجربة أفضل أو الرفض ولن نقوم بتتبع أي بيانات.'
                    : 'We use cookies to improve your experience on our site and analyze traffic through Google Analytics. You can choose to accept for a better experience or decline, and we won\'t track any data.'}
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <button
                    onClick={handleDecline}
                    className="px-6 py-2 text-sm font-bold text-black bg-transparent border border-black hover:bg-gray-100 transition-colors rounded-none"
                >
                    {isAr ? 'رفض' : 'Decline'}
                </button>
                <button
                    onClick={handleAccept}
                    className="px-6 py-2 text-sm font-bold text-white bg-black border border-black hover:bg-black/80 transition-colors rounded-none"
                >
                    {isAr ? 'موافقة' : 'Accept'}
                </button>
            </div>
        </div>
    );
};
