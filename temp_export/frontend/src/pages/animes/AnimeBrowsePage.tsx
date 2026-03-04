import { useState, useEffect, useRef, useMemo } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Star, ThumbsUp, Filter, Facebook, Twitter, Instagram, Youtube, Mail, Globe, UserPlus, LogIn, ShieldAlert, Home, Sparkles, Monitor, Film, PlayCircle, LayoutGrid, ArrowUp, Moon, Sun, ArrowUpDown } from "lucide-react";
import AnimeListHoverCard from "@/components/AnimeListHoverCard";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import SearchModal from "@/components/modals/SearchModal";
import FilterModal from "@/components/modals/FilterModal";
import SearchAnimeModal from "@/components/modals/SearchAnimeModal";
import FilterAnimeModal from "@/components/modals/FilterAnimeModal";
import { SocialNavSidebar } from "@/components/social/SocialNavSidebar";
import { NewsTicker } from "@/components/common/NewsTicker";
import Footer from "@/components/common/Footer";
import { renderEmojiContent } from "@/utils/render-content";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useTheme } from "@/components/theme-provider";

const BASE_URL = '';

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function AnimeBrowsePage() {
    const { i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const isRtl = i18n.language === 'ar';
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isSearchAnimeModalOpen, setIsSearchAnimeModalOpen] = useState(false);
    const [isFilterAnimeModalOpen, setIsFilterAnimeModalOpen] = useState(false);

    // Simulate initial loading to match Vue
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLanguageSelect = (lang: string) => {
        if (i18n.language === lang) return;
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);

        // Check if first segment is a language code
        if (pathSegments.length > 0 && (pathSegments[0] === 'ar' || pathSegments[0] === 'en')) {
            pathSegments[0] = lang;
            navigate(`/${pathSegments.join('/')}`);
        } else {
            navigate(`/${lang}${currentPath}`);
        }
    };

    const seoTitle = i18n.language === 'ar' ? 'الرئيسية - AnimeLast' : 'Home - AnimeLast';

    return (
        <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet>
                <title>{seoTitle}</title>
            </Helmet>

            <div className="w-full">
                <NewsTicker />
                {/* Modals */}
                <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
                <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
                <SearchAnimeModal isOpen={isSearchAnimeModalOpen} onClose={() => setIsSearchAnimeModalOpen(false)} />
                <FilterAnimeModal isOpen={isFilterAnimeModalOpen} onClose={() => setIsFilterAnimeModalOpen(false)} />

                {/* Main Layout with Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible">

                    {/* Left Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Content - Flex grow to fill remaining space */}
                    <div className="col-span-1 lg:col-span-9 px-2 sm:px-6 md:px-8 pt-3 pb-8 lg:pt-5">
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Latest Episodes Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أحدث الحلقات' : 'Latest Episodes'}
                                    endpoint="/episodes/latest"
                                    type="episode"
                                    limit={15}
                                    showActionButtons={true}
                                    onSearchClick={() => setIsSearchModalOpen(true)}
                                    onFilterClick={() => setIsFilterModalOpen(true)}
                                    lang={i18n.language}
                                />

                                {/* Browse All Section */}
                                <BrowseAllSection lang={i18n.language} isRtl={isRtl} />

                                {/* Latest Animes Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أحدث الأنميات' : 'Latest Animes'}
                                    endpoint="/animes/latest"
                                    type="anime"
                                    limit={12}
                                    showActionButtons={true}
                                    onSearchClick={() => setIsSearchAnimeModalOpen(true)}
                                    onFilterClick={() => setIsFilterAnimeModalOpen(true)}
                                    lang={i18n.language}
                                />

                                {/* Movies Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أفلام مختارة' : 'Selected Movies'}
                                    endpoint="/animes/type/movie"
                                    type="movie"
                                    limit={12}
                                    showLink={true}
                                    linkTarget={`/${i18n.language}/movies`}
                                    lang={i18n.language}
                                />

                                {/* TV Series Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'مسلسلات أنمي تلفزيونية' : 'TV Series'}
                                    endpoint="/animes/type/TV"
                                    type="anime"
                                    limit={12}
                                    showLink={true}
                                    linkTarget="/tv-series"
                                    lang={i18n.language}
                                />

                                {/* Top Animes */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أنميات بتقييم عالي' : 'High Rated Animes'}
                                    endpoint="/animes/top-rated"
                                    type="anime"
                                    limit={12}
                                    showLink={true}
                                    linkTarget={`/${i18n.language}/animes`}
                                    lang={i18n.language}
                                />
                            </>
                        )}
                    </div>
                    {/* End Main Content */}

                </div>
                {/* End Main Layout with Sidebar */}

                {/* Advanced Footer */}
                <Footer />
            </div>
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
        placeholderData: (previousData) => previousData, // keepPreviousData logic in v5
    });

    const isLoading = (!hasIntersected || isQueryLoading) && !items;

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        setDisplayLimit((prev: number) => prev + 12);
        setTimeout(() => setIsLoadingMore(false), 500);
    };

    const canLoadMore = (type === 'episode' || type === 'anime') && items && items.length >= displayLimit;

    return (
        <section className="mb-10" ref={elementRef as React.RefObject<HTMLDivElement>}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>

                {showActionButtons && (
                    <div className="flex gap-2">
                        <button
                            onClick={onSearchClick}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">
                                {lang === 'ar' ? 'بحث' : 'Search'}
                            </span>
                        </button>
                        <button
                            onClick={onFilterClick}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">
                                {lang === 'ar' ? 'فلترة' : 'Filter'}
                            </span>
                        </button>
                    </div>
                )}

                {showSearch && (
                    <div className="relative w-64 hidden md:block">
                        <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2 cursor-pointer" style={{ right: lang === 'ar' ? 'unset' : '0.75rem', left: lang === 'ar' ? '0.75rem' : 'unset' }} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            type="text"
                            placeholder={lang === 'ar' ? "بحث..." : "Search..."}
                            className="w-full px-4 py-2 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-black dark:focus:border-white transition-colors"
                        />
                    </div>
                )}

                {showLink && (
                    <Link to={linkTarget} className="text-sm text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        {lang === 'ar' ? 'عرض الكل' : 'View All'}
                    </Link>
                )}
            </div>

            {isLoading ? (
                <CrunchyrollSkeleton
                    count={limit}
                    isEpisode={type === 'episode'}
                    layout={window.innerWidth < 768 ? 'list' : 'grid'}
                    gridClassName={type === 'episode' ? "flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-3 lg:grid-cols-5"}
                />
            ) : items?.length > 0 ? (
                <>
                    <div className={`
                        ${type === 'episode'
                            ? 'flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3'
                            : 'grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-3 lg:grid-cols-5'} 
                        relative z-0
                    `}>
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
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
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
                <div className="text-center py-10 text-gray-500">No content found</div>
            )}
        </section>
    );
};

import { slugify } from "@/utils/slug";

// ─── Browse All Section ───────────────────────────────────────────────────────

const getValidImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanPath}`;
};

function ListItem({ anime, lang, isRtl }: { anime: any; lang: string; isRtl: boolean }) {
    const title = lang === 'ar' ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
    const description = lang === 'ar'
        ? (anime.description || anime.series?.description || 'لا يوجد وصف متاح')
        : (anime.description_en || anime.series?.description_en || 'No description available');
    const image = anime.cover || anime.banner;

    return (
        <Link
            to={`/${lang}/animes/${anime.id}`}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10"
        >
            <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] flex-shrink-0 relative overflow-hidden">
                <img
                    src={getValidImageUrl(image)}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading="lazy"
                />
            </div>
            <div className="flex-1 flex flex-col items-start py-0 md:py-2 text-right w-full min-w-0">
                <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-2 md:line-clamp-1">
                    {title}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 font-normal">
                    {description}
                </p>
                <div className="mt-auto flex items-center gap-2 md:gap-4 w-full pt-1 md:pt-3">
                    <span className="text-[10px] md:text-xs font-bold text-black dark:text-white">
                        {isRtl ? 'مترجم' : 'Translated'}
                    </span>
                    {anime.rating && (
                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-500">
                            <span className="text-yellow-500">★</span>
                            <span>{anime.rating}</span>
                        </div>
                    )}
                    <div className="hidden md:block flex-1 text-left rtl:text-left ltr:text-right">
                        <span className="text-xs text-gray-400 font-mono">
                            {typeof anime.season === 'string' ? anime.season : (anime.season?.name || 'SEASON 1')}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function BrowseAllSection({ lang, isRtl }: { lang: string; isRtl: boolean }) {
    const [selectedType, setSelectedType] = useState<'All' | 'TV' | 'Movie'>('All');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [searchQuery] = useState('');

    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        queryKey: ['home-browse-all', selectedType, selectedLetter, searchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 10,
                letter: selectedLetter || '',
                search: searchQuery,
                type: selectedType === 'All' ? '' : selectedType,
            };
            const response = await api.get('/animes', { params });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any, allPages: any[]) =>
            lastPage.length === 10 ? allPages.length + 1 : undefined,
        staleTime: 5 * 60 * 1000,
    });

    const allAnimes = useMemo(() => data?.pages.flat() || [], [data]);

    const lettersDisplay = isRtl ? [...ALPHABET].reverse() : ALPHABET;

    return (
        <section className="mb-10">
            {/* Header */}
            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-6 text-base font-bold">
                    <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Filter className="w-5 h-5" />
                        <span>{isRtl ? 'فلتر' : 'Filter'}</span>
                    </button>
                    <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <ArrowUpDown className="w-5 h-5" />
                        <span>{isRtl ? 'أبجدي' : 'Alphabetical'}</span>
                    </button>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {isRtl ? 'تصفح كل الأنميات' : 'Browse All Animes'}
                </h2>
            </div>

            {/* Alphabet Bar */}
            <div className="w-full border-b border-gray-200 dark:border-neutral-800 py-3 flex justify-center sticky top-[60px] z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md mb-6">
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

            {/* Anime List */}
            <div className="flex flex-col gap-6">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex flex-row gap-4 animate-pulse">
                            <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] bg-gray-200 dark:bg-neutral-800 flex-shrink-0" />
                            <div className="flex-1 space-y-3 py-2">
                                <div className="h-5 bg-gray-200 dark:bg-neutral-800 w-1/3" />
                                <div className="h-4 bg-gray-200 dark:bg-neutral-800 w-full" />
                                <div className="h-4 bg-gray-200 dark:bg-neutral-800 w-3/4" />
                            </div>
                        </div>
                    ))
                ) : allAnimes.length > 0 ? (
                    allAnimes.map((anime: any, index: number) => (
                        <div
                            key={anime.id}
                            className="relative group"
                            onMouseEnter={() => handleMouseEnter(index)}
                            onMouseLeave={handleMouseLeave}
                        >
                            <ListItem anime={anime} lang={lang} isRtl={isRtl} />
                            {hoveredCardIndex === index && (
                                <div className="absolute top-0 z-20 h-auto min-h-full left-0 right-0 w-full">
                                    <AnimeListHoverCard data={anime} lang={lang} className="h-full w-full" />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-gray-500">
                        {isRtl ? 'لا توجد نتائج' : 'No results found'}
                    </div>
                )}
            </div>

            {/* Load More */}
            {hasNextPage && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
    );
}

const CardItem = ({ item, index, type, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const isEpisode = type === 'episode';
    const isAnime = type === 'anime';
    const showDescription = isEpisode || isAnime;

    // Logic matching Vue
    const image = isEpisode ? item.banner || item.image : item.image || item.cover;
    const title = lang === 'ar' ? (item.title || item.series?.title) : (item.title_en || item.series?.title_en || item.title);

    // For episodes, format needs to assume structure
    const displayTitle = title || 'عنوان غير متوفر';
    const subText = isEpisode ? (item.title || `الحلقة ${item.episode_number}`) : (item.status || 'مستمر');

    // Description: Arabic or English based on language
    const description = lang === 'ar'
        ? (item.description || item.series?.description || item.anime?.description || '')
        : (item.description_en || item.series?.description_en || item.anime?.description_en || '');

    const year = new Date(item.created_at || Date.now()).getFullYear();

    const animeObj = item.anime || item.series;
    const animeId = animeObj?.id || item.anime_id || item.id;

    // SEO Slug Logic
    const animeTitleForSlug = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || item.title);
    const slug = slugify(animeTitleForSlug);

    const targetLink = isEpisode
        ? `/${lang}/watch/${animeId}/${item.episode_number}/${slug}`
        : `/${lang}/animes/${item.id}/${slug}`;

    return (
        <div
            className="group cursor-pointer relative z-0"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Link to={targetLink} className={`flex ${isEpisode ? 'flex-row gap-3 md:flex-col md:gap-0' : 'flex-col'} w-full h-full`}>
                {/* Cover Container */}
                <div className={`relative flex-shrink-0 ${isEpisode ? 'w-[140px] md:w-full aspect-video' : 'w-full aspect-[2/3]'} overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-1`}>
                    <SpinnerImage
                        src={getImageUrl(image)}
                        alt={displayTitle}
                        className="w-full h-full"
                        imageClassName="object-cover"
                    />

                    {/* Badges */}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 ${isEpisode ? 'bg-black/80' : 'bg-black/80'}`}>
                        {isEpisode ? item.episode_number : (item.type === 'tv' ? 'مسلسل' : 'فيلم')}
                    </div>

                </div>

                {/* Metadata Below Card */}
                <div className={`px-0 md:px-1 ${isEpisode ? 'flex-1 flex flex-col items-start text-right py-0 md:py-2' : 'space-y-1 text-center mt-2'}`}>
                    <h3 className={`font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight ${isEpisode ? 'text-sm md:text-base mb-1' : 'text-sm'}`}>
                        {renderEmojiContent(displayTitle)}
                    </h3>
                    {showDescription && description && (
                        <p className="text-[12.5px] text-gray-700 dark:text-gray-300 line-clamp-3 md:line-clamp-2 leading-snug text-start mb-1">
                            {description}
                        </p>
                    )}
                    {isEpisode ? (
                        <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white mt-1">
                            {lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`}
                        </p>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {renderEmojiContent(subText)}
                        </p>
                    )}
                    <div className="flex items-center justify-center gap-3 pt-1">
                        {isEpisode ? (
                            <>
                                <div className="flex items-center gap-1.5 text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
                                    <ThumbsUp className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                    <span className="text-xs md:text-sm font-black">{item.likes_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                    <span className="text-xs md:text-sm font-black whitespace-nowrap uppercase tracking-wide">
                                        {item.views_count || 0} {lang === 'ar' ? 'مشاهدة' : 'Views'}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span className="text-[10px] font-bold">{item.rating || 'N/A'}</span>
                                </div>
                                <span className="text-gray-600">•</span>
                                <span className="text-[10px] font-bold">{year}</span>
                            </>
                        )}
                    </div>
                </div>
            </Link>

            {/* Hover Card Component - Covers full card with gradient */}
            {isHovered && (
                <div className="absolute inset-0 z-50">
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
