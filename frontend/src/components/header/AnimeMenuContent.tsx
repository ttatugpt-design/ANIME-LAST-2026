import { useNavigate, Link } from 'react-router-dom';
import { LayoutGrid, Sparkles, Play, Star, ThumbsUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '@/lib/api';
import { slugify } from "@/utils/slug";
import { cn } from '@/lib/utils';

interface AnimeMenuContentProps {
    onClose?: () => void;
    isVisible?: boolean;
}

const BASE_URL = '';
const getImageUrl = (path: string | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanPath}`;
};

export function AnimeMenuContent({ onClose, isVisible }: AnimeMenuContentProps) {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

    const handleImageLoad = (id: string) => {
        setLoadedImages(prev => ({ ...prev, [id]: true }));
    };

    // Lazy Fetch Latest Episodes
    const { data: latestEpisodes, isLoading: isEpisodesLoading } = useQuery({
        queryKey: ['menu-latest-episodes'],
        queryFn: async () => (await api.get('/episodes/latest', { params: { limit: 4 } })).data,
        enabled: isVisible,
        staleTime: 5 * 60 * 1000,
    });

    // Lazy Fetch Latest Animes
    const { data: latestAnimes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ['menu-latest-animes'],
        queryFn: async () => (await api.get('/animes/latest', { params: { limit: 8 } })).data,
        enabled: isVisible,
        staleTime: 5 * 60 * 1000,
    });

    const { data: categories } = useQuery({
        // ... (categories fetch)
        queryKey: ['menu-categories'],
        queryFn: async () => (await api.get('/categories')).data,
        staleTime: 60 * 60 * 1000, // 1 hour
    });

    const handleNavigation = (path: string) => {
        const lang = i18n.language || 'en';
        const targetPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
        navigate(targetPath);
        if (onClose) onClose();
    };

    return (
        <div className="flex w-full min-h-[0px] text-right bg-white dark:bg-[#0a0a0a]">
            {/* Sidebar (1/5) - Now on the Right */}
            <div className="w-1/5 border-r border-gray-100 dark:border-neutral-800 p-0 flex flex-col">
                <button
                    onClick={() => handleNavigation('/browse')}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {isRtl ? 'تصفح الكل' : 'Browse All'}
                    </span>
                    <LayoutGrid className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
                <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />
                <button
                    onClick={() => handleNavigation('/animes')}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                        {isRtl ? 'جديد الأنمي' : 'New Anime'}
                    </span>
                    <Sparkles className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
                <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />
                <div className="px-2 pb-3 flex flex-wrap gap-1.5 justify-center">
                    {categories?.slice(0, 8).map((cat: any) => (
                        <button
                            key={cat.id}
                            onClick={() => handleNavigation(`/browse?categoryId=${cat.id}`)}
                            className="px-2.5 py-1.5 text-[10px] font-bold bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all uppercase"
                        >
                            {isRtl ? cat.name : (cat.name_en || cat.name)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area (4/5) */}
            <div className="flex w-4/5 divide-x divide-gray-100 dark:divide-neutral-800 rtl:divide-x-reverse relative min-h-[350px]">
                {/* Global Spinner */}
                {(isEpisodesLoading || isAnimesLoading) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px]">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-gray-100 dark:border-neutral-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                )}

                {/* Left: Latest Animes (w-[63%]) */}
                <div className="w-[63%] p-3 bg-gray-50/30 dark:bg-[#0d0d0d]/50">
                    <div className="flex items-center justify-between mb-3">
                        <Link to={`/${i18n.language}/animes`} onClick={onClose} className="text-[10px] font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest">
                            {isRtl ? 'عرض أحدث الإضافات' : 'View Latest'}
                        </Link>
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">
                            {isRtl ? 'أحدث الأنميات' : 'Latest Animes'}
                        </h3>
                    </div>
                    {latestAnimes && latestAnimes.length > 0 ? (
                        <div className="grid grid-cols-4 gap-4">
                            {latestAnimes.slice(0, 8).map((anime: any) => {
                                const title = isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
                                const slug = slugify(title);
                                return (
                                    <div
                                        key={anime.id}
                                        className="group cursor-pointer flex flex-col items-center"
                                        onClick={() => handleNavigation(`/animes/${anime.id}/${slug}`)}
                                    >
                                        <div className="relative aspect-[2/3] w-full overflow-hidden shadow-md group-hover:shadow-black/20 transition-all duration-500 bg-gray-100 dark:bg-[#111] flex items-center justify-center">
                                            {isVisible && (
                                                <>
                                                    {!loadedImages[`anime-${anime.id}`] && (
                                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 absolute" />
                                                    )}
                                                    <img
                                                        src={getImageUrl(anime.image || anime.cover)}
                                                        alt={title}
                                                        onLoad={() => handleImageLoad(`anime-${anime.id}`)}
                                                        className={cn(
                                                            "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                                                            loadedImages[`anime-${anime.id}`] ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </>
                                            )}
                                            <div className="absolute top-1 left-1 px-1 py-0.5 text-[8px] font-black text-white bg-black/80 uppercase">
                                                {anime.type === 'tv' ? (isRtl ? 'مسلسل' : 'TV') : (isRtl ? 'فيلم' : 'MOVIE')}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-center w-full px-1">
                                            <h4 className="text-xs md:text-sm font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                                {title}
                                            </h4>
                                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                                <span className="text-[10px] font-black text-gray-500">{anime.rating || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : !isAnimesLoading ? (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No recent animes found</div>
                    ) : null}
                </div>

                {/* Right: Latest Episodes (w-[37%]) */}
                <div className="w-[37%] p-3 bg-gray-50/10 dark:bg-[#0a0a0a]/50">
                    <div className="flex items-center justify-between mb-3">
                        <Link to={`/${i18n.language}/episodes-list`} onClick={onClose} className="text-[10px] font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest">
                            {isRtl ? 'مشاهدة الكل' : 'View All'}
                        </Link>
                        <h3 className="text-base font-black text-gray-900 dark:text-white uppercase">
                            {isRtl ? 'أحدث الحلقات' : 'Latest Episodes'}
                        </h3>
                    </div>
                    {latestEpisodes && latestEpisodes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                            {latestEpisodes.slice(0, 4).map((episode: any) => {
                                const animeObj = episode.anime || episode.series;
                                const animeTitle = isRtl ? (animeObj?.title || episode.title) : (animeObj?.title_en || episode.title_en || episode.title);
                                const slug = slugify(animeTitle);
                                return (
                                    <div key={episode.id} className="group cursor-pointer flex flex-col" onClick={() => handleNavigation(`/watch/${animeObj?.id || episode.anime_id}/${episode.episode_number}/${slug}`)}>
                                        <div className="relative aspect-video w-full overflow-hidden shadow-md bg-gray-100 dark:bg-[#111] flex items-center justify-center">
                                            {isVisible && (
                                                <>
                                                    {!loadedImages[`ep-${episode.id}`] && (
                                                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 absolute" />
                                                    )}
                                                    <img
                                                        src={getImageUrl(episode.thumbnail || episode.banner || animeObj?.cover)}
                                                        alt={animeTitle}
                                                        onLoad={() => handleImageLoad(`ep-${episode.id}`)}
                                                        className={cn(
                                                            "w-full h-full object-cover transition-all duration-700 group-hover:scale-110",
                                                            loadedImages[`ep-${episode.id}`] ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </>
                                            )}
                                            <div className="absolute top-2 left-2 px-2 py-1 text-[10px] font-black text-white bg-black/80 uppercase">
                                                {isRtl ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-col items-start text-right w-full">
                                            <h4 className="text-xs md:text-sm font-black text-gray-900 dark:text-white line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors w-full mb-1">
                                                {animeTitle}
                                            </h4>
                                            <p className="text-sm md:text-base font-black text-gray-500 uppercase tracking-tighter">
                                                {isRtl ? `الحلقة` : `Episode`}
                                            </p>
                                            <p className="text-2xl md:text-3xl font-black text-black dark:text-white -mt-1 leading-none">
                                                {episode.episode_number}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : !isEpisodesLoading ? (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No recent episodes found</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
