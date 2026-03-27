import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    X,
    Image as ImageIcon,
    Smile,
    Sparkles,
    Loader2,
    Video,
    Plus,
    Globe,
    ChevronDown,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { getImageUrl } from '@/utils/image-utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { RichTextInput } from '@/components/comments/RichTextInput';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: any;
    onSuccess?: (updatedPost: any) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, post, onSuccess }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user } = useAuthStore();

    const [content, setContent] = useState(post?.content || '');
    const [mediaToKeep, setMediaToKeep] = useState<number[]>(post?.media?.map((m: any) => m.id) || []);
    const [newMediaFiles, setNewMediaFiles] = useState<File[]>([]);
    const [newMediaPreviews, setNewMediaPreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);

    const inputRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const customEmojiButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (isOpen && post) {
            setContent(post.content);
            setMediaToKeep(post.media?.map((m: any) => m.id) || []);
            setNewMediaFiles([]);
            setNewMediaPreviews([]);
        }
    }, [isOpen, post]);

    const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const updatedFiles = [...newMediaFiles, ...files];
        setNewMediaFiles(updatedFiles);

        const updatedPreviews = updatedFiles.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' as const : 'image' as const
        }));
        setNewMediaPreviews(updatedPreviews);
    };

    const removeNewMedia = (index: number) => {
        const preview = newMediaPreviews[index];
        setNewMediaFiles(prev => prev.filter((_, i) => i !== index));
        setNewMediaPreviews(prev => prev.filter((_, i) => i !== index));
        URL.revokeObjectURL(preview.url);
    };

    const toggleMediaKeep = (id: number) => {
        if (mediaToKeep.includes(id)) {
            setMediaToKeep(prev => prev.filter(mid => mid !== id));
        } else {
            setMediaToKeep(prev => [...prev, id]);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && mediaToKeep.length === 0 && newMediaFiles.length === 0) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('content', content);
        formData.append('media_to_keep', JSON.stringify(mediaToKeep));

        newMediaFiles.forEach(file => {
            formData.append('media[]', file);
        });

        try {
            const res = await api.put(`/posts/${post.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success(isAr ? 'تم تحديث المنشور بنجاح' : 'Post updated successfully');
            if (onSuccess) onSuccess(res.data);
            onClose();
        } catch (error: any) {
            console.error("Failed to update post", error);
            toast.error(isAr ? 'فشل تحديث المنشور' : 'Failed to update post');
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
                        {isAr ? 'تعديل المنشور' : 'Edit Post'}
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
                            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#2a2a2a] px-2 py-0.5 rounded-md mt-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-[#333] transition-colors w-fit">
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
                            placeholder={isAr ? `ماذا يدور في ذهنك؟` : `What's on your mind?`}
                            className="text-lg md:text-xl border-none p-0 focus-visible:ring-0 shadow-none dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                        />
                    </div>

                    {/* Media Management */}
                    <div className="space-y-4">
                         {/* Existing Media */}
                         {post?.media && post.media.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {post.media.map((m: any) => (
                                    <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden group">
                                        {m.media_type === 'video' ? (
                                            <div className="w-full h-full bg-black flex items-center justify-center">
                                                <Video className="w-8 h-8 text-white" />
                                            </div>
                                        ) : (
                                            <img src={getImageUrl(m.media_url)} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <div className={cn(
                                            "absolute inset-0 flex items-center justify-center transition-colors",
                                            mediaToKeep.includes(m.id) ? "bg-transparent" : "bg-red-500/40"
                                        )}>
                                            <button
                                                onClick={() => toggleMediaKeep(m.id)}
                                                className={cn(
                                                    "p-1.5 rounded-full transition-all",
                                                    mediaToKeep.includes(m.id)
                                                        ? "bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100"
                                                        : "bg-red-500 text-white opacity-100"
                                                )}
                                            >
                                                {mediaToKeep.includes(m.id) ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New Media Previews */}
                        {newMediaPreviews.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {newMediaPreviews.map((preview, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-50 dark:bg-[#111]">
                                        {preview.type === 'video' ? (
                                            <div className="w-full h-full bg-black flex items-center justify-center">
                                                <Video className="w-8 h-8 text-white" />
                                            </div>
                                        ) : (
                                            <img src={preview.url} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <button
                                            onClick={() => removeNewMedia(idx)}
                                            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-opacity z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

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
                        disabled={isSubmitting || (!content.trim() && mediaToKeep.length === 0 && newMediaFiles.length === 0)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg h-auto rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>{isAr ? 'جاري الحفظ...' : 'Saving...'}</span>
                            </div>
                        ) : (
                            <span>{isAr ? 'حفظ' : 'Save'}</span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
