import { useEffect, useState, useRef } from 'react';
import { useHistoryStore, HistoryItem as HistoryItemType } from '@/stores/history-store';
import { useTranslation } from 'react-i18next';
import { History, Trash2, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import AnimeHoverCard from '@/components/AnimeHoverCard';
import { slugify } from '@/utils/slug';


// Helper for image URLs
const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

// Get contextual description
const getActionDescription = (item: HistoryItemType, isRtl: boolean) => {
    let metadata: any = {};

    // Safely parse metadata
    if (item.metadata) {
        try {
            metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
        } catch (e) {
            console.error('Failed to parse metadata:', e);
            metadata = {};
        }
    }

    const episodeNum = item.episode?.episode_number;
    const episodeInfo = isRtl ? `الحلقة ${episodeNum}` : `Episode ${episodeNum}`;

    switch (item.activity_type) {
        case 'comment':
            return isRtl
                ? `علّقت: "${metadata.content || '...'}"`
                : `Commented: "${metadata.content || '...'}"`;
        case 'reply':
            const repliedTo = metadata.replied_to_user || (isRtl ? 'مستخدم' : 'user');
            return isRtl
                ? `رد على ${repliedTo}`
                : `Replied to ${repliedTo}`;
        case 'like':
            const owner = metadata.comment_owner || (isRtl ? 'مستخدم' : 'user');
            return isRtl
                ? `أعجبت بتعليق ${owner}`
                : `Liked comment by ${owner}`;
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

export default function HistoryPage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { history, isLoading, fetchHistory, clearHistory } = useHistoryStore();
    const navigate = useNavigate();

    // Hover state management
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
        <div className="w-full text-gray-900 dark:text-white transition-colors duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isRtl ? 'سجل النشاط' : 'Activity History'} - AnimeLast</title>
            </Helmet>

            {isLoading ? (
                <div className="flex items-center justify-center min-h-[80vh]">
                    <div className="container px-4 sm:px-6 md:px-8 py-8 mx-auto max-w-6xl">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                            <CrunchyrollSkeleton count={10} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <History className="w-6 h-6 text-black dark:text-white" />
                                    {isRtl ? 'سجل النشاط' : 'Activity History'}
                                </h1>
                            </div>
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-md transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {isRtl ? 'مسح السجل' : 'Clear History'}
                            </button>
                        </div>

                        {/* History Grid */}
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <History className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium">{isRtl ? 'لا يوجد سجل نشاط' : 'No activity history'}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6 relative z-0">
                                {history.map((item, index) => {
                                    // Prepare Data
                                    let image = '';
                                    let title = '';
                                    let episodeNumber: number | undefined;
                                    let link = '#';
                                    let animeId: number | undefined;
                                    let hoverData: any = null;

                                    if (item.episode) {
                                        // Use Episode Data
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
                                        // Use Anime Data
                                        image = item.image || item.anime.cover || item.anime.image || '';
                                        title = isRtl ? item.anime.title : (item.anime.title_en || item.anime.title);
                                        animeId = item.anime_id;

                                        if (animeId) {
                                            const animeTitle = isRtl ? item.anime.title : (item.anime.title_en || item.anime.title);
                                            link = `/${i18n.language}/animes/${animeId}/${slugify(animeTitle)}`;
                                        }
                                        hoverData = item.anime;
                                    } else {
                                        title = isRtl ? 'غير معروف' : 'Unknown';
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
                                            {/* Image Container */}
                                            <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-2">
                                                <img
                                                    src={getImageUrl(image)}
                                                    alt={title}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                />

                                                {/* Action Badge */}
                                                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 ${getActionColor(item.activity_type)}`}>
                                                    {getActionLabel(item.activity_type, isRtl)}
                                                </div>

                                                {/* Episode Number Badge (if applicable and viewing episode) */}
                                                {episodeNumber && item.activity_type === 'episode_view' && (
                                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 text-xs font-bold bg-black/60 text-white z-10 backdrop-blur-sm">
                                                        {isRtl ? `ح ${episodeNumber}` : `EP ${episodeNumber}`}
                                                    </div>
                                                )}

                                                {/* Play Overlay on Hover */}
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                </div>
                                            </div>

                                            {/* Content */}
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

                                            {/* Hover Card Component */}
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

                    {/* Footer (Optional, to match browse page feel if desired, but usually global layout handles this) */}
                    {/* If the user wants EXACTLY like browse page, we might adding the footer, but typically pages are inside a Layout. 
                         AnimeBrowsePage had its own footer in the code I read? Yes. 
                         Let's skip double footer if GlobalLayout has one. 
                         Assuming GlobalLayout wraps this. 
                      */}
                </div>
            )}
        </div>
    );
}
