import React, { useEffect, useState } from 'react';
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { useAuthStore } from '@/stores/auth-store';
import { Bookmark, BookmarkCheck, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WatchLaterButtonProps {
    animeId?: number;
    episodeId?: number;
    variant?: 'default' | 'icon' | 'sidebar';
    className?: string;
    showLabel?: boolean;
    // Metadata for rich notification
    episodeTitle?: string;
    episodeNumber?: number | string;
    episodeImage?: string;
}

export const WatchLaterButton: React.FC<WatchLaterButtonProps> = ({
    animeId,
    episodeId,
    variant = 'default',
    className,
    showLabel = true,
    episodeTitle,
    episodeNumber,
    episodeImage
}) => {
    const { isSaved, toggleItem, items, fetchItems } = useWatchLaterStore();
    const { isAuthenticated } = useAuthStore();
    const [loading, setLoading] = useState(false);

    // Ensure store is populated
    useEffect(() => {
        if (isAuthenticated && items.length === 0) {
            fetchItems();
        }
    }, [isAuthenticated, fetchItems, items.length]);

    const saved = isSaved(animeId || null, episodeId || null);

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return; // Or show login modal

        setLoading(true);
        const added = await toggleItem(animeId || null, episodeId || null);
        setLoading(false);

        if (added) {
            toast.custom((t) => (
                <div className="flex w-full items-start gap-3 rounded-lg bg-white dark:bg-[#1a1a1a] p-4 shadow-lg border border-gray-100 dark:border-[#333] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2">
                        <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {episodeImage && (
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                            <img src={episodeImage} alt={episodeTitle || 'Episode'} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                            تم الحفظ في القائمة!
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {episodeTitle || `Episode ${episodeNumber}`}
                        </p>
                        {episodeNumber && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold bg-black/10 text-black dark:bg-white/10 dark:text-white rounded">
                                EP {episodeNumber}
                            </span>
                        )}
                    </div>
                </div>
            ), { position: 'top-center', duration: 4000 });
        }
    };

    if (!isAuthenticated) return null;

    if (variant === 'icon') {
        return (
            <button
                onClick={handleToggle}
                className={cn(
                    "p-2 rounded-full transition-colors",
                    saved ? "text-black dark:text-white bg-gray-100 dark:bg-white/10" : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                    className
                )}
                title={saved ? "إزالة من المشاهدة لاحقا" : "مشاهدة لاحقا"}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-black dark:text-white" /> : (
                    saved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />
                )}
            </button>
        );
    }

    if (variant === 'sidebar') {
        return (
            <button
                onClick={handleToggle}
                className={cn(
                    "p-1.5 rounded-full transition-colors flex-shrink-0",
                    saved ? "text-black dark:text-white" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400",
                    className
                )}
                title={saved ? "إزالة من المشاهدة لاحقا" : "مشاهدة لاحقا"}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-black dark:text-white" /> : (
                    saved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />
                )}
            </button>
        );
    }

    // Default button style (under player)
    return (
        <button
            onClick={handleToggle}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                saved
                    ? "bg-gray-900 text-white border border-black dark:bg-white dark:text-black dark:border-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#252525]",
                className
            )}
            disabled={loading}
        >
            {loading ? <Loader2 className={cn("w-5 h-5 animate-spin", saved ? "text-white dark:text-black" : "text-black dark:text-white")} /> : (
                saved ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />
            )}
            {showLabel && (
                <span>{saved ? "محفوظ في القائمة" : "مشاهدة لاحقا"}</span>
            )}
        </button>
    );
};
