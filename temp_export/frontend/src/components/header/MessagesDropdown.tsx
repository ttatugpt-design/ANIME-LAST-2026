import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Check, CheckCheck, X, ChevronLeft, Search, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import { renderEmojiContent } from '@/utils/render-content';
import api from '@/lib/api';

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
}

interface User {
    id: number;
    name: string;
    avatar: string;
}

interface Conversation {
    other_user: User;
    last_message: Message;
    unread_count?: number;
}

export const MessagesDropdown: React.FC = () => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { onlineUsers, typingStatus } = useSocketStore();

    const [isOpen, setIsOpen] = useState(false);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isRtl = i18n.language === 'ar';
    const lang = i18n.language || 'en';

    const unreadTotal = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

    const fetchConversations = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data.conversations || []);
        } catch (err) {
            console.error('Failed to fetch conversations for dropdown', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchConversations();
        }
    }, [currentUser]);

    // Realtime updates
    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            const newMsg = event.detail as Message;
            const otherUserId = newMsg.sender_id === currentUser?.id ? newMsg.receiver_id : newMsg.sender_id;

            setConversations(prev => {
                const existingIdx = prev.findIndex(c => c.other_user?.id === otherUserId);
                let updatedConv: Conversation;

                if (existingIdx !== -1) {
                    const existing = prev[existingIdx];
                    updatedConv = {
                        ...existing,
                        last_message: newMsg,
                        unread_count: (existing.unread_count || 0) + (newMsg.sender_id === currentUser?.id ? 0 : 1)
                    };
                    const filtered = prev.filter((_, i) => i !== existingIdx);
                    return [updatedConv, ...filtered];
                } else {
                    // For new conversations, we might need to fetch user info if not in event detail
                    // But usually, the event detail for chat_message includes sender/receiver
                    const otherUser = newMsg.sender_id === currentUser?.id ? (newMsg as any).receiver : (newMsg as any).sender;
                    if (!otherUser) {
                        // If not available, we trigger a full refresh
                        fetchConversations();
                        return prev;
                    }

                    updatedConv = {
                        other_user: otherUser,
                        last_message: newMsg,
                        unread_count: newMsg.sender_id === currentUser?.id ? 0 : 1
                    };
                    return [updatedConv, ...prev];
                }
            });
        };

        const handleReadReceipt = (event: CustomEvent) => {
            const { receiver_id } = event.detail;
            setConversations(prev => prev.map(conv => {
                if (conv.other_user?.id === receiver_id && conv.last_message?.sender_id === currentUser?.id) {
                    return {
                        ...conv,
                        last_message: { ...conv.last_message, is_read: true }
                    };
                }
                return conv;
            }));
        };

        window.addEventListener('app:chat_message' as any, handleNewMessage as any);
        window.addEventListener('app:read_receipt' as any, handleReadReceipt as any);
        return () => {
            window.removeEventListener('app:chat_message' as any, handleNewMessage as any);
            window.removeEventListener('app:read_receipt' as any, handleReadReceipt as any);
        };
    }, [currentUser]);

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

    const handleConversationClick = (conv: Conversation) => {
        navigate(`/${lang}/u/${currentUser?.id}/dashboard/messages?userId=${conv.other_user.id}`);
        setIsOpen(false);
    };

    const getAvatarUrl = (path?: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return path.startsWith('/') ? path : `/${path}`;
    };

    const getLocale = () => isRtl ? ar : enUS;

    if (!currentUser) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2.5 transition-all duration-300 rounded-full group",
                    isOpen
                        ? "bg-gray-100 dark:bg-zinc-800 text-black dark:text-white"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white"
                )}
            >
                <MessageCircle className="w-6 h-6 stroke-[2.5px]" />
                {unreadTotal > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-[#1f1f1f] animate-in zoom-in duration-300">
                        {unreadTotal > 99 ? '+99' : unreadTotal}
                    </span>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={cn(
                        "fixed top-[60px] left-0 right-0 bottom-0 z-[100] flex flex-col bg-white dark:bg-[#111] lg:absolute lg:inset-auto lg:top-full lg:mt-2 lg:w-[450px] lg:max-h-[600px] lg:rounded-none lg:shadow-[0_20px_50px_rgba(0,0,0,0.3)] lg:border lg:border-gray-200 lg:dark:border-white/10 overflow-hidden",
                        isRtl ? "lg:left-0 lg:origin-top-left" : "lg:right-0 lg:origin-top-right"
                    )}
                    dir={isRtl ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#333] bg-white dark:bg-[#111] sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {isRtl ? 'الرسائل' : 'Messages'}
                            </h3>
                            {unreadTotal > 0 && (
                                <span className="bg-black dark:bg-white text-white dark:text-black text-xs font-black px-2 py-0.5 rounded-full">
                                    {unreadTotal}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate(`/${lang}/u/${currentUser?.id}/dashboard/messages`)}
                                className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111]">
                        {conversations.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-white/5">
                                {conversations.map((conv) => (
                                    <div
                                        key={conv.other_user.id}
                                        onClick={() => handleConversationClick(conv)}
                                        className={cn(
                                            "group relative flex gap-4 px-5 py-3 cursor-pointer transition-all duration-200",
                                            (conv.unread_count || 0) > 0
                                                ? "bg-gray-50/80 dark:bg-[#1a1a1a]"
                                                : "bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a]"
                                        )}
                                    >
                                        {(conv.unread_count || 0) > 0 && (
                                            <div className="absolute inset-y-0 right-0 w-1 bg-black dark:bg-white" />
                                        )}

                                        {/* Avatar */}
                                        <div className="flex-shrink-0 relative">
                                            <div className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-100 dark:border-[#333]">
                                                <img
                                                    src={getAvatarUrl(conv.other_user.avatar)}
                                                    alt={conv.other_user.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            {onlineUsers.has(conv.other_user.id) && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111] rounded-full" />
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className={cn(
                                                    "text-base truncate transition-colors group-hover:text-black dark:group-hover:text-white",
                                                    (conv.unread_count || 0) > 0 ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-800 dark:text-gray-100"
                                                )}>
                                                    {conv.other_user.name}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                                    {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true, locale: getLocale() })}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                    {typingStatus[conv.other_user.id] ? (
                                                        <span className="text-sm font-bold text-green-500 animate-pulse">
                                                            {isRtl ? 'يكتب...' : 'typing...'}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {conv.last_message.sender_id === currentUser.id && (
                                                                conv.last_message.is_read
                                                                    ? <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                                                    : <Check className="w-4 h-4 text-gray-500" />
                                                            )}
                                                            <div className={cn(
                                                                "text-[15px] truncate flex items-center [&_img]:w-5 [&_img]:h-5 [&_img]:shrink-0 [&_img]:align-text-bottom",
                                                                (conv.unread_count || 0) > 0
                                                                    ? "text-black dark:text-[#e9edef] font-bold"
                                                                    : "text-gray-500 dark:text-[#8696a0]"
                                                            )}>
                                                                {renderEmojiContent(conv.last_message.content)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                {(conv.unread_count || 0) > 0 && (
                                                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold rounded-full shadow-sm">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                                    <MessageCircle className="w-10 h-10 text-gray-300" />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-2">
                                    {isRtl ? 'لا توجد رسائل' : 'No Messages'}
                                </h4>
                                <p className="text-gray-500 text-sm max-w-[200px]">
                                    {isRtl ? 'ستظهر محادثاتك هنا عندما تبدأ في مراسلة أصدقائك' : 'Your conversations will appear here when you start messaging friends'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1a1a1a] sticky bottom-0">
                        <button
                            onClick={() => {
                                navigate(`/${lang}/u/${currentUser?.id}/dashboard/messages`);
                                setIsOpen(false);
                            }}
                            className="w-full bg-black dark:bg-white text-white dark:text-black py-3 text-sm font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-300"
                        >
                            {isRtl ? 'عرض كل الرسائل' : 'View All Messages'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
