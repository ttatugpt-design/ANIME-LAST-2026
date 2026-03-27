import { Outlet, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settings-store';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/header/Header';
import { usePreviewStore } from '@/stores/preview-store';
import EpisodePreviewModal from '@/components/EpisodePreviewModal'; 
import { MessagingModal } from '@/components/social/MessagingModal';

import { useLoadingStore } from '@/stores/loading-store';

export function HomeLayout() {
    const { fetchSettings } = useSettingsStore();
    const { i18n } = useTranslation();
    const { lang } = useParams<{ lang: string }>();
    const location = useLocation();
    const { previewItem, closePreview } = usePreviewStore();
    const { isHomeInitialLoading } = useLoadingStore();

    const currentLang = lang || i18n.language || 'en';
    const isHomePage = location.pathname === '/' || location.pathname === `/${currentLang}`;

    return (
        <div className="flex min-h-screen bg-background dark:bg-black flex-col" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>

            {/* Always render Header */}
            <Header />

            {/* Content */}
            <main className={`flex-1 ${(location.pathname === '/' || location.pathname === `/${currentLang}` || location.pathname.includes('/animes') || location.pathname.includes('/watch/') || location.pathname.includes('/read/') || location.pathname.includes('/dmca') || location.pathname.includes('/community') || location.pathname.includes('/browse') || location.pathname.includes('/categories') || location.pathname.includes('/movies-series') || location.pathname.includes('/mangas'))
                ? 'w-full p-0'
                : 'container mx-auto py-8 px-4'
                }`}>
                <Outlet />
            </main>

            <EpisodePreviewModal
                isOpen={!!previewItem}
                onClose={closePreview}
                data={previewItem}
                lang={currentLang}
            />

            <MessagingModal />
        </div>
    );
};

