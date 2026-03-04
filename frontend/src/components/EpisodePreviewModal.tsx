import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ThumbsUp, Eye, MessageSquare, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

interface EpisodePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    lang: string;
}

const BASE_URL = '';

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function EpisodePreviewModal({ isOpen, onClose, data, lang }: EpisodePreviewModalProps) {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (isOpen && data?.id) {
            // Fetch stats if it's an episode
            if (data.episode_number !== undefined) {
                api.get(`/episodes/${data.id}/stats`).then(res => setStats(res.data)).catch(() => { });
            }
        }
    }, [isOpen, data]);

    if (!data) return null;

    const title = lang === 'ar' ? (data.series?.title || data.title) : (data.series?.title_en || data.title_en || data.title);
    const animeTitle = lang === 'ar' ? (data.series?.title || data.anime?.title) : (data.series?.title_en || data.anime?.title_en);
    const description = lang === 'ar'
        ? (data.series?.description || data.description || 'لا يوجد وصف متاح.')
        : (data.series?.description_en || data.description_en || 'No description available.');
    const banner = data.banner || data.thumbnail || data.image;
    const isEpisode = data.episode_number !== undefined;

    const handleImageClick = () => {
        const animeObj = data.series || data.anime;
        const animeSlugRaw = lang === 'ar'
            ? (animeObj?.slug || animeObj?.id || data.anime_id || data.series_id || data.id)
            : (animeObj?.slug_en || animeObj?.slug || animeObj?.id || data.anime_id || data.series_id || data.id);

        // Ensure slug is a string and handle potential spaces as a last resort safeguard
        const animeSlug = String(animeSlugRaw).replace(/\s+/g, '-');

        if (isEpisode) {
            navigate(`/${lang}/watch/${animeSlug}/${data.episode_number}`);
        } else {
            navigate(`/${lang}/animes/${animeSlug}`);
        }
        onClose(); // Close modal after navigation
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-none w-full h-full sm:h-auto sm:max-w-4xl p-0 overflow-hidden border-none bg-white dark:bg-black rounded-none shadow-none sm:rounded-none">
                <div className="flex flex-col h-full" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    {/* Top Bar - Header with Close Button */}
                    <div className="flex items-center justify-end px-4 py-2 border-b border-white/10 bg-black z-50">
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 text-white transition-all hover:scale-110"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Main Layout: Top-Bottom on Mobile, Side-by-Side on Desktop */}
                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

                        {/* Image Area - Small on mobile, Side on desktop */}
                        <div className="p-4 md:p-6 bg-gray-50/50 dark:bg-zinc-900/30 flex justify-center items-center md:w-2/5 border-b md:border-b-0 md:border-l border-gray-100 dark:border-white/10">
                            <div
                                onClick={handleImageClick}
                                className={`w-full ${isEpisode ? 'max-w-[200px] md:max-w-sm aspect-video' : 'max-w-[120px] md:max-w-[200px] aspect-[2/3]'} overflow-hidden border border-gray-100 dark:border-white/10 bg-black cursor-pointer group`}
                            >
                                <img
                                    src={getImageUrl(banner)}
                                    alt={title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                            </div>
                        </div>

                        {/* Details Area - Scrollable */}
                        <div className="flex-1 p-5 sm:p-6 md:p-8 overflow-y-auto bg-white dark:bg-black scrollbar-none sm:scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                            {/* Title & Info */}
                            <div className="mb-6 sm:mb-8">
                                {animeTitle && (
                                    <span className="text-orange-500 font-black text-[10px] sm:text-xs tracking-widest uppercase mb-1 sm:mb-2 block">
                                        {animeTitle}
                                    </span>
                                )}
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3 sm:mb-4">
                                    {title}
                                </h2>

                                {/* Stats Row */}
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        <span className="text-sm font-black">{data.rating || '4.9'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                                        <Eye className="w-4 h-4" />
                                        <span className="text-sm font-black">{stats?.views_count || data.views_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                                        <ThumbsUp className="w-4 h-4" />
                                        <span className="text-sm font-black">{stats?.likes_count || data.likes_count || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white">
                                        <MessageSquare className="w-4 h-4" />
                                        <span className="text-sm font-black">{stats?.comments_count || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description - Full View */}
                            <div className="border-t border-gray-100 dark:border-white/10 pt-6 sm:pt-8 mt-auto">
                                <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 mb-3 sm:mb-4 uppercase tracking-widest">
                                    {lang === 'ar' ? 'التفاصيل الكاملة' : 'Full Details'}
                                </h4>
                                <p className="text-lg md:text-xl text-gray-950 dark:text-white leading-relaxed font-black whitespace-pre-line">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
