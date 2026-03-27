import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { AlignLeft, Smile, Sparkles, ChevronDown, Loader2, SendHorizontal } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';

import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { CommentItem } from './CommentItem';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { QuickEmojiRow, QUICK_EMOJIS } from './QuickEmojiRow';
import { CommentsSkeleton } from './CommentsSkeleton';
import { useSocketStore } from '@/stores/socket-store';

interface CommentsSectionProps {
    itemId: number;
    type: 'episode' | 'post' | 'chapter';
    stickyInput?: boolean;
    inputPosition?: 'top' | 'bottom';
    onCommentInputRender?: (inputElement: React.ReactNode) => void;
    onCountChange?: (count: number) => void;
    postAuthor?: {
        id: number;
        name: string;
        avatar?: string;
    } | null;
}

import { Comment } from '@/types/models';
export interface CommentsSectionHandle {
    openAddCommentModal: () => void;
}

const PAGE_SIZE = 10;

export const CommentsSection = forwardRef<CommentsSectionHandle, CommentsSectionProps>(({ 
    itemId, 
    type, 
    stickyInput = false, 
    inputPosition = 'top', 
    onCommentInputRender,
    onCountChange,
    postAuthor,
}, ref) => {
    useImperativeHandle(ref, () => ({
        openAddCommentModal: () => setIsAddCommentModalOpen(true)
    }));
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isMainInputFocused, setIsMainInputFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMainEmojiPicker, setShowMainEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [isAddCommentModalOpen, setIsAddCommentModalOpen] = useState(false);
    const modalInputRef = useRef<any>(null);
    const [searchParams] = useSearchParams();
    const highlightedCommentId = searchParams.get('commentId') ? parseInt(searchParams.get('commentId')!, 10) : null;
    const [highlightedComment, setHighlightedComment] = useState<any>(null);
    const [isHighlightLoading, setIsHighlightLoading] = useState(false);
    const [showAllComments, setShowAllComments] = useState(!highlightedCommentId);

    useEffect(() => {
        setShowAllComments(!highlightedCommentId);
    }, [highlightedCommentId]);

    useEffect(() => {
        if (isAddCommentModalOpen) {
            const timer = setTimeout(() => {
                modalInputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isAddCommentModalOpen]);

    const onCloseAddCommentRef = useRef(() => setIsAddCommentModalOpen(false));
    useEffect(() => { onCloseAddCommentRef.current = () => setIsAddCommentModalOpen(false); }, []);

    // Intercept mobile back button to close Add Comment modal.
    useEffect(() => {
        if (window.innerWidth >= 768 || !isAddCommentModalOpen) return;

        const stateKey = `addComment_${itemId}`;
        window.history.pushState({ modalKey: stateKey }, '');

        const handlePopState = (e: PopStateEvent) => {
            if (e.state?.modalKey === stateKey) return;
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseAddCommentRef.current();
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isAddCommentModalOpen, itemId]);

    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top');
    const emojiRef = useRef<HTMLDivElement>(null);
    const customEmojiRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    // Refs for infinite scroll
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<() => void>(() => {});

    // Build API URL
    const buildUrl = useCallback((pageNum: number) => {
        const base = type === 'episode'
            ? `/episodes/${itemId}/comments`
            : type === 'chapter'
            ? `/chapters/${itemId}/comments`
            : `/posts/${itemId}/comments`;
        return `${base}?page=${pageNum}&limit=${PAGE_SIZE}`;
    }, [type, itemId]);

    // Fetch a single page of comments
    const fetchPage = useCallback(async (pageNum: number, reset = false) => {
        try {
            if (pageNum === 1) setIsLoading(true);
            else setIsMoreLoading(true);

            const res = await api.get(buildUrl(pageNum));

            let fetched: Comment[];
            let hasMoreFromServer: boolean | null = null;

            if (type === 'post') {
                fetched = res.data.data || [];
                hasMoreFromServer = res.data.has_more ?? null;
                if (res.data.total != null) setTotalCount(res.data.total);
            } else {
                fetched = res.data || [];
                const headerTotal = res.headers?.['x-total-count'];
                if (headerTotal) setTotalCount(parseInt(headerTotal, 10));
                hasMoreFromServer = null;
            }

            const filtered = fetched.filter(c => c.id !== highlightedCommentId && (!highlightedComment || c.id !== highlightedComment.id));
            setComments(prev => reset ? filtered : [...prev, ...filtered]);

            if (hasMoreFromServer !== null) {
                setHasMore(hasMoreFromServer);
            } else {
                setHasMore(fetched.length >= PAGE_SIZE);
            }
        } catch (error) {
            console.error('Failed to fetch comments', error);
            setHasMore(false);
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    }, [buildUrl, type]);

    // Fetch highlighted comment if ID is present
    const fetchHighlighted = useCallback(async () => {
        if (!highlightedCommentId) {
            setHighlightedComment(null);
            return;
        }
        try {
            setIsHighlightLoading(true);
            const endpoint = type === 'post' 
                ? `/posts/comments/${highlightedCommentId}` 
                : `/comments/${highlightedCommentId}`;
            const res = await api.get(endpoint);
            // The backend now automatically returns the root parent if it's a reply
            setHighlightedComment(res.data);
        } catch (error) {
            console.error('Failed to fetch highlighted comment', error);
        } finally {
            setIsHighlightLoading(false);
        }
    }, [highlightedCommentId, type]);

    useEffect(() => {
        fetchHighlighted();
    }, [fetchHighlighted]);

    // Initial load + reset when itemId changes
    useEffect(() => {
        setComments([]);
        setPage(1);
        setHasMore(true);
        fetchPage(1, true);
    }, [itemId, fetchPage]);

    // Load next page
    const loadMore = useCallback(() => {
        if (isMoreLoading || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPage(nextPage);
    }, [isMoreLoading, hasMore, page, fetchPage]);

    useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

    const setupObserver = useCallback(() => {
        if (observer.current) observer.current.disconnect();
        if (!scrollContainerRef.current || !sentinelRef.current || !hasMore) return;

        observer.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreRef.current();
                }
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px 200px 0px',
            }
        );
        observer.current.observe(sentinelRef.current);
    }, [hasMore]);

    useEffect(() => {
        setupObserver();
        return () => { if (observer.current) observer.current.disconnect(); };
    }, [setupObserver, comments.length]);

    const isConnected = useSocketStore(state => state.isConnected);
    const subscribe = useSocketStore(state => state.subscribe);
    const unsubscribe = useSocketStore(state => state.unsubscribe);

    useEffect(() => {
        if (!itemId) return;

        const topic = `${type}:${itemId}`;
        if (isConnected) subscribe(topic);

        const handleNewComment = (event: any) => {
            const comment = event.detail;
            const matches = type === 'episode'
                ? comment.episode_id === itemId
                : type === 'chapter'
                ? comment.chapter_id === itemId
                : comment.post_id === itemId;

            if (!matches) return;

            setHighlightedComment((prev: any) => {
                if (!prev) return prev;
                if (prev.id === comment.id) return prev;
                if (prev.children?.some((ch: any) => ch.id === comment.id)) return prev;

                const findRootParentId = (root: any, targetId: number): boolean => {
                    if (root.id === targetId) return true;
                    if (root.children?.some((ch: any) => ch.id === targetId)) return true;
                    return false;
                };

                if (comment.parent_id && findRootParentId(prev, comment.parent_id)) {
                    return { ...prev, children: [...(prev.children || []), comment] };
                }
                return prev;
            });

            setComments(prev => {
                const currentComments = prev || [];
                if (currentComments.some(c => c.id === comment.id)) return prev;
                if (currentComments.some(c => c.children?.some((ch: any) => ch.id === comment.id))) return prev;

                if (comment.parent_id) {
                    const findRootParentId = (list: Comment[], targetId: number): number | null => {
                        if (list.some(c => c.id === targetId)) return targetId;
                        for (const c of list) {
                            if (c.children?.some((ch: any) => ch.id === targetId)) return c.id;
                        }
                        return null;
                    };

                    const rootId = findRootParentId(currentComments, comment.parent_id);
                    if (rootId !== null) {
                        return currentComments.map(c => {
                            if (c.id === rootId) {
                                if (c.children?.some((ch: any) => ch.id === comment.id)) return c;
                                return { ...c, children: [...(c.children || []), comment] };
                            }
                            return c;
                        });
                    }
                    return [comment, ...prev];
                }
                return [comment, ...prev];
            });
        };

        const handleCommentLike = (event: any) => {
            const data = event.detail;

            setHighlightedComment((prev: any) => {
                if (!prev) return prev;
                if (prev.id === data.comment_id) {
                    const diff = data.is_like ? 1 : -1;
                    return { ...prev, likes: (prev.likes || 0) + diff };
                }
                if (prev.children && prev.children.length > 0) {
                    return {
                        ...prev,
                        children: prev.children.map((ch: any) =>
                            ch.id === data.comment_id
                                ? { ...ch, likes: (ch.likes || 0) + (data.is_like ? 1 : -1) }
                                : ch
                        )
                    };
                }
                return prev;
            });

            setComments(prev => prev.map(c => {
                if (c.id === data.comment_id) {
                    const diff = data.is_like ? 1 : -1;
                    return { ...c, likes: (c.likes || 0) + diff };
                }
                if (c.children && c.children.length > 0) {
                    return {
                        ...c,
                        children: c.children.map((ch: Comment) =>
                            ch.id === data.comment_id
                                ? { ...ch, likes: (ch.likes || 0) + (data.is_like ? 1 : -1) }
                                : ch
                        )
                    };
                }
                return c;
            }));
        };

        window.addEventListener('app:comment', handleNewComment);
        window.addEventListener('app:comment_like', handleCommentLike);

        return () => {
            unsubscribe(topic);
            window.removeEventListener('app:comment', handleNewComment);
            window.removeEventListener('app:comment_like', handleCommentLike);
        };
    }, [itemId, isConnected, type, subscribe, unsubscribe]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowMainEmojiPicker(false);
            }
            if (customEmojiRef.current && !customEmojiRef.current.contains(event.target as Node)) {
                setShowCustomEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getAvatarUrl = (avatar?: string) => getImageUrl(avatar);

    useEffect(() => {
        if (onCountChange) {
            onCountChange(totalCount > 0 ? totalCount : comments.length);
        }
    }, [totalCount, comments.length, onCountChange]);

    const addComment = async () => {
        if (!user) {
            const currentLang = i18n.language || 'ar';
            navigate(`/${currentLang}/auth/login`);
            return;
        }
        if (!newComment.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const url = type === 'episode' ? `/episodes/${itemId}/comments`
                : type === 'chapter' ? `/chapters/${itemId}/comments`
                : `/posts/${itemId}/comments`;
            const res = await api.post(url, { content: newComment });
            setComments(prev => {
                const currentComments = prev || [];
                if (currentComments.some(c => c.id === res.data.id)) return prev;
                return [res.data, ...prev];
            });
            setNewComment('');
            setIsMainInputFocused(false);
            setShowMainEmojiPicker(false);
            setShowCustomEmojiPicker(false);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('app:scroll_to_comment', { detail: { id: res.data.id } }));
            }, 300);
        } catch (error) {
            console.error('Failed to add comment', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        const targetRef = isAddCommentModalOpen ? modalInputRef : inputRef;
        if (targetRef.current && (targetRef.current as any).insertText) {
            (targetRef.current as any).insertText(emojiData.emoji);
        } else {
            setNewComment(prev => prev + emojiData.emoji);
        }
        setShowMainEmojiPicker(false);
    };

    const onCustomEmojiClick = (emojiUrl: string) => {
        const targetRef = isAddCommentModalOpen ? modalInputRef : inputRef;
        if (targetRef.current && (targetRef.current as any).insertEmoji) {
            (targetRef.current as any).insertEmoji(emojiUrl);
        }
    };

    const handleRefresh = () => {
        setComments([]);
        setPage(1);
        setHasMore(true);
        fetchPage(1, true);
        if (highlightedCommentId) {
            fetchHighlighted();
        }
    };

    const onUpdateSuccess = (updatedComment: Comment) => {
        setHighlightedComment((prev: any) => {
            if (!prev) return prev;
            if (prev.id === updatedComment.id) return { ...prev, content: updatedComment.content };
            if (prev.children && prev.children.length > 0) {
                return {
                    ...prev,
                    children: prev.children.map((ch: any) =>
                        ch.id === updatedComment.id ? { ...ch, content: updatedComment.content } : ch
                    )
                };
            }
            return prev;
        });

        setComments(prev => prev.map(c => {
            if (c.id === updatedComment.id) return { ...c, content: updatedComment.content };
            if (c.children && c.children.length > 0) {
                return {
                    ...c,
                    children: c.children.map((ch: Comment) =>
                        ch.id === updatedComment.id ? { ...ch, content: updatedComment.content } : ch
                    )
                };
            }
            return c;
        }));
    };

    const onDeleteSuccess = (commentId: number) => {
        setHighlightedComment((prev: any) => {
            if (!prev) return prev;
            if (prev.id === commentId) return null;
            if (prev.children && prev.children.length > 0) {
                return {
                    ...prev,
                    children: prev.children.filter((ch: any) => ch.id !== commentId)
                };
            }
            return prev;
        });

        setComments(prev =>
            prev
                .filter(c => c.id !== commentId)
                .map(c => {
                    if (c.children && c.children.length > 0) {
                        return { ...c, children: c.children.filter((ch: Comment) => ch.id !== commentId) };
                    }
                    return c;
                })
        );
    };

    const renderInput = () => {
        if (!user) {
            return (
                <div
                    onClick={() => {
                        const currentLang = i18n.language || 'ar';
                        navigate(`/${currentLang}/auth/login`);
                    }}
                    className="flex flex-col mb-1 animate-in fade-in duration-300 w-full"
                >
                    <div className="flex items-center justify-center w-full py-4 px-6 bg-gray-100 hover:bg-gray-200 dark:bg-gray-100 dark:hover:bg-gray-200 cursor-pointer rounded-full transition-colors border border-gray-300 shadow-sm mt-2">
                        <span className="text-black font-extrabold text-[15px]">
                            {isAr ? 'يجب تسجيل الدخول لكي تستطيع التعليق او الرد' : 'You must log in to comment or reply'}
                        </span>
                    </div>
                </div>
            );
        }

        const trigger = (
            <div 
                className="flex items-center gap-3 w-full p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl border border-gray-100 dark:border-[#222] transition-all group mt-2"
                onClick={() => setIsAddCommentModalOpen(true)}
            >
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-purple-600 rounded-full select-none shadow-md ring-1 ring-gray-100 dark:ring-white/10 relative transition-transform group-hover:scale-105">
                    {user?.avatar ? (
                        <img src={getImageUrl(user.avatar)} alt={user.name} className="absolute inset-0 object-cover w-full h-full block rounded-full" />
                    ) : (
                        <span className="text-lg font-bold text-white">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    )}
                </div>
                <div className="flex-1 text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {isAr ? 'إضافة تعليق...' : 'Add a comment...'}
                </div>
            </div>
        );

        return (
            <div className="flex flex-col w-full animate-in fade-in duration-300">
                {trigger}
            </div>
        );
    };

    return (
        <div className={`flex-1 flex flex-col min-h-0 bg-transparent relative ${stickyInput ? 'p-0' : 'mt-0 px-0.5 md:px-2 pb-4 pt-0'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            
            {/* Highlighted Comment Section */}
            {highlightedComment && (
                <div className="mb-6 p-1 border-b-4 border-blue-500/20 bg-blue-50/10 dark:bg-blue-900/5 rounded-2xl">
                    <div className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        {isAr ? 'تم تمييز هذا التعليق عبر الإشعار' : 'Highlighted Comment from Notification'}
                    </div>
                    <CommentItem
                        comment={highlightedComment}
                        itemId={itemId}
                        type={type}
                        onUpdateSuccess={onUpdateSuccess}
                        onDeleteSuccess={onDeleteSuccess}
                        onReplySuccess={handleRefresh}
                        isHighlighted={true}
                        activeCommentId={highlightedCommentId}
                        postAuthor={postAuthor}
                    />
                    
                    {!showAllComments && (
                        <div className="mt-4 mb-2 flex justify-center">
                            <button 
                                onClick={() => setShowAllComments(true)}
                                className="px-6 py-2.5 bg-white hover:bg-gray-50 dark:bg-[#1a1a1a] dark:hover:bg-[#222] text-gray-800 dark:text-gray-200 font-extrabold rounded-full transition-all text-sm shadow inline-flex items-center gap-2 active:scale-95 border border-gray-100 dark:border-white/10"
                            >
                                <ChevronDown className="w-4 h-4" />
                                {isAr ? 'أظهار جميع تعليقات المنشور' : 'Show all post comments'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showAllComments && (
                <>
                    <div className={`hidden md:flex items-center justify-between mb-2 ${inputPosition === 'bottom' ? 'px-0.5 md:px-2 pt-4' : ''}`}>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {totalCount > 0 ? totalCount : comments.length} {isAr ? 'تعليق' : 'comments'}
                </h3>
                <button className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] px-4 py-2 rounded-full transition">
                    <AlignLeft className="w-5 h-5" />
                    <span>{isAr ? 'الترتيب حسب' : 'Sort by'}</span>
                </button>
            </div>

            {!stickyInput && inputPosition === 'top' && (
                <div className="px-0">
                    {renderInput()}
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-12 h-12 text-black dark:text-gray-400 animate-spin" />
                </div>
            ) : comments && comments.length > 0 ? (
                <div
                    ref={scrollContainerRef}
                    className={`flex-1 space-y-0 md:space-y-4 overflow-y-auto custom-scrollbar overflow-x-hidden pb-4 ${inputPosition === 'bottom' ? 'px-0.5 md:px-2' : ''}`}
                >
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            type={type}
                            itemId={itemId}
                            depth={0}
                            onReplySuccess={handleRefresh}
                            onUpdateSuccess={onUpdateSuccess}
                            onDeleteSuccess={onDeleteSuccess}
                            postAuthor={postAuthor}
                        />
                    ))}

                    {hasMore && (
                        <div ref={sentinelRef} className="flex justify-center mt-4 mb-4 h-10">
                            {isMoreLoading && (
                                <Loader2 className="w-7 h-7 animate-spin text-blue-600 dark:text-gray-400" />
                            )}
                        </div>
                    )}

                    {!hasMore && comments.length > 0 && (
                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 py-4">
                            {isAr ? 'تم عرض جميع التعليقات' : 'All comments loaded'}
                        </p>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">{isAr ? 'لا توجد تعليقات حتى الآن. كن أول من يعلق!' : 'No comments yet. Be the first to comment!'}</p>
                </div>
            )}

            {!stickyInput && inputPosition === 'bottom' && (
                <div className="sticky bottom-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-white/10 px-0.5 md:px-2 pt-2 pb-1 z-50">
                    {renderInput()}
                </div>
            )}
                </>
            )}

            <Dialog open={isAddCommentModalOpen} onOpenChange={setIsAddCommentModalOpen}>
                <DialogContent className="max-w-2xl bg-white dark:bg-[#0f0f0f] border-none shadow-2xl p-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 rounded-2xl z-[10001] flex flex-col md:max-h-[90vh] max-h-[85vh]">
                    <DialogHeader className="py-1.5 px-3 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/5 shrink-0">
                        <DialogTitle className="sr-only">
                            {isAr ? 'إضافة تعليق' : 'Add Comment'}
                        </DialogTitle>
                        <div className="mx-auto w-8 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    </DialogHeader>
                    <div className="md:p-6 p-4 overflow-y-auto">
                        <div 
                            className="flex gap-4 md:mb-6 mb-3"
                            onPointerDown={(e) => {
                                // Prevent focus loss if tapping on the avatar or empty space near the input
                                const target = e.target as HTMLElement;
                                if (!target.closest('[contenteditable="true"]') && !target.closest('button')) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-inner relative">
                                {user?.avatar ? (
                                    <img src={getImageUrl(user.avatar)} alt={user.name} className="absolute inset-0 object-cover w-full h-full" />
                                ) : (
                                    <span>{user?.name?.charAt(0).toUpperCase() || '?'}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-900 dark:text-white mb-1">{user?.name}</h4>
                                <RichTextInput
                                    ref={modalInputRef}
                                    value={newComment}
                                    onChange={setNewComment}
                                    onEnter={() => {
                                        if (newComment.trim() && !isSubmitting) {
                                            addComment();
                                            setIsAddCommentModalOpen(false);
                                        }
                                    }}
                                    placeholder={isAr ? "بماذا تفكر؟..." : "What's on your mind?..."}
                                    className="w-full bg-transparent border-none py-2 px-0 text-base text-gray-900 dark:text-gray-100 resize-none outline-none transition-colors duration-200 md:min-h-[100px] min-h-[80px]"
                                    onFocus={() => {}}
                                />
                            </div>
                        </div>
                        
                        <div 
                            className="flex flex-col md:gap-3 gap-2 mt-4 bg-gray-50 dark:bg-white/5 md:p-4 p-3 rounded-xl border border-gray-100 dark:border-[#222]"
                            onPointerDown={(e) => {
                                // Prevent focus loss when tapping emojis or empty space inside the emoji container
                                // Allow focus shift if tapping the Send button
                                const target = e.target as HTMLElement;
                                if (!target.closest('button:not([data-emoji])')) {
                                    e.preventDefault();
                                }
                            }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-wrap gap-0.5 flex-1 p-0.5">
                                    {QUICK_EMOJIS.slice(0, 12).map((url, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            data-emoji="true"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => onCustomEmojiClick(url)}
                                            className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-0.5"
                                        >
                                            <img src={url} alt="" className="w-full h-full object-contain" />
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            addComment();
                                            setIsAddCommentModalOpen(false);
                                        }}
                                        disabled={!newComment.trim() || isSubmitting}
                                        className="px-8 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-black rounded-full font-black text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                            <>
                                                <SendHorizontal className={cn("w-4 h-4", isAr && "rotate-180")} />
                                                <span>{isAr ? 'إرسال' : 'Send'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-0.5 p-0.5 border-t border-gray-100 dark:border-white/5 pt-1.5">
                                {QUICK_EMOJIS.slice(12, 28).map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        data-emoji="true"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onCustomEmojiClick(url)}
                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-0.5"
                                    >
                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-0.5 p-0.5 border-t border-gray-100 dark:border-white/5 pt-1.5">
                                {QUICK_EMOJIS.slice(28).map((url, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        data-emoji="true"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onCustomEmojiClick(url)}
                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-0.5"
                                    >
                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});
