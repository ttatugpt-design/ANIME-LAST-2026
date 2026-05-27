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
    Reply,
    Edit2,
    Trash2,
    CornerDownRight,
    MoreHorizontal,
    X
} from 'lucide-react';
import CentralSpinner from "@/components/ui/CentralSpinner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import api from '@/lib/api';
import { renderEmojiContent } from '@/utils/render-content';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextInput } from '@/components/comments/RichTextInput';
import { customEmojis } from '@/lib/customEmojis';
import { getImageUrl } from '@/utils/image-utils';

interface Message {
    id: number;
    sender_id: number;
    receiver_id: number;
    content: string;
    is_read: boolean;
    created_at: string;
    sender?: User;
    receiver?: User;
    parent_id?: number;
    parent?: Message;
    is_edited?: boolean;
    reactions?: MessageReaction[];
}

interface MessageReaction {
    id: number;
    user_id: number;
    user: User;
    type: string;
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


const ChatPage: React.FC = () => {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { onlineUsers, typingStatus, sendTypingStatus, sendReadReceipt } = useSocketStore();
    const [lastTypingTime, setLastTypingTime] = useState(0);

    const REACTIONS = useMemo(() => [
        { key: 'like', label: isRtl ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: isRtl ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: isRtl ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: isRtl ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: isRtl ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: isRtl ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: isRtl ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
    ], [isRtl]);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [friends, setFriends] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [showReactionsFor, setShowReactionsFor] = useState<number | null>(null);

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

    // Reaction and UI state click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Reaction Picker
            if (showReactionsFor !== null) {
                const isReactionClick = (target as HTMLElement).closest('.reaction-picker-container');
                const isSmileButtonClick = (target as HTMLElement).closest('.smile-button-trigger');
                if (!isReactionClick && !isSmileButtonClick) {
                    setShowReactionsFor(null);
                }
            }

            // Reply/Edit Bar - Close if clicking outside the input area or dropdowns
            const isInputClick = (target as HTMLElement).closest('.chat-input-area');
            const isMenuClick = (target as HTMLElement).closest('[role="menu"]');
            
            setTimeout(() => {
                if (!isInputClick && !isMenuClick) {
                    if (replyingTo || editingMessage) {
                        // Only clear if clicking somewhere unrelated to chat interface
                        // But for now let's be simple
                    }
                }
            }, 0);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showReactionsFor, replyingTo, editingMessage]);

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

    // Handle mobile keyboard opening (visualViewport resize)
    useEffect(() => {
        const handleResize = () => {
            scrollToBottom(true);
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            } else {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []);

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
                    if (!otherUser) return prev; 

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
            const { receiver_id } = event.detail;
            if (selectedUser && selectedUser.id === receiver_id) {
                setMessages(prev => prev.map(m => m.sender_id === currentUser?.id ? { ...m, is_read: true } : m));
            }
            setConversations(prev => prev.map(conv => {
                if (conv.other_user?.id === receiver_id && conv.last_message?.sender_id === currentUser?.id) {
                    return { ...conv, last_message: { ...conv.last_message, is_read: true } };
                }
                return conv;
            }));
        };

        const handleMessageEdited = (event: CustomEvent) => {
            const editedMsg = event.detail as Message;
            if (selectedUser && (editedMsg.sender_id === selectedUser.id || editedMsg.receiver_id === selectedUser.id)) {
                setMessages(prev => prev.map(m => m.id === editedMsg.id ? { ...m, content: editedMsg.content, is_edited: true } : m));
            }
        };

        const handleMessageDeleted = (event: CustomEvent) => {
            const { message_id } = event.detail;
            setMessages(prev => prev.filter(m => m.id !== message_id));
        };

        const handleMessageReacted = (event: CustomEvent) => {
            const updatedMsg = event.detail as Message;
            if (selectedUser && (updatedMsg.sender_id === selectedUser.id || updatedMsg.receiver_id === selectedUser.id)) {
                setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
            }
        };

        const handleChatCleared = (event: CustomEvent) => {
            const { user1_id, user2_id } = event.detail;
            if (selectedUser && 
                ((user1_id === currentUser?.id && user2_id === selectedUser.id) || 
                 (user2_id === currentUser?.id && user1_id === selectedUser.id))) {
                setMessages([]);
            }
        };

        window.addEventListener('app:chat_message' as any, handleNewMessage as any);
        window.addEventListener('app:read_receipt' as any, handleReadReceipt as any);
        window.addEventListener('app:message_edited' as any, handleMessageEdited as any);
        window.addEventListener('app:message_deleted' as any, handleMessageDeleted as any);
        window.addEventListener('app:message_reacted' as any, handleMessageReacted as any);
        window.addEventListener('app:chat_cleared' as any, handleChatCleared as any);

        return () => {
            window.removeEventListener('app:chat_message' as any, handleNewMessage as any);
            window.removeEventListener('app:read_receipt' as any, handleReadReceipt as any);
            window.removeEventListener('app:message_edited' as any, handleMessageEdited as any);
            window.removeEventListener('app:message_deleted' as any, handleMessageDeleted as any);
            window.removeEventListener('app:message_reacted' as any, handleMessageReacted as any);
            window.removeEventListener('app:chat_cleared' as any, handleChatCleared as any);
        };
    }, [selectedUser, currentUser]);

    const handleReact = async (messageId: number, type: string) => {
        const currentMsg = messages.find(m => m.id === messageId);
        const existingReaction = currentMsg?.reactions?.find(r => r.user_id === currentUser?.id);
        
        const finalType = existingReaction?.type === type ? '' : type;
        setShowReactionsFor(null);

        // Optimistic update
        setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
                const otherReactions = (m.reactions || []).filter(r => r.user_id !== currentUser?.id);
                const newReactions = finalType ? [...otherReactions, { user_id: currentUser?.id!, type: finalType }] : otherReactions;
                return { ...m, reactions: newReactions as any };
            }
            return m;
        }));

        try {
            await api.post(`/messages/${messageId}/react`, { type: finalType });
        } catch (err) {
            toast.error(isRtl ? 'فشل التفاعل' : 'Failed to react');
            // Rollback optimistic update on error
            setMessages(prev => prev.map(m => {
                if (m.id === messageId) return currentMsg!;
                return m;
            }));
        }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Are you sure you want to delete this message?')) return;
        try {
            await api.delete(`/messages/${messageId}`);
        } catch (err) {
            toast.error(isRtl ? 'فشل الحذف' : 'Failed to delete');
        }
    };

    const handleClearChat = async () => {
        if (!selectedUser) return;
        if (!window.confirm(isRtl ? 'هل أنت متأكد من مسح المحادثة بالكامل؟' : 'Are you sure you want to clear the entire chat?')) return;
        try {
            await api.delete(`/messages/conversation/${selectedUser.id}`);
        } catch (err) {
            toast.error(isRtl ? 'فشل مسح المحادثة' : 'Failed to clear chat');
        }
    };

    const startEditing = (msg: Message) => {
        setEditingMessage(msg);
        setInputText(msg.content);
        setReplyingTo(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const startReply = (msg: Message) => {
        setReplyingTo(msg);
        setEditingMessage(null);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !selectedUser) return;

        const text = inputText;
        const parentId = replyingTo?.id;
        const editId = editingMessage?.id;

        setInputText('');
        setReplyingTo(null);
        setEditingMessage(null);
        setShowCustomEmojiPicker(false);
        // Stop typing status immediately on send
        sendTypingStatus(selectedUser.id, false);

        try {
            if (editId) {
                await api.put(`/messages/${editId}`, { content: text });
            } else {
                await api.post('/messages/send', {
                    receiver_id: selectedUser.id,
                    content: text,
                    parent_id: parentId
                });
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message;
            toast.error(`${isRtl ? 'فشل العملية' : 'Operation failed'}: ${errorMsg}`);
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
            <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[3px] animate-fade-in">
                <CentralSpinner />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#0b141a] overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
                <div className="flex w-full max-w-[1600px] mx-auto h-full bg-white dark:bg-[#111b21] overflow-hidden md:shadow-2xl">
                    {/* Sidebar */}
                    <div className={cn(
                        "w-full md:w-[350px] lg:w-[400px] flex flex-col bg-white dark:bg-[#111b21] border-gray-200 dark:border-gray-800",
                        isRtl ? "border-l" : "border-r",
                        selectedUser ? "hidden md:flex" : "flex"
                    )}>
                        {/* Sidebar Header */}
                        <div className="h-[60px] bg-white dark:bg-[#202c33] flex items-center justify-between px-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
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
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#202c33] rounded-full" />
                                </div>
                            </div>
                            <div className="flex gap-4 text-gray-500 dark:text-gray-400">
                                <MessageCircle className="w-6 h-6 cursor-pointer" />
                                <MoreVertical className="w-6 h-6 cursor-pointer" />
                            </div>
                        </div>

                        {/* Search */}
                        <div className="p-2 shrink-0">
                            <div className="relative bg-gray-100 dark:bg-[#202c33] rounded-lg px-3 py-1.5 flex items-center gap-4">
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
                                                selectedUser?.id === conv.other_user?.id ? "bg-gray-100 dark:bg-[#2a3942]" : ""
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
                                                selectedUser?.id === friend.id ? "bg-gray-100 dark:bg-[#2a3942]" : ""
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
                                <div className="h-[60px] min-h-[60px] bg-white dark:bg-[#202c33] flex items-center justify-between px-4 z-30 shrink-0 border-b border-gray-200 dark:border-gray-800">
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
                                    <div className="flex items-center gap-4 text-gray-500">
                                        <Search className="w-5 h-5 cursor-pointer hover:text-gray-700 dark:hover:text-white transition-colors" />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 hover:text-gray-700 dark:hover:text-white transition-colors outline-none border-none">
                                                    <MoreVertical className="w-6 h-6" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isRtl ? "start" : "end"} className="dark:bg-[#202c33] dark:border-white/5 border-gray-100 z-[1000]">
                                                <DropdownMenuItem 
                                                    onClick={handleClearChat}
                                                    className="gap-2 cursor-pointer text-red-500 focus:text-red-500 font-bold"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {isRtl ? 'مسح المحادثة' : 'Clear Chat'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-y-auto px-4 py-8 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-[url('https://raw.githubusercontent.com/Tichif/whatsapp-clone-react/master/public/whatsapp_bg_dark.png')] custom-scrollbar relative"
                                >
                                    <div className="w-full max-w-[800px] md:mx-auto space-y-2">
                                        {messages.map((msg) => {
                                            const isMe = msg.sender_id === currentUser?.id;
                                            return (
                                                <div
                                                    key={msg.id}
                                                    id={`msg-${msg.id}`}
                                                    className={cn(
                                                        "group relative flex flex-col mb-1 max-w-[92%] sm:max-w-[80%]",
                                                        isMe 
                                                            ? (isRtl ? "mr-auto items-start" : "ml-auto items-end") 
                                                            : (isRtl ? "ml-auto items-end" : "mr-auto items-start")
                                                    )}
                                                >
                                                    {/* Reaction Picker Overlay - Positioned above the bubble, centered */}
                                                    {showReactionsFor === msg.id && (
                                                        <div className={cn(
                                                            "absolute bottom-full mb-2 flex items-center gap-1 bg-white dark:bg-[#232d36] p-1.5 rounded-full shadow-2xl border border-gray-100 dark:border-white/10 z-[100] animate-in zoom-in-95 duration-200 reaction-picker-container w-max",
                                                            isMe 
                                                                ? (isRtl ? "left-0" : "right-0") 
                                                                : (isRtl ? "right-0" : "left-0"),
                                                            "md:left-1/2 md:-translate-x-1/2 md:right-auto" // Center on desktop
                                                        )}>
                                                            {REACTIONS.map(r => (
                                                                <button
                                                                    key={r.key}
                                                                    onClick={() => handleReact(msg.id, r.key)}
                                                                    className="w-8 h-8 hover:scale-125 transition-transform p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                                                    title={r.label}
                                                                >
                                                                    <img src={r.gif} alt={r.label} className="w-full h-full object-contain" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Hover Actions Menu */}
                                                    <div className={cn(
                                                        "absolute top-0 flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/90 dark:bg-[#3e4042]/90 backdrop-blur-sm shadow-md border border-gray-100 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all z-30",
                                                        isMe 
                                                            ? (isRtl ? "right-2" : "left-2") 
                                                            : (isRtl ? "left-2" : "right-2"),
                                                        "-translate-y-full mb-1 group-hover:-translate-y-[calc(100%+4px)]"
                                                    )}>
                                                        <button 
                                                            onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-yellow-500 transition-colors smile-button-trigger"
                                                            title={isRtl ? 'تفاعل' : 'React'}
                                                        >
                                                            <Smile className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => startReply(msg)}
                                                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-blue-500 transition-colors"
                                                            title={isRtl ? 'رد' : 'Reply'}
                                                        >
                                                            <Reply className="w-4 h-4" />
                                                        </button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors more-options-trigger">
                                                                    <MoreHorizontal className="w-4 h-4" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="center" className="dark:bg-[#232d36] dark:border-white/5">
                                                                {isMe && (
                                                                    <DropdownMenuItem onClick={() => startEditing(msg)} className="gap-2 cursor-pointer">
                                                                        <Edit2 className="w-4 h-4" />
                                                                        {isRtl ? 'تعديل' : 'Edit'}
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="gap-2 cursor-pointer text-red-500 focus:text-red-500">
                                                                    <Trash2 className="w-4 h-4" />
                                                                    {isRtl ? 'حذف' : 'Delete'}
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    {/* Message Bubble Container */}
                                                    <div className={cn(
                                                        "relative px-3 py-1.5 shadow-sm min-w-[60px]",
                                                        isMe
                                                            ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-t-lg rounded-bl-lg rounded-br-none"
                                                            : "bg-white dark:bg-[#202c33] rounded-t-lg rounded-br-lg rounded-bl-none",
                                                        isRtl ? (isMe ? "rounded-br-lg rounded-bl-none" : "rounded-bl-lg rounded-br-none") : ""
                                                    )}>
                                                        {/* Reply Parent Bubble */}
                                                        {msg.parent && (
                                                            <div 
                                                                onClick={() => {
                                                                    const el = document.getElementById(`msg-${msg.parent_id}`);
                                                                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                    el?.classList.add('ring-2', 'ring-blue-500');
                                                                    setTimeout(() => el?.classList.remove('ring-2', 'ring-blue-500'), 2000);
                                                                }}
                                                                className="mb-1.5 p-2 rounded-md bg-black/5 dark:bg-white/5 border-l-4 border-blue-500 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <CornerDownRight className="w-3 h-3 text-blue-500" />
                                                                    <span className="text-[10px] font-bold text-blue-500 truncate">
                                                                        {msg.parent.sender_id === currentUser?.id ? (isRtl ? 'أنت' : 'You') : (selectedUser?.name)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                                                                    {renderEmojiContent(msg.parent.content)}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Message Content */}
                                                        <div className="text-[15px] dark:text-[#e9edef] break-words whitespace-pre-wrap leading-normal font-medium">
                                                            {renderEmojiContent(msg.content)}
                                                        </div>

                                                        {/* Metadata and Status */}
                                                        <div className="flex justify-end items-center gap-1.5 mt-0.5 min-w-[50px]">
                                                            {msg.is_edited && (
                                                                <span className="text-[9px] text-gray-400 dark:text-[#8696a0] font-medium">
                                                                    {isRtl ? 'معدلة' : 'edited'}
                                                                </span>
                                                            )}
                                                            <span className="text-[10px] text-gray-500 dark:text-[#8696a0] font-bold">
                                                                {formatMessageTime(msg.created_at)}
                                                            </span>
                                                            {isMe && (
                                                                msg.is_read
                                                                    ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                                                    : <Check className="w-3.5 h-3.5 text-gray-500/70" />
                                                            )}
                                                        </div>

                                                        {/* Reactions Display */}
                                                        {msg.reactions && msg.reactions.length > 0 && (
                                                            <div className={cn(
                                                                "absolute -bottom-2.5 flex items-center -space-x-1",
                                                                isMe ? "right-0" : "left-0"
                                                            )}>
                                                                <div className="flex items-center gap-0.5 bg-white dark:bg-[#3b4a54] px-1.5 py-0.5 rounded-full shadow-sm border border-gray-100 dark:border-white/5 ring-1 ring-black/5">
                                                                    {Array.from(new Set(msg.reactions.map(r => r.type))).slice(0, 3).map(type => (
                                                                        <img 
                                                                            key={type} 
                                                                            src={REACTIONS.find(r => r.key === type)?.gif} 
                                                                            alt={type} 
                                                                            className="w-3.5 h-3.5 object-contain" 
                                                                        />
                                                                    ))}
                                                                    <span className="text-[10px] font-bold dark:text-gray-300 ml-0.5">
                                                                        {msg.reactions.length}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
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
                                <div className="bg-white dark:bg-[#202c33] px-4 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] flex flex-col relative z-50 shrink-0 border-t border-gray-200 dark:border-gray-800">
                                    {/* Reply/Edit Indicator */}
                                    {(replyingTo || editingMessage) && (
                                        <div className="flex items-center justify-between bg-gray-50 dark:bg-black/20 p-2 mb-2 rounded-lg border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 duration-200">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                                                    {editingMessage ? (isRtl ? 'تعديل الرسالة' : 'Editing Message') : (isRtl ? 'الرد على' : 'Replying to')}
                                                </span>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                                                    {renderEmojiContent((editingMessage || replyingTo)?.content || '')}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setReplyingTo(null);
                                                    setEditingMessage(null);
                                                    if (editingMessage) setInputText('');
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4 text-gray-500" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 chat-input-area">
                                    <div className="relative">
                                        <button
                                            ref={customEmojiButtonRef}
                                            onPointerDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                            }}
                                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 p-1 shrink-0"
                                            title={isRtl ? 'رموز مخصصة' : 'Custom Emojis'}
                                        >
                                            <Sparkles className="max-md:w-9 max-md:h-9 w-7 h-7" />
                                        </button>
                                        {showCustomEmojiPicker && (
                                            <div
                                                ref={customEmojiPickerRef}
                                                onPointerDown={(e) => e.preventDefault()}
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
                                        <ImageIcon className="max-md:w-9 max-md:h-9 w-7 h-7" />
                                    </button>
                                    <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-1 min-h-[42px] flex items-center">
                                        <RichTextInput
                                            ref={inputRef}
                                            value={inputText}
                                            onChange={setInputText}
                                            onKeyDown={handleKeyDown}
                                            placeholder={isRtl ? "اكتب رسالة" : "Type a message"}
                                            className="w-full bg-transparent border-none outline-none max-md:text-[18px] text-[15px] dark:text-[#e9edef]"
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
                                        <Send className={cn("max-md:w-8 max-md:h-8 w-6 h-6", isRtl ? "rotate-180" : "")} />
                                    </button>
                                    </div>
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
