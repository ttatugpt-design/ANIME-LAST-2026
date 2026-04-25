import React, { useState, useRef, useEffect } from 'react';
import { CommentsSection } from './CommentsSection';
import { X, Smile, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import { QuickEmojiRow } from './QuickEmojiRow';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import CentralSpinner from '@/components/ui/CentralSpinner';

interface MobileCommentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    episodeId: number;
}

export const MobileCommentsModal: React.FC<MobileCommentsModalProps> = ({
    isOpen,
    onClose,
    episodeId
}) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    const { user } = useAuthStore();

    interface RichTextInputHandle {
        insertEmoji: (emojiUrl: string) => void;
        insertText: (text: string) => void;
        focus: () => void;
    }

    const [newComment, setNewComment] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [commentCount, setCommentCount] = useState(0);
    const [isPosting, setIsPosting] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    
    const emojiRef = useRef<HTMLDivElement>(null);
    const customEmojiRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<RichTextInputHandle>(null);

    // Initial Loading Feel
    useEffect(() => {
        if (isOpen) {
            setIsInitialLoading(true);
            const timer = setTimeout(() => setIsInitialLoading(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Handle click outside to close pickers
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
            if (customEmojiRef.current && !customEmojiRef.current.contains(event.target as Node)) {
                setShowCustomEmojiPicker(false);
            }
        };

        if (showEmojiPicker || showCustomEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker, showCustomEmojiPicker]);

    const addComment = async () => {
        if (!newComment.trim() || isPosting) return;
        setIsPosting(true);
        try {
            await api.post(`/episodes/${episodeId}/comments`, { content: newComment });
            setNewComment('');
            setIsInputFocused(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to post comment", error);
        } finally {
            setIsPosting(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (inputRef.current) {
            inputRef.current.insertText(emojiData.emoji);
        }
    };

    const onCustomEmojiClick = (emoji: string) => {
        if (inputRef.current) {
            inputRef.current.insertEmoji(emoji);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: "100%" }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[9999] bg-white dark:bg-black flex flex-col overflow-hidden"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a] sticky top-0 z-10 shadow-sm shrink-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                {lang === 'ar' ? 'التعليقات' : 'Comments'}
                            </h2>
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-black text-gray-500 dark:text-gray-400">
                                {commentCount}
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-90"
                        >
                            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Comments List Area */}
                    <div className="flex-1 overflow-hidden flex flex-col relative">
                        {isInitialLoading && (
                            <div className="absolute inset-0 z-50 bg-white dark:bg-black flex items-center justify-center">
                                <CentralSpinner />
                            </div>
                        )}
                        
                        <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar pb-32">
                            <CommentsSection 
                                key={refreshKey} 
                                itemId={episodeId} 
                                type="episode" 
                                stickyInput={true} 
                                onCountChange={setCommentCount}
                            />
                        </div>
                    </div>

                    {/* Bottom Input Area */}
                    <div className="shrink-0 p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#0a0a0a] z-20 pb-safe">
                        <div className="flex flex-col gap-3">
                            <div className="relative">
                                <RichTextInput
                                    ref={inputRef as any}
                                    value={newComment}
                                    onChange={setNewComment}
                                    onFocus={() => setIsInputFocused(true)}
                                    placeholder={lang === 'ar' ? 'إضافة تعليق...' : 'Add a comment...'}
                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-[15px] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all min-h-[50px] max-h-[150px]"
                                />
                                {isPosting && (
                                    <div className="absolute inset-0 bg-white/60 dark:bg-black/60 rounded-xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                                        <CentralSpinner size="small" />
                                    </div>
                                )}
                            </div>
                            
                            <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />

                            {(isInputFocused || newComment) && (
                                <div className="flex items-center justify-between mt-1 animate-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center gap-1">
                                        <div ref={emojiRef} className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowEmojiPicker(!showEmojiPicker);
                                                    setShowCustomEmojiPicker(false);
                                                }}
                                                className={cn(
                                                    "p-2 rounded-lg transition-all",
                                                    showEmojiPicker ? "bg-blue-500 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                                )}
                                            >
                                                <Smile className="w-6 h-6" />
                                            </button>
                                            {showEmojiPicker && (
                                                <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl">
                                                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div ref={customEmojiRef} className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                                    setShowEmojiPicker(false);
                                                }}
                                                className={cn(
                                                    "p-2 rounded-lg transition-all",
                                                    showCustomEmojiPicker ? "bg-blue-500 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                                                )}
                                                title={lang === 'ar' ? 'رموز مخصصة' : 'Custom Emojis'}
                                            >
                                                <Sparkles className="w-6 h-6" />
                                            </button>
                                            {showCustomEmojiPicker && (
                                                <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl">
                                                    <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setIsInputFocused(false);
                                                setNewComment('');
                                                setShowEmojiPicker(false);
                                                setShowCustomEmojiPicker(false);
                                            }}
                                            className="px-5 py-2.5 text-[14px] font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition"
                                        >
                                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={addComment}
                                            disabled={!newComment.trim() || isPosting}
                                            className="px-6 py-2.5 text-[14px] font-black bg-black dark:bg-white text-white dark:text-black rounded-full transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isPosting && <CentralSpinner size="small" />}
                                            {lang === 'ar' ? 'نشر' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
