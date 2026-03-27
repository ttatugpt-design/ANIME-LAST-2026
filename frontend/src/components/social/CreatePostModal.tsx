import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Image as ImageIcon,
    Smile,
    Sparkles,
    Globe,
    ChevronDown,
    Loader2,
    Video,
    Plus,
    Trash2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { useTheme } from '@/components/theme-provider';
import { getImageUrl } from '@/utils/image-utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { RichTextInput } from '@/components/comments/RichTextInput';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (post: any) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { t, i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user } = useAuthStore();

    const [content, setContent] = useState('');
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);

    const inputRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const customEmojiButtonRef = useRef<HTMLButtonElement>(null);

    // Reset state on open/close
    useEffect(() => {
        if (!isOpen) {
            setContent('');
            setMediaFiles([]);
            setPreviews([]);
            setShowEmojiPicker(false);
            setShowCustomEmojiPicker(false);
        }
    }, [isOpen]);

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to 10 files
        const newFiles = [...mediaFiles, ...files].slice(0, 10);
        setMediaFiles(newFiles);

        // Generate previews
        const newPreviews = newFiles.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
        }));
        setPreviews(newPreviews);
    };

    const removeMedia = (index: number) => {
        const newFiles = mediaFiles.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setMediaFiles(newFiles);
        setPreviews(newPreviews);
        // Clean up URL object memory
        URL.revokeObjectURL(previews[index].url);
    };

    const handleSubmit = async () => {
        if (!content.trim() && mediaFiles.length === 0) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('content', content);

        mediaFiles.forEach(file => {
            formData.append('media[]', file);
        });

        try {
            const res = await api.post('/posts', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success(isAr ? 'تم نشر المنشور بنجاح' : 'Post published successfully');
            if (onSuccess) onSuccess(res.data);
            onClose();
        } catch (error: any) {
            console.error("Failed to create post", error);
            toast.error(isAr ? 'فشل نشر المنشور' : 'Failed to publish post');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onEmojiClick = (emojiData: EmojiClickData) => {
        if (inputRef.current?.insertText) {
            inputRef.current.insertText(emojiData.emoji);
        }
        setShowEmojiPicker(false);
    };

    const onCustomEmojiClick = (emojiUrl: string) => {
        if (inputRef.current?.insertEmoji) {
            inputRef.current.insertEmoji(emojiUrl);
        }
    };

    const getAvatarUrl = (avatar?: string) => {
        return getImageUrl(avatar);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-[#1a1a1a] border-none shadow-2xl rounded-3xl">
            <DialogHeader className="p-4 border-b border-gray-100 dark:border-[#2a2a2a]">
                <DialogTitle className="text-center text-xl font-bold dark:text-white">
                    {isAr ? 'إنشاء منشور' : 'Create Post'}
                </DialogTitle>
            </DialogHeader>

            <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* User Info */}
                <div className="flex gap-3 items-center">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-[#2a2a2a] shrink-0 border border-gray-100 dark:border-[#333]">
                        {user?.avatar ? (
                            <img src={getAvatarUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-lg">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">
                            {user?.name}
                        </p>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2a2a2a] px-2 py-0.5 rounded-md mt-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
                            <Globe className="w-3 h-3 text-black dark:text-white" />
                            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                {isAr ? 'العامة' : 'Public'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-black dark:text-white" />
                        </div>
                    </div>
                </div>

                {/* Content Input */}
                <div className="min-h-[120px]">
                    <RichTextInput
                        ref={inputRef}
                        value={content}
                        onChange={setContent}
                        placeholder={isAr ? `بماذا تفكر، ${user?.name}؟` : `What's on your mind, ${user?.name}?`}
                        className="text-lg md:text-xl border-none p-0 focus-visible:ring-0 shadow-none dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                    />
                </div>

                {/* Media Previews */}
                {previews.length > 0 && (
                    <div className={cn(
                        "grid gap-2 overflow-hidden rounded-xl border border-gray-100 dark:border-[#2a2a2a]",
                        previews.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    )}>
                        {previews.map((preview, idx) => (
                            <div key={idx} className="relative group aspect-video bg-gray-50 dark:bg-[#111]">
                                {preview.type === 'video' ? (
                                    <video src={preview.url} className="w-full h-full object-cover" controls />
                                ) : (
                                    <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                )}
                                <button
                                    onClick={() => removeMedia(idx)}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between p-3 border border-gray-100 dark:border-[#2a2a2a] rounded-xl">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 px-2">
                        {isAr ? 'إضافة إلى منشورك' : 'Add to your post'}
                    </span>
                    <div className="flex items-center gap-1">
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleMediaChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-black dark:text-white transition-colors"
                            title={isAr ? 'صور وفيديو' : 'Photos & Video'}
                        >
                            <ImageIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-black dark:text-white transition-colors"
                            title={isAr ? 'فيديو' : 'Video'}
                        >
                            <Video className="w-6 h-6" />
                        </button>
                        <button
                            ref={emojiButtonRef}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-black dark:text-white transition-colors"
                            title={isAr ? 'رموز' : 'Emojis'}
                        >
                            <Smile className="w-6 h-6" />
                        </button>
                        <button
                            ref={customEmojiButtonRef}
                            onClick={() => setShowCustomEmojiPicker(!showCustomEmojiPicker)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-black dark:text-white transition-colors"
                            title={isAr ? 'رموز مخصصة' : 'Custom Emojis'}
                        >
                            <Sparkles className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Emojis Pickers Overlays */}
            {showEmojiPicker && (
                <div className="absolute bottom-[80px] left-4 z-50 animate-in zoom-in-95 duration-200">
                    <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                    <div className="relative shadow-2xl">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            theme={Theme.AUTO}
                            width={320}
                            height={400}
                        />
                    </div>
                </div>
            )}

            {showCustomEmojiPicker && (
                <div className="absolute bottom-[80px] left-14 z-50 animate-in zoom-in-95 duration-200">
                    <div className="fixed inset-0" onClick={() => setShowCustomEmojiPicker(false)} />
                    <div className="relative shadow-2xl">
                        <CustomEmojiPicker
                            onEmojiClick={onCustomEmojiClick}
                            onClose={() => setShowCustomEmojiPicker(false)}
                        />
                    </div>
                </div>
            )}

            <DialogFooter className="p-4 border-t border-gray-100 dark:border-[#2a2a2a]">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!content.trim() && mediaFiles.length === 0)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg h-auto rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{isAr ? 'جاري النشر...' : 'Publishing...'}</span>
                        </div>
                    ) : (
                        <span>{isAr ? 'نشر' : 'Post'}</span>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
};
