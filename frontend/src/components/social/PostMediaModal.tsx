import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    ChevronLeft,
    ChevronRight,
    ThumbsUp,
    MessageCircle,
    Heart,
    Globe,
    MoreHorizontal,
    Loader2,
} from 'lucide-react';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import { renderEmojiContent } from '@/utils/render-content';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface PostMedia {
    id: number;
    media_url: string;
    media_type: 'image' | 'video';
}

interface Post {
    id: number;
    user_id: number;
    content: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        avatar?: string;
    };
    media?: PostMedia[];
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
}

interface PostMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
    initialIndex: number;
    openedFromComment?: boolean;
    scrollPercent?: number;
}

export const PostMediaModal: React.FC<PostMediaModalProps> = ({ isOpen, onClose, post, initialIndex, openedFromComment, scrollPercent }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    // Desktop state
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const postContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openedFromComment && scrollPercent !== undefined) {
             const applyScroll = () => {
                 if (scrollContainerRef.current && postContentRef.current) {
                     const container = scrollContainerRef.current;
                     const postContent = postContentRef.current;
                     const targetY = postContent.clientHeight * scrollPercent;
                     const scrollTop = targetY - (container.clientHeight / 2);
                     container.scrollTop = Math.max(0, scrollTop);
                 } else if (imageContainerRef.current) {
                     const container = imageContainerRef.current;
                     const targetY = container.scrollHeight * scrollPercent;
                     const scrollTop = targetY - (container.clientHeight / 2);
                     container.scrollTop = Math.max(0, scrollTop);
                 }
             };
             applyScroll();
             const timer = setTimeout(applyScroll, 200);
             return () => clearTimeout(timer);
        }
    }, [openedFromComment, scrollPercent, currentIndex, isImageLoaded, isOpen]);

    // Mobile state
    const [mobileLoadedImages, setMobileLoadedImages] = useState<Set<number>>(new Set());

    useEffect(() => {
        setCurrentIndex(initialIndex);
        setIsImageLoaded(false);
    }, [initialIndex, isOpen]);

    // Lock scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Keyboard nav
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'ArrowLeft') handlePrev();
    }, [isOpen, currentIndex]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen || !post) return null;

    const hasMedia = post.media && post.media.length > 0;
    const currentMedia = hasMedia ? post.media![currentIndex] : null;

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (hasMedia) {
            setCurrentIndex(prev => (prev + 1) % post.media!.length);
            setIsImageLoaded(false);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (hasMedia) {
            setCurrentIndex(prev => (prev - 1 + post.media!.length) % post.media!.length);
            setIsImageLoaded(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: isAr ? ar : enUS });
        } catch { return dateStr; }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col md:flex-row pointer-events-none">
            {/* We add pointer-events-none to root to allow clicking through the invisible layer if needed, but inner layers will have pointer-events-auto */}

            {/* ============================================================
                MOBILE LAYOUT  (hidden on md+)
            ============================================================ */}
            <div className="flex flex-col flex-1 md:hidden overflow-hidden bg-black pointer-events-auto">

                {hasMedia && (
                    <>
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
                            <button
                                onClick={onClose}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <span className="text-white/50 text-xs">
                                {post.media!.length} {isAr ? 'صور' : post.media!.length === 1 ? 'photo' : 'photos'}
                            </span>
                            <div className="w-8" />
                        </div>

                        {/* Scrollable stacked images */}
                        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '120px' }}>
                            <div className="flex flex-col gap-px">
                                {post.media!.map((media, idx) => (
                                    <div key={media.id} className="relative w-full bg-black flex items-center justify-center min-h-[200px]">
                                        {media.media_type === 'video' ? (
                                            <video
                                                src={getImageUrl(media.media_url)}
                                                controls
                                                className="w-full max-h-[80vh] object-contain"
                                                preload="metadata"
                                            />
                                        ) : (
                                            <>
                                                {!mobileLoadedImages.has(idx) && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 text-white/30 animate-spin" />
                                                    </div>
                                                )}
                                                <img
                                                    src={getImageUrl(media.media_url)}
                                                    alt=""
                                                    className={cn(
                                                        "w-full object-contain transition-opacity duration-300",
                                                        mobileLoadedImages.has(idx) ? "opacity-100" : "opacity-0"
                                                    )}
                                                    onLoad={() => setMobileLoadedImages(prev => new Set([...prev, idx]))}
                                                    draggable={false}
                                                />
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Fixed bottom info bar */}
                <div
                    className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-white/10"
                    style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
                >
                    <div className="px-4 pt-3 pb-1">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20">
                                {post.user?.avatar ? (
                                    <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-600 text-white font-bold text-xs">
                                        {post.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm leading-tight">{post.user?.name}</p>
                                <div className="flex items-center gap-1 text-white/50">
                                    <Globe className="w-2.5 h-2.5" />
                                    <span className="text-[10px]">{formatDate(post.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {post.content && (
                            <div
                                className="text-white/75 text-[11px] leading-relaxed mb-1.5 line-clamp-2 whitespace-pre-wrap break-words [&_img]:inline-block [&_img]:w-3.5 [&_img]:h-3.5 [&_img]:align-text-bottom [&_img]:mx-0.5"
                                dir="auto"
                            >
                                {renderEmojiContent(post.content)}
                            </div>
                        )}

                        <div className="flex items-center gap-4 text-white/55 text-[11px]">
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-0.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center border border-black/40">
                                        <ThumbsUp className="w-2 h-2 text-white fill-white" />
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center border border-black/40">
                                        <Heart className="w-2 h-2 text-white fill-white" />
                                    </div>
                                </div>
                                <span className="font-semibold text-white/80">{post.likes_count}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                <span>{post.comments_count} {isAr ? 'تعليق' : 'comments'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================
                DESKTOP LAYOUT  (hidden on mobile)
            ============================================================ */}
            {openedFromComment ? (
                /* Facebook Style White Dialog */
                <div 
                    className="hidden md:flex fixed inset-0 z-[9999] bg-white/80 dark:bg-black/80 items-center justify-center p-4 pointer-events-auto"
                    onClick={onClose}
                >
                    <div 
                        className="bg-white dark:bg-[#242526] w-full max-w-[760px] h-full max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative border border-gray-200 dark:border-[#333]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#2a2a2a] shrink-0">
                            <button
                                onClick={onClose}
                                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#3a3b3c] dark:hover:bg-[#4e4f50] rounded-full text-gray-600 dark:text-gray-300 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="font-bold text-lg text-black dark:text-white">
                                {isAr ? `منشور ${post.user?.name}` : `${post.user?.name}'s Post`}
                            </h3>
                            <div className="w-9" />
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollContainerRef}>
                            <div className="p-0">
                                
                                <div ref={postContentRef}>
                                    {/* Post Author Info */}
                                <div className="p-4 flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-[#333]">
                                        {post.user?.avatar ? (
                                            <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#2a2a2a] text-gray-500 font-bold">
                                                {post.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{post.user?.name}</p>
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
                                            <Globe className="w-3 h-3" />
                                            <span className="text-xs">{formatDate(post.created_at)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Post Content */}
                                {post.content && (
                                    <div
                                        className="px-4 pb-3 text-gray-900 dark:text-gray-100 text-[15px] whitespace-pre-wrap break-words [&_img]:inline-block [&_img]:w-5 [&_img]:h-5 [&_img]:align-text-bottom [&_img]:mx-0.5"
                                        dir="auto"
                                    >
                                        {renderEmojiContent(post.content)}
                                    </div>
                                )}

                                {/* Post Media */}
                                {post.media && post.media.length > 0 && (
                                    <div className={cn(
                                        "grid gap-1 mt-2 bg-gray-100 dark:bg-[#111]",
                                        post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                                    )}>
                                        {post.media.slice(0, 4).map((m, idx) => {
                                            const isLast = idx === 3;
                                            const remainingCount = post.media!.length - 4;
                                            const hasMore = isLast && remainingCount > 0;
                                            
                                            return (
                                                <div key={m.id} className={cn(
                                                    "relative bg-black flex justify-center flex-col items-center",
                                                    post.media!.length === 1 ? "w-full" : 
                                                    (post.media!.length === 3 && idx === 0) ? "col-span-2 aspect-[16/9] overflow-hidden" : "overflow-hidden aspect-square"
                                                )}>
                                                    {m.media_type === 'video' ? (
                                                        <video src={getImageUrl(m.media_url)} controls className={cn("w-full h-auto", post.media!.length === 1 ? "object-contain max-h-[500px]" : "h-full object-cover")} />
                                                    ) : (
                                                        <img 
                                                            src={getImageUrl(m.media_url)} 
                                                            alt="" 
                                                            className={cn(
                                                                post.media!.length === 1 ? "w-auto h-auto max-w-full max-h-[500px] object-contain mx-auto" : "w-full h-full object-cover"
                                                            )}
                                                            onLoad={() => {
                                                                if (scrollContainerRef.current && postContentRef.current && scrollPercent !== undefined) {
                                                                    const container = scrollContainerRef.current;
                                                                    const postContent = postContentRef.current;
                                                                    const targetY = postContent.clientHeight * scrollPercent;
                                                                    const scrollTop = targetY - (container.clientHeight / 2);
                                                                    container.scrollTop = Math.max(0, scrollTop);
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    
                                                    {hasMore && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                                                            <span className="text-white text-3xl font-bold">+{remainingCount}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2a2a] mx-2 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex -space-x-1">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <ThumbsUp className="w-3 h-3 text-white fill-white" />
                                            </div>
                                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <Heart className="w-3 h-3 text-white fill-white" />
                                            </div>
                                        </div>
                                        <span className="font-semibold">{post.likes_count}</span>
                                    </div>
                                    <div className="flex gap-3 font-medium">
                                        <span>{post.comments_count} {isAr ? 'تعليق' : 'Comments'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="bg-white dark:bg-[#242526] mt-2">
                                <CommentsSection itemId={post.id} type="post" postAuthor={post.user} />
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Original Black Viewer Layout */
                <div className="hidden md:flex flex-col flex-1 overflow-hidden bg-black/95 backdrop-blur-xl relative pointer-events-auto">

                {/* Close button (top-left) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 z-[60] p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {hasMedia && currentMedia ? (
                    <>
                        {/* Media Viewer (Top) */}
                        <div 
                            ref={imageContainerRef}
                            className="flex-1 overflow-y-auto group flex items-start justify-center custom-scrollbar relative"
                        >
                            {/* Navigation Arrows */}
                            {post.media!.length > 1 && (
                                <>
                                    <button
                                        onClick={handlePrev}
                                        className="fixed left-6 top-[30%] -translate-y-1/2 z-[60] p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="fixed right-6 top-[30%] -translate-y-1/2 z-[60] p-3 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}

                            {/* Media Content */}
                            <div className="w-full min-h-full flex flex-col items-center justify-start pb-8">
                                {currentMedia.media_type === 'video' ? (
                                    <video
                                        src={getImageUrl(currentMedia.media_url)}
                                        controls
                                        className="max-w-4xl w-full h-auto object-contain shadow-2xl mt-8"
                                        autoPlay
                                    />
                                ) : (
                                    <div className="relative w-full max-w-4xl flex items-center justify-center min-h-[50vh]">
                                        {!isImageLoaded && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Loader2 className="w-10 h-10 text-white/50 animate-spin" />
                                            </div>
                                        )}
                                        <img
                                            key={currentMedia.media_url}
                                            src={getImageUrl(currentMedia.media_url)}
                                            alt=""
                                            className={cn(
                                                "w-full h-auto object-contain shadow-2xl transition-opacity duration-300 max-w-full",
                                                isImageLoaded ? "opacity-100" : "opacity-0"
                                            )}
                                            onLoad={() => setIsImageLoaded(true)}
                                            draggable={false}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Counter indicator */}
                            {post.media!.length > 1 && (
                                <div className="fixed bottom-[42%] left-1/2 -translate-x-1/2 flex gap-1.5 z-[60] p-2 bg-black/40 rounded-full backdrop-blur-md">
                                    {post.media!.map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); setIsImageLoaded(false); }}
                                            className={cn(
                                                "rounded-full transition-all",
                                                i === currentIndex ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Comments Section (Bottom) */}
                        <div className="h-[43%] bg-white dark:bg-[#1a1a1a] flex flex-col border-t border-gray-100 dark:border-[#333] shrink-0 w-full max-w-4xl mx-auto rounded-t-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-[50]">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between shrink-0 bg-white dark:bg-[#1a1a1a]">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-[#333]">
                                        {post.user?.avatar ? (
                                            <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#2a2a2a] text-gray-500 font-bold">
                                                {post.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{post.user?.name}</p>
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
                                            <Globe className="w-3 h-3" />
                                            <span className="text-[10px] md:text-xs">{formatDate(post.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Bottom Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1a1a]">
                                {/* Post text */}
                                {post.content && (
                                    <div
                                        className="p-4 text-gray-900 dark:text-gray-100 text-sm md:text-base whitespace-pre-wrap break-words border-b border-gray-100 dark:border-[#2a2a2a] [&_img]:inline-block [&_img]:w-5 [&_img]:h-5 [&_img]:align-text-bottom [&_img]:mx-0.5"
                                        dir="auto"
                                    >
                                        {renderEmojiContent(post.content)}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="px-4 py-3 flex justify-between items-center text-xs md:text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2a2a]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex -space-x-1">
                                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <ThumbsUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-white fill-white" />
                                            </div>
                                            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <Heart className="w-2.5 h-2.5 md:w-3 md:h-3 text-white fill-white" />
                                            </div>
                                        </div>
                                        <span className="font-semibold">{post.likes_count}</span>
                                    </div>
                                    <div className="flex gap-3 font-medium">
                                        <span>{post.comments_count} {isAr ? 'تعليق' : 'Comments'}</span>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="bg-white dark:bg-[#1a1a1a]">
                                    <CommentsSection itemId={post.id} type="post" postAuthor={post.user} />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* No Media Case (Text Only Modal) */
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1a1a1a] rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between shrink-0">
                                <div className="flex gap-3 items-center">
                                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-[#333]">
                                        {post.user?.avatar ? (
                                            <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#2a2a2a] text-gray-500 font-bold">
                                                {post.user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{post.user?.name}</p>
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-0.5">
                                            <Globe className="w-3 h-3" />
                                            <span className="text-xs">{formatDate(post.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {/* Post text */}
                                {post.content && (
                                    <div
                                        className="p-4 text-gray-900 dark:text-gray-100 text-base whitespace-pre-wrap break-words border-b border-gray-100 dark:border-[#2a2a2a] [&_img]:inline-block [&_img]:w-6 [&_img]:h-6 [&_img]:align-text-bottom [&_img]:mx-0.5"
                                        dir="auto"
                                    >
                                        {renderEmojiContent(post.content)}
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-[#2a2a2a]">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex -space-x-1">
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <ThumbsUp className="w-3 h-3 text-white fill-white" />
                                            </div>
                                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                                                <Heart className="w-3 h-3 text-white fill-white" />
                                            </div>
                                        </div>
                                        <span className="font-semibold">{post.likes_count}</span>
                                    </div>
                                    <div className="flex gap-3 font-medium">
                                        <span>{post.comments_count} {isAr ? 'تعليق' : 'Comments'}</span>
                                    </div>
                                </div>

                                {/* Comments */}
                                <div className="bg-white dark:bg-[#1a1a1a]">
                                    <CommentsSection itemId={post.id} type="post" postAuthor={post.user} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>
            )}
        </div>
    );
};
