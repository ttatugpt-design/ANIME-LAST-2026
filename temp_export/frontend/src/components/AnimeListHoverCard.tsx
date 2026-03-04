import { Star, Eye, Bookmark } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { usePreviewStore } from "@/stores/preview-store";
import { slugify } from "@/utils/slug";

interface AnimeListHoverCardProps {
    data: any;
    lang: string;
    className?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

// Helper for image URLs
const BASE_URL = '';
const getValidImageUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function AnimeListHoverCard({ data, lang, className, onMouseEnter, onMouseLeave }: AnimeListHoverCardProps) {
    const navigate = useNavigate();
    const [isSaving, setIsSaving] = useState(false);
    const { showPreview } = usePreviewStore();
    const isRtl = lang === 'ar';

    const title = lang === 'ar' ? (data.series?.title || data.title) : (data.series?.title_en || data.title_en || data.title);
    const rating = data.series?.rating || data.rating || '4.9';
    const description = lang === 'ar'
        ? (data.series?.description || data.description || 'لا يوجد وصف متاح.')
        : (data.series?.description_en || data.description_en || 'No description available.');

    const image = data.cover || data.banner || data.image;

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
        showPreview(data);
    };

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

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
                "flex flex-row h-full shadow-xl border overflow-hidden bg-white dark:bg-black border-gray-100 dark:border-white/5",
                className
            )}
        >
            {/* Main Clickable Area (Image + Info) - Restored Navigation on Click */}
            <div
                onClick={(e) => handlePlay(e)}
                className="flex flex-row flex-1 min-w-0 group/card cursor-pointer"
            >
                {/* Image Section */}
                <div className="w-[170px] md:w-[230px] h-[110px] md:h-[125px] shrink-0 relative overflow-hidden bg-black">
                    <img
                        src={getValidImageUrl(image)}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                    />
                </div>

                {/* Content Section (Info only) */}
                <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0" dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-black text-sm text-gray-900 dark:text-white">
                                    {typeof rating === 'number' ? rating.toFixed(1) : rating}
                                </span>
                            </div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">
                                {data.series?.category || data.category || 'Anime'}
                            </div>
                        </div>
                        <h3 className="text-lg md:text-2xl font-black text-gray-900 dark:text-white leading-tight line-clamp-2 transition-colors group-hover/card:text-gray-600 dark:group-hover:text-gray-300">
                            {title}
                        </h3>
                    </div>

                    <p className="text-xs text-gray-800 dark:text-gray-100 leading-relaxed line-clamp-3 mb-2 font-bold flex-1">
                        {description}
                    </p>
                </div>
            </div>

            {/* Actions Bar - Kept separate for valid interaction */}
            <div className="w-16 md:w-20 border-l border-gray-100 dark:border-white/5 flex flex-col items-center justify-center gap-6 p-2 bg-gray-50/50 dark:bg-black">
                <button
                    onClick={openPreview}
                    className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-all hover:scale-110"
                    title={lang === 'ar' ? "معاينة" : "Preview"}
                >
                    <Eye className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                <button
                    onClick={handleWatchLater}
                    disabled={isSaving}
                    className={cn(
                        "text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-all hover:scale-110",
                        isSaving && "opacity-50"
                    )}
                    title={lang === 'ar' ? "حفظ للمشاهدة لاحقاً" : "Watch Later"}
                >
                    <Bookmark className="w-6 h-6 md:w-7 md:h-7" />
                </button>
            </div>
        </div>
    );
}
