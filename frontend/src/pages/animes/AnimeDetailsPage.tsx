import { useEffect, useState, useMemo, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck, X, Library, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { renderEmojiContent } from "@/utils/render-content";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import AnimeListHoverCard from "@/components/AnimeListHoverCard";
import SpinnerImage from "@/components/ui/SpinnerImage";

import { DashboardSidebar } from '@/components/social/DashboardSidebar';
import Footer from "@/components/common/Footer";
import { slugify } from "@/utils/slug";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useWatchLaterStore } from '@/stores/watch-later-store';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

import CentralSpinner from "@/components/ui/CentralSpinner";
import { AnimeShareModal } from "@/components/animes/AnimeShareModal";
import { getImageUrl } from '@/utils/image-utils';
import { WatchLaterButton } from '@/components/common/WatchLaterButton';
import { CommentsSection } from "@/components/comments/CommentsSection";
import { useModalBackButton } from '@/hooks/useModalBackButton';


// Hero Skeleton replaced by CrunchyrollSkeleton full-screen variant

export default function AnimeDetailsPage() {
    const { id, slug: currentSlug } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language; // 'ar' or 'en'

    // State
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>('comments');
    const [commentsCount, setCommentsCount] = useState(0);
    const [showFullDescription, setShowFullDescription] = useState(false);

    // Fetch Collections for this anime
    const { data: animeCollections, isLoading: isLoadingCollections } = useQuery({
        queryKey: ["anime-collections-by-anime", id],
        queryFn: async () => (await api.get(`/anime-collections/anime/${id}`)).data,
        enabled: !!id,
    });

    // Hover state management for episodes
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const seasonsCount = animeCollections?.reduce((acc: number, col: any) => acc + (col.animes?.length || 0), 0) || 0;
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Watch Later & Share State
    const { isSaved, toggleItem } = useWatchLaterStore();
    const { isAuthenticated } = useAuthStore();
    const [isWatchLaterLoading, setIsWatchLaterLoading] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isInitialButtonLoading, setIsInitialButtonLoading] = useState(true);

    useModalBackButton(isShareModalOpen, () => setIsShareModalOpen(false), 'share');

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

    // Fetch Anime Data
    const { data: anime, isLoading: isQueryLoading, error } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
        staleTime: 20 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
    });

    // Fetch Episodes separately as fallback (if not included in anime details)
    const { 
        data: infiniteEpisodesData, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage 
    } = useInfiniteQuery({
        queryKey: ["episodes-infinite", anime?.id, searchQuery, selectedNumber],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await api.get(`/episodes`, { 
                params: { 
                    anime_id: anime?.id,
                    paginate: true,
                    limit: 25,
                    page: pageParam,
                    search: searchQuery || undefined,
                    // If selectedNumber is a specific episode number prefix, we can pass it as search or handle uniquely.
                    // For now, let's treat selectedNumber as part of the search if it's set.
                    // For now, let's treat selectedNumber as part of the search if it's set.
                } 
            });
            return response.data; // { data: [], total, page, last_page }
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.last_page) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        enabled: !!anime?.id,
        staleTime: 5 * 60 * 1000,
        initialPageParam: 1,
    });

    const episodesData = useMemo(() => {
        return infiniteEpisodesData?.pages.flatMap(page => page.data) || [];
    }, [infiniteEpisodesData]);

    const isLoading = isQueryLoading;

    // Track Anime View (once per anime)
    const trackedAnimeRef = useRef<number | null>(null);
    useEffect(() => {
        if (anime?.id && trackedAnimeRef.current !== anime.id) {
            trackedAnimeRef.current = anime.id;
            api.post('/history/track-anime', {
                anime_id: anime.id,
                image: anime.cover || anime.image || '' // Send anime image
            }).catch(err => console.error('Failed to track anime view:', err));
        }

        // Redirection logic for Manga type
        if (anime && anime.type === 'manga') {
            const animeTitle = lang === 'ar' ? anime.title : (anime.title_en || anime.title);
            const expectedSlug = slugify(animeTitle);
            navigate(`/${lang}/mangas/${id}/${expectedSlug}`, { replace: true });
            return;
        }

        // Redirection logic for SEO slugs
        if (anime && id) {
            const animeTitle = lang === 'ar' ? anime.title : (anime.title_en || anime.title);
            const expectedSlug = slugify(animeTitle);

            if (currentSlug !== expectedSlug) {
                // Update URL without a full reload for better DX, but using navigate with replace for correct history
                navigate(`/${lang}/animes/${id}/${expectedSlug}`, { replace: true });
            }
        }
    }, [anime, id, currentSlug, lang, navigate]);

    useEffect(() => {
        if (!isLoading) {
            const timer = setTimeout(() => {
                setIsInitialButtonLoading(false);
            }, 1200); // Premium delay to show the high-quality spinner
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [id]);

    const episodesList = useMemo(() => {
        // Prefer server-side paginated data, but fall back to initial anime.episodes if query hasn't run yet
        const list = episodesData.length > 0 ? episodesData : (anime?.episodes || []);
        if (!anime?.id) return list;

        // Ensure we only show episodes for the current anime and respect search/filters
        return list.filter((ep: any) => {
            const matchesAnime = Number(ep.anime_id) === Number(anime.id);
            const matchesSearch = searchQuery 
                ? (ep.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                   ep.title_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   String(ep.episode_number).includes(searchQuery))
                : true;
            const matchesNumber = selectedNumber
                ? String(ep.episode_number).startsWith(selectedNumber)
                : true;
            
            return matchesAnime && ep.is_published && matchesSearch && matchesNumber;
        });
    }, [anime, episodesData, searchQuery, selectedNumber]);

    // Derived Data
    const backgroundUrl = useMemo(() => {
        if (!anime) return null;
        return getImageUrl(anime.cover || anime.image);
    }, [anime]);

    const firstEpisodeId = useMemo(() => {
        if (episodesList && episodesList.length > 0) {
            return episodesList[0];
        }
        return null;
    }, [episodesList]);

    const filteredEpisodes = useMemo(() => {
        return episodesList; // Server-side filtering is now handled by the query
    }, [episodesList]);


    // Pagination / Load More
    const [visibleCount, setVisibleCount] = useState(25);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    
    const { ref: loadMoreRef, inView } = useInView({
        threshold: 0.1,
        rootMargin: '400px', // Fetch earlier for smoother experience
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleShowMore = () => {
        if (hasNextPage) fetchNextPage();
    };

    const displayedEpisodes = filteredEpisodes;

    const handleWatchLaterToggle = async () => {
        if (!isAuthenticated) {
            toast.error(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        setIsWatchLaterLoading(true);
        const added = await toggleItem(Number(anime?.id), null);
        setIsWatchLaterLoading(false);

        if (added) {
            toast.success(lang === 'ar' ? 'تمت الإضافة إلى القائمة!' : 'Added to Watch Later!', { position: 'top-center' });
        } else {
            toast.success(lang === 'ar' ? 'تمت الإزالة من القائمة' : 'Removed from list', { 
                position: 'top-center',
                icon: <X className="w-4 h-4 text-red-500" />
            });
        }
    };

    // Pure SEO Content (Directly from Database)
    const animeTitle = (lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title)) || "";
    const animeDescription = (lang === 'ar' ? (anime?.description || anime?.description_en) : (anime?.description_en || anime?.description)) || "";

    // Use the actual anime title exactly as requested
    const pageTitle = animeTitle || (lang === 'ar' ? "تفاصيل الأنمي" : "Anime Details");

    const animeImage = anime ? getImageUrl(anime.banner || anime.cover || anime.image) : '';
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    // Extracting more data for SEO
    const studioName = anime?.studio?.name || anime?.studio_name || "";
    const releaseYear = anime?.release_date ? new Date(anime.release_date).getFullYear() : "";
    const genres = anime?.categories?.map((c: any) => lang === 'ar' ? c.title : c.title_en).filter(Boolean).join(', ') || '';

    const keywords = [animeTitle, genres, studioName, releaseYear, anime?.status, lang === 'ar' ? 'مترجم' : 'subbed'].filter(Boolean).join(', ');

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
                "name": lang === 'ar' ? "الأنمي" : "Anime",
                "item": `${window.location.origin}/${lang}/animes`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": pageTitle,
                "item": canonicalUrl
            }
        ]
    };

    // ─── Structured Data (JSON-LD) ───────────────────────────────────────────
    const schemaData = anime ? {
        "@context": "https://schema.org",
        "@type": "TVSeries",
        "name": animeTitle,
        "description": animeDescription,
        "image": animeImage,
        "genre": genres,
        "author": {
            "@type": "Organization",
            "name": studioName
        },
        "datePublished": anime.release_date,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": anime.rating || "N/A",
            "bestRating": "10",
            "worstRating": "1"
        }
    } : null;

    return (
        <div className="bg-white dark:bg-black overflow-x-hidden">
            {/* 1. SEO Helmet - Critical for Performance & Ranking */}
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={animeDescription?.slice(0, 160)} />
                <meta name="keywords" content={keywords} />
                <link rel="canonical" href={canonicalUrl} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="video.tv_show" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={animeDescription?.slice(0, 160)} />
                <meta property="og:image" content={animeImage} />

                {/* Twitter */}
                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content={canonicalUrl} />
                <meta property="twitter:title" content={pageTitle} />
                <meta property="twitter:description" content={animeDescription?.slice(0, 160)} />
                <meta property="twitter:image" content={animeImage} />

                {/* ItemProp */}
                <meta itemProp="name" content={pageTitle} />
                <meta itemProp="description" content={animeDescription?.slice(0, 160)} />
                <meta itemProp="image" content={animeImage} />

                {/* 2. Structured Data (JSON-LD) */}
                {schemaData && (
                    <script type="application/ld+json">
                        {JSON.stringify(schemaData)}
                    </script>
                )}
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbData)}
                </script>
            </Helmet>



            {/* Main Layout - Sync with WatchPage */}
            <div className="w-full min-h-screen">
                <div className="flex flex-col lg:flex-row overflow-visible min-h-screen">
                    {/* Left Sidebar - Dashboard Style */}
                    <aside className="hidden xl:block w-64 flex-shrink-0 border-l border-gray-100 dark:border-white/10 bg-white dark:bg-black -mt-4 md:-mt-10">
                        <div className="sticky top-[20px] h-[calc(100vh-20px)] shadow-sm">
                            <DashboardSidebar noTopSpace />
                        </div>
                    </aside>

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)]">
                            <CentralSpinner />
                        </div>
                    ) : (
                        <>
                            {/* Main Content Area */}
                            <div className="flex-1 min-w-0 border-x-0 lg:border-r border-gray-100 dark:border-[#2a2a2a] rtl:lg:border-r-0 rtl:lg:border-l">
                                <div className="flex flex-col min-h-screen">
                                    {/* Hero & Search Section */}
                                    {error || !anime ? (
                                        <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                                            <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على الأنمي' : 'Oops, Anime Not Found'}</h1>
                                            <Link to="/animes" className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-all font-bold">
                                                {lang === 'ar' ? 'العودة لتصفح الأنمي' : 'Back to Browse'}
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="animate-fade-in w-full">
                                            {/* MOBILE HERO SECTION */}
                                            <div className="lg:hidden relative w-full h-[60vh] md:h-[70vh] overflow-hidden group">
                                                {/* Background Image */}
                                                <div className="absolute inset-0">
                                                    {backgroundUrl && (
                                                        <SpinnerImage
                                                            src={backgroundUrl}
                                                            alt={animeTitle}
                                                            className="w-full h-full"
                                                            imageClassName="object-cover object-top"
                                                            spinnerClassName="w-16 h-16 border-4"
                                                            loading="eager"
                                                        />
                                                    )}
                                                    {/* Gradient Overlay */}
                                                    <div className={`absolute inset-0 bg-gradient-to-${lang === 'ar' ? 'r' : 'l'} from-transparent via-black/40 to-black/90`}></div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                                </div>

                                                {/* Content Container */}
                                                <div className={`absolute inset-0 flex items-center ${lang === 'ar' ? 'pr-8 md:pr-16 pl-8' : 'pl-8 md:pl-16 pr-8'}`}>
                                                    <div className={`w-full md:w-2/3 space-y-6 ${lang === 'ar' ? 'text-right' : 'text-left'} z-10`}>

                                                        {/* Title - Reduced Size */}
                                                        <h1 className="text-2xl md:text-4xl font-black text-white leading-tight drop-shadow-lg font-cairo">
                                                            {renderEmojiContent(animeTitle)}
                                                        </h1>

                                                        {/* Metadata Row */}
                                                        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-300">
                                                            <span className="px-2 py-0.5 bg-[#2a2a2a] text-gray-100 text-xs rounded border border-gray-600">14+</span>
                                                            {anime.type && <span className="uppercase">{anime.type}</span>}
                                                            <span className="hidden md:inline">•</span>
                                                            {anime.status && <span>{anime.status}</span>}
                                                            <span className="hidden md:inline">•</span>
                                                            <div className="flex items-center gap-1 text-yellow-500">
                                                                <Star className="w-4 h-4 fill-current" />
                                                                <span>{anime.rating || 'N/A'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Description - Reduced Size */}
                                                        <div className="space-y-4">
                                                            <p className="text-gray-200 text-xs md:text-sm leading-relaxed line-clamp-4 max-w-2xl drop-shadow-md">
                                                                {renderEmojiContent(animeDescription || 'No description available.')}
                                                            </p>
                                                        </div>

                                                        {/* Actions Buttons */}
                                                        <div className="flex flex-wrap items-center gap-2 pt-4 min-h-[48px]">
                                                            {isInitialButtonLoading ? (
                                                                <div className="px-6 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                                                                    <CentralSpinner size="small" />
                                                                </div>
                                                            ) : firstEpisodeId ? (
                                                                <Link
                                                                    to={`/${lang}/watch/${anime?.id}/${firstEpisodeId.episode_number}/${slugify(animeTitle)}`}
                                                                    className="flex items-center gap-2 px-5 py-2.5 text-sm bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-wide transition-all hover:scale-105 rounded-full animate-in fade-in zoom-in duration-500"
                                                                >
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Play className="w-4 h-4 fill-current" />
                                                                        {lang === 'ar' ? `بدء الحلقة ${firstEpisodeId.episode_number}` : `Start Ep ${firstEpisodeId.episode_number}`}
                                                                    </span>
                                                                </Link>
                                                            ) : (
                                                                <button disabled className="flex items-center gap-2 px-5 py-2.5 text-sm bg-gray-600 text-gray-400 font-bold uppercase tracking-wide cursor-not-allowed skew-x-[-10deg]">
                                                                    <span className="skew-x-[10deg] flex items-center gap-1.5">
                                                                        {lang === 'ar' ? 'قريبا' : 'Coming Soon'}
                                                                    </span>
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={handleWatchLaterToggle}
                                                                disabled={isWatchLaterLoading}
                                                                className={cn(
                                                                    "flex items-center justify-center p-2.5 rounded-full transition-all duration-300 shadow-sm border group",
                                                                    isSaved(Number(anime?.id), null)
                                                                        ? "bg-black border-black text-white dark:bg-black dark:border-black dark:text-white"
                                                                        : "bg-white border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 hover:shadow-sm"
                                                                )}
                                                                title={lang === 'ar' ? 'أضف لقائمة المشاهدة' : 'Watch Later'}
                                                            >
                                                                {isWatchLaterLoading ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : isSaved(Number(anime?.id), null) ? (
                                                                    <BookmarkCheck className="w-5 h-5 fill-current" />
                                                                ) : (
                                                                    <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => setIsShareModalOpen(true)}
                                                                className="flex items-center justify-center p-2.5 rounded-full bg-white border border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 transition-all shadow-sm group"
                                                            >
                                                                <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DESKTOP HERO SECTION - Clean, centered, premium */}
                                            <div className="hidden lg:block relative w-full pt-10 pb-6 px-4 md:px-12 bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-[#1a1a1a]">
                                                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 items-start">
                                                    {/* Poster/Image Column */}
                                                    <div className="w-full md:w-[280px] flex-shrink-0">
                                                        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                                                            <SpinnerImage
                                                                src={getImageUrl(anime?.image || anime?.cover)}
                                                                alt={animeTitle}
                                                                className="w-full h-full"
                                                                imageClassName="object-cover"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Info & Details */}
                                                    <div className={`flex-1 flex flex-col justify-start text-gray-900 dark:text-white pt-2 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                                                        <h1 className="text-lg lg:text-xl xl:text-2xl font-black leading-tight mb-5 drop-shadow-sm group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                                                            {renderEmojiContent(animeTitle)}
                                                        </h1>

                                                        {/* Metadata Row */}
                                                        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-gray-600 dark:text-gray-400 mb-8">
                                                            <span className="px-3 py-1 bg-gray-200 dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 rounded-none">14+</span>
                                                            {anime?.status && <span className="uppercase text-black dark:text-gray-300 bg-white dark:bg-white/5 px-2 py-0.5 rounded-none border border-gray-200 dark:border-white/10 shadow-sm">{anime.status}</span>}
                                                            <div className="flex items-center gap-1 text-yellow-500 bg-white dark:bg-yellow-500/10 px-2 py-0.5 rounded-none border border-yellow-200 dark:border-yellow-500/20 shadow-sm">
                                                                <Star className="w-4 h-4 fill-current" />
                                                                <span className="text-black dark:text-yellow-500">{anime?.rating || 'N/A'}</span>
                                                            </div>
                                                            {genres && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span className="text-gray-500 dark:text-gray-300">{genres}</span>
                                                                </>
                                                            )}
                                                            {studioName && (
                                                                <>
                                                                    <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                    <span className="text-gray-500 dark:text-gray-300">{studioName}</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Description Section */}
                                                        <div className="mb-6 mt-2">
                                                            <p className={cn(
                                                                "text-gray-900 dark:text-gray-100 text-sm md:text-base lg:text-lg font-medium leading-relaxed drop-shadow-sm transition-all",
                                                                !showFullDescription && "line-clamp-3"
                                                            )}>
                                                                {renderEmojiContent(animeDescription || 'No description available.')}
                                                            </p>
                                                            {animeDescription && animeDescription.length > 200 && (
                                                                <button
                                                                    onClick={() => setShowFullDescription(p => !p)}
                                                                    className="mt-1 text-xs font-black text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors uppercase tracking-widest"
                                                                >
                                                                    {showFullDescription
                                                                        ? (lang === 'ar' ? '▲ عرض أقل' : '▲ Show Less')
                                                                        : (lang === 'ar' ? '▼ عرض المزيد' : '▼ Show More')}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Actions Buttons */}
                                                        <div className="flex flex-wrap items-center gap-3 mt-auto min-h-[48px]">
                                                            {isInitialButtonLoading ? (
                                                                <div className="px-8 py-2.5 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/10">
                                                                    <CentralSpinner size="small" />
                                                                </div>
                                                            ) : firstEpisodeId ? (
                                                                <Link
                                                                    to={`/${lang}/watch/${anime?.id}/${firstEpisodeId.episode_number}/${slugify(animeTitle)}`}
                                                                    className="flex items-center gap-2 px-6 py-3 text-sm bg-white dark:bg-white text-black dark:text-black font-black uppercase tracking-widest transition-all hover:-translate-y-1 hover:shadow-xl rounded-full shadow-md animate-in fade-in zoom-in duration-500"
                                                                >
                                                                    <Play className="w-5 h-5 fill-current" />
                                                                    {lang === 'ar' ? `ابدأ المشاهدة` : `Start Watching`}
                                                                </Link>
                                                            ) : (
                                                                <button disabled className="flex items-center gap-2 px-6 py-3 text-sm bg-gray-100 dark:bg-gray-100 text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest cursor-not-allowed rounded-full border border-gray-200 dark:border-gray-200">
                                                                    {lang === 'ar' ? 'قريبا' : 'Coming Soon'}
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={handleWatchLaterToggle}
                                                                disabled={isWatchLaterLoading}
                                                                className={cn(
                                                                    "flex items-center justify-center p-3 rounded-full transition-all duration-300 shadow-sm border group",
                                                                    isSaved(Number(anime?.id), null)
                                                                        ? "bg-black border-black text-white dark:bg-black dark:border-black dark:text-white"
                                                                        : "bg-white border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 hover:shadow-sm"
                                                                )}
                                                                title={lang === 'ar' ? 'أضف لقائمة المشاهدة' : 'Watch Later'}
                                                            >
                                                                {isWatchLaterLoading ? (
                                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                                ) : isSaved(Number(anime?.id), null) ? (
                                                                    <BookmarkCheck className="w-5 h-5 fill-current" />
                                                                ) : (
                                                                    <Bookmark className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => setIsShareModalOpen(true)}
                                                                className="flex items-center justify-center p-3 rounded-full bg-white border border-gray-200 text-black dark:bg-white dark:border-gray-200 dark:text-black hover:bg-white dark:hover:bg-gray-50 transition-all shadow-sm group"
                                                            >
                                                                <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                
                                            </div>

                                            
                                            {/* TABS SECTION (Shared) */}
                                            <div className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-4 md:mt-2 mb-8">
                                                <div className="flex justify-center md:justify-start gap-4 border-b border-gray-100 dark:border-[#2a2a2a] pb-2">
                                                    {[
                                                        { id: 'seasons', label: lang === 'ar' ? 'المواسم' : 'Seasons', icon: <Library className="w-5 h-5" />, count: seasonsCount },
                                                        { id: 'comments', label: lang === 'ar' ? 'التعليقات' : 'Comments', icon: <MessageCircle className="w-5 h-5" />, count: commentsCount },
                                                    ].map((tab) => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id as any)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-6 py-3 rounded-t-xl font-black uppercase tracking-widest transition-all relative",
                                                                activeTab === tab.id
                                                                    ? "text-black dark:text-white"
                                                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            {tab.icon}
                                                            <span className="text-lg md:text-xl">{tab.label}</span>
                                                            {tab.count > 0 && (
                                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-black ml-1", activeTab === tab.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-200 text-gray-700 dark:bg-[#333] dark:text-gray-300")}>
                                                                    {tab.count}
                                                                </span>
                                                            )}
                                                            {activeTab === tab.id && (
                                                                <motion.div
                                                                    layoutId="activeTabIndicator"
                                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white rounded-t-full translate-y-2"
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {activeTab && (
                                                        <motion.div
                                                            key={activeTab}
                                                            initial={{ opacity: 0, y: 6 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -6 }}
                                                            className="mt-1 pt-1 min-h-[200px]"
                                                        >
                                                            {activeTab === 'seasons' && (
                                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
                                                                    {isLoadingCollections ? (
    <div className="flex justify-center py-20"><span className="ep-loader scale-75" /></div>
) : animeCollections && animeCollections.length > 0 ? (
                                                                        <div className="flex flex-col gap-10">
                                                                            {animeCollections.map((col: any) => (
                                                                                <div key={col.id || col.ID} className="space-y-6">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="h-6 w-1.5 bg-black dark:bg-white rounded-full"></div>
                                                                                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                                            {lang === 'ar' ? col.title_ar : col.title_en}
                                                                                        </h3>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-4">
                                                                                        {col.animes?.map((relatedAnime: any) => (
                                                                                            <SeasonListItem 
                                                                                                key={relatedAnime.id}
                                                                                                anime={relatedAnime}
                                                                                                lang={lang}
                                                                                                currentId={Number(id)}
                                                                                            />
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-20 bg-gray-50/50 dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-[#2a2a2a]">
                                                                            <Library className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4 opacity-50" />
                                                                            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">
                                                                                {lang === 'ar' ? 'لا توجد مواسم مرتبطة حالياً' : 'No related seasons found'}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {activeTab === 'comments' && (
                                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                    <CommentsSection 
                                                                        itemId={Number(anime.id)} 
                                                                        type="anime" 
                                                                        inputPosition="top"
                                                                        onCountChange={setCommentsCount}
                                                                    />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}
                                            <div className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 py-12 w-full">
                                                {/* Header Section matching Browse Style */}
                                                <div className="flex flex-col gap-6 mb-8">
                                                    <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">
                                                        {/* Controls */}
                                                        <div className="flex items-center gap-6 text-base font-bold">
                                                            <button className="flex items-center gap-2 text-black dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                                                <Filter className="w-5 h-5 stroke-[2.5px]" />
                                                                <span className="font-black">{lang === 'ar' ? 'فلتر' : 'Filter'}</span>
                                                            </button>
                                                            <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                                                <ArrowUpDown className="w-5 h-5 stroke-[2.5px]" />
                                                                <span className="font-black">{lang === 'ar' ? 'ترتيب' : 'Sort'}</span>
                                                            </button>
                                                        </div>

                                                        {/* Search Bar - Full width on mobile */}
                                                        <div className="w-full md:w-80 relative group">
                                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder={lang === 'ar' ? 'بحث عن حلقة...' : 'Search episodes...'}
                                                                className="w-full pl-12 pr-6 py-3 bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-white/5 rounded-full text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 transition-all"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-10">
                                                    {filteredEpisodes.length > 0 ? (
                                                        <>
                                                            {filteredEpisodes.map((episode: any) => (
                                                                <div key={episode.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                    <EpisodeListItem
                                                                        episode={episode}
                                                                        lang={lang}
                                                                        animeTitle={animeTitle}
                                                                        animeId={Number(anime.id)}
                                                                    />
                                                                </div>
                                                            ))}

                                                            {(hasNextPage || isFetchingNextPage) && (
                                                                <div className="flex flex-col justify-center items-center mt-10 py-10 gap-4">
                                                                    <style>{`
                                                                        @keyframes ep-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
                                                                        @keyframes ep-spinBack { 0%{transform:rotate(0deg)} 100%{transform:rotate(-360deg)} }
                                                                        .ep-loader { width:64px;height:64px;border-radius:50%;display:inline-block;position:relative;border:4px solid;border-color:#888 #888 transparent transparent;box-sizing:border-box;animation:ep-spin 1s linear infinite; }
                                                                        .ep-loader::after,.ep-loader::before { content:'';box-sizing:border-box;position:absolute;left:0;right:0;top:0;bottom:0;margin:auto;border:4px solid;border-radius:50%; }
                                                                        .ep-loader::after { border-color:transparent transparent #FF3D00 #FF3D00;width:50px;height:50px;animation:ep-spinBack 0.6s linear infinite; }
                                                                        .ep-loader::before { border-color:#888 #888 transparent transparent;width:36px;height:36px;animation:ep-spin 1.2s linear infinite; }
                                                                    `}</style>
                                                                    <span className="ep-loader" />
                                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest animate-pulse">
                                                                        {lang === 'ar' ? 'جاري تحميل المزيد...' : 'Loading More...'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div ref={loadMoreRef} className="h-4 w-full" />
                                                        </>
                                                    ) : (
                                                        <div className="py-20 text-center">
                                                            <p className="text-gray-500">
                                                                {lang === 'ar' ? 'لا توجد حلقات مطابقة.' : 'No episodes found.'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Episodes Sidebar - Desktop Only - Sticky */}
                            <div className="hidden md:block w-[340px] flex-shrink-0 sticky top-[20px] h-[calc(100vh-20px)] -mt-4 md:-mt-10 overflow-y-auto custom-scrollbar bg-transparent z-30 px-2 pt-0 pb-4 border-l border-gray-100 dark:border-[#2a2a2a] rtl:border-l-0 rtl:border-r">
                                <div className="flex items-center justify-between px-2 pb-2 mb-2">
                                    <h3 className="font-black text-gray-900 dark:text-gray-400 text-base md:text-lg">
                                        {lang === 'ar' ? 'حلقات الأنمي' : 'Anime Episodes'}
                                    </h3>
                                    <button
                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-black dark:text-white transition-colors flex items-center gap-1.5"
                                        title={lang === 'ar' ? 'بحث وفلترة' : 'Search & Filter'}
                                    >
                                        <span className="text-xs font-black hidden sm:inline uppercase tracking-tighter">
                                            {lang === 'ar' ? 'فلترة' : 'Filter'}
                                        </span>
                                        <Filter className="w-4 h-4 stroke-[3px] text-gray-900 dark:text-gray-100" />
                                    </button>
                                </div>
                                <div className="border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] shadow-sm">
                                    {episodesList.length > 0 ? (
                                        <>
                                            {episodesList.map((ep: any) => {
                                                const epItemTitle = lang === 'ar' ? (ep.title || `الحلقة ${ep.episode_number}`) : (ep.title_en || `Episode ${ep.episode_number}`);
                                                const epUrl = `/${lang}/watch/${anime?.id || ep.anime_id}/${ep.episode_number}/${slugify(lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title))}`;

                                                return (
                                                    <div
                                                        key={ep.id}
                                                        className="group flex items-center gap-0 px-2 py-1.5 border-b border-gray-50 dark:border-white/5 last:border-0 transition-all hover:bg-white dark:hover:bg-[#222] hover:shadow-sm"
                                                    >
                                                        <Link
                                                            to={epUrl}
                                                            className="flex-1 flex items-center min-w-0"
                                                        >
                                                            {/* Left: Indicator */}
                                                            <div className="w-10 flex-shrink-0 text-sm font-black text-center text-gray-900 dark:text-gray-100">
                                                                #{ep.episode_number}
                                                            </div>

                                                            {/* Center: Title */}
                                                            <div className="flex-1 min-w-0 px-2">
                                                                <h4 className="text-[13px] font-medium truncate text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                                    {epItemTitle}
                                                                </h4>
                                                            </div>
                                                        </Link>

                                                        {/* Right: Actions or Duration */}
                                                        <div className="flex-shrink-0 flex items-center min-w-[70px] justify-end">
                                                            {/* Default: Duration - Hidden on hover */}
                                                            <span className="text-[11px] text-gray-400 group-hover:hidden">
                                                                {ep.duration ? `${ep.duration}m` : '24m'}
                                                            </span>

                                                            {/* Hover Actions - Visible only on hover */}
                                                            <div className="hidden group-hover:flex items-center gap-0.5">
                                                                <WatchLaterButton
                                                                    animeId={Number(anime?.id)}
                                                                    episodeId={Number(ep.id)}
                                                                    episodeTitle={epItemTitle}
                                                                    episodeNumber={ep.episode_number}
                                                                    episodeImage={getImageUrl(ep.thumbnail || ep.banner || anime?.cover)}
                                                                    variant="default"
                                                                    className="p-1 h-7 w-7 rounded-sm hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-0 border-transparent hover:border-gray-100 dark:hover:border-transparent transition-all shadow-sm"
                                                                    showLabel={false}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setIsShareModalOpen(true);
                                                                    }}
                                                                    className="p-1 h-7 w-7 rounded-sm hover:bg-white dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-all border border-transparent hover:border-gray-100 dark:hover:border-transparent shadow-sm"
                                                                    title={lang === 'ar' ? 'مشاركة' : 'Share'}
                                                                >
                                                                    <Share2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <AnimatePresence>
                                            {(isFetchingNextPage || hasNextPage) && (
                                                <div className="py-8 flex flex-col items-center justify-center gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/20 dark:bg-white/5">
                                                    <CentralSpinner size="small" className="min-h-0 !w-auto !h-auto scale-75" color="#FF3D00" />
                                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">
                                                        {lang === 'ar' ? 'جاري الجلب' : 'Fetching'}
                                                    </span>
                                                </div>
                                            )}
                                            </AnimatePresence>
                                            <div ref={loadMoreRef} className="h-2 w-full" />
                                        </>
                                    ) : (
                                        <p className="text-center text-gray-500 py-6 text-sm">
                                            {lang === 'ar' ? 'لا توجد حلقات مطابقة.' : 'No episodes found.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <AnimeShareModal
                anime={anime}
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />
            {!isLoading && <Footer />}
        </div>
    );
}

// ─── Reaction helpers ────────────────────────────────────────────────────────
const REACTION_EMOJIS_D: Record<string, string> = {
    like:      '/uploads/تفاعل البوست/أعجبني.png',
    love:      '/uploads/تفاعل البوست/أحببتة.png',
    haha:      '/uploads/تفاعل البوست/اضحكني.png',
    wow:       '/uploads/تفاعل البوست/واوو.png',
    sad:       '/uploads/تفاعل البوست/أحزنني.gif',
    angry:     '/uploads/تفاعل البوست/أغضبني.gif',
    super_sad: '/uploads/تفاعل البوست/أحززنني جدا.png',
};
const REACTION_KEYS_D = [
    { key: 'like', col: 'likes_count' },
    { key: 'love', col: 'loves_count' },
    { key: 'haha', col: 'hahas_count' },
    { key: 'wow',  col: 'wows_count' },
    { key: 'sad',  col: 'sads_count' },
    { key: 'angry', col: 'angrys_count' },
    { key: 'super_sad', col: 'super_sads_count' },
];
function getTopReactionsD(item: any, maxShown = 3) {
    return REACTION_KEYS_D
        .map(({ key, col }) => ({ key, count: Number(item[col] || 0) }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, maxShown);
}
function fmtCountD(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function EpisodeListItem({ episode, lang, animeTitle, animeId }: { episode: any; lang: string; animeTitle: string; animeId: number }) {
    const isRtl = lang === 'ar';
    const title = isRtl ? (episode.title || `حلقة ${episode.episode_number}`) : (episode.title_en || `Episode ${episode.episode_number}`);
    const description = isRtl
        ? (episode.description || 'لا يوجد وصف متاح للا هذه الحلقة.')
        : (episode.description_en || 'No description available for this episode.');
    const image = episode.thumbnail || episode.banner;
    const topReactions = getTopReactionsD(episode);

    return (
        <div className="group relative">
            <Link
                to={`/${lang}/watch/${episode.anime_id}/${episode.episode_number}/${slugify(animeTitle)}`}
                className="flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-200 relative z-10 p-0 md:p-2 border border-transparent hover:border-gray-100 dark:hover:border-transparent hover:shadow-md rounded-lg"
            >
                {/* Image Section — rounded, clear image, thumbnail popup on hover (Desktop Only) */}
                <div className="w-[140px] md:w-[260px] h-[80px] md:h-[145px] flex-shrink-0 relative overflow-hidden shadow-sm rounded-xl">
                    <SpinnerImage
                        src={getImageUrl(image)}
                        alt={title}
                        className="w-full h-full"
                        imageClassName="object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        customSpinner={
                            <div className="scale-75 opacity-90">
                                <CentralSpinner size="small" className="min-h-0 w-full" color="#22c55e" />
                            </div>
                        }
                    />
                    {/* Hover overlay with play button */}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                        </div>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 uppercase">
                        {isRtl ? 'حلقة' : 'EP'} {episode.episode_number}
                    </div>

                    {/* Thumbnail popup on hover — hidden on mobile */}
                    {episode.thumbnail && (
                        <div className="hidden md:block absolute -top-[100px] left-0 right-0 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="mx-auto w-full rounded-xl overflow-hidden shadow-2xl border border-white/10 aspect-video">
                                <SpinnerImage
                                    src={getImageUrl(episode.thumbnail)}
                                    alt={title}
                                    className="w-full h-full"
                                    imageClassName="object-cover"
                                    loading="lazy"
                                    customSpinner={
                                        <div className="scale-75 opacity-90">
                                            <CentralSpinner size="small" className="min-h-0 w-full" color="#22c55e" />
                                        </div>
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Content Section */}
                <div className={`flex-1 flex flex-col items-start py-0 md:py-2 ${isRtl ? 'text-right' : 'text-left'} w-full min-w-0`}>
                    <h3 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-2">
                        {title}
                    </h3>
                    <div className="hidden md:block w-full">
                        <p className="text-[12.5px] md:text-base text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 md:line-clamp-3 mb-1 md:mb-2 font-normal">
                            {description}
                        </p>
                    </div>

                    {/* Reactions row */}
                    {topReactions.length > 0 && (
                        <div className="flex items-center gap-2 mb-1">
                            {topReactions.map(r => (
                                <div key={r.key} className="flex items-center gap-0.5">
                                    <img
                                        src={getImageUrl(REACTION_EMOJIS_D[r.key])}
                                        alt={r.key}
                                        className="w-5 h-5 object-contain"
                                        loading="lazy"
                                    />
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                        {fmtCountD(r.count)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-auto flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-6 w-full pt-1">
                        <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
                            {isRtl ? `الحلقة ${episode.episode_number}` : `Episode ${episode.episode_number}`}
                        </p>

                        <div className="hidden md:flex items-center gap-6">
                            <span className="text-[10px] md:text-sm font-black text-black dark:text-white uppercase tracking-tighter">
                                {isRtl ? 'مشاهدة الآن' : 'Watch Now'}
                            </span>
                            {episode.rating && (
                                <div className="flex items-center gap-1.5 text-[10px] md:text-sm text-gray-500 font-bold">
                                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                                    <span>{episode.rating}</span>
                                </div>
                            )}
                            <div className={`hidden md:block flex-1 ${isRtl ? 'text-left' : 'text-right'}`}>
                                <span className="text-xs text-gray-400 font-mono">
                                    {episode.duration ? `${episode.duration} MIN` : '24 MIN'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Mobile Watch Later Button — Floating in the corner of the card area or next to content */}
            <div className={`md:hidden absolute bottom-1.5 ${isRtl ? 'left-1.5' : 'right-1.5'} z-30 scale-90 origin-bottom`}>
                <WatchLaterButton 
                    animeId={animeId} 
                    episodeId={Number(episode.id)}
                    className="p-2 bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-full shadow-lg border border-gray-100 dark:border-white/10"
                />
            </div>
        </div>
    );
}


function SeasonListItem({ anime, lang, currentId }: { anime: any; lang: string; currentId: number }) {
    const isRtl = lang === 'ar';
    const isCurrent = Number(anime.id) === currentId;
    const title = isRtl ? anime.title : (anime.title_en || anime.title);
    const description = isRtl
        ? (anime.description || anime.description_en || 'لا يوجد وصف متاح لهذا الأنمي.')
        : (anime.description_en || anime.description || 'No description available for this anime.');
    const image = anime.image || anime.cover;

    return (
        <Link
            to={isCurrent ? "#" : `/${lang}/animes/${anime.id}/${slugify(title)}`}
            className={cn(
                "group relative flex flex-row gap-4 md:gap-8 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-300 p-2 md:p-4 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-white/5 hover:shadow-2xl overflow-hidden",
                isCurrent && "border-primary/30 bg-primary/5 dark:bg-primary/5 pointer-events-none"
            )}
        >
            {/* Image Section */}
            <div className="w-[100px] md:w-[180px] aspect-[2/3] flex-shrink-0 relative overflow-hidden shadow-2xl rounded-xl">
                <SpinnerImage
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-full"
                    imageClassName="object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {isCurrent && (
                    <div className="absolute top-2 left-2 right-2 flex justify-center">
                        <div className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-tighter animate-pulse">
                            {isRtl ? 'الموسم الحالي' : 'Current Season'}
                        </div>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className={`flex-1 flex flex-col justify-center ${isRtl ? 'text-right' : 'text-left'} py-2`}>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <h3 className={cn(
                        "text-lg md:text-2xl font-black transition-colors leading-tight font-cairo",
                        isCurrent ? "text-primary" : "text-gray-900 dark:text-white group-hover:text-primary"
                    )}>
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">{anime.type}</span>
                        <span>•</span>
                        <span className="text-primary">{anime.status}</span>
                        {anime.rating && (
                            <>
                                <span>•</span>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{anime.rating}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-4">
                    {description}
                </p>

                <div className="mt-auto flex items-center gap-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        {isRtl ? 'عرض التفاصيل' : 'View Details'}
                        <ChevronLeft className={`w-4 h-4 ${isRtl ? '' : 'rotate-180'}`} />
                    </span>
                </div>
            </div>
        </Link>
    );
}
