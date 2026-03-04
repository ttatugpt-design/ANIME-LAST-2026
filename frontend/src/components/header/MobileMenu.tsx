import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home, Monitor, Pen, Crown, Star, PlayCircle, ThumbsUp, Sparkles, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { slugify } from "@/utils/slug";
import SpinnerImage from '@/components/ui/SpinnerImage';

// Helper for image URLs
const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

interface MobileMenuProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function MobileMenu({ isOpen: controlledIsOpen, onOpenChange }: MobileMenuProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, i18n } = useTranslation();
    const { appName, logoUrl } = useSettingsStore();
    const isRtl = i18n.language === 'ar';
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isAnimesOpen, setIsAnimesOpen] = useState(false); // State for Animes accordion
    const [isCategoriesOpen, setIsCategoriesOpen] = useState(false); // State for Categories accordion

    // Data state
    const [latestAnimes, setLatestAnimes] = useState<any[]>([]);
    const [latestEpisodes, setLatestEpisodes] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const animeContainerRef = useRef<HTMLDivElement>(null);
    const episodeContainerRef = useRef<HTMLDivElement>(null);

    // Use controlled state if provided, otherwise use internal state
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = onOpenChange || setInternalIsOpen;

    const handleNavigation = (path: string) => {
        const lang = i18n.language || 'en';
        const targetPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;

        // If we are already on the target page, just close the menu
        if (location.pathname === targetPath) {
            setIsOpen(false);
            return;
        }

        navigate(targetPath);
        // Do NOT close immediately. Let the useEffect on location.pathname handle it.
        // This prevents the menu from closing before the new page is rendered.
    };

    // Fetch data on open
    useEffect(() => {
        if (isOpen && !hasFetched && !isLoading) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const [animesRes, episodesRes, categoriesRes] = await Promise.all([
                        api.get('/animes/latest', { params: { limit: 6 } }),
                        api.get('/episodes/latest', { params: { limit: 6 } }),
                        api.get('/categories')
                    ]);
                    setLatestAnimes(animesRes.data || []);
                    setLatestEpisodes(episodesRes.data || []);
                    setCategories(categoriesRes.data || []);
                    setHasFetched(true);
                } catch (error) {
                    console.error("Failed to fetch mobile menu data", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, hasFetched, isLoading]);

    // Close on route change
    useEffect(() => {
        setIsOpen(false);
        setIsAnimesOpen(false); // Reset accordion on close
        setIsCategoriesOpen(false); // Reset categories accordion on close
    }, [location.pathname]);

    // Prevent scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <div className="lg:hidden">

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-10 h-10 mr-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 relative z-[50]",
                    // Ensure highlighted state if open
                    isOpen && "bg-neutral-100 dark:bg-neutral-800"
                )}
            >
                <Menu className="w-6 h-6" />
            </Button>

            {/* Manual Portal for Full Screen Overlay */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999]"
                    style={{ top: '60px' }} // Explicitly start below header
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Content */}
                    <div className="absolute inset-x-0 top-0 bottom-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-neutral-800 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col w-full min-h-full pb-10">

                            {/* 1. Profile/App Header - Exact Copy of UserMenuContent Header */}
                            <div className="p-4 font-normal">
                                <div className="flex items-center justify-between">
                                    {/* Edit Profile Icon (Left) */}
                                    <button
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
                                    >
                                        <Pen className="w-5 h-5" />
                                    </button>

                                    {/* User Info (Center/Right) */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{appName || 'ANIME LAST'}</span>
                                        </div>

                                        {/* Avatar (Right) */}
                                        <div className="relative w-14 h-14 overflow-hidden rounded-full ring-2 ring-[#222]">
                                            {logoUrl ? (
                                                <img
                                                    src={logoUrl}
                                                    alt="Logo"
                                                    className="object-cover w-full h-full"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full bg-black dark:bg-white text-white dark:text-black font-bold text-xl">
                                                    A
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Premium/Trial Banner */}
                            <div className="px-2 mb-2">
                                <div className="bg-black dark:bg-white rounded-none p-3 flex items-center justify-center gap-3 cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors text-white dark:text-black">
                                    <Crown className="w-5 h-5 fill-current" />
                                    <span className="text-base font-black uppercase tracking-wide">تجربة مجانية لـ 7 يومًا</span>
                                </div>
                            </div>

                            {/* Separator */}
                            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mb-1" />

                            {/* 3. Menu Items */}
                            <div className="py-1 flex flex-col">
                                {/* Home Link */}
                                <button
                                    onClick={() => handleNavigation('/')}
                                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-3 gap-4 group transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                >
                                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {isRtl ? 'الرئيسية' : 'Home'}
                                    </span>
                                    <Home className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </button>

                                {/* Community Link */}
                                <button
                                    onClick={() => handleNavigation('/community')}
                                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-3 gap-4 group transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                >
                                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {isRtl ? 'المجتمع' : 'Community'}
                                    </span>
                                    <Sparkles className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </button>

                                {/* Foreign Media Link */}
                                <button
                                    onClick={() => handleNavigation('/movies-series')}
                                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-3 gap-4 group transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                >
                                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                        {isRtl ? 'أفلام ومسلسلات أجنبية' : 'Foreign Media'}
                                    </span>
                                    <Film className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                </button>

                                {/* Anime Accordion */}
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => setIsAnimesOpen(!isAnimesOpen)}
                                        className={cn(
                                            "focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-3 gap-4 group transition-colors hover:bg-gray-100 dark:hover:bg-[#1a1a1a]",
                                            isAnimesOpen && "bg-gray-50 dark:bg-[#151515]"
                                        )}
                                    >
                                        <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                            {isRtl ? 'أنميات' : 'Animes'}
                                        </span>
                                        <Monitor className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                                    </button>

                                    {/* Expanded Content */}
                                    {isAnimesOpen && (
                                        <div className="bg-gray-50 dark:bg-[#151515] pb-4">
                                            {/* Sub Links */}
                                            <div className="flex flex-col border-b border-gray-100 dark:border-[#2a2a2a] mb-4">
                                                <button
                                                    onClick={() => handleNavigation('/browse')}
                                                    className="flex items-center justify-end w-full px-8 py-3 gap-3 hover:bg-black/5 dark:hover:bg-white/5"
                                                >
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isRtl ? 'تصفح الكل' : 'Browse All'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleNavigation('/animes')}
                                                    className="flex items-center justify-end w-full px-8 py-3 gap-3 hover:bg-black/5 dark:hover:bg-white/5"
                                                >
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isRtl ? 'جديد' : 'New'}</span>
                                                </button>
                                                <button
                                                    onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                                                    className="flex items-center justify-end w-full px-8 py-3 gap-3 hover:bg-black/5 dark:hover:bg-white/5"
                                                >
                                                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{isRtl ? 'الفئات' : 'Categories'}</span>
                                                </button>
                                            </div>

                                            {/* Categories Grid (Expandable) */}
                                            {isCategoriesOpen && categories && categories.length > 0 && (
                                                <div className="px-4 py-4 space-y-2">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase text-right px-1 mb-3">
                                                        {isRtl ? 'جميع الفئات' : 'All Categories'}
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {categories.map((category: any) => (
                                                            <button
                                                                key={category.id}
                                                                onClick={() => handleNavigation(`/browse?categoryId=${category.id}`)}
                                                                className="flex items-center justify-center px-3 py-2 text-xs font-medium bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#333] hover:border-black hover:text-black dark:hover:text-white dark:hover:border-white transition-colors text-center"
                                                            >
                                                                {isRtl ? category.name : (category.name_en || category.name)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => handleNavigation('/categories')}
                                                        className="w-full mt-3 px-3 py-2 text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                                    >
                                                        {isRtl ? 'عرض جميع الفئات' : 'View All Categories'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* VISUAL CONTENT SECTION */}
                                            <div className="px-1 space-y-8 mt-4">

                                                {/* Latest Animes Accordion Section */}
                                                {latestAnimes && latestAnimes.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right px-4">
                                                            {isRtl ? 'أحدث الأنميات' : 'Latest Animes'}
                                                        </h4>

                                                        <div className="flex flex-col gap-4">
                                                            {latestAnimes.slice(0, 4).map((anime) => {
                                                                const title = isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
                                                                const description = isRtl ? (anime.description || '') : (anime.description_en || '');
                                                                const slug = slugify(title);
                                                                const year = new Date(anime.created_at || Date.now()).getFullYear();

                                                                return (
                                                                    <div
                                                                        key={anime.id}
                                                                        className="flex flex-row gap-4 px-4 group active:bg-gray-50 dark:active:bg-neutral-900 transition-colors"
                                                                        onClick={() => handleNavigation(`/animes/${anime.id}/${slug}`)}
                                                                    >
                                                                        <div className="w-[100px] aspect-[2/3] flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-[#111] shadow-lg">
                                                                            <SpinnerImage
                                                                                src={getImageUrl(anime.image || anime.cover)}
                                                                                alt={title}
                                                                                className="w-full h-full"
                                                                                imageClassName="object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1 flex flex-col items-start text-right min-w-0 py-1">
                                                                            <h5 className="text-sm font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                                                                                {title}
                                                                            </h5>
                                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed text-right mt-1 w-full font-normal">
                                                                                {description}
                                                                            </p>
                                                                            <div className="mt-auto flex items-center justify-end gap-3 pt-2 w-full">
                                                                                <div className="flex items-center gap-1 text-yellow-500">
                                                                                    <Star className="w-3 h-3 fill-current" />
                                                                                    <span className="text-[10px] font-black">{anime.rating || 'N/A'}</span>
                                                                                </div>
                                                                                <span className="text-gray-300 text-[10px]">•</span>
                                                                                <span className="text-[10px] font-black text-gray-400">{year}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Latest Episodes Accordion Section */}
                                                {latestEpisodes && latestEpisodes.length > 0 && (
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right px-4">
                                                            {isRtl ? 'أحدث الحلقات' : 'Latest Episodes'}
                                                        </h4>

                                                        <div className="flex flex-col gap-5">
                                                            {latestEpisodes.map((episode) => {
                                                                const animeObj = episode.anime || episode.series;
                                                                const animeTitle = isRtl ? (animeObj?.title || episode.title) : (animeObj?.title_en || episode.title_en || episode.title);
                                                                const description = isRtl ? (episode.description || animeObj?.description || '') : (episode.description_en || animeObj?.description_en || '');
                                                                const slug = slugify(animeTitle);
                                                                const animeId = animeObj?.id || episode.anime_id || episode.id;

                                                                return (
                                                                    <div
                                                                        key={episode.id}
                                                                        className="flex flex-row gap-4 px-4 group active:bg-gray-50 dark:active:bg-neutral-900 transition-colors"
                                                                        onClick={() => handleNavigation(`/watch/${animeId}/${episode.episode_number}/${slug}`)}
                                                                    >
                                                                        <div className="w-[140px] aspect-video flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-[#111] shadow-lg relative">
                                                                            <SpinnerImage
                                                                                src={getImageUrl(episode.thumbnail || episode.banner || animeObj?.cover)}
                                                                                alt={animeTitle}
                                                                                className="w-full h-full"
                                                                                imageClassName="object-cover"
                                                                            />
                                                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-black text-white bg-black/80 uppercase">
                                                                                {isRtl ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex-1 flex flex-col items-start text-right min-w-0">
                                                                            <h5 className="text-[13px] font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                                                                                {animeTitle}
                                                                            </h5>
                                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-tight text-right mt-1 w-full font-normal">
                                                                                {description}
                                                                            </p>
                                                                            <div className="mt-1 flex flex-col items-end w-full">
                                                                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                                                                    {isRtl ? `الحلقة ${episode.episode_number}` : `Episode ${episode.episode_number}`}
                                                                                </p>
                                                                                <div className="flex items-center justify-end gap-3 mt-0.5">
                                                                                    <div className="flex items-center gap-1 text-gray-400">
                                                                                        <ThumbsUp className="w-3 h-3" />
                                                                                        <span className="text-[9px] font-bold">{episode.likes_count || 0}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1 text-gray-400 border-r border-gray-100 dark:border-neutral-800 pr-2 rtl:border-r-0 rtl:pr-0 rtl:border-l rtl:pl-2">
                                                                                        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                                                                                            {episode.views_count || 0} {isRtl ? 'مشاهدة' : 'Views'}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )
            }
        </div >
    );
}
