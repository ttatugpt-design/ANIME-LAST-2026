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
                        <h4 className="font-bold text-green-600 dark:text-green-400 text-sm mb-1">
                            تم الحفظ في القائمة!
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {episodeTitle || `Episode ${episodeNumber}`}
                        </p>
                    </div>
                </div>
            ), { position: 'top-center', duration: 3000 });
        } else {
            // Toast for removal
            toast.success('تمت الإزالة من القائمة', {
                position: 'top-center',
                duration: 2000,
                icon: <X className="w-4 h-4 text-red-500" />
            });
        }
    };

    if (!isAuthenticated) return null;

    if (variant === 'icon') {
        return (
            <button
                onClick={handleToggle}
                className={cn(
                    "p-2 rounded-full transition-all duration-300",
                    saved ? "text-white bg-red-500 shadow-md scale-105" : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
                    className
                )}
                title={saved ? "إزالة من المشاهدة لاحقا" : "مشاهدة لاحقا"}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    saved ? <X className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />
                )}
            </button>
        );
    }

    if (variant === 'sidebar') {
        return (
            <button
                onClick={handleToggle}
                className={cn(
                    "p-1.5 rounded-full transition-all duration-300 flex-shrink-0",
                    saved ? "text-red-500 bg-red-50 dark:bg-red-950/30 scale-110" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400",
                    className
                )}
                title={saved ? "إزالة من المشاهدة لاحقا" : "مشاهدة لاحقا"}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    saved ? <X className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />
                )}
            </button>
        );
    }

    // Default button style (under player)
    return (
        <button
            onClick={handleToggle}
            className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300",
                saved
                    ? "bg-red-500 text-white shadow-md hover:bg-red-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-[#1a1a1a] dark:text-gray-300 dark:hover:bg-[#252525]",
                className
            )}
            disabled={loading}
        >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                saved ? <X className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />
            )}
            {showLabel && (
                <span>{saved ? "إزالة من القائمة" : "مشاهدة لاحقا"}</span>
            )}
        </button>
    );
};
