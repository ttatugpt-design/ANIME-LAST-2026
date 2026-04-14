import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Reorder, motion } from "framer-motion";
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
import BulkDeleteServersModal from '@/components/episodes/BulkDeleteServersModal';
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

    // State
    const [activeTab, setActiveTab] = useState<'episodes' | 'comments'>('episodes');
    const [selectedServer, setSelectedServer] = useState<number>(0);
    const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState(false);
    const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEpisodeInfoOpen, setIsEpisodeInfoOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [selectedServersForSwap, setSelectedServersForSwap] = useState<number[]>([]);
    const [showMobileActions, setShowMobileActions] = useState(false);
    const activeEpisodeRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Mobile Expansion State
    const [isEpisodesExpanded, setIsEpisodesExpanded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

    // Episode Stats State
    const [stats, setStats] = useState<EpisodeStats | null>(null);
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState<string | null>(null);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [isRefreshingVideo, setIsRefreshingVideo] = useState(false);
    const [dynamicVideoUrl, setDynamicVideoUrl] = useState<string | null>(null);
    const backgroundScrapedRef = useRef<string | null>(null);

    // Fetch Anime Data (includes episodes) using id
    const { data: anime, isLoading: isQueryLoading } = useQuery({
        queryKey: ["anime", id],
        queryFn: async () => {
            const response = await api.get(`/animes/${id}`);
            return response.data;
        },
        enabled: !!id,
    });

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint is usually where sidebar moves
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Fullscreen change listener
    const [showControls, setShowControls] = useState(true);
    const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resetControlsTimer = useCallback(() => {
        if (!isBrowserFullscreen) {
            setShowControls(true);
            return;
        }
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000); // Hide after 3 seconds of inactivity
    }, [isBrowserFullscreen]);

    useEffect(() => {
        const handleFSChange = () => {
            const isFS = !!document.fullscreenElement;
            setIsBrowserFullscreen(isFS);
            if (!isFS) {
                setShowControls(true);
                if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
            } else {
                resetControlsTimer();
            }
        };
        document.addEventListener('fullscreenchange', handleFSChange);
        document.addEventListener('webkitfullscreenchange', handleFSChange);
        document.addEventListener('mozfullscreenchange', handleFSChange);
        document.addEventListener('MSFullscreenChange', handleFSChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFSChange);
            document.removeEventListener('webkitfullscreenchange', handleFSChange);
            document.removeEventListener('mozfullscreenchange', handleFSChange);
            document.removeEventListener('MSFullscreenChange', handleFSChange);
        };
    }, [resetControlsTimer]);

    useEffect(() => {
        if (isBrowserFullscreen) {
            window.addEventListener('mousemove', resetControlsTimer);
            window.addEventListener('touchstart', resetControlsTimer);
            window.addEventListener('click', resetControlsTimer);
            resetControlsTimer();
        } else {
            window.removeEventListener('mousemove', resetControlsTimer);
            window.removeEventListener('touchstart', resetControlsTimer);
            window.removeEventListener('click', resetControlsTimer);
            setShowControls(true);
        }
        return () => {
            window.removeEventListener('mousemove', resetControlsTimer);
            window.removeEventListener('touchstart', resetControlsTimer);
            window.removeEventListener('click', resetControlsTimer);
        };
    }, [isBrowserFullscreen, resetControlsTimer]);

    // Handling mobile back button to close modals
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            // Close all modals when back button is pressed
            setIsEpisodesModalOpen(false);
            setIsMobileCommentsOpen(false);
            setIsReportModalOpen(false);
            setIsEpisodeInfoOpen(false);
            setIsShareModalOpen(false);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const openModal = useCallback((setter: (v: boolean) => void) => {
        setter(true);
        window.history.pushState({ modalOpen: true }, '');
    }, []);

    // Hover State
    const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const commentsSectionRef = useRef<any>(null);

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

    // Reaction popup
    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reactionEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const REACTIONS = [
        { key: 'like', label: lang === 'ar' ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: lang === 'ar' ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: lang === 'ar' ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: lang === 'ar' ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: lang === 'ar' ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: lang === 'ar' ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: lang === 'ar' ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
    ];

    // Server Ordering Logic
    const [serverPriority, setServerPriority] = useState<string[]>([]);
    
    // Load priority from anime data instead of localStorage
    useEffect(() => {
        if (anime?.server_priority) {
            try {
                setServerPriority(anime.server_priority.split(','));
            } catch (e) {
                console.error("Failed to parse server priority", e);
            }
        }
    }, [anime]);

    const saveServerPriority = async (newOrder: string[]) => {
        setServerPriority(newOrder);
        
        // Save to database regardless of role
        if (anime?.id) {
            try {
                const priorityString = newOrder.join(',');
                await api.patch(`/animes/${anime.id}/server-priority`, {
                    priority: priorityString
                });
                // Invalidate anime query so that on next load the new order is fetched
                queryClient.invalidateQueries({ queryKey: ['anime', id] });
                toast.success(lang === 'ar' ? 'تم حفظ الترتيب في قاعدة البيانات ✓' : 'Server order saved to database ✓');
            } catch (err) {
                console.error('Failed to save server priority:', err);
                toast.error(lang === 'ar' ? 'فشل حفظ الترتيب في قاعدة البيانات' : 'Failed to save server order to database');
            }
        }
    };

    const handleConfirmSwap = () => {
        if (selectedServersForSwap.length !== 2) return;
        
        const [idx1, idx2] = selectedServersForSwap;
        if (idx1 === idx2) return;

        // name1 and name2 are names of servers in the CURRENT filtered list
        const name1 = servers[idx1].name;
        const name2 = servers[idx2].name;

        // Create copy of global priority list
        let newPriority = [...serverPriority];

        // Ensure both names exist in priority list to perform the swap
        if (!newPriority.includes(name1)) newPriority.push(name1);
        if (!newPriority.includes(name2)) newPriority.push(name2);

        // Find positions in global list and swap
        const gIdx1 = newPriority.indexOf(name1);
        const gIdx2 = newPriority.indexOf(name2);
        
        [newPriority[gIdx1], newPriority[gIdx2]] = [newPriority[gIdx2], newPriority[gIdx1]];

        saveServerPriority(newPriority);
        toast.success(lang === 'ar' ? 'تم تبديل الأماكن بنجاح' : 'Positions swapped successfully');
        
        setSelectedServersForSwap([]);
        setIsSwapMode(false);
    };


    const handleServerClick = async (idx: number) => {
        if (isSwapMode) {
            setSelectedServersForSwap(prev => {
                if (prev.includes(idx)) {
                    return prev.filter(i => i !== idx);
                }
                if (prev.length >= 2) {
                    return [prev[1], idx];
                }
                return [...prev, idx];
            });
        } else {
            setIsVideoLoading(true);
            setSelectedServer(idx);
            setDynamicVideoUrl(null); // reset

            const chosenServer = servers[idx];
            if (chosenServer && (chosenServer.name.toLowerCase().includes('anime3rb') || chosenServer.url.includes('anime3rb.com'))) {
                setIsRefreshingVideo(true);
                try {
                    const res = await api.post('/scraper/anime3rb-refresh', {
                        source_url: currentEpisode.source_url,
                        episode_id: currentEpisode.id
                    });
                    if (res.data?.url) {
                        setDynamicVideoUrl(res.data.url);
                    }
                } catch (e) {
                    console.error("Anime3rb fetch failed", e);
                    toast.error(lang === 'ar' ? 'فشل جلب رابط السيرفر من المصدر' : 'Failed to fetch server link');
                } finally {
                    setIsRefreshingVideo(false);
                }
            }
        }
    };

    const handleLikeMouseEnter = () => {
        if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current);
        reactionEnterTimer.current = setTimeout(() => setShowReactionPopup(true), 100);
    };
    const handleLikeMouseLeave = () => {
        if (reactionEnterTimer.current) clearTimeout(reactionEnterTimer.current);
        reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 300);
    };
    const handlePopupMouseEnter = () => {
        if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current);
    };
    const handlePopupMouseLeave = () => {
        reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 200);
    };

    const handleLikeClick = () => {
        if (window.innerWidth < 768) {
            setShowReactionPopup(prev => !prev);
        } else {
            handleReaction('like');
        }
    };

    // Mobile Long Press Handlers

    // Mobile Long Press Handlers
    const handleTouchStart = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            setShowReactionPopup(true);
            if (navigator.vibrate) navigator.vibrate(50); // Feedback
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleTouchMove = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
    const handleReactionClick = (reactionKey: string) => {
        setShowReactionPopup(false);
        handleReaction(reactionKey);
    };

    const keepCardOpen = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };




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

    // Fetch Global Servers (for mapping images)
    const { data: globalServers } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => {
            const response = await api.get('/servers');
            return response.data;
        },
    });

    // Derived Data
    const episodesList = useMemo(() => {
        return anime?.episodes || episodesData || [];
    }, [anime, episodesData]);

    const filteredEpisodes = useMemo(() => {
        if (!anime?.id) return [];
        return episodesList.filter((ep: any) => Number(ep.anime_id) === Number(anime.id) && ep.is_published);
    }, [episodesList, anime?.id]);

    // Fetch specific active episode directly to bypass pagination limits
    const { data: activeEpisodeData, isLoading: isLoadingActiveEpisode } = useQuery({
        queryKey: ["activeEpisode", id, episodeNum],
        queryFn: async () => {
            const response = await api.get('/episodes', {
                params: {
                    anime_id: id,
                    episode_number: episodeNum
                }
            });
            return response.data[0]; // Backend returns array of 1 for specific match
        },
        enabled: !!id && !!episodeNum,
    });

    // Determine Current Episode
    const currentEpisode = useMemo(() => {
        if (activeEpisodeData) return activeEpisodeData;
        if (!filteredEpisodes.length) return null;
        return filteredEpisodes.find((ep: any) => Number(ep.episode_number) === Number(episodeNum));
    }, [activeEpisodeData, filteredEpisodes, episodeNum]);

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

        const filtered = allServers.filter((server: any) => {
            // If distinct language field exists
            if (server.language) {
                return server.language.toLowerCase() === (lang === 'ar' ? 'ar' : 'en');
            }
            // Fallback: If no language field, maybe show all (or hide all if strict)?
            return true;
        });

        // Sort based on priority
        if (serverPriority.length > 0) {
            return [...filtered].sort((a: any, b: any) => {
                const indexA = serverPriority.indexOf(a.name);
                const indexB = serverPriority.indexOf(b.name);
                
                // If both are in priority list, sort by their position
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // If only one is in priority list, it goes first
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                // If neither are in list, keep original order
                return 0;
            });
        }
        return filtered;
    }, [currentEpisode, episodeData, lang, serverPriority]);

    // Derive qualities for the custom player
    const playerQualities = useMemo(() => {
        const currentServer = servers[selectedServer];
        if (!currentServer || !isVideoFile(currentServer.url)) return [];

        const qualityRegex = /(\d{3,4}p)/i;
        const currentName = currentServer.name;
        const currentUrl = currentServer.url;

        // Try to find quality in name or URL
        const extractQuality = (name: string, url: string) => {
            const nameMatch = name.match(qualityRegex);
            if (nameMatch) return nameMatch[0].toLowerCase();
            const urlMatch = url.match(qualityRegex);
            if (urlMatch) return urlMatch[0].toLowerCase();
            return null;
        };

        const currentQualityLabel = extractQuality(currentName, currentUrl);

        // Find all direct servers and try to extract their qualities
        const directServers = servers.filter((s: any) => isVideoFile(s.url));
        
        const qualitiesMap = directServers.map((s: any) => {
            const label = extractQuality(s.name, s.url);
            return {
                label: label || s.name,
                url: s.url,
                serverId: servers.indexOf(s)
            };
        });

        // Dedup by label if needed, or just return all
        if (qualitiesMap.length > 1) {
            return qualitiesMap;
        }

        return [{ label: currentQualityLabel || 'Original', url: currentServer.url, serverId: selectedServer }];
    }, [servers, selectedServer]);

    const handleQualityChange = (url: string) => {
        const quality = playerQualities.find((q: any) => q.url === url);
        if (quality) {
            setSelectedServer(quality.serverId);
        }
    };

    // Infinite Scroll Logic for Episodes
    const initialPage = useMemo(() => {
        if (!episodeNum) return 1;
        // Calculate which page the current episode number belongs to (25 per page)
        return Math.max(1, Math.ceil(Number(episodeNum) / 25));
    }, [episodeNum]);

    const { 
        data: infiniteEpisodesData, 
        fetchNextPage, 
        hasNextPage, 
        isFetchingNextPage 
    } = useInfiniteQuery({
        queryKey: ["episodes-infinite", anime?.id],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await api.get(`/episodes`, { 
                params: { 
                    anime_id: anime?.id,
                    paginate: true,
                    limit: 25,
                    page: pageParam
                } 
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.last_page) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        enabled: !!anime?.id,
        initialPageParam: 1, // Start from page 1 and auto-expand to include current episode
    });
    const { ref: observerRef, inView } = useInView({
        threshold: 0.1,
        rootMargin: '400px',
    });

    // Trigger next page when sentinel is in view
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const filteredEpisodesFlattened = useMemo(() => {
        return infiniteEpisodesData?.pages.flatMap(page => page.data) || [];
    }, [infiniteEpisodesData]);

    // Sidebar scroll listener - works with the sidebar's own scroll container
    useEffect(() => {
        const container = sidebarRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            // Trigger when within 200px of bottom
            if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Auto-expand until active episode is visible (fetch enough pages)
    useEffect(() => {
        if (episodeNum && hasNextPage && !isFetchingNextPage) {
            const num = Number(episodeNum);
            const maxVisible = filteredEpisodesFlattened.length > 0
                ? Math.max(...filteredEpisodesFlattened.map(e => Number(e.episode_number)))
                : 0;
            if (num > maxVisible) {
                fetchNextPage();
            }
        }
    }, [episodeNum, filteredEpisodesFlattened.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const displayedEpisodesView = filteredEpisodesFlattened;

    // Reset selected server when language changes or filtered servers change
    useEffect(() => {
        setSelectedServer(0);
    }, [lang, servers]);

    // On-demand Server logic has been moved to handleServerClick

    const { data: commentsData } = useQuery({
        queryKey: ['comments', currentEpisode?.id],
        queryFn: async () => {
            if (!currentEpisode?.id) return [];
            const response = await api.get(`/episodes/${currentEpisode.id}/comments`);
            return response.data;
        },
        enabled: !!currentEpisode?.id
    });


    const handleReaction = async (reactionType: string) => {
        if (!currentEpisode?.id) return;

        const previousReaction = userReaction;
        const previousCounts = { ...stats };
        
        // Optimistic UI update
        const newStats = { ...stats } as EpisodeStats;
        let newUserReaction: string | null = reactionType;
        
        if (previousReaction === reactionType) {
            // Toggling SAME reaction off
            newUserReaction = null;
            const col = getReactionColumn(reactionType);
            if (col && (newStats as any)[col] !== undefined) {
                (newStats as any)[col] = Math.max(0, (newStats as any)[col] - 1);
            }
        } else {
            // Changing or adding reaction
            if (previousReaction) {
                const oldCol = getReactionColumn(previousReaction);
                if (oldCol && (newStats as any)[oldCol] !== undefined) {
                    (newStats as any)[oldCol] = Math.max(0, (newStats as any)[oldCol] - 1);
                }
            }
            const newCol = getReactionColumn(reactionType);
            if (newCol && (newStats as any)[newCol] !== undefined) {
                (newStats as any)[newCol] = ((newStats as any)[newCol] || 0) + 1;
            }
        }
        
        setUserReaction(newUserReaction);
        setStats(newStats);

        try {
            const updatedStats = await toggleEpisodeReaction(currentEpisode.id, reactionType);
            setStats(prev => ({ ...prev, ...updatedStats }));
            setUserReaction(updatedStats.user_reaction || null);
        } catch (err: any) {
            console.error('Failed to toggle reaction:', err);
            const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
            // Revert on error
            setUserReaction(previousReaction);
            setStats(previousCounts as any);
            toast.error(`${lang === 'ar' ? 'فشل التفاعل' : 'Failed to react'}: ${errorMsg}`);
        }
    };

    // Helper to map reaction key to stats column
    const getReactionColumn = (type: string) => {
        switch (type) {
            case 'like': return 'likes_count';
            case 'love': return 'loves_count';
            case 'haha': return 'hahas_count';
            case 'wow': return 'wows_count';
            case 'sad': return 'sads_count';
            case 'angry': return 'angrys_count';
            case 'super_sad': return 'super_sads_count';
            default: return null;
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

    const handleFullscreen = () => {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        if (!document.fullscreenElement) {
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
                (container as any).webkitRequestFullscreen();
            } else if ((container as any).msRequestFullscreen) {
                (container as any).msRequestFullscreen();
            } else {
                toast.error(lang === 'ar' ? 'المتصفح لا يدعم تكبير الشاشة' : 'Fullscreen not supported by browser');
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) {
                (document as any).msExitFullscreen();
            }
        }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const isLoading = isQueryLoading || episodeLoading;

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

    const genres = anime?.categories?.map((c: any) => lang === 'ar' ? c?.title : (c?.title_en || c?.title)).filter(Boolean).join(', ') || '';
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
            "genre": anime?.categories?.map((c: any) => lang === 'ar' ? c?.title : (c?.title_en || c?.title)).filter(Boolean) || [],
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

    let videoUrl = dynamicVideoUrl || servers[selectedServer]?.url || "";
    // Allow the server's default play behavior without forcing autoplay constraints that freeze cross-origin iframes

    // Determine Robots status outside JSX
    const shouldIndex = !((!anime && !isQueryLoading) || !!episodeError || (!currentEpisode && !episodeData));

    return (
        <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#f0f2f5] dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
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
                        <div className="hidden lg:block lg:col-span-2 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30">
                            <SocialNavSidebar />
                        </div>

                        {/* Dynamic Main Content & Right Sidebar */}
                        {(!anime || !currentEpisode || isLoading || isLoadingActiveEpisode) ? (
                            <div className="col-span-1 lg:col-span-12 min-h-[70vh] flex items-center justify-center">
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
                                                {videoUrl ? (
                                                    <>
                                                        {isVideoFile(videoUrl) ? (
                                                            <CustomVideoPlayer
                                                                src={videoUrl}
                                                                poster={metaImage}
                                                                qualities={playerQualities}
                                                                onQualityChange={handleQualityChange}
                                                                currentQuality={playerQualities.find((q: any) => q.url === videoUrl)?.label}
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
                                                            onClick={() => setIsBulkDeleteModalOpen(true)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-all border border-red-500/20"
                                                            title={lang === 'ar' ? 'تحديد حذف السيرفر' : 'Bulk Delete Servers'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            <span className="text-xs font-bold whitespace-nowrap">
                                                                {lang === 'ar' ? 'تحديد حذف السيرفر' : 'Bulk Delete'}
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
                                                                    disabled={isRefreshingVideo && isSelected}
                                                                    className={cn(
                                                                        "relative flex items-center justify-center h-8 rounded-lg overflow-hidden transition-all duration-300",
                                                                        hasImage ? "w-20 bg-white dark:bg-[#1a1a1a] p-1" : "px-4 bg-transparent",
                                                                        isSelected
                                                                            ? hasImage
                                                                                ? "bg-gray-200 dark:bg-white text-black dark:text-black font-black shadow-md scale-105"
                                                                                : "bg-black dark:bg-white text-white dark:text-black font-bold font-sans text-sm shadow-md scale-105"
                                                                            : "bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100",
                                                                        isSelectedForSwap && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1a1a1a] scale-110 !opacity-100 !bg-blue-500/10",
                                                                        isSwapMode ? "cursor-pointer" : "cursor-pointer",
                                                                        (isRefreshingVideo && isSelected) ? "opacity-50 cursor-wait" : ""
                                                                    )}
                                                                >
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
                                                                    
                                                                    {isSelectedForSwap && (
                                                                        <div className="absolute top-0 right-0 bg-blue-500 text-white w-4 h-4 flex items-center justify-center rounded-bl-lg">
                                                                            <span className="text-[10px]">{selectedServersForSwap.indexOf(idx) + 1}</span>
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
                                                                           "text-yellow-500") + " hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                                                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
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

                                                <button
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-[14px] md:text-[15px] text-black dark:text-white hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                                                    onClick={() => {
                                                        if (isMobile) {
                                                            commentsSectionRef.current?.openAddCommentModal();
                                                        } else {
                                                            const commentsEl = document.getElementById('comments-section');
                                                            if (commentsEl) commentsEl.scrollIntoView({ behavior: 'smooth' });
                                                        }
                                                    }}
                                                >
                                                    <MessageCircle className="w-5 h-5 text-black dark:text-white" />
                                                    <span className="text-black dark:text-white">{lang === 'ar' ? 'تعليق' : 'Comment'} {commentsData?.length ? `(${formatNumber(commentsData.length)})` : ''}</span>
                                                </button>

                                                <button
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-[13px] md:text-[14px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
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
                                                        className="w-full flex items-center justify-center gap-2 py-2 h-auto rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 px-0 [&_svg]:w-5 [&_svg]:h-5 bg-transparent border-0 font-bold"
                                                        showLabel={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-100 dark:border-[#2a2a2a] p-4 bg-gray-50/30 dark:bg-black/20 pb-20 lg:pb-4 max-md:[&_.text-lg]:text-[15px] max-md:[&_p_img.inline-block]:!w-[22px] max-md:[&_p_img.inline-block]:!h-[22px] max-md:[&_.w-10]:w-8 max-md:[&_.w-10]:h-8" id="comments-section">
                                               
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
                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                                            title={lang === 'ar' ? 'بحث وفلترة' : 'Search & Filter'}
                                        >
                                            <span className="text-xs font-bold hidden sm:inline">
                                                {lang === 'ar' ? 'فلترة' : 'Filter'}
                                            </span>
                                            <Filter className="w-4 h-4" />
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
                                                                isActive ? "bg-gray-100 dark:bg-neutral-800" : "hover:bg-gray-50 dark:hover:bg-[#222]"
                                                            )}
                                                        >
                                                            <Link
                                                                to={epUrl}
                                                            className="flex-1 flex items-center min-w-0"
                                                        >
                                                            {/* Left: Indicator */}
                                                            <div className={cn(
                                                                "w-8 flex-shrink-0 text-[11px] font-bold text-center transition-colors",
                                                                isActive ? "text-blue-500" : "text-gray-400"
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
                                            {hasNextPage && (
                                                <div ref={observerRef} className="py-3 flex justify-center border-t border-gray-50 dark:border-white/5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                            {lang === 'ar' ? 'جاري تحميل المزيد...' : 'Loading more...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
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

                {anime && (
                    <BulkDeleteServersModal
                        isOpen={isBulkDeleteModalOpen}
                        onClose={() => setIsBulkDeleteModalOpen(false)}
                        animeId={anime.id}
                        animeTitle={animeTitle}
                        onSuccess={() => {
                            // Optionally refetch current servers/episodes if needed
                            window.location.reload(); 
                        }}
                    />
                )}
            </div>
        </div>
    );
}