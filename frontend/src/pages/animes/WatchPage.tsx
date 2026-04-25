import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
    Play, Plus, Share2, Flag, Download, MessageCircle,
    Globe, Clock, Eye, ChevronUp, ChevronLeft, Star, Filter, Library,
    ThumbsUp, ThumbsDown, MoreHorizontal, X, Check, Copy, Link as LinkIcon,
    Maximize2, Minimize2, Loader2, Trash2
} from "lucide-react";
import { toast } from 'sonner';
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { renderEmojiContent } from "@/utils/render-content";
import { slugify } from "@/utils/slug";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import CentralSpinner from "@/components/ui/CentralSpinner";
import { Skeleton } from "@/components/ui/skeleton";
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
import { NewsTicker } from '@/components/common/NewsTicker';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';

import { getImageUrl } from '@/utils/image-utils';
import { useAuthStore } from '@/stores/auth-store';
import CustomVideoPlayer from '@/components/episodes/CustomVideoPlayer';



const isVideoFile = (url: string) => {
    if (!url) return false;
    // Remove query parameters for extension check
    const cleanUrl = url.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.mp4') || 
           cleanUrl.endsWith('.webm') || 
           cleanUrl.endsWith('.ogv') ||
           url.includes('googleusercontent.com') ||
           url.includes('files.vid3rb.com');
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

const WatchPageSkeleton = ({ lang }: { lang: string }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Main Content Skeleton */}
            <div className="col-span-1 lg:col-span-7 lg:col-start-3 px-0 lg:px-6 pb-6 space-y-4">
                <div className="max-w-[900px] mx-auto space-y-4">
                    {/* Breadcrumbs Skeleton */}
                    <div className="flex items-center gap-2 px-4 lg:px-0 py-2">
                        <Skeleton className="h-4 w-20 md:w-32" />
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24 md:w-40" />
                    </div>

                    {/* Player Card Skeleton */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a] overflow-hidden">
                        {/* 1. Player Area */}
                        <div className="w-full aspect-video bg-neutral-900 animate-pulse flex items-center justify-center">
                            <Skeleton className="w-16 h-16 rounded-full opacity-20" />
                        </div>

                        {/* 2. Metadata Area */}
                        <div className="p-3 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-2 flex-1">
                                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-8 rounded-full" />
                            </div>

                            {/* 3. Servers Skeleton */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50 dark:border-white/5">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-8 w-20 rounded-lg" />
                                ))}
                            </div>

                            {/* 4. Stats Row Skeleton */}
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex gap-3">
                                    <Skeleton className="h-4 w-12" />
                                    <Skeleton className="h-4 w-12" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        </div>

                        {/* 5. Reactions Row */}
                        <div className="flex border-t border-gray-50 dark:border-[#2a2a2a]">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="flex-1 h-10 m-1 rounded-lg" />
                            ))}
                        </div>
                    </div>

                    {/* Comments Placeholder */}
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 space-y-4 border border-gray-100 dark:border-[#2a2a2a]">
                        <div className="flex gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-10 flex-1 rounded-xl" />
                        </div>
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3 ml-4">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-12 w-full rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar Skeleton (Right side) */}
            <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] px-2 pt-4">
                <div className="flex justify-between items-center mb-4 px-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                </div>
                <div className="border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] rounded-lg overflow-hidden p-1 space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="h-4 w-6 shrink-0" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function WatchPage() {
    const { id, episodeNum, slug: currentSlug } = useParams(); // URL params: /watch/:id/:episodeNum/:slug?
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const user = useAuthStore((state) => state.user);

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

    const queryClient = useQueryClient();

    // ==========================================
    // 1. CORE STATE & REFS
    // ==========================================
    const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');
    const [selectedServer, setSelectedServer] = useState<number>(0);
    const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
    const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEpisodeInfoOpen, setIsEpisodeInfoOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [deletingServerIdx, setDeletingServerIdx] = useState<number | null>(null);
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [selectedServersForSwap, setSelectedServersForSwap] = useState<number[]>([]);
    
    const [stats, setStats] = useState<EpisodeStats | null>(null);
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [isPlayerUnlocked, setIsPlayerUnlocked] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [isRefreshingVideo, setIsRefreshingVideo] = useState(false);
    const [dynamicVideoUrl, setDynamicVideoUrl] = useState<string | null>(null);
    const [lastRefreshedId, setLastRefreshedId] = useState<string | null>(null);
    
    const [isMobile, setIsMobile] = useState(false);
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const sidebarRef = useRef<HTMLDivElement>(null);
    const commentsSectionRef = useRef<any>(null);
    const trackedEpisodeRef = useRef<string | null>(null);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetControlsTimer = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    // ==========================================
    // 2. DATA FETCHING (TanStack Query)
    // ==========================================

    // Fetch Anime Data (includes episodes) using id
    const { data: anime, isLoading: isQueryLoading } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    const [serverPriority, setServerPriority] = useState<string[]>([]);
    useEffect(() => {
        if (anime?.server_priority) {
            try { setServerPriority(anime.server_priority.split(',')); }
            catch (e) { console.error("Failed to parse priority", e); }
        }
    }, [anime]);

    const { data: episodeData, isLoading: episodeLoading, error: episodeError } = useQuery({
        queryKey: ['episode', anime?.id, episodeNum],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${anime.id}&episode_number=${episodeNum}`);
            return response.data.find((ep: any) => ep.episode_number === Number(episodeNum)) || null;
        },
        enabled: !!anime?.id && !!episodeNum,
    });

    const { data: episodesData } = useQuery({
        queryKey: ["episodes", anime?.id],
        queryFn: async () => {
            const response = await api.get(`/episodes?anime_id=${anime.id}`);
            return response.data;
        },
        enabled: !!anime?.id,
    });

    const { data: activeEpisodeData, isLoading: isLoadingActiveEpisode } = useQuery({
        queryKey: ["activeEpisode", id, episodeNum],
        queryFn: async () => {
            const response = await api.get('/episodes', { params: { anime_id: id, episode_number: episodeNum } });
            return response.data[0];
        },
        enabled: !!id && !!episodeNum,
    });

    const { data: globalServers } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => (await api.get('/servers')).data,
    });

    const { data: commentsData } = useQuery({
        queryKey: ['comments', episodeData?.id],
        queryFn: async () => {
            if (!episodeData?.id) return [];
            return (await api.get(`/episodes/${episodeData.id}/comments`)).data;
        },
        enabled: !!episodeData?.id
    });

    // ==========================================
    // 3. DERIVED DATA (MEMOS)
    // ==========================================
    const episodesList = useMemo(() => anime?.episodes || episodesData || [], [anime, episodesData]);
    
    const filteredEpisodes = useMemo(() => {
        if (!anime?.id) return [];
        return episodesList.filter((ep: any) => Number(ep.anime_id) === Number(anime.id) && ep.is_published);
    }, [episodesList, anime?.id]);

    const currentEpisode = useMemo(() => {
        if (activeEpisodeData) return activeEpisodeData;
        if (!filteredEpisodes.length) return null;
        return filteredEpisodes.find((ep: any) => Number(ep.episode_number) === Number(episodeNum));
    }, [activeEpisodeData, filteredEpisodes, episodeNum]);

    const servers = useMemo(() => {
        const allServers = currentEpisode?.servers || episodeData?.servers || [];
        const filtered = allServers.filter((server: any) => {
            if (server.language) return server.language.toLowerCase() === (lang === 'ar' ? 'ar' : 'en');
            return true;
        });

        if (serverPriority.length > 0) {
            return [...filtered].sort((a: any, b: any) => {
                const indexA = serverPriority.indexOf(a.name);
                const indexB = serverPriority.indexOf(b.name);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return 0;
            });
        }
        return filtered;
    }, [currentEpisode, episodeData, lang, serverPriority]);

    const playerQualities = useMemo(() => {
        const currentServer = servers[selectedServer];
        if (!currentServer || !isVideoFile(currentServer.url)) return [];

        const qualityRegex = /(\d{3,4}p)/i;
        const currentName = currentServer.name;
        const currentUrl = currentServer.url;

        const extractQuality = (name: string, url: string) => {
            const nameMatch = name.match(qualityRegex);
            if (nameMatch) return nameMatch[0].toLowerCase();
            const urlMatch = url.match(qualityRegex);
            if (urlMatch) return urlMatch[0].toLowerCase();
            return null;
        };

        const currentQualityLabel = extractQuality(currentName, currentUrl);
        const directServers = servers.filter((s: any) => isVideoFile(s.url));
        
        const qualitiesMap = directServers.map((s: any) => {
            const label = extractQuality(s.name, s.url);
            return {
                label: label || s.name,
                url: s.url,
                serverId: servers.indexOf(s)
            };
        });

        if (qualitiesMap.length > 1) return qualitiesMap;
        return [{ label: currentQualityLabel || 'Original', url: currentServer.url, serverId: selectedServer }];
    }, [servers, selectedServer]);

    // ==========================================
    // 4. INFINITE SCROLL LOGIC
    // ==========================================
    const { data: infiniteEpisodesData, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ["episodes-infinite", anime?.id],
        queryFn: async ({ pageParam = 1 }) => (await api.get(`/episodes`, { params: { anime_id: anime?.id, paginate: true, limit: 25, page: pageParam } })).data,
        getNextPageParam: (lastPage) => (lastPage.page < lastPage.last_page ? lastPage.page + 1 : undefined),
        enabled: !!anime?.id,
        initialPageParam: 1,
    });

    const { ref: observerRef, inView } = useInView({ threshold: 0.1, rootMargin: '400px' });
    useEffect(() => { if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage(); }, [inView, hasNextPage, isFetchingNextPage]);

    const filteredEpisodesFlattened = useMemo(() => infiniteEpisodesData?.pages.flatMap(p => p.data) || [], [infiniteEpisodesData]);

    const displayedEpisodesView = useMemo(() => filteredEpisodesFlattened, [filteredEpisodesFlattened]);

    // ==========================================
    // 5. LIFECYCLE & SYNC EFFECTS
    // ==========================================

    // Helper: Must be defined before effects that call it
    const refreshAnime3rbLink = useCallback(async (episode: any, serverIdx: number) => {
        const chosenServer = servers[serverIdx];
        if (!chosenServer || !episode) return;
        setIsRefreshingVideo(true);
        try {
            const res = await api.post('/scraper/anime3rb-refresh', { source_url: episode.source_url, episode_id: episode.id });
            if (res.data?.url) {
                setDynamicVideoUrl(res.data.url);
                setLastRefreshedId(`${episode.id}-${serverIdx}`);
            }
        } catch (e) { toast.error('Refresh failed'); }
        finally { setIsRefreshingVideo(false); }
    }, [servers]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const handleFS = () => {
            const isFS = !!document.fullscreenElement;
            setIsBrowserFullscreen(isFS);
            if (!isFS) {
                setShowControls(true);
                if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            } else {
                setShowControls(true);
                if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
                controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
            }
        };
        document.addEventListener('fullscreenchange', handleFS);
        return () => document.removeEventListener('fullscreenchange', handleFS);
    }, []);

    useEffect(() => {
        if (episodeData?.id && anime?.id) {
            const key = `${anime.id}-${episodeData.id}`;
            if (trackedEpisodeRef.current !== key) {
                trackedEpisodeRef.current = key;
                api.post('/history/track-episode', { episode_id: episodeData.id, anime_id: Number(anime.id), image: episodeData.thumbnail || '' }).catch(() => {});
                trackEpisodeView(episodeData.id);
                getEpisodeStats(episodeData.id).then(data => { setStats(data); setUserReaction(data.user_reaction || null); });
            }
        }
    }, [episodeData?.id, anime?.id]);

    useEffect(() => {
        if (anime && id && episodeNum) {
            const title = lang === 'ar' ? anime.title : (anime.title_en || anime.title);
            const slug = slugify(title);
            if (currentSlug !== slug) navigate(`/${lang}/watch/${id}/${episodeNum}/${slug}${window.location.search}${window.location.hash}`, { replace: true });
        }
    }, [id, episodeNum, anime, currentSlug, lang, navigate]);

    useEffect(() => { setSelectedServer(0); setIsPlayerUnlocked(false); }, [lang, servers]);
    useEffect(() => { setIsPlayerUnlocked(false); }, [selectedServer]);
    useEffect(() => { setDynamicVideoUrl(null); setLastRefreshedId(null); }, [id, episodeNum]);

    useEffect(() => {
        // Auto-refresh Anime3rb logic
        const active = servers[selectedServer];
        if (active?.name.toLowerCase().includes('anime3rb') && currentEpisode?.source_url && !dynamicVideoUrl && !isRefreshingVideo && lastRefreshedId !== `${currentEpisode?.id}-${selectedServer}`) {
            refreshAnime3rbLink(currentEpisode, selectedServer);
        }
    }, [selectedServer, servers, currentEpisode, dynamicVideoUrl, isRefreshingVideo, lastRefreshedId]);



    // ==========================================
    // 6. BUSINESS HANDLERS (Events)
    // ==========================================

    // Generic modal opener helper
    const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
        setter(true);
    };

    // Quality change handler for CustomVideoPlayer
    const handleQualityChange = (qualityUrl: string) => {
        const idx = playerQualities.findIndex((q: any) => q.url === qualityUrl);
        if (idx !== -1 && playerQualities[idx]?.serverId !== undefined) {
            setSelectedServer(playerQualities[idx].serverId);
        }
    };

    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const reactionLeaveTimer = useRef<NodeJS.Timeout | null>(null);
    const reactionEnterTimer = useRef<NodeJS.Timeout | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleLikeMouseEnter = () => { if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current); reactionEnterTimer.current = setTimeout(() => setShowReactionPopup(true), 100); };
    const handleLikeMouseLeave = () => { if (reactionEnterTimer.current) clearTimeout(reactionEnterTimer.current); reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 300); };
    const handlePopupMouseEnter = () => { if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current); };
    const handlePopupMouseLeave = () => { reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 200); };
    const handleTouchStart = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); longPressTimer.current = setTimeout(() => { setShowReactionPopup(true); if (navigator.vibrate) navigator.vibrate(50); }, 500); };
    const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
    const handleTouchMove = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
    const handleLikeClick = () => { if (window.innerWidth < 768) setShowReactionPopup(prev => !prev); else handleReaction('like'); };

    const handleReactionClick = (key: string) => {
        handleReaction(key);
        setShowReactionPopup(false);
    };

    const handleReaction = async (type: string) => {
        if (!currentEpisode?.id) return;
        const prevReaction = userReaction;
        const prevStats = stats;
        
        // Optimistic Update
        setUserReaction(userReaction === type ? null : type);
        try {
            const updated = await toggleEpisodeReaction(currentEpisode.id, type);
            setStats(prev => ({ ...prev, ...updated }));
            setUserReaction(updated.user_reaction || null);
        } catch (e) {
            setUserReaction(prevReaction);
            setStats(prevStats);
            toast.error(lang === 'ar' ? 'فشل التفاعل' : 'Reaction failed');
        }
    };

    const handleShare = (platform: string, url: string, text: string) => {
        let shareUrl = '';
        switch (platform) {
            case 'facebook': shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`; break;
            case 'whatsapp': shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`; break;
            case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`; break;
            case 'copy': navigator.clipboard.writeText(url); toast.success(lang === 'ar' ? 'تم نسخ الرابط' : 'Link copied'); return;
            default: return;
        }
        window.open(shareUrl, '_blank');
    };

    const handleFullscreen = () => {
        const container = document.getElementById('video-container');
        if (!container) return;
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) container.requestFullscreen();
            else if ((container as any).webkitRequestFullscreen) (container as any).webkitRequestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    const handleServerClick = async (idx: number) => {
        if (isDeleteMode) {
            const serverName = servers[idx]?.name;
            if (!serverName) return;
            setDeletingServerIdx(idx);
            try {
                await api.delete(`/animes/${anime?.id}/servers`, { data: { names: [serverName] } });
                queryClient.invalidateQueries({ queryKey: ['anime'] });
                toast.success('Deleted');
            } catch(e) { toast.error('Failed to delete'); }
            finally { setDeletingServerIdx(null); }
            return;
        }
        if (isSwapMode) {
            setSelectedServersForSwap(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : prev.length >= 2 ? [prev[1], idx] : [...prev, idx]);
        } else {
            setIsVideoLoading(true);
            setSelectedServer(idx);
            setDynamicVideoUrl(null);
            const chosenServer = servers[idx];
            if (chosenServer?.name.toLowerCase().includes('anime3rb')) refreshAnime3rbLink(currentEpisode, idx);
        }
    };

    const handleConfirmSwap = async () => {
        if (selectedServersForSwap.length !== 2) return;
        const name1 = servers[selectedServersForSwap[0]].name;
        const name2 = servers[selectedServersForSwap[1]].name;
        let newPriority = [...serverPriority];
        if (!newPriority.includes(name1)) newPriority.push(name1);
        if (!newPriority.includes(name2)) newPriority.push(name2);
        const i1 = newPriority.indexOf(name1);
        const i2 = newPriority.indexOf(name2);
        [newPriority[i1], newPriority[i2]] = [newPriority[i2], newPriority[i1]];
        
        setServerPriority(newPriority);
        if (anime?.id) {
            try {
                await api.patch(`/animes/${anime.id}/server-priority`, { priority: newPriority.join(',') });
                queryClient.invalidateQueries({ queryKey: ['anime', id] });
                toast.success(lang === 'ar' ? 'تم حفظ الترتيب' : 'Order saved');
            } catch (err) { toast.error('Failed to save order'); }
        }
        setSelectedServersForSwap([]);
        setIsSwapMode(false);
    };



    // ==========================================
    // 7. UI CONSTS & SEO HELPERS
    // ==========================================
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const animeTitle = (lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title)) || "";
    const epTitle = (lang === 'ar' ? (episodeData?.title || `حلقة ${episodeNum}`) : (episodeData?.title_en || `Episode ${episodeNum}`)) || "";
    const pageTitle = `${animeTitle} - ${epTitle}`;
    const finalDescription = (lang === 'ar' ? anime?.description : anime?.description_en) || anime?.description || "";
    const metaImage = getImageUrl(episodeData?.thumbnail || anime?.cover || "");
    const canonicalUrl = `${window.location.origin}${window.location.pathname}`;
    const keywords = [animeTitle, epTitle, anime?.studio?.name].filter(Boolean).join(', ');
    const animeReleaseDate = anime?.release_date ? new Date(anime.release_date).toISOString() : null;

    const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": lang === 'ar' ? "الرئيسية" : "Home", "item": `${window.location.origin}/${lang}` },
            { "@type": "ListItem", "position": 2, "name": lang === 'ar' ? "الأنمي" : "Anime", "item": `${window.location.origin}/${lang}/animes` },
            { "@type": "ListItem", "position": 3, "name": animeTitle, "item": `${window.location.origin}/${lang}/watch/${anime?.id}` },
            { "@type": "ListItem", "position": 4, "name": epTitle, "item": canonicalUrl }
        ]
    };

    const schemaData = {
        "@context": "https://schema.org",
        "@type": "TVEpisode",
        "name": pageTitle,
        "description": finalDescription,
        "episodeNumber": String(episodeNum),
        "image": metaImage,
        "partOfSeries": { "@type": "TVSeries", "name": animeTitle }
    };

    const isLoading = isQueryLoading || episodeLoading || isLoadingActiveEpisode;
    const videoUrl = dynamicVideoUrl || servers[selectedServer]?.url || "";
    const shouldIndex = !!(anime && currentEpisode && !episodeError);

    const REACTIONS = [
        { key: 'like', label: lang === 'ar' ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: lang === 'ar' ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: lang === 'ar' ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: lang === 'ar' ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: lang === 'ar' ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: lang === 'ar' ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: lang === 'ar' ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
    ];

    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
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

            <div className="animate-fade-in w-full">
                {/* Sticky NewsTicker at top below header (60px) */}
                <div className="sticky top-[60px] z-[40] bg-white dark:bg-black w-full border-b border-gray-100 dark:border-white/5">
                    <NewsTicker />
                </div>

                {/* === MAIN LAYOUT GRID === */}
                <div className="w-full min-h-screen">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible min-h-screen">

                        {/* Left Sidebar - ALWAYS VISIBLE */}
                        <div className="hidden lg:block lg:col-span-2 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-white dark:bg-black z-30">
                            <SocialNavSidebar />
                        </div>

                        {/* Dynamic Main Content & Right Sidebar */}
                        {(!anime || !currentEpisode || isLoading || isLoadingActiveEpisode) ? (
                            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[3px] animate-fade-in">
                                <CentralSpinner />
                            </div>
                        ) : (
                            <>
                                {/* Main Content - col-span-7 */}
                                <div className="col-span-1 lg:col-span-7 px-0 md:px-0 lg:px-6 pb-6 space-y-4">
                                    <div className="max-w-[900px] mx-auto space-y-4">

                                        {/* Video Player Post Container (Matches Community PostCard exactly) */}
                                        <div className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a] overflow-hidden mt-0 md:mt-4">
                                            
                                            {/* 1. Player - Now at the Top */}
                                            <div 
                                                id="video-container" 
                                                className="w-full aspect-video bg-black relative group md:rounded-t-xl overflow-visible"
                                            >
                                                {!isPlayerUnlocked && (
                                                    <button 
                                                        type="button"
                                                        className="absolute inset-0 z-40 flex items-center justify-center group/gate overflow-hidden cursor-pointer"
                                                        style={{ 
                                                            backgroundColor: 'black',
                                                            width: '100%',
                                                            height: '100%',
                                                            border: 'none',
                                                            padding: 0,
                                                            margin: 0,
                                                            display: 'flex',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                        }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            
                                                            const adUrl = 'https://www.profitablecpmratenetwork.com/f0u9ij8um1?key=17c19d88db706037ed0f39cbce40ebcc';
                                                            
                                                            // Most reliable way to open popup in a click handler
                                                            const win = window.open(adUrl, '_blank');
                                                            if (win) {
                                                                win.focus();
                                                            } else {
                                                                // Fallback for some browsers
                                                                const link = document.createElement('a');
                                                                link.href = adUrl;
                                                                link.target = '_blank';
                                                                link.rel = 'noopener noreferrer';
                                                                link.click();
                                                            }

                                                            // Delay to ensure the browser registers the window.open before removing the element
                                                            setTimeout(() => {
                                                                setIsPlayerUnlocked(true);
                                                            }, 400);
                                                        }}
                                                    >
                                                        {/* Background Episode Image */}
                                                        <div 
                                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover/gate:scale-105 pointer-events-none"
                                                            style={{ backgroundImage: `url(${metaImage})`, pointerEvents: 'none' }}
                                                        >
                                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                                                        </div>

                                                        {/* Large White Triangle (Play Button) */}
                                                        <div className="relative z-10 transition-all duration-300 transform group-hover/gate:scale-110 group-active/gate:scale-95 pointer-events-none">
                                                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50 shadow-2xl">
                                                                <Play className="w-12 h-12 md:w-16 md:h-16 text-white fill-white ml-2" />
                                                            </div>
                                                        </div>

                                                        {/* Hint Text */}
                                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold text-sm md:text-base opacity-80 group-hover/gate:opacity-100 transition-opacity whitespace-nowrap bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
                                                            {lang === 'ar' ? 'اضغط للتشغيل' : 'Click to Play'}
                                                        </div>
                                                    </button>
                                                )}

                                                {videoUrl ? (
                                                    <>
                                                        {isVideoFile(videoUrl) ? (
                                                            <CustomVideoPlayer
                                                                src={videoUrl}
                                                                poster={metaImage}
                                                                qualities={playerQualities}
                                                                onQualityChange={handleQualityChange}
                                                                currentQuality={playerQualities.find((q: any) => q.url === videoUrl)?.label}
                                                                autoPlay={isPlayerUnlocked}
                                                            />
                                                        ) : (
                                                            <iframe 
                                                                id="video-player-iframe" 
                                                                src={videoUrl} 
                                                                className="w-full h-full border-0" 
                                                                allowFullScreen={true}
                                                                // @ts-ignore
                                                                webkitallowfullscreen="true"
                                                                // @ts-ignore
                                                                mozallowfullscreen="true"
                                                                // @ts-ignore
                                                                msallowfullscreen="true"
                                                                allow="autoplay; fullscreen; picture-in-picture"
                                                                referrerPolicy="no-referrer"
                                                                onLoad={() => setIsVideoLoading(false)} 
                                                            />
                                                        )}

                                                        {/* Fullscreen Sensor Layer: Detects move/touch when controls are hidden */}
                                                        {isBrowserFullscreen && (
                                                            <div 
                                                                className={cn(
                                                                    "absolute inset-0 z-30 transition-all duration-300 bg-transparent",
                                                                    showControls ? "pointer-events-none" : "pointer-events-auto cursor-none"
                                                                )}
                                                                onMouseMove={resetControlsTimer}
                                                                onTouchStart={resetControlsTimer}
                                                                onPointerMove={resetControlsTimer}
                                                            />
                                                        )}

                                                        {/* Overlaid Fullscreen Button (Smart-responsive placement) */}
                                                        <div className={cn(
                                                            "z-[100] transition-all duration-300",
                                                            // Logic for Fullscreen vs Normal mode
                                                            isBrowserFullscreen 
                                                                ? (showControls ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none") 
                                                                : "opacity-100 pointer-events-auto",
                                                            // Logic for Mobile (Fixed at bottom screen) vs Desktop (Absolute in player)
                                                            isMobile && !isBrowserFullscreen
                                                                ? "fixed bottom-6 z-[1000]" // Mobile Sticky
                                                                : "absolute bottom-4 z-40", // Desktop Overlay
                                                            // Direction logic
                                                            lang === 'ar' ? "right-4" : "left-4"
                                                        )}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleFullscreen();
                                                                }}
                                                                className={cn(
                                                                    "bg-black/60 backdrop-blur-sm text-white shadow-xl flex items-center justify-center hover:bg-black/90 transition-all border border-white/10 outline-none focus:outline-none ring-0 active:scale-90",
                                                                    isMobile && !isBrowserFullscreen ? "w-14 h-14 rounded-full" : "w-10 h-10 rounded-lg"
                                                                )}
                                                                title={isBrowserFullscreen ? (lang === 'ar' ? 'خروج من ملء الشاشة' : 'Exit Fullscreen') : (lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen')}
                                                            >
                                                                {isBrowserFullscreen ? (
                                                                    <Minimize2 className={cn(isMobile && !isBrowserFullscreen ? "w-7 h-7" : "w-5 h-5", "pointer-events-none")} />
                                                                ) : (
                                                                    <Maximize2 className={cn(isMobile && !isBrowserFullscreen ? "w-7 h-7" : "w-5 h-5", "pointer-events-none")} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-white bg-neutral-900 border-2 border-dashed border-neutral-700 m-2 rounded-lg">
                                                        <div className="text-center">
                                                           <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                                           <p className="text-sm">{lang === 'ar' ? 'جاري تجهيز المشغل...' : 'Preparing player...'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. Post Header (Anime Metadata) - Under Player */}
                                            <div className="p-3 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 flex gap-2 min-w-0 pr-2">
                                                        <Link to={`/${lang}/animes/${lang === 'ar' ? (anime?.slug || anime?.id) : (anime?.slug_en || anime?.slug || anime?.id)}`} className="shrink-0">
                                                            <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] border border-gray-50 dark:border-[#333]">
                                                                <img src={getImageUrl(anime?.cover || anime?.banner)} alt={animeTitle} className="w-full h-full object-cover" />
                                                            </div>
                                                        </Link>
                                                        <div className="flex-1 min-w-0">
                                                            <Link to={`/${lang}/animes/${lang === 'ar' ? (anime?.slug || anime?.id) : (anime?.slug_en || anime?.slug || anime?.id)}`} className="font-bold text-gray-900 dark:text-white hover:underline block leading-tight truncate">
                                                                {renderEmojiContent(animeTitle)}
                                                            </Link>
                                                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-1">
                                                                <span className="text-[11px] font-medium">
                                                                    {(lang === 'ar' ? currentEpisode?.title : currentEpisode?.title_en) || `${lang === 'ar' ? 'الحلقة' : 'Episode'} ${currentEpisode?.episode_number}`}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="text-[11px] font-bold text-black dark:text-white">
                                                                    {lang === 'ar' ? `الحلقة ${currentEpisode?.episode_number}` : `Episode ${currentEpisode?.episode_number}`}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="text-[11px]">{currentEpisode?.duration}m</span>
                                                                <span>•</span>
                                                                <Globe className="w-3 h-3" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors shrink-0" onClick={() => openModal(setIsEpisodeInfoOpen)}>
                                                        <MoreHorizontal className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {(user?.role?.name?.toLowerCase() === 'admin' || user?.role?.name?.toLowerCase() === 'super_admin' || true) && (
                                                    <div className="flex items-center gap-1.5 px-11 -mt-1 flex-wrap">
                                                        <button 
                                                            onClick={() => {
                                                                setIsSwapMode(!isSwapMode);
                                                                setSelectedServersForSwap([]);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                                                                isSwapMode 
                                                                    ? "bg-blue-500 text-white border-blue-600 shadow-md"
                                                                    : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/20"
                                                            )}
                                                            title={lang === 'ar' ? 'تبديل أماكن السيرفرات' : 'Swap Server Positions'}
                                                        >
                                                            <Star className={cn("w-4 h-4", isSwapMode && "animate-spin")} />
                                                            <span className="text-xs font-bold whitespace-nowrap">
                                                                {isSwapMode ? (lang === 'ar' ? 'وضع التبديل نشط' : 'Swap Mode Active') : (lang === 'ar' ? 'تبديل أماكن' : 'Swap Mode')}
                                                            </span>
                                                        </button>

                                                        {isSwapMode && selectedServersForSwap.length === 2 && (
                                                            <button 
                                                                onClick={handleConfirmSwap}
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg transition-all border border-green-600 shadow-lg animate-bounce"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                                <span className="text-xs font-black uppercase">OK</span>
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => {
                                                                setIsDeleteMode(!isDeleteMode);
                                                                setIsSwapMode(false);
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border",
                                                                isDeleteMode 
                                                                    ? "bg-red-500 text-white border-red-600 shadow-md"
                                                                    : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                                                            )}
                                                            title={lang === 'ar' ? 'وضع الحذف' : 'Delete Mode'}
                                                        >
                                                            <Trash2 className={cn("w-4 h-4", isDeleteMode && "animate-pulse")} />
                                                            <span className="text-xs font-bold whitespace-nowrap">
                                                                {isDeleteMode ? (lang === 'ar' ? 'وضع الحذف نشط' : 'Delete Mode Active') : (lang === 'ar' ? 'تحديد حذف السيرفر' : 'Bulk Delete')}
                                                            </span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                             {/* 3. Servers block - Under Header */}
                                            {servers.length > 0 && (
                                                <div className="px-3 pb-3 flex flex-wrap items-center gap-2.5 border-b border-gray-50 dark:border-white/5 relative">
                                                    {servers.map((server: any, idx: number) => {
                                                        const matchedServer = globalServers?.find((gs: any) =>
                                                            gs.name_en === server.name ||
                                                            gs.name_ar === server.name ||
                                                            server.name.includes(gs.name_en) ||
                                                            server.name.includes(gs.name_ar)
                                                        );
                                                        const hasImage = !!matchedServer?.image;
                                                        const isSelected = selectedServer === idx;
                                                        const isSelectedForSwap = selectedServersForSwap.includes(idx);

                                                        return (
                                                            <motion.div
                                                                key={server.name + server.id}
                                                                layout
                                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                            >
                                                                <button
                                                                    onClick={() => handleServerClick(idx)}
                                                                    disabled={(isRefreshingVideo && isSelected) || deletingServerIdx === idx}
                                                                    className={cn(
                                                                        "relative flex items-center justify-center h-8 rounded-lg overflow-hidden transition-all duration-300",
                                                                        hasImage ? "w-20 bg-white dark:bg-[#1a1a1a] p-1" : "px-4 bg-transparent",
                                                                        isSelected && !isDeleteMode
                                                                            ? hasImage
                                                                                ? "bg-gray-200 dark:bg-white text-black dark:text-black font-black shadow-md scale-105"
                                                                                : "bg-black dark:bg-white text-white dark:text-black font-bold font-sans text-sm shadow-md scale-105"
                                                                            : "bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100",
                                                                        isSelectedForSwap && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1a1a1a] scale-110 !opacity-100 !bg-blue-500/10",
                                                                        isDeleteMode && "ring-2 ring-red-500 ring-offset-2 dark:ring-offset-[#1a1a1a] hover:bg-red-500/20 !opacity-100",
                                                                        (isSwapMode || isDeleteMode) ? "cursor-pointer" : "cursor-pointer",
                                                                        (isRefreshingVideo && isSelected) ? "opacity-50 cursor-wait" : "",
                                                                        (deletingServerIdx === idx) && "opacity-50 cursor-wait bg-red-500/50 grayscale"
                                                                    )}
                                                                >
                                                                    {deletingServerIdx === idx ? (
                                                                        <Loader2 className="w-5 h-5 text-red-500 animate-spin absolute" />
                                                                    ) : null}
                                                                    
                                                                    <div className={cn("flex w-full h-full justify-center items-center", deletingServerIdx === idx && "opacity-0")}>
                                                                        {hasImage ? (
                                                                            <img 
                                                                                src={getImageUrl(matchedServer.image)} 
                                                                                alt={server.name} 
                                                                                className={cn(
                                                                                    "w-full h-full object-contain object-center transition-transform pointer-events-none",
                                                                                    (isSelected || isSelectedForSwap) ? "scale-110" : "scale-100",
                                                                                    "mix-blend-multiply dark:mix-blend-normal"
                                                                                )} 
                                                                            />
                                                                        ) : (
                                                                            <span className="text-xs font-bold uppercase tracking-wider pointer-events-none">{server.name}</span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {(isSelectedForSwap || isDeleteMode) && deletingServerIdx !== idx && (
                                                                        <div className={cn(
                                                                            "absolute top-0 right-0 text-white w-4 h-4 flex items-center justify-center rounded-bl-lg",
                                                                            isDeleteMode ? "bg-red-500" : "bg-blue-500"
                                                                        )}>
                                                                            {isDeleteMode ? (
                                                                                <Trash2 className="w-2 h-2" />
                                                                            ) : (
                                                                                <span className="text-[10px]">{selectedServersForSwap.indexOf(idx) + 1}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Stats Row matches Community Exact spacing and styles */}
                                            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-[#2a2a2a] flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1 cursor-pointer hover:underline" onClick={() => handleReaction('like')}>
                                                    {(() => {
                                                        const counts = stats as any || {};
                                                        const totalReactions = (counts.likes_count || 0) + (counts.loves_count || 0) + (counts.hahas_count || 0) + 
                                                                             (counts.wows_count || 0) + (counts.sads_count || 0) + (counts.angrys_count || 0) + 
                                                                             (counts.super_sads_count || 0);
                                                        
                                                        if (totalReactions === 0) return <span>{lang === 'ar' ? 'كن أول من يتفاعل' : 'Be the first to react'}</span>;

                                                        const topReactions = Object.entries({
                                                            like: counts.likes_count || 0,
                                                            love: counts.loves_count || 0,
                                                            haha: counts.hahas_count || 0,
                                                            wow: counts.wows_count || 0,
                                                            sad: counts.sads_count || 0,
                                                            angry: counts.angrys_count || 0,
                                                            super_sad: counts.super_sads_count || 0
                                                        })
                                                        .filter(([_, count]) => count > 0)
                                                        .sort((a, b) => b[1] - a[1])
                                                        .slice(0, 3)
                                                        .map(([key]) => key);

                                                        return (
                                                            <>
                                                                <div className="flex -space-x-1 rtl:space-x-reverse">
                                                                    {topReactions.map((rKey, i) => {
                                                                        const r = REACTIONS.find(rx => rx.key === rKey);
                                                                        if (!r) return null;
                                                                        return (
                                                                            <div key={rKey} className="w-7 h-7 rounded-full relative flex items-center justify-center border-2 border-white dark:border-[#1a1a1a] shadow-sm bg-white overflow-hidden pointer-events-none" style={{ zIndex: 3 - i }}>
                                                                                <img src={r.gif} alt={r.label} className="w-full h-full object-cover scale-110" />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <span className="font-medium text-gray-600 dark:text-gray-300 ml-1">{formatNumber(totalReactions)}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="flex gap-3">
                                                    <span className="cursor-pointer hover:underline" onClick={() => {
                                                        const commentsEl = document.getElementById('comments-section');
                                                        if (commentsEl) commentsEl.scrollIntoView({ behavior: 'smooth' });
                                                    }}>{formatNumber(commentsData?.length || 0)} {lang === 'ar' ? 'تعليقات' : 'Comments'}</span>
                                                    <span>{formatNumber(stats?.views_count || 0)} {lang === 'ar' ? 'مشاهدة' : 'Views'}</span>
                                                </div>
                                            </div>

                                            {/* Facebook style Action Bar - Matches exactly PostCard action buttons padding/margins */}
                                            <div className="px-1 py-0.5 flex items-center gap-1">
                                                <div 
                                                    className="flex-1 relative"
                                                    onMouseEnter={handleLikeMouseEnter}
                                                    onMouseLeave={handleLikeMouseLeave}
                                                >
                                                    {/* Like button with FB-style reaction UI */}
                                                    {(() => {
                                                        const activeReaction = REACTIONS.find(r => r.key === userReaction);
                                                        return (
                                                            <button
                                                                onClick={handleLikeClick}
                                                                onTouchStart={handleTouchStart}
                                                                onTouchEnd={handleTouchEnd}
                                                                onTouchMove={handleTouchMove}
                                                                className={cn(
                                                                    "w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold",
                                                                    userReaction
                                                                        ? (userReaction === 'like' ? "text-blue-500" : 
                                                                           userReaction === 'love' ? "text-red-500" : 
                                                                           "text-yellow-500") + " hover:bg-white dark:hover:bg-[#2a2a2a] shadow-sm border border-gray-100 dark:border-transparent"
                                                                        : "text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-[#2a2a2a] hover:shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-transparent"
                                                                )}
                                                            >
                                                                {activeReaction ? (
                                                                    <img src={activeReaction.gif} className="w-5 h-5 object-contain scale-125" alt={activeReaction.label} />
                                                                ) : (
                                                                    <ThumbsUp className="w-5 h-5" />
                                                                )}
                                                                <span className={cn(activeReaction && "text-sm")}>
                                                                    {activeReaction ? activeReaction.label : (lang === 'ar' ? 'أعجبني' : 'Like')}
                                                                </span>
                                                            </button>
                                                        );
                                                    })()}
                                                    {/* Reaction Popup */}
                                                    {showReactionPopup && (
                                                        <div
                                                            className={cn(
                                                                "absolute bottom-[calc(100%+12px)] z-50",
                                                                lang === 'ar' ? "right-0" : "left-0"
                                                            )}
                                                            style={{ animation: 'reactionPopupIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}
                                                            onMouseEnter={handlePopupMouseEnter}
                                                            onMouseLeave={handlePopupMouseLeave}
                                                        >
                                                            {/* Arrow pointer */}
                                                            <div className={cn(
                                                                "absolute -bottom-1.5 w-3 h-3 rotate-45 bg-white dark:bg-[#2a2a2a] border-r border-b border-gray-100 dark:border-[#444]",
                                                                lang === 'ar' ? "right-6" : "left-6"
                                                            )} />
                                                            <div className="relative flex items-center justify-center gap-0.5 md:gap-1 bg-white dark:bg-[#2a2a2a] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.22)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] border border-gray-100 dark:border-[#444] px-1.5 py-1 md:px-2.5 md:py-2 w-max min-w-max overflow-visible">
                                                                {REACTIONS.map((r, idx) => (
                                                                    <div
                                                                        key={r.key}
                                                                        className="relative flex flex-col items-center cursor-pointer px-0.5"
                                                                        style={{ animationDelay: `${idx * 40}ms` }}
                                                                        onClick={() => handleReactionClick(r.key)}
                                                                        onMouseEnter={() => setHoveredReaction(r.key)}
                                                                        onMouseLeave={() => setHoveredReaction(null)}
                                                                    >
                                                                        {/* Floating label above emoji */}
                                                                        <div className={cn(
                                                                            "absolute -top-7 md:-top-9 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 whitespace-nowrap",
                                                                            hoveredReaction === r.key
                                                                                ? "opacity-100 -translate-y-0 scale-100"
                                                                                : "opacity-0 translate-y-2 scale-90"
                                                                        )}>
                                                                            <span className="inline-block bg-[#1c1c1c] dark:bg-white text-white dark:text-black text-[9px] md:text-[11px] font-bold px-1.5 py-0.5 md:px-2 rounded-full shadow-lg leading-tight">
                                                                                {r.label}
                                                                            </span>
                                                                        </div>
                                                                        {/* GIF Image */}
                                                                        <img
                                                                            src={r.gif}
                                                                            alt={r.label}
                                                                            draggable={false}
                                                                            loading="eager"
                                                                            fetchPriority="high"
                                                                            className={cn(
                                                                                "select-none transition-all duration-200 rounded-full object-cover",
                                                                                hoveredReaction === r.key
                                                                                    ? "w-14 h-14 md:w-14 md:h-14 -translate-y-2 md:-translate-y-3 scale-100"
                                                                                    : "w-11 h-11 md:w-9 md:h-9 translate-y-0"
                                                                            )}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Desktop: Comment Button (Part of Grid) */}
                                                <button
                                                    className="hidden md:flex flex-1 items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-[14px] md:text-[15px] text-black dark:text-white hover:bg-white dark:hover:bg-[#2a2a2a] border border-transparent hover:border-gray-100 dark:hover:border-transparent shadow-sm"
                                                    onClick={() => {
                                                        const commentsEl = document.getElementById('comments-section');
                                                        if (commentsEl) commentsEl.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                >
                                                    <MessageCircle className="w-5 h-5 text-black dark:text-white" />
                                                    <span className="text-black dark:text-white">{lang === 'ar' ? 'تعليق' : 'Comment'} {commentsData?.length ? `(${formatNumber(commentsData.length)})` : ''}</span>
                                                </button>

                                                <button
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-[13px] md:text-[14px] text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-[#2a2a2a] border border-transparent hover:border-gray-100 dark:hover:border-transparent shadow-sm"
                                                    onClick={() => openModal(setIsShareModalOpen)}
                                                >
                                                    <Share2 className="w-5 h-5" />
                                                    <span>{lang === 'ar' ? 'مشاركة' : 'Share'}</span>
                                                </button>

                                                <div className="flex-1 flex items-center justify-center font-bold text-[13px] md:text-[14px] text-gray-500 dark:text-gray-400">
                                                    <WatchLaterButton
                                                        animeId={Number(anime?.id)}
                                                        episodeId={Number(currentEpisode?.id)}
                                                        episodeTitle={epTitle}
                                                        episodeNumber={currentEpisode?.episode_number}
                                                        episodeImage={getImageUrl(currentEpisode?.thumbnail)}
                                                        variant="default"
                                                        className="w-full flex items-center justify-center gap-2 py-2 h-auto rounded-lg hover:bg-white dark:hover:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 px-0 [&_svg]:w-5 [&_svg]:h-5 bg-transparent border-0 font-bold hover:shadow-sm hover:border hover:border-gray-100 dark:hover:border-transparent"
                                                        showLabel={true}
                                                    />
                                                </div>
                                            </div>

                                            {/* Mobile: Prominent Comments & Episodes Buttons (Full Width Rows) */}
                                            <div className="md:hidden px-4 pb-4 space-y-3">
                                                <button
                                                    onClick={() => setIsMobileCommentsOpen(true)}
                                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-black dark:text-white transition-all active:scale-[0.98] shadow-sm"
                                                >
                                                    <MessageCircle className="w-6 h-6 stroke-[2.5px]" />
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <span className="text-[16px] font-black uppercase tracking-tight">
                                                            {lang === 'ar' ? 'التعليقات' : 'Comments'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                            {formatNumber(commentsData?.length || 0)} {lang === 'ar' ? 'تعليق' : 'Comments'}
                                                        </span>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => setIsEpisodesModalOpen(true)}
                                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-black dark:text-white transition-all active:scale-[0.98] shadow-sm"
                                                >
                                                    <Library className="w-6 h-6 stroke-[2.5px]" />
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <span className="text-[16px] font-black uppercase tracking-tight">
                                                            {lang === 'ar' ? 'حلقات المسلسل' : 'Anime Episodes'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                            {filteredEpisodesFlattened.length} {lang === 'ar' ? 'حلقة' : 'Episodes'}
                                                        </span>
                                                    </div>
                                                </button>
                                            </div>

                                            <div className="hidden md:block border-t border-gray-100 dark:border-[#2a2a2a] p-4 bg-white dark:bg-black/20 pb-20 lg:pb-4 max-md:[&_.text-lg]:text-[15px] max-md:[&_p_img.inline-block]:!w-[22px] max-md:[&_p_img.inline-block]:!h-[22px] max-md:[&_.w-10]:w-8 max-md:[&_.w-10]:h-8" id="comments-section">
                                               
                                                <div className="min-h-[100px]">
                                                    <CommentsSection 
                                                        ref={commentsSectionRef}
                                                        itemId={Number(currentEpisode?.id)} 
                                                        type="episode" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* Right Sidebar - Episodes List */}
                                <div ref={sidebarRef} className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30 px-2 pt-2 md:pt-4 pb-4">
                                    <div className="flex items-center justify-between px-2 border-b border-gray-200 dark:border-[#333] pb-2 mb-2">
                                        <h3 className="font-black text-gray-900 dark:text-gray-400 text-base md:text-lg">
                                            {lang === 'ar' ? 'حلقات الأنمي' : 'Anime Episodes'}
                                        </h3>
                                        <button
                                            onClick={() => openModal(setIsEpisodesModalOpen)}
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
                                        {displayedEpisodesView.length > 0 ? (
                                            <>
                                                {displayedEpisodesView.map((ep: any) => {
                                                    const isActive = Number(ep.episode_number) === Number(episodeNum);
                                                    const epItemTitle = lang === 'ar' ? (ep.title || `الحلقة ${ep.episode_number}`) : (ep.title_en || `Episode ${ep.episode_number}`);
                                                    const epUrl = `/${lang}/watch/${anime?.id || ep.anime_id}/${ep.episode_number}/${slugify(lang === 'ar' ? anime?.title : (anime?.title_en || anime?.title))}`;

                                                    return (
                                                        <div
                                                            key={ep.id}
                                                            className={cn(
                                                                "group flex items-center gap-0 px-2 py-1.5 border-b border-gray-50 dark:border-white/5 last:border-0 transition-all",
                                                                isActive ? "bg-gray-100 dark:bg-neutral-800" : "hover:bg-white dark:hover:bg-[#222] hover:shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-transparent"
                                                            )}
                                                        >
                                                            <Link
                                                                to={epUrl}
                                                            className="flex-1 flex items-center min-w-0"
                                                        >
                                                            {/* Left: Indicator */}
                                                            <div className={cn(
                                                                "w-10 flex-shrink-0 text-sm font-black text-center transition-colors",
                                                                isActive ? "text-blue-500" : "text-gray-900 dark:text-gray-100"
                                                            )}>
                                                                #{ep.episode_number}
                                                            </div>

                                                            {/* Center: Title */}
                                                            <div className="flex-1 min-w-0 px-2">
                                                                <h4 className={cn(
                                                                    "text-[13px] transition-colors truncate",
                                                                    isActive ? "text-blue-600 dark:text-blue-400 font-bold" : "font-medium text-gray-700 dark:text-gray-300"
                                                                )}>
                                                                    {epItemTitle}
                                                                </h4>
                                                            </div>
                                                        </Link>

                                                        {/* Right: Actions or Duration */}
                                                        <div className="flex-shrink-0 flex items-center min-w-[70px] justify-end">
                                                            {/* Default: Duration - Hidden on hover or if active (to show actions consistently if needed) */}
                                                            <span className={cn(
                                                                "text-[11px] transition-colors",
                                                                isActive ? "text-blue-500 font-bold group-hover:hidden" : "text-gray-400 group-hover:hidden"
                                                            )}>
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
                                                                    className="p-1 h-7 w-7 rounded-sm hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent border-0"
                                                                    showLabel={false}
                                                                />
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setIsShareModalOpen(true);
                                                                    }}
                                                                    className="p-1 h-7 w-7 rounded-sm hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors px-0 py-0 border-0 bg-transparent shadow-none"
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
                                                    <motion.div 
                                                        ref={observerRef} 
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="py-4 flex flex-col items-center justify-center gap-2 border-t border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/5 backdrop-blur-sm overflow-hidden"
                                                    >
                                                        <div className="flex gap-1.5">
                                                            {[0, 1, 2].map((i) => (
                                                                <motion.div
                                                                    key={i}
                                                                    animate={{
                                                                        scale: [1, 1.4, 1],
                                                                        opacity: [0.3, 1, 0.3],
                                                                    }}
                                                                    transition={{
                                                                        duration: 0.8,
                                                                        repeat: Infinity,
                                                                        delay: i * 0.15,
                                                                    }}
                                                                    className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">
                                                            {lang === 'ar' ? 'جاري جلب الحلقات' : 'Fetching Episodes'}
                                                        </span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
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
                    </div>{/* end grid-cols-12 */}
                </div>{/* end main grid wrapper */}

                {/* ===== MODALS ===== */}
                <EpisodesModal
                    isOpen={isEpisodesModalOpen}
                    onClose={() => setIsEpisodesModalOpen(false)}
                    episodes={filteredEpisodesFlattened}
                    activeEpisodeNum={Number(episodeNum)}
                    animeId={Number(anime?.id)}
                    slug={currentSlug}
                    lang={lang}
                    isLoading={isQueryLoading}
                    getImageUrl={getImageUrl}
                    getRelativeTime={getRelativeTime}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                />

                <MobileCommentsModal
                    isOpen={isMobileCommentsOpen}
                    onClose={() => setIsMobileCommentsOpen(false)}
                    episodeId={Number(currentEpisode?.id)}
                />

                {currentEpisode && (
                    <ShareModal
                        episode={currentEpisode}
                        anime={anime}
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                    />
                )}

                {currentEpisode && (
                    <EpisodeInfoMenu
                        episode={currentEpisode}
                        anime={anime}
                        onDownload={() => console.log('Download clicked')}
                        onReport={() => openModal(setIsReportModalOpen)}
                        onShare={() => openModal(setIsShareModalOpen)}
                        isOpen={isEpisodeInfoOpen}
                        onClose={() => setIsEpisodeInfoOpen(false)}
                    />
                )}

                {currentEpisode && (
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
                )}

            </div>
        </div>
    );
}