import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Trash2, MessageSquare, ThumbsUp, X, ChevronLeft, UserPlus, UserCheck, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { Notification } from '@/lib/notifications-api';
import { renderEmojiContent } from '@/utils/render-content';
import api from '@/lib/api';
import { getImageUrl } from '@/utils/image-utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface NotificationDropdownProps {
    onOpenChange?: (open: boolean) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onOpenChange }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteAll
    } = useNotificationsStore();
    const { openMessagingModal } = useMessagingStore();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isRtl = i18n.language === 'ar';
    const lang = i18n.language || 'en';

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Prevent scroll and handle back button when menu is open on mobile
    useEffect(() => {
        if (isOpen && window.innerWidth < 1024) {
            document.body.style.overflow = 'hidden';
            window.history.pushState({ menuOpen: true }, '');
            const handlePopState = () => {
                setIsOpen(false);
            };
            window.addEventListener('popstate', handlePopState);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('popstate', handlePopState);
            };
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.is_read) {
            await markAsRead(notif.id);
        }

        const data = notif.data;
        const currentLang = i18n.language || 'en';

        // 1. Friend Requests
        if (notif.type === 'friend_request' && data.requester_id) {
            navigate(`/${currentLang}/u/${data.requester_id}/profile`);
            setIsOpen(false);
            return;
        }
        if (notif.type === 'friend_request_accepted' && data.accepter_id) {
            navigate(`/${currentLang}/u/${data.accepter_id}/profile`);
            setIsOpen(false);
            return;
        }
        if (notif.type === 'friend_request_rejected' && data.rejecter_id) {
            navigate(`/${currentLang}/u/${data.rejecter_id}/profile`);
            setIsOpen(false);
            return;
        }

        // 2. Chat Messages
        if (notif.type === 'chat_message' && data.sender_id) {
            openMessagingModal({
                id: data.sender_id,
                name: data.sender_name || 'Someone',
                avatar: data.sender_avatar
            });
            setIsOpen(false);
            return;
        }

        // 3. Community Posts (Check this BEFORE episode fallbacks)
        if (data.post_id) {
            let url = `/${currentLang}/community/post/${data.post_id}`;
            if (data.comment_id) {
                url += `?commentId=${data.comment_id}`;
                if (data.parent_id) {
                    url += `&parentId=${data.parent_id}`;
                }
            }
            navigate(url);
            setIsOpen(false);
            return;
        }

        // 4. Watch Page (Anime Episodes)
        if (data.anime_id && data.episode_number !== undefined) {
            let url = `/${currentLang}/watch/${data.anime_id}/${data.episode_number}`;
            if (data.comment_id) {
                url += `?commentId=${data.comment_id}`;
                if (data.parent_id) {
                    url += `&parentId=${data.parent_id}`;
                }
            }
            navigate(url);
            setIsOpen(false);
            return;
        }

        // 5. Fallbacks
        if (data.episode_id) {
            navigate(`/${currentLang}/watch/${data.episode_id}`);
            setIsOpen(false);
            return;
        }
    };

    const handleAccept = async (e: React.MouseEvent, notif: Notification) => {
        e.stopPropagation();
        if (!notif.data.requester_id) return;
        try {
            await api.post(`/friends/accept/${notif.data.requester_id}`);
            await markAsRead(notif.id);
            // Ideally replace this notification with "You accepted X" or just remove actions
            // For now, we rely on store update or just accept UI
        } catch (error) {
            console.error(error);
        }
    };

    const handleReject = async (e: React.MouseEvent, notif: Notification) => {
        e.stopPropagation();
        if (!notif.data.requester_id) return;
        try {
            await api.delete(`/friends/${notif.data.requester_id}`);
            await markAsRead(notif.id);
        } catch (error) {
            console.error(error);
        }
    };

    if (!user) return null;

    const getAvatarUrl = (path?: string) => {
        return getImageUrl(path);
    };

    const getLocale = () => isRtl ? ar : enUS;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <TooltipProvider delayDuration={200}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                const nextState = !isOpen;
                                setIsOpen(nextState);
                                if (nextState && onOpenChange) {
                                    onOpenChange(true);
                                }
                            }}
                            className={cn(
                                "relative p-2.5 transition-all duration-300 rounded-full group",
                                isOpen
                                    ? "bg-gray-100 dark:bg-zinc-800 text-black dark:text-white"
                                    : "text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                            )}
                        >
                            <Bell className="w-6 h-6 stroke-[2.5px]" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-[#1f1f1f] animate-in zoom-in duration-300">
                                    {unreadCount > 99 ? '+99' : unreadCount}
                                </span>
                            )}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                        <p>{isRtl ? 'الإشعارات' : 'Notifications'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed top-[60px] left-0 right-0 bottom-0 z-[100] flex flex-col bg-white dark:bg-[#111] lg:absolute lg:inset-auto lg:top-full lg:mt-2 lg:w-[450px] lg:max-h-[600px] lg:rounded-2xl lg:shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:border lg:border-gray-200 lg:dark:border-white/10 overflow-hidden",
                        isRtl ? "lg:left-0 lg:origin-top-left" : "lg:right-0 lg:origin-top-right"
                    )}
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#333] bg-white dark:bg-[#111] sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {isRtl ? 'الإشعارات' : 'Notifications'}
                            </h3>
                            {unreadCount > 0 && (
                                <span className="bg-black dark:bg-white text-white dark:text-black text-xs font-black px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {notifications.length > 0 && (
                                <>
                                    <button
                                        onClick={() => markAllAsRead()}
                                        className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                                        title={isRtl ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                                    >
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => deleteAll()}
                                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                        title={isRtl ? 'حذف الكل' : 'Clear all'}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111]">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={cn(
                                            "group relative flex gap-4 px-5 py-2.5 cursor-pointer transition-all duration-200",
                                            !notif.is_read
                                                ? "bg-blue-50/10 dark:bg-[#1a1a1a]"
                                                : "bg-transparent hover:bg-gray-50 dark:hover:bg-[#1a1a1a]"
                                        )}
                                    >
                                        {!notif.is_read && (
                                            <div className="absolute inset-y-0 right-0 w-1 bg-black dark:bg-white" />
                                        )}
                                        {/* Left Side: Avatar or Episode Image */}
                                        <div className="flex-shrink-0 relative">
                                            {notif.type === 'friend_request' || notif.type === 'friend_request_accepted' || notif.type === 'friend_request_rejected' ? (
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-[#333]">
                                                    <img
                                                        src={getAvatarUrl(notif.data.requester_avatar || notif.data.accepter_avatar || notif.data.rejecter_avatar)}
                                                        alt={notif.data.requester_name || notif.data.accepter_name || notif.data.rejecter_name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                    <div className="hidden w-full h-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                                        {(notif.data.requester_name || notif.data.accepter_name || notif.data.rejecter_name)?.[0]}
                                                    </div>
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 p-1 rounded-full shadow border-2 border-white dark:border-[#111]",
                                                        notif.type === 'friend_request' && "bg-black dark:bg-white",
                                                        notif.type === 'friend_request_accepted' && "bg-green-500",
                                                        notif.type === 'friend_request_rejected' && "bg-red-500"
                                                    )}>
                                                        {notif.type === 'friend_request' && <UserPlus className="w-3 h-3 text-white" />}
                                                        {notif.type === 'friend_request_accepted' && <UserCheck className="w-3 h-3 text-white" />}
                                                        {notif.type === 'friend_request_rejected' && <UserX className="w-3 h-3 text-white" />}
                                                    </div>
                                                </div>
                                            ) : (notif.type === 'reply' || notif.type === 'like' || notif.type === 'comment') && 
                                               (notif.data.episode_image || notif.data.anime_image || notif.data.post_media_url) ? (
                                                <div className="relative w-16 h-20 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-white/10 rounded-xl">
                                                    <img
                                                        src={getImageUrl(notif.data.episode_image || notif.data.anime_image || notif.data.post_media_url)}
                                                        alt="Episode"
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <div className="absolute bottom-1 right-1">
                                                        {notif.type === 'reply' || notif.type === 'comment' ? (
                                                            <div className="bg-blue-500 p-1 rounded-full shadow-lg">
                                                                  <MessageSquare className="w-3 h-3 text-white fill-current" />
                                                            </div>
                                                        ) : (notif.type === 'like') ? (
                                                            <div className="w-[18px] h-[18px] rounded-full overflow-hidden shadow-lg border border-white dark:border-[#2a2a2a]">
                                                                <img src={getReactionInfo(notif.data.reaction_type || 'like', isRtl).gif} alt="" className="w-full h-full object-cover scale-110" />
                                                            </div>
                                                        ) : (
                                                            <div className="bg-red-500 p-1 rounded-full shadow-lg">
                                                                <ThumbsUp className="w-3 h-3 text-white fill-current" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (notif.type === 'reply' || notif.type === 'like' || notif.type === 'comment' || notif.type === 'chat_message') ? (
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-[#333] transition-transform duration-300 group-hover:scale-105 shadow-sm">
                                                    <img
                                                        src={getAvatarUrl(notif.data.actor_avatar || notif.data.sender_avatar || notif.data.requester_avatar || notif.data.accepter_avatar || notif.data.rejecter_avatar)}
                                                        alt={notif.data.actor_name || notif.data.sender_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className={cn(
                                                        "absolute -bottom-1 -right-1 p-1 rounded-full shadow border-2 border-white dark:border-[#111]",
                                                        (notif.type === 'reply' || notif.type === 'comment' || notif.type === 'chat_message') ? "bg-blue-500" : (notif.type === 'like' ? "" : "bg-red-500"),
                                                        (notif.type === 'like') && "p-0 border-none shadow-none bg-transparent"
                                                    )}>
                                                        {(notif.type === 'reply' || notif.type === 'comment' || notif.type === 'chat_message') ? (
                                                            <MessageSquare className="w-3 h-3 text-white fill-current" />
                                                        ) : (notif.type === 'like') ? (
                                                            <div className="w-[18px] h-[18px] rounded-full overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-sm border border-gray-100 dark:border-[#333]">
                                                                <img src={getReactionInfo(notif.data.reaction_type || 'like', isRtl).gif} alt="" className="w-full h-full object-cover scale-110" />
                                                            </div>
                                                        ) : (
                                                            <ThumbsUp className="w-3 h-3 text-white fill-current" />
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5">
                                                    <Bell className="w-6 h-6 text-gray-400" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Side: Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                                                    {(notif.type === 'friend_request') ? (isRtl ? 'طلب صداقة' : 'FRIEND REQUEST') :
                                                        (notif.type === 'friend_request_accepted') ? (isRtl ? 'تم قبول الطلب' : 'REQUEST ACCEPTED') :
                                                            (notif.type === 'friend_request_rejected') ? (isRtl ? 'تم رفض الطلب' : 'REQUEST REJECTED') :
                                                                (notif.type === 'chat_message') ? (isRtl ? 'رسالة جديدة' : 'NEW MESSAGE') :
                                                                    (notif.data.anime_title || 'ANIME')}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: getLocale() })}
                                                </span>
                                            </div>

                                            <h4 className="text-base font-medium text-gray-800 dark:text-gray-100 leading-tight mb-1 line-clamp-2 transition-colors group-hover:text-black dark:group-hover:text-white">
                                                {notif.type === 'friend_request' && (
                                                    isRtl ? `أرسل ${notif.data.requester_name} طلب صداقة` : `${notif.data.requester_name} sent you a friend request`
                                                )}
                                                {notif.type === 'friend_request_accepted' && (
                                                    isRtl ? `قبل ${notif.data.accepter_name} طلب صداقتك` : `${notif.data.accepter_name} accepted your friend request`
                                                )}
                                                {notif.type === 'friend_request_rejected' && (
                                                    isRtl ? `رفض ${notif.data.rejecter_name} طلب صداقتك` : `${notif.data.rejecter_name} rejected your friend request`
                                                )}
                                                {notif.type === 'reply' && (
                                                    isRtl 
                                                        ? (notif.data.is_reply_to_reply ? `رد ${notif.data.actor_name} على ردك` : `رد ${notif.data.actor_name} على تعليقك`)
                                                        : (notif.data.is_reply_to_reply ? `${notif.data.actor_name} replied to your reply` : `${notif.data.actor_name} replied to your comment`)
                                                )}
                                                {notif.type === 'comment' && (
                                                    isRtl ? `علق ${notif.data.actor_name} على منشورك` : `${notif.data.actor_name} commented on your post`
                                                )}
                                                {notif.type === 'like' && (
                                                    isRtl 
                                                        ? `تفاعل ${notif.data.actor_name} بـ ${getReactionInfo(notif.data.reaction_type || 'like', isRtl).labelAr} على تعليقك` 
                                                        : `${notif.data.actor_name} reacted with ${getReactionInfo(notif.data.reaction_type || 'like', isRtl).labelEn} to your comment`
                                                )}
                                                {notif.type === 'chat_message' && (
                                                    isRtl
                                                        ? `${notif.data.sender_name || 'شخص ما'} أرسل لك رسالة`
                                                        : `New message from ${notif.data.sender_name || 'Someone'}`
                                                )}
                                                {notif.type === 'system' && (isRtl ? 'إشعار من النظام' : 'System Notification')}
                                            </h4>

                                            {/* Action Buttons for Friend Request */}
                                            {notif.type === 'friend_request' && !notif.is_read && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        onClick={(e) => handleAccept(e, notif)}
                                                        className="px-4 py-1.5 bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold rounded transition-colors"
                                                    >
                                                        {isRtl ? 'تأكيد' : 'Confirm'}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleReject(e, notif)}
                                                        className="px-4 py-1.5 bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-gray-800 dark:text-gray-200 text-xs font-bold rounded transition-colors"
                                                    >
                                                        {isRtl ? 'حذف' : 'Delete'}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Chat Message Content Preview */}
                                            {notif.type === 'chat_message' && notif.data.message_content && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 border-r-2 border-gray-200 dark:border-white/10 pr-3 mr-1">
                                                    {renderEmojiContent(notif.data.message_content)}
                                                </p>
                                            )}

                                            {/* Rich content for Reply & Comment */}
                                            {(notif.type === 'reply' || notif.type === 'comment') && (
                                                <div className="space-y-3">
                                                    {/* The Side-by-side comparison */}
                                                    <div className="grid grid-cols-1 gap-2 border-r-2 border-gray-100 dark:border-[#333] pr-3 mr-1">
                                                        <div className="bg-white dark:bg-[#222] p-3 rounded-xl relative border border-gray-100 dark:border-white/5 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-black text-gray-500 dark:text-gray-400 capitalize">
                                                                    {notif.type === 'comment' 
                                                                        ? (isRtl ? 'محتوى منشورك' : 'Your post') 
                                                                        : (notif.data.is_reply_to_reply 
                                                                            ? (isRtl ? 'محتوى ردك' : `Your reply to ${notif.data.parent_target_name || '...'}`) 
                                                                            : (isRtl ? 'محتوى تعليقك' : 'Your comment'))
                                                                    }
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 leading-relaxed">
                                                                "{renderEmojiContent(notif.type === 'comment' ? (notif.data.post_content || '') : (notif.data.comment_content || ''))}"
                                                            </p>
                                                        </div>
                                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl mt-1">
                                                            <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
                                                                <MessageSquare className="w-3 h-3 fill-current" />
                                                                <span className="text-xs font-black capitalize">
                                                                    {notif.type === 'comment' 
                                                                        ? (isRtl ? `قام ${notif.data.actor_name} بالتعليق بـ` : `${notif.data.actor_name} commented with`) 
                                                                        : (isRtl ? `وقام ${notif.data.actor_name} بالرد عليك بـ` : `And ${notif.data.actor_name} replied to you with`)}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-3 leading-relaxed">
                                                                {renderEmojiContent(notif.type === 'comment' ? (notif.data.comment_content || '') : (notif.data.reply_content || ''))}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Episode/Post Info */}
                                                    <div className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400">
                                                        <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                                                            {notif.data.post_id
                                                                ? (isRtl ? 'منشور' : 'POST')
                                                                : (isRtl ? 'الحلقة' : 'EPISODE') + ' ' + notif.data.episode_number}
                                                        </span>
                                                        <ChevronLeft className={cn("w-4 h-4", !isRtl && "rotate-180")} />
                                                        <span className="hover:text-black dark:hover:text-white transition-colors">
                                                            {notif.data.post_id
                                                                ? (isRtl ? 'عرض المنشور' : 'VIEW POST')
                                                                : (isRtl ? 'مشاهدة الآن' : 'WATCH NOW')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Content for Simple notifications */}
                                            {notif.type !== 'reply' && notif.type !== 'comment' && notif.type !== 'friend_request' && notif.type !== 'friend_request_accepted' && notif.type !== 'friend_request_rejected' && notif.data.comment_content && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 border-r-2 border-gray-200 dark:border-white/10 pr-3 mr-1">
                                                    "{renderEmojiContent(notif.data.comment_content || '')}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                                    <Bell className="w-10 h-10 text-gray-300" />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">
                                    {isRtl ? 'لا توجد إشعارات' : 'No Notifications'}
                                </h4>
                                <p className="text-gray-500 text-sm max-w-[200px]">
                                    {isRtl ? 'ستظهر تنبيهاتك هنا عندما تتفاعل مع المحتوى' : 'Your alerts will appear here when you interact with content'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1a1a] sticky bottom-0">
                            <button
                                onClick={() => {
                                    navigate(`/${lang}/u/${user?.id}/dashboard/notifications`);
                                    setIsOpen(false);
                                }}
                                className="w-full bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300"
                            >
                                {isRtl ? 'عرض كل الإشعارات' : 'View All Notifications'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

