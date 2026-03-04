import React, { useState, useEffect, useRef } from 'react';
import { AlignLeft, Smile, Sparkles, ChevronDown, Loader2, SendHorizontal } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { CommentItem } from './CommentItem';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import { QuickEmojiRow } from './QuickEmojiRow';
import { CommentsSkeleton } from './CommentsSkeleton';
import { useSocketStore } from '@/stores/socket-store';

interface CommentsSectionProps {
    itemId: number;
    type: 'episode' | 'post';
    stickyInput?: boolean;
    onCommentInputRender?: (inputElement: React.ReactNode) => void;
}

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
    user_interaction?: boolean | null;
    children?: Comment[]; // For nested replies
    episode_id?: number;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ itemId, type, stickyInput = false, onCommentInputRender }) => {
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
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top');
    const emojiRef = useRef<HTMLDivElement>(null);
    const customEmojiRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(7);
    const [isMoreLoading, setIsMoreLoading] = useState(false);

    const fetchComments = async () => {
        try {
            const url = type === 'episode' ? `/episodes/${itemId}/comments` : `/posts/${itemId}/comments`;
            const res = await api.get(url);
            const data = type === 'episode' ? res.data : res.data.data;
            setComments(data || []);
        } catch (error) {
            console.error("Failed to fetch comments", error);
        } finally {
            setIsLoading(false);
        }
    };

    const isConnected = useSocketStore(state => state.isConnected);
    const subscribe = useSocketStore(state => state.subscribe);
    const unsubscribe = useSocketStore(state => state.unsubscribe);

    useEffect(() => {
        if (itemId) {
            fetchComments();

            // Subscribe to real-time comments
            const topic = `${type}:${itemId}`;
            if (isConnected) {
                subscribe(topic);
            }

            // Event Listeners
            const handleNewComment = (event: any) => {
                const comment = event.detail;
                const matches = type === 'episode'
                    ? comment.episode_id === itemId
                    : comment.post_id === itemId;

                if (matches) {
                    setComments(prev => {
                        const currentComments = prev || [];
                        if (currentComments.some(c => c.id === comment.id)) return prev;

                        if (comment.parent_id) {
                            const updateInTree = (list: any[]): any[] => {
                                return list.map(p => {
                                    if (p.id === comment.parent_id) {
                                        if (p.children?.some((c: any) => c.id === comment.id)) return p;
                                        return { ...p, children: [...(p.children || []), comment] };
                                    }
                                    if (p.children && p.children.length > 0) {
                                        return { ...p, children: updateInTree(p.children) };
                                    }
                                    return p;
                                });
                            };
                            return updateInTree(prev);
                        }
                        return [comment, ...prev];
                    });
                }
            };

            const handleCommentLike = (event: any) => {
                const data = event.detail;
                const updateLikes = (list: Comment[]): Comment[] => {
                    return list.map(c => {
                        if (c.id === data.comment_id) {
                            const diff = data.is_like ? 1 : -1;
                            return { ...c, likes: (c.likes || 0) + diff };
                        }
                        if (c.children && c.children.length > 0) {
                            return { ...c, children: updateLikes(c.children) };
                        }
                        return c;
                    });
                };
                setComments(prev => updateLikes(prev));
            };

            window.addEventListener('app:comment', handleNewComment);
            window.addEventListener('app:comment_like', handleCommentLike);

            return () => {
                unsubscribe(topic);
                window.removeEventListener('app:comment', handleNewComment);
                window.removeEventListener('app:comment_like', handleCommentLike);
            };
        }
    }, [itemId, isConnected]);

    // Handle visibleCount for Deep Linking
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const targetCommentId = params.get('commentId');
        if (!targetCommentId || !comments.length) return;

        const targetIdNum = parseInt(targetCommentId);

        // Recursive helper to check if a comment tree contains the ID
        const containsComment = (c: Comment, id: number): boolean => {
            if (c.id === id) return true;
            if (!c.children) return false;
            return c.children.some(child => containsComment(child, id));
        };

        // Find the index of the top-level comment that contains our target
        const index = comments.findIndex(c => containsComment(c, targetIdNum));

        if (index !== -1 && index >= visibleCount) {
            setVisibleCount(index + 1);
        }
    }, [comments, visibleCount]);

    // Click outside emoji picker
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

    const getAvatarUrl = (avatar?: string) => {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return avatar.startsWith('/') ? avatar : `/${avatar}`;
    };

    const addComment = async () => {
        if (!user) {
            const currentLang = i18n.language || 'ar';
            navigate(`/${currentLang}/auth/login`);
            return;
        }
        if (!newComment.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const url = type === 'episode' ? `/episodes/${itemId}/comments` : `/posts/${itemId}/comments`;
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
        } catch (error) {
            console.error("Failed to add comment", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (inputRef.current && (inputRef.current as any).insertText) {
            (inputRef.current as any).insertText(emojiData.emoji);
        } else {
            setNewComment(prev => prev + emojiData.emoji);
        }
        // No manual focus back needed as insertText/insertEmoji already does it
        setShowMainEmojiPicker(false);
    };

    const onCustomEmojiClick = (emojiUrl: string) => {
        // Insert emoji image directly into the rich text input
        if (inputRef.current && (inputRef.current as any).insertEmoji) {
            (inputRef.current as any).insertEmoji(emojiUrl);
        }
    };

    // Callback to refresh or update list on deep changes
    // For simplicity, we can refetch or traverse update. Refetch is easiest for consistency.
    const handleRefresh = () => fetchComments();

    const onUpdateSuccess = (updatedComment: Comment) => {
        const updateRecursive = (list: Comment[]): Comment[] => {
            return list.map(c => {
                if (c.id === updatedComment.id) {
                    return { ...c, content: updatedComment.content };
                }
                if (c.children && c.children.length > 0) {
                    return { ...c, children: updateRecursive(c.children) };
                }
                return c;
            });
        };
        setComments(prev => updateRecursive(prev));
    };

    const onDeleteSuccess = (commentId: number) => {
        const deleteRecursive = (list: Comment[]): Comment[] => {
            return list
                .filter(c => c.id !== commentId)
                .map(c => {
                    if (c.children && c.children.length > 0) {
                        return { ...c, children: deleteRecursive(c.children) };
                    }
                    return c;
                });
        };
        setComments(prev => deleteRecursive(prev));
    };

    // Optimistic updates for deep items could be handled by Context or complex reducer, 
    // but for now Refetch on Reply/Delete is safer.
    // Using onUpdateSuccess to update generic item in list would be recursive search.
    // Let's rely on Refetch for Reply/Delete for data consistency.

    return (
        <div className={`flex flex-col bg-transparent shadow-sm ${stickyInput ? 'p-4' : 'mt-0 px-4 pb-4 pt-2'}`} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{comments ? comments.length : 0} تعليق</h3>
                {/* Sort Button - Implementation can wait or just be visual */}
                <button className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] px-4 py-2 rounded-full transition">
                    <AlignLeft className="w-5 h-5" />
                    <span>الترتيب حسب</span>
                </button>
            </div>

            {/* Add Comment Input */}
            {!stickyInput && (
                <div className="flex gap-4 mb-8">
                    <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 overflow-hidden bg-purple-600 rounded-full select-none shadow-md">
                        {user?.avatar ? (
                            <img src={getAvatarUrl(user.avatar)} alt={user.name} className="object-cover w-full h-full" />
                        ) : (
                            <span className="text-lg font-bold text-white">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="relative group">
                            <RichTextInput
                                ref={inputRef}
                                value={newComment}
                                onChange={setNewComment}
                                onFocus={() => setIsMainInputFocused(true)}
                                placeholder="إضافة تعليق..."
                                className="w-full bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white py-3 px-0 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 resize-none outline-none transition-colors duration-200"
                            />
                        </div>
                        <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                        <div className={`flex items-center gap-3 mt-3 animate-in fade-in slide-in-from-top-2 w-full relative`}>
                            {i18n.language === 'ar' ? (
                                <>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={addComment}
                                            disabled={!newComment || isSubmitting}
                                            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all
                                                    ${newComment
                                                    ? 'bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] hover:scale-105 active:scale-95'
                                                    : 'bg-transparent text-gray-400 cursor-not-allowed'}`}
                                            title="تعليق"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <SendHorizontal className="w-6 h-6 rotate-180" />
                                            )}
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const spaceAbove = rect.top;
                                                setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                setShowMainEmojiPicker(!showMainEmojiPicker);
                                                (inputRef.current as any)?.focus();
                                            }}
                                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500 dark:text-[#aaa] hover:text-[#0f0f0f] dark:hover:text-white"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const spaceAbove = rect.top;
                                                setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                (inputRef.current as any)?.focus();
                                            }}
                                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500 dark:text-[#aaa] hover:text-[#0f0f0f] dark:hover:text-white"
                                            title="رموز مخصصة"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1" />
                                    <button onClick={() => { setIsMainInputFocused(false); setNewComment(''); }} className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-[#f1f1f1] hover:bg-gray-200 dark:hover:bg-[#272727] rounded-full transition">
                                        إلغاء
                                    </button>

                                    {showMainEmojiPicker && (
                                        <>
                                            <div className="fixed inset-0 z-[999]" onClick={() => setShowMainEmojiPicker(false)} />
                                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-1/2 -translate-x-1/2 z-[1000] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                            </div>
                                        </>
                                    )}

                                    {showCustomEmojiPicker && (
                                        <>
                                            <div className="fixed inset-0 z-[999]" onClick={() => setShowCustomEmojiPicker(false)} />
                                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} left-1/2 -translate-x-1/2 z-[1000] animate-in zoom-in-95 duration-200`}>
                                                <CustomEmojiPicker
                                                    onEmojiClick={onCustomEmojiClick}
                                                    onClose={() => setShowCustomEmojiPicker(false)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={addComment}
                                            disabled={!newComment || isSubmitting}
                                            className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-all
                                                    ${newComment
                                                    ? 'bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727] hover:scale-105 active:scale-95'
                                                    : 'bg-transparent text-gray-400 cursor-not-allowed'}`}
                                            title="Comment"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <SendHorizontal className="w-6 h-6" />
                                            )}
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const spaceAbove = rect.top;
                                                setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                setShowMainEmojiPicker(!showMainEmojiPicker);
                                                (inputRef.current as any)?.focus();
                                            }}
                                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500 dark:text-[#aaa] hover:text-[#0f0f0f] dark:hover:text-white"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const spaceAbove = rect.top;
                                                setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                (inputRef.current as any)?.focus();
                                            }}
                                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-[#333] transition text-gray-500 dark:text-[#aaa] hover:text-[#0f0f0f] dark:hover:text-white"
                                            title="Custom Emojis"
                                        >
                                            <Sparkles className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1" />
                                    <button onClick={() => { setIsMainInputFocused(false); setNewComment(''); }} className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-[#f1f1f1] hover:bg-gray-200 dark:hover:bg-[#272727] rounded-full transition">
                                        Cancel
                                    </button>

                                    {showMainEmojiPicker && (
                                        <>
                                            <div className="fixed inset-0 z-[2000]" onClick={() => setShowMainEmojiPicker(false)} />
                                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                            </div>
                                        </>
                                    )}

                                    {showCustomEmojiPicker && (
                                        <>
                                            <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${isAr ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200`}>
                                                <CustomEmojiPicker
                                                    onEmojiClick={onCustomEmojiClick}
                                                    onClose={() => setShowCustomEmojiPicker(false)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Comments List */}
            {isLoading ? (
                <CommentsSkeleton />
            ) : comments && comments.length > 0 ? (
                <div className="space-y-6 overflow-x-auto custom-scrollbar pb-2">
                    {comments.slice(0, visibleCount).map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            type={type}
                            itemId={itemId}
                            depth={0}
                            onReplySuccess={handleRefresh}
                            onUpdateSuccess={onUpdateSuccess}
                            onDeleteSuccess={onDeleteSuccess}
                        />
                    ))}

                    {/* Show More Button */}
                    {visibleCount < comments.length && (
                        <div className="flex justify-center mt-8 pt-4 border-t border-gray-100 dark:border-[#333]">
                            <button
                                onClick={async () => {
                                    setIsMoreLoading(true);
                                    await new Promise(resolve => setTimeout(resolve, 800));
                                    setVisibleCount(prev => prev + 10);
                                    setIsMoreLoading(false);
                                }}
                                disabled={isMoreLoading}
                                className="flex items-center gap-2 px-8 py-3 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-900 dark:text-white rounded-full font-black text-lg transition-all shadow-sm group border-2 border-transparent hover:border-gray-300 dark:hover:border-[#444] disabled:opacity-70"
                            >
                                {isMoreLoading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                ) : (
                                    <>
                                        <span>أظهر المزيد من التعليقات</span>
                                        <ChevronDown className="w-6 h-6 stroke-[3] group-hover:translate-y-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">لا توجد تعليقات حتى الآن. كن أول من يعلق!</p>
                </div>
            )}
        </div>
    );
};
