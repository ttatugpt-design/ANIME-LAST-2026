import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, MessageSquare, Heart, UserPlus, UserCheck, UserX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { renderEmojiContent } from '@/utils/render-content';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export const NotificationPopup: React.FC = () => {
    const [notification, setNotification] = useState<any>(null);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { lang } = useParams<{ lang: string }>();
    const { i18n } = useTranslation();
    const currentLang = lang || i18n.language || 'ar';

    // Disable notification popup when on the chat page to avoid overlap
    const isChatPage = location.pathname.includes('/messages');

    useEffect(() => {
        const handleNotification = (event: any) => {
            const notifObject = event.detail;
            setNotification(notifObject);

            // Auto hide after 8 seconds
            const timer = setTimeout(() => {
                setNotification(null);
            }, 8000);

            return () => clearTimeout(timer);
        };

        window.addEventListener('app:notification', handleNotification);
        return () => window.removeEventListener('app:notification', handleNotification);
    }, []);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotification(null);
    };

    const handleClick = () => {
        if (!notification || !notification.data) return;

        if (notification.type === 'friend_request' && notification.data.requester_id) {
            navigate(`/${currentLang}/u/${notification.data.requester_id}/profile`);
            setNotification(null);
            return;
        }
        if (notification.type === 'friend_request_accepted' && notification.data.accepter_id) {
            navigate(`/${currentLang}/u/${notification.data.accepter_id}/profile`);
            setNotification(null);
            return;
        }
        if (notification.type === 'friend_request_rejected' && notification.data.rejecter_id) {
            navigate(`/${currentLang}/u/${notification.data.rejecter_id}/profile`);
            setNotification(null);
            return;
        }

        if (notification.type === 'chat_message' && notification.data.sender_id) {
            navigate(`/${currentLang}/u/${user?.id}/dashboard/messages?userId=${notification.data.sender_id}`);
            setNotification(null);
            return;
        }

        const data = notification.data;
        const animeId = data.anime_id || data.slug; // Fallback to slug if id missing
        const episodeNum = data.episode_number;
        const commentId = data.comment_id;
        const parentId = data.parent_id;

        if (animeId && episodeNum !== undefined) {
            let url = `/${currentLang}/watch/${animeId}/${episodeNum}`;
            if (commentId) {
                // Handle deep linking like in "the past"
                url += `?commentId=${commentId}`;
                if (parentId) url += `&parentId=${parentId}`;
            }
            navigate(url);
            setNotification(null);
        }
    };

    const getAvatarUrl = (avatar?: string) => {
        if (!avatar) return '';
        if (avatar.startsWith('http')) return avatar;
        if (avatar.startsWith('/storage/')) return avatar; // Backend storage path
        return avatar.startsWith('/') ? avatar : `/${avatar}`;
    };

    if (!notification || !notification.data || isChatPage) return null;
    const data = notification.data;
    const isFriendRequest = notification.type === 'friend_request';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] pointer-events-none flex items-start justify-center pt-5 md:pt-8 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleClick}
                    className="pointer-events-auto w-full max-w-md bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-none overflow-hidden cursor-pointer border border-gray-100 dark:border-[#333] group"
                    dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
                >
                    <div className="relative flex items-start p-3 gap-3">
                        {/* Status Color Strip */}
                        <div className={cn(
                            `absolute top-0 bottom-0 ${currentLang === 'ar' ? 'right-0' : 'left-0'} w-1`,
                            (isFriendRequest || notification.type === 'friend_request_accepted') ? 'bg-green-500' :
                                notification.type === 'friend_request_rejected' ? 'bg-red-500' :
                                    notification.type === 'reply' ? 'bg-blue-500' : 'bg-red-500'
                        )} />

                        {/* Actor Avatar or Default */}
                        <div className="flex-shrink-0 relative">
                            <div className="w-12 h-12 rounded-none overflow-hidden border border-gray-100 dark:border-[#333] bg-gray-50 dark:bg-[#222]">
                                {data.actor_avatar || data.requester_avatar || data.accepter_avatar || data.rejecter_avatar || data.sender_avatar ? (
                                    <img
                                        src={getAvatarUrl(data.actor_avatar || data.requester_avatar || data.accepter_avatar || data.rejecter_avatar || data.sender_avatar)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black dark:bg-white text-white dark:text-black font-bold text-lg">
                                        {(data.actor_name || data.requester_name || data.accepter_name || data.rejecter_name || data.sender_name)?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {/* Small Type Icon Overlay */}
                            <div className={cn(
                                `absolute -bottom-1 -right-1 w-5 h-5 rounded-none flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1a1a]`,
                                (isFriendRequest || notification.type === 'friend_request_accepted') ? 'bg-green-500' :
                                    (notification.type === 'reply' || notification.type === 'chat_message') ? 'bg-blue-500' :
                                        notification.type === 'friend_request_rejected' ? 'bg-red-500' : 'bg-red-500'
                            )}>
                                {isFriendRequest ? (
                                    <UserPlus className="w-3 h-3 text-white" />
                                ) : notification.type === 'friend_request_accepted' ? (
                                    <UserCheck className="w-3 h-3 text-white" />
                                ) : notification.type === 'friend_request_rejected' ? (
                                    <UserX className="w-3 h-3 text-white" />
                                ) : (notification.type === 'reply' || notification.type === 'chat_message') ? (
                                    <MessageSquare className="w-3 h-3 text-white" />
                                ) : (
                                    <Heart className="w-3 h-3 text-white fill-white" />
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-col">
                                <h4 className="text-sm font-black text-gray-900 dark:text-white truncate">
                                    {data.actor_name || data.requester_name || data.accepter_name || data.rejecter_name || data.sender_name}
                                </h4>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-1">
                                    {isFriendRequest
                                        ? (currentLang === 'ar' ? 'أرسل لك طلب صداقة' : 'sent you a friend request')
                                        : notification.type === 'friend_request_accepted'
                                            ? (currentLang === 'ar' ? 'قبل طلب صداقتك' : 'accepted your friend request')
                                            : notification.type === 'friend_request_rejected'
                                                ? (currentLang === 'ar' ? 'رفض طلب صداقتك' : 'rejected your friend request')
                                                : notification.type === 'chat_message'
                                                    ? (currentLang === 'ar' ? 'أرسل لك رسالة جديدة' : 'sent you a new message')
                                                    : (notification.type === 'reply' ? (currentLang === 'ar' ? 'رد على تعليقك' : 'replied to your comment') : (currentLang === 'ar' ? 'أعجب بتعليقك' : 'liked your comment'))
                                    }
                                </span>
                            </div>

                            {/* Action Buttons for Friend Request */}
                            {isFriendRequest && (
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!data.requester_id) return;
                                            try {
                                                await api.post(`/friends/accept/${data.requester_id}`);
                                                setNotification(null);
                                            } catch (error) { console.error(error); }
                                        }}
                                        className="px-3 py-1 bg-[#1877f2] hover:bg-[#166fe5] text-white text-[10px] font-bold rounded transition-colors"
                                    >
                                        {currentLang === 'ar' ? 'تأكيد' : 'Confirm'}
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!data.requester_id) return;
                                            try {
                                                await api.delete(`/friends/${data.requester_id}`);
                                                setNotification(null);
                                            } catch (error) { console.error(error); }
                                        }}
                                        className="px-3 py-1 bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-gray-800 dark:text-gray-200 text-[10px] font-bold rounded transition-colors"
                                    >
                                        {currentLang === 'ar' ? 'حذف' : 'Delete'}
                                    </button>
                                </div>
                            )}

                            {/* Quoted Comment Content (Context) (Not for friend requests) */}
                            {!isFriendRequest && notification.type !== 'friend_request_accepted' && notification.type !== 'friend_request_rejected' && (
                                <div className="bg-gray-50 dark:bg-[#222] border-l-2 border-gray-200 dark:border-[#333] p-1.5 mb-2 text-[11px] text-gray-400 dark:text-gray-500 italic line-clamp-1">
                                    {renderEmojiContent(data.comment_content || '')}
                                </div>
                            )}


                            {/* New Content (if reply or chat) */}
                            {(notification.type === 'reply' || notification.type === 'chat_message') && (
                                <div className="text-[13px] text-gray-900 dark:text-white line-clamp-2 leading-relaxed font-bold mb-2">
                                    {renderEmojiContent(data.reply_content || data.message_content || '')}
                                </div>
                            )}

                            {!isFriendRequest && notification.type !== 'friend_request_accepted' && notification.type !== 'friend_request_rejected' && notification.type !== 'chat_message' && (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                                    <span className="truncate">{data.anime_title}</span>
                                    <span>•</span>
                                    <span className="flex-shrink-0">الحلقة {data.episode_number}</span>
                                </div>
                            )}
                        </div>

                        {/* Episode Thumbnail (Only for interactions) */}
                        {!isFriendRequest && notification.type !== 'friend_request_accepted' && notification.type !== 'friend_request_rejected' && (
                            <div className="flex-shrink-0 w-14 h-14 rounded-none overflow-hidden relative border border-gray-100 dark:border-[#333]">
                                <img
                                    src={data.episode_image || data.anime_image}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="flex-shrink-0 -mt-1 -mr-1 p-1 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-400 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
