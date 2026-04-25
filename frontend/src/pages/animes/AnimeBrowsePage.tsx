import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Filter, LayoutGrid, List, Play, ChevronDown, Monitor, Film, PlayCircle, Star, ArrowUp, Eye, MessageCircle } from "lucide-react";
import { WatchLaterButton } from "@/components/common/WatchLaterButton";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SpinnerImage from "@/components/ui/SpinnerImage";
import CentralSpinner from "@/components/ui/CentralSpinner";
import { SocialNavSidebar } from "@/components/social/SocialNavSidebar";
import { NewsTicker } from "@/components/common/NewsTicker";
import Footer from "@/components/common/Footer";
import { renderEmojiContent } from "@/utils/render-content";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { CategoriesMenuContent } from '@/components/header/CategoriesMenuContent';
import { getImageUrl } from '@/utils/image-utils';
import { slugify } from "@/utils/slug";
import { useInView } from "react-intersection-observer";

type BrowseMode = 'latest-episodes' | 'latest-animes' | 'latest-movies';

export default function AnimeBrowsePage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [mode, setMode] = useState<BrowseMode>('latest-episodes');

    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        
        const handleScroll = () => {
            if (window.scrollY > 400) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const seoTitle = i18n.language === 'ar' ? 'تصفح الأنمي - AnimeLast' : 'Browse Anime - AnimeLast';

    return (
        <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans">
            <Helmet htmlAttributes={{ lang: i18n.language }} defer={false}>
                <title>{seoTitle}</title>
            </Helmet>


            <div className="w-full min-h-screen">
                <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] gap-0 overflow-visible min-h-screen">
                    {/* Left Sidebar */}
                    <div className="hidden lg:block sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-white dark:bg-black z-30 border-r border-gray-100 dark:border-[#333]/50">
                        <SocialNavSidebar />
                    </div>

                    <div className="min-w-0 w-full px-1.5 sm:px-6 md:px-8 pt-0 pb-8 lg:pt-0">
                        {/* Navigation Buttons - Centered on desktop, Swipable on mobile */}
                        <div className="w-full overflow-x-auto no-scrollbar pt-4 pb-2 mb-0 mt-[-5px]">
                            <div className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-2 md:gap-4 px-2 md:px-0">
                                <button
                                    onClick={() => setMode('latest-episodes')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-8 md:px-12 py-3 md:py-3.5 font-black text-xs md:text-sm transition-all border rounded-full whitespace-nowrap min-w-max",
                                        mode === 'latest-episodes' 
                                            ? "bg-white border-black text-black shadow-md translate-y-[-1px]" 
                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                    )}
                                >
                                    <PlayCircle className="w-4 h-4 md:w-5 md:h-5" />
                                    {isRtl ? 'أخر الحلقات' : 'Latest Episodes'}
                                </button>
                                <button
                                    onClick={() => setMode('latest-animes')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-8 md:px-12 py-3 md:py-3.5 font-black text-xs md:text-sm transition-all border rounded-full whitespace-nowrap min-w-max",
                                        mode === 'latest-animes' 
                                            ? "bg-white border-black text-black shadow-md translate-y-[-1px]" 
                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                    )}
                                >
                                    <Monitor className="w-4 h-4 md:w-5 md:h-5" />
                                    {isRtl ? 'أخر الأنميات' : 'Latest Animes'}
                                </button>
                                <button
                                    onClick={() => setMode('latest-movies')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 px-8 md:px-12 py-3 md:py-3.5 font-black text-xs md:text-sm transition-all border rounded-full whitespace-nowrap min-w-max",
                                        mode === 'latest-movies' 
                                            ? "bg-white border-black text-black shadow-md translate-y-[-1px]" 
                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                    )}
                                >
                                    <Film className="w-4 h-4 md:w-5 md:h-5" />
                                    {isRtl ? 'أخر الأفلام' : 'Latest Movies'}
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <BrowseSection 
                            key={mode}
                            mode={mode}
                            lang={i18n.language}
                            isRtl={isRtl}
                        />
                    </div>
                </div>
            </div>

            {/* Scroll to Top Button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-6 left-6 z-[999] p-4 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/10 text-black dark:text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group"
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-6 h-6 group-hover:translate-y-[-2px] transition-transform" />
                </button>
            )}

            <Footer />
        </div>
    );
}

function BrowseSection({ mode, lang, isRtl }: { mode: BrowseMode; lang: string; isRtl: boolean }) {
    const [layout, setLayout] = useState<'grid' | 'list'>(mode === 'latest-episodes' ? 'list' : 'grid');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isEpisodes = mode === 'latest-episodes';
    const endpoint = mode === 'latest-episodes' ? '/episodes/latest' : (mode === 'latest-animes' ? '/animes' : '/animes/type/Movie');
    const sectionTitle = isRtl 
        ? (mode === 'latest-episodes' ? 'تصفح انميات الجديدة' : (mode === 'latest-animes' ? 'تصفح كل الأنميات' : 'تصفح الأفلام'))
        : (mode === 'latest-episodes' ? 'Browse New Animes' : (mode === 'latest-animes' ? 'Browse All Animes' : 'Browse Movies'));

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

    return (
        <section className="mb-14 mt-[-10px]">
            <div className="flex items-center justify-between gap-1 mb-0 p-0">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none">
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
                    "w-full z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden transition-all duration-300 mb-6 rounded-2xl",
                    isFilterMenuOpen ? "max-h-[800px] opacity-100 p-4" : "max-h-0 opacity-0 pointer-events-none"
                )}
            >
                <CategoriesMenuContent onClose={() => setIsFilterMenuOpen(false)} isVisible={isFilterMenuOpen} />
            </div>

            <div className={layout === 'list' ? "grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6"}>
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="aspect-[3/4] bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
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
                            onMouseEnter={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                setHoveredCardIndex(index);
                            }}
                            onMouseLeave={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                hoverTimeoutRef.current = setTimeout(() => setHoveredCardIndex(null), 100);
                            }}
                            keepCardOpen={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
                        />
                    )
                ))}
            </div>

            <div ref={loadMoreRef} className="py-12 flex justify-center">
                {(isFetchingNextPage || hasNextPage) && (
                    <div className="flex flex-col items-center gap-4">
                        <CentralSpinner size="medium" />
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest animate-pulse">
                            {isRtl ? 'جاري تحميل المزيد...' : 'Loading More...'}
                        </span>
                    </div>
                )}
            </div>
        </section>
    );
}

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

const CardItem = React.memo(({ item, index, type, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const isEpisode = type === 'episode';
    const animeObj = item.anime || item.series;
    const image = isEpisode ? (item.thumbnail || animeObj?.cover || item.image) : (animeObj?.cover || item.cover || item.image || item.banner);
    const animeTitle = lang === 'ar' ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || animeObj?.title || item.title);
    const url = isEpisode 
        ? `/${lang}/watch/${animeObj?.id}/${item.episode_number}/${slugify(animeTitle)}`
        : `/${lang}/animes/${item.id}/${slugify(animeTitle)}`;

    return (
        <div 
            className="group relative flex flex-col"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Link to={url} className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <SpinnerImage src={getImageUrl(image)} alt={animeTitle} className="w-full h-full object-cover" />
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
                    {renderEmojiContent(animeTitle)}
                </h3>
                <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                    {isEpisode ? (lang === 'ar' ? `الحلقة ${item.episode_number}` : `Episode ${item.episode_number}`) : (lang === 'ar' ? 'مسلسل' : 'TV Series')}
                </p>
            </div>
        </div>
    );
});

const ListItem = ({ item, lang, isEpisode }: any) => {
    const isRtl = lang === 'ar';
    const animeObj = item.anime || item.series;
    const animeTitle = isRtl ? (animeObj?.title || item.title) : (animeObj?.title_en || item.title_en || animeObj?.title || item.title);
    const image = isEpisode ? (item.thumbnail || animeObj?.cover || item.image) : (animeObj?.cover || item.cover || item.image || item.banner);
    const url = isEpisode 
        ? `/${lang}/watch/${animeObj?.id}/${item.episode_number}/${slugify(animeTitle)}`
        : `/${lang}/animes/${item.id}/${slugify(animeTitle)}`;
    const title = isRtl ? (item.title || `حلقة ${item.episode_number}`) : (item.title_en || `Episode ${item.episode_number}`);
    const description = isRtl ? (item.description || 'لا يوجد وصف متاح للا هذه الحلقة.') : (item.description_en || 'No description available for this episode.');
    const topReactions = getTopReactions(item);

    return (
        <div className="group relative">
            <Link
                to={url}
                className="flex flex-col md:flex-row gap-2 md:gap-6 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-200 relative z-10 p-0 md:p-2 border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-md rounded-lg"
            >
                {/* Image Section */}
                <div className="w-full md:w-[260px] aspect-video md:h-[145px] flex-shrink-0 relative overflow-hidden shadow-sm rounded-xl">
                    <img
                        src={getImageUrl(image)}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center rounded-xl">
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
                                    animeId={animeObj?.id || item.id} 
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
        </div>
    );
};
