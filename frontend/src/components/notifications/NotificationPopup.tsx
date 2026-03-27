import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '@/utils/image-utils';
import { X, MessageSquare, Heart, UserPlus, UserCheck, UserX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { renderEmojiContent } from '@/utils/render-content';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useMessagingStore } from '@/stores/messaging-store';

export const getReactionInfo = (type: string, isAr: boolean) => {
    const reactions: Record<string, { labelAr: string, labelEn: string, gif: string }> = {
        'like': { labelAr: 'أعجبني', labelEn: 'Like', gif: '/uploads/تفاعل البوست/أعجبني.png' },
        'love': { labelAr: 'أحببته', labelEn: 'Love', gif: '/uploads/تفاعل البوست/أحببتة.png' },
        'sad': { labelAr: 'أحزنني', labelEn: 'Sad', gif: '/uploads/تفاعل البوست/أحزنني.gif' },
        'angry': { labelAr: 'أغضبني', labelEn: 'Angry', gif: '/uploads/تفاعل البوست/أغضبني.gif' },
        'wow': { labelAr: 'واوو', labelEn: 'Wow', gif: '/uploads/تفاعل البوست/واوو.png' },
        'haha': { labelAr: 'اضحكني', labelEn: 'Haha', gif: '/uploads/تفاعل البوست/اضحكني.png' },
        'super_sad': { labelAr: 'أحززنني جداً', labelEn: 'So Sad', gif: '/uploads/تفاعل البوست/أحززنني جدا.png' },
    };
    const r = reactions[type] || reactions['like'];
    return {
        labelAr: r.labelAr,
        labelEn: r.labelEn,
        gif: getImageUrl(r.gif)
    };
};

export const NotificationPopup: React.FC = () => {
    const [notification, setNotification] = useState<any>(null);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { lang } = useParams<{ lang: string }>();
    const { i18n } = useTranslation();
    const { openMessagingModal } = useMessagingStore();
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
            openMessagingModal({
                id: notification.data.sender_id,
                name: notification.data.sender_name || 'Someone',
                avatar: notification.data.sender_avatar
            });
            setNotification(null);
            return;
        }

        const data = notification.data;
        const commentId = data.comment_id;
        const parentId = data.parent_id;

        // Community Post notification
        if (data.post_id) {
            let url = `/${currentLang}/community/post/${data.post_id}`;
            if (commentId) {
                url += `?commentId=${commentId}`;
                if (parentId) url += `&parentId=${parentId}`;
            }
            navigate(url);
            setNotification(null);
            return;
        }

        // Watch Page (Anime Episode) notification
        const animeId = data.anime_id || data.slug;
        const episodeNum = data.episode_number;

        if (animeId && episodeNum !== undefined) {
            let url = `/${currentLang}/watch/${animeId}/${episodeNum}`;
            if (commentId) {
                url += `?commentId=${commentId}`;
                if (parentId) url += `&parentId=${parentId}`;
            }
            navigate(url);
            setNotification(null);
        }
    };

    const getAvatarUrl = (avatar?: string) => {
        return getImageUrl(avatar);
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
                    className="pointer-events-auto w-[90%] max-w-[280px] md:w-full md:max-w-md bg-white dark:bg-[#1a1a1a] shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden cursor-pointer border border-gray-100 dark:border-[#333] group mx-auto md:mx-0"
                    dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
                >
                    <div className="relative flex items-start p-2.5 md:p-4 gap-3">
                        {/* Status Color Strip */}
                        <div className={cn(
                            `absolute top-0 bottom-0 ${currentLang === 'ar' ? 'right-0' : 'left-0'} w-1`,
                            (isFriendRequest || notification.type === 'friend_request_accepted') ? 'bg-green-500' :
                                notification.type === 'friend_request_rejected' ? 'bg-red-500' :
                                    (notification.type === 'reply' || notification.type === 'comment') ? 'bg-blue-500' : 'bg-red-500'
                        )} />

                        {/* Actor Avatar or Default */}
                        <div className="flex-shrink-0 relative">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-gray-100 dark:border-[#333] bg-gray-50 dark:bg-[#222]">
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
                                `absolute -bottom-1 -right-1 flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1a1a]`,
                                (isFriendRequest || notification.type === 'friend_request_accepted') ? 'w-5 h-5 rounded-full bg-green-500' :
                                    (notification.type === 'reply' || notification.type === 'comment' || notification.type === 'chat_message') ? 'w-5 h-5 rounded-full bg-blue-500' :
                                        notification.type === 'friend_request_rejected' ? 'w-5 h-5 rounded-full bg-red-500' : 
                                        (notification.type === 'like' ? 'w-[22px] h-[22px] rounded-full bg-white dark:bg-[#1a1a1a]' : 'w-5 h-5 rounded-full bg-red-500')
                            )}>
                                {isFriendRequest ? (
                                    <UserPlus className="w-3 h-3 text-white" />
                                ) : notification.type === 'friend_request_accepted' ? (
                                    <UserCheck className="w-3 h-3 text-white" />
                                ) : notification.type === 'friend_request_rejected' ? (
                                    <UserX className="w-3 h-3 text-white" />
                                ) : (notification.type === 'reply' || notification.type === 'comment' || notification.type === 'chat_message') ? (
                                    <MessageSquare className="w-3 h-3 text-white" />
                                ) : notification.type === 'like' ? (
                                    <div className="w-full h-full rounded-full overflow-hidden">
                                        <img src={getReactionInfo(data.reaction_type || 'like', currentLang === 'ar').gif} alt="" className="w-full h-full object-cover scale-110" />
                                    </div>
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
                                                    : (notification.type === 'comment' ? (currentLang === 'ar' ? 'علق على منشورك' : 'commented on your post') : (notification.type === 'reply' ? (currentLang === 'ar' ? 'رد على تعليقك' : 'replied to your comment') : (currentLang === 'ar' ? `تفاعل بـ ${getReactionInfo(data.reaction_type || 'like', currentLang === 'ar').labelAr} على تعليقك` : `reacted with ${getReactionInfo(data.reaction_type || 'like', currentLang === 'ar').labelEn} to your comment`)))
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

                            {/* Quoted Content & New Content Side-by-Side */}
                            {!isFriendRequest && notification.type !== 'friend_request_accepted' && notification.type !== 'friend_request_rejected' && notification.type !== 'chat_message' && (
                                <div className="mt-2 mb-2 grid-cols-1 gap-1.5 md:gap-2 hidden md:grid">
                                    <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-xl relative">
                                        <div className="flex items-center gap-1.5 mb-1 opacity-70">
                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                                                {notification.type === 'comment' ? (currentLang === 'ar' ? 'منشورك' : 'YOUR POST') : (currentLang === 'ar' ? 'تعليقك' : 'YOUR COMMENT')}
                                            </span>
                                        </div>
                                        <p className="text-[11px] md:text-[12px] text-gray-500 dark:text-gray-400 italic line-clamp-2">
                                            "{renderEmojiContent(notification.type === 'comment' ? data.post_content || '' : data.comment_content || '')}"
                                        </p>
                                    </div>
                                    <div className="bg-blue-50/50 dark:bg-blue-500/10 p-2 rounded-xl">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            {notification.type === 'like' ? (
                                                <div className="w-3 h-3 rounded-full overflow-hidden shadow-sm border border-gray-100 dark:border-[#333]">
                                                    <img src={getReactionInfo(data.reaction_type || 'like', currentLang === 'ar').gif} alt="" className="w-full h-full object-cover scale-110" />
                                                </div>
                                            ) : (
                                                <MessageSquare className="w-3 h-3 text-blue-500 fill-current" />
                                            )}
                                            <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 dark:text-blue-400">
                                                {notification.type === 'comment' ? (currentLang === 'ar' ? 'التعليق' : 'THE COMMENT') : (notification.type === 'reply' ? (currentLang === 'ar' ? 'الرد' : 'THE REPLY') : (currentLang === 'ar' ? 'التفاعل' : 'THE REACTION'))}
                                            </span>
                                        </div>
                                        {notification.type !== 'like' && (
                                            <p className="text-[12px] md:text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
                                                {renderEmojiContent(notification.type === 'comment' ? data.comment_content || '' : data.reply_content || '')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Chat Message Special Display */}
                            {notification.type === 'chat_message' && (
                                <div className="text-[12px] md:text-[13px] text-gray-900 dark:text-white line-clamp-2 leading-relaxed font-bold mb-2 p-2 bg-gray-50 dark:bg-[#222] rounded-xl hidden md:block">
                                    {renderEmojiContent(data.message_content || '')}
                                </div>
                            )}

                            {!isFriendRequest && notification.type !== 'friend_request_accepted' && notification.type !== 'friend_request_rejected' && notification.type !== 'chat_message' && (
                                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                                    {data.post_id ? (
                                        <span className="truncate">{currentLang === 'ar' ? 'منشور' : 'Post'}</span>
                                    ) : (
                                        <>
                                            <span className="truncate">{data.anime_title}</span>
                                            <span>•</span>
                                            <span className="flex-shrink-0">الحلقة {data.episode_number}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Episode/Post Thumbnail (Only for interactions and if image exists) */}
                        {!isFriendRequest && 
                         notification.type !== 'friend_request_accepted' && 
                         notification.type !== 'friend_request_rejected' && 
                         (data.episode_image || data.anime_image || data.post_media_url) && (
                            <div className="flex-shrink-0 w-12 h-16 md:w-16 md:h-20 rounded-xl overflow-hidden relative shadow-md">
                                <img
                                    src={getImageUrl(data.episode_image || data.anime_image || data.post_media_url)}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
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
