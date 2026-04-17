import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, ChevronLeft, ChevronRight, Star, Ghost, Swords, Heart, Zap, Music, Smile, Skull, Rocket, Book, Users, Coffee, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { slugify } from "@/utils/slug";
import { getImageUrl } from '@/utils/image-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const categoryIconMap: Record<string, any> = {
    'action': Swords,
    'adventure': Rocket,
    'comedy': Smile,
    'drama': Heart,
    'fantasy': Zap,
    'horror': Skull,
    'romance': Heart,
    'sci-fi': Rocket,
    'slice of life': Coffee,
    'supernatural': Ghost,
    'mystery': Book,
    'sports': Users,
    'music': Music,
};

const getCategoryIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    for (const [key, Icon] of Object.entries(categoryIconMap)) {
        if (lowerName.includes(key)) return Icon;
    }
    return LayoutGrid;
};

interface CategoriesMenuContentProps {
    onClose?: () => void;
    isVisible?: boolean;
}


export function CategoriesMenuContent({ onClose, isVisible }: CategoriesMenuContentProps) {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

    const handleImageLoad = (id: string) => {
        setLoadedImages(prev => ({ ...prev, [id]: true }));
    };

    // Fetch Categories
    const { data: categories, isLoading: isCategoriesLoading } = useQuery({
        queryKey: ['categories-list'],
        queryFn: async () => (await api.get('/categories')).data,
        enabled: isVisible,
        staleTime: 60 * 60 * 1000,
    });

    // Default to first category
    useEffect(() => {
        if (categories && categories.length > 0 && selectedCategoryId === null) {
            setSelectedCategoryId(categories[0].id);
        }
    }, [categories, selectedCategoryId]);

    // Fetch Animes for selected category
    const { data: animes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ['animes-by-category', selectedCategoryId],
        queryFn: async () => {
            if (!selectedCategoryId) return [];
            const res = await api.get('/animes', { params: { category_id: selectedCategoryId, limit: 12 } });
            return res.data;
        },
        enabled: !!selectedCategoryId,
    });

    const handleNavigation = (path: string) => {
        const lang = i18n.language || 'en';
        const targetPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
        navigate(targetPath);
        if (onClose) onClose();
    };

    const selectedCategory = categories?.find((c: any) => c.id === selectedCategoryId);
    const categoryName = isRtl ? selectedCategory?.name : (selectedCategory?.name_en || selectedCategory?.name);

    return (
        <div className="w-full bg-white dark:bg-[#0a0a0a] overflow-hidden relative">
            {/* Global Spinner */}
            {isCategoriesLoading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-[1px]">
                    <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-4 border-gray-100 dark:border-neutral-800 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            {/* ─── MOBILE LAYOUT ─── */}
            <div className="flex md:hidden flex-col w-full">
                {/* Category Chips (horizontal scrollable) */}
                <div className="flex overflow-x-auto scrollbar-hide gap-2 px-3 py-3 border-b border-gray-100 dark:border-neutral-800">
                    {categories?.map((cat: any) => {
                        const name = isRtl ? cat.name : (cat.name_en || cat.name);
                        const isActive = selectedCategoryId === cat.id;
                        const Icon = getCategoryIcon(cat.name_en || cat.name);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={cn(
                                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                                    isActive
                                        ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white"
                                        : "bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {name}
                            </button>
                        );
                    })}
                </div>

                {/* Animes Grid (mobile) */}
                <div className="p-2">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCategoryId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="grid grid-cols-4 gap-2 min-h-[120px] relative"
                        >
                            {isAnimesLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex flex-col gap-1 animate-pulse">
                                        <div className="aspect-[2/3] w-full bg-gray-200 dark:bg-neutral-800 rounded-md" />
                                        <div className="h-2.5 w-3/4 mx-auto bg-gray-200 dark:bg-neutral-800 rounded" />
                                    </div>
                                ))
                            ) : animes && animes.length > 0 ? (
                                animes.slice(0, 8).map((anime: any) => {
                                    const title = isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
                                    const slug = slugify(title);
                                    return (
                                        <div
                                            key={anime.id}
                                            className="group cursor-pointer flex flex-col items-center gap-1"
                                            onClick={() => handleNavigation(`/animes/${anime.id}/${slug}`)}
                                        >
                                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100 dark:bg-[#111]">
                                                {!loadedImages[`cat-anime-m-${anime.id}`] && (
                                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute inset-0 m-auto" />
                                                )}
                                                <img
                                                    src={getImageUrl(anime.image || anime.cover)}
                                                    alt={title}
                                                    onLoad={() => handleImageLoad(`cat-anime-m-${anime.id}`)}
                                                    className={cn(
                                                        "w-full h-full object-cover transition-all duration-300 group-hover:scale-105",
                                                        loadedImages[`cat-anime-m-${anime.id}`] ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                            </div>
                                            <h4 className="text-[10px] font-semibold text-gray-800 dark:text-gray-200 text-center line-clamp-1 w-full leading-tight">
                                                {title}
                                            </h4>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-4 flex items-center justify-center h-24 text-gray-400 text-xs">
                                    {isRtl ? 'لا توجد أنميات' : 'No animes found'}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ─── DESKTOP LAYOUT ─── */}
            <div className="hidden md:flex w-full h-[380px]">
                {/* Main Content Area */}
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide rtl:order-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-black dark:bg-white"></div>
                                <h3 className="text-xl font-bold font-sans text-gray-900 dark:text-white uppercase tracking-tight">
                                    {isRtl ? 'فئات من أجلك' : 'Categories for you'}
                                </h3>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-4.5 rtl:pr-4.5">
                                {isRtl ? `عرض أفضل أنميات ${categoryName || ''}` : `Viewing Top ${categoryName || ''} Animes`}
                            </p>
                        </div>
                        <button
                            onClick={() => handleNavigation(`/browse?categoryId=${selectedCategoryId}`)}
                            className="text-xs font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        >
                            {isRtl ? 'عرض الكل' : 'View All'}
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCategoryId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="grid grid-cols-7 gap-4 min-h-[150px] relative"
                        >
                            {isAnimesLoading ? (
                                <div className="absolute inset-0 z-10 flex items-center justify-center">
                                    <div className="relative w-10 h-10">
                                        <div className="absolute inset-0 border-3 border-gray-100 dark:border-neutral-800 rounded-full"></div>
                                        <div className="absolute inset-0 border-3 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                    </div>
                                </div>
                            ) : animes && animes.length > 0 ? (
                                animes.slice(0, 14).map((anime: any) => {
                                    const title = isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title);
                                    const slug = slugify(title);
                                    return (
                                        <div
                                            key={anime.id}
                                            className="group cursor-pointer flex flex-col items-center gap-1.5"
                                            onClick={() => handleNavigation(`/animes/${anime.id}/${slug}`)}
                                        >
                                            <div className="relative aspect-[2/3] w-full overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 bg-gray-100 dark:bg-[#111] flex items-center justify-center">
                                                {isVisible && (
                                                    <>
                                                        {!loadedImages[`cat-anime-${anime.id}`] && (
                                                            <Loader2 className="w-6 h-6 animate-spin text-gray-400 absolute" />
                                                        )}
                                                        <img
                                                            src={getImageUrl(anime.image || anime.cover)}
                                                            alt={title}
                                                            onLoad={() => handleImageLoad(`cat-anime-${anime.id}`)}
                                                            className={cn(
                                                                "w-full h-full object-cover transition-all duration-500 group-hover:scale-110",
                                                                loadedImages[`cat-anime-${anime.id}`] ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                    </>
                                                )}
                                                <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[8px] font-black text-white bg-black/80 uppercase tracking-tighter">
                                                    {anime.type === 'tv' ? (isRtl ? 'مسلسل' : 'TV') : (isRtl ? 'فيلم' : 'MOVIE')}
                                                </div>
                                            </div>
                                            <h4 className="text-[11px] font-bold text-gray-900 dark:text-white text-center line-clamp-1 leading-tight group-hover:text-black dark:group-hover:text-white transition-colors">
                                                {title}
                                            </h4>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-6 flex items-center justify-center h-40 text-gray-400">
                                    {isRtl ? 'لا توجد أنميات في هذه الفئة' : 'No animes found in this category'}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Sidebar (Right) */}
                <div className="w-[280px] bg-white dark:bg-neutral-900/30 border-l border-gray-100 dark:border-neutral-800 flex flex-col rtl:order-1 rtl:border-l-0 rtl:border-r">
                    <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                        <h4 className="text-sm font-bold font-sans text-gray-400 uppercase tracking-widest">{isRtl ? 'تصفح حسب الفئة' : 'Browse by category'}</h4>
                        <LayoutGrid className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        {categories?.map((cat: any) => {
                            const name = isRtl ? cat.name : (cat.name_en || cat.name);
                            const isActive = selectedCategoryId === cat.id;
                            const Icon = getCategoryIcon(cat.name_en || cat.name);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={cn(
                                        "w-full flex items-center justify-end px-5 py-3 transition-all duration-200 group relative border-b border-gray-100/50 dark:border-neutral-800/30 last:border-b-0",
                                        isActive
                                            ? 'bg-gray-100 dark:bg-[#1a1a1a] text-black dark:text-white'
                                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#1a1a1a]/50'
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute inset-y-0 right-0 w-1.5 bg-black dark:bg-white" />
                                    )}
                                    <span className={cn(
                                        "text-lg font-bold font-sans transition-colors leading-tight mr-4",
                                        isActive ? "text-black dark:text-white" : "text-gray-900 dark:text-gray-100 group-hover:text-black dark:group-hover:text-white"
                                    )}>
                                        {name}
                                    </span>
                                    <Icon className={cn(
                                        "w-6 h-6 transition-colors",
                                        isActive ? "text-black dark:text-white" : "text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white"
                                    )} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

