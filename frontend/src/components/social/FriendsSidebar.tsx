import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Users, MessageCircle, UserPlus, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useMessagingStore } from '@/stores/messaging-store';

interface Friend {
    id: number;
    name: string;
    avatar?: string;
}

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface Conversation {
    other_user: { id: number; name: string; avatar: string };
    last_message: Message;
    unread_count?: number;
}

import { getImageUrl } from '@/utils/image-utils';
import { renderEmojiContent } from '@/utils/render-content';
import { useState, useEffect } from 'react';

export const FriendsSidebar: React.FC = () => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { onlineUsers, typingStatus } = useSocketStore();
    const { openMessagingModal } = useMessagingStore();
    const [conversations, setConversations] = useState<Record<number, Conversation>>({});

    const fetchConversations = async () => {
        if (!user) return;
        try {
            const res = await api.get('/messages/conversations');
            const convs: Conversation[] = res.data.conversations || [];
            const convMap: Record<number, Conversation> = {};
            convs.forEach(c => {
                convMap[c.other_user.id] = c;
            });
            setConversations(convMap);
        } catch (err) {
            console.error('Failed to fetch conversations for sidebar', err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchConversations();
        }
    }, [user]);

    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            const newMsg = event.detail as Message;
            const otherUserId = newMsg.sender_id === user?.id ? newMsg.receiver_id : newMsg.sender_id;

            setConversations(prev => {
                const existing = prev[otherUserId];
                const updatedConv: Conversation = {
                    other_user: existing?.other_user || (newMsg.sender_id === user?.id ? (newMsg as any).receiver : (newMsg as any).sender),
                    last_message: newMsg,
                    unread_count: (existing?.unread_count || 0) + (newMsg.sender_id === user?.id ? 0 : 1)
                };
                return { ...prev, [otherUserId]: updatedConv };
            });
        };

        const handleReadReceipt = (event: CustomEvent) => {
            const { receiver_id } = event.detail;
            setConversations(prev => {
                const conv = prev[receiver_id];
                if (conv && conv.last_message.sender_id === user?.id) {
                    return {
                        ...prev,
                        [receiver_id]: {
                            ...conv,
                            last_message: { ...conv.last_message, is_read: true }
                        }
                    };
                }
                return prev;
            });
        };

        const handleConversationRead = (event: CustomEvent) => {
            const { userId } = event.detail;
            setConversations(prev => {
                const conv = prev[userId];
                if (conv) {
                    return {
                        ...prev,
                        [userId]: { ...conv, unread_count: 0 }
                    };
                }
                return prev;
            });
        };

        window.addEventListener('app:chat_message' as any, handleNewMessage as any);
        window.addEventListener('app:read_receipt' as any, handleReadReceipt as any);
        window.addEventListener('app:conversation_read' as any, handleConversationRead as any);
        return () => {
            window.removeEventListener('app:chat_message' as any, handleNewMessage as any);
            window.removeEventListener('app:read_receipt' as any, handleReadReceipt as any);
            window.removeEventListener('app:conversation_read' as any, handleConversationRead as any);
        };
    }, [user]);

    const { data: friends, isLoading } = useQuery({
        queryKey: ['friends-sidebar', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const res = await api.get(`/friends/list/${user.id}`);
            return res.data.friends || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    if (!user) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-sm border border-gray-100 dark:border-[#2a2a2a] text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {isAr ? 'سجل الدخول لرؤية أصدقائك' : 'Login to see friends'}
                </h3>
                <Link
                    to={`/${i18n.language}/auth/login`}
                    className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold transition-colors"
                >
                    {isAr ? 'تسجيل الدخول' : 'Login'}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-black dark:text-white" />
                    <h3 className="font-bold font-sans text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                        {isAr ? 'الأصدقاء' : 'Friends'}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate(`/${i18n.language}/u/${user.id}/dashboard/friends`)}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="space-y-4 p-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2a2a2a]" />
                                <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : friends && friends.length > 0 ? (
                    <div className="space-y-1">
                        {friends.map((friend: Friend) => {
                            const isOnline = onlineUsers.has(friend.id);
                            const conv = conversations[friend.id];
                            const lastMsg = conv?.last_message;
                            const unreadCount = conv?.unread_count || 0;
                            const isMe = lastMsg?.sender_id === user.id;

                            return (
                                <div
                                    key={friend.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer relative"
                                    onClick={() => openMessagingModal(friend)}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-[#222]">
                                            {friend.avatar ? (
                                                <img src={getImageUrl(friend.avatar)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#333] text-gray-500 font-bold">
                                                    {friend.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1a1a1a] rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[17px] font-black font-sans text-gray-900 dark:text-white truncate tracking-tight">
                                                {friend.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-1 overflow-visible mt-0.5">
                                            <div className={cn(
                                                "text-[16px] truncate flex items-center gap-1.5 min-w-0 flex-1 transition-colors [&_img]:w-6 [&_img]:h-6 [&_img]:shrink-0 [&_img]:align-middle",
                                                unreadCount > 0 ? "text-black dark:text-white font-bold" : "text-gray-500 dark:text-gray-400 font-medium"
                                            )}>
                                                {typingStatus[friend.id] ? (
                                                    <span className="text-blue-500 font-bold animate-pulse text-[14px]">
                                                        {isAr ? 'يكتب الآن...' : 'typing now...'}
                                                    </span>
                                                ) : lastMsg ? (
                                                    <>
                                                        <span className="truncate">
                                                            {renderEmojiContent(lastMsg.content)}
                                                        </span>
                                                        {isMe && lastMsg.is_read && (
                                                            <div className="shrink-0 w-3.5 h-3.5 rounded-full overflow-hidden border border-white dark:border-[#1a1a1a] shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                                                <img src={getImageUrl(friend.avatar)} alt="" className="w-full h-full object-cover" />
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className={cn(
                                                        "transition-colors text-[10px]",
                                                        isOnline ? "text-green-500" : "text-gray-500"
                                                    )}>
                                                        {isOnline ? (isAr ? 'نشط الآن' : 'Active now') : (isAr ? 'غير متصل' : 'Offline')}
                                                    </span>
                                                )}
                                            </div>

                                            {unreadCount > 0 && (
                                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full shadow-sm animate-in zoom-in duration-300">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all absolute top-2 left-2"
                                        title={isAr ? 'مراسلة' : 'Message'}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-500">
                            {isAr ? 'لا يوجد أصدقاء بعد. ابدأ بإضافة البعض!' : 'No friends yet. Start adding some!'}
                        </p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(`/${i18n.language}/u/${user.id}/dashboard/friends`)}
                    className="w-full py-2 text-xs font-bold font-sans text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                >
                    {isAr ? 'عرض جميع الأصدقاء' : 'View all friends'}
                </button>
            </div>
        </div>
    );
};
