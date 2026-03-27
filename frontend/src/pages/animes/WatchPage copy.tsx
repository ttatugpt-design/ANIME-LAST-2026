import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
    Play, Plus, Share2, Flag, Download, MessageSquare,
    Globe, Clock, Eye, ChevronUp, ChevronLeft, Star, Filter, Library,
    ThumbsUp, ThumbsDown, MoreVertical, X, Check, Copy, Link as LinkIcon,
    Maximize2, Minimize2
} from "lucide-react";
import { toast } from 'sonner';
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
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
import { NewsTicker } from '@/components/common/NewsTicker';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';

import { ShareModal } from '@/components/episodes/ShareModal';
import { MobileCommentsModal } from '@/components/comments/MobileCommentsModal';
import { trackEpisodeView, toggleEpisodeReaction, getEpisodeStats, EpisodeStats } from '@/lib/episode-stats-api';

import { getImageUrl } from '@/utils/image-utils';

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
    const animeId = id;
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language;

    // State
    const [isLoadingDelay, setIsLoadingDelay] = useState(true);
    const [selectedServer, setSelectedServer] = useState<number>(0);
    const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
    const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEpisodeInfoOpen, setIsEpisodeInfoOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const activeEpisodeRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Mobile Expansion State
    const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Episode Stats State
    const [stats, setStats] = useState<EpisodeStats | null>(null);
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState<string | null>(null);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isPlayerStarted, setIsPlayerStarted] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint is usually where sidebar moves
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Hover State
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Fetch Anime Data (includes episodes)
    const { data: anime, isLoading: isQueryLoading } = useQuery({
        queryKey: ["anime", animeId],
        queryFn: async () => {
            const response = await api.get(`/animes/${animeId}`);
            return response.data;
        },
        enabled: !!animeId,
    });

    // Fetch current episode
    const { data: episodeData, isLoading: episodeLoading, error: episodeError } = useQuery({
        queryKey: ['episode', animeId, episodeNum],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${animeId}&episode_number=${episodeNum}`);
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
        enabled: !!animeId && !!episodeNum,
    });

    // Track Episode View (once per anime+episode combination)
    const trackedEpisodeRef = useRef<string | null>(null);
    useEffect(() => {
        if (episodeData?.id && animeId) {
            // CRITICAL: Always use URL animeId as source of truth
            // Database may have incorrect anime_id values for episodes
            const actualAnimeId = Number(animeId);

            console.log('Episode tracking data:', {
                episodeId: episodeData.id,
                episodeNumber: episodeData.episode_number,
                episodeAnimeId: episodeData.anime_id,
                urlAnimeId: Number(animeId),
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
    }, [episodeData?.id, episodeData?.anime_id, animeId]);

    // Fetch Episodes Data (Fallback if not in anime object)
    const { data: episodesData, isLoading: isEpisodesLoading } = useQuery({
        queryKey: ["episodes", animeId],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${animeId}`);
            return response.data;
        },
        enabled: !!animeId,
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
        if (!animeId) return [];
        return episodesList.filter((ep: any) => Number(ep.anime_id) === Number(animeId));
    }, [episodesList, animeId]);

    // Determine Current Episode
    const currentEpisode = useMemo(() => {
        if (!filteredEpisodes.length) return null;
        return filteredEpisodes.find((ep: any) => ep.episode_number == episodeNum);
    }, [filteredEpisodes, episodeNum]);

    // Fetch Comments for Badge (Requires currentEpisode)
    const { data: commentsData } = useQuery({
        queryKey: ["comments", currentEpisode?.id],
        queryFn: async () => {
            if (!currentEpisode?.id) return [];
            const response = await api.get(`/episodes/${currentEpisode.id}/comments`);
            return response.data;
        },
        enabled: !!currentEpisode?.id,
    });



    // Scroll to active episode when list loads or episode changes (List Scroll Only)
    useEffect(() => {
        // Wait for data to load
        if (isQueryLoading || isEpisodesLoading) return;

        // Add delay to ensure DOM is fully rendered and data is loaded
        const timer = setTimeout(() => {
            if (activeEpisodeRef.current && listRef.current && filteredEpisodes.length > 0) {
                const element = activeEpisodeRef.current;
                const container = listRef.current;

                // Calculate position to align the element to the top (Vue implementation)
                const top = element.offsetTop - container.offsetTop;

                container.scrollTo({
                    top: Math.max(0, top),
                    behavior: 'smooth'
                });
            }
        }, 300); // Reduced delay since we're checking loading states

        return () => clearTimeout(timer);
    }, [episodeNum, filteredEpisodes, isQueryLoading, isEpisodesLoading]);

    // Reset player state when episode changes
    useEffect(() => {
        setIsPlayerStarted(false);
        setIsTheaterMode(false); // Also exit theater mode on episode change
    }, [episodeNum, animeId]);

    // Video Source Logic with robust parsing moved to top level
    const servers = useMemo(() => {
        if (!currentEpisode) return [];

        // Priority: Use new Servers relationship from backend
        if (currentEpisode.servers && currentEpisode.servers.length > 0) {
            return currentEpisode.servers.map((s: any) => ({
                url: s.url,
                name: s.name || `Server ${s.id}`,
                language: s.language
            }));
        }

        // Fallback: Legacy video_urls parsing
        if (!currentEpisode.video_urls) return [];
        try {
            // Attempt to parse as JSON
            let parsed;
            try {
                parsed = JSON.parse(currentEpisode.video_urls);
            } catch {
                // If parse fails, treat as plain string URL if valid
                if (typeof currentEpisode.video_urls === 'string' && currentEpisode.video_urls.startsWith('http')) {
                    return [{ url: currentEpisode.video_urls, name: "Main Server" }];
                }
                return [];
            }

            if (Array.isArray(parsed)) {
                // Ensure array elements have 'url' property, otherwise map them (if they are just strings)
                return parsed.map((item: any, idx: number) => {
                    if (typeof item === 'string') return { url: item, name: `Server ${idx + 1}` };
                    // Handle various potential keys
                    const url = item.url || item.link || item.src || item.video_url;
                    const name = item.name || item.label || item.server_name || `Server ${idx + 1}`;
                    return { url, name };
                }).filter(s => s.url); // Filter out empty urls
            }
            // If JSON is object but specific format
            if (parsed.url || parsed.link) return [{ url: parsed.url || parsed.link, name: parsed.name || "Main Server" }];
        } catch (e) {
            console.error("Error parsing video urls", e);
        }
        return [];
    }, [currentEpisode]);

    // Reset selected server when episode changes
    useEffect(() => {
        setSelectedServer(0);
    }, [currentEpisode]);

    // Simulate loading delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoadingDelay(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleReaction = async (type: string) => {
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

            const newStats = await toggleEpisodeReaction(currentEpisode.id, type);
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

    const isLoading = isQueryLoading || isEpisodesLoading || isLoadingDelay;

    if (isLoading) return <CrunchyrollSkeleton variant="full-screen" />;

    if (!anime || !currentEpisode) {
        return <div className="min-h-screen flex items-center justify-center text-white">Episode not found.</div>;
    }

    const videoUrl = servers[selectedServer]?.url || "";


    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <Helmet>
                <title>{(lang === 'ar' ? currentEpisode.title : currentEpisode.title_en) || `Episode ${currentEpisode.episode_number}`} - AnimeLast</title>
            </Helmet>

            <NewsTicker />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible max-w-[1400px] mx-auto w-full">
                {/* Left Sidebar */}
                <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent border-r border-gray-100 dark:border-white/5">
                    <SocialNavSidebar />
                </div>

                {/* Main Content */}
                <div className="col-span-1 lg:col-span-9 flex flex-col min-h-screen">
                    {/* Video Player - Outside container on mobile for edge-to-edge, inside on desktop */}
                    <div className="block md:hidden w-screen aspect-video bg-black overflow-hidden relative left-1/2 right-1/2 -mx-[50vw]">
                        {videoUrl ? (
                            !isPlayerStarted ? (
                                <div
                                    className="absolute inset-0 z-10 cursor-pointer group"
                                    onClick={() => setIsPlayerStarted(true)}
                                >
                                    <img
                                        src={getImageUrl(currentEpisode?.thumbnail || currentEpisode?.banner || anime?.cover || anime?.banner)}
                                        alt="Video Poster"
                                        className="w-full h-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-75"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transition-transform duration-300 group-hover:scale-110">
                                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <iframe
                                    src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
                                    className="w-full h-full"
                                    allowFullScreen
                                    allow="autoplay"
                                    title="Video Player"
                                />
                            )
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-gray-500">Video source unavailable</p>
                            </div>
                        )}
                    </div>

                    <div className="w-full mx-auto px-0 md:px-4 py-0 animate-fade-in">
                        <div className="flex flex-col gap-0 md:gap-8 lg:pt-8 pt-4">

                            {/* MAIN CONTENT 1: Player Wrapper */}
                            <div className={`flex flex-col mt-0 transition-all duration-500 ease-in-out ${isTheaterMode ? 'w-full lg:w-[95%] mx-auto' : 'w-full lg:max-w-[720px] mx-auto'}`}>

                                {/* Video Player - Desktop only */}
                                <div className="hidden md:block w-full aspect-video bg-black overflow-hidden rounded-lg shadow-2xl mb-6 relative group border border-gray-100 dark:border-white/5">
                                    {videoUrl ? (
                                        !isPlayerStarted ? (
                                            <div
                                                className="absolute inset-0 z-20 cursor-pointer group/poster"
                                                onClick={() => setIsPlayerStarted(true)}
                                            >
                                                {/* Full Cover Image */}
                                                <img
                                                    src={getImageUrl(currentEpisode?.thumbnail || currentEpisode?.banner || anime?.cover || anime?.banner)}
                                                    alt="Video Poster"
                                                    className="w-full h-full object-cover opacity-70 group-hover/poster:opacity-80 transition-all duration-500 group-hover/poster:scale-105"
                                                />

                                                {/* Gradient Overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                                                {/* Play Button - Large Premium Style */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="relative">
                                                        {/* Outer Pulse */}
                                                        <div className="absolute inset-0 bg-white/30 rounded-full animate-ping opacity-20" />
                                                        {/* Inner Button */}
                                                        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border-2 border-white/50 transition-all duration-500 group-hover/poster:scale-110 group-hover/poster:bg-white/20">
                                                            <Play className="w-12 h-12 text-white fill-white ml-2 transition-transform duration-500 group-hover/poster:scale-110" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Meta Info on Poster */}
                                                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-xs font-black text-white/50 uppercase tracking-widest">
                                                            {lang === 'ar' ? 'تشغيل الحلقة' : 'PLAY EPISODE'}
                                                        </span>
                                                        <h4 className="text-2xl font-black text-white drop-shadow-lg">
                                                            {lang === 'ar' ? `الحلقة ${currentEpisode?.episode_number}` : `Episode ${currentEpisode?.episode_number}`}
                                                        </h4>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <iframe
                                                src={`${videoUrl}${videoUrl.includes('?') ? '&' : '?'}autoplay=1`}
                                                className="w-full h-full"
                                                allowFullScreen
                                                allow="autoplay"
                                                title="Video Player"
                                            />
                                        )
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <p className="text-gray-500">Video source unavailable</p>
                                        </div>
                                    )}
                                </div>

                            </div>
                            {/* MAIN CONTENT 2: Details Wrapper (Servers, Stats, Info) */}
                            <div className="flex flex-col mt-0 w-full transition-all duration-500 relative z-10">

                                {/* Servers List and Stats Row (Below Player) */}
                                <div className="flex flex-row flex-wrap gap-4 mb-4 px-2 md:px-0 items-center justify-between">
                                    {/* Servers Section */}
                                    <div className="flex flex-col gap-3 flex-1">
                                        <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-gray-900 dark:text-white">
                                            <Globe className="w-4 h-4 text-black dark:text-white" />
                                            {lang === 'ar' ? 'سيرفرات المشاهدة' : 'Servers'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Select value={selectedServer.toString()} onValueChange={(val: string) => setSelectedServer(Number(val))}>
                                                <SelectTrigger className="w-[140px] bg-white dark:bg-[#272727] text-black dark:text-white border-gray-200 dark:border-[#333]">
                                                    <SelectValue placeholder={lang === 'ar' ? 'اختر سيرفر' : 'Select Server'} />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-[#272727] border-gray-200 dark:border-[#333]">
                                                    {servers.length > 0 ? (
                                                        servers.map((server: any, idx: number) => (
                                                            <SelectItem key={idx} value={idx.toString()} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#333]">
                                                                {server.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="p-2 text-xs text-red-400">
                                                            {lang === 'ar' ? 'لا توجد سيرفرات متاحة' : 'No servers available'}
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>

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
                                    </div>

                                    {/* Episode Stats - Views, Likes, Dislikes */}
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Views */}
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Eye className="w-5 h-5 text-black dark:text-white" />
                                            <span className="text-sm font-bold">
                                                {formatNumber(stats?.views_count || 0)} {lang === 'ar' ? 'مشاهدة' : 'views'}
                                            </span>
                                        </div>

                                        {/* Like/Dislike Buttons - Pill Style */}
                                        <div className="flex items-center bg-gray-100 dark:bg-[#272727] rounded-full overflow-hidden h-10">
                                            {/* Like Button */}
                                            <button
                                                onClick={() => handleReaction('like')}
                                                className={`group flex items-center gap-2 px-4 h-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${userReaction === 'like' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                title={lang === 'ar' ? 'أعجبني' : 'Like'}
                                            >
                                                <ThumbsUp
                                                    className={`w-5 h-5 transition-transform duration-300 ${userReaction === 'like' ? 'fill-black dark:fill-white scale-110' : 'group-hover:scale-110'
                                                        }`}
                                                />
                                                <span className="text-sm font-bold">{formatNumber(stats?.likes_count || 0)}</span>
                                            </button>

                                            {/* Vertical Divider */}
                                            <div className="w-px h-6 bg-gray-300 dark:bg-[#444]" />

                                            {/* Dislike Button */}
                                            <button
                                                onClick={() => handleReaction('dislike')}
                                                className={`group flex items-center gap-2 px-4 h-full transition-colors hover:bg-black/5 dark:hover:bg-white/10 ${userReaction === 'dislike' ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-400'
                                                    }`}
                                                title={lang === 'ar' ? 'لم يعجبني' : 'Dislike'}
                                            >
                                                <ThumbsDown
                                                    className={`w-5 h-5 transition-transform duration-300 ${userReaction === 'dislike' ? 'fill-black dark:fill-white scale-110' : 'group-hover:scale-110'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>



                                {/* Episode Details */}
                                <div className="mb-6 px-2 md:px-0">
                                    <div className="flex gap-4">
                                        {/* Anime Thumbnail - Desktop only */}
                                        <div className="hidden md:block flex-shrink-0 w-28 h-40 rounded-none overflow-hidden shadow-lg">
                                            <Link to={`/${lang}/animes/${anime.id}`}>
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
                                                <div className="flex items-center gap-2">
                                                    <WatchLaterButton
                                                        animeId={Number(animeId)}
                                                        episodeId={Number(currentEpisode.id)}
                                                        episodeTitle={currentEpisode.title}
                                                        episodeNumber={currentEpisode.episode_number}
                                                        episodeImage={getImageUrl(currentEpisode.thumbnail)}
                                                        variant="icon"
                                                        className="h-10 w-10 p-0 hover:bg-gray-200 dark:hover:bg-[#222]"
                                                        showLabel={false}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full hover:bg-gray-200 dark:hover:bg-[#222] transition-colors"
                                                        onClick={() => setIsShareModalOpen(true)}
                                                    >
                                                        <Share2 className="h-9 w-9" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-10 w-10 rounded-full hover:bg-gray-200 dark:hover:bg-[#222] transition-colors"
                                                        onClick={() => setIsEpisodeInfoOpen(true)}
                                                    >
                                                        <MoreVertical className="h-9 w-9" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                                <span>{anime.title}</span>
                                                <span>•</span>
                                                <span>{currentEpisode.duration}m</span>
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
                                                {(lang === 'ar' ? (currentEpisode.description || anime.description) : (currentEpisode.description_en || anime.description_en)) || 'No description.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>


                                {/* Redundant Mobile buttons removed for unified vertical stack */}


                                {/* Social Media Share */}

                            </div>


                            {/* Episodes List Section - Stacked Under Details */}
                            <div className="mt-8 flex flex-col gap-6">
                                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
                                    <h3 className={`font-black text-2xl text-gray-900 dark:text-white ${lang === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-[#f47521]`}>
                                        {lang === 'ar' ? 'حلقات المسلسل' : 'Series Episodes'}
                                    </h3>
                                    <button
                                        onClick={() => setIsEpisodesModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#111] hover:bg-gray-200 dark:hover:bg-[#1a1a1a] transition-colors rounded-full"
                                    >
                                        <Filter className="w-5 h-5" />
                                        <span>{lang === 'ar' ? 'بحث وفلترة' : 'Filter'}</span>
                                    </button>
                                </div>

                                <div className="flex flex-col gap-0 border border-gray-100 dark:border-white/5 rounded-none md:rounded-lg overflow-hidden bg-white dark:bg-[#0a0a0a]">
                                    {filteredEpisodes.map((ep: any) => {
                                        const isActive = Number(ep.episode_number) === Number(episodeNum);
                                        const epTitle = (lang === 'ar' ? ep.title : ep.title_en) || (lang === 'ar' ? `حلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`);
                                        const epDescription = lang === 'ar'
                                            ? (ep.description || ep.description_en || 'لا يوجد وصف متاح')
                                            : (ep.description_en || ep.description || 'No description available');
                                        const epImage = ep.thumbnail || ep.banner || anime?.cover || anime?.banner;

                                        return (
                                            <div
                                                key={ep.id}
                                                ref={isActive ? activeEpisodeRef : null}
                                                onClick={() => navigate(`/${lang}/watch/${anime.id}/${ep.episode_number}`)}
                                                className={cn(
                                                    "group flex flex-row items-center gap-4 md:gap-8 bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900/40 transition-colors duration-200 relative z-10 cursor-pointer p-3 md:p-6 border-b border-gray-100 dark:border-white/5",
                                                    isActive ? "bg-gray-100/30 dark:bg-neutral-900/40" : ""
                                                )}
                                            >
                                                {/* Image Section - Smaller Width matching user request */}
                                                <div className="w-[140px] md:w-[200px] aspect-video flex-shrink-0 relative overflow-hidden rounded-none shadow-sm bg-gray-900">
                                                    <img
                                                        src={getImageUrl(epImage)}
                                                        alt={epTitle}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                    {/* Play Indicator if Active */}
                                                    {isActive && (
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <Play className="w-8 h-8 text-white fill-white opacity-90 animate-pulse" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content Section */}
                                                <div className="flex-1 flex flex-col items-start text-right w-full min-w-0">
                                                    {/* Episode Title - Smaller like AnimeBrowsePage mobile */}
                                                    <h3 className={cn(
                                                        "text-xs md:text-sm font-bold mb-1 group-hover:text-black dark:group-hover:text-white transition-colors leading-tight line-clamp-1",
                                                        isActive ? "text-[#f47521]" : "text-gray-500 dark:text-gray-400"
                                                    )}>
                                                        {epTitle}
                                                    </h3>

                                                    {/* Big Episode Number Text - REPLICATING AnimeBrowsePage Mobile Style */}
                                                    <p className={cn(
                                                        "text-lg md:text-2xl font-black mb-2 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1",
                                                        isActive ? "text-[#f47521]" : "text-gray-900 dark:text-white"
                                                    )}>
                                                        {lang === 'ar' ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                    </p>

                                                    {/* Footer / Tags */}
                                                    <div className="flex items-center gap-3 md:gap-5 w-full pt-1">
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 dark:bg-neutral-800 rounded-none">
                                                            <Globe className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[10px] md:text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">
                                                                {lang === 'ar' ? 'مترجم' : 'SUB'}
                                                            </span>
                                                        </div>

                                                        {ep.duration && (
                                                            <div className="flex items-center gap-1 text-[10px] md:text-xs text-gray-400 font-bold">
                                                                <Clock className="w-3 h-3" />
                                                                <span>{ep.duration}m</span>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 text-left rtl:text-left ltr:text-right hidden md:block">
                                                            <WatchLaterButton
                                                                animeId={Number(anime?.id)}
                                                                episodeId={Number(ep.id)}
                                                                variant="icon"
                                                                episodeTitle={epTitle}
                                                                episodeNumber={ep.episode_number}
                                                                episodeImage={getImageUrl(epImage)}
                                                                className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Comments Section - Stacked Under Episodes */}
                            <div className="mt-12 mb-16">
                                <div className="flex items-center gap-3 border-b border-gray-100 dark:border-white/10 pb-4 mb-6">
                                    <h3 className={`font-black text-2xl text-gray-900 dark:text-white ${lang === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-blue-500`}>
                                        {lang === 'ar' ? 'التعليقات والمناقشة' : 'Comments & Discussion'}
                                    </h3>
                                    {commentsData && commentsData.length > 0 && (
                                        <span className="bg-gray-100 dark:bg-neutral-800 text-gray-500 px-2 py-0.5 rounded-full text-xs font-bold">
                                            {commentsData.length}
                                        </span>
                                    )}
                                </div>
                                <div className="w-full">
                                    <CommentsSection itemId={Number(currentEpisode?.id)} type="episode" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Latest Episodes Section (Bottom) */}
                    <div className="flex flex-col  mb-10">
                        <h3 className={`font-bold text-xl mb-4 text-gray-900 dark:text-white ${lang === 'ar' ? 'border-r-4 pr-3' : 'border-l-4 pl-3'} border-[#f47521]`}>
                            {lang === 'ar' ? 'آخر الحلقات المضافة' : 'Latest Episodes'}
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-1 md:gap-6 relative z-0 px-2 md:px-0">
                            {/* Reusing the card design from AnimeBrowsePage for consistency */}
                            {(latestEpisodesData || []).map((episode: any, index: number) => {
                                // Logic matching Vue/BrowsePage
                                const image = episode.banner || episode.image || episode.thumbnail;
                                const title = lang === 'ar' ? (episode.title || episode.series?.title) : (episode.title_en || episode.series?.title_en || episode.title);
                                const displayTitle = title || (lang === 'ar' ? 'عنوان غير متوفر' : 'Title not available');
                                const subText = episode.title || `Episode ${episode.episode_number}`;
                                const year = new Date(episode.created_at || Date.now()).getFullYear();

                                return (
                                    <div
                                        key={episode.id + '_latest'}
                                        className="group cursor-pointer relative z-0"
                                        onClick={() => navigate(`/${lang}/watch/${episode.anime_id}/${episode.episode_number}`)}
                                        onMouseEnter={() => handleMouseEnter(index)}
                                        onMouseLeave={handleMouseLeave}
                                    >
                                        {/* Cover Container */}
                                        <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] mb-1 md:mb-2 shadow-sm group-hover:shadow-md transition-shadow">
                                            <img
                                                src={getImageUrl(image)}
                                                alt={displayTitle}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />

                                            {/* Badges */}
                                            <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white z-10 bg-black/80">
                                                {episode.episode_number}
                                            </div>

                                            {/* NEW Badge */}
                                            {index < 6 && (
                                                <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold bg-green-500 rounded text-white z-10">
                                                    {lang === 'ar' ? 'جديد' : 'NEW'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Metadata Below Card */}
                                        <div className="space-y-1 px-0 md:px-1 text-center">
                                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-2 leading-tight">
                                                {displayTitle}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                {subText}
                                            </p>
                                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                                                <span className="text-gray-600">•</span>
                                                <span>{year}</span>
                                            </div>
                                        </div>

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
                        animeId={Number(animeId)}
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
                                serverName={servers[selectedServer]?.name || 'Unknown Server'}
                                episode={currentEpisode}
                                anime={anime}
                                getImageUrl={getImageUrl}
                            />
                        )
                    }
                    {/* Modals and other absolute/fixed elements can stay here or move outside the main grid */}
                </div>
            </div>
            <Footer />
        </div>
    );
}
