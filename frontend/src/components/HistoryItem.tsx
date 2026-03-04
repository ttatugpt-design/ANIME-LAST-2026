import { Link } from 'react-router-dom';
import { Film, Play, MessageSquare, Heart, Reply, Clock, Star } from 'lucide-react';
import { HistoryItem as HistoryItemType } from '@/stores/history-store';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useState, useRef } from 'react';

interface HistoryItemProps {
    item: HistoryItemType;
    lang: string;
}

// Helper for image URLs
const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

// Parse content with emoji support
const parseContent = (content: string) => {
    if (!content) return [];
    const parts: Array<{ type: 'text' | 'emoji' | 'image-emoji'; content: string }> = [];
    const regex = /:([a-zA-Z0-9_]+):|!\[emoji\]\((.*?)\)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
        }
        if (match[0].startsWith('![')) {
            parts.push({ type: 'image-emoji', content: match[2] });
        } else {
            parts.push({ type: 'emoji', content: match[1] });
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
        parts.push({ type: 'text', content: content.slice(lastIndex) });
    }
    return parts;
};

// Render helpers
const RenderEmojiContent = ({ content }: { content: string }) => (
    <span className="inline-block break-words whitespace-pre-wrap">
        {parseContent(content).map((part, idx) => {
            if (part.type === 'text') return <span key={idx}>{part.content}</span>;
            if (part.type === 'emoji') return <span key={idx} className="inline-block mx-0.5">{String.fromCodePoint(parseInt(part.content, 16))}</span>;
            if (part.type === 'image-emoji') return <img key={idx} src={part.content} alt="emoji" className="inline-block w-5 h-5 mx-0.5 align-middle" />;
            return null;
        })}
    </span>
);

export default function HistoryItem({ item, lang }: HistoryItemProps) {
    const isRtl = lang === 'ar';
    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata || {};

    // Hover state
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 100);
    };

    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
        addSuffix: true,
        locale: isRtl ? ar : undefined
    });

    // --- EPISODE & ANIME CARD (Matching AnimeBrowsePage EXACTLY) ---
    if ((item.activity_type === 'episode_view' && item.episode) || (item.activity_type === 'anime_view' && item.anime)) {
        const isEpisode = item.activity_type === 'episode_view';
        const entity = isEpisode ? item.episode! : item.anime!;
        const anime = isEpisode ? item.episode!.anime : item.anime!;

        // Logic matching CardItem in AnimeBrowsePage
        const image = isEpisode ? ((entity as any).banner || (entity as any).image || anime?.cover) : ((entity as any).image || (entity as any).cover);
        const titleRaw = lang === 'ar' ? (entity.title || anime?.title) : ((entity as any).title_en || anime?.title_en || entity.title);

        const displayTitle = titleRaw || (lang === 'ar' ? 'عنوان غير متوفر' : 'Title Not Available');
        // Subtext: For Episode -> "Episode X", For Anime -> "Status" (or just 'Anime')
        const subText = isEpisode
            ? (lang === 'ar' ? `الحلقة ${(entity as any).episode_number}` : `Episode ${(entity as any).episode_number}`)
            : (lang === 'ar' ? 'مسلسل' : 'Anime');

        const animeSlug = lang === 'ar'
            ? (anime?.slug || (entity as any).anime_id || (entity as any).id)
            : (anime?.slug_en || anime?.slug || (entity as any).anime_id || (entity as any).id);

        const link = isEpisode
            ? `/${lang}/watch/${animeSlug}/${(entity as any).episode_number}`
            : `/${lang}/animes/${animeSlug}`;

        return (
            <div
                className="group cursor-pointer relative z-0 w-full"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <Link to={link}>
                    {/* Cover Container */}
                    <div className={`relative ${isEpisode ? 'aspect-video' : 'aspect-[2/3]'} overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-2`}>
                        <img
                            src={getImageUrl(image)}
                            alt={String(displayTitle)}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />

                        {/* Badges - Exact match to BrowsePage */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 bg-black/80`}>
                            {isEpisode ? (entity as any).episode_number : (isRtl ? 'مسلسل' : 'TV')}
                        </div>

                        {/* Watched/New Badge (Here we show Watched for history context) */}
                        <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold bg-green-500 rounded text-white z-10">
                            {isRtl ? 'مشاهدة' : 'Viewed'}
                        </div>
                    </div>

                    {/* Metadata Below Card */}
                    <div className="space-y-1 px-1 text-center">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight">
                            {displayTitle}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {subText}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                            {!isEpisode && (
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{(entity as any).rating || 'N/A'}</span>
                                </div>
                            )}
                            <span className="text-gray-600">•</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>
                </Link>

                {/* Hover Card would go here if enabled */}
            </div>
        );
    }

    // --- INTERACTIONS (Comment, Like, Reply) as GRID CARDS ---
    // User Requirement: 
    // No Image. Just Icon -> Then Content.

    let badgeText = '';
    let badgeColor = ''; // Background color for the card header
    let icon = null;

    if (item.activity_type === 'comment') {
        badgeText = isRtl ? 'تعليق' : 'Comment';
        badgeColor = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        icon = <MessageSquare className="w-12 h-12" strokeWidth={1.5} />;
    } else if (item.activity_type === 'reply') {
        badgeText = isRtl ? 'رد' : 'Reply';
        badgeColor = 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        icon = <Reply className="w-12 h-12" strokeWidth={1.5} />;
    } else if (item.activity_type === 'like') {
        badgeText = isRtl ? 'إعجاب' : 'Like';
        badgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
        icon = <Heart className="w-12 h-12" strokeWidth={1.5} />;
    }

    const contentPreview = metadata.content || item.comment?.content || '';

    return (
        <div className="group relative z-0 w-full h-full flex flex-col">
            {/* Visual Header: ICON ONLY (No Image) */}
            <div className={`relative aspect-video overflow-hidden mb-2 rounded border ${badgeColor} flex items-center justify-center transition-colors hover:bg-opacity-20`}>

                {/* Large Centered Icon */}
                <div className="transform scale-125">
                    {icon}
                </div>

                {/* Badge (Top Left) */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded shadow-sm z-10`}>
                    {badgeText}
                </div>

                {/* Time Badge (Top Right) */}
                <div className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold bg-black/40 rounded text-white z-10">
                    {timeAgo}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded text-sm border border-gray-100 dark:border-[#333] flex flex-col">

                {/* Interaction Header: Who we replied to, etc. */}
                <div className="mb-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                    {item.activity_type === 'comment' && (isRtl ? 'تعليقك:' : 'Your Comment:')}

                    {item.activity_type === 'reply' && (
                        <span>
                            {isRtl ? 'رديت على ' : 'Replied to '}
                            <span className="text-gray-900 dark:text-white">{metadata.replied_to_user || 'User'}</span>
                        </span>
                    )}

                    {item.activity_type === 'like' && (
                        <span>
                            {isRtl ? 'أعجبك تعليق ' : 'Liked comment by '}
                            <span className="text-gray-900 dark:text-white">{metadata.comment_owner || 'User'}</span>
                        </span>
                    )}
                </div>

                {/* The Content */}
                <div className="flex-1 mb-2 line-clamp-3 text-gray-800 dark:text-gray-200 font-medium">
                    {item.activity_type === 'like' ? (
                        <span className="italic text-gray-500">
                            "{metadata.comment_content}"
                        </span>
                    ) : (
                        <RenderEmojiContent content={contentPreview} />
                    )}
                </div>

                {/* Context: Which Episode? */}
                {item.episode && (
                    <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700 font-medium">
                        {(() => {
                            const animeObj = item.episode.anime;
                            const animeSlug = lang === 'ar'
                                ? (animeObj?.slug || item.episode.anime_id)
                                : (animeObj?.slug_en || animeObj?.slug || item.episode.anime_id);

                            return (
                                <Link to={`/${lang}/watch/${animeSlug}/${item.episode.episode_number}`} className="flex items-center gap-1 text-xs text-black dark:text-white font-bold hover:underline line-clamp-1">
                                    {lang === 'ar' ? 'في: ' : 'In: '}
                                    {lang === 'ar' ? animeObj?.title : (animeObj?.title_en || animeObj?.title)}
                                    <span className="text-gray-400 font-normal">
                                        ({isRtl ? `حلقة ${item.episode.episode_number}` : `EP ${item.episode.episode_number}`})
                                    </span>
                                </Link>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
