import React, { useState, useEffect } from 'react';
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { useHistoryStore } from '@/stores/history-store';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Bookmark, History, Bell, Trash2, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import HistorySkeleton from '@/components/skeleton/HistorySkeleton';
import HistoryItem from '@/components/HistoryItem';

// Helper for image URLs
const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function UserLibraryPage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [activeTab, setActiveTab] = useState<'watchlist' | 'history' | 'updates'>('watchlist');

    // Watch List Store
    const { items: watchItems, isLoading: watchLoading, fetchItems, toggleItem } = useWatchLaterStore();

    // History Store
    const { history, isLoading: historyLoading, fetchHistory } = useHistoryStore();

    useEffect(() => {
        if (activeTab === 'watchlist') {
            fetchItems();
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, fetchItems, fetchHistory]);

    // Format Date Helper
    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString(i18n.language, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleRemove = async (e: React.MouseEvent, animeId: number | undefined, episodeId: number | undefined) => {
        e.preventDefault();
        await toggleItem(animeId || null, episodeId || null);
    };

    // Tabs Configuration
    const tabs = [
        { id: 'watchlist', label: isRtl ? 'قائمة المشاهدة' : 'Watch List', icon: Bookmark },
        { id: 'history', label: isRtl ? 'السجل' : 'History', icon: History },
        { id: 'updates', label: isRtl ? 'تحديثات القائمة' : 'Updates', icon: Bell },
    ];

    return (
        <div className="w-full text-gray-900 dark:text-gray-100 font-sans animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isRtl ? 'مكتبتي' : 'My Library'} - AnimeLast</title>
            </Helmet>

            {activeTab === 'watchlist' && watchLoading ? (
                <CrunchyrollSkeleton variant="full-screen" />
            ) : (
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
                    {/* Page Header */}
                    <div className="mb-10 flex flex-col items-start gap-4">
                        <h1 className="text-3xl font-bold tracking-tight">{isRtl ? 'مكتبتي' : 'My Library'}</h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            {isRtl ? 'تتبع أنمياتك المفضلة، سجلك، وآخر التحديثات' : 'Track your favorite animes, history, and latest updates.'}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-[#333] mb-8 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "px-6 py-3 flex items-center gap-2 font-medium transition-all relative whitespace-nowrap",
                                        isActive
                                            ? "text-orange-500"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", isActive && "fill-current")} />
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content Area */}
                    <div className="min-h-[400px]">
                        {/* WATCH LIST TAB */}
                        {activeTab === 'watchlist' && (
                            <>
                                {watchItems.length === 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-200 dark:border-[#333]">
                                            <Bookmark className="w-12 h-12 mb-4 opacity-20" />
                                            <p>{isRtl ? 'لم تقم بحفظ أي شيء بعد' : 'You haven\'t saved anything yet'}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {watchItems.map((item) => {
                                            const isEpisode = !!item.episode_id;
                                            const animeObj = item.anime;
                                            const animeSlug = isRtl
                                                ? (animeObj?.slug || item.anime_id)
                                                : (animeObj?.slug_en || animeObj?.slug || item.anime_id);

                                            const link = isEpisode
                                                ? `/${i18n.language}/watch/${animeSlug}/${item.episode?.episode_number}`
                                                : `/${i18n.language}/animes/${animeSlug}`;

                                            const title = isEpisode
                                                ? (isRtl ? item.episode?.title : item.episode?.title_en) || `Episode ${item.episode?.episode_number}`
                                                : (isRtl ? item.anime?.title : item.anime?.title_en) || 'Anime';

                                            const subtitle = isEpisode ? (isRtl ? item.anime.title : item.anime.title_en) : 'Anime Series';
                                            const image = isEpisode ? (item.episode?.thumbnail || item.episode?.banner) : item.anime?.cover;

                                            return (
                                                <div key={item.id} className="group relative bg-white dark:bg-[#111] border border-gray-100 dark:border-[#222] hover:border-orange-500/50 transition-colors">
                                                    {/* Image */}
                                                    <Link to={link} className="block aspect-video bg-gray-900 overflow-hidden relative">
                                                        {image ? (
                                                            <img
                                                                src={getImageUrl(image)}
                                                                alt={title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">No Image</div>
                                                        )}

                                                        {/* Play Overlay */}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Play className="w-12 h-12 text-white fill-white" />
                                                        </div>

                                                        {/* Type Badge */}
                                                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold uppercase tracking-wider">
                                                            {isEpisode ? (isRtl ? 'حلقة' : 'EPISODE') : (isRtl ? 'أنمي' : 'ANIME')}
                                                        </div>
                                                    </Link>

                                                    {/* Info */}
                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mb-1">
                                                                    <Link to={link}>{title}</Link>
                                                                </h3>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-3">{subtitle}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#222]">
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatDate(item.created_at)}
                                                            </span>
                                                            <button
                                                                onClick={(e) => handleRemove(e, item.anime_id, item.episode_id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                title={isRtl ? 'إزالة' : 'Remove'}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}



                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className="space-y-6">
                                {historyLoading ? (
                                    <HistorySkeleton count={10} />
                                ) : history.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                        {history.map((item) => (
                                            <HistoryItem key={item.id} item={item} lang={i18n.language} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                                            {isRtl ? 'لا يوجد سجل' : 'No History'}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {isRtl ? 'لم تقم بأي نشاط بعد' : "You haven't done any activity yet"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* UPDATES TAB (Placeholder) */}
                        {activeTab === 'updates' && (
                            <div className="flex flex-col items-center justify-center py-32 text-gray-500 border border-dashed border-gray-200 dark:border-[#333]">
                                <Bell className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-lg font-bold mb-2">{isRtl ? 'لا توجد تحديثات' : 'No new updates'}</h3>
                                <p className="text-sm">{isRtl ? 'ستظهر هنا إشعارات الحلقات الجديدة' : 'Notifications about new episodes will appear here.'}</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </div >
    );
}
