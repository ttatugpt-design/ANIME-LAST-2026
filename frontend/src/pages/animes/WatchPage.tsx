import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import {
    Play, Plus, Share2, Flag, Download, MessageCircle,
    Globe, Clock, Eye, ChevronUp, ChevronLeft, Star, Filter, Library,
    ThumbsUp, ThumbsDown, MoreHorizontal, X, Check, Copy, Link as LinkIcon,
    Maximize2, Minimize2, Loader2
} from "lucide-react";
import { toast } from 'sonner';
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { renderEmojiContent } from "@/utils/render-content";
import { slugify } from "@/utils/slug";
import CrunchyrollSkeleton from "@/components/skeleton/CrunchyrollSkeleton";
import SpinnerImage from "@/components/ui/SpinnerImage";
import CentralSpinner from "@/components/ui/CentralSpinner";
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
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState<string | null>(null);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024); // lg breakpoint is usually where sidebar moves
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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
            const errorMsg = err.response?.data?.error || err.message;
            // Revert on error
            setUserReaction(previousReaction);
            setStats(previousCounts as any);
            toast.error(lang === 'ar' ? 'فشل التفاعل' : 'Failed to react');
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
        const iframe = document.getElementById('video-player-iframe') as any;
        if (!iframe) return;
        
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
        } else {
            toast.error(lang === 'ar' ? 'المتصفح لا يدعم تكبير الشاشة' : 'Fullscreen not supported by browser');
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

    let videoUrl = servers[selectedServer]?.url || "";
    // Force autoplay for supported servers
    if (videoUrl && !videoUrl.includes('autoplay')) {
        videoUrl += videoUrl.includes('?') ? '&autoplay=1&autostart=1&mute=0&muted=0' : '?autoplay=1&autostart=1&mute=0&muted=0';
    }

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
                        {isLoading ? (
                            <div className="col-span-1 lg:col-span-9 flex items-center justify-center min-h-[60vh]">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : !!episodeError || !anime || !currentEpisode ? (
                            <div className="col-span-1 lg:col-span-9 flex flex-col items-center justify-center text-gray-900 dark:text-white p-4 min-h-[60vh]">
                                <h1 className="text-4xl font-bold mb-4">{lang === 'ar' ? 'عفواً، لم يتم العثور على الحلقة' : 'Oops, Episode Not Found'}</h1>
                                <Link to="/animes" className="text-blue-600 hover:text-blue-700 transition-all font-bold">
                                    {lang === 'ar' ? 'العودة لتصفح الأنمي' : 'Back to Browse'}
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Main Content - col-span-7 */}
                                <div className="col-span-1 lg:col-span-7 px-0 md:px-0 lg:px-6 pb-6 space-y-4">
                                    <div className="max-w-[900px] mx-auto space-y-4">

                                        {/* Video Player Post Container (Matches Community PostCard exactly) */}
                                        <div className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a] overflow-hidden mt-0 md:mt-4">
                                            
                                            {/* 1. Player - Now at the Top */}
                                            <div className="w-full aspect-video bg-black overflow-hidden relative group md:rounded-t-xl">
                                                {videoUrl ? (
                                                    <iframe id="video-player-iframe" src={videoUrl} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" onLoad={() => setIsVideoLoading(false)} />
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
                                            <div className="p-3 flex justify-between items-start">
                                                <div className="flex gap-2 w-full">
                                                    <Link to={`/${lang}/animes/${lang === 'ar' ? (anime.slug || anime.id) : (anime.slug_en || anime.slug || anime.id)}`} className="shrink-0">
                                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] border border-gray-50 dark:border-[#333]">
                                                            <img src={getImageUrl(anime?.cover || anime?.banner)} alt={animeTitle} className="w-full h-full object-cover" />
                                                        </div>
                                                    </Link>
                                                    <div className="flex-1 min-w-0">
                                                        <Link to={`/${lang}/animes/${lang === 'ar' ? (anime.slug || anime.id) : (anime.slug_en || anime.slug || anime.id)}`} className="font-bold text-gray-900 dark:text-white hover:underline block leading-tight truncate">
                                                            {renderEmojiContent(animeTitle)}
                                                        </Link>
                                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-1">
                                                            <span className="text-[11px] font-medium">
                                                                {(lang === 'ar' ? currentEpisode.title : currentEpisode.title_en) || `${lang === 'ar' ? 'الحلقة' : 'Episode'} ${currentEpisode.episode_number}`}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-[11px] font-bold text-black dark:text-white">
                                                                {lang === 'ar' ? `الحلقة ${currentEpisode.episode_number}` : `Episode ${currentEpisode.episode_number}`}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="text-[11px]">{currentEpisode.duration}m</span>
                                                            <span>•</span>
                                                            <Globe className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors" onClick={() => openModal(setIsEpisodeInfoOpen)}>
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* 3. Servers block - Under Header */}
                                            {servers.length > 0 && (
                                                <div className="px-3 pb-3 flex flex-wrap items-center gap-2 border-b border-gray-50 dark:border-white/5">
                                                    {servers.map((server: any, idx: number) => {
                                                        const matchedServer = globalServers?.find((gs: any) =>
                                                            gs.name_en === server.name ||
                                                            gs.name_ar === server.name ||
                                                            server.name.includes(gs.name_en) ||
                                                            server.name.includes(gs.name_ar)
                                                        );
                                                        const hasImage = !!matchedServer?.image;
                                                        const isSelected = selectedServer === idx;

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setSelectedServer(idx)}
                                                                className={cn(
                                                                    "relative flex items-center justify-center h-8 rounded-lg overflow-hidden transition-all duration-300",
                                                                    hasImage ? "w-20 bg-white dark:bg-[#1a1a1a] p-1" : "px-4 bg-transparent",
                                                                    isSelected
                                                                        ? hasImage
                                                                            ? "bg-gray-200 dark:bg-white text-black dark:text-black font-black shadow-md scale-105"
                                                                            : "bg-black dark:bg-white text-white dark:text-black font-bold font-sans text-sm shadow-md scale-105"
                                                                        : "bg-gray-100 dark:bg-[#222] text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100"
                                                                )}
                                                            >
                                                                {hasImage ? (
                                                                    <img 
                                                                        src={getImageUrl(matchedServer.image)} 
                                                                        alt={server.name} 
                                                                        className={cn(
                                                                            "w-full h-full object-contain object-center transition-transform",
                                                                            isSelected ? "scale-110" : "scale-100",
                                                                            "mix-blend-multiply dark:mix-blend-normal"
                                                                        )} 
                                                                    />
                                                                ) : (
                                                                    <span className="text-xs font-bold uppercase tracking-wider">{server.name}</span>
                                                                )}
                                                            </button>
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
                                                        episodeId={Number(currentEpisode.id)}
                                                        episodeTitle={epTitle}
                                                        episodeNumber={currentEpisode.episode_number}
                                                        episodeImage={getImageUrl(currentEpisode.thumbnail)}
                                                        variant="default"
                                                        className="w-full flex items-center justify-center gap-2 py-2 h-auto rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 px-0 [&_svg]:w-5 [&_svg]:h-5 bg-transparent border-0 font-bold"
                                                        showLabel={true}
                                                    />
                                                </div>
                                            </div>

                                            <div className="border-t border-gray-100 dark:border-[#2a2a2a] p-4 bg-gray-50/30 dark:bg-black/20 pb-20 lg:pb-4" id="comments-section">
                                               
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
                                <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30 px-2 pt-2 md:pt-4 pb-4">
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
                                        {filteredEpisodes.length > 0 ? (
                                            filteredEpisodes.map((ep: any) => {
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
                                            })
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
                    episodes={filteredEpisodes}
                    activeEpisodeNum={Number(episodeNum)}
                    animeId={Number(anime?.id)}
                    slug={currentSlug}
                    lang={lang}
                    isLoading={isQueryLoading || isEpisodesLoading}
                    getImageUrl={getImageUrl}
                    getRelativeTime={getRelativeTime}
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
                {/* Mobile Sticky Fullscreen Button */}
                <div className="md:hidden fixed bottom-6 left-6 z-[90]">
                    <button
                        onClick={handleFullscreen}
                        className="w-12 h-12 bg-black/80 backdrop-blur-md rounded-full text-white shadow-xl flex items-center justify-center hover:bg-black transition-colors border border-white/10 outline-none focus:outline-none"
                    >
                        <Maximize2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}