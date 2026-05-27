import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, MessageCircle, Heart, Inbox, PlayCircle, User, Trash2, UserPlus, UserCheck, UserX, MessageSquare, ThumbsUp, X, ChevronLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { renderEmojiContent } from '@/utils/render-content';
import { Notification } from '@/lib/notifications-api';
import api from '@/lib/api';
import { getImageUrl } from '@/utils/image-utils';
import { getReactionInfo } from '@/components/notifications/NotificationDropdown';
import { useMessagingStore } from '@/stores/messaging-store';
import { slugify } from '@/utils/slug';
import CentralSpinner from '@/components/ui/CentralSpinner';
import BrowseSidebar from '@/components/sidebar/BrowseSidebar';
import { NewsTicker } from '@/components/common/NewsTicker';
import Footer from '@/components/common/Footer';

const getAvatarUrl = (avatar: string | null | undefined) => {
    return getImageUrl(avatar);
};

const getMediaImageUrl = (image: string | null | undefined) => {
    if (!image) return undefined;
    if (image.startsWith('http')) return image;

    const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');

    return `${baseUrl}${image.startsWith('/uploads') ? image : `/uploads/animes/${image}`}`;
};

const formatActorName = (name: string | null | undefined) => {
    if (!name) return 'User';
    return name.includes('@') ? name.split('@')[0] : name;
};

interface NotificationItemProps {
    notification: Notification;
    isRtl: boolean;
    onClick: () => void;
    isSelected: boolean;
    onSelect: (id: number) => void;
    selectionMode: boolean;
}

function NotificationItem({ notification, isRtl, onClick, isSelected, onSelect, selectionMode }: NotificationItemProps) {
    const data = (notification.data || {}) as any;
    const notif = notification;
    const getLocale = () => isRtl ? ar : enUS;

    const handleAction = async (e: React.MouseEvent, action: 'accept' | 'reject') => {
        e.stopPropagation();
        const requesterId = data.requester_id;
        if (!requesterId) return;
        try {
            if (action === 'accept') {
                await api.post(`/friends/accept/${requesterId}`);
            } else {
                await api.delete(`/friends/${requesterId}`);
            }
        } catch (error) {
            console.error(`Failed to ${action} friend request:`, error);
        }
    };

    return (
        <div
            onClick={() => selectionMode ? onSelect(notification.id) : onClick()}
            className={cn(
                "group relative flex gap-4 p-5 cursor-pointer transition-all duration-200 border-b border-gray-100 dark:border-white/5 rounded-xl shadow-sm mb-2",
                !notif.is_read
                    ? "bg-blue-50/10 dark:bg-[#1a1a1a]"
                    : "bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 dark:hover:bg-[#111]",
                isSelected ? "ring-2 ring-black dark:ring-white" : ""
            )}
        >
            {selectionMode && (
                <div className="flex-shrink-0 pt-3">
                    <div className={cn("w-5 h-5 border-2 flex items-center justify-center transition-colors rounded-md", isSelected ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-gray-300 dark:border-gray-700')}>
                        {isSelected && <Check className={cn("w-4 h-4", isSelected ? 'text-white dark:text-black' : 'text-white')} />}
                    </div>
                </div>
            )}

            {!notif.is_read && !selectionMode && (
                <div className="absolute inset-y-0 right-0 w-1.5 bg-black dark:bg-white rounded-r-xl" />
            )}

            {/* Left Side: Avatar or Episode Image */}
            <div className="flex-shrink-0 relative">
                {notif.type === 'friend_request' || notif.type === 'friend_request_accepted' || notif.type === 'friend_request_rejected' ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-gray-100 dark:border-[#333]">
                        <img
                            src={getAvatarUrl(data.requester_avatar || data.accepter_avatar || data.rejecter_avatar)}
                            alt={data.requester_name || data.accepter_name || data.rejecter_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        <div className="hidden w-full h-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                            {(data.requester_name || data.accepter_name || data.rejecter_name)?.[0]}
                        </div>
                        <div className={cn(
                            "absolute -bottom-1 -right-1 p-1 rounded-full shadow border-2 border-white dark:border-[#111]",
                            notif.type === 'friend_request' && "bg-black dark:bg-white",
                            notif.type === 'friend_request_accepted' && "bg-green-500",
                            notif.type === 'friend_request_rejected' && "bg-red-500"
                        )}>
                            {notif.type === 'friend_request' && <UserPlus className="w-4 h-4 text-white" />}
                            {notif.type === 'friend_request_accepted' && <UserCheck className="w-4 h-4 text-white" />}
                            {notif.type === 'friend_request_rejected' && <UserX className="w-4 h-4 text-white" />}
                        </div>
                    </div>
                ) : (notif.type === 'reply' || notif.type === 'like' || notif.type === 'comment') &&
                    (data.episode_image || data.anime_image || data.post_media_url) ? (
                    <div className="relative w-20 h-24 overflow-hidden shadow-md border border-gray-100 dark:border-white/10 rounded-xl">
                        <img
                            src={getImageUrl(data.episode_image || data.anime_image || data.post_media_url)}
                            alt="Episode"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-1.5 right-1.5">
                            {notif.type === 'reply' || notif.type === 'comment' ? (
                                <div className="bg-blue-500 p-1.5 rounded-full shadow-lg">
                                    <MessageSquare className="w-3.5 h-3.5 text-white fill-current" />
                                </div>
                            ) : (notif.type === 'like') ? (
                                <div className="w-6 h-6 rounded-full overflow-hidden shadow-lg border border-white dark:border-[#2a2a2a]">
                                    <img src={getReactionInfo(data.reaction_type || 'like', isRtl).gif} alt="" className="w-full h-full object-cover scale-110" />
                                </div>
                            ) : (
                                <div className="bg-red-500 p-1.5 rounded-full shadow-lg">
                                    <ThumbsUp className="w-3.5 h-3.5 text-white fill-current" />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (notif.type === 'reply' || notif.type === 'like' || notif.type === 'comment' || notif.type === 'chat_message') ? (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-gray-100 dark:border-[#333] transition-transform duration-300 group-hover:scale-105 shadow-sm">
                        <img
                            src={getAvatarUrl(data.actor_avatar || data.sender_avatar || data.requester_avatar || data.accepter_avatar || data.rejecter_avatar)}
                            alt={data.actor_name || data.sender_name}
                            className="w-full h-full object-cover"
                        />
                        <div className={cn(
                            "absolute -bottom-1 -right-1 p-1 rounded-full shadow border-2 border-white dark:border-[#111]",
                            (notif.type === 'reply' || notif.type === 'comment' || notif.type === 'chat_message') ? "bg-blue-500" : (notif.type === 'like' ? "" : "bg-red-500"),
                            (notif.type === 'like') && "p-0 border-none shadow-none bg-transparent"
                        )}>
                            {(notif.type === 'reply' || notif.type === 'comment' || notif.type === 'chat_message') ? (
                                <MessageSquare className="w-3.5 h-3.5 text-white fill-current" />
                            ) : (notif.type === 'like') ? (
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-sm border border-gray-100 dark:border-[#333]">
                                    <img src={getReactionInfo(data.reaction_type || 'like', isRtl).gif} alt="" className="w-full h-full object-cover scale-110" />
                                </div>
                            ) : (
                                <ThumbsUp className="w-3.5 h-3.5 text-white fill-current" />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-14 h-14 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/5">
                        <Bell className="w-6 h-6 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Right Side: Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-1.5">
                    <span className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                        {(notif.type === 'friend_request') ? (isRtl ? 'طلب صداقة' : 'FRIEND REQUEST') :
                            (notif.type === 'friend_request_accepted') ? (isRtl ? 'تم قبول الطلب' : 'REQUEST ACCEPTED') :
                                (notif.type === 'friend_request_rejected') ? (isRtl ? 'تم رفض الطلب' : 'REQUEST REJECTED') :
                                    (notif.type === 'chat_message') ? (isRtl ? 'رسالة جديدة' : 'NEW MESSAGE') :
                                        (data.anime_title || 'ANIME')}
                    </span>
                    <span className="text-xs text-gray-400 font-medium shrink-0">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: getLocale() })}
                    </span>
                </div>

                <h4 className="text-lg font-medium text-gray-800 dark:text-gray-100 leading-tight mb-2 line-clamp-2 transition-colors group-hover:text-black dark:group-hover:text-white">
                    {notif.type === 'friend_request' && (
                        isRtl ? `أرسل ${data.requester_name} طلب صداقة` : `${data.requester_name} sent you a friend request`
                    )}
                    {notif.type === 'friend_request_accepted' && (
                        isRtl ? `قبل ${data.accepter_name} طلب صداقتك` : `${data.accepter_name} accepted your friend request`
                    )}
                    {notif.type === 'friend_request_rejected' && (
                        isRtl ? `رفض ${data.rejecter_name} طلب صداقتك` : `${data.rejecter_name} rejected your friend request`
                    )}
                    {notif.type === 'reply' && (
                        isRtl
                            ? (data.is_reply_to_reply ? `رد ${data.actor_name} على ردك` : `رد ${data.actor_name} على تعليقك`)
                            : (data.is_reply_to_reply ? `${data.actor_name} replied to your reply` : `${data.actor_name} replied to your comment`)
                    )}
                    {notif.type === 'comment' && (
                        isRtl ? `علق ${data.actor_name} على منشورك` : `${data.actor_name} commented on your post`
                    )}
                    {notif.type === 'like' && (
                        isRtl
                            ? `تفاعل ${data.actor_name} بـ ${getReactionInfo(data.reaction_type || 'like', isRtl).labelAr} على تعليقك`
                            : `${data.actor_name} reacted with ${getReactionInfo(data.reaction_type || 'like', isRtl).labelEn} to your comment`
                    )}
                    {notif.type === 'chat_message' && (
                        isRtl
                            ? `${data.sender_name || 'شخص ما'} أرسل لك رسالة`
                            : `New message from ${data.sender_name || 'Someone'}`
                    )}
                    {notif.type === 'system' && (isRtl ? 'إشعار من النظام' : 'System Notification')}
                </h4>

                {/* Action Buttons for Friend Request */}
                {notif.type === 'friend_request' && !notif.is_read && (
                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={(e) => handleAction(e, 'accept')}
                            className="px-6 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white text-sm font-bold rounded-xl transition-colors"
                        >
                            {isRtl ? 'تأكيد' : 'Confirm'}
                        </button>
                        <button
                            onClick={(e) => handleAction(e, 'reject')}
                            className="px-6 py-2 bg-gray-200 dark:bg-[#3a3b3c] hover:bg-gray-300 dark:hover:bg-[#4e4f50] text-gray-800 dark:text-gray-200 text-sm font-bold rounded-xl transition-colors"
                        >
                            {isRtl ? 'حذف' : 'Delete'}
                        </button>
                    </div>
                )}

                {/* Chat Message Content Preview */}
                {notif.type === 'chat_message' && data.message_content && (
                    <p className="text-base text-gray-500 dark:text-gray-400 italic line-clamp-2 border-r-2 border-gray-200 dark:border-white/10 pr-3 mr-1 mt-1">
                        {renderEmojiContent(data.message_content)}
                    </p>
                )}

                {/* Rich content for Reply & Comment */}
                {(notif.type === 'reply' || notif.type === 'comment') && (
                    <div className="space-y-3 mt-1">
                        <div className="grid grid-cols-1 gap-3 border-r-2 border-gray-100 dark:border-[#333] pr-4 mr-1">
                            <div className="bg-white dark:bg-[#222] p-4 rounded-xl relative border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-black text-gray-500 dark:text-gray-400 capitalize">
                                        {notif.type === 'comment'
                                            ? (isRtl ? 'محتوى منشورك' : 'Your post')
                                            : (data.is_reply_to_reply
                                                ? (isRtl ? 'محتوى ردك' : `Your reply to ${data.parent_target_name || '...'}`)
                                                : (isRtl ? 'محتوى تعليقك' : 'Your comment'))
                                        }
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 leading-relaxed">
                                    "{renderEmojiContent(notif.type === 'comment' ? (data.post_content || '') : (data.comment_content || ''))}"
                                </p>
                            </div>
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl mt-1">
                                <div className="flex items-center gap-2 mb-1.5 text-blue-600 dark:text-blue-400">
                                    <MessageSquare className="w-4 h-4 fill-current" />
                                    <span className="text-xs font-black capitalize">
                                        {notif.type === 'comment'
                                            ? (isRtl ? `قام ${data.actor_name} بالتعليق بـ` : `${data.actor_name} commented with`)
                                            : (isRtl ? `وقام ${data.actor_name} بالرد عليك بـ` : `And ${data.actor_name} replied to you with`)}
                                    </span>
                                </div>
                                <p className="text-base font-bold text-gray-900 dark:text-white line-clamp-3 leading-relaxed">
                                    {renderEmojiContent(notif.type === 'comment' ? (data.comment_content || '') : (data.reply_content || ''))}
                                </p>
                            </div>
                        </div>

                        {/* Episode/Post Info */}
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 dark:text-gray-400 pt-2">
                            <span className="bg-gray-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md uppercase">
                                {data.post_id
                                    ? (isRtl ? 'منشور' : 'POST')
                                    : (isRtl ? 'الحلقة' : 'EPISODE') + ' ' + data.episode_number}
                            </span>
                            <ChevronLeft className={cn("w-4 h-4", !isRtl && "rotate-180")} />
                            <span className="hover:text-black dark:hover:text-white transition-colors cursor-pointer">
                                {data.post_id
                                    ? (isRtl ? 'عرض المنشور' : 'VIEW POST')
                                    : (isRtl ? 'مشاهدة الآن' : 'WATCH NOW')}
                            </span>
                        </div>
                    </div>
                )}

                {/* Content for Simple notifications */}
                {notif.type !== 'reply' && notif.type !== 'comment' && notif.type !== 'friend_request' && notif.type !== 'friend_request_accepted' && notif.type !== 'friend_request_rejected' && data.comment_content && (
                    <p className="text-base text-gray-500 dark:text-gray-400 italic line-clamp-2 border-r-2 border-gray-200 dark:border-white/10 pr-3 mr-1 mt-2">
                        "{renderEmojiContent(data.comment_content || '')}"
                    </p>
                )}
            </div>
        </div>
    );
}

export default function NotificationsBrowsePage() {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const navigate = useNavigate();
    const location = useLocation();
    const {
        notifications,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteAll,
        deleteSelected
    } = useNotificationsStore();

    const isDashboard = location.pathname.includes('/dashboard');
    const { user } = useAuthStore();
    const { openMessagingModal } = useMessagingStore();

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        const data = notification.data;
        const currentLang = i18n.language || 'en';

        // 1. Friend Requests
        if (notification.type === 'friend_request' && data.requester_id) {
            navigate(`/${currentLang}/u/${data.requester_id}/profile`);
            return;
        }
        if (notification.type === 'friend_request_accepted' && data.accepter_id) {
            navigate(`/${currentLang}/u/${data.accepter_id}/profile`);
            return;
        }
        if (notification.type === 'friend_request_rejected' && data.rejecter_id) {
            navigate(`/${currentLang}/u/${data.rejecter_id}/profile`);
            return;
        }

        // 2. Chat Messages
        if (notification.type === 'chat_message' && data.sender_id) {
            if (window.innerWidth < 1024) {
                navigate(`/${currentLang}/u/${user?.id}/dashboard/messages?userId=${data.sender_id}`);
                return;
            }
            openMessagingModal({
                id: data.sender_id,
                name: data.sender_name || 'Someone',
                avatar: data.sender_avatar
            });
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
            return;
        }

        // 4.5 Anime Details Page (Series Comments)
        if (data.anime_id && data.episode_number === undefined) {
            let url = `/${currentLang}/animes/${data.anime_id}/${slugify(data.anime_title || 'anime')}`;
            const params = new URLSearchParams();
            if (data.comment_id) params.set('commentId', String(data.comment_id));
            if (data.parent_id) params.set('parentId', String(data.parent_id));
            params.set('tab', 'comments');
            
            url += `?${params.toString()}`;
            navigate(url);
            return;
        }

        // 5. Fallbacks
        if (data.episode_id) {
            navigate(`/${currentLang}/watch/${data.episode_id}`);
            return;
        }
    };

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-300">
            <Helmet>
                <title>{isRtl ? 'الإشعارات' : 'Notifications'} - AnimeLast</title>
            </Helmet>

            <div className="w-full">
                {!isDashboard && <NewsTicker />}

                <div className="flex flex-col lg:flex-row min-h-screen">
                    {/* Sidebar */}
                    {!isDashboard && (
                        <div className="hidden lg:block w-80 border-r border-gray-200 dark:border-[#2a2a2a] lg:order-1 flex-shrink-0 bg-white dark:bg-[#0a0a0a]">
                            <div className="sticky top-[100px] h-[calc(100vh-100px)] overflow-hidden">
                                <BrowseSidebar />
                            </div>
                        </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 px-4 sm:px-6 md:px-8 py-8 lg:order-2">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <Bell className="w-8 h-8 text-black dark:text-white" />
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                        {isRtl ? 'التنبيهات' : 'Notifications'}
                                    </h1>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {isRtl ? `لديك ${notifications.length} إشعار في المجموع` : `You have ${notifications.length} notifications in total`}
                                </p>
                            </div>

                            {notifications.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={markAllAsRead}
                                        className="px-6 py-2.5 bg-white dark:bg-[#111] hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a] text-sm font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#333] rounded-none transition-all shadow-sm active:scale-95"
                                    >
                                        {isRtl ? 'تعليم الكل كمقروء' : 'Mark all as read'}
                                    </button>
                                    <button
                                        onClick={deleteAll}
                                        className="px-6 py-2.5 bg-white dark:bg-[#111] hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a] text-sm font-bold text-black dark:text-white border border-gray-200 dark:border-[#333] rounded-none transition-all shadow-sm active:scale-95"
                                    >
                                        {isRtl ? 'حذف الكل' : 'Clear All'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <CentralSpinner />
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-200 dark:border-[#222]">
                                <Inbox className="w-12 h-12 text-gray-300 mb-4" />
                                <h3 className="text-xl font-bold">{isRtl ? 'بريدك نظيف!' : 'Inbox is clean!'}</h3>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        isRtl={isRtl}
                                        onClick={() => handleNotificationClick(notification)}
                                        isSelected={selectedIds.includes(notification.id)}
                                        onSelect={toggleSelect}
                                        selectionMode={selectionMode}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {!isDashboard && <Footer />}
            </div>
        </div>
    );
}
