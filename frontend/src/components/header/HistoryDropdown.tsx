import React, { useRef, useState, useEffect } from 'react';
import { History as HistoryIcon, Loader2, X, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

import { getImageUrl } from '@/utils/image-utils';

interface HistoryItem {
    id: number;
    anime_id: number;
    anime: {
        id: number;
        title: string;
        title_en: string;
        cover: string;
    };
    episode_id?: number | null;
    episode?: {
        id: number;
        title: string;
        title_en: string; // Add this if available in your API
        episode_number: number;
        thumbnail: string;
    };
    viewed_at: string;
    progress?: number; // duration watched
}

export const HistoryDropdown: React.FC = () => {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            // Limit to recent 5-10 items
            const res = await api.get('/history?limit=10');
            setItems(res.data.data || res.data); // Adjust dependent on API response shape
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

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
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 text-gray-400 hover:text-gray-100 transition-colors rounded-full hover:bg-white/10 flex items-center justify-center custom-button"
                    title={isRtl ? "سجل المشاهدة" : "History"}
                >
                    <HistoryIcon className="w-6 h-6" />
                </button>

                {isOpen && (
                    <div className={cn(
                        "absolute top-full mt-4 w-96 max-h-[600px] flex flex-col bg-white dark:bg-[#111] shadow-2xl border border-gray-100 dark:border-[#333] animate-in fade-in zoom-in-95 duration-200",
                        isRtl ? "left-0 origin-top-left" : "right-0 origin-top-right"
                    )}>
                        <div className="p-4 border-b border-gray-100 dark:border-[#333] flex justify-between items-center bg-white dark:bg-[#111]">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                {isRtl ? 'آخر ما شاهدت' : 'Watch History'}
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#333] text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                            {isLoading ? (
                                <div className="p-12 flex justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    {isRtl ? 'السجل فارغ' : 'History is empty'}
                                </div>
                            ) : (
                                items.map((item) => {
                                    const animeTitle = isRtl ? item.anime.title : item.anime.title_en;
                                    const episodeNumber = item.episode?.episode_number;
                                    const link = item.episode
                                        ? `/${i18n.language}/watch/${item.anime.id}/${episodeNumber}`
                                        : `/${i18n.language}/anime/${item.anime.id}`;

                                    return (
                                        <Link
                                            key={item.id}
                                            to={link}
                                            onClick={() => setIsOpen(false)}
                                            className="flex items-start gap-4 p-4 hover:bg-white dark:hover:bg-[#1a1a1a] transition-colors border-b border-gray-100 dark:border-[#222] last:border-0 group"
                                        >
                                            <div className="w-24 aspect-video bg-gray-800 flex-shrink-0 relative group-hover:scale-[1.02] transition-transform duration-300 overflow-hidden">
                                                <img
                                                    src={getImageUrl(item.episode?.thumbnail || item.anime.cover)}
                                                    alt={animeTitle}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Play Icon Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                                    <PlayCircle className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                                </div>

                                                {episodeNumber && (
                                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] font-bold bg-black/80 text-white">
                                                        EP {episodeNumber}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 py-1">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors mb-1">
                                                    {animeTitle}
                                                </h4>
                                                {item.episode && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {isRtl ? `الحلقة ${episodeNumber}` : `Episode ${episodeNumber}`}
                                                    </p>
                                                )}
                                                <span className="text-[10px] text-gray-400 mt-2 block">
                                                    {new Date(item.viewed_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-100 dark:border-[#333] text-center">
                            <Link
                                to={`/${i18n.language}/history`}
                                onClick={() => setIsOpen(false)}
                                className="text-sm font-bold text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
                            >
                                {isRtl ? 'عرض كامل السجل' : 'View Full History'}
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};
