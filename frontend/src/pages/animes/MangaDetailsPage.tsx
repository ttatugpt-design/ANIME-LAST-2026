import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck } from "lucide-react";
import api from "@/lib/api";
import { renderEmojiContent } from "@/utils/render-content";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import AnimeListHoverCard from "@/components/AnimeListHoverCard";
import SpinnerImage from "@/components/ui/SpinnerImage";
import { NewsTicker } from '@/components/common/NewsTicker';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import Footer from "@/components/common/Footer";
import { slugify } from "@/utils/slug";
import { cn } from "@/lib/utils";
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import CentralSpinner from "@/components/ui/CentralSpinner";
import { AnimeShareModal } from "@/components/animes/AnimeShareModal";
import { getImageUrl } from '@/utils/image-utils';
import { WatchLaterButton } from '@/components/common/WatchLaterButton';


export default function MangaDetailsPage() {
    const { id, slug: currentSlug } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language; // 'ar' or 'en'

    // State
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoadingDelay, setIsLoadingDelay] = useState(true);

    // Hover state management for chapters
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Watch Later & Share State
    const { isSaved, toggleItem } = useWatchLaterStore();
    const { isAuthenticated } = useAuthStore();
    const [isWatchLaterLoading, setIsWatchLaterLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleMouseEnter = (index: number) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setHoveredCardIndex(index);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCardIndex(null);
        }, 100);
    };

    const keepCardOpen = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };

    // Fetch Manga Data
    const { data: manga, isLoading: isQueryLoading, error } = useQuery({
        queryKey: ["manga", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // Fetch Chapters
    const { data: chaptersData } = useQuery({
        queryKey: ["chapters", manga?.id],
        queryFn: async () => {
            const response = await api.get(`/chapters`, { params: { anime_id: manga?.id } });
            return response.data;
        },
        enabled: !!manga?.id,
    });

    // Track Manga View
    const trackedMangaRef = useRef<number | null>(null);
    useEffect(() => {
        if (manga?.id && trackedMangaRef.current !== manga.id) {
            trackedMangaRef.current = manga.id;
            api.post('/history/track-anime', {
                anime_id: manga.id,
                image: manga.cover || manga.image || ''
            }).catch(err => console.error('Failed to track manga view:', err));
        }

        // Redirection logic for SEO slugs
        if (manga && id) {
            const mangaTitle = lang === 'ar' ? manga.title : (manga.title_en || manga.title);
            const expectedSlug = slugify(mangaTitle);

            if (currentSlug !== expectedSlug) {
                navigate(`/${lang}/mangas/${id}/${expectedSlug}`, { replace: true });
            }
        }
    }, [manga, id, currentSlug, lang, navigate]);

    // Simulate initial loading delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingDelay(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const isLoading = isQueryLoading || isLoadingDelay;

    // Chapters list
    const chaptersList = useMemo(() => {
        const list = manga?.chapters || chaptersData || [];
        if (!manga?.id) return list;
        return list.filter((ch: any) => Number(ch.anime_id) === Number(manga.id));
    }, [manga, chaptersData]);

    // Derived Data
    const backgroundUrl = useMemo(() => {
        if (!manga) return null;
        return getImageUrl(manga.cover || manga.image);
    }, [manga]);

    const firstChapterId = useMemo(() => {
        if (chaptersList && chaptersList.length > 0) {
            return chaptersList[0];
        }
        return null;
    }, [chaptersList]);

    const filteredChapters = useMemo(() => {
        if (!chaptersList) return [];
        let filtered = chaptersList;

        if (selectedNumber !== null) {
            filtered = filtered.filter((ch: any) =>
                ch.chapter_number?.toString().startsWith(selectedNumber)
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((ch: any) =>
                (ch.title && ch.title.toLowerCase().includes(query)) ||
                (ch.chapter_number && ch.chapter_number.toString().includes(query))
            );
        }
        return filtered;
    }, [chaptersList, searchQuery, selectedNumber]);


    // Pagination / Load More
    const [visibleCount, setVisibleCount] = useState(8);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleShowMore = () => {
        setIsLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => prev + 12);
            setIsLoadingMore(false);
        }, 800);
    };

    const displayedChapters = useMemo(() => {
        return filteredChapters.slice(0, visibleCount);
    }, [filteredChapters, visibleCount]);

    const handleWatchLaterToggle = async () => {
        if (!isAuthenticated) {
            toast.error(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        setIsWatchLaterLoading(true);
        const added = await toggleItem(Number(manga?.id), null);
        setIsWatchLaterLoading(false);

        if (added) {
            toast.success(lang === 'ar' ? 'تمت الإضافة إلى القائمة!' : 'Added to Watch Later!');
        }
    };

    // SEO Content
    const mangaTitle = (lang === 'ar' ? manga?.title : (manga?.title_en || manga?.title)) || "";
    const mangaDescription = (lang === 'ar' ? (manga?.description || manga?.description_en) : (manga?.description_en || manga?.description)) || "";
    const pageTitle = mangaTitle || (lang === 'ar' ? "تفاصيل المانجا" : "Manga Details");

    const mangaImage = manga ? getImageUrl(manga.banner || manga.cover || manga.image) : '';
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    const studioName = manga?.studio?.name || manga?.studio_name || "";
    const releaseYear = manga?.release_date ? new Date(manga.release_date).getFullYear() : "";
    const genres = manga?.categories?.map((c: any) => lang === 'ar' ? c.title : c.title_en).filter(Boolean).join(', ') || '';

    const keywords = [mangaTitle, genres, studioName, releaseYear, manga?.status, lang === 'ar' ? 'مترجم' : 'subbed'].filter(Boolean).join(', ');

    // Breadcrumb Data
    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": lang === 'ar' ? "الرئيسية" : "Home",
                "item": `${window.location.origin}/${lang}`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": lang === 'ar' ? "المانجا" : "Manga",
                "item": `${window.location.origin}/${lang}/mangas`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": mangaTitle,
                "item": canonicalUrl
            }
        ]
    };

    // JSON-LD Schema
    const schemaData = manga ? {
        "@context": "https://schema.org",
        "@type": "CreativeWorkSeries",
        "name": mangaTitle,
        "description": mangaDescription,
        "image": mangaImage,
        "genre": manga?.categories?.map((c: any) => lang === 'ar' ? c.title : c.title_en).filter(Boolean) || [],
        "startDate": manga.release_date,
        "author": {
            "@type": "Person",
            "name": studioName || "Unknown"
        },
        "status": manga.status,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": manga.rating || "0",
            "bestRating": "10",
            "worstRating": "1",
            "ratingCount": manga.rating_count || "100"
        }
    } : null;

    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet htmlAttributes={{ lang: lang }}>
                {(!manga && !isLoading) || error ? (
                    <meta name="robots" content="noindex, nofollow" />
                ) : (
                    <meta name="robots" content="index, follow" />
                )}

                <title>{pageTitle}</title>
                <meta name="title" content={pageTitle} />
                <meta name="description" content={mangaDescription?.slice(0, 160)} />
                <meta name="keywords" content={keywords} />
                <meta name="author" content="AnimeLast" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={canonicalUrl} />

                {/* Open Graph */}
                <meta property="og:type" content="book" />
                <meta property="og:site_name" content="AnimeLast" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={mangaDescription?.slice(0, 160)} />
                <meta property="og:image" content={mangaImage} />
                <meta property="og:locale" content={lang === 'ar' ? 'ar_AR' : 'en_US'} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={mangaDescription?.slice(0, 160)} />
                <meta name="twitter:image" content={mangaImage} />

                {schemaData && (
                    <script type="application/ld+json">
                        {JSON.stringify(schemaData)}
                    </script>
                )}
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbData)}
                </script>
            </Helmet>

            <div className="min-h-[45px]">
                <NewsTicker />
            </div>

            <div className="w-full min-h-screen">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible min-h-screen">
                    <div className="hidden lg:block lg:col-span-2 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30">
                        <SocialNavSidebar />
                    </div>

                    {isLoading ? (
                        <div className="col-span-1 lg:col-span-10 flex items-center justify-center min-h-[calc(100vh-150px)]">
                            <CentralSpinner />
                        </div>
                    ) : (
                        <>
                            <div className="col-span-1 lg:col-span-7 border-x-0 lg:border-r border-gray-100 dark:border-[#2a2a2a] rtl:lg:border-r-0 rtl:lg:border-l">
                                <div className="flex flex-col min-h-screen">
                                    {error || !manga ? (
                                        <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                                            <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على المانجا' : 'Oops, Manga Not Found'}</h1>
                                            <Link to="/mangas" className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-all font-bold">
                                                {lang === 'ar' ? 'العودة لتصفح المانجا' : 'Back to Browse'}
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="animate-fade-in w-full">
                                            {/* MOBILE HERO SECTION */}
                                            <div className="lg:hidden relative w-full h-[60vh] md:h-[70vh] overflow-hidden group">
                                                <div className="absolute inset-0">
                                                    {backgroundUrl && (
                                                        <SpinnerImage
                                                            src={backgroundUrl}
                                                            alt={mangaTitle}
                                                            className="w-full h-full"
                                                            imageClassName="object-cover object-top"
                                                            spinnerClassName="w-16 h-16 border-4"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                    <div className={`absolute inset-0 bg-gradient-to-${lang === 'ar' ? 'r' : 'l'} from-transparent via-black/40 to-black/90`}></div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                                </div>

                                                <div className={`absolute inset-0 flex items-center ${lang === 'ar' ? 'pr-8 md:pr-16 pl-8' : 'pl-8 md:pl-16 pr-8'}`}>
                                                    <div className={`w-full md:w-2/3 space-y-6 ${lang === 'ar' ? 'text-right' : 'text-left'} z-10`}>
                                                        <h1 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-lg font-cairo">
                                                            {renderEmojiContent(mangaTitle)}
                                                        </h1>

                                                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300">
                                                            <span className="px-2 py-0.5 bg-[#2a2a2a] text-gray-100 text-xs rounded border border-gray-600">All Ages</span>
                                                            {manga.type && <span className="uppercase">{manga.type}</span>}
                                                            <span className="hidden md:inline">•</span>
                                                            {manga.status && <span>{manga.status}</span>}
                                                            <span className="hidden md:inline">•</span>
                                                            <div className="flex items-center gap-1 text-yellow-500">
                                                                <Star className="w-4 h-4 fill-current" />
                                                                <span>{manga.rating || 'N/A'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <p className="text-gray-200 text-sm md:text-base leading-relaxed line-clamp-4 max-w-2xl drop-shadow-md">
                                                                {renderEmojiContent(mangaDescription || 'No description available.')}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 pt-4">
                                                            {firstChapterId ? (
                                                                <Link
                                                                    to={`/${lang}/read/${manga?.id}/${firstChapterId.chapter_number}/${slugify(mangaTitle)}`}
                                                                    className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-wide transition-transform hover:scale-105 skew-x-[-10deg]"
                                                                >
                                                                    <span className="skew-x-[10deg] flex items-center gap-2">
                                                                        <Play className="w-5 h-5 fill-current" />
                                                                        {lang === 'ar' ? `بدء الفصل ${firstChapterId.chapter_number}` : `Start Ch ${firstChapterId.chapter_number}`}
                                                                    </span>
                                                                </Link>
                                                            ) : (
                                                                <button disabled className="flex items-center gap-3 px-8 py-4 bg-gray-600 text-gray-400 font-bold uppercase tracking-wide cursor-not-allowed skew-x-[-10deg]">
                                                                    <span className="skew-x-[10deg] flex items-center gap-2">
                                                                        {lang === 'ar' ? 'قريبا' : 'Coming Soon'}
                                                                    </span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={handleWatchLaterToggle}
                                                                disabled={isWatchLaterLoading}
                                                                className={cn(
                                                                    "p-4 skew-x-[-10deg] transition-all duration-300 shadow-lg border-2",
                                                                    isSaved(Number(manga?.id), null)
                                                                        ? "bg-black border-black text-white hover:bg-neutral-900"
                                                                        : "bg-white border-white text-black hover:bg-neutral-100"
                                                                )}
                                                            >
                                                                <div className="skew-x-[10deg]">
                                                                    {isWatchLaterLoading ? (
                                                                        <Loader2 className={cn("w-6 h-6 animate-spin", isSaved(Number(manga?.id), null) ? "text-white" : "text-black")} />
                                                                    ) : isSaved(Number(manga?.id), null) ? (
                                                                        <BookmarkCheck className="w-6 h-6 fill-current" />
                                                                    ) : (
                                                                        <Plus className="w-6 h-6" />
                                                                    )}
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DESKTOP INFO SECTION */}
                                            <div className="hidden lg:flex flex-col w-full p-8 gap-8">
                                                <div className="flex w-full gap-10 items-start">
                                                    <div className="w-[200px] shrink-0">
                                                        <div className="aspect-[3/4] rounded-none overflow-hidden shadow-2xl border border-gray-100 dark:border-[#2a2a2a] relative bg-gray-100 dark:bg-[#1c1c1c]">
                                                            <SpinnerImage
                                                                src={getImageUrl(manga?.cover || manga?.image)}
                                                                alt={mangaTitle}
                                                                className="w-full h-full"
                                                                imageClassName="object-cover"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className={`flex-1 flex flex-col justify-start text-gray-900 dark:text-white pt-2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                                        <h1 className="text-lg lg:text-xl xl:text-2xl font-black leading-tight mb-5 drop-shadow-sm group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                                            {renderEmojiContent(mangaTitle)}
                                                        </h1>

                                                        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400 mb-8">
                                                            <span className="px-3 py-1 bg-gray-200 dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 rounded-none">All Ages</span>
                                                            {manga?.status && <span className="uppercase text-black dark:text-gray-300 bg-white dark:bg-white/5 px-2 py-0.5 rounded-none border border-gray-200 dark:border-white/10 shadow-sm">{manga.status}</span>}
                                                            <div className="flex items-center gap-1 text-yellow-500 bg-white dark:bg-yellow-500/10 px-2 py-0.5 rounded-none border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                                                <Star className="w-4 h-4 fill-current" />
                                                                <span className="text-black dark:text-yellow-500">{manga?.rating || 'N/A'}</span>
                                                            </div>
                                                            {genres && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span className="text-gray-500 dark:text-gray-300">{genres}</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 mt-auto">
                                                            {firstChapterId ? (
                                                                <Link
                                                                    to={`/${lang}/read/${manga?.id}/${firstChapterId.chapter_number}/${slugify(mangaTitle)}`}
                                                                    className="flex items-center gap-3 px-10 py-4 bg-white dark:bg-white text-black dark:text-black font-black uppercase tracking-widest transition-transform hover:-translate-y-1 hover:shadow-xl rounded-none shadow-md border border-gray-200 dark:border-gray-200"
                                                                >
                                                                    <Play className="w-6 h-6 fill-current" />
                                                                    {lang === 'ar' ? `ابدأ القراءة` : `Start Reading`}
                                                                </Link>
                                                            ) : (
                                                                <button disabled className="flex items-center gap-3 px-10 py-4 bg-gray-100 dark:bg-gray-100 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest cursor-not-allowed rounded-none border border-gray-200 dark:border-gray-200">
                                                                    {lang === 'ar' ? 'قريبا' : 'Coming Soon'}
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={handleWatchLaterToggle}
                                                                disabled={isWatchLaterLoading}
                                                                className={cn(
                                                                    isSaved(Number(manga?.id), null)
                                                                        ? "bg-black border-black text-white dark:bg-black dark:border-black dark:text-white"
                                                                        : "bg-white border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 hover:shadow-sm"
                                                                )}
                                                                title={lang === 'ar' ? 'أضف لقائمة المتابعة' : 'Add to Watchlist'}
                                                            >
                                                                {isWatchLaterLoading ? (
                                                                    <Loader2 className="w-7 h-7 animate-spin" />
                                                                ) : isSaved(Number(manga?.id), null) ? (
                                                                    <BookmarkCheck className="w-7 h-7 fill-current" />
                                                                ) : (
                                                                    <Bookmark className="w-7 h-7 group-hover:scale-110 transition-transform" />
                                                                )}
                                                            </button>
 
                                                            <button
                                                                onClick={() => setIsShareModalOpen(true)}
                                                                className="flex items-center justify-center p-4 rounded-none bg-white border border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 transition-all shadow-sm group"
                                                            >
                                                                <Share2 className="w-7 h-7 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-6 rounded-none border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
                                                    <p className="text-gray-800 dark:text-gray-300 text-base lg:text-lg leading-relaxed font-medium">
                                                        {renderEmojiContent(mangaDescription || 'No description available.')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CHAPTERS SECTION */}
                                            <div className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 py-12 w-full">
                                                <div className="flex flex-col gap-6 mb-8">
                                                    <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">
                                                        <div className="flex items-center gap-6 text-base font-bold">
                                                            <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                                                <Filter className="w-5 h-5" />
                                                                <span>{lang === 'ar' ? 'فلتر' : 'Filter'}</span>
                                                            </button>
                                                            <div className="relative hidden md:block">
                                                                <Search className={`absolute w-4 h-4 text-gray-400 -translate-y-1/2 top-1/2 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                                                                <input
                                                                    value={searchQuery}
                                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                                    className={`bg-gray-100 dark:bg-neutral-900 py-1.5 pl-10 pr-4 rounded-full text-xs outline-none focus:ring-1 focus:ring-black dark:focus:ring-white w-48 ${lang === 'ar' ? 'pr-10 pl-4' : ''}`}
                                                                    placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                                                                />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                                                            {lang === 'ar' ? 'فصول المانجا' : 'Manga Chapters'}
                                                            <span className="text-gray-500 text-lg font-normal mx-2">({chaptersList?.length || 0})</span>
                                                        </h3>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-6">
                                                    {filteredChapters.length > 0 ? (
                                                        <>
                                                            {displayedChapters.map((chapter: any, index: number) => (
                                                                <ChapterListItem key={chapter.id} chapter={chapter} lang={lang} mangaTitle={mangaTitle} />
                                                            ))}

                                                            {visibleCount < filteredChapters.length && (
                                                                <div className="flex justify-center mt-12">
                                                                    <button
                                                                        onClick={handleShowMore}
                                                                        disabled={isLoadingMore}
                                                                        className="px-10 py-3 bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest rounded-full hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center gap-3"
                                                                    >
                                                                        {isLoadingMore ? (
                                                                            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 border-t-white dark:border-t-black rounded-full animate-spin"></div>
                                                                        ) : (
                                                                            lang === 'ar' ? 'إظهار المزيد' : 'Load More'
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="py-20 text-center relative">
                                                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-900 mb-4">
                                                                <Search className="w-8 h-8 text-gray-500" />
                                                            </div>
                                                            <p className="text-gray-500">
                                                                {lang === 'ar' ? 'لا توجد فصول مطابقة.' : 'No chapters found.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30 px-2 pt-2 md:pt-4 pb-4">
                                <div className="flex items-center justify-between px-2 border-b border-gray-200 dark:border-[#333] pb-2 mb-2">
                                    <h3 className="font-black text-gray-900 dark:text-gray-400 text-base md:text-lg">
                                        {lang === 'ar' ? 'فصول المانجا' : 'Manga Chapters'}
                                    </h3>
                                    <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
                                        <Filter className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] shadow-sm">
                                    {filteredChapters.length > 0 ? (
                                        filteredChapters.map((ch: any) => {
                                            const chItemTitle = lang === 'ar' ? (ch.title || `الفصل ${ch.chapter_number}`) : (ch.title_en || `Chapter ${ch.chapter_number}`);
                                            const chUrl = `/${lang}/read/${manga?.id || ch.anime_id}/${ch.chapter_number}/${slugify(mangaTitle)}`;

                                            return (
                                                <div key={ch.id} className="group flex items-center gap-0 px-2 py-1.5 border-b border-gray-50 dark:border-white/5 last:border-0 transition-all hover:bg-white dark:hover:bg-[#222] hover:shadow-sm">
                                                    <Link to={chUrl} className="flex-1 flex items-center min-w-0">
                                                        <div className="w-8 flex-shrink-0 text-[11px] font-bold text-gray-400 text-center">
                                                            #{ch.chapter_number}
                                                        </div>
                                                        <div className="flex-1 min-w-0 px-2">
                                                            <h4 className="text-[13px] font-medium text-gray-700 dark:text-gray-300 truncate">
                                                                {chItemTitle}
                                                            </h4>
                                                        </div>
                                                    </Link>
                                                    <div className="flex-shrink-0 flex items-center justify-end">
                                                        <div className="hidden group-hover:flex items-center gap-0.5">
                                                            <button onClick={() => setIsShareModalOpen(true)} className="p-1 h-7 w-7 rounded-sm hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-sm">
                                                                <Share2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-center text-gray-500 py-6 text-sm">
                                            {lang === 'ar' ? 'لا توجد فصول مطابقة.' : 'No chapters found.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AnimeShareModal anime={manga} isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
            <Footer />
        </div>
    );
}

function ChapterListItem({ chapter, lang, mangaTitle }: { chapter: any; lang: string; mangaTitle: string }) {
    const isRtl = lang === 'ar';
    const title = isRtl ? (chapter.title || `فصل ${chapter.chapter_number}`) : (chapter.title_en || `Chapter ${chapter.chapter_number}`);
    const image = chapter.thumbnail || chapter.banner || '';

    return (
        <Link
            to={`/${lang}/read/${chapter.anime_id}/${chapter.chapter_number}/${slugify(mangaTitle)}`}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-200 relative z-10 p-0 md:p-2 border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-md rounded-lg"
        >
            <div className="w-[140px] md:w-[260px] h-[80px] md:h-[145px] flex-shrink-0 relative overflow-hidden shadow-sm">
                <SpinnerImage
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-full"
                    imageClassName="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-current translate-y-2 group-hover:translate-y-0 duration-300" />
                </div>
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 uppercase">
                    {isRtl ? 'فصل' : 'CH'} {chapter.chapter_number}
                </div>
            </div>

            <div className={`flex-1 flex flex-col items-start py-0 md:py-2 ${isRtl ? 'text-right' : 'text-left'} w-full min-w-0`}>
                <h3 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-2">
                    {title}
                </h3>
                <div className="mt-auto flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-6 w-full pt-1">
                    <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
                        {isRtl ? `الفصل ${chapter.chapter_number}` : `Chapter ${chapter.chapter_number}`}
                    </p>
                </div>
            </div>
        </Link>
    );
}
