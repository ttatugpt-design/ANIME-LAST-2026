import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

// Helper for relative time display
const getRelativeTime = (dateString: string, lang: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (lang === 'ar') {
        if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays === 1) return 'منذ يوم واحد';
        if (diffDays === 2) return 'منذ يومين';
        if (diffDays < 30) return `منذ ${diffDays} يوم`;
        if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهر`;
        return `منذ ${Math.floor(diffDays / 365)} سنة`;
    } else {
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 30) return `${diffDays} days ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
};

// Helper to render content with custom emojis
const renderCommentContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/(!\[emoji\]\(.*?\.(?:png|jpg|jpeg)\))/);
    return parts.map((part, index) => {
        const match = part.match(/!\[emoji\]\((.*?\.(?:png|jpg|jpeg))\)/);
        if (match) {
            let emojiUrl = match[1];
            if (!emojiUrl.startsWith('/') && !emojiUrl.startsWith('http')) {
                emojiUrl = `/custom-emojis/${emojiUrl}`;
            }
            return (
                <img
                    key={index}
                    src={emojiUrl}
                    alt="emoji"
                    className="inline-block w-5 h-5 align-middle mx-0.5"
                />
            );
        }
        return <span key={index}>{part}</span>;
    });
};

interface BrowseSidebarProps {
    hideComments?: boolean;
    hideUsers?: boolean;
}

export default function BrowseSidebar({ hideComments = false, hideUsers = false }: BrowseSidebarProps) {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [currentCommentPage, setCurrentCommentPage] = useState(0);

    // Fetch latest 30 comments
    const { data: comments, isLoading: commentsLoading } = useQuery({
        queryKey: ['latestComments'],
        queryFn: async () => {
            const response = await api.get('/comments', { params: { limit: 30 } });
            return response.data || [];
        },
        staleTime: 2 * 60 * 1000,
    });

    // Auto-rotate comments every 8 seconds (longer duration for reading 6 comments)
    useEffect(() => {
        if (!comments || comments.length === 0) return;

        const totalPages = Math.ceil(comments.length / 6);
        const timer = setInterval(() => {
            setCurrentCommentPage((prev) => (prev + 1) % totalPages);
        }, 8000);

        return () => clearInterval(timer);
    }, [comments]);

    const displayComments = comments?.slice(currentCommentPage * 6, (currentCommentPage + 1) * 6) || [];

    // Fetch latest 5 users
    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['latestUsers'],
        queryFn: async () => {
            const response = await api.get('/users', { params: { limit: 5 } });
            return response.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });

    return (
        <div className="h-full space-y-0 flex flex-col bg-white dark:bg-[#0a0a0a] overflow-y-auto scrollbar-none">
            {/* Latest Comments Section */}
            {!hideComments && (
                <div className="  dark:border-[#2a2a2a] pt-5 px-6 pb-6 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-black dark:text-white" />
                            <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase">
                                {isRtl ? 'أحدث التعليقات' : 'Latest Comments'}
                            </h3>
                        </div>
                        {/* Pagination Indicator */}
                        {comments && comments.length > 6 && (
                            <div className="flex gap-1">
                                {[...Array(Math.ceil(comments.length / 6))].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentCommentPage(i)}
                                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentCommentPage
                                            ? 'bg-black dark:bg-white w-4'
                                            : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 relative">
                        <AnimatePresence mode="wait">
                            {commentsLoading ? (
                                <motion.div
                                    key="skeleton"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-6"
                                >
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="animate-pulse">
                                            <div className="h-4 bg-gray-200 dark:bg-[#1c1c1c] w-3/4 mb-3"></div>
                                            <div className="h-3 bg-gray-200 dark:bg-[#1c1c1c] w-full"></div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : displayComments.length > 0 ? (
                                <motion.div
                                    key={currentCommentPage}
                                    initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                    className="space-y-1"
                                >
                                    {displayComments.map((comment: any) => (
                                        <div key={comment.id} className="group relative py-1 border-b border-gray-100 dark:border-[#2a2a2a] last:border-0">
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className="text-xs font-bold text-black dark:text-white">
                                                        {comment.user?.name || (isRtl ? 'مستخدم' : 'User')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {getRelativeTime(comment.created_at, i18n.language)}
                                                    </span>
                                                </div>
                                                <p className="text-base font-bold text-gray-950 dark:text-white line-clamp-2 leading-tight">
                                                    {renderCommentContent(comment.content)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.p
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-sm text-gray-500 text-center py-10 italic"
                                >
                                    {isRtl ? 'لا توجد تعليقات بعد' : 'No comments yet'}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Latest Users Section */}
            {!hideUsers && (
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Users className="w-5 h-5 text-black dark:text-white" />
                        <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white uppercase">
                            {isRtl ? 'أحدث المستخدمين' : 'Latest Users'}
                        </h3>
                    </div>

                    {usersLoading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 animate-pulse">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-[#1c1c1c]"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 dark:bg-[#1c1c1c] w-2/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : users && users.length > 0 ? (
                        <div className="space-y-4">
                            {users.map((user: any) => (
                                <div key={user.id} className="flex items-center gap-4 group cursor-default">
                                    <div className="flex-shrink-0 w-12 h-12 overflow-hidden bg-gray-100 dark:bg-[#1c1c1c] border border-transparent group-hover:border-black/30 dark:group-hover:border-white/30 transition-colors">
                                        {user.avatar ? (
                                            <img
                                                src={getImageUrl(user.avatar)}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <Users className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                                            {getRelativeTime(user.created_at, i18n.language)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-10 italic">
                            {isRtl ? 'لا يوجد مستخدمون جدد' : 'No new users yet'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
