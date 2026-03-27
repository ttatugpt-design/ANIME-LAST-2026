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


// Hero Skeleton replaced by CrunchyrollSkeleton full-screen variant

export default function AnimeDetailsPage() {
    const { id, slug: currentSlug } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language; // 'ar' or 'en'

    // State
    const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Hover state management for episodes
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

    // Fetch Anime Data
    const { data: anime, isLoading: isQueryLoading, error } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    // Fetch Episodes separately as fallback (if not included in anime details)
    const { data: episodesData } = useQuery({
        queryKey: ["episodes", anime?.id],
        queryFn: async () => {
            // Try standard filtering patterns
            const response = await api.get(`/episodes`, { params: { anime_id: anime?.id } });
            return response.data;
        },
        enabled: !!anime?.id, // Only fetch if anime is loaded and episodes not present
    });

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

    const isLoading = isQueryLoading;

    // Combine episodes from anime object or separate fetch and strictly filter
    const episodesList = useMemo(() => {
        const list = anime?.episodes || episodesData || [];
        if (!anime?.id) return list;
        return list.filter((ep: any) => Number(ep.anime_id) === Number(anime.id));
    }, [anime, episodesData]);

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
        if (!episodesList) return [];
        let filtered = episodesList;

        if (selectedNumber !== null) {
            filtered = filtered.filter((ep: any) =>
                ep.episode_number?.toString().startsWith(selectedNumber)
            );
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((ep: any) =>
                (ep.title && ep.title.toLowerCase().includes(query)) ||
                (ep.episode_number && ep.episode_number.toString().includes(query))
            );
        }
        return filtered;
    }, [episodesList, searchQuery, selectedNumber]);


    // Pagination / Load More
    const [visibleCount, setVisibleCount] = useState(8);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const handleShowMore = () => {
        setIsLoadingMore(true);
        // Simulate network request
        setTimeout(() => {
            setVisibleCount(prev => prev + 12);
            setIsLoadingMore(false);
        }, 800);
    };

    const displayedEpisodes = useMemo(() => {
        return filteredEpisodes.slice(0, visibleCount);
    }, [filteredEpisodes, visibleCount]);

    const handleWatchLaterToggle = async () => {
        if (!isAuthenticated) {
            toast.error(lang === 'ar' ? 'يرجى تسجيل الدخول أولاً' : 'Please login first');
            return;
        }

        setIsWatchLaterLoading(true);
        const added = await toggleItem(Number(anime?.id), null);
        setIsWatchLaterLoading(false);

        if (added) {
            toast.success(lang === 'ar' ? 'تمت الإضافة إلى القائمة!' : 'Added to Watch Later!');
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
                "name": animeTitle,
                "item": canonicalUrl
            }
        ]
    };

    // JSON-LD Schema for TVSeries or Movie
    const schemaData = anime ? {
        "@context": "https://schema.org",
        "@type": anime.type === 'MOVIE' ? "Movie" : "TVSeries",
        "name": animeTitle,
        "description": animeDescription,
        "image": animeImage,
        "genre": anime?.categories?.map((c: any) => lang === 'ar' ? c.title : c.title_en).filter(Boolean) || [],
        "startDate": anime.release_date,
        "productionCompany": {
            "@type": "Organization",
            "name": studioName
        },
        "status": anime.status,
        "numberOfEpisodes": String(episodesList?.length || 0),
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": anime.rating || "0",
            "bestRating": "10",
            "worstRating": "1",
            "ratingCount": anime.rating_count || "100"
        }
    } : null;

    // Safe Date for SEO
    const safeIsoDate = (dateStr: any) => {
        if (!dateStr) return null;
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? null : d.toISOString();
        } catch (e) {
            return null;
        }
    };

    const isoDate = safeIsoDate(anime?.release_date);

    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f0f2f5] dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet htmlAttributes={{ lang: lang }}>
                {/* 5. Prevent problems/Duplicate: Noindex on error or empty data */}
                {(!anime && !isLoading) || error ? (
                    <meta name="robots" content="noindex, nofollow" />
                ) : (
                    <meta name="robots" content="index, follow" />
                )}

                {/* 1. Helmet SEO tags */}
                <title>{pageTitle}</title>
                <meta name="title" content={pageTitle} />
                <meta name="description" content={animeDescription?.slice(0, 160)} />
                <meta name="keywords" content={keywords} />
                <meta name="author" content="AnimeLast" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={canonicalUrl} />
                <meta name="theme-color" content="#000000" />

                {/* Open Graph */}
                <meta property="og:type" content={anime?.type === 'MOVIE' ? 'video.movie' : 'video.tv_show'} />
                <meta property="og:site_name" content="AnimeLast" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={animeDescription?.slice(0, 160)} />
                <meta property="og:image" content={animeImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:locale" content={lang === 'ar' ? 'ar_AR' : 'en_US'} />
                <meta property="og:locale:alternate" content={lang === 'ar' ? 'en_US' : 'ar_AR'} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={animeDescription?.slice(0, 160)} />
                <meta name="twitter:image" content={animeImage} />

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

            {/* NewsTicker wrapper with min-height to prevent layout jump */}
            <div className="min-h-[45px]">
                <NewsTicker />
            </div>

            {/* Main Layout - Sync with BrowsePage */}
            <div className="w-full min-h-screen">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible min-h-screen">
                    {/* Left Sidebar - narrower width */}
                    <div className="hidden lg:block lg:col-span-2 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Content Area */}
                    <div className="col-span-1 lg:col-span-10">
                        <div className="flex flex-col min-h-screen">
                            {/* Hero & Search Section */}
                            {isLoading ? (
                                <div className="w-full">
                                    <CrunchyrollSkeleton variant="full-screen" />
                                </div>
                            ) : error || !anime ? (
                                <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                                    <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على الأنمي' : 'Oops, Anime Not Found'}</h1>
                                    <Link to="/animes" className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-all font-bold">
                                        {lang === 'ar' ? 'العودة لتصفح الأنمي' : 'Back to Browse'}
                                    </Link>
                                </div>
                            ) : (
                                <div className="animate-fade-in w-full">
                                    {/* HERO SECTION - Reduced Height */}
                                    <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden group">
                                        {/* Background Image */}
                                        <div className="absolute inset-0">
                                            {backgroundUrl && (
                                                <SpinnerImage
                                                    src={backgroundUrl}
                                                    alt={animeTitle}
                                                    className="w-full h-full"
                                                    imageClassName="object-cover object-top"
                                                    spinnerClassName="w-16 h-16 border-4"
                                                    loading="lazy"
                                                />
                                            )}
                                            {/* Gradient Overlay */}
                                            <div className={`absolute inset-0 bg-gradient-to-${lang === 'ar' ? 'r' : 'l'} from-transparent via-black/40 to-black/90`}></div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                        </div>

                                        {/* Content Container */}
                                        <div className={`absolute inset-0 flex items-center ${lang === 'ar' ? 'pr-8 md:pr-16 lg:pr-24 pl-8' : 'pl-8 md:pl-16 lg:pl-24 pr-8'}`}>
                                            <div className={`w-full md:w-2/3 lg:w-1/2 space-y-6 ${lang === 'ar' ? 'text-right' : 'text-left'} z-10`}>

                                                {/* Title - Reduced Size */}
                                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-lg font-cairo">
                                                    {renderEmojiContent(animeTitle)}
                                                </h1>
                                                {/* Removed secondary language title display */}

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
                                                    <p className="text-gray-200 text-sm md:text-base leading-relaxed line-clamp-4 max-w-2xl drop-shadow-md">
                                                        {renderEmojiContent(animeDescription || 'No description available.')}
                                                    </p>

                                                    {/* Removed secondary description display */}
                                                </div>

                                                {/* Actions Buttons */}
                                                <div className="flex items-center gap-4 pt-4">
                                                    {firstEpisodeId ? (
                                                        <Link
                                                            to={`/${lang}/watch/${anime?.id}/${firstEpisodeId.episode_number}/${slugify(animeTitle)}`}
                                                            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-neutral-200 text-black font-bold uppercase tracking-wide transition-transform hover:scale-105 skew-x-[-10deg]"
                                                        >
                                                            <span className="skew-x-[10deg] flex items-center gap-2">
                                                                <Play className="w-5 h-5 fill-current" />
                                                                {lang === 'ar' ? `ابدأ مشاهدة الحلقة ${firstEpisodeId.episode_number}` : `Start Watching Episode ${firstEpisodeId.episode_number}`}
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
                                                            isSaved(Number(anime?.id), null)
                                                                ? "bg-black border-black text-white hover:bg-neutral-900"
                                                                : "bg-white border-white text-black hover:bg-neutral-100"
                                                        )}
                                                    >
                                                        <div className="skew-x-[10deg]">
                                                            {isWatchLaterLoading ? (
                                                                <Loader2 className={cn("w-6 h-6 animate-spin", isSaved(Number(anime?.id), null) ? "text-white" : "text-black")} />
                                                            ) : isSaved(Number(anime?.id), null) ? (
                                                                <BookmarkCheck className="w-6 h-6 fill-current" />
                                                            ) : (
                                                                <Plus className="w-6 h-6" />
                                                            )}
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => setIsShareModalOpen(true)}
                                                        className="p-4 text-white hover:text-gray-300 transition-colors"
                                                    >
                                                        <Share2 className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* EPISODES SECTION - Browse All List Design */}
                                    <div className="max-w-6xl mx-auto px-2 md:px-8 py-12 w-full">
                                        {/* Header Section matching Browse Style */}
                                        <div className="flex flex-col gap-6 mb-8">
                                            <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-4">
                                                {/* Controls */}
                                                <div className="flex items-center gap-6 text-base font-bold">
                                                    <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                                        <Filter className="w-5 h-5" />
                                                        <span>{lang === 'ar' ? 'فلتر' : 'Filter'}</span>
                                                    </button>
                                                    <button className="flex items-center gap-2 text-gray-900 dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                                        <ArrowUpDown className="w-5 h-5" />
                                                        <span>{lang === 'ar' ? 'أبجدي' : 'Alphabetical'}</span>
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
                                                {/* Page Title */}
                                                <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
                                                    {lang === 'ar' ? 'حلقات الأنمي' : 'Anime Episodes'}
                                                    <span className="text-gray-500 text-lg font-normal mx-2">({episodesList?.length || 0})</span>
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Numeric Filter Bar */}
                                        <div className="w-full border-b border-gray-200 dark:border-neutral-800 py-4 flex justify-center sticky top-[60px] z-40 bg-white/95 dark:bg-black/95 backdrop-blur-md mb-8">
                                            <div className="flex flex-wrap items-center justify-center gap-3 text-sm md:text-base font-bold text-gray-500 dark:text-gray-500">
                                                <button
                                                    onClick={() => setSelectedNumber(null)}
                                                    className={cn("hover:text-black dark:hover:text-white transition-colors", selectedNumber === null ? "text-black dark:text-white" : "")}
                                                >
                                                    #
                                                </button>
                                                {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                                    <button
                                                        key={num}
                                                        onClick={() => setSelectedNumber(num)}
                                                        className={cn("hover:text-black dark:hover:text-white transition-colors", selectedNumber === num ? "text-black dark:text-white" : "")}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Episodes List View */}
                                        <div className="flex flex-col gap-6">
                                            {filteredEpisodes.length > 0 ? (
                                                <>
                                                    {displayedEpisodes.map((episode: any, index: number) => (
                                                        <div
                                                            key={episode.id}
                                                            className="relative group"
                                                            onMouseEnter={() => handleMouseEnter(index)}
                                                            onMouseLeave={handleMouseLeave}
                                                        >
                                                            <EpisodeListItem episode={episode} lang={lang} animeTitle={animeTitle} />

                                                            {hoveredCardIndex === index && (
                                                                <div className="absolute -inset-x-2 -inset-y-1 z-20 h-auto min-h-full left-0 right-0 w-[calc(100%+16px)]">
                                                                    <AnimeListHoverCard
                                                                        data={episode}
                                                                        lang={lang}
                                                                        onMouseEnter={keepCardOpen}
                                                                        onMouseLeave={handleMouseLeave}
                                                                        className="w-full h-full"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {visibleCount < filteredEpisodes.length && (
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
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80 z-20">
                                                        <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
                                                    </div>
                                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-900 mb-4">
                                                        <Search className="w-8 h-8 text-gray-500" />
                                                    </div>
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
                </div>
            </div>

            <AnimeShareModal
                anime={anime}
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
            />
            <Footer />
        </div>
    );
}

function EpisodeListItem({ episode, lang, animeTitle }: { episode: any; lang: string; animeTitle: string }) {
    const isRtl = lang === 'ar';
    const title = isRtl ? (episode.title || `حلقة ${episode.episode_number}`) : (episode.title_en || `Episode ${episode.episode_number}`);
    const description = isRtl
        ? (episode.description || 'لا يوجد وصف متاح للا هذه الحلقة.')
        : (episode.description_en || 'No description available for this episode.');
    const image = episode.thumbnail || episode.banner;

    return (
        <Link
            to={`/${lang}/watch/${episode.anime_id}/${episode.episode_number}/${slugify(animeTitle)}`}
            className="group flex flex-row gap-3 md:gap-6 bg-transparent hover:bg-gray-100 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10 p-0 md:p-2"
        >
            {/* Image Section */}
            <div className="w-[140px] md:w-[260px] h-[80px] md:h-[145px] flex-shrink-0 relative overflow-hidden shadow-sm">
                <img
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity fill-current translate-y-2 group-hover:translate-y-0 duration-300" />
                </div>
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 uppercase">
                    {isRtl ? 'حلقة' : 'EP'} {episode.episode_number}
                </div>
            </div>

            {/* Content Section */}
            <div className={`flex-1 flex flex-col items-start py-0 md:py-2 ${isRtl ? 'text-right' : 'text-left'} w-full min-w-0`}>
                <h3 className="text-sm md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-3 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors leading-tight line-clamp-2">
                    {title}
                </h3>
                <p className="text-[12.5px] md:text-base text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2 md:line-clamp-3 mb-1 md:mb-2 font-normal">
                    {description}
                </p>
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
    );
}
