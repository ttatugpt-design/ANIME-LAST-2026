import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CommentsSection } from './CommentsSection';
import { X, Smile, Sparkles, SendHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { CustomEmojiPicker } from './CustomEmojiPicker';
import { RichTextInput } from './RichTextInput';
import { QuickEmojiRow } from './QuickEmojiRow';
import api from '@/lib/api';

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
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { user } = useAuthStore();

    interface RichTextInputHandle {
        insertEmoji: (emojiUrl: string) => void;
        insertText: (text: string) => void;
    }

    const [newComment, setNewComment] = useState('');
    const [isInputFocused, setIsInputFocused] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('top');
    const [refreshKey, setRefreshKey] = useState(0);
    const emojiRef = useRef<HTMLDivElement>(null);
    const customEmojiRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<RichTextInputHandle>(null);

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

    const getAvatarUrl = (avatar?: string) => {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        return avatar.startsWith('/') ? avatar : `/${avatar}`;
    };

    const addComment = async () => {
        if (!newComment.trim()) return;
        try {
            await api.post(`/episodes/${episodeId}/comments`, { content: newComment });
            setNewComment('');
            setIsInputFocused(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error("Failed to post comment", error);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (inputRef.current) {
            inputRef.current.insertText(emojiData.emoji);
        }
        // Keep picker open for multiple selection
    };

    const onCustomEmojiClick = (emoji: string) => {
        if (inputRef.current) {
            inputRef.current.insertEmoji(emoji);
        }
        // Keep picker open for multiple selection
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="bottom" className="h-[100dvh] w-full max-w-[480px] mx-auto left-0 right-0 p-0 bg-white dark:bg-[#111] border-t border-gray-200 dark:border-[#333] rounded-t-xl flex flex-col focus:outline-none outline-none shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#222] flex-shrink-0">
                    <SheetTitle className="text-lg font-bold text-gray-900 dark:text-white">
                        {lang === 'ar' ? 'التعليقات' : 'Comments'}
                    </SheetTitle>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Scrollable Comments Area */}
                <div
                    className="flex-1 min-h-0 overflow-y-auto px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                >
                    <CommentsSection key={refreshKey} itemId={episodeId} type="episode" stickyInput={true} />
                </div>

                {/* Sticky Comment Input at Bottom */}
                <div className="border-t border-gray-200 dark:border-[#222] bg-white dark:bg-[#111] p-4 flex-shrink-0" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <div className="relative group">
                                <RichTextInput
                                    ref={inputRef as any}
                                    value={newComment}
                                    onChange={setNewComment}
                                    onFocus={() => setIsInputFocused(true)}
                                    placeholder={lang === 'ar' ? 'إضافة تعليق...' : 'Add a comment...'}
                                    className="w-full bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:border-black dark:focus:border-white py-2 px-0 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-600 resize-none outline-none transition-colors duration-200"
                                />
                            </div>
                            <QuickEmojiRow onEmojiClick={onCustomEmojiClick} />
                            {(isInputFocused || newComment) && (
                                <div className="flex items-center justify-between mt-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                const spaceAbove = rect.top;
                                                setPickerPosition(spaceAbove > 450 ? 'top' : 'bottom');
                                                setShowEmojiPicker(!showEmojiPicker);
                                                (inputRef.current as any)?.focus();
                                            }}
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] transition text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
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
                                            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#222] transition text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
                                            title={lang === 'ar' ? 'رموز مخصصة' : 'Custom Emojis'}
                                        >
                                            <Sparkles className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setIsInputFocused(false);
                                                setNewComment('');
                                            }}
                                            className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition"
                                        >
                                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={addComment}
                                            disabled={!newComment.trim()}
                                            className="px-4 py-2 text-sm font-bold bg-black dark:bg-white text-white dark:text-black rounded-full transition disabled:opacity-50"
                                        >
                                            {lang === 'ar' ? 'تعليق' : 'Comment'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {showEmojiPicker && (
                        <>
                            <div className="fixed inset-0 z-[2000]" onClick={() => setShowEmojiPicker(false)} />
                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${lang === 'ar' ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.AUTO} />
                            </div>
                        </>
                    )}

                    {showCustomEmojiPicker && (
                        <>
                            <div className="fixed inset-0 z-[2000]" onClick={() => setShowCustomEmojiPicker(false)} />
                            <div className={`absolute ${pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${lang === 'ar' ? 'right-0' : 'left-0'} z-[2001] animate-in zoom-in-95 duration-200 shadow-2xl`}>
                                <CustomEmojiPicker onEmojiClick={onCustomEmojiClick} onClose={() => setShowCustomEmojiPicker(false)} />
                            </div>
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
};
