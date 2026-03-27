import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronLeft, ChevronRight, Loader2, ThumbsUp, Heart, Globe, MoreHorizontal } from 'lucide-react';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { renderEmojiContent } from '@/utils/render-content';
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";

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

interface PostTheatreModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post;
    initialIndex: number;
}

export const PostTheatreModal: React.FC<PostTheatreModalProps> = ({ isOpen, onClose, post, initialIndex }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [commentCount, setCommentCount] = useState(post.comments_count);

    // Keep a stable ref to onClose so the popstate useEffect doesn't re-run
    // every time PostCard re-renders (which would push multiple history entries).
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        setCurrentIndex(initialIndex);
        setIsImageLoaded(false);
    }, [initialIndex, isOpen]);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (post.media && post.media.length > 0) {
            setCurrentIndex(prev => (prev + 1) % post.media!.length);
            setIsImageLoaded(false);
        }
    }, [post.media]);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (post.media && post.media.length > 0) {
            setCurrentIndex(prev => (prev - 1 + post.media!.length) % post.media!.length);
            setIsImageLoaded(false);
        }
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

    // Intercept mobile back button to close theatre modal.
    // Dependencies: only isOpen and post.id — onClose is accessed via ref to prevent
    // re-running (and pushing a new history entry) on every PostCard render.
    useEffect(() => {
        if (window.innerWidth >= 768 || !isOpen) return;

        window.history.pushState({ modalKey: `theatre_${post.id}` }, '');

        const handlePopState = () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseRef.current();
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isOpen, post.id]); // ← onClose intentionally omitted; accessed via ref

    if (!isOpen || !post || !post.media || post.media.length === 0) return null;

    const currentMedia = post.media[currentIndex];

    // Mobile View
    if (window.innerWidth < 768) {
        return (
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent 
                    side="bottom" 
                    className="h-[100dvh] p-0 flex flex-col border-none bg-black overflow-hidden z-[9999] outline-none gap-0"
                >
                    {/* Media Area (Top 35vh) */}
                    <div className="h-[35vh] relative flex items-center justify-center bg-black shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 left-4 z-[60] p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Navigation Arrows for Mobile */}
                        {post.media.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 z-[60] p-2 bg-black/40 text-white rounded-full backdrop-blur-sm active:scale-95 transition-all"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 z-[60] p-2 bg-black/40 text-white rounded-full backdrop-blur-sm active:scale-95 transition-all"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        <div className="relative flex items-center justify-center w-full h-full p-4">
                             <img
                                key={currentMedia.media_url}
                                src={getImageUrl(currentMedia.media_url)}
                                alt=""
                                className={cn(
                                    "w-auto h-auto max-w-full max-h-full object-contain transition-opacity duration-300",
                                    isImageLoaded ? "opacity-100" : "opacity-0"
                                )}
                                onLoad={() => setIsImageLoaded(true)}
                                draggable={false}
                            />
                        </div>
                    </div>

                    {/* Comments Area (Remaining) */}
                    <div className="flex-1 bg-white dark:bg-[#0a0a0a] rounded-t-[20px] flex flex-col overflow-hidden -mt-4 z-10 border-t border-white/10 gap-0">
                        <div className="py-2 shrink-0 flex flex-col items-center border-b border-gray-100 dark:border-white/5">
                            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-800 mb-1 mt-0.5" />
                            <div className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{isAr ? 'التعليقات' : 'Comments'}</span>
                                <span className="text-gray-500 dark:text-gray-400 font-medium">({commentCount})</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-0 [&_.text-lg]:text-[15px] [&_.text-lg]:leading-snug [&_.w-10]:w-8 [&_.w-10]:h-8 [&_.w-12]:w-9 [&_.w-12]:h-9 [&_.mb-1]:mb-0 [&_.mt-1]:mt-0 [&_.mt-2]:mt-1 [&_p_img.inline-block]:!w-[22px] [&_p_img.inline-block]:!h-[22px] [&_.gap-3]:gap-2 [&_.gap-4]:gap-2 custom-scrollbar pt-0">
                             <CommentsSection 
                                itemId={post.id} 
                                type="post" 
                                inputPosition="bottom"
                                stickyInput={true}
                                onCountChange={setCommentCount}
                                postAuthor={post.user}
                             />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        );
    }

    const formatDate = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: isAr ? ar : enUS });
        } catch { return dateStr; }
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div 
            className={cn(
                "fixed inset-0 z-[9999] flex flex-col md:flex-row bg-black/95 backdrop-blur-sm overflow-hidden animate-in fade-in duration-200",
                !isAr && "md:flex-row-reverse" // Force sidebar on left for English
            )}
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* Image / Media Area */}
            <div className="h-[35vh] md:h-full md:flex-1 relative flex items-center justify-center p-2 md:p-8 bg-transparent">
                {/* Close Button & Header Overlays */}
                <button
                    onClick={onClose}
                    className="absolute top-6 left-6 z-[60] p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center backdrop-blur-md border border-white/10"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Navigation Arrows */}
                {post.media.length > 1 && (
                    <>
                        <button
                            onClick={handlePrev}
                            className="absolute left-6 top-1/2 -translate-y-1/2 z-[60] p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 active:scale-95 shadow-2xl"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-6 top-1/2 -translate-y-1/2 z-[60] p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 active:scale-95 shadow-2xl"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    </>
                )}

                {/* Media Content */}
                <div className="relative flex items-center justify-center w-full h-full max-w-[1200px] mx-auto overflow-hidden">
                    {currentMedia.media_type === 'video' ? (
                        <video
                            src={getImageUrl(currentMedia.media_url)}
                            controls
                            className="w-auto h-auto max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
                            autoPlay
                        />
                    ) : (
                        <>
                            {!isImageLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="w-12 h-12 text-white/50 animate-spin" />
                                </div>
                            )}
                            <img
                                key={currentMedia.media_url}
                                src={getImageUrl(currentMedia.media_url)}
                                alt=""
                                className={cn(
                                    "w-auto h-auto max-w-full max-h-[90vh] object-contain shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500",
                                    isImageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                                )}
                                onLoad={() => setIsImageLoaded(true)}
                                draggable={false}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Comments Sidebar - Narrower, Rounded, Floating-style */}
            <div 
                className={cn(
                    "flex-1 md:w-[320px] lg:w-[350px] md:h-[calc(100vh-32px)] md:m-4 bg-white dark:bg-[#111] flex flex-col shrink-0 overflow-hidden shadow-2xl transition-all duration-300",
                    "md:rounded-2xl border border-white/5",
                    "[&_.text-lg]:max-md:text-[15px] [&_.text-lg]:max-md:leading-snug [&_.w-10]:max-md:w-8 [&_.w-10]:max-md:h-8 [&_.w-12]:max-md:w-9 [&_.w-12]:max-md:h-9 [&_.mb-1]:max-md:mb-0 [&_.mt-1]:max-md:mt-0 [&_.mt-2]:max-md:mt-1 [&_p_img.inline-block]:max-md:!w-[22px] [&_p_img.inline-block]:max-md:!h-[22px] [&_.gap-3]:max-md:gap-2 [&_.gap-4]:max-md:gap-2"
                )}
            >
                {/* Fixed Header */}
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/20 backdrop-blur-md">
                    <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white dark:border-[#333] shadow-sm">
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
                                <span className="text-[11px] font-medium">{formatDate(post.created_at)}</span>
                            </div>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Post text */}
                    {post.content && (
                        <div
                            className="p-5 text-gray-900 dark:text-gray-100 text-[15px] leading-relaxed whitespace-pre-wrap break-words border-b border-gray-50 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02]"
                            dir="auto"
                        >
                            {renderEmojiContent(post.content)}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="px-4 py-3 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 border-b border-gray-50 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white dark:border-[#111]">
                                    <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                                </div>
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-white dark:border-[#111]">
                                    <Heart className="w-2.5 h-2.5 text-white fill-white" />
                                </div>
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{formatNumber(post.likes_count)}</span>
                        </div>
                        <div className="flex gap-3 font-bold opacity-80">
                            <span>{formatNumber(post.comments_count)} {isAr ? 'تعليق' : 'Comments'}</span>
                        </div>
                    </div>

                    {/* Comments section */}
                    <div className="bg-white dark:bg-[#111] min-h-[100px]">
                        <CommentsSection 
                            itemId={post.id} 
                            type="post" 
                            inputPosition={window.innerWidth < 768 ? "bottom" : "top"}
                            stickyInput={window.innerWidth < 768}
                            postAuthor={post.user}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
