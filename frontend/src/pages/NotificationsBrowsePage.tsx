import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, Check, MessageCircle, Heart, Inbox, PlayCircle, User, Trash2, UserPlus, UserCheck, UserX, MessageSquare, ThumbsUp, X, ChevronLeft } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useAuthStore } from '@/stores/auth-store';
import { renderEmojiContent } from '@/utils/render-content';
import { Notification } from '@/lib/notifications-api';
import api from '@/lib/api';
import CrunchyrollSkeleton from '@/components/skeleton/CrunchyrollSkeleton';
import BrowseSidebar from '@/components/sidebar/BrowseSidebar';
import { NewsTicker } from '@/components/common/NewsTicker';
import Footer from '@/components/common/Footer';

const getAvatarUrl = (avatar: string | null | undefined) => {
    if (!avatar) return undefined;
    if (avatar.startsWith('http')) return avatar;
    return avatar.startsWith('/') ? avatar : `/${avatar}`;
};

const getMediaImageUrl = (image: string | null | undefined) => {
    if (!image) return undefined;
    if (image.startsWith('http')) return image;
    return `http://localhost:8080${image.startsWith('/uploads') ? image : `/uploads/animes/${image}`}`;
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

    const getNotificationTypeInfo = () => {
        switch (notification.type) {
            case 'like':
                return {
                    icon: <Heart className="w-3.5 h-3.5 text-black dark:text-white fill-current" />,
                    iconBg: 'bg-gray-100 dark:bg-white/10',
                    actionText: isRtl ? 'أعجب بتعليقك' : 'liked your comment',
                };
            case 'reply':
                return {
                    icon: <MessageCircle className="w-3.5 h-3.5 text-black dark:text-white fill-current" />,
                    iconBg: 'bg-gray-100 dark:bg-white/10',
                    actionText: isRtl ? 'رد على تعليقك' : 'replied to your comment',
                };
            case 'friend_request':
                return {
                    icon: <UserPlus className="w-3.5 h-3.5 text-black dark:text-white" />,
                    iconBg: 'bg-black dark:bg-white',
                    actionText: isRtl ? 'أرسل لك طلب صداقة' : 'sent you a friend request',
                };
            case 'friend_request_accepted':
                return {
                    icon: <UserCheck className="w-3.5 h-3.5 text-white" />,
                    iconBg: 'bg-green-500',
                    actionText: isRtl ? 'قبل طلب صداقتك' : 'accepted your friend request',
                };
            case 'friend_request_rejected':
                return {
                    icon: <UserX className="w-3.5 h-3.5 text-white" />,
                    iconBg: 'bg-red-500',
                    actionText: isRtl ? 'رفض طلب صداقتك' : 'rejected your friend request',
                };
            case 'chat_message':
                return {
                    icon: <MessageCircle className="w-3.5 h-3.5 text-white fill-current" />,
                    iconBg: 'bg-blue-500',
                    actionText: isRtl ? 'أرسل لك رسالة' : 'sent you a message',
                };
            default:
                return {
                    icon: <Bell className="w-3.5 h-3.5 text-black dark:text-white" />,
                    iconBg: 'bg-gray-100 dark:bg-white/10',
                    actionText: isRtl ? 'أرسل تنبيهاً' : 'sent a notification',
                };
        }
    };

    const typeInfo = getNotificationTypeInfo();
    const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
        locale: isRtl ? ar : enUS,
    });

    const actorName = formatActorName(data.actor_name || data.requester_name || data.accepter_name || data.rejecter_name || data.sender_name);
    const mediaImage = data.episode_image || data.anime_image;

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
            className={`group flex items-start gap-4 p-5 transition-all cursor-pointer relative ${notification.is_read ? 'bg-white dark:bg-[#0a0a0a]' : 'bg-gray-50/40 dark:bg-white/5 border-s-4 border-black dark:border-white'} border-b border-gray-100 dark:border-[#111] hover:bg-gray-50 dark:hover:bg-[#111] ${isSelected ? 'ring-2 ring-black dark:ring-white bg-gray-50/20 dark:bg-white/10' : ''}`}
        >
            {selectionMode && (
                <div className="flex-shrink-0 pt-3">
                    <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-gray-300 dark:border-gray-700'}`}>
                        {isSelected && <Check className={`w-4 h-4 ${isSelected ? 'text-white dark:text-black' : 'text-white'}`} />}
                    </div>
                </div>
            )}

            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-[#1a1a1a] shadow-sm bg-gray-100 dark:bg-[#222]">
                    {(data.actor_avatar || data.requester_avatar || data.accepter_avatar || data.rejecter_avatar || data.sender_avatar) ? (
                        <img src={getAvatarUrl(data.actor_avatar || data.requester_avatar || data.accepter_avatar || data.rejecter_avatar || data.sender_avatar)} alt={actorName} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-600 text-white font-bold text-xl">
                            {actorName?.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div className={`absolute -bottom-1 -right-1 ${typeInfo.iconBg} p-1 rounded-full border-2 border-white dark:border-[#1a1a1a] shadow-sm`}>
                    {typeInfo.icon}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                        <span className="font-bold hover:text-black dark:hover:text-white transition-colors">{actorName}</span>
                        {' '}
                        <span className="text-gray-500 dark:text-gray-400">{typeInfo.actionText}</span>
                    </p>

                    {(data.comment_content || data.reply_content || data.message_content) && (
                        <div className="mt-2 space-y-3">
                            {notification.type === 'reply' ? (
                                <div className="grid grid-cols-1 gap-2 border-s-2 border-gray-200 dark:border-white/10 pl-3">
                                    <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-none relative">
                                        <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-gray-400 uppercase">
                                            {isRtl ? 'تعليقك' : 'YOUR COMMENT'}
                                        </div>
                                        <p className="text-xs text-gray-500 italic line-clamp-2">
                                            "{renderEmojiContent(data.comment_content || '')}"
                                        </p>
                                    </div>
                                    <div className="bg-black/5 dark:bg-white/10 p-3 rounded-none">
                                        <div className="flex items-center gap-2 mb-1 text-black dark:text-white">
                                            <MessageCircle className="w-3 h-3 fill-current" />
                                            <span className="text-[10px] font-black uppercase">{isRtl ? 'الرد' : 'THE REPLY'}</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-3">
                                            {renderEmojiContent(data.reply_content || '')}
                                        </p>
                                    </div>
                                </div>
                            ) : notification.type === 'chat_message' ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 border-s-2 border-gray-200 dark:border-white/10 pl-3">
                                    {renderEmojiContent(data.message_content)}
                                </p>
                            ) : (data.comment_content) ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 italic line-clamp-2 border-s-2 border-gray-200 dark:border-white/10 pl-3">
                                    "{renderEmojiContent(data.comment_content)}"
                                </p>
                            ) : null}
                        </div>
                    )}

                    {notification.type === 'friend_request' && !notification.is_read && (
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={(e) => handleAction(e, 'accept')}
                                className="px-4 py-1.5 bg-black dark:bg-white text-white dark:text-black text-xs font-black uppercase rounded-none transition-colors hover:bg-neutral-800 dark:hover:bg-neutral-200"
                            >
                                {isRtl ? 'تأكيد' : 'Confirm'}
                            </button>
                            <button
                                onClick={(e) => handleAction(e, 'reject')}
                                className="px-4 py-1.5 bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white text-xs font-bold rounded-none transition-colors border border-gray-200 dark:border-white/10"
                            >
                                {isRtl ? 'حذف' : 'Delete'}
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className="text-gray-400 dark:text-gray-500">{timeAgo}</span>
                        <div className="w-1 h-1 rounded-none bg-gray-300 dark:bg-gray-700" />
                        <span className="text-black dark:text-white font-bold uppercase tracking-wider">
                            {notification.type}
                        </span>
                    </div>
                </div>
            </div>

            {data.anime_title && (
                <div className="hidden sm:flex flex-col items-center gap-2 w-24 flex-shrink-0">
                    <div className="relative w-full aspect-video rounded-none overflow-hidden border border-gray-200 dark:border-[#333] shadow-sm bg-gray-100 dark:bg-[#111]">
                        {mediaImage ? (
                            <img src={getMediaImageUrl(mediaImage)} alt={data.anime_title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-40">
                                <PlayCircle className="w-6 h-6" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 line-clamp-1 uppercase tracking-tight">
                            {data.anime_title}
                        </p>
                        <p className="text-[9px] text-black dark:text-white font-black">
                            {isRtl ? 'الحلقة' : 'EP'} {data.episode_number}
                        </p>
                    </div>
                </div>
            )}
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

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) await markAsRead(notification.id);
        const data = notification.data;
        const lang = i18n.language || 'en';

        // Custom Types Navigation
        if (notification.type === 'friend_request' && data.requester_id) {
            navigate(`/${lang}/u/${data.requester_id}/profile`);
            return;
        }
        if (notification.type === 'friend_request_accepted' && data.accepter_id) {
            navigate(`/${lang}/u/${data.accepter_id}/profile`);
            return;
        }
        if (notification.type === 'friend_request_rejected' && data.rejecter_id) {
            navigate(`/${lang}/u/${data.rejecter_id}/profile`);
            return;
        }
        if (notification.type === 'chat_message' && data.sender_id) {
            const currentUserId = useAuthStore.getState().user?.id;
            navigate(`/${lang}/u/${currentUserId}/dashboard/messages?userId=${data.sender_id}`);
            return;
        }

        if (data.anime_id && data.episode_number) {
            const params = new URLSearchParams();
            if (data.comment_id) params.append('commentId', data.comment_id.toString());
            if (data.parent_id) params.append('parentId', data.parent_id.toString());
            const queryString = params.toString() ? `?${params.toString()}` : '';
            navigate(`/${i18n.language}/watch/${data.anime_id}/${data.episode_number}${queryString}`);
        } else if (data.anime_id) {
            const d = data as any;
            const animeSlug = i18n.language === 'ar' ? (d.anime_slug || d.anime_id) : (d.anime_slug_en || d.anime_slug || d.anime_id);
            navigate(`/${i18n.language}/animes/${animeSlug || data.anime_id}`);
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
                                        className="px-6 py-2.5 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-sm font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#333] rounded-none transition-all shadow-sm active:scale-95"
                                    >
                                        {isRtl ? 'تعليم الكل كمقروء' : 'Mark all as read'}
                                    </button>
                                    <button
                                        onClick={deleteAll}
                                        className="px-6 py-2.5 bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-sm font-bold text-black dark:text-white border border-gray-200 dark:border-[#333] rounded-none transition-all shadow-sm active:scale-95"
                                    >
                                        {isRtl ? 'حذف الكل' : 'Clear All'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                <CrunchyrollSkeleton count={6} />
                            </div>
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
