import { useEffect, useState } from 'react';
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Bookmark, Trash2, Play, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import BrowseSidebar from '@/components/sidebar/BrowseSidebar';
import { NewsTicker } from '@/components/common/NewsTicker';
import Footer from '@/components/common/Footer';
import { renderEmojiContent } from '@/utils/render-content';
import { cn } from '@/lib/utils';
import CentralSpinner from '@/components/ui/CentralSpinner';

const BASE_URL = '';
import { getImageUrl } from '@/utils/image-utils';

function WatchlistItem({ item, isRtl, lang, onRemove }: { item: any; isRtl: boolean; lang: string; onRemove: any }) {
    const isEpisode = !!item.episode_id;
    const animeObj = item.anime;
    const episodeObj = item.episode;

    const link = isEpisode
        ? `/${lang}/watch/${item.anime_id}/${episodeObj?.episode_number || 1}`
        : `/${lang}/animes/${item.anime_id}`;

    const animeTitle = isRtl ? animeObj?.title : (animeObj?.title_en || animeObj?.title);
    const episodeTitleStr = isRtl ? episodeObj?.title : (episodeObj?.title_en || episodeObj?.title);
    
    let title = animeTitle || 'Anime';
    if (isEpisode) {
        if (episodeTitleStr) {
            title = episodeTitleStr;
        } else if (episodeObj?.episode_number) {
            title = `${animeTitle} - ${isRtl ? 'الحلقة' : 'Episode'} ${episodeObj.episode_number}`;
        } else {
            title = `${animeTitle} - ${isRtl ? 'حلقة' : 'Episode'}`;
        }
    }

    const description = isEpisode
        ? ((isRtl ? episodeObj?.description : episodeObj?.description_en) || (isRtl ? animeObj?.description : animeObj?.description_en))
        : (isRtl ? animeObj?.description : animeObj?.description_en);

    const image = isEpisode 
        ? (episodeObj?.thumbnail || episodeObj?.banner || animeObj?.cover || animeObj?.image) 
        : (animeObj?.cover || animeObj?.image);

    return (
        <div className="group relative flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-50/50 dark:hover:bg-neutral-900/40 transition-colors duration-200 border border-transparent hover:border-gray-100 dark:hover:border-transparent rounded-xl p-2 md:p-3 hover:shadow-sm">
            <Link to={link} className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] flex-shrink-0 relative overflow-hidden rounded-xl bg-gray-900">
                {image ? (
                    <img
                        src={getImageUrl(image)}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">No Image</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-current" />
                </div>
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider">
                    {isEpisode ? (isRtl ? 'حلقة' : 'EPISODE') : (isRtl ? 'أنمي' : 'ANIME')}
                </div>
            </Link>

            <div className="flex-1 flex flex-col items-start py-0 md:py-1 min-w-0">
                <div className="flex justify-between items-start w-full gap-2">
                    <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-2 md:line-clamp-1">
                        <Link to={link}>{renderEmojiContent(title)}</Link>
                    </h3>
                    <button
                        onClick={(e) => onRemove(e, item.anime_id, item.episode_id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                        title={isRtl ? 'إزالة' : 'Remove'}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-2 font-normal">
                    {renderEmojiContent(description || '')}
                </p>

                <div className="mt-auto flex items-center gap-4 w-full pt-1">
                    <span className="text-[10px] md:text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                        {isEpisode ? animeTitle : (isRtl ? 'سلسلة أنمي' : 'Anime Series')}
                    </span>
                    <span className="text-[10px] text-gray-400">
                        {new Date(item.created_at).toLocaleDateString(lang, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function WatchlistBrowsePage() {
    const { i18n } = useTranslation();
    const location = useLocation();
    const isRtl = i18n.language === 'ar';
    const lang = i18n.language || 'en';
    const { items, isLoading, fetchItems, toggleItem } = useWatchLaterStore();

    const isDashboard = location.pathname.includes('/dashboard');

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleRemove = async (e: React.MouseEvent, animeId: number | undefined, episodeId: number | undefined) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleItem(animeId || null, episodeId || null);
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
            <Helmet>
                <title>{isRtl ? 'قائمة المشاهدة' : 'Watchlist'} - AnimeLast</title>
            </Helmet>

            <div className="w-full">
                <NewsTicker />

                <div className="flex flex-col lg:flex-row gap-0 lg:gap-0 pt-0 lg:pt-0">

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 px-2 sm:px-6 md:px-8 pt-3 pb-8 lg:pt-5 max-w-7xl mx-auto w-full">
                        {/* Header matching Browse Style */}
                        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-6 text-base font-bold">
                                <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <Filter className="w-5 h-5" />
                                    <span>{isRtl ? 'فلتر' : 'Filter'}</span>
                                </button>
                                <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <ArrowUpDown className="w-5 h-5" />
                                    <span>{isRtl ? 'ترتيب' : 'Sort'}</span>
                                </button>
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Bookmark className="w-6 h-6" />
                                {isRtl ? 'قائمة المشاهدة الخاصة بي' : 'My Watchlist'}
                            </h2>
                        </div>

                        {isLoading ? (
                            <CentralSpinner />
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-200 dark:border-[#333]">
                                <Bookmark className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">{isRtl ? 'قائمة المشاهدة فارغة' : 'Your watchlist is empty'}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {items.map((item) => (
                                    <WatchlistItem
                                        key={item.id}
                                        item={item}
                                        isRtl={isRtl}
                                        lang={lang}
                                        onRemove={handleRemove}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}
