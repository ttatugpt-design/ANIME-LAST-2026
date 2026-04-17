import { useState, useEffect, useRef, useMemo } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Star, ThumbsUp, Filter, Facebook, Twitter, Instagram, Youtube, Mail, Globe, UserPlus, LogIn, ShieldAlert, Home, Sparkles, Monitor, Film, PlayCircle, LayoutGrid, ArrowUp, Moon, Sun, ArrowUpDown, List, Share2, Play, ChevronDown } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { CategoriesMenuContent } from '@/components/header/CategoriesMenuContent';

import { getImageUrl } from '@/utils/image-utils';
import { slugify } from "@/utils/slug";
import { getDetailsUrl } from "@/utils/navigation";

export default function PublicMangasPage() {
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

    const seoTitle = i18n.language === 'ar' ? 'المانجا - AnimeLast' : 'Manga - AnimeLast';

    return (
        <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet>
                <title>{seoTitle}</title>
            </Helmet>

            {/* NewsTicker wrapper with min-height to prevent layout jump */}
            <div className="min-h-[45px]">
                <NewsTicker />
            </div>

            {/* Modals */}
            <SearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
            <FilterModal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} />
            <SearchAnimeModal isOpen={isSearchAnimeModalOpen} onClose={() => setIsSearchAnimeModalOpen(false)} />
            <FilterAnimeModal isOpen={isFilterAnimeModalOpen} onClose={() => setIsFilterAnimeModalOpen(false)} />

            {/* Main Layout - Same as CommunityPage                        {/* Main Grid: Custom widths for narrower sidebar */}
            <div className="w-full min-h-screen">
                <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] gap-0 overflow-visible min-h-screen">

                    {/* Left Sidebar - SocialNavSidebar */}
                    <div className="hidden lg:block sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30 border-r border-gray-100 dark:border-[#333]/50">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Content - wider width */}
                    <div className="min-w-0 w-full px-2 sm:px-6 md:px-8 pt-3 pb-8 lg:pt-5">
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Browse All Section */}
                                <BrowseSection
                                    title={i18n.language === 'ar' ? 'تصفح كل المانجا' : 'Browse All Manga'}
                                    endpoint="/animes"
                                    lang={i18n.language}
                                    isRtl={isRtl}
                                />

                                {/* Latest Manga Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أحدث المانجا' : 'Latest Manga'}
                                    endpoint="/animes/type/manga"
                                    type="manga"
                                    limit={12}
                                    showActionButtons={true}
                                    onSearchClick={() => setIsSearchAnimeModalOpen(true)}
                                    onFilterClick={() => setIsFilterAnimeModalOpen(true)}
                                    lang={i18n.language}
                                />
                            </>
                        )}
                    </div>
                    {/* End Main Content */}
                </div>
                {/* End Main Layout with Sidebar */}
            </div>

            {/* Advanced Footer */}
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
        placeholderData: (previousData) => previousData, // keepPreviousData logic in v5
    });

    const isLoading = (!hasIntersected || isQueryLoading) && !items;

    const handleLoadMore = async () => {
        setIsLoadingMore(true);
        setDisplayLimit((prev: number) => prev + 12);
        setTimeout(() => setIsLoadingMore(false), 500);
    };

    const canLoadMore = items && items.length >= displayLimit;

    const gridCols = "grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-8";

    return (
        <section className="mb-10" ref={elementRef as React.RefObject<HTMLDivElement>}>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>

                {showActionButtons && (
                    <div className="flex gap-2">
                        <button
                            onClick={onSearchClick}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#2a2a2a] transition-all shadow-sm rounded-lg"
                        >
                            <Search className="w-4 h-4" />
                            <span className="hidden sm:inline text-sm font-medium">
                                {lang === 'ar' ? 'بحث' : 'Search'}
                            </span>
                        </button>
                        <button
                            onClick={onFilterClick}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#2a2a2a] transition-all shadow-sm rounded-lg"
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
                            className="w-full px-4 py-2 bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-black dark:focus:border-white transition-all shadow-sm rounded-lg"
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
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoadingMore}
                                className="px-8 py-2.5 bg-white dark:bg-white text-black dark:text-black font-bold border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-gray-100 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-full hover:shadow-md"
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


// ─── Component: Browse Section ──────────────────────────────────────────────────

function BrowseSection({ title, endpoint, lang, isRtl, isEpisodes }: { title: string; endpoint: string; lang: string; isRtl: boolean; isEpisodes?: boolean }) {
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
        queryKey: ['browse-section-manga', endpoint, selectedLetter, searchQuery],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 12,
                letter: selectedLetter || '',
                search: searchQuery,
                type: 'manga',
            };
            const response = await api.get(endpoint, { params });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            if (!lastPage || lastPage.length < 12) return undefined;
            return allPages.length + 1;
        },
        staleTime: 5 * 60 * 1000,
    });

    const allItems = useMemo(() => data?.pages.flat() || [], [data]);

    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lettersDisplay = ALPHABET;

    return (
        <section className="mb-14 relative" ref={filterMenuRef}>
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
                    <div className="flex items-center bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm">
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
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {title}
                </h2>
            </div>

            {/* Categories Mega Menu */}
            <div
                className={cn(
                    "absolute top-12 left-0 right-0 z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border border-gray-100 dark:border-neutral-800 rounded-xl overflow-hidden transition-all duration-300",
                    isFilterMenuOpen
                        ? "max-h-[800px] opacity-100 translate-y-0"
                        : "max-h-0 opacity-0 -translate-y-1 pointer-events-none border-transparent dark:border-transparent pb-0"
                )}
            >
                <div>
                    <CategoriesMenuContent
                        onClose={() => setIsFilterMenuOpen(false)}
                        isVisible={isFilterMenuOpen}
                    />
                </div>
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

            {/* Content List */}
            <div className={layout === 'list' && isEpisodes ? "flex flex-col gap-2 relative z-0" : "grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-4 gap-y-8 relative z-0"}>
                {isLoading ? (
                    window.innerWidth < 768 ? (
                        <AnimeBrowseMobileSkeleton
                            type={isEpisodes && layout === 'list' ? 'episode' : 'anime'}
                            count={12}
                        />
                    ) : (
                        <CrunchyrollSkeleton count={12} isEpisode={isEpisodes} layout={layout === 'list' && isEpisodes ? 'list' : 'grid'} className="!bg-transparent" />
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
                    <div className="col-span-full text-center py-10 text-gray-500">
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
                        className="px-8 py-2.5 bg-white dark:bg-white text-black dark:text-black font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-100 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rounded-full"
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

// ─── Grid Item Design ──────────────────────────────────────────────────────────

const CardItem = ({ item, index, type, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const isEpisode = type === 'episode';

    const animeObj = item.anime || item.series;

    // Logic matching Vue
    const image = animeObj?.cover || item.cover || item.image || item.banner;
    const title = lang === 'ar' ? (item.title || item.series?.title || item.anime?.title) : (item.title_en || item.series?.title_en || item.title || item.anime?.title_en);

    // For episodes, format needs to assume structure
    const displayTitle = title || 'عنوان غير متوفر';
    const subText = isEpisode ? (lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`) : (lang === 'ar' ? 'مانجا' : 'Manga');

    const animeId = animeObj?.id || item.anime_id || item.id;

    // SEO Slug Logic
    const animeTitleForSlug = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || item.title);
    const slug = slugify(animeTitleForSlug);

// ... (in CardItem)
    const targetLink = isEpisode
        ? `/${lang}/watch/${animeId}/${item.episode_number}/${slug}`
        : getDetailsUrl(item, lang);

    return (
        <div
            className="group cursor-pointer relative z-0 flex flex-col"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Link to={targetLink} className="flex flex-col w-full h-full">
                {/* Cover Container */}
                <div className={`relative flex-shrink-0 w-full aspect-[3/4] overflow-hidden bg-white dark:bg-[#1c1c1c] transition-transform duration-300 border border-transparent group-hover:border-gray-100 dark:group-hover:border-white/5`}>
                    <SpinnerImage
                        src={getImageUrl(image)}
                        alt={displayTitle}
                        className="w-full h-full"
                        imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>

                {/* Metadata Below Card */}
                <div className="mt-2.5 text-center flex flex-col items-center flex-1 w-full px-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-xs md:text-sm line-clamp-2 leading-relaxed group-hover:text-red-500 transition-colors">
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
                <div className="w-24 md:w-32 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-white dark:bg-[#1a1a1a] ml-3 rtl:ml-0 rtl:mr-3 relative border border-gray-100 dark:border-white/5 shadow-sm">
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
                <span className="text-xs text-gray-400 group-hover:hidden whitespace-nowrap font-medium">
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
                        className="p-1.5 h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-0 border-transparent hover:border-gray-100 dark:hover:border-transparent transition-all shadow-sm"
                        showLabel={false}
                    />
                    <button
                        onClick={handleShare}
                        className="p-1.5 h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all border border-transparent hover:border-gray-100 dark:hover:border-transparent shadow-sm"
                        title={lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
