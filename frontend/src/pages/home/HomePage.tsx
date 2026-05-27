import React, { useState, useEffect, useRef, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryClient as globalQueryClient } from '@/lib/react-query';
import { Search, Star, ThumbsUp, Filter, Facebook, Twitter, Instagram, Youtube, Mail, Globe, UserPlus, LogIn, ShieldAlert, Home, Sparkles, Monitor, Film, PlayCircle, LayoutGrid, ArrowUp, Moon, Sun, ArrowUpDown, List, Share2, Play, ChevronDown, BookOpen, MessageCircle, Eye, Newspaper } from "lucide-react";
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



interface QuickNews {
    id: number;
    description: string;
    description_en: string;
    image?: string;
    url?: string;
    url_en?: string;
}

const QuickNewsHero = ({ lang, isRtl }: { lang: string; isRtl: boolean }) => {
    const { data: newsItems } = useQuery<QuickNews[]>({
        queryKey: ['quick-news'],
        queryFn: async () => (await api.get('/quick-news')).data,
        staleTime: 5 * 60 * 1000,
    });

    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-slide logic
    useEffect(() => {
        if (!newsItems || newsItems.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % newsItems.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [newsItems]);

    if (!newsItems || newsItems.length === 0) return null;

    const news = newsItems[currentIndex];
    const title = isRtl ? news.description : (news.description_en || news.description);
    const linkUrl = isRtl ? news.url : (news.url_en || news.url);

    return (
        <div className="relative w-full h-[55vh] md:h-[70vh] xl:h-[80vh] bg-black overflow-hidden group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute inset-0"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_e, { offset }) => {
                        const swipe = offset.x;
                        if (swipe < -50) { // Swipe Left
                            setCurrentIndex((prev) => (prev + 1) % newsItems.length);
                        } else if (swipe > 50) { // Swipe Right
                            setCurrentIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length);
                        }
                    }}
                >
                    {/* Background Image */}
                    {news.image && (
                        <img
                            src={getImageUrl(news.image)}
                            alt={title}
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                            fetchPriority="high"
                        />
                    )}
                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-95" />
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-5xl mx-auto h-full justify-end pb-24 md:pb-32">
                        {/* News Badge */}
                        <motion.div 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="flex items-center gap-2 bg-[#FF3D00] px-4 py-1.5 rounded-full mb-6 shadow-lg"
                        >
                            <Newspaper className="w-4 h-4 text-white" />
                            <span className="text-xs md:text-sm font-black text-white uppercase tracking-widest">
                                {isRtl ? 'خبر عاجل' : 'Breaking News'}
                            </span>
                        </motion.div>

                        <motion.h1 
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,1)] mb-10 leading-[1.1] tracking-tight"
                        >
                            {renderEmojiContent(title)}
                        </motion.h1>
                        
                        {linkUrl && (
                            <motion.a
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                href={linkUrl}
                                target={linkUrl.startsWith('http') ? '_blank' : '_self'}
                                rel={linkUrl.startsWith('http') ? 'noopener noreferrer' : ''}
                                className="group/btn flex items-center gap-4 px-10 md:px-14 py-4 md:py-5 bg-white text-black hover:bg-[#FF3D00] hover:text-white font-black rounded-full transition-all duration-500 shadow-2xl hover:shadow-[#FF3D00]/50 hover:scale-110 border-2 border-white hover:border-[#FF3D00]"
                            >
                                <PlayCircle className="w-8 h-8 md:w-10 md:h-10 transition-transform duration-500 group-hover/btn:rotate-[360deg]" />
                                <span className="text-xl md:text-2xl uppercase tracking-tighter">
                                    {isRtl ? 'اضغط هنا لمشاهدة' : 'Click here to watch'}
                                </span>
                            </motion.a>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Slider Dots */}
            {newsItems.length > 1 && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                    {newsItems.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-2.5 transition-all duration-500 rounded-full ${currentIndex === idx ? 'w-10 bg-[#FF3D00]' : 'w-2.5 bg-white/30 hover:bg-white/50'}`}
                            aria-label={`Go to slide ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
            
            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF3D00] to-transparent opacity-50 z-20" />
        </div>
    );
};

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
                {/* Quick News Full-Width Hero */}
                <QuickNewsHero lang={i18n.language} isRtl={isRtl} />


                {/* Main Content Area - Centered with wider margins */}
                <div className="max-w-[1500px] mx-auto min-h-screen px-1.5 sm:px-16 md:px-24 lg:px-32 xl:px-44 pb-16 pt-10">
                    <BrowseSection 
                        mode="latest-animes"
                        lang={i18n.language}
                        isRtl={isRtl}
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

function BrowseSection({ mode, lang, isRtl }: { mode: 'latest-episodes' | 'latest-animes' | 'latest-movies'; lang: string; isRtl: boolean }) {
    const [layout, setLayout] = useState<'grid' | 'list'>(mode === 'latest-episodes' ? 'list' : 'grid');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isEpisodes = mode === 'latest-episodes';
    const endpoint = mode === 'latest-episodes' ? '/episodes/latest' : (mode === 'latest-animes' ? '/animes' : '/animes/type/Movie');
    const sectionTitle = isRtl 
        ? (mode === 'latest-episodes' ? 'تصفح انميات الجديدة' : (mode === 'latest-animes' ? 'أحدث الأنميات' : 'تصفح الأفلام'))
        : (mode === 'latest-episodes' ? 'Browse New Animes' : (mode === 'latest-animes' ? 'Latest Animes' : 'Browse Movies'));

    const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['browse-v2', mode],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 12,
                paginate: true,
            };
            const response = await api.get(endpoint, { params });
            return response.data.data || response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            if (!lastPage || lastPage.length < 12) return undefined;
            return allPages.length + 1;
        },
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allItems = useMemo(() => data?.pages.flat() || [], [data]);

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

    return (
        <section className="mb-14">
            <div className="flex items-center justify-between gap-1 mb-8 p-0">
                <h2 className="text-xl md:text-3xl font-black text-gray-900 dark:text-white leading-none flex items-center gap-3">
                    <span className="w-2 h-8 bg-blue-600 dark:bg-white inline-block rounded-full"></span>
                    {sectionTitle}
                </h2>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        className={cn(
                            "flex items-center gap-2 text-gray-900 dark:text-white transition-colors font-bold",
                            isFilterMenuOpen ? "text-blue-500" : "hover:text-gray-600 dark:hover:text-gray-300"
                        )}
                    >
                        <Filter className="w-5 h-5" />
                        <span className="hidden sm:inline">{isRtl ? 'فلتر' : 'Filter'}</span>
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isFilterMenuOpen && "rotate-180")} />
                    </button>

                    <div className="flex items-center bg-gray-100 dark:bg-white/5 p-1 rounded-full border border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setLayout('grid')}
                            className={cn(
                                "p-2 rounded-full transition-all",
                                layout === 'grid' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-gray-500"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setLayout('list')}
                            className={cn(
                                "p-2 rounded-full transition-all",
                                layout === 'list' ? "bg-white dark:bg-white/10 shadow-sm text-black dark:text-white" : "text-gray-500"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={cn(
                    "w-full z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden transition-all duration-300 mb-8 rounded-2xl",
                    isFilterMenuOpen ? "max-h-[800px] opacity-100 p-6" : "max-h-0 opacity-0 pointer-events-none"
                )}
            >
                <CategoriesMenuContent onClose={() => setIsFilterMenuOpen(false)} isVisible={isFilterMenuOpen} />
            </div>

            <div className={layout === 'list' ? "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"}>
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-gray-100 dark:bg-white/10 animate-pulse rounded-xl" />
                    ))
                ) : allItems.map((item: any, index: number) => (
                    layout === 'list' ? (
                        <ListItem key={item.id} item={item} lang={lang} isEpisode={isEpisodes} />
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
                            keepCardOpen={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
                        />
                    )
                ))}
            </div>

            <div ref={loadMoreRef} className="py-12 flex justify-center">
                {(isFetchingNextPage || hasNextPage) && (
                    <div className="flex flex-col items-center gap-4">
                        <CentralSpinner />
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest animate-pulse">
                            {isRtl ? 'جاري تحميل المزيد...' : 'Loading More...'}
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}

// ─── Grid Item Design ──────────────────────────────────────────────────────────

const CardItem = React.memo(({ item, index, type, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const queryClient = useQueryClient();
    const isEpisode = type === 'episode';
    const animeObj = item.anime || item.series;
    const animeId = animeObj?.id || item.anime_id || item.id;

    // Prefetch anime details and episodes on hover
    const handlePrefetch = () => {
        if (!animeId) return;
        
        // Prefetch basic anime details
        queryClient.prefetchQuery({
            queryKey: ["anime", String(animeId)],
            queryFn: async () => {
                const response = await api.get(`/animes/${animeId}`);
                return response.data;
            },
            staleTime: 20 * 60 * 1000,
        });

        // Prefetch first page of episodes
        queryClient.prefetchInfiniteQuery({
            queryKey: ["episodes-infinite", Number(animeId), "", null],
            queryFn: async () => {
                const response = await api.get(`/episodes`, { 
                    params: { anime_id: animeId, paginate: true, limit: 25, page: 1 } 
                });
                return response.data;
            },
            initialPageParam: 1,
            staleTime: 5 * 60 * 1000,
        });
    };

    const image = item.image || animeObj?.image || item.cover || animeObj?.cover || item.banner;
    const title = lang === 'ar' ? (item.title || item.series?.title || item.anime?.title) : (item.title_en || item.series?.title_en || item.title || item.anime?.title_en);

    // For episodes, format needs to assume structure
    const displayTitle = title || 'عنوان غير متوفر';
    const subText = isEpisode ? (lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`) : (type === 'manga' ? (lang === 'ar' ? 'مانجا' : 'Manga') : (item?.status || item?.type || ''));


    // SEO Slug Logic
    const animeTitleForSlug = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || item.title);
    const slug = slugify(animeTitleForSlug);

    const targetLink = isEpisode
        ? `/${lang}/watch/${animeId}/${item.episode_number}/${slug}`
        : `/${lang}/animes/${item.id}/${slug}`;

    return (
        <div
            className="group cursor-pointer relative z-0 flex flex-col"
            onMouseEnter={() => {
                onMouseEnter();
                handlePrefetch();
            }}
            onMouseLeave={onMouseLeave}
        >
            <Link 
                to={targetLink} 
                className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
                <SpinnerImage 
                    src={getImageUrl(image)} 
                    alt={displayTitle} 
                    className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 fill-current" />
                </div>
                {isEpisode && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded-md border border-white/10 uppercase">
                        {lang === 'ar' ? 'حلقة' : 'EP'} {item.episode_number}
                    </div>
                )}
            </Link>

            <div className="mt-3 px-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                    {renderEmojiContent(displayTitle)}
                </h3>
                <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                    {renderEmojiContent(subText)}
                </p>
            </div>

            {/* Hover Card Component */}
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
});

// ─── Reactions Helper ──────────────────────────────────────────────────────────

const REACTION_EMOJIS: Record<string, string> = {
    like:      '/uploads/تفاعل البوست/أعجبني.png',
    love:      '/uploads/تفاعل البوست/أحببتة.png',
    haha:      '/uploads/تفاعل البوست/اضحكني.png',
    wow:       '/uploads/تفاعل البوست/واوو.png',
    sad:       '/uploads/تفاعل البوست/أحزنني.gif',
    angry:     '/uploads/تفاعل البوست/أغضبني.gif',
    super_sad: '/uploads/تفاعل البوست/أحززنني جدا.png',
};

const REACTION_KEYS: { key: string; col: string }[] = [
    { key: 'like',      col: 'likes_count' },
    { key: 'love',      col: 'loves_count' },
    { key: 'haha',      col: 'hahas_count' },
    { key: 'wow',       col: 'wows_count' },
    { key: 'sad',       col: 'sads_count' },
    { key: 'angry',     col: 'angrys_count' },
    { key: 'super_sad', col: 'super_sads_count' },
];

function getTopReactions(item: any, maxShown = 3) {
    return REACTION_KEYS
        .map(({ key, col }) => ({ key, count: Number(item[col] || 0) }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxShown);
}

function formatReactionCount(n: number) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

// ─── List Item Design ──────────────────────────────────────────────────────────

const ListItem = ({ item, lang, isEpisode }: any) => {
    const isRtl = lang === 'ar';
    const animeObj = item.anime || item.series;
    const animeTitle = isRtl ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || animeObj?.title || item.title);
    const image = item.image || animeObj?.image || item.cover || animeObj?.cover || (isEpisode ? item.thumbnail : item.banner);
    const url = isEpisode 
        ? `/${lang}/watch/${animeObj?.id || item.anime_id || item.id}/${item.episode_number}/${slugify(animeTitle)}`
        : `/${lang}/animes/${item.id}/${slugify(animeTitle)}`;
    const title = isRtl ? (item.title || `حلقة ${item.episode_number}`) : (item.title_en || `Episode ${item.episode_number}`);
    const description = isRtl ? (item.description || 'لا يوجد وصف متاح للا هذه الحلقة.') : (item.description_en || 'No description available for this episode.');
    const topReactions = getTopReactions(item);

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const fullUrl = `${window.location.origin}${url}`;
        navigator.clipboard.writeText(fullUrl);
        toast.success(lang === 'ar' ? 'تم نسخ الرابط!' : 'Link copied!');
    };

    return (
        <div className="group relative">
            <Link
                to={url}
                className="flex flex-row gap-4 md:gap-6 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-200 relative z-10 p-0 md:p-2 border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-md rounded-lg"
            >
                {/* Image Section */}
                <div className="w-[85px] md:w-[120px] aspect-[2/3] flex-shrink-0 relative overflow-hidden shadow-sm rounded-xl">
                    <img
                        src={getImageUrl(image)}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                    {isEpisode && (
                        <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 uppercase">
                            {isRtl ? 'حلقة' : 'EP'} {item.episode_number}
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className={`flex-1 flex flex-col items-start py-1 md:py-2 ${isRtl ? 'text-right' : 'text-left'} w-full min-w-0`}>
                    <h3 className="text-sm md:text-xl font-black text-gray-900 dark:text-white mb-1 md:mb-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-1 md:line-clamp-2">
                        {renderEmojiContent(animeTitle)}
                    </h3>

                    
                    <div className="hidden md:block w-full">
                        <p className="text-[12.5px] md:text-base text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 md:line-clamp-3 mb-1 md:mb-2 font-normal">
                            {isEpisode ? description : (lang === 'ar' ? 'عرض تفاصيل الأنمي والمزيد.' : 'View anime details and more.')}
                        </p>
                    </div>

                    {/* Reactions & Comments row */}
                    {isEpisode && (
                        <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-1.5 md:mb-2">
                            {topReactions.map(r => (
                                <div key={r.key} className="flex items-center gap-0.5">
                                    <img
                                        src={getImageUrl(REACTION_EMOJIS[r.key])}
                                        alt={r.key}
                                        className="w-7 h-7 md:w-8 md:h-8 object-contain"
                                        loading="lazy"
                                    />
                                    <span className="text-xs md:text-xs font-bold text-gray-600 dark:text-gray-400">
                                        {formatReactionCount(r.count)}
                                    </span>
                                </div>
                            ))}
                            
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                                <span className="text-xs font-bold">{formatReactionCount(item.comments_count || 0)}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto flex flex-row items-center justify-between md:justify-start gap-2 md:gap-6 w-full pt-0 md:pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm md:text-xl font-black text-gray-900 dark:text-white">
                                {isEpisode ? (isRtl ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`) : (isRtl ? 'تفاصيل' : 'Details')}
                            </p>
                            
                            {/* Views Count */}
                            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-bold">{formatReactionCount(item.views || 0)}</span>
                            </div>

                            {/* Mobile Watch Later Icon-Only Button - Next to Episode text */}
                            <div className="md:hidden">
                                <WatchLaterButton 
                                    animeId={animeObj?.id || item.anime_id || item.id} 
                                    episodeId={isEpisode ? Number(item.id) : undefined}
                                    variant="icon"
                                    showLabel={false}
                                    className="p-1 bg-transparent dark:bg-transparent border-none text-gray-400 dark:text-gray-500 scale-90"
                                />
                            </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6">
                            <span className="text-[10px] md:text-sm font-black text-black dark:text-white uppercase tracking-tighter">
                                {isRtl ? 'مشاهدة الآن' : 'Watch Now'}
                            </span>
                            {(item.rating || animeObj?.rating) && (
                                <div className="flex items-center gap-1.5 text-[10px] md:text-sm text-gray-500 font-bold">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                    <span>{item.rating || animeObj?.rating}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            {/* Floating Share Button Desktop */}
            <div className="hidden md:flex absolute top-4 left-4 rtl:right-4 rtl:left-auto flex-col gap-2 z-20">
                <button
                    onClick={handleShare}
                    className="p-2 h-10 w-10 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/20 transition-all flex items-center justify-center shadow-lg transform hover:scale-110"
                    title={lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}
                >
                    <Share2 className="w-5 h-5" />
                </button>
                <WatchLaterButton
                    animeId={Number(animeObj?.id || item.anime_id || item.id)}
                    episodeId={Number(item.id)}
                    episodeTitle={title}
                    episodeNumber={item.episode_number}
                    episodeImage={getImageUrl(image)}
                    variant="icon"
                    className="p-2 h-10 w-10 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-white/20 transition-all shadow-lg transform hover:scale-110"
                    showLabel={false}
                />
            </div>
        </div>
    );
};
