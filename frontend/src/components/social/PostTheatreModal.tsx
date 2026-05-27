import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X, ChevronLeft, ChevronRight, Loader2,
    ThumbsUp, MessageCircle, Share2, Globe, MoreHorizontal,
} from 'lucide-react';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { renderEmojiContent } from '@/utils/render-content';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface PostMedia { id: number; media_url: string; media_type: 'image' | 'video'; }
interface Post {
    id: number; user_id: number; content: string; created_at: string;
    user: { id: number; name: string; avatar?: string; };
    media?: PostMedia[];
    likes_count: number; comments_count: number; is_liked: boolean;
    user_reaction?: string | null;
    loves_count?: number; hahas_count?: number; sads_count?: number;
    angrys_count?: number; wows_count?: number; super_sads_count?: number;
}
interface PostTheatreModalProps {
    isOpen: boolean; onClose: () => void; post: Post; initialIndex: number;
}

export const PostTheatreModal: React.FC<PostTheatreModalProps> = ({ isOpen, onClose, post, initialIndex }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [commentCount, setCommentCount] = useState(post.comments_count);

    // Reaction state
    const [userReaction, setUserReaction] = useState<string | null>(
        post.user_reaction || (post.is_liked ? 'like' : null)
    );
    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
        like: post.likes_count || 0,
        love: post.loves_count || 0,
        sad: post.sads_count || 0,
        angry: post.angrys_count || 0,
        wow: post.wows_count || 0,
        haha: post.hahas_count || 0,
        super_sad: post.super_sads_count || 0,
    });
    const hasInteracted = useRef(false);

    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const [popupPos, setPopupPos] = useState({ left: 0, bottom: 0 });
    const likeButtonRef = useRef<HTMLButtonElement>(null);
    const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reactionEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const REACTIONS = [
        { key: 'like',      label: isAr ? 'أعجبني'       : 'Like',   gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love',      label: isAr ? 'أحببته'        : 'Love',   gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad',       label: isAr ? 'أحزنني'       : 'Sad',    gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry',     label: isAr ? 'أغضبني'       : 'Angry',  gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow',       label: isAr ? 'واوو'          : 'Wow',    gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha',      label: isAr ? 'اضحكني'       : 'Haha',   gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: isAr ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
    ];

    const activeReaction = REACTIONS.find(r => r.key === userReaction);
    const totalReactions = Object.values(reactionCounts).reduce((s, c) => s + c, 0);
    const topReactions = Object.entries(reactionCounts)
        .filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
        .slice(0, 3).map(([k]) => k);

    const handleReactionClick = async (key: string) => {
        setShowReactionPopup(false);
        hasInteracted.current = true;
        const prev = userReaction;
        const prevCounts = { ...reactionCounts };
        const newCounts = { ...reactionCounts };
        let newReaction: string | null = key;
        if (prev === key) {
            newReaction = null;
            newCounts[key] = Math.max(0, newCounts[key] - 1);
        } else {
            if (prev) newCounts[prev] = Math.max(0, newCounts[prev] - 1);
            newCounts[key] = (newCounts[key] || 0) + 1;
        }
        setUserReaction(newReaction);
        setReactionCounts(newCounts);
        try {
            await api.post(`/posts/${post.id}/like`, { type: key });
        } catch {
            setUserReaction(prev);
            setReactionCounts(prevCounts);
            toast.error(isAr ? 'فشل التفاعل' : 'Failed to react');
        }
    };

    const handleLikeMouseEnter = () => {
        if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current);
        reactionEnterTimer.current = setTimeout(() => {
            if (likeButtonRef.current) {
                const rect = likeButtonRef.current.getBoundingClientRect();
                setPopupPos({
                    left: rect.left + rect.width / 2,
                    bottom: window.innerHeight - rect.top + 14,
                });
            }
            setShowReactionPopup(true);
        }, 100);
    };
    const handleLikeMouseLeave = () => {
        if (reactionEnterTimer.current) clearTimeout(reactionEnterTimer.current);
        reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 300);
    };
    const handlePopupMouseEnter = () => { if (reactionLeaveTimer.current) clearTimeout(reactionLeaveTimer.current); };
    const handlePopupMouseLeave = () => { reactionLeaveTimer.current = setTimeout(() => setShowReactionPopup(false), 200); };

    const handleLikeClick = () => {
        if (window.innerWidth < 768) { setShowReactionPopup(p => !p); }
        else { handleReactionClick('like'); }
    };
    const handleTouchStart = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => { setShowReactionPopup(true); if (navigator.vibrate) navigator.vibrate(50); }, 500);
    };
    const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
    useEffect(() => { setCurrentIndex(initialIndex); setIsImageLoaded(false); }, [initialIndex, isOpen]);
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (post.media?.length) { setCurrentIndex(p => (p + 1) % post.media!.length); setIsImageLoaded(false); }
    }, [post.media]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (post.media?.length) { setCurrentIndex(p => (p - 1 + post.media!.length) % post.media!.length); setIsImageLoaded(false); }
    }, [post.media]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') isAr ? handlePrev() : handleNext();
        if (e.key === 'ArrowLeft') isAr ? handleNext() : handlePrev();
    }, [isOpen, handleNext, handlePrev, isAr]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (window.innerWidth >= 768 || !isOpen) return;
        window.history.pushState({ modalKey: `theatre_${post.id}` }, '');
        const h = () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); onCloseRef.current(); };
        window.addEventListener('popstate', h);
        return () => window.removeEventListener('popstate', h);
    }, [isOpen, post.id]);

    const formatDate = (d: string) => {
        try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: isAr ? ar : enUS }); }
        catch { return d; }
    };
    const formatNumber = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

    if (!isOpen || !post || !post.media || post.media.length === 0) return null;
    const currentMedia = post.media[currentIndex];

    // ── MOBILE ──
    if (window.innerWidth < 768) {
        return (
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="bottom" className="h-[100dvh] p-0 flex flex-col border-none bg-black overflow-hidden z-[9999] outline-none gap-0">
                    <div className="h-[35vh] relative flex items-center justify-center bg-black shrink-0">
                        <button onClick={onClose} className="absolute top-4 left-4 z-[60] p-2 bg-white/20 text-white rounded-full backdrop-blur-md">
                            <X className="w-6 h-6" />
                        </button>
                        {post.media.length > 1 && (
                            <>
                                <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 z-[60] p-2 bg-black/40 text-white rounded-full"><ChevronLeft className="w-8 h-8" /></button>
                                <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 z-[60] p-2 bg-black/40 text-white rounded-full"><ChevronRight className="w-8 h-8" /></button>
                            </>
                        )}
                        <div className="relative flex items-center justify-center w-full h-full p-4">
                            <img key={currentMedia.media_url} src={getImageUrl(currentMedia.media_url)} alt=""
                                className={cn("w-auto h-auto max-w-full max-h-full object-contain transition-opacity duration-300", isImageLoaded ? "opacity-100" : "opacity-0")}
                                onLoad={() => setIsImageLoaded(true)} draggable={false} />
                        </div>
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#0a0a0a] rounded-t-[20px] flex flex-col overflow-hidden -mt-4 z-10">
                        <div className="py-2 shrink-0 flex flex-col items-center border-b border-gray-100 dark:border-white/5">
                            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-800 mb-1 mt-0.5" />
                            <div className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{isAr ? 'التعليقات' : 'Comments'}</span>
                                <span className="text-gray-500 font-medium">({commentCount})</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <CommentsSection itemId={post.id} type="post" inputPosition="bottom" stickyInput={true} onCountChange={setCommentCount} postAuthor={post.user} />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    // ── DESKTOP — Facebook-style ──
    return (
        <>
            {/* Main modal */}
            <div
                className="fixed inset-0 z-[9999] flex bg-black overflow-hidden animate-in fade-in duration-150"
                dir={isAr ? 'rtl' : 'ltr'}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 z-0" onClick={onClose} />

                {/* LEFT: Image Area */}
                <div className="relative flex-1 flex items-center justify-center bg-black z-10 min-w-0">
                    <button onClick={onClose} className="absolute top-4 left-4 z-20 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10">
                        <X className="w-6 h-6" />
                    </button>

                    {post.media.length > 1 && (
                        <>
                            <button onClick={handlePrev} className="absolute left-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/25 text-white rounded-full backdrop-blur-md border border-white/10">
                                <ChevronLeft className="w-7 h-7" />
                            </button>
                            <button onClick={handleNext} className="absolute right-6 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/25 text-white rounded-full backdrop-blur-md border border-white/10">
                                <ChevronRight className="w-7 h-7" />
                            </button>
                        </>
                    )}

                    {post.media.length > 1 && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 px-3 py-1.5 bg-black/40 rounded-full backdrop-blur-md">
                            {post.media.map((_, i) => (
                                <button key={i} onClick={() => { setCurrentIndex(i); setIsImageLoaded(false); }}
                                    className={cn('rounded-full transition-all', i === currentIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70')} />
                            ))}
                        </div>
                    )}

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {currentMedia.media_type === 'video' ? (
                            <video src={getImageUrl(currentMedia.media_url)} controls className="max-w-full max-h-full object-contain shadow-2xl" autoPlay />
                        ) : (
                            <>
                                {!isImageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-12 h-12 text-white/40 animate-spin" />
                                    </div>
                                )}
                                <img key={currentMedia.media_url} src={getImageUrl(currentMedia.media_url)} alt=""
                                    className={cn("max-w-full max-h-full object-contain transition-all duration-300", isImageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95")}
                                    onLoad={() => setIsImageLoaded(true)} draggable={false} />
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT: Sidebar — flush top/bottom, no rounded */}
                <div
                    className="w-[380px] xl:w-[420px] h-full flex flex-col bg-white dark:bg-[#18191a] shrink-0 z-10 border-l border-gray-200 dark:border-[#333]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-[#2a2a2a] flex items-center justify-between shrink-0">
                        <div className="flex gap-3 items-center min-w-0">
                            <Link to={`/${i18n.language}/u/${post.user?.id}/profile`} className="shrink-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 dark:border-[#333] shadow-sm">
                                    {post.user?.avatar
                                        ? <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 font-bold">{post.user?.name?.charAt(0).toUpperCase()}</div>}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <Link to={`/${i18n.language}/u/${post.user?.id}/profile`}>
                                    <p className="font-bold text-gray-900 dark:text-white leading-tight hover:underline truncate">{post.user?.name}</p>
                                </Link>
                                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 mt-0.5">
                                    <Globe className="w-3 h-3" />
                                    <span className="text-[11px]">{formatDate(post.created_at)}</span>
                                </div>
                            </div>
                        </div>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
                            <MoreHorizontal className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">

                        {/* Post content */}
                        {post.content && (
                            <div className="px-4 py-3 text-gray-900 dark:text-gray-100 text-[15px] leading-relaxed whitespace-pre-wrap break-words border-b border-gray-100 dark:border-[#2a2a2a] [&_img]:inline-block [&_img]:w-5 [&_img]:h-5 [&_img]:align-text-bottom [&_img]:mx-0.5" dir="auto">
                                {renderEmojiContent(post.content)}
                            </div>
                        )}

                        {/* Stats row */}
                        <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2a2a]">
                            <div className="flex items-center gap-1.5">
                                {totalReactions > 0 ? (
                                    <>
                                        <div className="flex -space-x-1 rtl:space-x-reverse">
                                            {topReactions.map((rKey, i) => {
                                                const r = REACTIONS.find(rx => rx.key === rKey);
                                                if (!r) return null;
                                                return (
                                                    <div key={rKey} className="w-[18px] h-[18px] rounded-full border-2 border-white dark:border-[#18191a] shadow bg-white overflow-hidden" style={{ zIndex: 3 - i }}>
                                                        <img src={r.gif} alt={r.label} className="w-full h-full object-cover scale-110" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{formatNumber(totalReactions)}</span>
                                    </>
                                ) : <span />}
                            </div>
                            <div className="font-medium opacity-80">
                                {formatNumber(commentCount)} {isAr ? 'تعليق' : 'comments'}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="px-1 py-0.5 flex items-center gap-1 border-b border-gray-100 dark:border-[#2a2a2a]">

                            {/* Like button */}
                            <div className="flex-1 relative" onMouseEnter={handleLikeMouseEnter} onMouseLeave={handleLikeMouseLeave}>
                                <button
                                    ref={likeButtonRef}
                                    onClick={handleLikeClick}
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                    onTouchMove={handleTouchEnd}
                                    className={cn(
                                        "w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors font-bold text-sm",
                                        userReaction
                                            ? (userReaction === 'like' ? "text-blue-500" : userReaction === 'love' ? "text-red-500" : "text-yellow-500") + " hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                                    )}
                                >
                                    {activeReaction
                                        ? <img src={activeReaction.gif} className="w-5 h-5 object-contain scale-110" alt={activeReaction.label} />
                                        : <ThumbsUp className="w-5 h-5" />}
                                    <span className="text-xs">{activeReaction ? activeReaction.label : (isAr ? 'أعجبني' : 'Like')}</span>
                                </button>
                            </div>

                            {/* Comment */}
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-xs">{isAr ? 'تعليق' : 'Comment'}</span>
                            </button>

                            {/* Share */}
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                                <Share2 className="w-5 h-5" />
                                <span className="text-xs">{isAr ? 'مشاركة' : 'Share'}</span>
                            </button>
                        </div>

                        {/* Comments */}
                        <div className="bg-white dark:bg-[#18191a] min-h-[100px]">
                            <CommentsSection itemId={post.id} type="post" inputPosition="top" postAuthor={post.user} onCountChange={setCommentCount} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Reaction popup — fixed position, never clipped by any container */}
            {showReactionPopup && (
                <div
                    className="fixed z-[99999] pointer-events-auto"
                    style={{
                        left: popupPos.left,
                        bottom: popupPos.bottom,
                        transform: 'translateX(-50%)',
                        animation: 'reactionPopupIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
                    }}
                    onMouseEnter={handlePopupMouseEnter}
                    onMouseLeave={handlePopupMouseLeave}
                >
                    {/* Arrow */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-[#2a2a2a] border-r border-b border-gray-100 dark:border-[#444]" />
                    <div className="relative flex items-center justify-center gap-0.5 bg-white dark:bg-[#2a2a2a] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.30)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.8)] border border-gray-100 dark:border-[#444] px-2 py-2 w-max">
                        {REACTIONS.map((r, idx) => (
                            <div
                                key={r.key}
                                className="relative flex flex-col items-center cursor-pointer px-0.5"
                                style={{ animationDelay: `${idx * 40}ms` }}
                                onClick={() => handleReactionClick(r.key)}
                                onMouseEnter={() => setHoveredReaction(r.key)}
                                onMouseLeave={() => setHoveredReaction(null)}
                            >
                                {/* Floating label */}
                                <div className={cn(
                                    "absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 whitespace-nowrap",
                                    hoveredReaction === r.key ? "opacity-100 scale-100" : "opacity-0 scale-90 translate-y-2"
                                )}>
                                    <span className="inline-block bg-[#1c1c1c] dark:bg-white text-white dark:text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                        {r.label}
                                    </span>
                                </div>
                                {/* GIF */}
                                <img
                                    src={r.gif}
                                    alt={r.label}
                                    draggable={false}
                                    loading="eager"
                                    className={cn(
                                        "select-none transition-all duration-200 rounded-full object-cover",
                                        hoveredReaction === r.key ? "w-12 h-12 -translate-y-3" : "w-9 h-9"
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};
