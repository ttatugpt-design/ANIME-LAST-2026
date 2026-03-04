import { useState, useEffect, useRef } from "react";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Filter, Star, ThumbsUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import CentralSpinner from "@/components/ui/CentralSpinner";
import { NewsTicker } from "@/components/common/NewsTicker";
import { SocialNavSidebar } from "@/components/social/SocialNavSidebar";
import Footer from "@/components/common/Footer";
import { renderEmojiContent } from "@/utils/render-content";
import { slugify } from "@/utils/slug";

const BASE_URL = '';

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function ForeignMediaPage() {
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const seoTitle = i18n.language === 'ar' ? 'أفلام ومسلسلات أجنبية0 - AnimeLast' : 'Foreign Movies & Series - AnimeLast';

    return (
        <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
            <Helmet>
                <title>{seoTitle}</title>
            </Helmet>

            <div className="w-full">
                <NewsTicker />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible max-w-[1400px] mx-auto">

                    {/* Sidebar - Positioned on the left - Stretching column */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Content - Flex grow to fill remaining space */}
                    <div className="col-span-1 lg:col-span-9 px-4 sm:px-6 md:px-8 pb-8">
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-[1400px] mx-auto py-8">
                                {/* Title Header */}
                                <div className="mb-12 text-center">
                                    <h1 className="text-3xl md:text-5xl font-black mb-4">
                                        {i18n.language === 'ar' ? 'أفلام ومسلسلات أجنبية' : 'Foreign Movies & Series'}
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                                        {i18n.language === 'ar'
                                            ? 'استمتع بمجموعة مختارة من المسلسلات والأفلام الأجنبية المترجمة بأعلى جودة.'
                                            : 'Enjoy a selected collection of translated foreign series and movies in high quality.'}
                                    </p>
                                </div>

                                {/* Foreign Series Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'مسلسلات أجنبية' : 'Foreign Series'}
                                    endpoint="/animes/type/tv_en"
                                    type="anime"
                                    limit={15}
                                    lang={i18n.language}
                                />

                                {/* Foreign Movies Section */}
                                <Section
                                    title={i18n.language === 'ar' ? 'أفلام أجنبية' : 'Foreign Movies'}
                                    endpoint="/animes/type/moves_en"
                                    type="movie"
                                    limit={15}
                                    lang={i18n.language}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}

const Section = ({ title, endpoint, type, limit, lang }: any) => {
    const { elementRef, hasIntersected } = useIntersectionObserver({ threshold: 0.1 });
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

    const keepCardOpen = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    const { data: items, isLoading: isQueryLoading } = useQuery({
        queryKey: [endpoint, limit],
        queryFn: async () => (await api.get(endpoint, { params: { limit } })).data,
        enabled: hasIntersected,
        staleTime: 5 * 60 * 1000,
    });

    const isLoading = (!hasIntersected || isQueryLoading) && !items;

    return (
        <section className="mb-16" ref={elementRef as React.RefObject<HTMLDivElement>}>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-neutral-900 pb-4">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="w-2 h-8 bg-black dark:bg-white rounded-full"></span>
                    {title}
                </h2>
            </div>

            {isLoading ? (
                <CrunchyrollSkeleton
                    count={10}
                    isEpisode={false}
                    layout={window.innerWidth < 768 ? 'list' : 'grid'}
                    gridClassName="grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-3 lg:grid-cols-5"
                />
            ) : items?.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 md:gap-6 md:grid-cols-3 lg:grid-cols-5 relative z-0">
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
            ) : (
                <div className="text-center py-20 bg-gray-50 dark:bg-neutral-900/30 rounded-2xl border-2 border-dashed border-gray-100 dark:border-neutral-800">
                    <p className="text-gray-500">{lang === 'ar' ? 'لا يوجد محتوى متوفر حالياً' : 'No content available at the moment'}</p>
                </div>
            )}
        </section>
    );
};

const CardItem = ({ item, index, lang, isHovered, onMouseEnter, onMouseLeave, keepCardOpen }: any) => {
    const image = item.image || item.cover;
    const title = lang === 'ar' ? (item.title || item.series?.title) : (item.title_en || item.series?.title_en || item.title);
    const displayTitle = title || 'Untitled';
    const subText = item.status || (lang === 'ar' ? 'مستمر' : 'Ongoing');
    const year = new Date(item.created_at || Date.now()).getFullYear();
    const slug = slugify(displayTitle);

    return (
        <div
            className="group cursor-pointer relative z-0"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Link to={`/${lang}/animes/${item.id}/${slug}`} className="flex flex-col w-full h-full">
                <div className="relative w-full aspect-[2/3] overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-3 group-hover:shadow-xl dark:group-hover:shadow-white/5 transition-all duration-300">
                    <SpinnerImage
                        src={getImageUrl(image)}
                        alt={displayTitle}
                        className="w-full h-full"
                        imageClassName="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black text-white bg-black/80 uppercase tracking-wider backdrop-blur-sm">
                        {item.type === 'tv' ? (lang === 'ar' ? 'مسلسل' : 'TV') : (lang === 'ar' ? 'فيلم' : 'MOVIE')}
                    </div>
                </div>

                <div className="space-y-1 text-center">
                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight text-sm md:text-base group-hover:text-primary transition-colors">
                        {renderEmojiContent(displayTitle)}
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                        {renderEmojiContent(subText)}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-1">
                        <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-black">{item.rating || 'N/A'}</span>
                        </div>
                        <span className="text-gray-300 dark:text-neutral-700">•</span>
                        <span className="text-[10px] font-black text-gray-400">{year}</span>
                    </div>
                </div>
            </Link>

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
