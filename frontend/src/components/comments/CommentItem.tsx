import React, { useState, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Smile, Sparkles, MoreVertical, Edit2, Trash2, CornerDownRight, ChevronDown, ChevronUp, Loader2, SendHorizontal, X, Heart } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { getImageUrl } from '@/utils/image-utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import { QuickEmojiRow, QUICK_EMOJIS } from './QuickEmojiRow';
import { renderEmojiContent } from '@/utils/render-content';

const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '';
    if (avatar.startsWith('http')) return avatar;
    return getImageUrl(avatar);
};

const LIKE_ICON_URL = getImageUrl('/uploads/التفاعل/لايك وديس لايك جديد.png');
const DISLIKE_ICON_URL = getImageUrl('/uploads/التفاعل/ديس لايك.png');

import { Comment } from '@/types/models';

interface CommentItemProps {
    comment: Comment;
    type: 'episode' | 'post' | 'chapter';
    itemId: number;
    depth?: number;
    // rootParentId: the top-level comment's ID, used so replies-to-replies
    // are still posted under the same first-level parent (YouTube style)
    rootParentId?: number;
    onReplySuccess: () => void;
    onUpdateSuccess: (comment: Comment) => void;
    onDeleteSuccess: (id: number) => void;
    isLast?: boolean;
    isHighlighted?: boolean;
    activeCommentId?: number | null;
    parentCommentContent?: string;
    postAuthor?: {
        id: number;
        name: string;
        avatar?: string;
    } | null;
}

// Helper: parse @mention from content start
// Returns { mentionName, restContent } or null if no mention
const parseMention = (content: string): { mentionName: string; restContent: string } | null => {
    // Match "@Name: " or "@Name " at the start
    const match = content.match(/^@([^:]+):\s*([\s\S]*)$/);
    if (match) {
        return { mentionName: match[1].trim(), restContent: match[2] };
    }
    return null;
};

// Renders comment content with styled @mention if present
const CommentContent: React.FC<{ content: string; isAr: boolean; parentCommentContent?: string }> = ({ content, isAr, parentCommentContent }) => {
    const mention = parseMention(content);
    if (mention) {
        if (parentCommentContent) {
            const parentMention = parseMention(parentCommentContent);
            const cleanParentText = parentMention ? parentMention.restContent : parentCommentContent;

            return (
                <div className={`flex flex-col gap-1.5 items-start ${isAr ? 'text-right' : 'text-left'} w-full`}>
                    {/* The WhatsApp-style Quoted Reply */}
                    <div 
                        className="bg-gray-100 dark:bg-white/5 border-l-2 border-r-0 border-blue-500 dark:border-blue-400 rounded-lg p-2 max-w-[90%] md:max-w-md w-fit cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition"
                        dir={isAr ? 'rtl' : 'ltr'} 
                        style={isAr ? { borderRightWidth: '2px', borderRightColor: '#3b82f6', borderLeftWidth: '0' } : {}}
                    >
                        <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic mb-1">
                            {renderEmojiContent(cleanParentText)}
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block" dir="ltr">
                            @{mention.mentionName}
                        </span>
                    </div>
                    {/* The Actual Reply Content */}
                    <p className={`text-[15px] font-semibold text-black dark:text-[#f1f1f1] leading-6 w-full ${isAr ? 'text-right' : 'text-left'}`}>
                        {renderEmojiContent(mention.restContent)}
                    </p>
                </div>
            );
        }

        return (
            <p className={`text-[15px] font-semibold text-black dark:text-[#f1f1f1] leading-6 ${isAr ? 'text-right' : 'text-left'}`}>
                <Link
                    to="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                >
                    <span dir="ltr">@{mention.mentionName}</span>
                </Link>
                <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
                {renderEmojiContent(mention.restContent)}
            </p>
        );
    }
    return (
        <p className={`text-[15px] font-semibold text-black dark:text-[#f1f1f1] leading-6 ${isAr ? 'text-right' : 'text-left'}`}>
            {renderEmojiContent(content)}
        </p>
    );
};

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    type,
    itemId,
    depth = 0,
    rootParentId,
    onReplySuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    isLast = false,
    isHighlighted: propIsHighlighted = false,
    activeCommentId = null,
    parentCommentContent,
    postAuthor
}) => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    // const [isExpanded, setIsExpanded] = useState(true); // Removed in favor of visibleRepliesCount
    const [visibleRepliesCount, setVisibleRepliesCount] = useState(activeCommentId || propIsHighlighted ? 999 : 0);
    const [replyText, setReplyText] = useState('');
    const [editText, setEditText] = useState(comment.content);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top');
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [currentEmojiTarget, setCurrentEmojiTarget] = useState<'reply' | 'edit'>('reply');
    const emojiRef = useRef<HTMLDivElement>(null);
    const customEmojiRef = useRef<HTMLDivElement>(null);
    const desktopReplyInputRef = useRef<HTMLDivElement>(null);
    const mobileReplyInputRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLDivElement>(null);
    const mobileEditInputRef = useRef<HTMLDivElement>(null);
    const replyContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHighlighted, setIsHighlighted] = useState(propIsHighlighted);

    useEffect(() => {
        if (propIsHighlighted) setIsHighlighted(true);
    }, [propIsHighlighted]);
    const [isMainInputFocused, setIsMainInputFocused] = useState(false);

    // ==========================================
    // Mobile Back Button interception
    // ==========================================
    const onCloseReplyRef = useRef(() => setIsReplying(false));
    useEffect(() => { onCloseReplyRef.current = () => setIsReplying(false); }, []);

    useEffect(() => {
        if (window.innerWidth >= 768 || !isReplying) return;

        const stateKey = `reply_${comment.id}`;
        window.history.pushState({ modalKey: stateKey }, '');

        const handlePopState = (e: PopStateEvent) => {
            if (e.state?.modalKey === stateKey) return;
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseReplyRef.current();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isReplying, comment.id]);

    const onCloseEditRef = useRef(() => setIsEditing(false));
    useEffect(() => { onCloseEditRef.current = () => setIsEditing(false); }, []);

    useEffect(() => {
        if (window.innerWidth >= 768 || !isEditing) return;

        const stateKey = `edit_${comment.id}`;
        window.history.pushState({ modalKey: stateKey }, '');

        const handlePopState = (e: PopStateEvent) => {
            if (e.state?.modalKey === stateKey) return;
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            onCloseEditRef.current();
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isEditing, comment.id]);
    // ==========================================

    const authorReplied = comment.children?.some(child => child.user_id == postAuthor?.id);
    const isAuthorReplyVisible = comment.children?.slice(0, visibleRepliesCount).some(child => child.user_id == postAuthor?.id);
    const authorAvatarUrl = postAuthor?.avatar ? getAvatarUrl(postAuthor.avatar) : null;

    // Optimistic UI state - protected by hasInteracted ref to prevent server reset
    const [userReaction, setUserReaction] = useState<string | null>(
        comment.user_reaction || (comment.user_interaction === true ? 'like' : null)
    );
    const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({
        like: comment.likes_count ?? (comment.likes || 0),
        love: comment.loves_count || 0,
        sad: comment.sads_count || 0,
        angry: comment.angrys_count || 0,
        wow: comment.wows_count || 0,
        haha: comment.hahas_count || 0,
        super_sad: comment.super_sads_count || 0,
    });
    
    // Reaction Tooltips State
    const [isHoveringStats, setIsHoveringStats] = useState(false);
    const [reactionUsers, setReactionUsers] = useState<Record<string, { id: number, name: string, avatar?: string }[]>>({});
    const [isLoadingReactions, setIsLoadingReactions] = useState(false);
    const statsHoverTimer = useRef<NodeJS.Timeout | null>(null);
    
    const hasInteracted = useRef(false);
    const prevCommentId = useRef(comment.id);


    // Reaction popup
    const [showReactionPopup, setShowReactionPopup] = useState(false);
    const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);
    const reactionLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reactionEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const REACTIONS = [
        { key: 'like', label: i18n.language === 'ar' ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: i18n.language === 'ar' ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: i18n.language === 'ar' ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: i18n.language === 'ar' ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: i18n.language === 'ar' ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: i18n.language === 'ar' ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: i18n.language === 'ar' ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
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

    const handleLikeClick = (e: React.MouseEvent) => {
        if (window.innerWidth < 768) {
            e.preventDefault();
            e.stopPropagation();
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
        if (!user) {
            const currentLang = i18n.language || 'ar';
            navigate(`/${currentLang}/auth/login`);
            return;
        }

        hasInteracted.current = true;
        
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
            const url = type === 'episode'
                ? `/comments/${comment.id}/like`
                : type === 'chapter'
                ? `/comments/${comment.id}/like`
                : `/posts/comments/${comment.id}/like`;
            await api.post(url, { type: reactionKey });
        } catch (error) {
            setUserReaction(previousReaction);
            setReactionCounts(previousCounts);
        }
    };

    useEffect(() => {
        // Reset guard if this is a different comment instance
        if (comment.id !== prevCommentId.current) {
            hasInteracted.current = false;
            prevCommentId.current = comment.id;
        }

        // Only sync from server if user hasn't done an optimistic update
        if (!hasInteracted.current) {
            setUserReaction(comment.user_reaction || (comment.user_interaction === true ? 'like' : null));
            setReactionCounts({
                like: comment.likes_count ?? (comment.likes || 0),
                love: comment.loves_count || 0,
                sad: comment.sads_count || 0,
                angry: comment.angrys_count || 0,
                wow: comment.wows_count || 0,
                haha: comment.hahas_count || 0,
                super_sad: comment.super_sads_count || 0,
            });
        }
    }, [comment.id, comment.user_reaction, comment.user_interaction, comment.likes_count, comment.loves_count, comment.sads_count, comment.angrys_count, comment.wows_count, comment.hahas_count, comment.super_sads_count]);


    // Click outside emoji picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (customEmojiRef.current && !customEmojiRef.current.contains(event.target as Node)) {
                setShowCustomEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mobile back button: listen for popstate when reply/edit is open.
    // NOTE: pushState is called SYNCHRONOUSLY in the click handler (below)
    // so it's guaranteed to be in history before this effect runs.
    const popStateHandlerRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (window.innerWidth >= 768) return;
        if (!isReplying && !isEditing) return;

        const handler = () => {
            window.removeEventListener('popstate', handler);
            popStateHandlerRef.current = null;
            setIsReplying(false);
            setIsEditing(false);
        };

        popStateHandlerRef.current = handler;
        window.addEventListener('popstate', handler);

        return () => {
            window.removeEventListener('popstate', handler);
            popStateHandlerRef.current = null;
        };
    }, [isReplying, isEditing, comment.id]);

    // Auto-focus reply input when opening (mobile uses mobileReplyInputRef)
    useEffect(() => {
        if (isReplying) {
            setTimeout(() => {
                const targetRef = window.innerWidth >= 768 ? desktopReplyInputRef : mobileReplyInputRef;
                if (targetRef.current) {
                    (targetRef.current as any).focus?.();
                }
            }, 150);
        }
    }, [isReplying]);

    // Auto-focus edit input with cursor at end (mobile uses mobileEditInputRef)
    useEffect(() => {
        if (isEditing) {
            setTimeout(() => {
                const targetRef = window.innerWidth >= 768 ? editInputRef : mobileEditInputRef;
                if (targetRef.current && (targetRef.current as any).focusAtEnd) {
                    (targetRef.current as any).focusAtEnd();
                } else if (targetRef.current) {
                    (targetRef.current as any).focus?.();
                }
            }, 150);
        }
    }, [isEditing]);

    // Deep linking: scroll to comment and highlight if commentId is in URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetCommentId = params.get('commentId');
        const targetParentId = params.get('parentId');

        // 1. If this is a parent comment and it's mentioned in the URL, expand it
        if (targetParentId && parseInt(targetParentId) === comment.id) {
            setVisibleRepliesCount(4);
        }

        // 2. If this is the actual target comment, scroll to it and highlight
        if (targetCommentId && parseInt(targetCommentId) === comment.id && containerRef.current) {
            const timer = setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setIsHighlighted(true);
                setTimeout(() => setIsHighlighted(false), 3000);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [comment.id, location.search]);

    // Listen for global expansion events (to expand threads from nested levels)
    useEffect(() => {
        const handleExpand = (event: any) => {
            if (event.detail?.id === comment.id) {
                setVisibleRepliesCount(prev => prev > 0 ? prev : 4);
            }
        };
        
        const handleScrollTo = (event: any) => {
            const targetId = event.detail?.id;
            if (!targetId) return;

            // 1. If this is the direct target comment
            if (targetId === comment.id && containerRef.current) {
                setTimeout(() => {
                    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setIsHighlighted(true);
                    setTimeout(() => setIsHighlighted(false), 3000);
                }, 100);
            }

            // 2. If the target is one of our children, ensure it's within the visibleRepliesCount
            if (comment.children && comment.children.length > 0) {
                const childIndex = comment.children.findIndex(c => c.id === targetId);
                if (childIndex !== -1 && childIndex >= visibleRepliesCount) {
                    setVisibleRepliesCount(childIndex + 1);
                }
            }
        };

        window.addEventListener('app:expand_comment', handleExpand);
        window.addEventListener('app:scroll_to_comment', handleScrollTo);
        return () => {
            window.removeEventListener('app:expand_comment', handleExpand);
            window.removeEventListener('app:scroll_to_comment', handleScrollTo);
        };
    }, [comment.id, comment.children, visibleRepliesCount]);

    // Ensure activeCommentId is visible on mount/change
    useEffect(() => {
        if (activeCommentId && comment.children && comment.children.length > 0) {
            const childIndex = comment.children.findIndex(c => c.id === activeCommentId);
            if (childIndex !== -1 && childIndex >= visibleRepliesCount) {
                setVisibleRepliesCount(childIndex + 1);
            }
        }
    }, [activeCommentId, comment.children]);

    // Removed redundant getAvatarUrl declaration

    // toggleLike logic merged into handleReactionClick
    const handleReply = async () => {
        if (!replyText.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const url = type === 'episode'
                ? `/episodes/${itemId}/comments`
                : type === 'chapter'
                ? `/chapters/${itemId}/comments`
                : `/posts/${itemId}/comments`;

            // YouTube-style: if replying to a reply (depth > 0),
            // post under the root parent (first-level comment) instead of creating deeper nesting.
            // Prefix content with @name: to identify who is being replied to.
            const isReplyToReply = depth > 0;
            const actualParentId = isReplyToReply ? (rootParentId ?? comment.id) : comment.id;
            const contentToSend = isReplyToReply
                ? `@${comment.user?.name || 'مستخدم'}: ${replyText}`
                : replyText;

            const res = await api.post(url, {
                content: contentToSend,
                parent_id: actualParentId,
                mention_user_id: isReplyToReply ? comment.user_id : null,
                ...(type === 'episode' ? { episode_id: itemId } : type === 'chapter' ? { chapter_id: itemId } : { post_id: itemId })
            });

            setReplyText('');
            setIsReplying(false);
            
            // Dispatch expansion and scroll events
            const targetRootId = depth > 0 ? rootParentId : comment.id;
            if (targetRootId) {
                window.dispatchEvent(new CustomEvent('app:expand_comment', { detail: { id: targetRootId } }));
            }
            
            // Wait a tiny bit for the comment to potentially appear in state via WebSocket or onReplySuccess
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('app:scroll_to_comment', { detail: { id: res.data.id } }));
            }, 500);
            
            onReplySuccess();
        } catch (error) {
            console.error("Failed to reply", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editText.trim()) return;
        try {
            const url = (type === 'episode' || type === 'chapter')
                ? `/comments/${comment.id}`
                : `/posts/comments/${comment.id}`;
            const res = await api.put(url, { content: editText });
            setIsEditing(false);
            onUpdateSuccess(res.data);
        } catch (error) {
            console.error("Failed to update", error);
        }
    };

    const handleDelete = async () => {
        if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا التعليق؟' : 'Are you sure you want to delete this comment?')) return;
        try {
            const url = (type === 'episode' || type === 'chapter')
                ? `/comments/${comment.id}`
                : `/posts/comments/${comment.id}`;
            await api.delete(url);
            onDeleteSuccess(comment.id);
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        const isDesktop = window.innerWidth >= 768;
        let targetRef;
        
        if (isEditing) {
            targetRef = isDesktop ? editInputRef : mobileEditInputRef;
        } else if (isReplying) {
            targetRef = isDesktop ? desktopReplyInputRef : mobileReplyInputRef;
        }

        if (targetRef?.current) {
            const richInput = targetRef.current as any;
            if (richInput.insertText) {
                richInput.insertText(emojiData.emoji);
            } else {
                // Fallback direct state update
                if (isEditing) setEditText(prev => prev + emojiData.emoji);
                else setReplyText(prev => prev + emojiData.emoji);
            }
        }
        setShowEmojiPicker(false);
    };

    const onCustomEmojiClick = (emojiUrl: string) => {
        const isDesktop = window.innerWidth >= 768;
        let targetRef;
        
        if (isEditing) {
            targetRef = isDesktop ? editInputRef : mobileEditInputRef;
        } else if (isReplying) {
            targetRef = isDesktop ? desktopReplyInputRef : mobileReplyInputRef;
        }

        if (targetRef?.current) {
            const richInput = targetRef.current as any;
            if (richInput.insertEmoji) {
                richInput.insertEmoji(emojiUrl);
            } else {
                // Fallback direct state update
                const emojiMd = `![emoji](${emojiUrl})`;
                if (isEditing) setEditText(prev => prev + emojiMd);
                else setReplyText(prev => prev + emojiMd);
            }
        }
        // If the click came from a QuickEmojiRow, we don't need to close anything specifically
        // except a picker if it was open.
        setShowCustomEmojiPicker(false);
    };

    const displayUser = comment.user || (user?.id === comment.user_id ? { name: user.name, avatar: user.avatar } : null);

    const isAr = i18n.language === 'ar';
    // Only indent depth=1 (first-level replies), no deeper indentation
    const marginClass = depth > 0 ? (isAr ? 'mr-0 md:mr-10' : 'ml-0 md:ml-10') : '';
    const borderClass = ''; // Removed border-l/r as we'll use custom lines

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
            const endpoint = (type === 'episode' || type === 'chapter') 
                ? `/comments/${comment.id}/reactions` 
                : `/posts/comments/${comment.id}/reactions`;
            const { data } = await api.get(endpoint);
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
        <div
            id={`comment-${comment.id}`}
            ref={containerRef}
            className={cn(
                "group relative transition-all duration-500 pb-3 rounded-2xl px-2 md:px-0",
                isHighlighted && "animate-comment-highlight ring-2 ring-blue-400/30 z-10 bg-blue-50/10 dark:bg-blue-900/10",
                activeCommentId === comment.id && "ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-900/20 z-10",
                depth > 0 && `${marginClass} ${borderClass}`
            )}
        >
            {/* Thread Lines for replies */}
            {depth > 0 && (
                <>
                    {/* Vertical line that continues past this child if it's not last */}
                    {!isLast && (
                        <div 
                            className={cn(
                                "absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-[#555]",
                                isAr ? "-right-5 md:-right-6" : "-left-5 md:-left-6"
                            )} 
                        />
                    )}

                    {/* Curved connector */}
                    <div 
                        className={cn(
                            "absolute top-0 w-5 md:w-6 h-5 border-gray-400 dark:border-[#555]",
                            isAr 
                                ? "-right-5 md:-right-6 border-r-2 border-b-2 rounded-br-2xl" 
                                : "-left-5 md:-left-6 border-l-2 border-b-2 rounded-bl-2xl"
                        )} 
                    />
                </>
            )}

            <div className={`flex gap-2 ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <Link to={`/${i18n.language}/u/${comment.user_id}/profile`} className="block">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-[#272727] shadow-xl hover:opacity-80 transition-opacity ring-2 ring-gray-100 dark:ring-white/10 relative">
                            {displayUser?.avatar ? (
                                <img src={getAvatarUrl(displayUser.avatar)} alt={displayUser.name} className="absolute inset-0 object-cover w-full h-full block rounded-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                                    {displayUser?.name ? displayUser.name.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                        </div>
                    </Link>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Link to={`/${i18n.language}/u/${comment.user_id}/profile`}>
                                <span className="text-sm font-semibold text-black dark:text-[#f1f1f1] hover:text-black dark:hover:text-white cursor-pointer transition">
                                    {displayUser?.name || 'مستخدم غير معروف'}
                                </span>
                            </Link>
                            <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: i18n.language === 'ar' ? ar : undefined })}
                            </span>

                            {/* Actions Menu */}
                            {user && user.id === comment.user_id && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowOptionsMenu(!showOptionsMenu);
                                        }}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-[#272727] transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {showOptionsMenu && (
                                        <>
                                            <div className="fixed inset-0 z-[998]" onClick={() => setShowOptionsMenu(false)} />
                                            <div className={`absolute ${isAr ? 'left-0' : 'right-0'} top-full mt-1 w-32 bg-white dark:bg-[#1f1f1f] rounded-none shadow-xl border border-gray-100 dark:border-[#333] py-1 z-[999] animate-in fade-in zoom-in-95 duration-200`}>
                                                <button
                                                    onClick={() => {
                                                        setCurrentEmojiTarget('edit');
                                                        setIsEditing(true);
                                                        setShowOptionsMenu(false);
                                                    }}
                                                    className={`w-full ${isAr ? 'text-right' : 'text-left'} px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#272727] flex items-center gap-2`}
                                                >
                                                    <Edit2 className="w-4 h-4" /> {isAr ? 'تعديل' : 'Edit'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleDelete();
                                                        setShowOptionsMenu(false);
                                                    }}
                                                    className={`w-full ${isAr ? 'text-right' : 'text-left'} px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2`}
                                                >
                                                    <Trash2 className="w-4 h-4" /> {isAr ? 'حذف' : 'Delete'}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Text Content - with @mention rendering */}
                    {!isEditing ? (
                        <CommentContent content={comment.content} isAr={isAr} parentCommentContent={parentCommentContent} />
                    ) : (
                        <>
                            {/* Desktop Edit Modal (Dialog) */}
                             <Dialog open={isEditing && window.innerWidth >= 768} onOpenChange={setIsEditing}>
                                <DialogContent className="max-w-2xl bg-white dark:bg-[#0f0f0f] border-none shadow-2xl p-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 rounded-2xl z-[10001] flex flex-col max-h-[90vh]">
                                    <DialogHeader className="p-4 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/5 shrink-0">
                                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                            <Edit2 className="w-5 h-5 text-blue-500" />
                                            {isAr ? 'تعديل التعليق' : 'Edit Comment'}
                                        </DialogTitle>
                                    </DialogHeader>
                                     <div className="p-6 overflow-y-auto">
                                        <div className="flex gap-4 mb-6">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-inner relative">
                                                {user?.avatar ? (
                                                    <img src={getAvatarUrl(user.avatar)} alt={user.name} className="absolute inset-0 object-cover w-full h-full" />
                                                ) : (
                                                    <span>{user?.name?.charAt(0).toUpperCase() || '?'}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-black dark:text-white mb-1">{user?.name}</h4>
                                                <RichTextInput
                                                    ref={editInputRef}
                                                    value={editText}
                                                    onChange={setEditText}
                                                    onEnter={handleEdit}
                                                    placeholder={isAr ? "تعديل تعليقك..." : "Edit your comment..."}
                                                    className="w-full bg-transparent border-none py-2 px-0 text-base text-black dark:text-gray-100 resize-none outline-none transition-colors duration-200 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 mt-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-[#222]">
                                            {/* Row 1: Emojis + Save Button */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-wrap gap-1.5 flex-1 p-1">
                                                    {QUICK_EMOJIS.slice(0, 12).map((url, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => onCustomEmojiClick(url)}
                                                            className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                        >
                                                            <img src={url} alt="" className="w-full h-full object-contain" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleEdit}
                                                        disabled={!editText.trim() || isSubmitting || editText === comment.content}
                                                        className="px-8 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                            <>
                                                                <SendHorizontal className={cn("w-4 h-4", isAr && "rotate-180")} />
                                                                <span>{isAr ? 'حفظ' : 'Save'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Row 2: More Emojis */}
                                            <div className="flex flex-wrap gap-1.5 p-1 border-t border-gray-100 dark:border-white/5 pt-3">
                                                {QUICK_EMOJIS.slice(12, 28).map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => onCustomEmojiClick(url)}
                                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Row 3: Remaining Emojis */}
                                            <div className="flex flex-wrap gap-1.5 p-1 border-t border-gray-100 dark:border-white/5 pt-3">
                                                {QUICK_EMOJIS.slice(28).map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => onCustomEmojiClick(url)}
                                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Mobile Edit Modal (Sheet) */}
                            <Sheet open={isEditing && window.innerWidth < 768} onOpenChange={setIsEditing}>
                                <SheetContent 
                                    side="bottom" 
                                    className="h-auto max-h-[85dvh] p-0 flex flex-col rounded-t-2xl border-none outline-none overflow-hidden bg-white dark:bg-[#111] z-[10001]"
                                    onPointerDown={(e) => {
                                        if (window.innerWidth < 768) {
                                            const target = e.target as HTMLElement;
                                            const isInput = target.closest('[contenteditable="true"]');
                                            const isButton = target.closest('button:not([data-emoji="true"])');
                                            if (!isInput && !isButton) {
                                                e.preventDefault();
                                            }
                                        }
                                    }}
                                >
                                    <SheetHeader className="px-4 py-3 border-b border-gray-100 dark:border-white/10 shrink-0 bg-white dark:bg-[#111]">
                                        <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mb-2 mt-1 relative" />
                                        <SheetTitle className="text-center font-bold text-lg flex items-center justify-center gap-2">
                                            <Edit2 className="w-5 h-5 text-blue-500" />
                                            {isAr ? 'تعديل التعليق' : 'Edit Comment'}
                                        </SheetTitle>
                                    </SheetHeader>
                                    
                                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" 
                                        onPointerDown={(e) => {
                                            if (window.innerWidth < 768) {
                                                const target = e.target as HTMLElement;
                                                const isInput = target.closest('[contenteditable="true"]');
                                                const isButton = target.closest('button:not([data-emoji="true"])');
                                                if (!isInput && !isButton) {
                                                    e.preventDefault();
                                                }
                                            }
                                        }}
                                    >
                                        <div className="flex-1 overflow-y-auto p-4">
                                            <div className="w-full bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#222]">
                                                <RichTextInput
                                                    ref={mobileEditInputRef}
                                                    value={editText}
                                                    onChange={setEditText}
                                                    onEnter={handleEdit}
                                                    placeholder={isAr ? 'عدّل تعليقك...' : 'Edit your comment...'}
                                                    className="w-full bg-transparent border-none py-0 px-0 text-base text-[#0f0f0f] dark:text-[#f1f1f1] resize-none outline-none transition-colors duration-200 min-h-[100px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="shrink-0 bg-white dark:bg-[#111] px-4 pb-6 pt-1 border-t border-gray-100 dark:border-[#333]">
                                            <div className="flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                                                <div className="flex-1 min-w-0">
                                                    <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                                                </div>
                                                <button
                                                    onClick={handleEdit}
                                                    disabled={!editText.trim() || isSubmitting || editText === comment.content}
                                                    className="w-10 h-10 flex items-center justify-center bg-blue-600 dark:bg-white text-white dark:text-black rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className={cn("w-5 h-5", isAr && "rotate-180")} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center bg-gray-50 dark:bg-white/5 rounded-full p-1 border border-gray-100 dark:border-white/10 relative z-10 shrink-0">
                        <div 
                            className="relative"
                            onMouseEnter={handleLikeMouseEnter}
                            onMouseLeave={handleLikeMouseLeave}
                        >
                            {/* Reaction Popup */}
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
                                    <div className="relative flex items-center gap-0.5 md:gap-1 bg-white dark:bg-[#2a2a2a] rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.22)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.7)] border border-gray-100 dark:border-[#444] px-1.5 py-1 md:px-2.5 md:py-2 w-max min-w-max overflow-visible">
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
                                                    "absolute -top-7 md:-top-8 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-200 whitespace-nowrap",
                                                    hoveredReaction === r.key
                                                        ? "opacity-100 -translate-y-0 scale-100"
                                                        : "opacity-0 translate-y-2 scale-90"
                                                )}>
                                                    <span className="inline-block bg-[#1c1c1c] dark:bg-white text-white dark:text-black text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 rounded-full shadow-lg leading-tight">
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
                                                            ? "w-10 h-10 md:w-12 md:h-12 -translate-y-2 scale-100"
                                                            : "w-8 h-8 md:w-8 md:h-8 translate-y-0"
                                                    )}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleLikeClick} 
                                onTouchStart={handleTouchStart}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 outline-none cursor-pointer relative z-20 font-bold",
                                    userReaction 
                                        ? (userReaction === 'like' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                                           userReaction === 'love' ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" :
                                           "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400")
                                        : "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-[#aaa]"
                                )}
                            >
                                {activeReaction ? (
                                    <img src={activeReaction.gif} className="w-5 h-5 object-contain scale-110" alt={activeReaction.label} />
                                ) : (
                                    <ThumbsUp className="w-5 h-5" />
                                )}
                                <span className="text-xs font-bold leading-none">{activeReaction ? activeReaction.label : (isAr ? 'أعجبني' : 'Like')}</span>
                            </button>
                        </div>
                        </div>

                        {/* Reaction Stats Summary */}
                        {totalReactions > 0 && (
                            <div 
                                className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] rounded-full px-2 py-1 shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer relative group/statsbox"
                                onMouseEnter={handleStatsMouseEnter}
                                onMouseLeave={handleStatsMouseLeave}
                            >
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
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium hover:underline">{totalReactions}</span>
                                
                                {/* Hover Tooltip */}
                                {isHoveringStats && (
                                    <div className="absolute bottom-full left-0 md:left-auto mb-2 w-56 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/50 dark:border-[#333]/50 p-3 z-50 text-sm animate-in fade-in slide-in-from-bottom-2 cursor-default">
                                         {isLoadingReactions ? ( 
                                             <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div> 
                                         ) : Object.keys(reactionUsers).length > 0 ? (
                                              Object.entries(reactionUsers).map(([type, users]) => {
                                                  const reactionInfo = REACTIONS.find(rx => rx.key === type);
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
                        )}

                        {/* Author Heart (YouTube Style) */}
                        {comment.is_author_hearted && postAuthor && (
                            <div className="flex items-center -ml-1">
                                <div className="relative group/heart cursor-help">
                                    <div className="w-5 h-5 rounded-full overflow-hidden border-2 border-white dark:border-[#1a1a1a] shadow-sm">
                                        <img src={getAvatarUrl(postAuthor.avatar)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 border border-white dark:border-[#1a1a1a]">
                                        <Heart className="w-2.5 h-2.5 text-white fill-white" />
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover/heart:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                                        {isAr ? `أحبّه ${postAuthor.name}` : `Loved by ${postAuthor.name}`}
                                    </div>
                                </div>
                            </div>
                        )}
                        <button onClick={() => {
                            if (!user) {
                                const currentLang = i18n.language || 'ar';
                                navigate(`/${currentLang}/auth/login`);
                                return;
                            }
                            const nextReplying = !isReplying;
                            setIsReplying(nextReplying);
                            if (nextReplying) {
                                setCurrentEmojiTarget('reply');
                                const targetRootId = depth > 0 ? rootParentId : comment.id;
                                if (targetRootId) {
                                    window.dispatchEvent(new CustomEvent('app:expand_comment', { detail: { id: targetRootId } }));
                                }
                            }
                        }} className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-[#aaa] hover:bg-gray-100 dark:hover:bg-[#272727] px-2 py-1 rounded-none transition">
                            <CornerDownRight className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} /> {isAr ? 'رد' : 'Reply'}
                        </button>
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                        <>
                            {/* Desktop Reply Modal (Dialog) */}
                              <Dialog open={isReplying && window.innerWidth >= 768} onOpenChange={setIsReplying}>
                                <DialogContent className="max-w-2xl bg-white dark:bg-[#0f0f0f] border-none shadow-2xl p-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10 rounded-2xl z-[10001] flex flex-col max-h-[90vh]">
                                    <DialogHeader className="p-4 border-b border-gray-100 dark:border-[#222] bg-gray-50/50 dark:bg-white/5 shrink-0">
                                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                            <CornerDownRight className={cn("w-5 h-5 text-blue-500", !isAr && "rotate-180")} />
                                            {isAr ? 'إضافة رد' : 'Add Reply'}
                                        </DialogTitle>
                                    </DialogHeader>
                                     <div className="p-6 overflow-y-auto">
                                        {/* Context: What we're replying to */}
                                        <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-[#222]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                                                    <img src={getAvatarUrl(comment.user?.avatar)} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="font-bold text-sm text-blue-600 dark:text-blue-400">@{comment.user?.name}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 italic">
                                                {renderEmojiContent(comment.content)}
                                            </div>
                                        </div>

                                        <div className="flex gap-4 mb-6">
                                            <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-inner relative">
                                                {user?.avatar ? (
                                                    <img src={getAvatarUrl(user.avatar)} alt={user.name} className="absolute inset-0 object-cover w-full h-full" />
                                                ) : (
                                                    <span>{user?.name?.charAt(0).toUpperCase() || '?'}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-black dark:text-white mb-1">{user?.name}</h4>
                                                <RichTextInput
                                                    ref={desktopReplyInputRef}
                                                    value={replyText}
                                                    onChange={setReplyText}
                                                    onEnter={handleReply}
                                                    placeholder={isAr ? "اكتب ردك هنا..." : "Write your reply here..."}
                                                    className="w-full bg-transparent border-none py-2 px-0 text-base text-black dark:text-gray-100 resize-none outline-none transition-colors duration-200 min-h-[100px]"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 mt-4 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-[#222]">
                                            {/* Row 1: Emojis + Reply Button */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-wrap gap-1.5 flex-1 p-1">
                                                    {QUICK_EMOJIS.slice(0, 12).map((url, idx) => (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => onCustomEmojiClick(url)}
                                                            className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                        >
                                                            <img src={url} alt="" className="w-full h-full object-contain" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleReply}
                                                        disabled={!replyText.trim() || isSubmitting}
                                                        className="px-8 py-2.5 bg-blue-600 dark:bg-white text-white dark:text-black rounded-full font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                                                    >
                                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                                            <>
                                                                <SendHorizontal className={cn("w-4 h-4", isAr && "rotate-180")} />
                                                                <span>{isAr ? 'رد' : 'Reply'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Row 2: More Emojis */}
                                            <div className="flex flex-wrap gap-1.5 p-1 border-t border-gray-100 dark:border-white/5 pt-3">
                                                {QUICK_EMOJIS.slice(12, 28).map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        data-emoji="true"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => onCustomEmojiClick(url)}
                                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Row 3: Remaining Emojis */}
                                            <div className="flex flex-wrap gap-1.5 p-1 border-t border-gray-100 dark:border-white/5 pt-3">
                                                {QUICK_EMOJIS.slice(28).map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        data-emoji="true"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => onCustomEmojiClick(url)}
                                                        className="w-8 h-8 md:w-9 md:h-9 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-all active:scale-90 flex items-center justify-center p-1.5"
                                                    >
                                                        <img src={url} alt="" className="w-full h-full object-contain" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Mobile Reply Modal (Sheet) */}
                            <Sheet open={isReplying && window.innerWidth < 768} onOpenChange={setIsReplying}>
                                <SheetContent 
                                    side="bottom" 
                                    className="p-0 flex flex-col rounded-t-2xl border-none outline-none overflow-hidden bg-white dark:bg-[#111] z-[10001]"
                                    onPointerDown={(e) => {
                                        if (window.innerWidth < 768) {
                                            const target = e.target as HTMLElement;
                                            const isInput = target.closest('[contenteditable="true"]');
                                            const isButton = target.closest('button:not([data-emoji="true"])');
                                            if (!isInput && !isButton) {
                                                e.preventDefault();
                                            }
                                        }
                                    }}
                                >
                                    {/* Drag handle */}
                                    <div className="mx-auto w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mt-3 mb-1 shrink-0" />

                                    {/* Parent Comment Context — at top */}
                                    <div className="px-4 pt-1 pb-2 shrink-0">
                                        <div className="flex items-start gap-2 p-2 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-[#333]">
                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 shrink-0 mt-0.5">
                                                <img src={getAvatarUrl(comment.user?.avatar)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="font-bold text-xs text-blue-600 dark:text-blue-400 block">@{comment.user?.name}</span>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                                                    {renderEmojiContent(comment.content)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reply text input area */}
                                    <div className="px-4 pb-1 shrink-0">
                                        <RichTextInput
                                            ref={mobileReplyInputRef}
                                            value={replyText}
                                            onChange={setReplyText}
                                            onEnter={handleReply}
                                            placeholder={isAr ? 'اكتب ردك هنا...' : 'Write your reply here...'}
                                            className="w-full bg-transparent border-b border-gray-200 dark:border-[#333] py-2 px-0 text-base text-[#0f0f0f] dark:text-[#f1f1f1] resize-none outline-none transition-colors duration-200 min-h-[60px] max-h-[120px]"
                                        />
                                    </div>

                                    {/* Emoji bar + Send button */}
                                    <div className="shrink-0 bg-white dark:bg-[#111] px-4 pb-6 pt-1 border-t border-gray-100 dark:border-[#333]">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                                            </div>
                                            <button
                                                onClick={handleReply}
                                                disabled={!replyText.trim() || isSubmitting}
                                                className="w-10 h-10 flex items-center justify-center bg-blue-600 dark:bg-white text-white dark:text-black rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-50 shrink-0"
                                            >
                                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className={cn("w-5 h-5", isAr && "rotate-180")} />}
                                            </button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </>
                    )}

                    {/* Emoji Picker Popover (fallback) */}
                    {showEmojiPicker && !isReplying && !isEditing && (
                        <div ref={emojiRef} className="absolute z-[2000] mt-2 shadow-xl">
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                theme={Theme.AUTO}
                            />
                        </div>
                    )}

                    {/* ===== FLAT REPLIES (YouTube-style) =====
                        Only rendered for depth=0 (top-level comments).
                        All children (replies + replies-to-replies) are flat at depth=1.
                        Each child gets rootParentId = comment.id so further replies
                        are always posted under this top-level comment. */}
                    {depth === 0 && comment.children && comment.children.length > 0 && (
                        <div className="mt-3">
                            {visibleRepliesCount > 0 && (
                                <div className="space-y-0 md:space-y-4 mb-4">
                                    {comment.children.slice(0, visibleRepliesCount).map((child, idx) => {
                                    let pText: string | undefined = undefined;
                                    const match = child.content.match(/^@([^:]+):\s*([\s\S]*)$/);
                                    if (match) {
                                        const mentionName = match[1].trim();
                                        
                                        // Find all comments by this user in the thread
                                        const siblings = comment.children!.filter(c => c.user?.name?.trim() === mentionName);
                                        
                                        // Pick the latest comment by this user BEFORE the current comment's ID
                                        const priorSiblings = siblings.filter(c => c.id < child.id);
                                        if (priorSiblings.length > 0) {
                                            // sort descending by ID so [0] is the closest
                                            pText = priorSiblings.sort((a, b) => b.id - a.id)[0].content;
                                        } else if (siblings.length > 0) {
                                            // fallback to any sibling by them if IDs are strange
                                            pText = siblings[0].content;
                                        }

                                        if (!pText && comment.user?.name?.trim() === mentionName) {
                                            pText = comment.content;
                                        }
                                    }
                                    // Fallback if no match or not found
                                    if (!pText) {
                                        pText = child.parent_id === comment.id ? comment.content : comment.children?.find(c => c.id === child.parent_id)?.content;
                                    }

                                    return (
                                        <CommentItem
                                            key={child.id}
                                            comment={child}
                                            type={type}
                                            itemId={itemId}
                                            depth={1}
                                            rootParentId={comment.id}
                                            onReplySuccess={onReplySuccess}
                                            onUpdateSuccess={onUpdateSuccess}
                                            onDeleteSuccess={onDeleteSuccess}
                                            isLast={idx === (comment.children?.length ?? 0) - 1 || idx === visibleRepliesCount - 1}
                                            activeCommentId={activeCommentId}
                                            parentCommentContent={pText}
                                            postAuthor={postAuthor}
                                        />
                                    );
                                })}
                                </div>
                            )}
                            
                            {comment.children.length > visibleRepliesCount && (
                                <div className="relative flex items-center gap-3 mt-2">
                                    {/* Curved Connecting Line from main avatar to author reply indicator */}
                                    {authorReplied && !isAuthorReplyVisible && (
                                        <div 
                                            className={cn(
                                                "absolute -top-12 w-8 h-12 border-gray-300 dark:border-white/10 opacity-60",
                                                isAr 
                                                    ? "right-[-12px] border-r border-b rounded-br-2xl" 
                                                    : "left-[-12px] border-l border-b rounded-bl-2xl"
                                            )}
                                            style={{ height: '50px', top: '-46px' }}
                                        />
                                    )}

                                    <button 
                                        onClick={() => setVisibleRepliesCount(prev => prev === 0 ? 4 : prev + 4)} 
                                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-full transition w-fit border border-blue-100 dark:border-blue-900/30"
                                    >
                                        <ChevronDown className={cn("w-4 h-4 transition-transform", visibleRepliesCount > 0 && "rotate-0")} />
                                        <span>
                                            {visibleRepliesCount === 0 
                                                ? (isAr ? `عرض ${comment.children.length} من الردود` : `Show ${comment.children.length} replies`)
                                                : (isAr ? `عرض المزيد من الردود` : `Show more replies`)
                                            }
                                        </span>
                                    </button>

                                    {/* Author Mini Avatar next to button */}
                                    {authorReplied && !isAuthorReplyVisible && (
                                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 py-1 px-1 pr-2 rounded-full border border-gray-100 dark:border-white/5 shadow-sm">
                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-white dark:border-white/10 bg-gray-200 dark:bg-[#272727]">
                                                {authorAvatarUrl ? (
                                                    <img src={authorAvatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                                                        {postAuthor?.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {isAr ? 'ردّ الناشر' : 'Author replied'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {visibleRepliesCount > 0 && (
                                <button 
                                    onClick={() => setVisibleRepliesCount(0)} 
                                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 rounded-full transition w-fit mt-1 hover:bg-gray-100 dark:hover:bg-white/5"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                    <span>{isAr ? 'إخفاء الردود' : 'Hide replies'}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
