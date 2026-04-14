import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInView } from 'react-intersection-observer';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Eye, ThumbsUp } from 'lucide-react';
import EpisodeSkeleton from '@/components/skeleton/EpisodeSkeleton';
import SpinnerImage from '@/components/ui/SpinnerImage';
import { renderEmojiContent } from '@/utils/render-content';

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
    getRelativeTime,
}: EpisodesModalProps) {
    const navigate = useNavigate();

    // ... (rest of logic)

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

    // Remove client-side reset logic

    // Show loading skeleton when modal first opens
    const [showLoading, setShowLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowLoading(true);
            const timer = setTimeout(() => {
                setShowLoading(false);
            }, 300); // Show skeleton for 300ms when opening
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
        if (isOpen && !showLoading && activeEpisodeRef.current && listRef.current && filteredEpisodes.length > 0) {
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
    }, [isOpen, activeEpisodeNum, filteredEpisodes, showLoading]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-4xl w-full h-full md:h-[90vh] p-0 gap-0 bg-white dark:bg-black border-gray-200 dark:border-[#222] rounded-none md:rounded-xl"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <DialogHeader className="p-4 border-b border-gray-200 dark:border-[#222]">
                    <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        {lang === 'ar' ? 'حلقات المسلسل' : 'Episodes'}
                    </DialogTitle>
                </DialogHeader>

                {/* Search Box */}
                <div className="p-4 pb-2 border-b border-gray-200 dark:border-[#222]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder={lang === 'ar' ? 'بحث عن حلقة...' : 'Search episodes...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus={false}
                            className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#222] pl-9 pr-4 py-2 text-sm outline-none focus:border-black dark:focus:border-white text-gray-900 dark:text-white"
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

                {/* Episodes List */}
                {(showLoading || isLoading) ? (
                    <EpisodeSkeleton
                        count={6}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2 pb-4 overflow-y-auto custom-scrollbar"
                    />
                ) : (
                    <div ref={listRef} className="grid grid-cols-1 gap-1.5 px-3 pt-2 pb-4 overflow-y-auto custom-scrollbar">
                        {filteredEpisodes.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                {lang === 'ar' ? 'لا توجد حلقات' : 'No episodes found'}
                            </div>
                        ) : (
                            displayedEpisodes.map((ep: any) => {
                                const title = (lang === 'ar' ? ep.title : ep.title_en) || `Episode ${ep.episode_number}`;
                                return (
                                    <div
                                        key={ep.id}
                                        ref={Number(ep.episode_number) === Number(activeEpisodeNum) ? activeEpisodeRef : null}
                                        onClick={() => handleNavigate(ep.episode_number)}
                                        className="group cursor-pointer relative z-0 border-b border-gray-100 dark:border-white/5 pb-1.5 last:border-0"
                                    >
                                        <div className="flex flex-row gap-3 w-full h-full">
                                            {/* Thumbnail Container */}
                                            <div className={`relative flex-shrink-0 w-[140px] aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c]`}>
                                                <SpinnerImage
                                                    src={getImageUrl(ep.thumbnail || ep.banner)}
                                                    alt={title}
                                                    className="w-full h-full"
                                                    imageClassName="object-cover"
                                                />

                                                {/* Badge */}
                                                <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 bg-black/80">
                                                    {ep.episode_number}
                                                </div>

                                                {/* Watching Now overlay */}
                                                {Number(ep.episode_number) === Number(activeEpisodeNum) && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                                            {lang === 'ar' ? 'تشاهده الآن' : 'Watching Now'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Metadata */}
                                            <div className="flex-1 flex flex-col items-start text-right py-0">
                                                <h4 className={`font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight text-sm mb-1`}>
                                                    {renderEmojiContent(title)}
                                                </h4>
                                                {(ep.description || ep.description_en) && (
                                                    <p className="text-[12.5px] text-gray-700 dark:text-gray-300 line-clamp-3 leading-snug text-start mb-1">
                                                        {renderEmojiContent(lang === 'ar' ? (ep.description || ep.description_en) : (ep.description_en || ep.description))}
                                                    </p>
                                                )}
                                                <p className="text-lg font-black text-gray-900 dark:text-white mt-1">
                                                    {lang === 'ar' ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                </p>
                                                <div className="flex items-center justify-center gap-3 pt-1">
                                                    <div className="flex items-center gap-1.5 text-gray-900 dark:text-white transition-transform">
                                                        <ThumbsUp className="w-4 h-4 fill-current" />
                                                        <span className="text-xs font-black">{ep.likes_count || 0}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                                        <span className="text-xs font-black whitespace-nowrap uppercase tracking-wide">
                                                            {ep.views_count || 0} {lang === 'ar' ? 'مشاهدة' : 'Views'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {hasNextPage && (
                            <div ref={loadMoreRef} className="py-4 flex justify-center items-center gap-2 text-gray-500">
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">{lang === 'ar' ? 'جاري تحميل المزيد من قاعدة البيانات...' : 'Loading more from database...'}</span>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
