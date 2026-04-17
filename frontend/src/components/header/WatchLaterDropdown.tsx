import React, { useRef, useState, useEffect } from 'react';
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { Bookmark, Loader2, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// Helper for image URLs (duplicated for now, could be in utils)
const BASE_URL = '';
import { getImageUrl } from '@/utils/image-utils';

export const WatchLaterDropdown: React.FC = () => {
    const { items, isLoading, fetchItems, toggleItem } = useWatchLaterStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen, fetchItems]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRemove = async (e: React.MouseEvent, animeId: number | undefined, episodeId: number | undefined) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleItem(animeId || null, episodeId || null);
    };

    return (
        <>
            {/* Backdrop Blur Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className="relative z-50" ref={dropdownRef}>
                <Link
                    to={`/${i18n.language}/library`}
                    className="relative p-2 text-gray-400 hover:text-gray-100 transition-colors rounded-full hover:bg-white/10 flex items-center justify-center"
                    title={isRtl ? "مكتبتي" : "My Library"}
                >
                    <Bookmark className="w-6 h-6" />
                    {items.length > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-black dark:bg-white rounded-full border-2 border-white dark:border-black"></span>
                    )}
                </Link>

                {isOpen && (
                    <div className={cn(
                        "absolute top-full mt-4 w-96 max-h-[600px] flex flex-col bg-white dark:bg-[#111] shadow-2xl border border-gray-100 dark:border-[#333] animate-in fade-in zoom-in-95 duration-200",
                        isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
                    )}>
                        <div className="p-4 border-b border-gray-100 dark:border-[#333] flex justify-between items-center bg-white dark:bg-[#111]">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                {isRtl ? 'قائمة المشاهدة لاحقا' : 'Watch Later List'}
                                <span className="text-xs font-normal text-gray-500 mx-2">({items.length} items)</span>
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            {isLoading && items.length === 0 ? (
                                <div className="p-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    {isRtl ? 'القائمة فارغة' : 'Your list is empty'}
                                </div>
                            ) : (
                                items.map((item) => {
                                    // Determine link and specific data
                                    const isEpisode = !!item.episode_id;
                                    const link = isEpisode
                                        ? `/${i18n.language}/watch/${item.anime_id}/${item.episode?.episode_number}`
                                        : `/${i18n.language}/anime/${item.anime_id}`; // Assuming anime browse link

                                    const title = isEpisode
                                        ? (isRtl ? item.episode?.title : item.episode?.title_en) || `Episode ${item.episode?.episode_number}`
                                        : (isRtl ? item.anime?.title : item.anime?.title_en) || 'Anime';

                                    const subtitle = isEpisode ? (isRtl ? item.anime.title : item.anime.title_en) : 'Anime Series';
                                    const image = isEpisode ? (item.episode?.thumbnail || item.episode?.banner) : item.anime?.cover;

                                    return (
                                        <Link
                                            key={item.id}
                                            to={link}
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-start gap-4 p-4 hover:bg-white dark:hover:bg-[#1a1a1a] transition-colors border-b border-gray-100 dark:border-[#222] last:border-0 group"
                                        >
                                            <div className="w-24 aspect-video bg-gray-800 flex-shrink-0 relative group-hover:scale-[1.02] transition-transform duration-300">
                                                {image && (
                                                    <img src={getImageUrl(image)} alt={title} className="w-full h-full object-cover" />
                                                )}
                                                {isEpisode && (
                                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] font-bold bg-black/80 text-white">
                                                        EP {item.episode?.episode_number}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 leading-relaxed mb-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{title}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{subtitle}</p>
                                            </div>
                                            <button
                                                onClick={(e) => handleRemove(e, item.anime_id, item.episode_id)}
                                                className="self-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 opacity-0 group-hover:opacity-100 transition-all -mr-2"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
