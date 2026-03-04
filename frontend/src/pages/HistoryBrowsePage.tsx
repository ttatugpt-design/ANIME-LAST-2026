import { useEffect, useState, useRef } from 'react';
import { useHistoryStore, HistoryItem as HistoryItemType } from '@/stores/history-store';
import { useTranslation } from 'react-i18next';
import { History, Trash2, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import AnimeHoverCard from '@/components/AnimeHoverCard';
import { slugify } from '@/utils/slug';
import BrowseSidebar from '@/components/sidebar/BrowseSidebar';
import { NewsTicker } from '@/components/common/NewsTicker';
import Footer from '@/components/common/Footer';

const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

const getActionDescription = (item: HistoryItemType, isRtl: boolean) => {
    let metadata: any = {};
    if (item.metadata) {
        try {
            metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        } catch (e) {
            metadata = {};
        }
    }

    const episodeNum = item.episode?.episode_number;
    const episodeInfo = isRtl ? `الحلقة ${episodeNum}` : `Episode ${episodeNum}`;

    switch (item.activity_type) {
        case 'comment':
            return isRtl ? `علّقت: "${metadata.content || '...'}"` : `Commented: "${metadata.content || '...'}"`;
        case 'reply':
            const repliedTo = metadata.replied_to_user || (isRtl ? 'مستخدم' : 'user');
            return isRtl ? `رد على ${repliedTo}` : `Replied to ${repliedTo}`;
        case 'like':
            const owner = metadata.comment_owner || (isRtl ? 'مستخدم' : 'user');
            return isRtl ? `أعجبت بتعليق ${owner}` : `Liked comment by ${owner}`;
        case 'episode_view':
            return isRtl ? `شاهدت ${episodeInfo}` : `Watched ${episodeInfo}`;
        case 'anime_view':
            return isRtl ? 'شاهدت هذا الأنمي' : 'Viewed this anime';
        default:
            return isRtl ? 'نشاط' : 'Activity';
    }
};

const getActionLabel = (type: string, isRtl: boolean) => {
    switch (type) {
        case 'comment': return isRtl ? 'تعليق' : 'Comment';
        case 'reply': return isRtl ? 'رد' : 'Reply';
        case 'like': return isRtl ? 'إعجاب' : 'Like';
        default: return isRtl ? 'مشاهدة' : 'Watch';
    }
};

const getActionColor = (type: string) => {
    switch (type) {
        case 'comment': return 'bg-blue-600';
        case 'reply': return 'bg-green-600';
        case 'like': return 'bg-red-600';
        default: return 'bg-black/80';
    }
};

export default function HistoryBrowsePage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { history, isLoading, fetchHistory, clearHistory } = useHistoryStore();
    const navigate = useNavigate();
    const location = useLocation();

    const isDashboard = location.pathname.includes('/dashboard');

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

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleClearAll = async () => {
        if (window.confirm(isRtl ? 'هل أنت متأكد من حذف كل السجل؟' : 'Are you sure you want to clear all history?')) {
            await clearHistory();
        }
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
            <Helmet>
                <title>{isRtl ? 'سجل النشاط' : 'Activity History'} - AnimeLast</title>
            </Helmet>

            <div className="w-full">
                <NewsTicker />

                <div className="flex flex-col lg:flex-row min-h-screen">
                    {/* Sidebar */}
                    {!isDashboard && (
                        <div className="hidden lg:block w-80 border-r border-gray-200 dark:border-[#2a2a2a] lg:order-1 flex-shrink-0 bg-white dark:bg-[#0a0a0a]">
                            <div className="sticky top-[100px] h-[calc(100vh-100px)] overflow-hidden">
                                <BrowseSidebar />
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-8 lg:order-2">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <History className="w-6 h-6 text-black dark:text-white" />
                                {isRtl ? 'سجل النشاط' : 'Activity History'}
                            </h1>
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isRtl ? 'مسح السجل' : 'Clear History'}
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                                <CrunchyrollSkeleton count={12} />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <History className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">{isRtl ? 'لا يوجد سجل نشاط' : 'No activity history'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6 relative z-0">
                                {history.map((item, index) => {
                                    let image = '';
                                    let title = '';
                                    let episodeNumber: number | undefined;
                                    let link = '#';
                                    let animeId: number | undefined;
                                    let hoverData: any = null;

                                    if (item.episode) {
                                        image = item.image || item.episode.thumbnail || item.episode.anime?.cover || '';
                                        title = isRtl ? (item.episode.title || item.episode.anime?.title || 'حلقة') : (item.episode.title_en || item.episode.anime?.title_en || 'Episode');
                                        episodeNumber = item.episode.episode_number;
                                        const animeObj = item.episode.anime;
                                        animeId = item.episode.anime_id || animeObj?.id;

                                        if (animeId && episodeNumber) {
                                            const animeTitle = isRtl ? (item.episode.anime?.title || item.episode.title) : (item.episode.anime?.title_en || item.episode.title_en || item.episode.anime?.title);
                                            link = `/${i18n.language}/watch/${animeId}/${episodeNumber}/${slugify(animeTitle)}`;
                                        }
                                        hoverData = item.episode;
                                    } else if (item.anime) {
                                        image = item.image || item.anime.cover || item.anime.image || '';
                                        title = isRtl ? item.anime.title : (item.anime.title_en || item.anime.title);
                                        animeId = item.anime_id;

                                        if (animeId) {
                                            const animeTitle = isRtl ? item.anime.title : (item.anime.title_en || item.anime.title);
                                            link = `/${i18n.language}/animes/${animeId}/${slugify(animeTitle)}`;
                                        }
                                        hoverData = item.anime;
                                    }

                                    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
                                        addSuffix: true,
                                        locale: isRtl ? ar : undefined
                                    });

                                    const subText = getActionDescription(item, isRtl);
                                    const isHovered = hoveredCardIndex === index;

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => navigate(link)}
                                            onMouseEnter={() => handleMouseEnter(index)}
                                            onMouseLeave={handleMouseLeave}
                                            className="group cursor-pointer relative z-0"
                                        >
                                            <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-2">
                                                <img
                                                    src={getImageUrl(image)}
                                                    alt={title}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 ${getActionColor(item.activity_type)}`}>
                                                    {getActionLabel(item.activity_type, isRtl)}
                                                </div>
                                                {episodeNumber && item.activity_type === 'episode_view' && (
                                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-bold bg-black/60 text-white z-10 backdrop-blur-sm">
                                                        {isRtl ? `ح ${episodeNumber}` : `EP ${episodeNumber}`}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1 px-1">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors">
                                                    {title}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                    {subText}
                                                </p>
                                                <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{timeAgo}</span>
                                                </div>
                                            </div>

                                            {isHovered && hoverData && (
                                                <div className="absolute inset-0 z-50">
                                                    <AnimeHoverCard
                                                        data={hoverData}
                                                        lang={i18n.language}
                                                        onMouseEnter={keepCardOpen}
                                                        onMouseLeave={handleMouseLeave}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <Footer />
            </div>
        </div>
    );
}
