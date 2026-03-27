import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { MessageCircle, Loader2, ChevronRight, ChevronLeft, X, Maximize2, Hash, List, Share2, Search } from "lucide-react";
import api from "@/lib/api";
import { slugify } from "@/utils/slug";
import { CommentsSection } from '@/components/comments/CommentsSection';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import { AnimeShareModal } from "@/components/animes/AnimeShareModal";
import { getImageUrl } from '@/utils/image-utils';
import { 
    Sheet, 
    SheetContent, 
    SheetTrigger,
    SheetHeader,
    SheetTitle
} from "@/components/ui/sheet";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// Lazy Image Component with Spinner
const LazyChapterImage = ({ src, alt, index, total, shouldLoad, onClick, onLoad }: { src: string, alt: string, index: number, total: number, shouldLoad: boolean, onClick: () => void, onLoad: () => void }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasBeenInView, setHasBeenInView] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasBeenInView(true);
                    observer.unobserve(entry.target);
                }
            },
            { rootMargin: "200px" } 
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleImageLoad = () => {
        setIsLoaded(true);
        onLoad();
    };

    return (
        <div 
            ref={imgRef}
            id={`page-${index}`}
            className="relative shadow-2xl overflow-hidden bg-white dark:bg-[#111] group cursor-zoom-in min-h-[400px] flex flex-col"
            onClick={onClick}
        >
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a] z-0">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 opacity-50" />
                </div>
            )}
            
            {shouldLoad && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={handleImageLoad}
                    className={cn(
                        "w-full h-auto object-contain block select-none pointer-events-none transition-all duration-500",
                        isLoaded ? "opacity-100" : "opacity-0"
                    )}
                />
            )}

            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                    <Maximize2 className="w-6 h-6 text-white" />
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-[#1a1a1a] p-2 text-center text-[10px] font-bold text-gray-400 border-t dark:border-[#222] mt-auto">
                {index + 1} / {total}
            </div>
        </div>
    );
};

export default function ChapterPage() {
    const { id, chapterNum, slug: currentSlug } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const { theme } = useTheme();
    const lang = i18n.language;
    const isAr = lang === 'ar';
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<'comments' | 'chapters'>('comments');
    const [pageSearch, setPageSearch] = useState("");
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
    
    // Sequential Loading State
    const [maxLoadedIndex, setMaxLoadedIndex] = useState(0);
    
    // Fullscreen View State
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);

    // Prevent background scroll when fullscreen viewer is open
    useEffect(() => {
        if (previewIndex !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [previewIndex]);

    // 1. Fetch Anime Data
    const { data: anime, isLoading: isAnimeLoading } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // 2. Fetch All Chapters for the sidebar
    const { data: chaptersData } = useQuery({
        queryKey: ["chapters", id],
        queryFn: async () => {
            const response = await api.get(`/chapters`, { params: { anime_id: id } });
            return response.data;
        },
        enabled: !!id,
    });

    // 3. Fetch Specific Chapter Data
    const { data: chapterData, isLoading: isChapterLoading, error } = useQuery({
        queryKey: ["chapter", id, chapterNum],
        queryFn: async () => {
            const response = await api.get(`/chapters`, {
                params: {
                    anime_id: id,
                    chapter_number: chapterNum
                }
            });
            return Array.isArray(response.data) ? response.data[0] : response.data;
        },
        enabled: !!id && !!chapterNum,
    });

    const chapter = chapterData;

    // Fetch Comment Count for Sidebar
    const { data: commentsCount = 0 } = useQuery({
        queryKey: ["comments-count", chapter?.id],
        queryFn: async () => {
            const url = `/chapters/${chapter.id}/comments`;
            const res = await api.get(url);
            return res.data?.length || 0;
        },
        enabled: !!chapter?.id,
    });

    // Redirection logic for SEO slugs
    useEffect(() => {
        if (anime && id && chapterNum) {
            const animeTitle = isAr ? anime.title : (anime.title_en || anime.title);
            const expectedSlug = slugify(animeTitle);

            if (currentSlug !== expectedSlug) {
                navigate(`/${lang}/read/${id}/${chapterNum}/${expectedSlug}`, { replace: true });
            }
        }
    }, [id, chapterNum, anime, currentSlug, lang, navigate, isAr]);

    // Parse images
    const images = chapter?.images ? JSON.parse(chapter.images) : [];

    const animeTitle = isAr ? anime?.title : (anime?.title_en || anime?.title);
    const pageTitle = `${animeTitle} - ${isAr ? 'فصل' : 'Chapter'} ${chapterNum}`;

    const scrollToPage = (pageNum: number) => {
        const element = document.getElementById(`page-${pageNum}`);
        if (element) {
            const offset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setIsNavOpen(false);
        }
    };

    // Forward logic: Right arrow for NEXT, Left arrow for PREVIOUS
    const handleNext = useCallback(() => {
        if (previewIndex !== null && previewIndex < images.length - 1) {
            setPreviewIndex(previewIndex + 1);
        }
    }, [previewIndex, images.length]);

    const handlePrev = useCallback(() => {
        if (previewIndex !== null && previewIndex > 0) {
            setPreviewIndex(previewIndex - 1);
        }
    }, [previewIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewIndex === null) return;
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "Escape") setPreviewIndex(null);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [previewIndex, handleNext, handlePrev]);

    if (isAnimeLoading || isChapterLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !chapter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4">{isAr ? 'لم يتم العثور على الفصل' : 'Chapter Not Found'}</h1>
                <Link to="/" className="text-blue-600 hover:underline">{isAr ? 'العودة للرئيسية' : 'Back to Home'}</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-black text-gray-900 dark:text-white" dir={isAr ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{pageTitle}</title>
            </Helmet>

            <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_400px] gap-0 w-full relative min-h-screen">
                
                {/* Left Sidebar (Social) - Fixed Offset for Global Header */}
                <div className="hidden lg:block sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto custom-scrollbar bg-transparent z-10 border-none">
                    <div className="py-8">
                        <SocialNavSidebar />
                    </div>
                </div>

                {/* Main Content Viewer */}
                <div className="flex flex-col items-center py-4 px-0 min-h-screen">
                    <div className="max-w-[600px] w-full space-y-4">
                        {/* Removed Sticky Header for Cleaner Reading */}

                        {/* Image Viewer - Lazy Loading & Sharp Corners */}
                        <div className="flex flex-col gap-4 px-2 md:px-0">
                            {images.map((img: string, i: number) => (
                                <LazyChapterImage 
                                    key={i}
                                    src={getImageUrl(img)} 
                                    alt={`Page ${i + 1}`} 
                                    index={i}
                                    total={images.length}
                                    shouldLoad={i <= maxLoadedIndex}
                                    onLoad={() => setMaxLoadedIndex(prev => Math.max(prev, i + 1))}
                                    onClick={() => setPreviewIndex(i)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (Comments & Chapters) - Matches Original Dark Mode Color */}
                <div className="hidden lg:block sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto custom-scrollbar bg-white dark:bg-[#0a0a0a] border-l border-gray-100 dark:border-[#333]/50 z-20 transition-colors">
                    <div className="p-4 sm:p-6 text-[13px]"> 
                        
                        {/* Sidebar Tab Header + Navigation Actions */}
                        <div className="flex flex-col gap-4 mb-6 border-b dark:border-white/10 pb-4">
                            <div className="flex items-center justify-between gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-2xl">
                                <button 
                                    onClick={() => setSidebarTab('comments')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-black text-[10px]",
                                        sidebarTab === 'comments' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                    )}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    {isAr ? 'التعليقات' : 'Comments'}
                                </button>
                                <button 
                                    onClick={() => setSidebarTab('chapters')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-black text-[10px]",
                                        sidebarTab === 'chapters' ? "bg-white text-black shadow-lg" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                    {isAr ? 'الفصول' : 'Chapters'}
                                </button>
                            </div>

                            {/* Navigation and Share Actions */}
                            <div className="flex items-center gap-2">
                                <Dialog open={isNavOpen} onOpenChange={setIsNavOpen}>
                                    <DialogTrigger asChild>
                                        <button className={cn(
                                            "p-2 rounded-lg transition-all flex items-center gap-2 border flex-1 md:flex-none",
                                            theme === 'light' 
                                                ? "bg-white border-black/5 hover:bg-gray-50 text-gray-900" 
                                                : "bg-white border-white/10 hover:bg-white/90 text-black font-black"
                                        )}>
                                            <Hash className="w-5 h-5" />
                                            <span className="text-[10px] uppercase tracking-widest">{isAr ? 'الصفحات' : 'PAGES'}</span>
                                        </button>
                                    </DialogTrigger>
                                    <DialogContent className={cn(
                                        "sm:max-w-md border-none overflow-hidden rounded-3xl",
                                        theme === 'light' ? "bg-white text-black" : "bg-[#0a0a0a] text-white"
                                    )}>
                                        <div className="p-8">
                                            <h3 className="text-2xl font-black mb-6 italic tracking-tighter">
                                                {isAr ? 'انتقل إلى صفحة' : 'GO TO PAGE'}
                                            </h3>
                                            
                                            <div className="relative mb-8">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input 
                                                    type="text" 
                                                    placeholder={isAr ? "رقم الصفحة..." : "Page number..."}
                                                    value={pageSearch}
                                                    onChange={(e) => setPageSearch(e.target.value)}
                                                    className={cn(
                                                        "w-full bg-transparent border-b-2 py-4 pl-12 pr-4 text-xl font-bold outline-none transition-all",
                                                        theme === 'light' ? "border-black/10 focus:border-black" : "border-white/10 focus:border-white"
                                                    )}
                                                />
                                            </div>

                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                                                {Array.from({ length: images.length }).map((_, i) => {
                                                    const pageNum = (i + 1).toString();
                                                    if (pageSearch && !pageNum.includes(pageSearch)) return null;
                                                    
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                document.getElementById(`page-${i}`)?.scrollIntoView({ behavior: 'smooth' });
                                                                setIsNavOpen(false);
                                                            }}
                                                            className={cn(
                                                                "aspect-square flex items-center justify-center text-sm font-black transition-all hover:scale-105",
                                                                theme === 'light' 
                                                                    ? "bg-gray-100 hover:bg-black hover:text-white" 
                                                                    : "bg-white/5 hover:bg-white hover:text-black"
                                                            )}
                                                        >
                                                            {i + 1}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <button 
                                    onClick={() => setIsShareModalOpen(true)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all flex items-center gap-2 border",
                                        theme === 'light' 
                                            ? "bg-white border-black/5 hover:bg-gray-50 text-gray-900" 
                                            : "bg-white border-white/10 hover:bg-white/90 text-black font-black"
                                    )}
                                >
                                    <Share2 className="w-5 h-5" />
                                    <span className="hidden md:block text-[10px] uppercase tracking-widest">{isAr ? 'مشاركة' : 'SHARE'}</span>
                                </button>
                                
                                <Link to={`/${lang}/mangas/${id}`} className="p-2.5 bg-blue-600/10 text-blue-600 rounded-xl hover:bg-blue-600/20 transition-all active:scale-90 flex items-center gap-2">
                                    <List className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {sidebarTab === 'comments' ? (
                            <div className="flex flex-col items-center justify-center min-h-[400px] py-12 text-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                                <button 
                                    onClick={() => setIsCommentsModalOpen(true)}
                                    className="group relative p-10 bg-blue-600/5 dark:bg-white/5 rounded-full hover:bg-blue-600/10 dark:hover:bg-white/10 transition-all active:scale-95 shadow-xl border border-blue-600/5 dark:border-white/5"
                                >
                                    <MessageCircle className="w-20 h-20 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
                                    <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-full shadow-2xl ring-4 ring-white dark:ring-[#0a0a0a]">
                                        {commentsCount}
                                    </div>
                                </button>
                                <div className="space-y-2">
                                    <h3 className="font-black text-2xl italic tracking-tighter uppercase text-gray-900 dark:text-white">
                                        {isAr ? 'التعليقات' : 'COMMENTS'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold max-w-[200px] leading-relaxed">
                                        {isAr ? 'اضغط على الأيقونة أعلاه لفتح ومشاهدة جميع التعليقات' : 'Click the icon above to open and view all comments'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 animate-in slide-in-from-right-2 duration-300">
                                <div className="border border-gray-100 dark:border-white/10 bg-white/50 dark:bg-black/20 overflow-hidden">
                                    {chaptersData?.map((ch: any) => {
                                        const chItemTitle = isAr ? (ch.title || `الفصل ${ch.chapter_number}`) : (ch.title_en || `Chapter ${ch.chapter_number}`);
                                        const isActive = ch.chapter_number === chapterNum;
                                        
                                        return (
                                            <div key={ch.id} className={cn(
                                                "group flex items-center gap-0 px-2 py-2 border-b border-gray-50 dark:border-white/5 last:border-0 transition-all",
                                                isActive ? "bg-blue-600/10 border-l-2 border-l-blue-600 shadow-inner" : "hover:bg-gray-50 dark:hover:bg-white/5"
                                            )}>
                                                <Link to={`/${lang}/read/${id}/${ch.chapter_number}/${slugify(animeTitle)}`} className="flex-1 flex items-center min-w-0">
                                                    <div className={cn(
                                                        "w-8 flex-shrink-0 text-[10px] font-black text-center",
                                                        isActive ? "text-blue-600" : "text-gray-400"
                                                    )}>
                                                        #{ch.chapter_number}
                                                    </div>
                                                    <div className="flex-1 min-w-0 px-2">
                                                        <h4 className={cn(
                                                            "text-[11px] font-bold truncate",
                                                            isActive ? "text-blue-600" : "text-gray-700 dark:text-gray-300"
                                                        )}>
                                                            {chItemTitle}
                                                        </h4>
                                                    </div>
                                                </Link>
                                                {isActive && (
                                                    <div className="w-2 h-2 rounded-full bg-blue-600 mr-2 rtl:mr-0 rtl:ml-2 animate-pulse" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Toggle Button - White/Black */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex gap-2">
                <Sheet open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
                    <SheetTrigger asChild>
                        <button 
                            className="flex items-center gap-2 font-black text-[10px] px-6 py-3 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.4)] bg-white text-black border border-gray-200 dark:border-white/10 dark:bg-white dark:text-black hover:scale-105 active:scale-95 transition-all uppercase tracking-[2px]"
                        >
                            <MessageCircle className="w-4 h-4" />
                            <span>{isAr ? 'القائمة' : 'Menu'}</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent 
                        side={isAr ? "left" : "right"} 
                        className="w-full sm:max-w-none p-0 bg-white dark:bg-[#0f0f0f] border-none"
                    >
                        <div className="flex flex-col h-full">
                            <SheetHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] p-1 rounded-xl">
                                    <button 
                                        onClick={() => setSidebarTab('comments')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-black text-[10px]",
                                            sidebarTab === 'comments' ? "bg-white text-black shadow-sm" : "text-gray-500"
                                        )}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        {isAr ? 'التعليقات' : 'Comments'}
                                    </button>
                                    <button 
                                        onClick={() => setSidebarTab('chapters')}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-black text-[10px]",
                                            sidebarTab === 'chapters' ? "bg-white text-black shadow-sm" : "text-gray-500"
                                        )}
                                    >
                                        <List className="w-4 h-4" />
                                        {isAr ? 'الفصول' : 'Chapters'}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: pageTitle,
                                                    url: window.location.href
                                                }).catch(() => {});
                                            } else {
                                                navigator.clipboard.writeText(window.location.href);
                                            }
                                        }}
                                        className="p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-full hover:scale-110 active:scale-90 transition-all"
                                    >
                                        <Share2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsCommentsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </SheetHeader>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <div className="p-6">
                                    {/* Mobile Navigation Helper */}
                                    <div className="mb-8">
                                        <button 
                                            onClick={() => {
                                                setIsCommentsOpen(false);
                                                setIsNavOpen(true);
                                            }}
                                            className="w-full flex items-center justify-between p-5 bg-black text-white dark:bg-white dark:text-black rounded-3xl transition-all shadow-xl active:scale-95"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white/10 dark:bg-black/10 rounded-xl">
                                                    <Hash className="w-5 h-5" />
                                                </div>
                                                <span className="font-black italic uppercase text-xs tracking-tight">{isAr ? 'انتقال لصفحة محددة' : 'GO TO PAGE'}</span>
                                            </div>
                                            <ChevronRight className="w-5 h-5 rtl:rotate-180 opacity-50" />
                                        </button>
                                    </div>

                                    {sidebarTab === 'comments' ? (
                                        <div className="flex flex-col items-center justify-center min-h-[400px] py-12 text-center gap-6 animate-in fade-in zoom-in-95 duration-500">
                                            <button 
                                                onClick={() => setIsCommentsModalOpen(true)}
                                                className="group relative p-10 bg-blue-600/5 dark:bg-white/5 rounded-full hover:bg-blue-600/10 dark:hover:bg-white/10 transition-all active:scale-95 shadow-xl border border-blue-600/5 dark:border-white/5"
                                            >
                                                <MessageCircle className="w-20 h-20 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
                                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black px-2.5 py-1.5 rounded-full shadow-2xl ring-4 ring-white dark:ring-[#0a0a0a]">
                                                    {commentsCount}
                                                </div>
                                            </button>
                                            <div className="space-y-2">
                                                <h3 className="font-black text-2xl italic tracking-tighter uppercase text-gray-900 dark:text-white">
                                                    {isAr ? 'التعليقات' : 'COMMENTS'}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold max-w-[200px] leading-relaxed">
                                                    {isAr ? 'اضغط على الأيقونة أعلاه لفتح ومشاهدة جميع التعليقات' : 'Click the icon above to open and view all comments'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {chaptersData?.map((ch: any) => (
                                                <Link 
                                                    key={ch.id} 
                                                    to={`/${lang}/read/${id}/${ch.chapter_number}/${slugify(animeTitle)}`}
                                                    onClick={() => setIsCommentsOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-3xl transition-all border",
                                                        ch.chapter_number === chapterNum 
                                                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" 
                                                            : "bg-gray-50 dark:bg-[#111] border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/5"
                                                    )}
                                                >
                                                    <span className="text-sm font-black opacity-30 tabular-nums">#{String(ch.chapter_number).padStart(2, '0')}</span>
                                                    <span className="text-xs font-black truncate">
                                                        {isAr ? (ch.title || `الفصل ${ch.chapter_number}`) : (ch.title_en || `Chapter ${ch.chapter_number}`)}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Comments Modal (Facebook Style) */}
            <Dialog open={isCommentsModalOpen} onOpenChange={setIsCommentsModalOpen}>
                <DialogContent className={cn(
                    "sm:max-w-[700px] h-[85vh] p-0 flex flex-col overflow-hidden border-none shadow-2xl rounded-t-[32px] sm:rounded-[32px]",
                    theme === 'light' ? "bg-white" : "bg-[#0a0a0a]"
                )}>
                    <DialogHeader className="p-6 border-b dark:border-white/5 flex flex-row items-center justify-between space-y-0 sticky top-0 bg-inherit z-10">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-600/10 p-3 rounded-2xl">
                                <MessageCircle className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                                    {isAr ? 'التعليقات' : 'COMMENTS'}
                                </DialogTitle>
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">
                                    {commentsCount} {isAr ? 'تعليق' : 'comments'}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsCommentsModalOpen(false)}
                            className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-black/20">
                        <div className="max-w-[600px] mx-auto py-6">
                            <CommentsSection 
                                itemId={Number(chapter.id)} 
                                type="chapter" 
                                inputPosition="bottom"
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            {previewIndex !== null && (
                <div className={cn(
                    "fixed inset-0 z-[600] flex flex-col lg:flex-row animate-in fade-in duration-300",
                    theme === 'light' ? "bg-white text-black" : "bg-black text-white"
                )}>
                    {/* Image Area */}
                    <div className="relative flex-1 flex items-center justify-center p-2 md:p-12 h-screen overflow-hidden">
                        <button 
                            className={cn(
                                "absolute top-4 right-4 md:top-8 md:right-8 z-[610] p-2 md:p-3 rounded-full backdrop-blur-xl border transition-all hover:rotate-90 active:scale-90",
                                theme === 'light' ? "bg-black/5 border-black/10 text-black hover:bg-black/10" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                            )}
                            onClick={() => setPreviewIndex(null)}
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        {/* Navigation Arrows - Left (Prev) / Right (Next) */}
                        <button 
                            className={cn(
                                "absolute left-2 md:left-8 z-[610] p-3 md:p-6 transition-all disabled:opacity-0 group",
                                theme === 'light' ? "text-black/30 hover:text-black" : "text-white/20 hover:text-white"
                            )}
                            disabled={previewIndex === 0}
                            onClick={handlePrev}
                        >
                            <div className="flex flex-col items-center gap-1 md:gap-3">
                                <ChevronLeft className="w-10 h-10 md:w-16 md:h-16 group-hover:-translate-x-1 md:group-hover:-translate-x-2 transition-transform" />
                                <span className="hidden md:block text-[10px] font-black tracking-[3px] opacity-0 group-hover:opacity-100 transition-opacity uppercase">PREV</span>
                            </div>
                        </button>

                        <img
                            src={getImageUrl(images[previewIndex])}
                            alt={`Preview Page ${previewIndex + 1}`}
                            className={cn(
                                "max-h-full max-w-full object-contain pointer-events-none select-none",
                                theme === 'light' ? "drop-shadow-2xl" : "drop-shadow-[0_0_50px_rgba(0,0,0,1)]"
                            )}
                        />

                        <button 
                            className={cn(
                                "absolute right-2 md:right-8 z-[610] p-3 md:p-6 transition-all disabled:opacity-0 group",
                                theme === 'light' ? "text-black/30 hover:text-black" : "text-white/20 hover:text-white"
                            )}
                            disabled={previewIndex === images.length - 1}
                            onClick={handleNext}
                        >
                            <div className="flex flex-col items-center gap-1 md:gap-3">
                                <ChevronRight className="w-10 h-10 md:w-16 md:h-16 group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform" />
                                <span className="hidden md:block text-[10px] font-black tracking-[3px] opacity-0 group-hover:opacity-100 transition-opacity uppercase">NEXT</span>
                            </div>
                        </button>
                        
                        {/* Page Indicator */}
                        <div className={cn(
                            "absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 font-black text-[10px] md:text-xs px-6 md:px-10 py-2 md:py-3 rounded-full backdrop-blur-2xl border transition-all",
                            theme === 'light' ? "bg-black/5 border-black/10 text-black/80 tracking-[2px]" : "bg-white/5 border-white/10 text-white/90 tracking-[4px]"
                        )}>
                            {previewIndex + 1} / {images.length}
                        </div>
                    </div>

                    {/* Integrated Comments Sidebar (Fullscreen Mode) */}
                    <div className={cn(
                        "hidden lg:flex w-full lg:w-[480px] h-full flex-col shadow-2xl z-[620] transition-colors",
                        theme === 'light' ? "bg-gray-50 border-l border-gray-200" : "bg-[#0a0a0a] border-l border-white/5"
                    )}>
                        <div className={cn(
                            "p-8 border-b flex items-center justify-between",
                            theme === 'light' ? "border-black/5" : "border-white/5"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600/20 p-2.5 rounded-xl">
                                    <MessageCircle className="w-6 h-6 text-blue-500" />
                                </div>
                                <h2 className={cn(
                                    "font-black text-2xl italic tracking-tighter",
                                    theme === 'light' ? "text-black" : "text-white"
                                )}>
                                    {isAr ? 'التعليقات' : 'COMMENTS'}
                                </h2>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                                theme === 'light' ? "bg-black/5 border-black/10 text-gray-600" : "bg-white/5 border-white/10 text-gray-400"
                            )}>
                                PAGE {previewIndex + 1}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="comments-wrapper-fs text-[11px]">
                                <CommentsSection itemId={Number(chapter.id)} type="chapter" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .comments-wrapper, .comments-wrapper-fs { font-size: 0.75rem !important; }
                .comments-wrapper .text-sm, .comments-wrapper-fs .text-sm { font-size: 0.75rem !important; }
                .comments-wrapper .text-base, .comments-wrapper-fs .text-base { font-size: 0.8rem !important; }
                .comments-wrapper img, .comments-wrapper-fs img { max-width: 28px !important; height: auto !important; }
                .comments-wrapper .emoji, .comments-wrapper-fs .emoji { width: 24px !important; height: 24px !important; }
                [data-radix-portal] { z-index: 700 !important; }
            `}} />
            
            <AnimeShareModal 
                anime={anime} 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
            />
        </div>
    );
}
