import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Clock, Share2, Flag, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { WatchLaterButton } from '@/components/common/WatchLaterButton';

interface EpisodeInfoMenuProps {
    episode: any;
    anime: any;
    onDownload: () => void;
    onReport: () => void;
    onShare: () => void;
    isOpen: boolean;
    onClose: () => void;
}

export function EpisodeInfoMenu({ episode, anime, onDownload, onReport, onShare, isOpen, onClose }: EpisodeInfoMenuProps) {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const [isLoading, setIsLoading] = useState(false);

    // Simulate loading effect when opened
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            const timer = setTimeout(() => {
                setIsLoading(false);
            }, 800); // 0.8s loading animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const title = (lang === 'ar' ? episode.title : episode.title_en) || `Episode ${episode.episode_number}`;
    const animeTitle = anime.title;
    // Ensure we check all possible image sources
    const thumbnail = episode.thumbnail || episode.banner || anime.cover || anime.banner;

    // Helper for image URLs
    const getImageUrl = (url: string) => {
        if (!url) return '/placeholder-episode.jpg'; // Fallback
        if (url.startsWith('http')) return url;
        // If it's a relative path, ensure it starts with /
        return url.startsWith('/') ? url : `/${url}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-0 gap-0 rounded-none">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 min-h-[300px]">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-gray-100 dark:border-[#333] rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                        <p className="text-sm text-gray-400 font-medium animate-pulse">
                            {lang === 'ar' ? 'جاري التحميل...' : 'Loading info...'}
                        </p>
                    </div>
                ) : (
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        {/* Header with Image and Title - reused logic */}
                        <div className="relative h-64 w-full bg-gray-900 group shrink-0">
                            <img
                                src={getImageUrl(thumbnail)}
                                alt={title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/1a1c22/FFF?text=No+Image';
                                }}
                            />
                            {/* ... overlay content ... */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c22] via-black/50 to-transparent p-6 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 border border-purple-500/20 backdrop-blur-sm">
                                        {lang === 'ar' ? 'أنمي' : 'ANIME'}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 border border-green-500/20 backdrop-blur-sm">
                                        {lang === 'ar' ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                    </span>
                                    {episode.quality && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 border border-white/20 backdrop-blur-sm">
                                            {episode.quality}
                                        </span>
                                    )}
                                </div>

                                <h4 className="text-white font-black text-3xl leading-tight line-clamp-2 drop-shadow-md mb-2">{title}</h4>

                                <div className="flex items-center justify-between text-gray-300 text-sm font-medium opacity-90">
                                    <span className="truncate max-w-[65%] text-gray-200">{animeTitle}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-sm backdrop-blur-sm border border-white/5">
                                            <Clock className="w-3 h-3 text-black dark:text-white" />
                                            {episode.duration}m
                                        </span>
                                        {episode.release_date && (
                                            <span className="bg-black/40 px-2 py-1 rounded-sm backdrop-blur-sm border border-white/5">
                                                {new Date(episode.release_date).getFullYear()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="py-2">
                            {/* Watch Later Button */}
                            <div>
                                <WatchLaterButton
                                    animeId={parseInt(anime.id)}
                                    episodeId={episode.id}
                                    className="w-full justify-between items-center rounded-none px-8 py-5 h-auto text-lg font-medium hover:bg-gray-100 dark:hover:bg-[#252830] bg-transparent border-none shadow-none text-gray-700 dark:text-gray-200 group flex-row-reverse transition-colors"
                                    showLabel={true}
                                />
                            </div>

                            <div className="border-t border-gray-100 dark:border-[#333] my-1"></div>

                            <button
                                onClick={() => { onClose(); onShare(); }}
                                className="w-full focus:bg-gray-100 dark:focus:bg-[#252830] cursor-pointer rounded-none flex items-center justify-between px-8 py-5 gap-6 group hover:bg-gray-100 dark:hover:bg-[#252830] transition-colors"
                            >
                                <span className="text-lg font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {lang === 'ar' ? 'مشاركة الحلقة' : 'Share Episode'}
                                </span>
                                <Share2 className="w-6 h-6 text-gray-500 group-hover:text-blue-500 transition-colors" />
                            </button>

                            <button
                                onClick={() => { onClose(); onReport(); }}
                                className="w-full focus:bg-gray-100 dark:focus:bg-[#252830] cursor-pointer rounded-none flex items-center justify-between px-8 py-5 gap-6 group hover:bg-gray-100 dark:hover:bg-[#252830] transition-colors"
                            >
                                <span className="text-lg font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {lang === 'ar' ? 'إبلاغ عن مشكلة' : 'Report Issue'}
                                </span>
                                <Flag className="w-6 h-6 text-gray-500 group-hover:text-red-500 transition-colors" />
                            </button>

                            <div className="border-t border-gray-100 dark:border-[#333] my-1"></div>

                            <button
                                onClick={onDownload}
                                className="w-full focus:bg-gray-100 dark:focus:bg-[#252830] cursor-pointer rounded-none flex items-center justify-between px-8 py-5 gap-6 group hover:bg-gray-100 dark:hover:bg-[#252830] transition-colors"
                            >
                                <span className="text-lg font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {lang === 'ar' ? 'تحميل الحلقة' : 'Download Episode'}
                                </span>
                                <Download className="w-6 h-6 text-gray-500 group-hover:text-green-500 transition-colors" />
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
