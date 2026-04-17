import { useState, useEffect, useRef, useMemo } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Star, ThumbsUp, Filter, Facebook, Twitter, Instagram, Youtube, Mail, Globe, UserPlus, LogIn, ShieldAlert, Home, Sparkles, Monitor, Film, PlayCircle, LayoutGrid, ArrowUp, Moon, Sun, ArrowUpDown, List, Share2, Play, ChevronDown, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { WatchLaterButton } from "@/components/common/WatchLaterButton";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import AnimeBrowseMobileSkeleton from "@/components/skeleton/AnimeBrowseMobileSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import SearchModal from "@/components/modals/SearchModal";
import FilterModal from "@/components/modals/FilterModal";
import SearchAnimeModal from "@/components/modals/SearchAnimeModal";
import FilterAnimeModal from "@/components/modals/FilterAnimeModal";
import { NewsTicker } from "@/components/common/NewsTicker";
import Footer from "@/components/common/Footer";
import { renderEmojiContent } from "@/utils/render-content";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { CategoriesMenuContent } from '@/components/header/CategoriesMenuContent';
import { getImageUrl } from '@/utils/image-utils';
import { slugify } from "@/utils/slug";
import { useLoadingStore } from "@/stores/loading-store";
import { useSettingsStore } from '@/stores/settings-store';
import CentralSpinner from "@/components/ui/CentralSpinner";

export default function HomePage() {
    const { i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const isRtl = i18n.language === 'ar';
    const navigate = useNavigate();
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSearchAnimeModalOpen, setIsSearchAnimeModalOpen] = useState(false);
    const [isFilterAnimeModalOpen, setIsFilterAnimeModalOpen] = useState(false);
    const { logoUrl } = useSettingsStore();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const seoTitle = i18n.language === 'ar' ? 'الرئيسية - AnimeLast' : 'Home - AnimeLast';

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 relative">
            <Helmet>
                <title>{seoTitle}</title>
            </Helmet>

            {/* Modals */}
            <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
            <SearchAnimeModal isOpen={isSearchAnimeModalOpen} onClose={() => setIsSearchAnimeModalOpen(false)} />
            <FilterAnimeModal isOpen={isFilterAnimeModalOpen} onClose={() => setIsFilterAnimeModalOpen(false)} />

            {/* Header Content & Main Content */}
            <>
                {/* Hero Section */}
                <div className="mt-0 bg-white dark:bg-black">
                    <div className="flex flex-col items-center justify-center pt-8 pb-12 mb-8 animate-fade-in px-4">
                        {/* Large Logo with Skeleton */}
                        <div className="mb-8 flex items-center justify-center">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="w-auto h-24 md:h-32 lg:h-40 xl:h-48 object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="h-24 md:h-32 lg:h-40 w-48 md:w-64 lg:w-80 rounded-xl bg-gray-200 dark:bg-white/10 animate-pulse" />
                            )}
                        </div>

                        {/* Updated Tagline */}
                        <div className="text-center max-w-2xl mx-auto px-4">
                            <p className="text-xl md:text-2xl lg:text-3xl text-gray-800 dark:text-gray-200 font-bold leading-relaxed tracking-wide" dir={isRtl ? 'rtl' : 'ltr'}>
                                {isRtl
                                    ? "أردت التواصل معنا ومتابعة أحدث الحلقات والأنميات؟ من هنا 👇"
                                    : "Want to contact us and follow the latest episodes and anime? From here 👇"}
                            </p>
                        </div>

                        {/* Social Media Icons */}
                        <div className="flex items-center justify-center gap-5 mt-8">
                            {/* TikTok */}
                            <a
                                href="https://tiktok.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-white/10"
                                aria-label="TikTok"
                            >
                                <svg className="w-5 h-5 fill-current text-gray-800 dark:text-white group-hover:text-black dark:group-hover:text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.05a8.16 8.16 0 0 0 4.77 1.52V7.12a4.85 4.85 0 0 1-1-.43z"/>
                                </svg>
                            </a>

                            {/* Instagram */}
                            <a
                                href="https://instagram.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-white/10"
                                aria-label="Instagram"
                            >
                                <Instagram className="w-5 h-5 text-gray-800 dark:text-white group-hover:text-pink-500 transition-colors" />
                            </a>

                            {/* Telegram */}
                            <a
                                href="https://t.me"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-white/10"
                                aria-label="Telegram"
                            >
                                <svg className="w-5 h-5 fill-current text-gray-800 dark:text-white group-hover:text-sky-500 transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.932z"/>
                                </svg>
                            </a>

                            {/* Facebook */}
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-white/10"
                                aria-label="Facebook"
                            >
                                <Facebook className="w-5 h-5 text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors" />
                            </a>
                        </div>
                    </div>
                </div>


                    {/* Main Content Area - Centered with wider margins */}
                    <div className="max-w-[1500px] mx-auto min-h-screen px-1.5 sm:px-16 md:px-24 lg:px-32 xl:px-44 pb-16">
                        {/* Latest Episodes Section - List Design */}
                        <BrowseSection
                            title={i18n.language === 'ar' ? 'تصفح انميات الجديدة' : 'Browse New Animes'}
                            endpoint="/episodes/latest"
                            lang={i18n.language}
                            isRtl={isRtl}
                            isEpisodes={true}
                            queryKeyPrefix="home-latest-episodes"
                        />

                        {/* Latest Animes Section */}
                        <Section
                            title={i18n.language === 'ar' ? 'أحدث الأنميات' : 'Latest Animes'}
                            endpoint="/animes/latest"
                            type="anime"
                            limit={12}
                            showActionButtons={false}
                            lang={i18n.language}
                        />

                        {/* Latest Manga Section */}
                        <Section
                            title={i18n.language === 'ar' ? 'أحدث المانجا' : 'Latest Manga'}
                            endpoint="/animes/type/manga"
                            type="manga"
                            limit={12}
                            showActionButtons={false}
                            lang={i18n.language}
                        />
                    </div>
                </>

            <Footer />
        </div>
    );
}

const Section = ({ title, endpoint, type, limit, showSearch, search, setSearch, showActionButtons, onSearchClick, onFilterClick, showLink, linkTarget, lang }: any) => {
    const { elementRef, hasIntersected } = useIntersectionObserver({ threshold: 0.1 });

    // Hover state management
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Load More state
    const [displayLimit, setDisplayLimit] = useState(limit);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleMouseEnter = (index: number) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredCardIndex(index);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCardIndex(null);
        }, 100);
    };

    const keepCardOpen = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    const { data: items, isLoading: isQueryLoading } = useQuery({
        queryKey: [endpoint, displayLimit],
        queryFn: async () => (await api.get(endpoint, { params: { limit: displayLimit } })).data,
        enabled: hasIntersected,
        staleTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
    });

    const isLoading = (!hasIntersected || isQueryLoading) && !items;

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        setDisplayLimit((prev: number) => prev + 12);
        setTimeout(() => setIsLoadingMore(false), 500);
    };

    const canLoadMore = items && items.length >= displayLimit;

    // Use a wider grid since there is no sidebar (e.g. up to 7 cols on XL)
    const gridCols = "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-x-1.5 sm:gap-x-4 gap-y-5 sm:gap-y-8";

    return (
        <section className="mb-14" ref={elementRef as React.RefObject<HTMLDivElement>}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-blue-600 dark:bg-white inline-block"></span>
                    {title}
                </h2>

                {showActionButtons && (
                    <div className="flex gap-2">
                        <button
                            onClick={onSearchClick}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#2a2a2a] transition-colors rounded-lg shadow-sm"
                        >
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">
                                {lang === 'ar' ? 'بحث' : 'Search'}
                            </span>
                        </button>
                        <button
                            onClick={onFilterClick}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#2a2a2a] transition-colors rounded-lg shadow-sm"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">
                                {lang === 'ar' ? 'فلترة' : 'Filter'}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                window.innerWidth < 768 ? (
                    <AnimeBrowseMobileSkeleton
                        type={'anime'}
                        count={limit}
                        className={'grid-mode'}
                    />
                ) : (
                    <CrunchyrollSkeleton
                        count={limit}
                        isEpisode={false}
                        layout="grid"
                        gridClassName={gridCols}
                    />
                )
            ) : items?.length > 0 ? (
                <>
                    <div className={cn(gridCols, "relative z-0")}>
                        {items.map((item: any, index: number) => (
                            <CardItem
                                key={item.id}
                                item={item}
                                index={index}
                                type={type}
                                lang={lang}
                                isHovered={hoveredCardIndex === index}
                                onMouseEnter={() => handleMouseEnter(index)}
                                onMouseLeave={handleMouseLeave}
                                keepCardOpen={keepCardOpen}
                            />
                        ))}
                    </div>

                    {/* Load More Button */}
                    {canLoadMore && (
                        <div className="flex justify-center mt-10">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-8 py-3 bg-white dark:bg-white text-black dark:text-black font-bold border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-gray-100 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-full"
                            >
                                {isLoadingMore ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent animate-spin"></div>
                                        <span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                                    </div>
                                ) : (
                                    lang === 'ar' ? 'عرض المزيد' : 'Load More'
                                )}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-10 text-gray-500 font-medium">No content found</div>
            )}
        </section>
    );
};

// ─── Component: Browse Section ──────────────────────────────────────────────────

function BrowseSection({ title, endpoint, lang, isRtl, isEpisodes, queryKeyPrefix = 'browse' }: { title: string; endpoint: string; lang: string; isRtl: boolean; isEpisodes?: boolean; queryKeyPrefix?: string }) {
    const { elementRef, hasIntersected } = useIntersectionObserver({ threshold: 0.1 });
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [searchQuery] = useState('');
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isFilterMenuOpen && filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterMenuOpen]);

    const handleMouseEnter = (index: number) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredCardIndex(index);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => setHoveredCardIndex(null), 100);
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: [queryKeyPrefix, endpoint, selectedLetter, searchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 14,
                letter: selectedLetter || '',
                search: searchQuery,
            };
            const response = await api.get(endpoint, { params });
            return response.data;
        },
        initialPageParam: 1,
        enabled: hasIntersected,
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            if (!lastPage || lastPage.length < 14) return undefined;
            return allPages.length + 1;
        },
        staleTime: 5 * 60 * 1000,
    });

    const isLoadingState = (!hasIntersected || isLoading) && !data;

    const allItems = useMemo(() => data?.pages.flat() || [], [data]);
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lettersDisplay = ALPHABET;

    // Wider grid since no sidebar
    const gridCols = "grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-x-1.5 sm:gap-x-4 gap-y-5 sm:gap-y-8";

    return (
        <div ref={elementRef as React.RefObject<HTMLDivElement>}>
        <section className="mb-14" ref={filterMenuRef}>
            {/* Header */}
            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6 text-base font-bold">
                    <button
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={cn("flex items-center gap-2 text-gray-900 dark:text-white transition-colors", isFilterMenuOpen ? "text-blue-500" : "hover:text-gray-600 dark:hover:text-gray-300")}
                    >
                        <Filter className="w-5 h-5" />
                        <span>{isRtl ? 'فلتر' : 'Filter'}</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isFilterMenuOpen && "rotate-180")} />
                    </button>
                    <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <ArrowUpDown className="w-5 h-5" />
                        <span>{isRtl ? 'أبجدي' : 'Alphabetical'}</span>
                    </button>
                    {isEpisodes && (
                        <div className="flex items-center bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-lg">
                            <button
                                onClick={() => setLayout('grid')}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    layout === 'grid' ? "bg-white dark:bg-[#2a2a2a] shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                                title={lang === 'ar' ? "شبكة" : "Grid"}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setLayout('list')}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    layout === 'list' ? "bg-white dark:bg-[#2a2a2a] shadow-sm text-black dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                )}
                                title={lang === 'ar' ? "قائمة" : "List"}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-blue-600 dark:bg-white inline-block"></span>
                    {title}
                </h2>
            </div>

            {/* Categories Mega Menu - appears BELOW header row */}
            <div
                className={cn(
                    "w-full z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden transition-all duration-300 mb-4",
                    isFilterMenuOpen
                        ? "max-h-[800px] opacity-100"
                        : "max-h-0 opacity-0 pointer-events-none border-transparent dark:border-transparent"
                )}
            >
                <CategoriesMenuContent
                    onClose={() => setIsFilterMenuOpen(false)}
                    isVisible={isFilterMenuOpen}
                />
            </div>

            {/* Alphabet Bar */}
            <div className="w-full border-b border-gray-200 dark:border-neutral-800 py-3 flex justify-center sticky top-[60px] z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md mb-6 transition-colors">
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 text-sm md:text-base font-bold text-gray-500 dark:text-gray-500 uppercase">
                    <button
                        onClick={() => setSelectedLetter(null)}
                        className={`hover:text-black dark:hover:text-white transition-colors ${selectedLetter === null ? 'text-black dark:text-white underline decoration-2' : ''}`}
                    >
                        #
                    </button>
                    {lettersDisplay.map((letter) => (
                        <button
                            key={letter}
                            onClick={() => setSelectedLetter(letter)}
                            className={`hover:text-black dark:hover:text-white transition-colors ${selectedLetter === letter ? 'text-black dark:text-white underline decoration-2' : ''}`}
                        >
                            {letter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            <div className={layout === 'list' && isEpisodes ? "flex flex-col gap-2 relative z-0" : `${gridCols} relative z-0`}>
                {isLoadingState ? (
                    window.innerWidth < 768 ? (
                        <AnimeBrowseMobileSkeleton
                            type={isEpisodes && layout === 'list' ? 'episode' : 'anime'}
                            count={14}
                        />
                    ) : (
                        <CrunchyrollSkeleton count={14} isEpisode={isEpisodes} layout={layout === 'list' && isEpisodes ? 'list' : 'grid'} className="!bg-transparent" gridClassName={gridCols} />
                    )
                ) : allItems.length > 0 ? (
                    allItems.map((item: any, index: number) => (
                        layout === 'list' && isEpisodes ? (
                            <ListItem
                                key={item.id}
                                item={item}
                                lang={lang}
                            />
                        ) : (
                            <CardItem
                                key={item.id}
                                item={item}
                                index={index}
                                type={isEpisodes ? 'episode' : 'anime'}
                                lang={lang}
                                isHovered={hoveredCardIndex === index}
                                onMouseEnter={() => handleMouseEnter(index)}
                                onMouseLeave={handleMouseLeave}
                                keepCardOpen={() => {
                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                }}
                            />
                        )
                    ))
                ) : (
                    <div className="col-span-full text-center py-10 text-gray-500 font-medium">
                        {isRtl ? 'لا توجد نتائج' : 'No results found'}
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasNextPage && (
                <div className="flex justify-center mt-10">
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-8 py-3 bg-white dark:bg-white text-black dark:text-black font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-100 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-full"
                    >
                        {isFetchingNextPage ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                                <span>{isRtl ? 'جاري التحميل...' : 'Loading...'}</span>
                            </>
                        ) : (
                            <span>{isRtl ? 'عرض المزيد' : 'Show More'}</span>
                        )}
                    </button>
                </div>
            )}
        </section>
        </div>
    );
}

// ─── Grid Item Design ──────────────────────────────────────────────────────────

const CardItem = ({ item, index, type, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const isEpisode = type === 'episode';

    const animeObj = item.anime || item.series;

    // Logic matching Vue
    const image = animeObj?.cover || item.cover || item.image || item.banner;
    const title = lang === 'ar' ? (item.title || item.series?.title || item.anime?.title) : (item.title_en || item.series?.title_en || item.title || item.anime?.title_en);

    // For episodes, format needs to assume structure
    const displayTitle = title || 'عنوان غير متوفر';
    const subText = isEpisode ? (lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`) : (type === 'manga' ? (lang === 'ar' ? 'مانجا' : 'Manga') : (item?.status || item?.type || ''));

    const animeId = animeObj?.id || item.anime_id || item.id;

    // SEO Slug Logic
    const animeTitleForSlug = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || item.title);
    const slug = slugify(animeTitleForSlug);

    const targetLink = isEpisode
        ? `/${lang}/watch/${animeId}/${item.episode_number}/${slug}`
        : `/${lang}/animes/${item.id}/${slug}`;

    return (
        <div
            className="group cursor-pointer relative z-0 flex flex-col"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Link to={targetLink} className="flex flex-col w-full h-full">
                {/* Cover Container */}
                <div className={`relative flex-shrink-0 w-full aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] transition-transform duration-300 rounded-none`}>
                    <SpinnerImage
                        src={getImageUrl(image)}
                        alt={displayTitle}
                        className="w-full h-full"
                        imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>

                {/* Metadata Below Card */}
                <div className="mt-2.5 text-center flex flex-col items-center flex-1 w-full px-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-xs md:text-sm line-clamp-2 leading-relaxed group-hover:text-blue-500 transition-colors">
                        {renderEmojiContent(displayTitle)}
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        {renderEmojiContent(subText)}
                    </p>
                </div>
            </Link>

            {/* Hover Card Component */}
            {isHovered && (
                <div className="absolute inset-0 z-50 pointer-events-none md:pointer-events-auto">
                    <AnimeHoverCard
                        data={item}
                        lang={lang}
                        onMouseEnter={keepCardOpen}
                        onMouseLeave={onMouseLeave}
                    />
                </div>
            )}
        </div>
    );
};

// ─── List Item Design ──────────────────────────────────────────────────────────

const ListItem = ({ item, lang }: any) => {
    const animeObj = item.anime || item.series;
    const image = animeObj?.cover || item.cover || item.image || item.banner || item.thumbnail;
    const title = lang === 'ar' ? (item.title || item.series?.title || item.anime?.title) : (item.title_en || item.series?.title_en || item.title || item.anime?.title_en);
    const displayTitle = title || (lang === 'ar' ? 'عنوان غير متوفر' : 'No Title Available');

    const animeTitle = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || item.title);
    const subText = `${animeTitle} - ${lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`}`;
    const animeId = animeObj?.id || item.anime_id || item.id;
    const slug = slugify(animeTitle);

    const targetLink = `/${lang}/watch/${animeId}/${item.episode_number}/${slug}`;

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}${targetLink}`;
        navigator.clipboard.writeText(url);
        toast.success(lang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!');
    };

    return (
        <div className="group flex items-center gap-0 px-2 md:px-3 py-2 border-b border-gray-100 dark:border-white/5 last:border-0 transition-all hover:bg-white dark:hover:bg-[#222] hover:shadow-sm">
            <Link to={targetLink} className="flex-1 flex items-center min-w-0">
                <div className="w-24 md:w-32 flex-shrink-0 aspect-video rounded-none overflow-hidden bg-gray-100 dark:bg-[#1a1a1a] ml-3 rtl:ml-0 rtl:mr-3 relative transition-transform">
                    <img src={getImageUrl(image)} alt={displayTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md fill-white" />
                    </div>
                </div>

                <div className="flex-1 min-w-0 px-2 md:px-3">
                    <h4 className="text-sm md:text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                        {renderEmojiContent(displayTitle)}
                    </h4>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {renderEmojiContent(subText)}
                    </p>
                </div>
            </Link>

            <div className="flex-shrink-0 flex items-center min-w-[70px] justify-end ml-2 rtl:ml-0 rtl:mr-2">
                <span className="text-xs text-gray-400 group-hover:hidden whitespace-nowrap font-medium transition-opacity">
                    {lang === 'ar' ? `حلقة ${item.episode_number}` : `Ep ${item.episode_number}`}
                </span>

                <div className="hidden group-hover:flex items-center gap-1">
                    <WatchLaterButton
                        animeId={Number(animeId)}
                        episodeId={Number(item.id)}
                        episodeTitle={displayTitle}
                        episodeNumber={item.episode_number}
                        episodeImage={getImageUrl(image)}
                        variant="default"
                        className="p-1.5 h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-0 border-transparent hover:border-gray-100 dark:hover:border-transparent transition-all"
                        showLabel={false}
                    />
                    <button
                        onClick={handleShare}
                        className="p-1.5 h-8 w-8 rounded-md hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors"
                        title={lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
