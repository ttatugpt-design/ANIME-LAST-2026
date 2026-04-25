import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInView } from 'react-intersection-observer';
import { Search, X, Eye } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import SpinnerImage from '@/components/ui/SpinnerImage';
import CentralSpinner from '@/components/ui/CentralSpinner';
import { renderEmojiContent } from '@/utils/render-content';
import { cn } from '@/lib/utils';

// Reaction helpers (matching AnimeDetailsPage)
const REACTION_EMOJIS_D: Record<string, string> = {
    like:      '/uploads/تفاعل البوست/أعجبني.png',
    love:      '/uploads/تفاعل البوست/أحببتة.png',
    haha:      '/uploads/تفاعل البوست/اضحكني.png',
    wow:       '/uploads/تفاعل البوست/واوو.png',
    sad:       '/uploads/تفاعل البوست/أحزنني.gif',
    angry:     '/uploads/تفاعل البوست/أغضبني.gif',
    super_sad: '/uploads/تفاعل البوست/أحززنني جدا.png',
};

const REACTION_KEYS_D = [
    { key: 'like', col: 'likes_count' },
    { key: 'love', col: 'loves_count' },
    { key: 'haha', col: 'hahas_count' },
    { key: 'wow',  col: 'wows_count' },
    { key: 'sad',  col: 'sads_count' },
    { key: 'angry', col: 'angrys_count' },
    { key: 'super_sad', col: 'super_sads_count' },
];

function getTopReactionsD(item: any, maxShown = 3) {
    return REACTION_KEYS_D
        .map(({ key, col }) => ({ key, count: Number(item[col] || 0) }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxShown);
}

function fmtCountD(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

interface EpisodesModalProps {
    isOpen: boolean;
    onClose: () => void;
    episodes: any[];
    activeEpisodeNum: number;
    animeId: number;
    slug?: string;
    lang: string;
    isLoading?: boolean;
    hasNextPage?: boolean;
    fetchNextPage?: () => void;
    isFetchingNextPage?: boolean;
    getImageUrl: (path?: string) => string;
    getRelativeTime: (date: string, lang: string) => string;
}

export default function EpisodesModal({
    isOpen,
    onClose,
    episodes,
    activeEpisodeNum,
    animeId,
    slug,
    lang,
    isLoading = false,
    hasNextPage = false,
    fetchNextPage,
    isFetchingNextPage = false,
    getImageUrl,
}: EpisodesModalProps) {
    const navigate = useNavigate();

    // navigate use slug if available
    const handleNavigate = (epNum: number) => {
        const url = slug
            ? `/${lang}/watch/${animeId}/${epNum}/${slug}`
            : `/${lang}/watch/${animeId}/${epNum}`;
        navigate(url);
        onClose();
    };
    const [searchQuery, setSearchQuery] = useState('');
    const activeEpisodeRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter episodes based on search
    const filteredEpisodes = useMemo(() => {
        if (!searchQuery) return episodes;
        const query = searchQuery.toLowerCase();
        return episodes.filter((ep: any) =>
            ep.title?.toLowerCase().includes(query) ||
            ep.title_en?.toLowerCase().includes(query) ||
            ep.episode_number.toString().includes(query)
        );
    }, [episodes, searchQuery]);

    // Infinite Scroll Logic (Server-side)
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.1,
        rootMargin: '100px',
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage && fetchNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const displayedEpisodes = filteredEpisodes;

    // Show loading spinner when modal first opens or is fetching
    const [isInternalLoading, setIsInternalLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsInternalLoading(true);
            const timer = setTimeout(() => {
                setIsInternalLoading(false);
            }, 600); // 600ms premium spinner feel
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prevent autofocus on search input when modal opens (mobile)
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.blur();
        }
    }, [isOpen]);

    // Auto-scroll to active episode when modal opens
    useEffect(() => {
        if (isOpen && !isInternalLoading && activeEpisodeRef.current && listRef.current && filteredEpisodes.length > 0) {
            setTimeout(() => {
                const element = activeEpisodeRef.current;
                const container = listRef.current;
                if (element && container) {
                    const top = element.offsetTop - container.offsetTop;
                    container.scrollTo({
                        top: Math.max(0, top),
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    }, [isOpen, activeEpisodeNum, filteredEpisodes, isInternalLoading]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-4xl w-full h-full md:h-[90vh] p-0 gap-0 bg-white dark:bg-black border-gray-200 dark:border-[#222] rounded-none md:rounded-xl overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-4 border-b border-gray-200 dark:border-[#222] shrink-0">
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        {lang === 'ar' ? 'حلقات المسلسل' : 'Episodes'}
                    </DialogTitle>
                </DialogHeader>

                {/* Search Box */}
                <div className="p-4 pb-2 border-b border-gray-200 dark:border-[#222] shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={lang === 'ar' ? 'بحث عن حلقة...' : 'Search episodes...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus={false}
                            className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] pl-9 pr-4 py-2 text-sm outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-white rounded-lg transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Episodes List Container */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                    {(isInternalLoading || isLoading) ? (
                        <div className="absolute inset-0 z-50 bg-white dark:bg-black flex items-center justify-center">
                            <CentralSpinner />
                        </div>
                    ) : null}

                    <div ref={listRef} className="flex-1 overflow-y-auto px-3 pt-2 pb-4 custom-scrollbar">
                        {filteredEpisodes.length === 0 && !isInternalLoading && !isLoading ? (
                            <div className="flex items-center justify-center py-20 text-gray-500 font-bold">
                                {lang === 'ar' ? 'لا توجد حلقات متاحة حالياً' : 'No episodes available right now'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-1.5">
                                {displayedEpisodes.map((ep: any) => {
                                    const title = (lang === 'ar' ? ep.title : ep.title_en) || `Episode ${ep.episode_number}`;
                                    const topReactions = getTopReactionsD(ep);
                                    const isActive = Number(ep.episode_number) === Number(activeEpisodeNum);
                                    
                                    return (
                                        <div
                                            key={ep.id}
                                            ref={isActive ? activeEpisodeRef : null}
                                            onClick={() => handleNavigate(ep.episode_number)}
                                            className={cn(
                                                "group cursor-pointer relative z-0 border-b border-gray-100 dark:border-white/5 pb-1.5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 p-1 rounded-xl transition-all active:scale-[0.98]",
                                                isActive && "bg-blue-50/50 dark:bg-blue-500/10"
                                            )}
                                        >
                                            <div className="flex flex-row gap-3 w-full h-full">
                                                {/* Thumbnail Container */}
                                                <div className={cn(
                                                    "relative flex-shrink-0 w-[140px] md:w-[160px] aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] rounded-xl shadow-sm transition-all",
                                                    isActive ? "ring-2 ring-blue-500 shadow-blue-500/20" : "group-hover:shadow-md"
                                                )}>
                                                    <SpinnerImage
                                                        src={getImageUrl(ep.thumbnail || ep.banner)}
                                                        alt={title}
                                                        className="w-full h-full"
                                                        imageClassName="object-cover"
                                                    />

                                                    {/* Badge */}
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-black text-white z-10 bg-black/80 rounded border border-white/10 uppercase tracking-tighter">
                                                        {lang === 'ar' ? 'حلقة' : 'EP'} {ep.episode_number}
                                                    </div>

                                                    {/* Watching Now overlay */}
                                                    {isActive && (
                                                        <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                                                            <span className="text-[10px] font-black text-white uppercase tracking-wider bg-blue-600 px-2 py-0.5 rounded shadow-lg">
                                                                {lang === 'ar' ? 'تشاهده الآن' : 'Watching Now'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Metadata */}
                                                <div className="flex-1 flex flex-col items-start py-0 min-w-0">
                                                    <h4 className={cn(
                                                        "font-black line-clamp-1 leading-tight text-[15px] mb-1 transition-colors",
                                                        isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white group-hover:text-blue-500"
                                                    )}>
                                                        {renderEmojiContent(title)}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[13px] font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                                            {lang === 'ar' ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>{ep.views_count || 0}</span>
                                                        </div>
                                                    </div>

                                                    {/* Top Reactions Row */}
                                                    {topReactions.length > 0 && (
                                                        <div className="flex items-center gap-2 mt-auto pb-1">
                                                            {topReactions.map(r => (
                                                                <div key={r.key} className="flex items-center gap-0.5 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded-full border border-gray-100 dark:border-white/5 shadow-sm">
                                                                    <img
                                                                        src={getImageUrl(REACTION_EMOJIS_D[r.key])}
                                                                        alt={r.key}
                                                                        className="w-4 h-4 object-contain"
                                                                        loading="lazy"
                                                                    />
                                                                    <span className="text-[10px] font-black text-gray-600 dark:text-gray-400">
                                                                        {fmtCountD(r.count)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {hasNextPage && (
                            <div ref={loadMoreRef} className="py-6 flex flex-col justify-center items-center gap-3 text-gray-500">
                                <div className="w-8 h-8 border-4 border-gray-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{lang === 'ar' ? 'تحميل المزيد...' : 'Loading more...'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
