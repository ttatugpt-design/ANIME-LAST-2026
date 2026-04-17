import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, X, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import EpisodeSkeleton from '@/components/skeleton/EpisodeSkeleton';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import AnimeListHoverCard from '@/components/AnimeListHoverCard';
import { slugify } from '@/utils/slug';
import { cn } from '@/lib/utils';
import Footer from '@/components/common/Footer';

import { getImageUrl } from '@/utils/image-utils';

export default function SearchPage() {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const isRtl = lang === 'ar';
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Hover State
    const [hoveredCardIndex, setHoveredCardIndex] = useState<{ type: 'anime' | 'episode', index: number } | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (type: 'anime' | 'episode', index: number) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredCardIndex({ type, index });
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCardIndex(null);
        }, 100);
    };

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Search Episodes
    const { data: episodesData, isLoading: episodesLoading } = useQuery({
        queryKey: ['search-episodes', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return [];
            const response = await api.get('/episodes/search', {
                params: { search: debouncedQuery }
            });
            return response.data || [];
        },
        enabled: debouncedQuery.length > 0
    });

    // Search Animes
    const { data: animesData, isLoading: animesLoading } = useQuery({
        queryKey: ['search-animes', debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return [];
            const response = await api.get('/animes/search', {
                params: { search: debouncedQuery }
            });
            return response.data || [];
        },
        enabled: debouncedQuery.length > 0
    });

    const episodes = episodesData || [];
    const animes = animesData || [];

    const clearSearch = () => {
        setSearchQuery('');
        setDebouncedQuery('');
    };

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isRtl ? 'البحث' : 'Search'} - AnimeLast</title>
            </Helmet>

            <div className="flex-1 w-full max-w-[1920px] mx-auto">
                {/* Main Content Container - Matched width to BrowseAllAnimesPage */}
                <div className="max-w-[1100px] mx-auto px-3 md:px-8 py-8">

                    {/* Header Section */}
                    <div className="flex flex-col gap-8 mb-12">
                        <div className="flex flex-col items-start gap-4">
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                                {isRtl ? 'البحث' : 'Search'}
                            </h1>
                        </div>

                        {/* Search Bar - Underline Style */}
                        <div className="w-full">
                            <div className="relative max-w-4xl mx-auto">
                                <div className="relative">
                                    <Search className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 ${isRtl ? 'right-0' : 'left-0'}`} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={isRtl ? 'ابحث عن الأنمي أو الحلقات...' : 'Search for anime or episodes...'}
                                        className={`w-full h-12 ${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-lg
                                            bg-transparent
                                            border-0 border-b-2 border-gray-300 dark:border-[#333]
                                            focus:border-black dark:focus:border-white
                                            focus:outline-none
                                            text-gray-900 dark:text-white
                                            placeholder:text-gray-400
                                            transition-colors`}
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={clearSearch}
                                            className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-0' : 'right-0'} 
                                                text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors`}
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    {debouncedQuery && (
                        <div className="space-y-16">

                            {/* Episodes Section - Vertical List */}
                            {episodesLoading ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold border-r-4 border-black dark:border-white pr-3 dark:text-white">
                                        {isRtl ? 'الحلقات' : 'Episodes'}
                                    </h2>
                                    {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
                                </div>
                            ) : episodes.length > 0 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold border-r-4 border-black dark:border-white pr-3 dark:text-white">
                                        {isRtl ? 'الحلقات' : 'Episodes'}
                                    </h2>
                                    <div className="flex flex-col gap-6">
                                        {episodes.slice(0, 10).map((episode: any, index: number) => (
                                            <div
                                                key={`ep-${episode.id}`}
                                                className="relative group"
                                                onMouseEnter={() => handleMouseEnter('episode', index)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <EpisodeListItem episode={episode} lang={lang} isRtl={isRtl} />
                                                {hoveredCardIndex?.type === 'episode' && hoveredCardIndex.index === index && (
                                                    <div className="absolute top-0 z-20 h-auto min-h-full left-0 right-0 w-full pointer-events-none">
                                                        <AnimeListHoverCard
                                                            data={{
                                                                ...episode.anime,
                                                                title: episode.anime?.title || episode.series?.title, // Fallback
                                                                cover: episode.anime?.cover || episode.series?.cover
                                                            }}
                                                            lang={lang}
                                                            className="h-full w-full pointer-events-auto"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Animes Section - Vertical List */}
                            {animesLoading ? (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold border-r-4 border-black dark:border-white pr-3 dark:text-white">
                                        {isRtl ? 'المسلسلات' : 'Animes'}
                                    </h2>
                                    {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
                                </div>
                            ) : animes.length > 0 && (
                                <div className="space-y-6">
                                    <h2 className="text-2xl font-bold border-r-4 border-black dark:border-white pr-3 dark:text-white">
                                        {isRtl ? 'المسلسلات' : 'Animes'}
                                    </h2>
                                    <div className="flex flex-col gap-6">
                                        {animes.map((anime: any, index: number) => (
                                            <div
                                                key={`anime-${anime.id}`}
                                                className="relative group"
                                                onMouseEnter={() => handleMouseEnter('anime', index)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <AnimeListItem anime={anime} lang={lang} isRtl={isRtl} />

                                                {hoveredCardIndex?.type === 'anime' && hoveredCardIndex.index === index && (
                                                    <div className="absolute top-0 z-20 h-auto min-h-full left-0 right-0 w-full pointer-events-none">
                                                        <AnimeListHoverCard data={anime} lang={lang} className="h-full w-full pointer-events-auto" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Results State */}
                            {!episodesLoading && !animesLoading && episodes.length === 0 && animes.length === 0 && (
                                <div className="text-center py-20 bg-white dark:bg-[#111] rounded-xl border border-dashed border-gray-200 dark:border-[#333]">
                                    <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                                    <p className="text-lg text-gray-500">
                                        {isRtl ? 'لم يتم العثور على نتائج' : 'No results found'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty State (Initial) */}
                    {!debouncedQuery && (
                        <div className="flex flex-col items-center justify-center py-32 text-gray-400">
                            <Search className="w-24 h-24 mb-6 opacity-20" />
                            <p className="text-xl font-medium opacity-60">
                                {isRtl ? 'ابدأ البحث للعثور على الأنمي المفضل لديك' : 'Start searching to find your favorite anime'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB-COMPONENTS (Matching BrowseAllAnimesPage)
// ----------------------------------------------------------------------

function ListItemSkeleton() {
    return (
        <div className="flex flex-col md:flex-row gap-4 animate-pulse">
            <div className="w-full md:w-[260px] h-[150px] bg-gray-200 dark:bg-neutral-800" />
            <div className="flex-1 space-y-4 py-2">
                <div className="h-6 bg-gray-200 dark:bg-neutral-800 w-1/3" />
                <div className="h-4 bg-gray-200 dark:bg-neutral-800 w-full" />
            </div>
        </div>
    );
}

function AnimeListItem({ anime, lang, isRtl }: { anime: any; lang: string; isRtl: boolean }) {
    const title = lang === 'ar' ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
    const description = lang === 'ar'
        ? (anime.description || anime.series?.description || 'لا يوجد وصف متاح')
        : (anime.description_en || anime.series?.description_en || 'No description available');
    const image = anime.cover || anime.banner || anime.image;

    return (
        <Link
            to={`/${lang}/animes/${anime.id}/${slugify(title)}`}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-50/50 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10"
        >
            {/* Image Section */}
            <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] flex-shrink-0 relative overflow-hidden rounded-none">
                <img
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading="lazy"
                />
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-start py-0 md:py-2 text-right w-full min-w-0">
                <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-black dark:group-hover:text-white transition-colors leading-tight line-clamp-2 md:line-clamp-1">
                    {title}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 font-normal pl-0 md:pl-4 rtl:pr-0 rtl:pl-0 md:rtl:pl-4">
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
                            {typeof anime.season === 'string' ? anime.season : (anime.season?.name || 'TV')}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

function EpisodeListItem({ episode, lang, isRtl }: { episode: any; lang: string; isRtl: boolean }) {
    const animeObj = episode.anime || episode.series;
    const title = lang === 'ar' ? (episode.title || animeObj?.title) : (episode.title_en || animeObj?.title_en || episode.title);
    const displayTitle = title || (lang === 'ar' ? 'عنوان غير متوفر' : 'Title not available');
    const description = lang === 'ar' ? (episode.description || animeObj?.description) : (episode.description_en || animeObj?.description_en);
    const image = episode.thumbnail || episode.banner || episode.image;

    // Construct Link
    const animeId = episode.anime_id || animeObj?.id || episode.series_id;
    const link = `/${lang}/watch/${animeId}/${episode.episode_number}/${slugify(displayTitle)}`;

    return (
        <Link
            to={link}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10"
        >
            {/* Image Section */}
            <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] flex-shrink-0 relative overflow-hidden rounded-none">
                <img
                    src={getImageUrl(image)}
                    alt={displayTitle}
                    className="w-full h-full object-cover transition-transform duration-500"
                    loading="lazy"
                />
                {/* Episode Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider">
                    {episode.episode_number}
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col items-start py-0 md:py-2 text-right w-full min-w-0">
                <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-black dark:group-hover:text-white transition-colors leading-tight line-clamp-2 md:line-clamp-1">
                    {displayTitle}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 font-normal pl-0 md:pl-4 rtl:pr-0 rtl:pl-0 md:rtl:pl-4">
                    {description || (lang === 'ar' ? 'لا يوجد وصف' : 'No description')}
                </p>

                <div className="mt-auto flex items-center gap-2 md:gap-4 w-full pt-1 md:pt-3">
                    <span className="text-[10px] md:text-xs font-bold text-black dark:text-white">
                        {isRtl ? 'حلقة' : 'Episode'}
                    </span>
                    <div className="hidden md:block flex-1 text-left rtl:text-left ltr:text-right">
                        <span className="text-xs text-gray-400 font-mono">
                            {new Date(episode.created_at || Date.now()).getFullYear()}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
