import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    MoreHorizontal,
    ThumbsUp,
    MessageCircle,
    Share2,
    Heart,
    Globe,
    Clock,
    X,
    ChevronLeft,
    ChevronRight,
    MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { renderEmojiContent } from '@/utils/render-content';
import { getImageUrl } from '@/utils/image-utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommentsSection } from '@/components/comments/CommentsSection';

interface PostImage {
    id: number;
    image_url: string;
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
    images?: PostImage[];
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
}

interface PostCardProps {
    post: Post;
    onDelete?: (id: number) => void;
}


export const PostCard: React.FC<PostCardProps> = ({ post, onDelete }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();

    const [isLiked, setIsLiked] = useState(post.is_liked);
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleShare = () => {
        const url = `${window.location.origin}/${i18n.language}/social?postId=${post.id}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success(isAr ? 'تم نسخ رابط المنشور' : 'Post link copied to clipboard');
        }).catch(() => {
            toast.error(isAr ? 'فشل نسخ الرابط' : 'Failed to copy link');
        });
    };

    const toggleLike = async () => {
        const previousLiked = isLiked;
        const previousCount = likesCount;

        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

        try {
            await api.post(`/posts/${post.id}/like`);
        } catch (error) {
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
            toast.error(isAr ? 'فشل الإعجاب' : 'Failed to like');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المنشور؟' : 'Are you sure you want to delete this post?')) return;

        setIsDeleting(true);
        try {
            await api.delete(`/posts/${post.id}`);
            toast.success(isAr ? 'تم حذف المنشور' : 'Post deleted');
            if (onDelete) onDelete(post.id);
        } catch (error) {
            setIsDeleting(false);
            toast.error(isAr ? 'فشل حذف المنشور' : 'Failed to delete post');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), {
                addSuffix: true,
                locale: isAr ? ar : enUS
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className={cn(
            "bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a] overflow-hidden transition-opacity",
            isDeleting && "opacity-50 pointer-events-none"
        )}>
            {/* Post Header */}
            <div className="p-3 flex justify-between items-start">
                <div className="flex gap-2">
                    <Link to={`/${i18n.language}/u/${post.user_id}/profile`} className="shrink-0">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 dark:bg-[#2a2a2a] border border-gray-50 dark:border-[#333]">
                            {post.user?.avatar ? (
                                <img src={getImageUrl(post.user.avatar)} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                                    {post.user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </Link>
                    <div>
                        <Link
                            to={`/${i18n.language}/u/${post.user_id}/profile`}
                            className="font-bold text-gray-900 dark:text-white hover:underline block leading-tight"
                        >
                            {post.user?.name}
                        </Link>
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 mt-1">
                            <span className="text-[11px] font-medium">{formatDate(post.created_at)}</span>
                            <span>•</span>
                            <Globe className="w-3 h-3" />
                        </div>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full text-gray-500 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isAr ? 'start' : 'end'} className="dark:bg-[#1a1a1a] dark:border-[#333]">
                        <DropdownMenuItem className="cursor-pointer dark:text-white dark:hover:bg-[#2a2a2a]">
                            {isAr ? 'حفظ المنشور' : 'Save Post'}
                        </DropdownMenuItem>
                        {currentUser?.id === post.user_id && (
                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="cursor-pointer text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                            >
                                {isAr ? 'حذف' : 'Delete'}
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Post Content */}
            <div className="px-3 pb-2">
                <div className="text-sm md:text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words [&_img]:inline-block [&_img]:w-6 [&_img]:h-6 [&_img]:align-text-bottom [&_img]:mx-0.5">
                    {renderEmojiContent(post.content)}
                </div>
            </div>

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
                <div className={cn(
                    "grid gap-1 mt-2 bg-gray-100 dark:bg-[#111]",
                    post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {post.images.map((img, idx) => (
                        <div
                            key={img.id}
                            className={cn(
                                "relative overflow-hidden cursor-pointer bg-black",
                                post.images && post.images.length === 1 ? "aspect-auto max-h-[480px] flex justify-center" : "aspect-square"
                            )}
                        >
                            <img
                                src={getImageUrl(img.image_url)}
                                alt=""
                                className={cn(
                                    "w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]",
                                    post.images && post.images.length === 1 && "object-contain w-auto h-auto"
                                )}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Post Stats */}
            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-[#2a2a2a] flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-1 rtl:space-x-reverse">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                            <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                        <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center border border-white dark:border-[#1a1a1a]">
                            <Heart className="w-2.5 h-2.5 text-white fill-white" />
                        </div>
                    </div>
                    <span>{likesCount}</span>
                </div>
                <div className="flex gap-3">
                    <span>{post.comments_count} {isAr ? 'تعليق' : 'Comments'}</span>
                    <span>0 {isAr ? 'مشاركة' : 'Shares'}</span>
                </div>
            </div>

            {/* Post Actions */}
            <div className="px-1 py-0.5 flex items-center gap-1">
                <button
                    onClick={toggleLike}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold",
                        isLiked
                            ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                    )}
                >
                    <ThumbsUp className={cn("w-5 h-5", isLiked && "fill-blue-500")} />
                    <span>{isAr ? 'أعجبني' : 'Like'}</span>
                </button>
                <button
                    onClick={() => setShowComments(!showComments)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]",
                        showComments && "text-blue-500 bg-blue-50 dark:bg-blue-900/10"
                    )}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span>{isAr ? 'تعليق' : 'Comment'}</span>
                </button>
                <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                >
                    <Share2 className="w-5 h-5" />
                    <span>{isAr ? 'مشاركة' : 'Share'}</span>
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="border-t border-gray-100 dark:border-[#2a2a2a] p-4 bg-gray-50/30 dark:bg-black/20">
                    {/* We need to pass type='post' and item_id=post.id to CommentsSection */}
                    {/* However, the current CommentsSection might be linked to Anime episodes */}
                    {/* Let's verify CommentsSection implementation */}
                    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                        <MessageSquare className="w-4 h-4" />
                        {isAr ? 'التعليقات' : 'Comments'}
                    </div>

                    {/* Placeholder for now to avoid breaking until verified */}
                    <CommentsSection
                        type="post"
                        itemId={post.id}
                    />
                </div>
            )}
        </div>
    );
};
