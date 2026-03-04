import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
    Play, Plus, Share2, Flag, Download, MessageSquare,
    Globe, Clock, Eye, ChevronUp, ChevronLeft, Star, Filter, Library,
    ThumbsUp, ThumbsDown, MoreVertical, X, Check, Copy, Link as LinkIcon,
    Maximize2, Minimize2, Loader2
} from "lucide-react";
import { toast } from 'sonner';
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { renderEmojiContent } from "@/utils/render-content";
import { slugify } from "@/utils/slug";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import AnimeHoverCard from "@/components/AnimeHoverCard";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import EpisodesModal from '@/components/EpisodesModal';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { WatchLaterButton } from '@/components/common/WatchLaterButton'; // Import Button
import { EpisodeInfoMenu } from '@/components/episodes/EpisodeInfoMenu';
import { ReportModal } from '@/components/episodes/ReportModal';
import Footer from '@/components/common/Footer';

import { ShareModal } from '@/components/episodes/ShareModal';
import { MobileCommentsModal } from '@/components/comments/MobileCommentsModal';
import { trackEpisodeView, toggleEpisodeReaction, getEpisodeStats, EpisodeStats } from '@/lib/episode-stats-api';

// Helper for image URLs
const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

// Helper for relative time display
const getRelativeTime = (dateString: string, lang: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (lang === 'ar') {
        if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) return 'منذ يوم واحد';
        if (diffDays === 2) return 'منذ يومين';
        if (diffDays < 30) return `منذ ${diffDays} يوم`;
        if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
        return `منذ ${Math.floor(diffDays / 365)} سنة`;
    } else {
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
};

export default function WatchPage() {
    const { id, episodeNum, slug: currentSlug } = useParams(); // URL params: /watch/:id/:episodeNum/:slug?
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language;

    // Force scroll to top on mount and param change — robust fix
    useEffect(() => {
        // Skip auto-scroll if we are deep-linking to a comment
        const params = new URLSearchParams(window.location.search);
        if (params.has('commentId') || params.has('parentId')) return;

        // 1. Disable browser's automatic scroll restoration
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // 2. Immediate scroll
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

        // 3. After paint (catches late layout shifts)
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        });

        // 4. Delayed fallback (catches async content that shifts layout)
        const t1 = setTimeout(() => window.scrollTo(0, 0), 100);
        const t2 = setTimeout(() => window.scrollTo(0, 0), 300);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, [id, episodeNum]);

    // State
    const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');
    const [isLoadingDelay, setIsLoadingDelay] = useState(true);
    const [selectedServer, setSelectedServer] = useState<number>(0);
    const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
    const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEpisodeInfoOpen, setIsEpisodeInfoOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const activeEpisodeRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Mobile Expansion State
    const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Episode Stats State
    const [stats, setStats] = useState<EpisodeStats | null>(null);
    const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
    const [isAnimating, setIsAnimating] = useState<'like' | 'dislike' | null>(null);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);

    // Simulate initial loading delay for smooth transition (matching AnimeDetailsPage)
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingDelay(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint is usually where sidebar moves
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Hover State
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isPlaying, setIsPlaying] = useState(false); // State for video player overlay

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

    // Fetch Anime Data (includes episodes) using id
    const { data: anime, isLoading: isQueryLoading } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });



    // Fetch current episode
    const { data: episodeData, isLoading: episodeLoading, error: episodeError } = useQuery({
        queryKey: ['episode', anime?.id, episodeNum],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${anime.id}&episode_number=${episodeNum}`);
            const episodes = response.data;

            console.log('📦 API Response:', episodes);
            console.log('🔍 Looking for episode_number:', Number(episodeNum));

            const foundEpisode = episodes.find((ep: any) => ep.episode_number === Number(episodeNum)) || null;

            console.log('✅ Found Episode:', foundEpisode);
            if (foundEpisode) {
                console.log('📌 Episode ID:', foundEpisode.id, 'Episode Number:', foundEpisode.episode_number);
            }

            return foundEpisode;
        },
        enabled: !!anime?.id && !!episodeNum,
    });

    // Redirection logic for SEO slugs
    useEffect(() => {
        if (anime && id && episodeNum) {
            const animeTitle = lang === 'ar' ? anime.title : (anime.title_en || anime.title);
            const expectedSlug = slugify(animeTitle);

            if (currentSlug !== expectedSlug) {
                // Preserve search params and hash during redirect
                const search = window.location.search;
                const hash = window.location.hash;
                navigate(`/${lang}/watch/${id}/${episodeNum}/${expectedSlug}${search}${hash}`, { replace: true });
            }
        }
    }, [id, episodeNum, anime, currentSlug, lang, navigate]);

    // Track Episode View (once per anime+episode combination)
    const trackedEpisodeRef = useRef<string | null>(null);
    useEffect(() => {
        if (episodeData?.id && anime?.id) {
            // CRITICAL: Always use anime.id as source of truth
            const actualAnimeId = Number(anime.id);

            console.log('Episode tracking data:', {
                episodeId: episodeData.id,
                episodeNumber: episodeData.episode_number,
                episodeAnimeId: episodeData.anime_id,
                urlAnimeId: Number(anime.id),
                finalAnimeId: actualAnimeId,
                episodeThumbnail: episodeData.thumbnail
            });

            const trackingKey = `${actualAnimeId}-${episodeData.id}`;
            if (trackedEpisodeRef.current !== trackingKey) {
                trackedEpisodeRef.current = trackingKey;

                console.log('🔴 Sending to backend:', {
                    episode_id: episodeData.id,
                    anime_id: actualAnimeId,
                    image: episodeData.thumbnail || episodeData.banner || ''
                });

                // Track in backend history using the ACTUAL anime_id
                api.post('/history/track-episode', {
                    episode_id: episodeData.id, // This is the REAL database ID
                    anime_id: actualAnimeId,
                    image: episodeData.thumbnail || episodeData.banner || '' // Send episode image
                }).catch(err => console.error('Failed to track episode view:', err));

                // Track view count for the new stats system
                trackEpisodeView(episodeData.id);

                // Fetch episode stats
                getEpisodeStats(episodeData.id).then(data => {
                    setStats(data);
                    setUserReaction(data.user_reaction || null);
                }).catch(err => console.error('Failed to fetch episode stats:', err));
            }
        }
    }, [episodeData?.id, episodeData?.anime_id, anime?.id]);

    // Fetch Episodes Data (Fallback if not in anime object)
    const { data: episodesData, isLoading: isEpisodesLoading } = useQuery({
        queryKey: ["episodes", anime?.id],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${anime.id}`);
            return response.data;
        },
        enabled: !!anime?.id,
    });

    // Fetch Global Latest Episodes (for the bottom section)
    const { data: latestEpisodesData } = useQuery({
        queryKey: ["latestEpisodes"],
        queryFn: async () => {
            const response = await api.get('/episodes/latest?limit=12');
            return response.data;
        },
    });

    // Derived Data
    const episodesList = useMemo(() => {
        return anime?.episodes || episodesData || [];
    }, [anime, episodesData]);

    const filteredEpisodes = useMemo(() => {
        if (!anime?.id) return [];
        return episodesList.filter((ep: any) => Number(ep.anime_id) === Number(anime.id));
    }, [episodesList, anime?.id]);

    // Determine Current Episode
    const currentEpisode = useMemo(() => {
        if (!filteredEpisodes.length) return null;
        return filteredEpisodes.find((ep: any) => Number(ep.episode_number) === Number(episodeNum));
    }, [filteredEpisodes, episodeNum]);

    // Define servers and comments count (Fixes build errors)
    const servers = useMemo(() => {
        const allServers = currentEpisode?.servers || episodeData?.servers || [];
        // Filter servers based on current language
        // Assume 'sub' or 'dub' might be relevant, or language code 'ar'/'en'
        // If data doesn't have explicit 'lang' field, we might need to inspect 'type' or similar.
        // Based on request: "Display servers with language = en for english mode, ar for arabic mode"

        // Let's check available structure. Usually it's in `server.type` or `server.lang`.
        // If we look at backend, we might see. For now, assuming standard field.
        // Actually, looking at previous code, `EpisodeServer` struct likely has it.
        // If not, we might need to rely on `type` if it contains language info.

        return allServers.filter((server: any) => {
            // If distinct language field exists
            if (server.language) {
                return server.language.toLowerCase() === (lang === 'ar' ? 'ar' : 'en');
            }
            // Fallback: If no language field, maybe show all (or hide all if strict)?
            // Let's try to match by name or type if needed, but 'language' is standard.
            return true;
        });
    }, [currentEpisode, episodeData, lang]);

    // Reset selected server when language changes or filtered servers change
    useEffect(() => {
        setSelectedServer(0);
    }, [lang, servers]);

    const { data: commentsData } = useQuery({
        queryKey: ['comments', currentEpisode?.id],
        queryFn: async () => {
            if (!currentEpisode?.id) return [];
            const response = await api.get(`/episodes/${currentEpisode.id}/comments`);
            return response.data;
        },
        enabled: !!currentEpisode?.id
    });


    const handleReaction = async (type: 'like' | 'dislike') => {
        if (!currentEpisode?.id) return;

        setIsAnimating(type);
        setTimeout(() => setIsAnimating(null), 500);

        try {
            const isLike = type === 'like';
            // Optimistic update
            const oldStats = stats;
            const oldReaction = userReaction;

            // Logic to calculate optimistic stats could be complex, 
            // relying on API response is safer but slower. 
            // For now, let's just wait for API response which is safer.

            const newStats = await toggleEpisodeReaction(currentEpisode.id, isLike);
            setStats(prev => ({ ...prev, ...newStats }));
            setUserReaction(newStats.user_reaction || null);
        } catch (error) {
            console.error('Failed to toggle reaction:', error);
        }
    };

    const handleShare = (platform: string, url: string, text: string) => {
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                break;
            case 'bluesky':
                shareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(text + ' ' + url)}`;
                break;
            case 'copy':
                navigator.clipboard.writeText(url);
                break;
            default:
                return;
        }

        if (platform !== 'copy') {
            window.open(shareUrl, '_blank');
        }

        toast.custom((t) => (
            <div className="flex w-full items-start gap-3 rounded-lg bg-white dark:bg-[#1a1a1a] p-4 shadow-lg border border-gray-100 dark:border-[#333] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                    <button onClick={() => toast.dismiss(t)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    {platform === 'copy' ? <Check className="w-6 h-6 text-green-600" /> : <Share2 className="w-6 h-6 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
                        {platform === 'copy'
                            ? (lang === 'ar' ? 'تم نسخ الرابط!' : 'Link Copied!')
                            : (lang === 'ar' ? 'جاري المشاركة...' : 'Sharing...')}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {platform === 'copy'
                            ? (lang === 'ar' ? 'تم نسخ رابط الحلقة للحافظة.' : 'Episode link copied to clipboard.')
                            : (lang === 'ar' ? `يتم فتح ${platform} للمشاركة.` : `Opening ${platform} to share.`)}
                    </p>
                </div>
            </div>
        ), { position: 'top-center', duration: 3000 });
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const isLoading = isQueryLoading || episodeLoading || isLoadingDelay;

    // Derived Data
    const animeTitle = (lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title)) || "";
    const epTitle = (lang === 'ar' ? (episodeData?.title || episodeData?.title_en) : (episodeData?.title_en || episodeData?.title)) || "";
    const animeDesc = (lang === 'ar' ? (anime?.description || anime?.description_en) : (anime?.description_en || anime?.description)) || "";
    const epDesc = (lang === 'ar' ? (episodeData?.description || episodeData?.description_en) : (episodeData?.description_en || episodeData?.description)) || "";

    // Explicit requested title format with robust fallback
    // We prioritize episodeData title, ensuring we get the specific episode title if available
    const rawEpTitle = lang === 'ar' ? (episodeData?.title || currentEpisode?.title) : (episodeData?.title_en || currentEpisode?.title_en || episodeData?.title || currentEpisode?.title);

    // If the episode title is just "Episode X" or empty, we might want to keep it simple
    // But usually we want "Anime Name - Episode Title" or "Anime Name - Episode X"
    const displayEpTitle = rawEpTitle || (lang === 'ar' ? `حلقة ${episodeNum}` : `Episode ${episodeNum}`);

    const pageTitle = `${animeTitle} - ${displayEpTitle}`;
    const finalDescription = animeDesc || epDesc || (lang === 'ar' ? 'لا يوجد وصف متاح.' : 'No description available.');

    const metaImage = getImageUrl(episodeData?.thumbnail || episodeData?.banner || anime?.banner || anime?.cover || "");
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;

    const genres = anime?.categories?.map((c: any) => lang === 'ar' ? c.title : (c.title_en || c.title)).filter(Boolean).join(', ') || '';
    const studioName = anime?.studio?.name || anime?.studio_name || "";

    const keywords = [animeTitle, epTitle, genres, studioName].filter(Boolean).join(', ');

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
                "item": `${window.location.origin}/${lang}/watch/${anime?.id}`
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": epTitle || `${lang === 'ar' ? 'حلقة' : 'Ep'} ${episodeNum}`,
                "item": canonicalUrl
            }
        ]
    };

    // JSON-LD Schema for TVEpisode
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "TVEpisode",
        "name": epTitle || `${animeTitle} Episode ${episodeNum}`,
        "description": finalDescription,
        "episodeNumber": String(episodeNum),
        "image": metaImage,
        "partOfSeries": {
            "@type": "TVSeries",
            "name": animeTitle,
            "description": animeDesc,
            "genre": anime?.categories?.map((c: any) => lang === 'ar' ? c.title : (c.title_en || c.title)).filter(Boolean) || [],
            "productionCompany": {
                "@type": "Organization",
                "name": studioName
            }
        },
        "video": {
            "@type": "VideoObject",
            "name": pageTitle,
            "description": finalDescription,
            "thumbnailUrl": metaImage,
            "uploadDate": episodeData?.created_at || new Date().toISOString(),
            "duration": `PT${anime?.duration || 24}M`
        }
    };

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

    const animeReleaseDate = safeIsoDate(anime?.release_date);

    const videoUrl = servers[selectedServer]?.url || "";

    // Determine Robots status outside JSX
    const shouldIndex = !((!anime && !isQueryLoading) || !!episodeError || (!currentEpisode && !episodeData));

    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet htmlAttributes={{ lang: lang }} defer={false}>
                {/* 5. Robots: Single tag with dynamic content */}
                <meta name="robots" content={shouldIndex ? "index, follow" : "noindex, nofollow"} />

                {/* 1. Helmet SEO tags */}
                <title>{pageTitle}</title>
                <meta name="title" content={pageTitle} />
                <meta name="description" content={finalDescription.slice(0, 160)} />
                <meta name="keywords" content={keywords} />
                <meta name="author" content="AnimeLast" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="canonical" href={canonicalUrl} />
                <meta name="theme-color" content="#000000" />

                {/* Open Graph - Always render structure */}
                <meta property="og:type" content="video.episode" />
                <meta property="og:site_name" content="AnimeLast" />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={finalDescription.slice(0, 160)} />
                <meta property="og:image" content={metaImage} />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:locale" content={lang === 'ar' ? 'ar_AR' : 'en_US'} />
                <meta property="og:locale:alternate" content={lang === 'ar' ? 'en_US' : 'ar_AR'} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={finalDescription.slice(0, 160)} />
                <meta name="twitter:image" content={metaImage} />

                {/* Anime Specific Metadata */}
                <meta property="video:series" content={animeTitle} />
                <meta property="video:episode" content={String(episodeNum || '')} />
                {animeReleaseDate && <meta property="video:release_date" content={animeReleaseDate} />}
                <meta property="video:duration" content={`PT${anime?.duration || 24}M`} />
                <meta property="video:tag" content={keywords} />

                {/* 2. Structured Data (JSON-LD) */}
                <script type="application/ld+json">
                    {JSON.stringify(schemaData)}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbData)}
                </script>
            </Helmet>

            {isLoading ? (
                <div className="min-h-screen flex flex-col">
                    <CrunchyrollSkeleton variant="full-screen" className="relative top-0 w-full h-screen" />
                </div>
            ) : !!episodeError || !anime || !currentEpisode ? (
                <div className="min-h-screen flex flex-col items-center justify-center text-white p-4">
                    <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على الحلقة' : 'Oops, Episode Not Found'}</h1>
                    <Link to="/animes" className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-all font-bold">
                        {lang === 'ar' ? 'العودة لتصفح الأنمي' : 'Back to Browse'}
                    </Link>
                </div>
            ) : (
                <div className="animate-fade-in relative z-10 w-full pt-4 md:pt-8">
                    {/* Video Player - Outside container on mobile for edge-to-edge, inside on desktop */}
                    <div className="block md:hidden w-full aspect-video bg-black overflow-hidden relative mb-6">
                        <div className="w-full h-full overflow-hidden relative shadow-lg">
                            {!isPlaying ? (
                                <div
                                    className="absolute inset-0 cursor-pointer group"
                                    onClick={() => {
                                        setIsPlaying(true);
                                        setIsVideoLoading(true);
                                    }}
                                >
                                    {/* Cover Image */}
                                    <div className="absolute inset-0">
                                        <img
                                            src={getImageUrl(anime?.banner || anime?.cover)}
                                            alt={animeTitle}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        {/* Gradient Overlay - Dark Lighting Effect */}
                                        <div className={`absolute inset-0 bg-gradient-to-${lang === 'ar' ? 'r' : 'l'} from-transparent via-black/40 to-black/90`}></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
                                    </div>

                                    {/* Big Triangular Play Button */}
                                    <div className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110">
                                        <div
                                            className="w-0 h-0 border-t-[20px] border-t-transparent border-l-[35px] border-l-white border-b-[20px] border-b-transparent ml-1 drop-shadow-2xl"
                                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                                        />
                                    </div>

                                    {/* Title Overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                                        <h2 className="text-white text-lg font-bold drop-shadow-md truncate">
                                            {renderEmojiContent((lang === 'ar' ? currentEpisode?.title : currentEpisode?.title_en) || `Episode ${currentEpisode?.episode_number}`)}
                                        </h2>
                                    </div>
                                </div>
                            ) : videoUrl ? (
                                <>
                                    {isVideoLoading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                                            <div className="relative w-16 h-16">
                                                <div className="absolute inset-0 border-4 border-gray-400 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                            </div>
                                        </div>
                                    )}
                                    <iframe
                                        src={videoUrl}
                                        className="w-full h-full"
                                        allowFullScreen
                                        title="Video Player"
                                        allow="autoplay"
                                        onLoad={() => setIsVideoLoading(false)}
                                    />
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-gray-500">Video source unavailable</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-0 animate-fade-in">
                        <div className="grid items-start grid-cols-1 gap-6 lg:grid-cols-12 grid-flow-dense">
                            {/* MAIN CONTENT 1: Player Wrapper */}
                            <div className={`flex flex-col mt-0 transition-all duration-500 ease-in-out ${isTheaterMode ? 'lg:col-span-12 xl:col-span-12 w-full lg:w-[90%] mx-auto' : 'lg:col-span-7 xl:col-span-7'}`}>
                                {/* Video Player - Desktop only */}
                                <div className="hidden md:block w-full aspect-video bg-black overflow-hidden rounded-none shadow-xl mb-6 relative group">
                                    {!isPlaying ? (
                                        <div
                                            className="absolute inset-0 cursor-pointer"
                                            onClick={() => {
                                                setIsPlaying(true);
                                                setIsVideoLoading(true);
                                            }}
                                        >
                                            {/* Cover Image */}
                                            <div className="absolute inset-0">
                                                <img
                                                    src={getImageUrl(anime?.banner || anime?.cover)}
                                                    alt={animeTitle}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    loading="lazy"
                                                />
                                                {/* Gradient Overlay - Dark Lighting Effect */}
                                                <div className={`absolute inset-0 bg-gradient-to-${lang === 'ar' ? 'r' : 'l'} from-transparent via-black/20 to-black/80`}></div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                            </div>

                                            {/* Big Triangular Play Button */}
                                            <div className="absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110">
                                                <div className="w-24 h-24 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                    <div
                                                        className="w-0 h-0 border-t-[30px] border-t-transparent border-l-[50px] border-l-white border-b-[30px] border-b-transparent ml-2 drop-shadow-2xl filter"
                                                        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Episode Title Overlay (Optional enhancement) */}
                                            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                                                <h2 className="text-white text-3xl font-bold drop-shadow-md">
                                                    {epTitle}
                                                </h2>
                                            </div>
                                        </div>
                                    ) : videoUrl ? (
                                        <>
                                            {isVideoLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                                                    <div className="relative w-20 h-20">
                                                        <div className="absolute inset-0 border-4 border-gray-400 rounded-full"></div>
                                                        <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                </div>
                                            )}
                                            <iframe
                                                src={videoUrl}
                                                className="w-full h-full"
                                                allowFullScreen
                                                title="Video Player"
                                                allow="autoplay"
                                                onLoad={() => setIsVideoLoading(false)}
                                            />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <p className="text-gray-500">Video source unavailable</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                            {/* MAIN CONTENT 2: Details Wrapper (Servers, Stats, Info) */}
                            <div className="flex flex-col mt-0 lg:col-span-7 xl:col-span-7 transition-all duration-500 relative z-10">

                                {/* Servers Section - NOW FIRST, HORIZONTAL LAYOUT */}
                                <div className="flex flex-col gap-3 mb-6 px-2 md:px-0">
                                    <div className="flex items-center justify-between">

                                        {/* Theater Mode Toggle */}
                                        <button
                                            onClick={() => {
                                                if (document.startViewTransition) {
                                                    document.startViewTransition(() => {
                                                        setIsTheaterMode(!isTheaterMode);
                                                    });
                                                } else {
                                                    setIsTheaterMode(!isTheaterMode);
                                                }
                                            }}
                                            className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-bold bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#333] rounded-md transition-colors text-gray-900 dark:text-white"
                                            title={isTheaterMode ? (lang === 'ar' ? 'تصغير المشغل' : 'Exit Theater Mode') : (lang === 'ar' ? 'وضع المسرح' : 'Theater Mode')}
                                        >
                                            {isTheaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                            <span className="hidden xl:inline">{isTheaterMode ? (lang === 'ar' ? 'تصغير' : 'Minimize') : (lang === 'ar' ? 'تكبير' : 'Theater')}</span>
                                        </button>
                                    </div>

                                    {/* Horizontal Server Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        {servers.length > 0 ? (
                                            servers.map((server: any, idx: number) => (
                                                <Button
                                                    key={idx}
                                                    variant={selectedServer === idx ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setSelectedServer(idx)}
                                                    className={`h-10 px-4 ${selectedServer === idx
                                                        ? 'bg-gray-100 dark:bg-[#333] text-gray-900 dark:text-white border border-gray-200 dark:border-[#444] shadow-sm'
                                                        : 'bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-800'
                                                        } transition-all font-bold text-sm`}
                                                >
                                                    {server.name}
                                                </Button>
                                            ))
                                        ) : (
                                            <div className="p-2 text-xs text-red-400">
                                                {lang === 'ar' ? 'لا توجد سيرفرات متاحة' : 'No servers available'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Episode Details - NOW FIRST */}
                                <div className="mb-6 px-2 md:px-0">
                                    <div className="flex gap-4">
                                        {/* Anime Thumbnail - Desktop only */}
                                        <div className="hidden md:block flex-shrink-0 w-28 h-40 rounded-none overflow-hidden shadow-lg">
                                            <Link to={`/${lang}/animes/${lang === 'ar' ? (anime.slug || anime.id) : (anime.slug_en || anime.slug || anime.id)}`}>
                                                <img
                                                    src={getImageUrl(anime?.cover || anime?.banner)}
                                                    alt={anime?.title}
                                                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://placehold.co/160x200/1a1c22/FFF?text=No+Image';
                                                    }}
                                                />
                                            </Link>
                                        </div>

                                        {/* Details Content */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <h1 className="text-2xl font-bold mb-2">
                                                    {(lang === 'ar' ? currentEpisode.title : currentEpisode.title_en) || `Episode ${currentEpisode.episode_number}`}
                                                </h1>
                                                {/* Desktop Actions - Always visible on larger screens */}
                                                <div className="hidden md:flex items-center gap-3">
                                                    <WatchLaterButton
                                                        animeId={Number(anime?.id)}
                                                        episodeId={Number(currentEpisode.id)}
                                                        episodeTitle={epTitle}
                                                        episodeNumber={currentEpisode.episode_number}
                                                        episodeImage={getImageUrl(currentEpisode.thumbnail)}
                                                        variant="icon"
                                                        className="h-14 w-14 p-0 hover:bg-gray-200 dark:hover:bg-[#222] [&_svg]:w-8 [&_svg]:h-8 [&_svg]:stroke-[2.5]"
                                                        showLabel={false}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-14 w-14 rounded-full hover:bg-gray-200 dark:hover:bg-[#222] transition-colors"
                                                        onClick={() => setIsShareModalOpen(true)}
                                                    >
                                                        <Share2 className="h-8 w-8 stroke-[2.5]" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-14 w-14 rounded-full hover:bg-gray-200 dark:hover:bg-[#222] transition-colors"
                                                        onClick={() => setIsEpisodeInfoOpen(true)}
                                                    >
                                                        <MoreVertical className="h-8 w-8 stroke-[2.5]" />
                                                    </Button>
                                                </div>

                                                {/* Mobile Actions - Toggle Button & Floating Bar */}
                                                <div className="md:hidden relative">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] text-gray-900 dark:text-white"
                                                        onClick={() => setShowMobileActions(!showMobileActions)}
                                                    >
                                                        {showMobileActions ? <X className="h-6 w-6 pointer-events-none" /> : <MoreVertical className="h-6 w-6 pointer-events-none" />}
                                                    </Button>

                                                    {/* Floating Actions Bar */}
                                                    {showMobileActions && (
                                                        <div className={`absolute top-0 ${lang === 'ar' ? 'left-12' : 'right-12'} bg-white dark:bg-[#272727] border border-gray-200 dark:border-[#333] rounded-full shadow-xl flex items-center gap-1 p-1 z-50 animate-in fade-in slide-in-from-${lang === 'ar' ? 'left' : 'right'}-5`}>
                                                            <WatchLaterButton
                                                                animeId={Number(anime?.id)}
                                                                episodeId={Number(currentEpisode.id)}
                                                                episodeTitle={epTitle}
                                                                episodeNumber={currentEpisode.episode_number}
                                                                episodeImage={getImageUrl(currentEpisode.thumbnail)}
                                                                variant="icon"
                                                                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-[#333] rounded-full [&_svg]:w-5 [&_svg]:h-5"
                                                                showLabel={false}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] relative group"
                                                                onClick={() => {
                                                                    setIsShareModalOpen(true);
                                                                    setShowMobileActions(false);
                                                                }}
                                                            >
                                                                <Share2 className="h-5 w-5 pointer-events-none" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-10 w-10 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] relative group"
                                                                onClick={() => {
                                                                    setIsEpisodeInfoOpen(true);
                                                                    setShowMobileActions(false);
                                                                }}
                                                            >
                                                                <MoreVertical className="h-5 w-5 pointer-events-none" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                                <span>{renderEmojiContent(animeTitle)}</span>
                                                <span>•</span>
                                                <span>{currentEpisode.duration}m</span>
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                                                {renderEmojiContent(epDesc || (lang === 'ar' ? 'لا يوجد وصف متاح لهذه الحلقة.' : 'No description available for this episode.'))}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Row - Views, Likes, Dislikes, Report */}
                                <div className="flex flex-wrap items-center gap-3 mb-6 px-2 md:px-0">
                                    {/* Views */}
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                        <Eye className="w-5 h-5 text-black dark:text-white" />
                                        <span className="text-sm font-bold">
                                            {formatNumber(stats?.views_count || 0)} {lang === 'ar' ? 'مشاهدة' : 'views'}
                                        </span>
                                    </div>

                                    {/* Like/Dislike Buttons - Pill Style */}
                                    <div className="flex items-center bg-gray-100 dark:bg-[#272727] rounded-full overflow-hidden h-10 select-none">
                                        {/* Like Button */}
                                        <button
                                            onClick={() => handleReaction('like')}
                                            className={`relative group flex items-center gap-2 px-4 h-full transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${userReaction === 'like' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            title={lang === 'ar' ? 'أعجبني' : 'Like'}
                                        >
                                            <ThumbsUp
                                                className={`w-5 h-5 pointer-events-none transition-transform duration-300 ${userReaction === 'like' ? 'fill-black dark:fill-white scale-110' : 'group-hover:scale-110'
                                                    }`}
                                            />
                                            <span className="text-sm font-bold pointer-events-none">{formatNumber(stats?.likes_count || 0)}</span>
                                        </button>

                                        {/* Vertical Divider */}
                                        <div className="w-px h-6 bg-gray-300 dark:bg-[#444] pointer-events-none" />

                                        {/* Dislike Button */}
                                        <button
                                            onClick={() => handleReaction('dislike')}
                                            className={`relative group flex items-center gap-2 px-4 h-full transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${userReaction === 'dislike' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                            title={lang === 'ar' ? 'لم يعجبني' : 'Dislike'}
                                        >
                                            <ThumbsDown
                                                className={`w-5 h-5 pointer-events-none transition-transform duration-300 ${userReaction === 'dislike' ? 'fill-black dark:fill-white scale-110' : 'group-hover:scale-110'
                                                    }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Report Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="group flex items-center gap-2 h-10 px-4 bg-white dark:bg-[#272727] border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#222] transition-colors relative"
                                        onClick={() => setIsReportModalOpen(true)}
                                    >
                                        <Flag className="w-4 h-4 pointer-events-none" />
                                        <span className="text-sm font-bold pointer-events-none">{lang === 'ar' ? 'إبلاغ عن مشكلة' : 'Report'}</span>
                                    </Button>
                                </div>



                                {/* Mobile Action Buttons (Episodes) */}
                                <div className="grid grid-cols-1 gap-3 mt-4 lg:hidden">
                                    {/* Custom Episodes Card Button */}
                                    <button
                                        onClick={() => setIsEpisodesModalOpen(true)}
                                        className="flex items-center gap-4 p-3 bg-white dark:bg-black rounded-none hover:bg-gray-50 dark:hover:bg-[#111] transition-colors text-left group overflow-hidden relative shadow-sm"
                                    >
                                        {/* Removed Background Image Blur Effect as requested for clean white/black look */}
                                        {/* <div
                                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl z-0"
                                    style={{ backgroundImage: `url(${getImageUrl(anime?.cover || anime?.banner)})` }}
                                />
                                <div className="absolute inset-0 bg-black/40 z-0" /> */}

                                        {/* Thumbnail Stack Effect */}
                                        <div className="relative z-10 shrink-0 w-40 aspect-video">
                                            {/* Stack layers */}
                                            <div className="absolute top-0 left-2 right-0 bottom-2 bg-gray-700/50 rounded-none transform translate-x-2 -translate-y-1" />
                                            <div className="absolute top-1 left-1 right-1 bottom-1 bg-gray-600/50 rounded-none transform translate-x-1 -translate-y-0.5" />
                                            {/* Main Image */}
                                            <div className="relative w-full h-full rounded-none overflow-hidden bg-gray-900 border-none shadow-xl">
                                                <img
                                                    src={getImageUrl(anime?.cover || anime?.banner)}
                                                    alt={anime?.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="relative z-10 flex-1 min-w-0 py-1">
                                            <h4 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-1">
                                                {lang === 'ar' ? 'باقي حلقات المسلسل' : 'Rest of Series Episodes'}
                                            </h4>
                                            <p className="text-black dark:text-white text-sm font-bold mb-2">
                                                {lang === 'ar' ? (anime?.title || anime?.title_en) : (anime?.title_en || anime?.title)}
                                            </p>

                                            {/* Badges */}
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                {anime?.status && (
                                                    <span className="uppercase">{anime.status}</span>
                                                )}
                                                {anime?.type && (
                                                    <>
                                                        <span>|</span>
                                                        <span className="uppercase">{anime.type}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>



                                {/* Comments Section (On Page) */}
                                <div className=" mb-6 w-full -mt-10 border-gray-200 dark:border-[#333] pt-8">


                                    <div className="min-h-[200px]">
                                        <CommentsSection itemId={Number(currentEpisode?.id)} type="episode" />
                                    </div>
                                </div>


                            </div>


                            {/* SIDEBAR (Episodes List) */}
                            <div className="hidden lg:flex mt-0 flex-col gap-4 lg:col-span-5 xl:col-span-5 lg:row-span-2 h-fit transition-all duration-500">
                                {/* Wrapper for Theater Mode Layout if needed */}
                                <div className="w-full">
                                    {/* Sidebar Content Wrapper with Shared Rounding */}
                                    <div className="bg-white dark:bg-[#111] rounded-none overflow-hidden border border-gray-100 dark:border-white/5 shadow-2xl transition-all duration-300">
                                        {/* Tabs Container */}
                                        <div className="sticky top-[60px] z-30 bg-inherit md:static border-b border-gray-200 dark:border-white/10">
                                            {/* Tabs - Restored for Desktop */}
                                            <div className="flex items-center">
                                                <button
                                                    onClick={() => setActiveTab('episodes')}
                                                    className={`flex-1 py-4 text-sm font-black transition-all relative ${activeTab === 'episodes' ? 'text-black dark:text-white after:content-[""] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[3px] after:bg-black dark:after:bg-white after:rounded-full' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                >
                                                    {lang === 'ar' ? 'حلقات المسلسل' : 'Episodes'}
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('comments')}
                                                    className={`flex-1 py-4 text-sm font-black transition-all flex items-center justify-center gap-2 relative ${activeTab === 'comments' ? 'text-black dark:text-white after:content-[""] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[3px] after:bg-black dark:after:bg-white after:rounded-full' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                                >
                                                    {lang === 'ar' ? 'التعليقات' : 'Comments'}
                                                    {commentsData && commentsData.length > 0 && (
                                                        <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black rounded-full ${activeTab === 'comments' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'}`}>
                                                            {commentsData.length}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Filter Section */}
                                            {activeTab === 'episodes' && (
                                                <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                        {filteredEpisodes.length} {lang === 'ar' ? 'حلقة متوفرة' : 'EPISODES'}
                                                    </span>
                                                    <button
                                                        onClick={() => setIsEpisodesModalOpen(true)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-black text-gray-700 dark:text-gray-300 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/20 transition-all shadow-sm"
                                                        title={lang === 'ar' ? 'بحث وفلترة الحلقات' : 'Search and filter episodes'}
                                                    >
                                                        <Filter className="w-3.5 h-3.5" />
                                                        <span>{lang === 'ar' ? 'بحث' : 'Search'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Episodes List Content */}
                                        {activeTab === 'episodes' && (
                                            <div className="flex flex-col">
                                                <div ref={listRef} className={`flex flex-col gap-0 overflow-y-auto custom-scrollbar relative ${isMobile && !isEpisodesExpanded ? 'max-h-none' : 'h-[650px]'}`}>
                                                    {/* Render Logic: Slicing for mobile */}
                                                    {(isMobile && !isEpisodesExpanded ? filteredEpisodes.slice(0, 1) : filteredEpisodes).map((ep: any) => (
                                                        <div
                                                            key={ep.id}
                                                            ref={Number(ep.episode_number) === Number(episodeNum) ? activeEpisodeRef : null}
                                                            onClick={() => {
                                                                const animeTitle = lang === 'ar' ? (anime?.title) : (anime?.title_en || anime?.title);
                                                                const slug = slugify(animeTitle || '');
                                                                navigate(`/${lang}/watch/${anime?.id}/${ep.episode_number}/${slug}`);
                                                            }}
                                                            className={cn(
                                                                "group flex flex-row gap-4 p-2.5 px-4 cursor-pointer transition-all duration-300 border-b border-gray-100 dark:border-white/5 last:border-0",
                                                                Number(ep.episode_number) === Number(episodeNum)
                                                                    ? "bg-gray-50/80 dark:bg-white/5"
                                                                    : "bg-transparent hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                                                            )}
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="relative w-[170px] aspect-video flex-shrink-0 overflow-hidden rounded-none shadow-sm border border-black/5 dark:border-white/10">
                                                                <img
                                                                    src={getImageUrl(ep.thumbnail || ep.banner)}
                                                                    alt={ep.title}
                                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                                    loading="lazy"
                                                                />
                                                                {/* Current Indicator Overlay */}
                                                                {Number(ep.episode_number) === Number(episodeNum) && (
                                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                                                                        <Play className="w-6 h-6 text-white fill-current animate-pulse" />
                                                                    </div>
                                                                )}
                                                                {/* Duration Badge */}
                                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[11px] font-black bg-black/80 text-white z-10 rounded-none">
                                                                    {ep.duration ? `${ep.duration}m` : '24m'}
                                                                </div>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0 flex flex-col gap-1 py-0.5">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className={cn(
                                                                        "text-base font-black leading-tight flex-1 line-clamp-1 transition-colors",
                                                                        Number(ep.episode_number) === Number(episodeNum) ? "text-black dark:text-white" : "text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white"
                                                                    )}>
                                                                        {renderEmojiContent((lang === 'ar' ? ep.title : (ep.title_en || ep.title)) || (lang === 'ar' ? `حلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`))}
                                                                    </h4>
                                                                </div>

                                                                {(ep.description || ep.description_en) && (
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                                        {renderEmojiContent(lang === 'ar' ? (ep.description || ep.description_en) : (ep.description_en || ep.description))}
                                                                    </p>
                                                                )}

                                                                <div className="mt-auto flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-lg font-black text-gray-900 dark:text-white leading-none tracking-tighter">
                                                                            {lang === 'ar' ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex items-center gap-1 text-gray-400">
                                                                                <ThumbsUp className="w-3 h-3" />
                                                                                <span className="text-[10px] font-black">{ep.likes_count || 0}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {/* Sidebar Watch Later Button */}
                                                                    <WatchLaterButton
                                                                        animeId={Number(anime?.id)}
                                                                        episodeId={Number(ep.id)}
                                                                        variant="icon"
                                                                        className="h-8 w-8 [&_svg]:w-4 [&_svg]:h-4"
                                                                        episodeTitle={(lang === 'ar' ? ep.title : (ep.title_en || ep.title)) || (lang === 'ar' ? `حلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`)}
                                                                        episodeNumber={ep.episode_number}
                                                                        episodeImage={getImageUrl(ep.thumbnail || ep.banner)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Expand/Collapse Button for Mobile */}
                                                {isMobile && filteredEpisodes.length > 1 && (
                                                    <button
                                                        onClick={() => setIsEpisodesExpanded(!isEpisodesExpanded)}
                                                        className="w-full py-3 mt-4 flex items-center justify-center gap-3 bg-black border-2 border-white text-white font-bold text-sm tracking-wide hover:bg-gray-900 transition-colors"
                                                    >
                                                        {isEpisodesExpanded ? (
                                                            <>
                                                                <span>{lang === 'ar' ? 'أخفاء باقي الحلقات' : 'Hide remaining episodes'}</span>
                                                                <ChevronUp className="w-5 h-5" />
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>{lang === 'ar' ? 'تفقد المزيد من الحلقات' : 'Check more episodes'}</span>
                                                                <Library className="w-5 h-5" />
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Comments Content */}
                                        {/* Comments Content - Controlled by Tab */}
                                        {activeTab === 'comments' && (
                                            <div className="mt-0 lg:h-[550px] lg:overflow-y-auto custom-scrollbar">
                                                <CommentsSection itemId={Number(currentEpisode?.id)} type="episode" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-12 mb-10">
                                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                    {lang === 'ar' ? 'أحدث الحلقات' : 'Latest Episodes'}
                                </h2>

                                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 relative z-0 -mx-3 md:mx-0 px-1 md:px-0">
                                    {/* Exact replicate of AnimeBrowsePage CardItem logic for episodes */}
                                    {(latestEpisodesData || []).map((episode: any, index: number) => {
                                        const image = episode.banner || episode.image || episode.thumbnail;
                                        const title = lang === 'ar' ? (episode.title || episode.series?.title) : (episode.title_en || episode.series?.title_en || episode.title);
                                        const displayTitle = title || (lang === 'ar' ? 'عنوان غير متوفر' : 'Title not available');

                                        const description = lang === 'ar'
                                            ? (episode.description || episode.series?.description || episode.anime?.description || '')
                                            : (episode.description_en || episode.series?.description_en || episode.anime?.description_en || '');

                                        const animeTitle = lang === 'ar' ? (episode.series?.title || episode.title) : (episode.series?.title_en || episode.title_en || episode.title);
                                        const slug = slugify(animeTitle);
                                        const targetLink = `/${lang}/watch/${episode.anime_id}/${episode.episode_number}/${slug}`;

                                        return (
                                            <div
                                                key={episode.id + '_latest'}
                                                className="group cursor-pointer relative z-0"
                                                onClick={() => navigate(targetLink, { replace: true })}
                                                onMouseEnter={() => handleMouseEnter(index)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <Link to={targetLink} className="flex flex-row gap-3 md:flex-col md:gap-0 w-full h-full">
                                                    {/* Cover Container */}
                                                    <div className="relative flex-shrink-0 w-[140px] md:w-full aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-1">
                                                        <SpinnerImage
                                                            src={getImageUrl(image)}
                                                            alt={displayTitle}
                                                            className="w-full h-full"
                                                            imageClassName="object-cover"
                                                        />

                                                        <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 bg-black/80">
                                                            {episode.episode_number}
                                                        </div>
                                                    </div>

                                                    {/* Metadata Below Card */}
                                                    <div className="px-0 md:px-1 flex-1 flex flex-col items-start text-right py-0 md:py-2">
                                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight text-sm md:text-base mb-1">
                                                            {renderEmojiContent(displayTitle)}
                                                        </h3>
                                                        {description && (
                                                            <p className="text-[12.5px] text-gray-700 dark:text-gray-300 line-clamp-3 md:line-clamp-2 leading-snug text-start mb-1">
                                                                {description}
                                                            </p>
                                                        )}
                                                        <p className="text-lg md:text-xl font-black text-gray-900 dark:text-white mt-1">
                                                            {lang === 'ar' ? `الحلقة ${episode.episode_number}` : `Episode ${episode.episode_number}`}
                                                        </p>
                                                        <div className="flex items-center justify-center gap-3 pt-1">
                                                            <div className="flex items-center gap-1.5 text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
                                                                <ThumbsUp className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                                                                <span className="text-xs md:text-sm font-black">{episode.likes_count || 0}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                                                <span className="text-xs md:text-sm font-black whitespace-nowrap uppercase tracking-wide">
                                                                    {episode.views_count || 0} {lang === 'ar' ? 'مشاهدة' : 'Views'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>

                                                {/* Hover Card */}
                                                {hoveredCardIndex === index && (
                                                    <div className="absolute inset-0 z-50">
                                                        <AnimeHoverCard
                                                            data={episode}
                                                            lang={lang}
                                                            onMouseEnter={keepCardOpen}
                                                            onMouseLeave={handleMouseLeave}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Episodes Modal */}
                            <EpisodesModal
                                isOpen={isEpisodesModalOpen}
                                onClose={() => setIsEpisodesModalOpen(false)}
                                episodes={filteredEpisodes}
                                activeEpisodeNum={Number(episodeNum)}
                                animeId={Number(anime?.id)}
                                slug={currentSlug}
                                lang={lang}
                                isLoading={isQueryLoading || isEpisodesLoading}
                                getImageUrl={getImageUrl}
                                getRelativeTime={getRelativeTime}
                            />

                            {/* Mobile Comments Modal */}
                            <MobileCommentsModal
                                isOpen={isMobileCommentsOpen}
                                onClose={() => setIsMobileCommentsOpen(false)}
                                episodeId={Number(currentEpisode?.id)}
                            />

                            {/* Share Modal */}
                            {
                                currentEpisode && (
                                    <ShareModal
                                        episode={currentEpisode}
                                        anime={anime}
                                        isOpen={isShareModalOpen}
                                        onClose={() => setIsShareModalOpen(false)}
                                    />
                                )
                            }

                            {/* Episode Info Modal */}
                            {
                                currentEpisode && (
                                    <EpisodeInfoMenu
                                        episode={currentEpisode}
                                        anime={anime}
                                        onDownload={() => console.log('Download clicked')}
                                        onReport={() => setIsReportModalOpen(true)}
                                        onShare={() => setIsShareModalOpen(true)}
                                        isOpen={isEpisodeInfoOpen}
                                        onClose={() => setIsEpisodeInfoOpen(false)}
                                    />
                                )
                            }

                            {/* Report Modal */}
                            {
                                currentEpisode && (
                                    <ReportModal
                                        isOpen={isReportModalOpen}
                                        closeModal={() => setIsReportModalOpen(false)}
                                        episodeNumber={currentEpisode.episode_number}
                                        episodeLink={window.location.href}
                                        serverName={servers[selectedServer]?.name || (lang === 'ar' ? 'سيرفر غير معروف' : 'Unknown Server')}
                                        episode={currentEpisode}
                                        anime={anime}
                                        getImageUrl={getImageUrl}
                                    />
                                )
                            }
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </div>
    );
}
