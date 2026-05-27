import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MoreHorizontal,
    ThumbsUp,
    MessageCircle,
    Share2,
    Heart,
    Globe,
    X,
    Loader2,
    Play,
    MessageSquare,
    Facebook,
    Twitter,
    Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from '@/stores/auth-store';
import { Post, PostMedia } from '@/types/models';
import { renderEmojiContent } from '@/utils/render-content';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentsSection } from '@/components/comments/CommentsSection';
import { PostMediaModal } from './PostMediaModal';
import { PostTheatreModal } from './PostTheatreModal';
import { EditPostModal } from './EditPostModal';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
const ImageWithSpinner = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-[#1a1a1a]">
                    <Loader2 className="w-12 h-12 text-black dark:text-gray-400 animate-spin" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                loading="lazy"
                className={cn(className, !isLoaded && "opacity-0")}
                onLoad={() => setIsLoaded(true)}
            />
        </div>
    );
};

interface PostCardProps {
    post: Post;
    onDelete?: (id: number) => void;
    initialShowComments?: boolean;
}


export const PostCard: React.FC<PostCardProps> = ({ post, onDelete, initialShowComments = false }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();

    const [userReaction, setUserReaction] = useState<string | null>(post.user_reaction || (post.is_liked ? 'like' : null));
    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
        like: post.likes_count || 0,
        love: post.loves_count || 0,
        sad: post.sads_count || 0,
        angry: post.angrys_count || 0,
        wow: post.wows_count || 0,
        haha: post.hahas_count || 0,
        super_sad: post.super_sads_count || 0,
    });

    // Guard to protect optimistic state from being overwritten by server re-renders
    const hasInteracted = React.useRef(false);
    const prevPostId = React.useRef(post.id);


    // Sync from server when post data changes (e.g., after initial fetch completes or navigating to different post)
    React.useEffect(() => {
        // When post.id changes (different post), reset the interaction guard so we pick up the new server state
        if (post.id !== prevPostId.current) {
            hasInteracted.current = false;
            prevPostId.current = post.id;
        }

        if (!hasInteracted.current) {
            setUserReaction(post.user_reaction || null);
            setReactionCounts({
                like: post.likes_count || 0,
                love: post.loves_count || 0,
                sad: post.sads_count || 0,
                angry: post.angrys_count || 0,
                wow: post.wows_count || 0,
                haha: post.hahas_count || 0,
                super_sad: post.super_sads_count || 0,
            });
        }
    }, [post.id, post.user_reaction, post.likes_count, post.hahas_count, post.loves_count, post.sads_count, post.angrys_count, post.wows_count, post.super_sads_count]);



    const [showComments, setShowComments] = useState(initialShowComments || new URLSearchParams(window.location.search).has('commentId'));
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [isTheatreModalOpen, setIsTheatreModalOpen] = useState(false);
    const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [modalOpenedFromComment, setModalOpenedFromComment] = useState(false);
    const [modalScrollPercent, setModalScrollPercent] = useState(0);

    // Reaction Tooltips State
    const [isHoveringStats, setIsHoveringStats] = useState(false);
    const [reactionUsers, setReactionUsers] = useState<Record<string, { id: number, name: string, avatar: string }[]>>({});
    const [isLoadingReactions, setIsLoadingReactions] = useState(false);
    const statsHoverTimer = useRef<NodeJS.Timeout | null>(null);

    // Reaction popup
    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reactionEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const REACTIONS = [
        { key: 'like', label: isAr ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: isAr ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: isAr ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: isAr ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: isAr ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: isAr ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: isAr ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
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
            handleReactionClick('like'); // Default action is standard 'like'
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
    const handleReactionClick = async (reactionKey: string) => {
        setShowReactionPopup(false);
        hasInteracted.current = true; // Protect optimistic state from server sync
        
        const previousReaction = userReaction;
        const previousCounts = { ...reactionCounts };
        
        // Optimistic UI update
        const newCounts = { ...reactionCounts };
        let newReaction: string | null = reactionKey;
        
        if (previousReaction === reactionKey) {
            // Toggling SAME reaction off
            newReaction = null;
            newCounts[reactionKey] = Math.max(0, newCounts[reactionKey] - 1);
        } else {
            // Changing or adding reaction
            if (previousReaction) {
                newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
            }
            newCounts[reactionKey] = (newCounts[reactionKey] || 0) + 1;
        }
        
        setUserReaction(newReaction);
        setReactionCounts(newCounts);
        
        try {
            await api.post(`/posts/${post.id}/like`, { type: reactionKey });
        } catch {
            setUserReaction(previousReaction);
            setReactionCounts(previousCounts);
            toast.error(isAr ? 'فشل التفاعل' : 'Failed to react');
        }
    };

    // Sync showComments with URL params for deep linking
    React.useEffect(() => {
        if (new URLSearchParams(window.location.search).has('commentId')) {
            setShowComments(true);
        }
    }, [window.location.search]);

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/${i18n.language}/social?postId=${post.id}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success(isAr ? 'تم نسخ رابط المنشور' : 'Post link copied to clipboard');
            setIsShareModalOpen(false);
        }).catch(() => {
            toast.error(isAr ? 'فشل نسخ الرابط' : 'Failed to copy link');
        });
    };

    const shareToSocial = (platform: string) => {
        const url = encodeURIComponent(`${window.location.origin}/${i18n.language}/social?postId=${post.id}`);
        const text = encodeURIComponent(post.content ? post.content.substring(0, 100) : 'Check out this post!');
        let shareUrl = '';
        
        if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        if (platform === 'whatsapp') shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
            setIsShareModalOpen(false);
        }
    };

    const [isMobileCommentsOpen, setIsMobileCommentsOpen] = useState(false);

    const onCloseCommentsRef = useRef(() => setIsMobileCommentsOpen(false));
    React.useEffect(() => { onCloseCommentsRef.current = () => setIsMobileCommentsOpen(false); }, []);

    // Intercept mobile back button to close the comments sheet
    React.useEffect(() => {
        if (window.innerWidth >= 768 || !isMobileCommentsOpen) return;

        const stateKey = `comments_${post.id}`;
        window.history.pushState({ modalKey: stateKey }, '');

        const handlePopState = (e: PopStateEvent) => {
            // e.state is the state we are navigating TO.
            // If it equals OUR key, a child modal (e.g. reply) just closed and popped
            // back to our state — we should NOT close the comments sheet.
            if (e.state?.modalKey === stateKey) return;

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseCommentsRef.current();
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isMobileCommentsOpen, post.id]);

    const handleCommentClick = (e: React.MouseEvent) => {
        if (window.innerWidth > 768) {
            const postElement = e.currentTarget.closest('.post-card-container');
            let scrollPercent = 0.5; // default to middle
            if (postElement) {
                const rect = postElement.getBoundingClientRect();
                const viewportMiddle = window.innerHeight / 2;
                const yInPost = viewportMiddle - rect.top;
                scrollPercent = Math.max(0, Math.min(1, yInPost / rect.height));
            }
            setModalScrollPercent(scrollPercent);
            setModalOpenedFromComment(true);
            setIsMediaModalOpen(true);
        } else {
            setIsMobileCommentsOpen(true);
        }
    };

    // toggleLike removed as it's merged into handleReactionClick

    const handleDeleteConfirm = async () => {
        setIsDeleteDialogOpen(false);
        setIsDeleting(true);
        try {
            await api.delete(`/posts/${post.id}`);
            toast.success(isAr ? 'تم حذف المنشور' : 'Post deleted');
            if (onDelete) {
                onDelete(post.id);
            } else {
                window.location.reload();
            }
        } catch (error) {
            setIsDeleting(false);
            toast.error(isAr ? 'فشل حذف المنشور' : 'Failed to delete post');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
                locale: isAr ? ar : enUS
            });
        } catch {
            return dateStr;
        }
    };

    const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
    const topReactions = Object.entries(reactionCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => key);

    const activeReaction = REACTIONS.find(r => r.key === userReaction);

    const handleStatsHover = async () => {
        setIsHoveringStats(true);
        if (totalReactions === 0 || Object.keys(reactionUsers).length > 0) return;
        
        setIsLoadingReactions(true);
        try {
            const { data } = await api.get(`/posts/${post.id}/reactions`);
            setReactionUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingReactions(false);
        }
    };

    const handleStatsMouseEnter = () => {
        if (statsHoverTimer.current) clearTimeout(statsHoverTimer.current);
        statsHoverTimer.current = setTimeout(() => {
            handleStatsHover();
        }, 300);
    };

    const handleStatsMouseLeave = () => {
        if (statsHoverTimer.current) clearTimeout(statsHoverTimer.current);
        setIsHoveringStats(false);
    };

    return (
        <div className={cn(
            "post-card-container bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-100 dark:border-[#2a2a2a] transition-opacity overflow-hidden mb-2 md:mb-4",
            (isDeleting || isUpdating) && "opacity-50 pointer-events-none"
        )}>
            {/* Post Header */}
            <div className="p-3 flex justify-between items-start">
                <div className="flex gap-2">
                    <Link to={`/${i18n.language}/u/${post.user_id}/profile`} className="shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] border border-gray-50 dark:border-[#333]">
                            {post.user?.avatar ? (
                                <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                                    {post.user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </Link>
                    <div>
                        
                        <Link
                            to={`/${i18n.language}/u/${post.user_id}/profile`}
                            className="font-bold text-gray-900 dark:text-white hover:underline block leading-tight"
                        >
                            {post.user?.name}
                        </Link>
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mt-0.5">
                            <Globe className="w-3 h-3 text-black dark:text-white" />
                            <span className="text-[10px] sm:text-xs">
                                {formatDate(post.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isAr ? 'start' : 'end'} className="dark:bg-[#1a1a1a] dark:border-[#333]">
                        <DropdownMenuItem className="cursor-pointer dark:text-white dark:hover:bg-[#2a2a2a]">
                            {isAr ? 'حفظ المنشور' : 'Save Post'}
                        </DropdownMenuItem>
                        {currentUser?.id === post.user_id && (
                            <>
                                <DropdownMenuItem
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="cursor-pointer dark:text-white dark:hover:bg-[#2a2a2a]"
                                >
                                    {isAr ? 'تعديل' : 'Edit'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="cursor-pointer text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                                >
                                    {isAr ? 'حذف' : 'Delete'}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Post Content */}
            <div className="px-3 pb-2">
                <div className="text-sm md:text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words [&_img]:inline-block [&_img]:w-6 [&_img]:h-6 [&_img]:align-text-bottom [&_img]:mx-0.5" dir="auto">
                    {renderEmojiContent(post.content)}
                </div>
            </div>

            {/* Post Media */}
            {post.media && post.media.length > 0 && (
                <div className={cn(
                    "grid gap-1 mt-2 bg-gray-100 dark:bg-[#111] overflow-hidden md:rounded-none",
                    post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {post.media.slice(0, 4).map((m, idx) => {
                        const isLast = idx === 3;
                        const remainingCount = post.media!.length - 4;
                        const hasMore = isLast && remainingCount > 0;

                        return (
                            <div
                                key={m.id}
                                onClick={() => {
                                    setSelectedMediaIndex(idx);
                                    setIsTheatreModalOpen(true);
                                }}
                                className={cn(
                                    "relative overflow-hidden cursor-pointer bg-black group/media",
                                    post.media!.length === 1 ? "w-full flex justify-center" : 
                                    (post.media!.length === 3 && idx === 0) ? "col-span-2 aspect-[16/9]" : "aspect-square"
                                )}
                            >
                                {m.media_type === 'video' ? (
                                    <div className="relative w-full h-full">
                                        <video
                                            src={getImageUrl(m.media_url)}
                                            className={cn("w-full h-full", post.media!.length === 1 ? "object-contain max-h-[500px]" : "object-cover")}
                                            playsInline
                                        />
                                        {!hasMore && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/media:bg-black/40 transition-colors">
                                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                                                    <Play className="w-8 h-8 text-white fill-white" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <ImageWithSpinner
                                        src={getImageUrl(m.media_url)}
                                        alt=""
                                        className={cn(
                                            "transition-transform duration-500 group-hover/media:scale-105",
                                            post.media!.length === 1 ? "w-auto h-auto max-w-full max-h-[500px] object-contain mx-auto" : "w-full h-full object-cover"
                                        )}
                                    />
                                )}
                                
                                {hasMore && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-3xl font-bold">+{remainingCount}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Post Stats */}
            <div className="px-3 py-1.5 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <div 
                    className="flex items-center gap-1 relative group/stats cursor-pointer"
                    onMouseEnter={handleStatsMouseEnter}
                    onMouseLeave={handleStatsMouseLeave}
                >
                    {totalReactions > 0 ? (
                        <>
                            <div className="flex -space-x-1 rtl:space-x-reverse">
                                {topReactions.map((rKey, i) => {
                                    const r = REACTIONS.find(rx => rx.key === rKey);
                                    if (!r) return null;
                                    return (
                                        <div key={rKey} className="w-4 h-4 rounded-full relative flex items-center justify-center border border-white dark:border-[#1a1a1a] shadow-sm bg-white overflow-hidden pointer-events-none" style={{ zIndex: 3 - i }}>
                                            <img src={r.gif} alt={r.label} className="w-full h-full object-cover scale-110" />
                                        </div>
                                    );
                                })}
                            </div>
                            <span className="cursor-pointer hover:underline">{totalReactions}</span>
                        </>
                    ) : (
                        <span />
                    )}

                    {/* Facebook-style Reaction Tooltip */}
                    {isHoveringStats && totalReactions > 0 && (
                        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 dark:border-[#333]/50 p-3 z-50 text-sm animate-in fade-in slide-in-from-bottom-2">
                             {isLoadingReactions ? ( 
                                 <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div> 
                             ) : Object.keys(reactionUsers).length > 0 ? (
                                  Object.entries(reactionUsers).map(([type, users]) => {
                                      const reactionInfo = REACTIONS.find(r => r.key === type);
                                      if (!reactionInfo || users.length === 0) return null;
                                      return (
                                           <div key={type} className="mb-3 last:mb-0">
                                                <div className="flex items-center gap-1.5 font-bold mb-1 text-gray-900 dark:text-gray-100 px-1 border-b border-gray-100 dark:border-[#2a2a2a] pb-1">
                                                    <img src={reactionInfo.gif} className="w-4 h-4" alt="" />
                                                    <span>{users.length}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
                                                    {users.slice(0, 8).map(u => (
                                                        <span key={u.id} className="truncate px-1 font-medium">{u.name}</span>
                                                    ))}
                                                    {users.length > 8 && <span className="text-[11px] text-gray-400 font-medium px-1 mt-0.5">+{users.length - 8} {isAr ? 'آخرون' : 'others'}</span>}
                                                </div>
                                           </div>
                                      );
                                  })
                             ) : (
                                 <div className="text-center py-2 text-gray-500">{isAr ? 'لا توجد تفاعلات' : 'No reactions'}</div>
                             )}
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <span>{post.comments_count} {isAr ? 'تعليق' : 'Comments'}</span>
                    <span>0 {isAr ? 'مشاركة' : 'Shares'}</span>
                </div>
            </div>

            {/* Post Actions */}
            <div className="px-1 py-0.5 flex items-center gap-1">
                {/* Like button with FB-style reaction popup */}
                <div 
                    className="flex-1 relative"
                    onMouseEnter={handleLikeMouseEnter}
                    onMouseLeave={handleLikeMouseLeave}
                >
                    <button
                        onClick={handleLikeClick}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        className={cn(
                            "w-full flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-lg transition-colors font-bold text-xs md:text-sm",
                            userReaction
                                ? (userReaction === 'like' ? "text-blue-500" : 
                                   userReaction === 'love' ? "text-red-500" : 
                                   "text-yellow-500") + " hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                        )}
                    >
                        {activeReaction ? (
                            <img src={activeReaction.gif} className="w-4 h-4 md:w-5 md:h-5 object-contain scale-110" alt={activeReaction.label} />
                        ) : (
                            <ThumbsUp className="w-4 h-4 md:w-5 md:h-5" />
                        )}
                        <span>{activeReaction ? activeReaction.label : (isAr ? 'أعجبني' : 'Like')}</span>
                    </button>

                    {/* Reaction Popup - Professional Facebook style */}
                    {showReactionPopup && (
                        <div
                            className={cn(
                                "absolute bottom-[calc(100%+12px)] z-50",
                                isAr ? "right-0" : "left-0"
                            )}
                            style={{ animation: 'reactionPopupIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both' }}
                            onMouseEnter={handlePopupMouseEnter}
                            onMouseLeave={handlePopupMouseLeave}
                        >
                            {/* Arrow pointer */}
                            <div className={cn(
                                "absolute -bottom-1.5 w-3 h-3 rotate-45 bg-white dark:bg-[#2a2a2a] border-r border-b border-gray-100 dark:border-[#444]",
                                isAr ? "right-6" : "left-6"
                            )} />
                            <div className="relative flex items-center justify-center gap-0.5 md:gap-1 bg-white dark:bg-[#2a2a2a] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.22)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] border border-gray-100 dark:border-[#444] px-2 py-1.5 md:px-3 md:py-2.5 w-max min-w-max overflow-visible">
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
                                                    ? "w-12 h-12 md:w-14 md:h-14 -translate-y-2 md:-translate-y-3 scale-100"
                                                    : "w-10 h-10 md:w-9 md:h-9 translate-y-0"
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleCommentClick}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-lg transition-colors font-bold text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]",
                        showComments && "text-blue-500 bg-blue-50 dark:bg-blue-900/10"
                    )}
                >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                    <span>{isAr ? 'تعليق' : 'Comment'} {post.comments_count > 0 && `(${post.comments_count})`}</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-lg transition-colors font-bold text-xs md:text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                >
                    <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    <span>{isAr ? 'مشاركة' : 'Share'}</span>
                </button>
            </div>

            <div className={cn(initialShowComments ? "block" : "hidden md:block")}>
                {showComments && (
                    <div className="border-t border-gray-100 dark:border-[#2a2a2a] p-4 bg-gray-50/30 dark:bg-black/20 max-md:[&_.text-lg]:text-[15px] max-md:[&_p_img.inline-block]:!w-[22px] max-md:[&_p_img.inline-block]:!h-[22px] max-md:[&_.w-10]:w-8 max-md:[&_.w-10]:h-8">
                        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                            <MessageSquare className="w-4 h-4" />
                            {isAr ? 'التعليقات' : 'Comments'}
                        </div>

                        <CommentsSection
                            type="post"
                            itemId={post.id}
                            postAuthor={post.user}
                        />
                    </div>
                )}
            </div>

            {/* Mobile Comments Sheet (Facebook style) */}
            <Sheet open={isMobileCommentsOpen} onOpenChange={setIsMobileCommentsOpen}>
                <SheetContent 
                    side="bottom" 
                    className="h-[100dvh] p-0 flex flex-col rounded-none border-none outline-none overflow-hidden bg-white dark:bg-[#0a0a0a] gap-0"
                >
                    <SheetHeader className="px-4 py-1.5 border-b border-gray-100 dark:border-white/10 shrink-0 bg-white dark:bg-[#111]">
                        <div className="mx-auto w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mb-1 mt-0.5 relative" />
                        <SheetTitle className="text-center font-bold text-[15px] flex items-center justify-center gap-1.5">
                            <MessageSquare className="w-4 h-4" />
                            <span>{isAr ? 'التعليقات' : 'Comments'}</span>
                            <span className="text-gray-500 dark:text-gray-400 font-medium">({post.comments_count})</span>
                        </SheetTitle>
                    </SheetHeader>
                    {/* The compact styles are applied here using arbitrary values and targeting child elements */}
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden [&_.text-lg]:text-[15px] [&_.text-lg]:leading-snug [&_.w-10]:w-8 [&_.w-10]:h-8 [&_.w-12]:w-9 [&_.w-12]:h-9 [&_.mb-1]:mb-0 [&_.mt-1]:mt-0 [&_.mt-2]:mt-1 [&_p_img.inline-block]:!w-[22px] [&_p_img.inline-block]:!h-[22px] [&_.gap-3]:gap-2 [&_.gap-4]:gap-2 [&_.py-1.5]:py-1.5 [&_.px-3]:px-3">
                        <CommentsSection
                            type="post"
                            itemId={post.id}
                            stickyInput={false}
                            inputPosition="bottom"
                            postAuthor={post.user}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Media Modal (Facebook White Dialog) */}
            <PostMediaModal
                isOpen={isMediaModalOpen}
                onClose={() => {
                    setIsMediaModalOpen(false);
                    setModalOpenedFromComment(false);
                }}
                post={post}
                initialIndex={selectedMediaIndex}
                openedFromComment={modalOpenedFromComment}
                scrollPercent={modalScrollPercent}
            />

            {/* Theatre Modal (Image click) */}
            <PostTheatreModal
                isOpen={isTheatreModalOpen}
                onClose={() => setIsTheatreModalOpen(false)}
                post={post}
                initialIndex={selectedMediaIndex}
            />

            {/* Share Modal */}
            <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
                <DialogContent className="w-[90%] max-w-sm rounded-xl p-6 md:p-6 dark:bg-[#1a1a1a] dark:border-[#333] border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="text-center font-bold text-gray-900 dark:text-white pb-2">
                            {isAr ? 'مشاركة المنشور' : 'Share Post'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-2 md:gap-4 py-2">
                        <button
                            onClick={() => shareToSocial('facebook')}
                            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                <Facebook className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-gray-100">Facebook</span>
                        </button>
                        <button
                            onClick={() => shareToSocial('twitter')}
                            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                <Twitter className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-gray-100">X (Twitter)</span>
                        </button>
                        <button
                            onClick={() => shareToSocial('whatsapp')}
                            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                <MessageCircle className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-gray-100">WhatsApp</span>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity group"
                        >
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                                <LinkIcon className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <span className="text-[10px] md:text-xs font-medium text-gray-900 dark:text-gray-100">{isAr ? 'نسخ الرابط' : 'Copy Link'}</span>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <EditPostModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                post={post}
                onSuccess={(updatedPost) => {
                    // Update post data directly
                    post.content = updatedPost.content;
                    post.media = updatedPost.media || [];
                }}
            />

            {/* Delete Confirmation Modal */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="dark:bg-[#1a1a1a] dark:border-[#333] border-gray-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className={isAr ? "text-right" : "text-left"}>
                            {isAr ? 'حذف المنشور' : 'Delete Post'}
                        </AlertDialogTitle>
                        <AlertDialogDescription className={isAr ? "text-right" : "text-left"}>
                            {isAr ? 'هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this post? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className={isAr ? "sm:justify-start flex-row-reverse space-x-reverse space-x-2" : ""}>
                        <AlertDialogCancel className="dark:bg-[#2a2a2a] dark:text-white dark:hover:bg-[#333] dark:border-[#444] mt-0">
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isAr ? 'حذف' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
