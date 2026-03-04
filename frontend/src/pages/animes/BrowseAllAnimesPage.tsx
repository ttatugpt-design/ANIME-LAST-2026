import { useState, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Search, Filter, ArrowUpDown, LayoutGrid } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Link, useSearchParams } from 'react-router-dom';
import AnimeListHoverCard from '@/components/AnimeListHoverCard';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import { NewsTicker } from '@/components/common/NewsTicker';
import Footer from '@/components/common/Footer';
import CentralSpinner from '@/components/ui/CentralSpinner';

export default function BrowseAllAnimesPage() {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const isRtl = lang === 'ar';
    const [searchParams] = useSearchParams();

    // State
    const [selectedType, setSelectedType] = useState<'All' | 'TV' | 'Movie'>('All');
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Animes
    // Fetch Animes with Pagination (Infinite Scroll)
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError
    } = useInfiniteQuery({
        queryKey: ['browse-all-animes', selectedType, selectedLetter, searchQuery, searchParams.get('categoryId')],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 10,
                letter: selectedLetter || '',
                search: searchQuery,
                category_id: searchParams.get('categoryId'),
                type: selectedType === 'All' ? '' : selectedType,
            };
            const response = await api.get('/animes', { params });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            // If the last page has fewer than limit items, there are no more pages.
            // Assuming limit is 10.
            return lastPage.length === 10 ? allPages.length + 1 : undefined;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Flatten filtered data
    const allAnimes = useMemo(() => {
        return data?.pages.flat() || [];
    }, [data]);

    // Hover Logic
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lettersDisplay = isRtl ? [...alphabet].reverse() : alphabet;

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans">
            <Helmet>
                <title>{isRtl ? 'تصفح كل الأنميات - AnimeLast' : 'Browse All Animes - AnimeLast'}</title>
            </Helmet>

            <NewsTicker />

            {isLoading ? (
                <CentralSpinner className="min-h-screen" />
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible max-w-[1400px] mx-auto transition-all duration-300">
                        {/* Main Content - Full Width */}
                        <div className="px-3 md:px-8 pb-8 transition-all duration-300 col-span-1 lg:col-span-12">
                            {/* Header Section */}
                            <div className="flex flex-col gap-8 mb-12">
                                {/* Top Bar: Filters & Title */}
                                <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">

                                    {/* Controls (Filter / Sort) - Bigger & Bolder */}
                                    <div className="flex items-center gap-6 text-base md:text-lg font-bold">
                                        <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                            <Filter className="w-6 h-6" />
                                            <span>{isRtl ? 'فلتر' : 'Filter'}</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                            <ArrowUpDown className="w-6 h-6" />
                                            <span>{isRtl ? 'أبجدي' : 'Alphabetical'}</span>
                                        </button>
                                    </div>

                                    {/* Page Title */}
                                    <div className="relative">
                                        <div className="absolute top-0 right-0 w-full h-full bg-black/5 dark:bg-white/5 pr-4 -z-10" />
                                        <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white tracking-tighter italic uppercase">
                                            {isRtl ? 'جميع الأنميات' : 'Browse All Animes'}
                                        </h1>
                                        <div className="mt-2 h-2 w-32 bg-black dark:bg-white" />
                                    </div>
                                </div>

                            </div>

                            {/* Alphabet Bar - Centered & Sticky */}
                            <div className="w-full border-b border-gray-200 dark:border-neutral-800 py-4 flex justify-center sticky top-[60px] z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md mb-8">
                                <div className="flex flex-wrap items-center justify-center gap-3 text-sm md:text-base font-bold text-gray-500 dark:text-gray-500 uppercase">
                                    <button
                                        onClick={() => setSelectedLetter(null)}
                                        className={cn(
                                            "hover:text-black dark:hover:text-white transition-colors",
                                            selectedLetter === null ? "text-black dark:text-white" : ""
                                        )}
                                    >
                                        #
                                    </button>

                                    {lettersDisplay.map((letter) => (
                                        <button
                                            key={letter}
                                            onClick={() => setSelectedLetter(letter)}
                                            className={cn(
                                                "hover:text-black dark:hover:text-white transition-colors",
                                                selectedLetter === letter ? "text-black dark:text-white" : ""
                                            )}
                                        >
                                            {letter}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* List Container */}
                            <div className="flex flex-col gap-6">
                                {allAnimes.length > 0 ? (
                                    allAnimes.map((anime: any, index: number) => (
                                        <div
                                            key={anime.id}
                                            className="relative group"
                                            onMouseEnter={() => handleMouseEnter(index)}
                                            onMouseLeave={handleMouseLeave}
                                        >
                                            <ListItem anime={anime} lang={lang} isRtl={isRtl} />

                                            {hoveredCardIndex === index && (
                                                <div className={cn(
                                                    "absolute top-0 z-20 h-auto min-h-full left-0 right-0 w-full"
                                                )}>
                                                    <AnimeListHoverCard data={anime} lang={lang} className="h-full w-full" />
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-20 text-gray-500">
                                        {isRtl ? 'لا توجد نتائج' : 'No results found'}
                                    </div>
                                )}
                            </div>

                            {/* Show More Button */}
                            {hasNextPage && (
                                <div className="flex justify-center mt-8">
                                    <button
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isFetchingNextPage ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>{isRtl ? 'جاري التحميل...' : 'Loading...'}</span>
                                            </>
                                        ) : (
                                            <span>{isRtl ? 'عرض المزيد' : 'Show More'}</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <Footer />
                </>
            )}
        </div>
    );
}

// Separate Component for List Item
function ListItem({ anime, lang, isRtl }: { anime: any; lang: string; isRtl: boolean }) {
    const title = lang === 'ar' ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
    const description = lang === 'ar'
        ? (anime.description || anime.series?.description || 'لا يوجد وصف متاح')
        : (anime.description_en || anime.series?.description_en || 'No description available');

    // Fallback images
    const image = anime.cover || anime.banner;

    return (
        <Link
            to={`/${lang}/animes/${anime.id}`}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10"
        >
            {/* Image Section - Responsive Width */}
            <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] flex-shrink-0 relative overflow-hidden rounded-none md:rounded-none">
                <img
                    src={getValidImageUrl(image)}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading="lazy"
                />

            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-start py-0 md:py-2 text-right w-full min-w-0">
                {/* Title */}
                <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-black dark:group-hover:text-white transition-colors leading-tight line-clamp-2 md:line-clamp-1">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 font-normal pl-0 md:pl-4 rtl:pr-0 rtl:pl-0 md:rtl:pl-4">
                    {description}
                </p>

                {/* Footer / Tags */}
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

// Helper (reused)
const BASE_URL = '';
const getValidImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};
