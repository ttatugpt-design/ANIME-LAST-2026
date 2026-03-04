import { Star, Eye, Bookmark, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { usePreviewStore } from "@/stores/preview-store";
import { renderEmojiContent } from "@/utils/render-content";
import { slugify } from "@/utils/slug";

interface AnimeHoverCardProps {
    data: any;
    lang: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onPreview?: () => void;
}

const BASE_URL = '';

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function AnimeHoverCard({ data, lang, onMouseEnter, onMouseLeave, onPreview }: AnimeHoverCardProps) {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const { showPreview } = usePreviewStore();

    // Data extraction
    const title = lang === 'ar' ? (data.series?.title || data.title) : (data.series?.title_en || data.title_en || data.title);
    const rating = data.series?.rating || data.rating || '4.9';
    const season = data.series?.season || (data.seasons ? (lang === 'ar' ? `${data.seasons} مواسم` : `${data.seasons} Seasons`) : null);
    const episodeNum = data.episode_number ? (lang === 'ar' ? `حلقة ${data.episode_number}` : `Episode ${data.episode_number}`) : null;
    const description = lang === 'ar'
        ? (data.series?.description || data.description || 'لا يوجد وصف متاح.')
        : (data.series?.description_en || data.description_en || 'No description available.');

    const banner = data.thumbnail || data.cover || data.image;

    const handlePlay = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        const animeTitle = lang === 'ar' ? (data.series?.title || data.title) : (data.series?.title_en || data.title_en || data.title);
        const slug = slugify(animeTitle);

        if (data.episode_number !== undefined) {
            const animeId = data.anime_id || data.series_id || data.anime?.id || data.series?.id;
            navigate(`/${lang}/watch/${animeId}/${data.episode_number}/${slug}`);
        } else {
            navigate(`/${lang}/animes/${data.id}/${slug}`);
        }
    };

    const handleWatchLater = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post('/watch-later', {
                anime_id: data.anime_id || (data.episode_number === undefined ? data.id : null),
                episode_id: data.episode_number !== undefined ? data.id : null
            });
            toast.success(lang === 'ar' ? 'تمت الإضافة لقائمة المشاهدة' : 'Added to watch later');
        } catch (error) {
            toast.error(lang === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'Please login first');
        } finally {
            setIsSaving(false);
        }
    };

    const openPreview = (e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (onPreview) {
            onPreview();
        } else {
            showPreview(data);
        }
    };

    return (
        <div
            className="absolute w-[105%] h-[105%] -top-[2.5%] -left-[2.5%] z-50 flex flex-col text-right overflow-hidden transition-opacity duration-200 animate-in fade-in bg-white dark:bg-black shadow-xl border border-gray-100 dark:border-transparent cursor-pointer"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => handlePlay(e)}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
            {/* Background Image Darkened - only for Dark Mode */}
            <div className="absolute inset-0 z-0 bg-black hidden dark:block">
                {banner && (
                    <img
                        src={getImageUrl(banner)}
                        alt="bg"
                        className="w-full h-full object-cover opacity-40 transition-transform duration-700 hover:scale-105"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/30" />
            </div>

            {/* Content Container (Top Part) */}
            <div className="relative z-10 flex flex-col h-full p-4 group/card">
                <div className="mb-2">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight line-clamp-2 text-right dark:shadow-black dark:drop-shadow-md group-hover/card:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                        {renderEmojiContent(title || 'عنوان غير متوفر')}
                    </h3>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-[10px] text-gray-600 dark:text-gray-300 font-bold">
                        <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-gray-900 dark:text-white font-black text-xs">
                                {typeof rating === 'number' ? rating.toFixed(1) : rating}
                            </span>
                        </div>
                        <div className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 whitespace-nowrap">
                            {season ? (
                                <span>{typeof season === 'string' ? season : season.name}</span>
                            ) : (
                                <span>{episodeNum}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10 scrollbar-track-transparent mb-2">
                    <p className="text-xs text-gray-700 dark:text-gray-100 leading-relaxed text-right font-bold dark:drop-shadow-md line-clamp-3">
                        {renderEmojiContent(description)}
                    </p>
                </div>
            </div>

            {/* Action Buttons - Outside of Link for validity */}
            <div
                className="relative z-20 mt-auto flex items-center justify-between p-3 pt-2 bg-gray-50/80 dark:bg-black border-t border-gray-100 dark:border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={openPreview}
                    className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-all p-1 hover:scale-110"
                    title={lang === 'ar' ? "معاينة" : "Preview"}
                >
                    <Eye className="w-6 h-6" />
                </button>
                <button
                    onClick={handleWatchLater}
                    disabled={isSaving}
                    className={cn(
                        "text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-all p-1 hover:scale-110",
                        isSaving && "opacity-50"
                    )}
                    title={lang === 'ar' ? "حفظ للمشاهدة لاحقاً" : "Watch Later"}
                >
                    <Bookmark className="w-6 h-6" />
                </button>

            </div>
        </div>
    );
}
