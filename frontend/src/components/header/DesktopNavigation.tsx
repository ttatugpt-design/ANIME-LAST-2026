import { useNavigate } from 'react-router-dom';
import { Home, Sparkles, ChevronDown, Monitor, Film, PlayCircle, LayoutGrid } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AnimeMenuContent } from './AnimeMenuContent';
import { CategoriesMenuContent } from './CategoriesMenuContent';

import { getImageUrl } from '@/utils/image-utils';

export function DesktopNavigation() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [isAnimeMenuOpen, setIsAnimeMenuOpen] = useState(false);
    const [isCategoriesMenuOpen, setIsCategoriesMenuOpen] = useState(false);
    const animeMenuRef = useRef<HTMLDivElement>(null);
    const categoriesMenuRef = useRef<HTMLDivElement>(null);

    // Handle click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isAnimeMenuOpen && animeMenuRef.current && !animeMenuRef.current.contains(event.target as Node)) {
                setIsAnimeMenuOpen(false);
            }
            if (isCategoriesMenuOpen && categoriesMenuRef.current && !categoriesMenuRef.current.contains(event.target as Node)) {
                setIsCategoriesMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAnimeMenuOpen, isCategoriesMenuOpen]);

    const toggleAnimeMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsAnimeMenuOpen(!isAnimeMenuOpen);
        setIsCategoriesMenuOpen(false);
    };

    const toggleCategoriesMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsCategoriesMenuOpen(!isCategoriesMenuOpen);
        setIsAnimeMenuOpen(false);
    };

    // Hardcoded Nav Items similar to Vue
    const mainNavItems = [
        { title: isRtl ? 'الرئيسية' : 'Home', href: `/${i18n.language}`, icon: Home },
        { title: isRtl ? 'تصفح الكل' : 'Browse All', href: `/${i18n.language}/browse`, icon: LayoutGrid },
        { title: isRtl ? 'جديد' : 'New', href: `/${i18n.language}/animes`, icon: Sparkles }, // Added New Link
        { title: isRtl ? 'أنمي القادم' : 'Coming Soon', href: `/${i18n.language}/coming-soon`, icon: Sparkles },
        { title: isRtl ? 'قائمة مسلسلات - TV' : 'TV Series', href: `/${i18n.language}/anime`, icon: Monitor },
        { title: isRtl ? 'قائمة الأفلام - Movies' : 'Movies', href: `/${i18n.language}/movies`, icon: Film },
        { title: isRtl ? 'قائمة الحلقات - Episodes' : 'Episodes List', href: `/${i18n.language}/episodes-list`, icon: PlayCircle },
    ];

    return (
        <div className={cn("items-center hidden h-full gap-2 lg:flex lg:flex-1", isRtl ? "mr-6" : "ml-6")}>
            <button
                onClick={() => navigate(`/${i18n.language}`)}
                className="flex items-center gap-2 px-4 py-1 text-base font-bold text-gray-700 transition-all duration-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
                <span className="hover-underline-expand">{isRtl ? 'الرئيسية' : 'Home'}</span>
            </button>

            <button
                onClick={() => navigate(`/${i18n.language}/animes`)}
                className="flex items-center gap-2 px-4 py-1 text-base font-bold text-gray-700 transition-all duration-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
                <span className="hover-underline-expand">{isRtl ? 'جديد' : 'New'}</span>
            </button>

            <button
                onClick={() => navigate(`/${i18n.language}/community`)}
                className="flex items-center gap-2 px-4 py-1 text-base font-bold text-gray-700 transition-all duration-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800"
            >
                <span className="hover-underline-expand">{isRtl ? 'المجتمع' : 'Community'}</span>
            </button>



            <div
                className="relative h-full flex items-center"
                ref={animeMenuRef}
            >
                <button
                    onClick={toggleAnimeMenu}
                    className="flex items-center gap-2 px-4 py-1 text-base font-bold text-gray-700 transition-all duration-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 outline-none"
                >
                    <span className="hover-underline-expand">{isRtl ? 'الكل' : 'All'}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isAnimeMenuOpen && "rotate-180")} />
                </button>

                {/* Anime Mega Menu Container */}
                <div
                    className={cn(
                        "fixed top-[60px] left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border-b border-gray-100 dark:border-neutral-800",
                        isAnimeMenuOpen
                            ? "max-h-[800px] opacity-100 translate-y-0"
                            : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                    )}
                >
                    <div className="mx-auto w-full max-w-[1800px]">
                        <AnimeMenuContent
                            onClose={() => setIsAnimeMenuOpen(false)}
                            isVisible={isAnimeMenuOpen}
                        />
                    </div>
                </div>
            </div>

            <div
                className="relative h-full flex items-center"
                ref={categoriesMenuRef}
            >
                <button
                    onClick={toggleCategoriesMenu}
                    className="flex items-center gap-2 px-4 py-1 text-base font-bold text-gray-700 transition-all duration-200 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 outline-none"
                >
                    <span className="hover-underline-expand">{isRtl ? 'الفئات' : 'Categories'}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isCategoriesMenuOpen && "rotate-180")} />
                </button>

                {/* Categories Mega Menu Container */}
                <div
                    className={cn(
                        "fixed top-[60px] left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border-b border-gray-100 dark:border-neutral-800",
                        isCategoriesMenuOpen
                            ? "max-h-[600px] opacity-100 translate-y-0"
                            : "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                    )}
                >
                    <div className="mx-auto w-full max-w-[1800px]">
                        <CategoriesMenuContent
                            onClose={() => setIsCategoriesMenuOpen(false)}
                            isVisible={isCategoriesMenuOpen}
                        />
                    </div>
                </div>
            </div>

            {/* Backdrop */}
            {(isAnimeMenuOpen || isCategoriesMenuOpen) && (
                <div
                    className="fixed inset-0 top-[60px] bg-black/30 backdrop-blur-[1px] z-40 transition-opacity duration-200"
                    onClick={() => {
                        setIsAnimeMenuOpen(false);
                        setIsCategoriesMenuOpen(false);
                    }}
                />
            )}
        </div>
    );
}
