import React, { useState, useRef, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Smile, Sparkles, MoreVertical, Edit2, Trash2, CornerDownRight, ChevronDown, ChevronUp, Loader2, SendHorizontal } from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import { QuickEmojiRow } from './QuickEmojiRow';
import { renderEmojiContent } from '@/utils/render-content';

interface Comment {
    id: number;
    content: string;
    user_id: number;
    user: {
        id: number;
        name: string;
        avatar?: string;
    };
    created_at: string;
    likes: number;
    dislikes: number;
    user_interaction?: boolean | null; // true = like, false = dislike
    children?: Comment[];
    parent_id?: number | null;
    post_id?: number;
    episode_id?: number;
}

interface CommentItemProps {
    comment: Comment;
    type: 'episode' | 'post';
    itemId: number;
    depth?: number;
    onReplySuccess: () => void;
    onUpdateSuccess: (comment: Comment) => void;
    onDeleteSuccess: (id: number) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    type,
    itemId,
    depth = 0,
    onReplySuccess,
    onUpdateSuccess,
    onDeleteSuccess
}) => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
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
    const replyInputRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLDivElement>(null);
    const replyContainerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHighlighted, setIsHighlighted] = useState(false);

    // Optimistic UI state
    const [likes, setLikes] = useState(comment.likes);
    const [dislikes, setDislikes] = useState(comment.dislikes);
    const [interaction, setInteraction] = useState<boolean | null | undefined>(comment.user_interaction);

    useEffect(() => {
        // Sync if props change (though typically we manage state locally after init)
        setLikes(comment.likes);
        setDislikes(comment.dislikes);
        setInteraction(comment.user_interaction);
    }, [comment]);

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

    // Focus reply input when opening
    useEffect(() => {
        if (isReplying && replyInputRef.current) {
            (replyInputRef.current as any).focus();
        }
    }, [isReplying]);

    // Handle Deep Linking (Scroll & Highlight & Expand)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const targetCommentId = params.get('commentId');
        if (!targetCommentId) return;

        const targetIdNum = parseInt(targetCommentId);

        // Recursive helper to check if this comment has the target descendant
        const hasChildWithID = (comp: Comment, id: number): boolean => {
            if (!comp.children) return false;
            return comp.children.some(child =>
                child.id === id || hasChildWithID(child, id)
            );
        };

        // 1. Auto-expand if we are an ancestor of the targeted comment
        if (hasChildWithID(comment, targetIdNum)) {
            setIsExpanded(true);
        }

        // 2. Scroll and Highlight if we are the targeted comment
        if (targetIdNum === comment.id) {
            const timer = setTimeout(() => {
                if (containerRef.current) {
                    containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setIsHighlighted(true);
                    setTimeout(() => setIsHighlighted(false), 3000);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [location.search, comment.id, comment.children]);

    const getAvatarUrl = (avatar?: string) => {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return avatar.startsWith('/') ? avatar : `/${avatar}`;
    };


    const toggleLike = async (isLike: boolean) => {
        if (!user) {
            const currentLang = i18n.language || 'ar';
            navigate(`/${currentLang}/auth/login`);
            return;
        }

        const prevInteraction = interaction;
        const prevLikes = likes;
        const prevDislikes = dislikes;

        // Optimistic Update
        if (interaction === isLike) {
            // Toggle off
            setInteraction(null);
            if (isLike) setLikes(prev => prev - 1);
            else setDislikes(prev => prev - 1);
        } else {
            // Toggle on or switch
            if (interaction === true) setLikes(prev => prev - 1);
            if (interaction === false) setDislikes(prev => prev - 1);

            setInteraction(isLike);
            if (isLike) setLikes(prev => prev + 1);
            else setDislikes(prev => prev + 1);
        }

        try {
            const url = type === 'episode'
                ? `/comments/${comment.id}/like`
                : `/posts/comments/${comment.id}/like`;
            await api.post(url, { is_like: isLike });
        } catch (error) {
            // Revert
            setInteraction(prevInteraction);
            setLikes(prevLikes);
            setDislikes(prevDislikes);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isReplying && replyContainerRef.current && !replyContainerRef.current.contains(event.target as Node)) {
                // If emoji picker is open, don't close the reply form
                if (showEmojiPicker || showCustomEmojiPicker) return;
                setIsReplying(false);
            }
        };

        if (isReplying) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isReplying, showEmojiPicker, showCustomEmojiPicker]);

    const handleReply = async () => {
        if (!replyText.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const url = type === 'episode'
                ? `/episodes/${itemId}/comments`
                : `/posts/${itemId}/comments`;

            await api.post(url, {
                content: replyText,
                parent_id: comment.id,
                ...(type === 'episode' ? { episode_id: itemId } : { post_id: itemId })
            });
            setReplyText('');
            setIsReplying(false);
            setIsExpanded(true);
            onReplySuccess();
        } catch (error) {
            console.error("Failed to reply", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Note: Comment type in props might not have episode_id field if we didn't add it to interface clearly above.
    // The Backend Comment struct has EpisodeID. Frontend needs it.

    const handleEdit = async () => {
        if (!editText.trim()) return;
        try {
            const url = type === 'episode'
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
            const url = type === 'episode'
                ? `/comments/${comment.id}`
                : `/posts/comments/${comment.id}`;
            await api.delete(url);
            onDeleteSuccess(comment.id);
        } catch (error) {
            console.error("Failed to delete", error);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (currentEmojiTarget === 'reply') {
            if (replyInputRef.current && (replyInputRef.current as any).insertText) {
                (replyInputRef.current as any).insertText(emojiData.emoji);
            } else {
                setReplyText(prev => prev + emojiData.emoji);
            }
        } else {
            if (editInputRef.current && (editInputRef.current as any).insertText) {
                (editInputRef.current as any).insertText(emojiData.emoji);
            } else {
                setEditText(prev => prev + emojiData.emoji);
            }
        }
        setShowEmojiPicker(false);
    };

    const onCustomEmojiClick = (emojiUrl: string) => {
        if (currentEmojiTarget === 'reply') {
            if (replyInputRef.current && (replyInputRef.current as any).insertEmoji) {
                (replyInputRef.current as any).insertEmoji(emojiUrl);
            }
        } else {
            if (editInputRef.current && (editInputRef.current as any).insertEmoji) {
                (editInputRef.current as any).insertEmoji(emojiUrl);
            }
        }
    };
    // Determine user to display (fallback to current user if data missing but ID matches)
    const displayUser = comment.user || (user?.id === comment.user_id ? { name: user.name, avatar: user.avatar } : null);

    const isAr = i18n.language === 'ar';
    const marginClass = depth > 0 ? (isAr ? 'mr-4 md:mr-8' : 'ml-4 md:ml-8') : '';
    const borderClass = depth > 0 ? (isAr ? 'border-r-2 pr-4' : 'border-l-2 pl-4') : '';

    return (
        <div
            id={`comment-${comment.id}`}
            ref={containerRef}
            className={`group relative transition-all duration-500 ${isHighlighted ? 'animate-comment-highlight ring-2 ring-blue-400/30 z-10' : ''} ${depth > 0 ? `${marginClass} ${borderClass} border-gray-100 dark:border-[#333]` : ''}`}
        >
            <div className={`flex gap-3 ${isAr ? 'text-right' : 'text-left'}`} dir={isAr ? 'rtl' : 'ltr'}>
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <Link to={`/${i18n.language}/u/${comment.user_id}/profile`} className="block">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-[#272727] shadow-sm hover:opacity-80 transition-opacity">
                            {displayUser?.avatar ? (
                                <img src={getAvatarUrl(displayUser.avatar)} alt={displayUser.name} className="object-cover w-full h-full" />
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
                                <span className="text-sm font-bold text-[#0f0f0f] dark:text-[#f1f1f1] hover:text-black dark:hover:text-white cursor-pointer transition">
                                    {displayUser?.name || 'مستخدم غير معروف'}
                                </span>
                            </Link>
                            <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: i18n.language === 'ar' ? ar : undefined })}
                            </span>

                            {/* Actions Menu - Moved here to be after timestamp */}
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
                                            <div className={`absolute ${isAr ? 'right-0' : 'left-0'} top-full mt-1 w-32 bg-white dark:bg-[#1f1f1f] rounded-none shadow-xl border border-gray-100 dark:border-[#333] py-1 z-[999] animate-in fade-in zoom-in-95 duration-200`}>
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

                    {/* Text Content */}
                    {!isEditing ? (
                        <p className={`text-lg font-bold text-[#0f0f0f] dark:text-[#f1f1f1] leading-7 ${isAr ? 'text-right' : 'text-left'}`}>{renderEmojiContent(comment.content)}</p>
                    ) : (
                        <div className={`mt-2 ${isAr ? 'text-right' : 'text-left'}`}>
                            <div className="relative">
                                <RichTextInput
                                    ref={editInputRef}
                                    value={editText}
                                    onChange={setEditText}
                                    className="w-full bg-gray-50 dark:bg-[#272727] border border-transparent focus:border-blue-500 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f1f] rounded-none py-2 px-3 text-sm text-[#0f0f0f] dark:text-[#f1f1f1] resize-none outline-none"
                                />
                            </div>
                            <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                            <div className={`flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-2 sticky ${isAr ? 'left-0' : 'right-0'} z-10 bg-white dark:bg-[#111] py-2 px-3 w-full border-blue-500 shadow-sm transition-all relative`}>
                                {isAr ? (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <button onClick={handleEdit} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-none transition shadow-sm">حفظ</button>
                                            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-none transition">أغلاق</button>
                                            <button
                                                onClick={(e) => {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const spaceAbove = rect.top;
                                                    setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                    setCurrentEmojiTarget('edit');
                                                    setShowEmojiPicker(!showEmojiPicker);
                                                    (editInputRef.current as any)?.focus();
                                                }}
                                                className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const spaceAbove = rect.top;
                                                    setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                    setCurrentEmojiTarget('edit');
                                                    setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                    (editInputRef.current as any)?.focus();
                                                }}
                                                className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                title="رموز مخصصة"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {showEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-[2000]" onClick={() => setShowEmojiPicker(false)} />
                                                <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                                </div>
                                            </>
                                        )}

                                        {showCustomEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                                                <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200`}>
                                                    <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1">
                                            <button onClick={handleEdit} className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-none transition shadow-sm">Save</button>
                                            <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-[#272727] rounded-none transition">Close</button>
                                            <button
                                                onClick={(e) => {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const spaceAbove = rect.top;
                                                    setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                    setCurrentEmojiTarget('edit');
                                                    setShowEmojiPicker(!showEmojiPicker);
                                                    (editInputRef.current as any)?.focus();
                                                }}
                                                className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const spaceAbove = rect.top;
                                                    setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                    setCurrentEmojiTarget('edit');
                                                    setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                    (editInputRef.current as any)?.focus();
                                                }}
                                                className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                title="Custom Emojis"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {showEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-[2000]" onClick={() => setShowEmojiPicker(false)} />
                                                <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                                </div>
                                            </>
                                        )}

                                        {showCustomEmojiPicker && (
                                            <>
                                                <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                                                <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200`}>
                                                    <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center gap-4 mt-2">
                        <button onClick={() => toggleLike(true)} className={`flex items-center gap-1.5 transition group/btn ${interaction === true ? 'text-blue-600 dark:text-blue-500' : 'text-gray-500 dark:text-[#aaa] hover:text-blue-600 dark:hover:text-blue-500'}`}>
                            <ThumbsUp className={`w-4 h-4 transition-transform ${interaction === true ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">{likes}</span>
                        </button>
                        <button onClick={() => toggleLike(false)} className={`flex items-center gap-1.5 transition group/btn ${interaction === false ? 'text-red-600 dark:text-red-500' : 'text-gray-500 dark:text-[#aaa] hover:text-red-600 dark:hover:text-red-500'}`}>
                            <ThumbsDown className={`w-4 h-4 transition-transform ${interaction === false ? 'fill-current' : ''}`} />
                            <span className="text-xs font-bold">{dislikes}</span>
                        </button>
                        <button onClick={() => {
                            if (!user) {
                                const currentLang = i18n.language || 'ar';
                                navigate(`/${currentLang}/auth/login`);
                                return;
                            }
                            setIsReplying(!isReplying);
                            if (!isReplying) setCurrentEmojiTarget('reply');
                        }} className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-[#aaa] hover:bg-gray-100 dark:hover:bg-[#272727] px-2 py-1 rounded-none transition">
                            <CornerDownRight className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} /> {isAr ? 'رد' : 'Reply'}
                        </button>
                    </div>

                    {/* Reply Form */}
                    {isReplying && (
                        <div ref={replyContainerRef} className="mt-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {user?.avatar ? (
                                        <img src={getAvatarUrl(user.avatar)} alt={user.name} className="object-cover w-full h-full" />
                                    ) : (
                                        <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="relative">
                                        <RichTextInput
                                            ref={replyInputRef}
                                            value={replyText}
                                            onChange={setReplyText}
                                            placeholder={isAr ? "اكتب ردك هنا..." : "Write your reply here..."}
                                            className="w-full bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500 rounded-none py-2 px-0 text-sm text-[#0f0f0f] dark:text-[#f1f1f1] resize-none outline-none"
                                        />
                                    </div>
                                    <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                                    <div className={`flex items-center gap-2 mt-3 animate-in fade-in slide-in-from-top-2 sticky ${isAr ? 'left-0' : 'right-0'} z-10 bg-white dark:bg-[#111] py-2 px-3 w-full border-blue-500 shadow-sm transition-all relative`}>
                                        {isAr ? (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={handleReply}
                                                        disabled={!replyText || isSubmitting}
                                                        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all
                                                            ${replyText
                                                                ? 'bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] hover:scale-105 active:scale-95'
                                                                : 'bg-transparent text-gray-400 cursor-not-allowed'}`}
                                                        title="إرسال الرد"
                                                    >
                                                        {isSubmitting ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <SendHorizontal className="w-5 h-5 rotate-180" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                            const spaceAbove = rect.top;
                                                            setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                            setCurrentEmojiTarget('reply');
                                                            setShowEmojiPicker(!showEmojiPicker);
                                                            (replyInputRef.current as any)?.focus();
                                                        }}
                                                        className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                    >
                                                        <Smile className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                            const spaceAbove = rect.top;
                                                            setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                            setCurrentEmojiTarget('reply');
                                                            setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                            (replyInputRef.current as any)?.focus();
                                                        }}
                                                        className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                        title="رموز مخصصة"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex-1" />
                                                <button onClick={() => setIsReplying(false)} className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-[#f1f1f1] hover:bg-gray-200 dark:hover:bg-[#272727] rounded-full transition">إلغاء</button>

                                                {showEmojiPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-[2000]" onClick={() => setShowEmojiPicker(false)} />
                                                        <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                                        </div>
                                                    </>
                                                )}

                                                {showCustomEmojiPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                                                        <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200`}>
                                                            <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={handleReply}
                                                        disabled={!replyText || isSubmitting}
                                                        className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all
                                                            ${replyText
                                                                ? 'bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] hover:scale-105 active:scale-95'
                                                                : 'bg-transparent text-gray-400 cursor-not-allowed'}`}
                                                        title="Send Reply"
                                                    >
                                                        {isSubmitting ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <SendHorizontal className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                            const spaceAbove = rect.top;
                                                            setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                            setCurrentEmojiTarget('reply');
                                                            setShowEmojiPicker(!showEmojiPicker);
                                                            (replyInputRef.current as any)?.focus();
                                                        }}
                                                        className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                    >
                                                        <Smile className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                            const spaceAbove = rect.top;
                                                            setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                            setCurrentEmojiTarget('reply');
                                                            setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                            (replyInputRef.current as any)?.focus();
                                                        }}
                                                        className="p-1.5 rounded-none hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500"
                                                        title="Custom Emojis"
                                                    >
                                                        <Sparkles className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex-1" />
                                                <button onClick={() => setIsReplying(false)} className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-[#f1f1f1] hover:bg-gray-200 dark:hover:bg-[#272727] rounded-full transition">Cancel</button>

                                                {showEmojiPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-[2000]" onClick={() => setShowEmojiPicker(false)} />
                                                        <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                            <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                                        </div>
                                                    </>
                                                )}

                                                {showCustomEmojiPicker && (
                                                    <>
                                                        <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                                                        <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200`}>
                                                            <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                        <div ref={emojiRef} className="absolute z-[2000] mt-2 shadow-xl">
                            <EmojiPicker
                                onEmojiClick={onEmojiClick}
                                theme={Theme.AUTO}
                            />
                        </div>
                    )}

                    {/* Nested Replies */}
                    {comment.children && comment.children.length > 0 && (
                        <div className="mt-3">
                            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-none transition w-fit mb-2">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                <span>{isExpanded ? (isAr ? 'إخفاء الردود' : 'Hide Replies') : (isAr ? `عرض ${comment.children.length} ردود` : `Show ${comment.children.length} replies`)}</span>
                            </button>
                            {isExpanded && (
                                <div className="space-y-4">
                                    {comment.children.map(child => (
                                        <CommentItem
                                            key={child.id}
                                            comment={child}
                                            type={type}
                                            itemId={itemId}
                                            depth={depth + 1}
                                            onReplySuccess={onReplySuccess}
                                            onUpdateSuccess={onUpdateSuccess}
                                            onDeleteSuccess={onDeleteSuccess}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
