import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Filter, LayoutGrid, List, Play, ChevronDown, Monitor, Film, PlayCircle, Star, ArrowUp, Eye, MessageCircle, ArrowUpDown } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

export default function BrowseAllAnimesPage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [searchParams] = useSearchParams();
    
    // State
    const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
    const [layout, setLayout] = useState<'grid' | 'list'>('grid');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const lettersDisplay = isRtl ? [...alphabet].reverse() : alphabet;

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

    // Fetch Data
    const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['browse-all-animes-v2', selectedLetter, searchParams.get('categoryId')],
        queryFn: async ({ pageParam = 1 }) => {
            const params: any = {
                page: pageParam,
                limit: 20,
                letter: selectedLetter || '',
                category_id: searchParams.get('categoryId'),
            };
            const response = await api.get('/animes', { params });
            return response.data;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage: any, allPages: any[]) => {
            return lastPage.length === 20 ? allPages.length + 1 : undefined;
        },
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allItems = useMemo(() => data?.pages.flat() || [], [data]);

    const seoTitle = isRtl ? 'تصفح كل الأنميات - AnimeLast' : 'Browse All Animes - AnimeLast';

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans">
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
                        {/* Alphabet Bar - Swipable/Scrollable */}
                        <div className="w-full overflow-x-auto no-scrollbar pt-4 pb-2 mb-4 mt-[-5px] sticky top-[60px] z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md">
                            <div className="flex flex-nowrap items-center justify-start gap-2 px-2">
                                <button
                                    onClick={() => setSelectedLetter(null)}
                                    className={cn(
                                        "flex items-center justify-center min-w-[40px] h-10 font-black text-xs md:text-sm transition-all border rounded-full whitespace-nowrap",
                                        selectedLetter === null 
                                            ? "bg-white border-black text-black shadow-md translate-y-[-1px]" 
                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                    )}
                                >
                                    #
                                </button>
                                {lettersDisplay.map((letter) => (
                                    <button
                                        key={letter}
                                        onClick={() => setSelectedLetter(letter)}
                                        className={cn(
                                            "flex items-center justify-center min-w-[40px] h-10 font-black text-xs md:text-sm transition-all border rounded-full whitespace-nowrap",
                                            selectedLetter === letter 
                                                ? "bg-white border-black text-black shadow-md translate-y-[-1px]" 
                                                : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                        )}
                                    >
                                        {letter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section Header */}
                        <div className="flex items-center justify-between gap-1 mb-6 p-0">
                            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none">
                                {isRtl ? 'تصفح جميع الأنميات' : 'Browse All Animes'}
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

                        {/* Filter Menu */}
                        <div
                            className={cn(
                                "w-full z-50 bg-white dark:bg-[#0a0a0a] shadow-2xl border border-gray-100 dark:border-neutral-800 overflow-hidden transition-all duration-300 mb-6 rounded-2xl",
                                isFilterMenuOpen ? "max-h-[800px] opacity-100 p-4" : "max-h-0 opacity-0 pointer-events-none"
                            )}
                        >
                            <CategoriesMenuContent onClose={() => setIsFilterMenuOpen(false)} isVisible={isFilterMenuOpen} />
                        </div>

                        {/* Content Grid/List */}
                        <div className={layout === 'list' ? "flex flex-col gap-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6"}>
                            {isLoading ? (
                                Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="aspect-[2/3] bg-gray-100 dark:bg-white/5 animate-pulse rounded-xl" />
                                ))
                            ) : allItems.map((item: any, index: number) => (
                                layout === 'list' ? (
                                    <ListItem key={item.id} item={item} lang={i18n.language} isRtl={isRtl} />
                                ) : (
                                    <CardItem key={item.id} item={item} lang={i18n.language} isRtl={isRtl} />
                                )
                            ))}
                        </div>

                        {/* Load More Trigger */}
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

// ─── Components ─────────────────────────────────────────────────────────────

const CardItem = ({ item, lang, isRtl }: any) => {
    const title = isRtl ? (item.title || item.title_en) : (item.title_en || item.title);
    const image = item.cover || item.image || item.banner;
    const url = `/${lang}/animes/${item.id}/${slugify(title)}`;

    return (
        <div className="group relative flex flex-col">
            <Link to={url} className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                <SpinnerImage src={getImageUrl(image)} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 fill-current" />
                </div>
                {item.type && (
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-2 py-1 rounded-md border border-white/10 uppercase">
                        {item.type}
                    </div>
                )}
            </Link>
            
            <div className="mt-3 px-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                    {renderEmojiContent(title)}
                </h3>
                <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                    {isRtl ? 'مسلسل أنمي' : 'Anime Series'}
                </p>
            </div>
        </div>
    );
};

const ListItem = ({ item, lang, isRtl }: any) => {
    const title = isRtl ? (item.title || item.title_en) : (item.title_en || item.title);
    const image = item.banner || item.cover || item.image;
    const url = `/${lang}/animes/${item.id}/${slugify(title)}`;
    const description = isRtl ? (item.description || 'لا يوجد وصف متاح لهذا الأنمي.') : (item.description_en || 'No description available for this anime.');

    return (
        <div className="group relative">
            <Link
                to={url}
                className="flex flex-col md:flex-row gap-4 md:gap-6 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-200 p-2 border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-md rounded-xl"
            >
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
                </div>

                <div className={`flex-1 flex flex-col items-start py-2 ${isRtl ? 'text-right' : 'text-left'} min-w-0`}>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-1 md:line-clamp-2">
                        {renderEmojiContent(title)}
                    </h3>

                    <p className="hidden md:block text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 mb-3 font-normal">
                        {description}
                    </p>

                    <div className="mt-auto flex items-center gap-6">
                        <span className="text-xs font-black text-black dark:text-white uppercase tracking-tighter">
                            {isRtl ? 'عرض التفاصيل' : 'View Details'}
                        </span>
                        {item.rating && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                <span>{item.rating}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                            <Eye className="w-4 h-4" />
                            <span>{item.views || 0}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};
