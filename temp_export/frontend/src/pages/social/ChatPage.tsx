import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Send,
    Image as ImageIcon,
    Smile,
    MoreVertical,
    Search,
    ArrowRight,
    MessageCircle,
    User as UserIcon,
    Check,
    CheckCheck,
    Clock,
    Sparkles,
    Loader2
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import api from '@/lib/api';
import { renderEmojiContent } from '@/utils/render-content';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextInput } from '@/components/comments/RichTextInput';
import Footer from '@/components/common/Footer';
import { customEmojis } from '@/lib/customEmojis';

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
    sender?: User;
    receiver?: User;
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

const getImageUrl = (path: string | undefined) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path : `/${path}`;
};

const ChatPage: React.FC = () => {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { onlineUsers, typingStatus, sendTypingStatus, sendReadReceipt } = useSocketStore();
    const [lastTypingTime, setLastTypingTime] = useState(0);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [friends, setFriends] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const customEmojiButtonRef = useRef<HTMLButtonElement>(null);
    const customEmojiPickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    // Click outside handler for emoji picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customEmojiPickerRef.current &&
                !customEmojiPickerRef.current.contains(event.target as Node) &&
                !customEmojiButtonRef.current?.contains(event.target as Node)) {
                setShowCustomEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-select user from URL param
    useEffect(() => {
        const userIdParam = searchParams.get('userId');
        if (userIdParam) {
            const uid = parseInt(userIdParam);
            const existing = conversations.find(c => c.other_user?.id === uid);
            if (existing) {
                setSelectedUser(existing.other_user);
            } else if (!isLoading) {
                fetchUserInfo(uid);
            }
        }
    }, [searchParams, conversations.length, isLoading]);

    const fetchUserInfo = async (id: number) => {
        try {
            const res = await api.get(`/user/${id}`);
            if (res.data.user) {
                setSelectedUser(res.data.user);
            }
        } catch (err) {
            console.error('Failed to fetch user for chat', err);
        }
    };

    // Fetch conversations
    useEffect(() => {
        if (currentUser) {
            fetchConversations();
            fetchFriends();
        }
    }, [currentUser]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            const rawConversations = res.data.conversations || [];
            setConversations(rawConversations);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
            setIsLoading(false);
        }
    };

    const fetchFriends = async () => {
        if (!currentUser) return;
        try {
            const res = await api.get(`/friends/list/${currentUser.id}`);
            setFriends(res.data.friends || []);
        } catch (err) {
            console.error('Failed to fetch friends for chat', err);
        }
    };

    // Fetch messages when user is selected
    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.id);
            // Send read receipt when opening chat
            sendReadReceipt(selectedUser.id);

            // Locally reset unread count for the selected user immediately for instant feedback
            setConversations(prev => prev.map(conv => {
                if (conv.other_user?.id === selectedUser.id) {
                    return { ...conv, unread_count: 0 };
                }
                return conv;
            }));
        }
    }, [selectedUser]);

    const fetchMessages = async (userId: number) => {
        setIsLoadingMessages(true);
        try {
            const res = await api.get(`/messages/history/${userId}`);
            setMessages(res.data.messages || []);
            setIsLoadingMessages(false);
            scrollToBottom();
        } catch (err) {
            console.error('Failed to fetch messages', err);
            setIsLoadingMessages(false);
        }
    };

    const scrollToBottom = (force = true) => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (!force) {
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            if (!isNearBottom) return;
        }

        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    };

    // Handle incoming real-time messages
    useEffect(() => {
        const handleNewMessage = (event: CustomEvent) => {
            const newMsg = event.detail as Message;
            const otherUserId = newMsg.sender_id === currentUser?.id ? newMsg.receiver_id : newMsg.sender_id;

            // 1. Update messages if we are in this chat
            if (selectedUser && (newMsg.sender_id === selectedUser.id || newMsg.receiver_id === selectedUser.id)) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                scrollToBottom(newMsg.sender_id === currentUser?.id);

                if (newMsg.sender_id === selectedUser.id) {
                    sendReadReceipt(selectedUser.id);
                }
            }

            // 2. Update sidebar (conversations list) locally for instant feedback
            setConversations(prev => {
                const existingIdx = prev.findIndex(c => c.other_user?.id === otherUserId);
                let updatedConv: Conversation;

                if (existingIdx !== -1) {
                    const existing = prev[existingIdx];
                    updatedConv = {
                        ...existing,
                        last_message: newMsg,
                        unread_count: (selectedUser?.id === otherUserId) ? 0 : ((existing.unread_count || 0) + (newMsg.sender_id === currentUser?.id ? 0 : 1))
                    };
                    const filtered = prev.filter((_, i) => i !== existingIdx);
                    return [updatedConv, ...filtered];
                } else {
                    // This is a new conversation
                    const otherUser = newMsg.sender_id === currentUser?.id ? newMsg.receiver : newMsg.sender;
                    if (!otherUser) return prev; // Safety: shouldn't happen if backend preloads

                    updatedConv = {
                        other_user: otherUser,
                        last_message: newMsg,
                        unread_count: (selectedUser?.id === otherUserId) ? 0 : (newMsg.sender_id === currentUser?.id ? 0 : 1)
                    };
                    return [updatedConv, ...prev];
                }
            });
        };

        const handleReadReceipt = (event: CustomEvent) => {
            const { receiver_id, sender_id } = event.detail;

            // Update messages list
            if (selectedUser && selectedUser.id === receiver_id) {
                setMessages(prev => prev.map(m =>
                    m.sender_id === currentUser?.id ? { ...m, is_read: true } : m
                ));
            }

            // Update sidebar (conversations list) real-time
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
    }, [selectedUser]);

    const sendMessage = async () => {
        if (!inputText.trim() || !selectedUser) return;

        const text = inputText;
        setInputText('');
        setShowCustomEmojiPicker(false);
        // Stop typing status immediately on send
        sendTypingStatus(selectedUser.id, false);

        try {
            await api.post('/messages/send', {
                receiver_id: selectedUser.id,
                content: text
            });
            // Handled via WebSocket
        } catch (err) {
            toast.error(isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message');
            setInputText(text);
        }
    };

    // Typing Status Logic
    useEffect(() => {
        if (!selectedUser || !inputText.trim()) {
            if (lastTypingTime !== 0) {
                sendTypingStatus(selectedUser?.id || 0, false);
                setLastTypingTime(0);
            }
            return;
        }

        const now = Date.now();
        if (now - lastTypingTime > 3000) {
            sendTypingStatus(selectedUser.id, true);
            setLastTypingTime(now);
        }

        const timer = setTimeout(() => {
            sendTypingStatus(selectedUser.id, false);
            setLastTypingTime(0);
        }, 5000);

        return () => clearTimeout(timer);
    }, [inputText, selectedUser]);

    const onCustomEmojiClick = (emojiUrl: string) => {
        if (inputRef.current?.insertEmoji) {
            inputRef.current.insertEmoji(emojiUrl);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        return conversations.filter(c =>
            c.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [conversations, searchQuery]);

    const filteredFriends = useMemo(() => {
        // IDs of users we already have a conversation with
        const conversationUserIds = new Set(conversations.map(c => c.other_user?.id));

        // Filter out current user and existing conversations
        const availableFriends = friends.filter(f => f.id !== currentUser?.id && !conversationUserIds.has(f.id));

        if (!searchQuery.trim()) return availableFriends;

        return availableFriends.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [friends, conversations, searchQuery, currentUser]);

    const formatMessageTime = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'HH:mm');
        } catch {
            return '';
        }
    };

    // Jump to message logic
    useEffect(() => {
        const messageId = searchParams.get('messageId');
        if (messageId && messages.length > 0) {
            const el = document.getElementById(`msg-${messageId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
                setTimeout(() => {
                    el.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
                }, 2000);
            }
        }
    }, [messages, searchParams]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[600px] bg-white dark:bg-[#0a0a0a]">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-[#333] rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#f0f2f5] dark:bg-[#0b141a] overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                <div className="flex w-full max-w-[1600px] mx-auto h-full bg-white dark:bg-[#111b21] overflow-hidden md:shadow-2xl">
                    {/* Sidebar */}
                    <div className={cn(
                        "w-full md:w-[350px] lg:w-[400px] flex flex-col bg-white dark:bg-[#111b21] border-gray-200 dark:border-gray-800",
                        isRtl ? "border-l" : "border-r",
                        selectedUser ? "hidden md:flex" : "flex"
                    )}>
                        {/* Sidebar Header */}
                        <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between px-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-300"
                                    title={isRtl ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
                                >
                                    <ArrowRight className={cn("w-5 h-5", !isRtl && "rotate-180")} />
                                </button>
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                        <img src={getImageUrl(currentUser?.avatar)} alt="Me" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#f0f2f5] dark:border-[#202c33] rounded-full" />
                                </div>
                            </div>
                            <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                                <MessageCircle className="w-6 h-6 cursor-pointer" />
                                <MoreVertical className="w-6 h-6 cursor-pointer" />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-2 shrink-0">
                            <div className="relative bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg px-3 py-1.5 flex items-center gap-4">
                                <Search className="w-5 h-5 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder={isRtl ? "البحث أو البدء بدردشة جديدة" : "Search or start new chat"}
                                    className="bg-transparent border-none outline-none flex-1 text-sm dark:text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Conversations List (Unified with Friends) */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredConversations.length > 0 || filteredFriends.length > 0 ? (
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {/* Existing Conversations */}
                                    {filteredConversations.map((conv) => (
                                        <div
                                            key={conv.other_user?.id}
                                            onClick={() => setSelectedUser(conv.other_user)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors relative",
                                                selectedUser?.id === conv.other_user?.id ? "bg-[#f0f2f5] dark:bg-[#2a3942]" : ""
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                                                    <img src={getImageUrl(conv.other_user?.avatar)} alt={conv.other_user?.name} className="w-full h-full object-cover" />
                                                </div>
                                                {onlineUsers.has(conv.other_user?.id) && (
                                                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111b21] rounded-full ring-1 ring-white/50 dark:ring-black/50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className={cn(
                                                        "text-base truncate dark:text-[#e9edef]",
                                                        (conv.unread_count || 0) > 0 ? "font-bold" : "font-medium"
                                                    )}>
                                                        {conv.other_user?.name}
                                                    </h3>
                                                    {conv.last_message && (
                                                        <span className={cn(
                                                            "text-[11px]",
                                                            (conv.unread_count || 0) > 0 ? "text-green-500 font-bold" : "text-gray-500"
                                                        )}>
                                                            {formatMessageTime(conv.last_message?.created_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex justify-between items-center min-h-[20px]">
                                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                                        {typingStatus[conv.other_user?.id] ? (
                                                            <span className="text-sm font-bold text-green-500 animate-pulse">
                                                                {isRtl ? 'يكتب...' : 'typing...'}
                                                            </span>
                                                        ) : (
                                                            <>
                                                                {conv.last_message?.sender_id === currentUser?.id && (
                                                                    conv.last_message?.is_read
                                                                        ? <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                                                                        : <Check className="w-4 h-4 text-gray-500" />
                                                                )}
                                                                <div className={cn(
                                                                    "text-[15px] truncate flex items-center [&_img]:w-5 [&_img]:h-5 [&_img]:shrink-0 [&_img]:align-text-bottom",
                                                                    (conv.unread_count || 0) > 0
                                                                        ? "text-black dark:text-[#e9edef] font-bold"
                                                                        : "text-gray-500 dark:text-[#8696a0]"
                                                                )}>
                                                                    {renderEmojiContent(conv.last_message?.content || '')}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {(conv.unread_count || 0) > 0 && (
                                                        <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-green-500 text-white text-[10px] font-bold rounded-full ml-2 shadow-sm">
                                                            {conv.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Friends without existing conversations */}
                                    {filteredFriends.map((friend) => (
                                        <div
                                            key={friend.id}
                                            onClick={() => setSelectedUser(friend)}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors relative",
                                                selectedUser?.id === friend.id ? "bg-[#f0f2f5] dark:bg-[#2a3942]" : ""
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                                                    <img src={getImageUrl(friend.avatar)} alt={friend.name} className="w-full h-full object-cover" />
                                                </div>
                                                {onlineUsers.has(friend.id) && (
                                                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111b21] rounded-full ring-1 ring-white/50 dark:ring-black/50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-0.5">
                                                    <h3 className="text-base font-medium truncate dark:text-[#e9edef]">{friend.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {typingStatus[friend.id] ? (
                                                        <span className="text-sm font-bold text-green-500 animate-pulse">
                                                            {isRtl ? 'يكتب...' : 'typing...'}
                                                        </span>
                                                    ) : (
                                                        <p className="text-sm text-gray-400 dark:text-[#8696a0] italic">
                                                            {isRtl ? 'ابدأ محادثة جديدة' : 'Start a new chat'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                                    <p>{isRtl ? 'لا توجد نتائج' : 'No results found'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Chat Area */}
                    <div className={cn(
                        "flex-1 flex flex-col bg-[#e5ddd5] dark:bg-[#0b141a] relative",
                        !selectedUser ? "hidden md:flex" : "flex"
                    )}>
                        {selectedUser ? (
                            <>
                                {/* Chat Header - Fixed Height & Shrink-0 */}
                                <div className="h-[60px] min-h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between px-4 z-30 shrink-0 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setSelectedUser(null)}
                                            className="md:hidden p-1 text-gray-500"
                                        >
                                            <ArrowRight className={cn("w-6 h-6", isRtl ? "" : "rotate-180")} />
                                        </button>
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 cursor-pointer">
                                                <img src={getImageUrl(selectedUser.avatar)} alt={selectedUser.name} className="w-full h-full object-cover" />
                                            </div>
                                            {onlineUsers.has(selectedUser.id) && (
                                                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#202c33] rounded-full" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] leading-tight">{selectedUser.name}</h3>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                                {onlineUsers.has(selectedUser.id)
                                                    ? (isRtl ? 'متصل الآن' : 'Online')
                                                    : (isRtl ? 'غير متصل' : 'Offline')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                                        <Search className="w-6 h-6 cursor-pointer hover:text-gray-700 dark:hover:text-[#e9edef] transition-colors" />
                                        <MoreVertical className="w-6 h-6 cursor-pointer hover:text-gray-700 dark:hover:text-[#e9edef] transition-colors" />
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-y-auto px-4 py-8 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-[url('https://raw.githubusercontent.com/Tichif/whatsapp-clone-react/master/public/whatsapp_bg_dark.png')] custom-scrollbar relative"
                                >
                                    <div className="w-full max-w-[800px] md:mx-auto space-y-2">
                                        {messages.map((msg, idx) => {
                                            const isMe = msg.sender_id === currentUser?.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    id={`msg-${msg.id}`}
                                                    className={cn(
                                                        "flex w-full mb-1",
                                                        isMe ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "max-w-[80%] md:max-w-[70%] px-3 py-1.5 shadow-sm relative",
                                                        isMe
                                                            ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-t-lg rounded-bl-lg rounded-br-none"
                                                            : "bg-white dark:bg-[#202c33] rounded-t-lg rounded-br-lg rounded-bl-none",
                                                        isRtl ? (isMe ? "rounded-br-lg rounded-bl-none" : "rounded-bl-lg rounded-br-none") : ""
                                                    )}>
                                                        <div className="text-[17px] font-semibold dark:text-[#e9edef] break-words whitespace-pre-wrap">
                                                            {renderEmojiContent(msg.content)}
                                                        </div>
                                                        <div className="flex justify-end items-center gap-1 mt-1">
                                                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                {formatMessageTime(msg.created_at)}
                                                            </span>
                                                            {isMe && (
                                                                msg.is_read
                                                                    ? <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                                                                    : <Check className="w-3 h-3 text-gray-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                {/* Typing indicator repositioned for recipient side */}
                                {selectedUser && typingStatus[selectedUser.id] && (
                                    <div className={cn(
                                        "absolute bottom-[85px] z-10 animate-in fade-in slide-in-from-bottom-2 duration-300",
                                        isRtl ? "right-8" : "left-8"
                                    )}>
                                        <div className="bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-gray-100 dark:border-gray-800/50">
                                            <div className="flex gap-1 items-center h-4">
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" />
                                            </div>
                                            <span className="text-xs font-bold text-green-600 dark:text-[#00a884]">
                                                {isRtl ? 'يكتب...' : 'typing...'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Input Area - Fixed at Bottom with Safe Area */}
                                <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] flex items-center gap-4 relative z-50 shrink-0 border-t border-gray-200 dark:border-gray-800">
                                    <div className="relative">
                                        <button
                                            ref={customEmojiButtonRef}
                                            onClick={() => setShowCustomEmojiPicker(!showCustomEmojiPicker)}
                                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 p-1 shrink-0"
                                            title={isRtl ? 'رموز مخصصة' : 'Custom Emojis'}
                                        >
                                            <Sparkles className="w-7 h-7" />
                                        </button>
                                        {showCustomEmojiPicker && (
                                            <div
                                                ref={customEmojiPickerRef}
                                                className="absolute bottom-full mb-2 z-[100] transition-all duration-200"
                                            >
                                                <CustomEmojiPicker
                                                    onEmojiClick={onCustomEmojiClick}
                                                    onClose={() => setShowCustomEmojiPicker(false)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 p-1 shrink-0">
                                        <ImageIcon className="w-7 h-7" />
                                    </button>
                                    <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-1 min-h-[42px] flex items-center">
                                        <RichTextInput
                                            ref={inputRef}
                                            value={inputText}
                                            onChange={setInputText}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isRtl ? "اكتب رسالة" : "Type a message"}
                                            className="w-full bg-transparent border-none outline-none text-[15px] dark:text-[#e9edef]"
                                        />
                                    </div>
                                    <button
                                        onClick={sendMessage}
                                        disabled={!inputText.trim()}
                                        className={cn(
                                            "p-2 rounded-full transition-colors shrink-0",
                                            inputText.trim()
                                                ? "text-black dark:text-white cursor-pointer"
                                                : "text-gray-400 cursor-default"
                                        )}
                                    >
                                        <Send className={cn("w-6 h-6", isRtl ? "rotate-180" : "")} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#222e35] text-center p-8">
                                <div className="w-64 h-64 mb-8 text-[#53bdeb] opacity-20">
                                    <MessageCircle className="w-full h-full" />
                                </div>
                                <h2 className="text-3xl font-light text-[#41525d] dark:text-[#e9edef] mb-4">
                                    {isRtl ? 'كرانشي رول ويب' : 'Crunchyroll Web'}
                                </h2>
                                <p className="text-sm text-[#667781] dark:text-[#8696a0] max-w-md">
                                    {isRtl
                                        ? 'أرسل واستقبل الرسائل دون الحاجة إلى إبقاء هاتفك متصلاً بالإنترنت. استخدم كرانشي رول على ما يصل إلى 4 أجهزة مرتبطة وهاتف واحد في نفس الوقت.'
                                        : 'Send and receive messages without keeping your phone online. Use Crunchyroll on up to 4 linked devices and 1 phone at the same time.'
                                    }
                                </p>
                                <div className="mt-auto py-8 text-xs text-[#8696a0] flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {isRtl ? 'محمي بتشفير تام بين الطرفين' : 'End-to-end encrypted'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
