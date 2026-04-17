import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send,
    X,
    MessageCircle,
    User as UserIcon,
    Check,
    CheckCheck,
    Search,
    MoreVertical,
    Sparkles,
    Image as ImageIcon,
    Loader2,
    ArrowRight,
    Reply,
    Edit2,
    Trash2,
    Smile,
    CornerDownRight,
    MoreHorizontal
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import { useMessagingStore } from '@/stores/messaging-store';
import api from '@/lib/api';
import { renderEmojiContent } from '@/utils/render-content';
import { CustomEmojiPicker } from '@/components/comments/CustomEmojiPicker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RichTextInput } from '@/components/comments/RichTextInput';
import { getImageUrl } from '@/utils/image-utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    avatar?: string;
}

interface Conversation {
    other_user: User;
    last_message: Message;
    unread_count?: number;
}


export const MessagingModal: React.FC = () => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const isRtl = i18n.language === 'ar';
    const { user: currentUser } = useAuthStore();
    const { isOpen, selectedUser, closeMessagingModal, openMessagingModal } = useMessagingStore();
    const { onlineUsers, typingStatus, sendTypingStatus, sendReadReceipt } = useSocketStore();
    
    const REACTIONS = useMemo(() => [
        { key: 'like', label: isAr ? 'أعجبني' : 'Like', gif: getImageUrl('/uploads/تفاعل البوست/أعجبني.png') },
        { key: 'love', label: isAr ? 'أحببته' : 'Love', gif: getImageUrl('/uploads/تفاعل البوست/أحببتة.png') },
        { key: 'sad', label: isAr ? 'أحزنني' : 'Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحزنني.gif') },
        { key: 'angry', label: isAr ? 'أغضبني' : 'Angry', gif: getImageUrl('/uploads/تفاعل البوست/أغضبني.gif') },
        { key: 'wow', label: isAr ? 'واوو' : 'Wow', gif: getImageUrl('/uploads/تفاعل البوست/واوو.png') },
        { key: 'haha', label: isAr ? 'اضحكني' : 'Haha', gif: getImageUrl('/uploads/تفاعل البوست/اضحكني.png') },
        { key: 'super_sad', label: isAr ? 'أحززنني جداً' : 'So Sad', gif: getImageUrl('/uploads/تفاعل البوست/أحززنني جدا.png') },
    ], [isAr]);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [showCustomEmojiPicker, setShowCustomEmojiPicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastTypingTime, setLastTypingTime] = useState(0);

    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [showReactionsFor, setShowReactionsFor] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [viewportHeight, setViewportHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 0);
    const [viewportTop, setViewportTop] = useState(0);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const customEmojiButtonRef = useRef<HTMLButtonElement>(null);
    const customEmojiPickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    // Track visual viewport for mobile keyboards
    useEffect(() => {
        if (typeof window !== 'undefined' && window.visualViewport) {
            const handleResize = () => {
                setViewportHeight(window.visualViewport?.height || window.innerHeight);
                setViewportTop(window.visualViewport?.offsetTop || 0);
            };
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
            handleResize();
            return () => {
                window.visualViewport?.removeEventListener('resize', handleResize);
                window.visualViewport?.removeEventListener('scroll', handleResize);
            };
        }
    }, []);

    // Scroll to bottom when typing status changes
    useEffect(() => {
        if (selectedUser && typingStatus[selectedUser.id] && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [typingStatus, selectedUser]);

    // Initial fetch
    useEffect(() => {
        if (isOpen && currentUser) {
            fetchConversations();
        }
    }, [isOpen, currentUser]);

    const fetchConversations = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data.conversations || []);
        } catch (err) {
            console.error('Failed to fetch conversations', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle selected user change
    useEffect(() => {
        if (selectedUser) {
            setPage(0);
            setHasMore(true);
            fetchMessages(selectedUser.id, 0);
            
            // Initial read
            sendReadReceipt(selectedUser.id);
            window.dispatchEvent(new CustomEvent('app:conversation_read', { detail: { userId: selectedUser.id } }));

            setConversations(prev => prev.map(conv => {
                if (conv.other_user?.id === selectedUser.id) {
                    return { ...conv, unread_count: 0 };
                }
                return conv;
            }));

            // Focus the input field after selection/mounting
            setTimeout(() => {
                if (window.innerWidth >= 768) {
                    inputRef.current?.focus();
                }
            }, 300);
        }
    }, [selectedUser]);

    const fetchMessages = async (userId: number, pageNum: number = 0) => {
        setIsLoadingMessages(pageNum === 0);
        try {
            const limit = 50;
            const offset = pageNum * limit;
            const res = await api.get(`/messages/history/${userId}?limit=${limit}&offset=${offset}`);
            
            const newMessages = res.data.messages || [];
            
            if (newMessages.length < limit) {
                setHasMore(false);
            }
            
            if (pageNum === 0) {
                setMessages(newMessages);
                scrollToBottom(true);
            } else {
                // Save current scroll height to maintain position
                const prevHeight = scrollContainerRef.current?.scrollHeight || 0;
                setMessages(prev => [...newMessages, ...prev]);
                
                // Adjust scroll position after render
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight - prevHeight;
                    }
                }, 0);
            }
        } catch (err) {
            console.error('Failed to fetch messages', err);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            if (scrollContainerRef.current.scrollTop === 0 && hasMore && !isLoadingMessages) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchMessages(selectedUser!.id, nextPage);
            }
        }
    };

    const scrollToBottom = (force = true) => {
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: force ? 'auto' : 'smooth'
                });
            }
        }, 100);
    };

    // Real-time handling (copied from ChatPage.tsx)
    useEffect(() => {
        if (!isOpen) return;

        const handleNewMessage = (event: CustomEvent) => {
            const newMsg = event.detail as Message;
            const otherUserId = newMsg.sender_id === currentUser?.id ? newMsg.receiver_id : newMsg.sender_id;

            if (selectedUser && (newMsg.sender_id === selectedUser.id || newMsg.receiver_id === selectedUser.id)) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                scrollToBottom(false);

                if (newMsg.sender_id === selectedUser.id) {
                    sendReadReceipt(selectedUser.id);
                    window.dispatchEvent(new CustomEvent('app:conversation_read', { detail: { userId: selectedUser.id } }));
                }
            }

            setConversations(prev => {
                const existingIdx = prev.findIndex(c => c.other_user?.id === otherUserId);
                if (existingIdx !== -1) {
                    const existing = prev[existingIdx];
                    const updatedConv = {
                        ...existing,
                        last_message: newMsg,
                        unread_count: (selectedUser?.id === otherUserId) ? 0 : ((existing.unread_count || 0) + (newMsg.sender_id === currentUser?.id ? 0 : 1))
                    };
                    const filtered = prev.filter((_, i) => i !== existingIdx);
                    return [updatedConv, ...filtered];
                } else {
                    const otherUser = newMsg.sender_id === currentUser?.id ? newMsg.receiver : newMsg.sender;
                    if (!otherUser) return prev;
                    return [{
                        other_user: otherUser,
                        last_message: newMsg,
                        unread_count: (selectedUser?.id === otherUserId) ? 0 : (newMsg.sender_id === currentUser?.id ? 0 : 1)
                    }, ...prev];
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

        window.addEventListener('app:chat_message' as any, handleNewMessage as any);
        window.addEventListener('app:read_receipt' as any, handleReadReceipt as any);

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
    }, [isOpen, selectedUser, currentUser?.id]);

    // Handle mobile back button (popstate)
    useEffect(() => {
        if (isOpen) {
            window.history.pushState({ modalOpen: true }, '');
            const handlePopState = () => {
                if (selectedUser) {
                    openMessagingModal(null);
                    // Push state again so the next back press will close the modal
                    window.history.pushState({ modalOpen: true }, '');
                } else {
                    closeMessagingModal();
                }
            };
            window.addEventListener('popstate', handlePopState);
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
    }, [isOpen, selectedUser, closeMessagingModal, openMessagingModal]);

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
            toast.error(isAr ? 'فشل التفاعل' : 'Failed to react');
            // Rollback optimistic update on error
            setMessages(prev => prev.map(m => {
                if (m.id === messageId) return currentMsg!;
                return m;
            }));
        }
    };

    const handleDeleteMessage = async (messageId: number) => {
        if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الرسالة؟' : 'Are you sure you want to delete this message?')) return;
        try {
            await api.delete(`/messages/${messageId}`);
        } catch (err) {
            toast.error(isAr ? 'فشل الحذف' : 'Failed to delete');
        }
    };

    const handleClearChat = async () => {
        if (!selectedUser) return;
        if (!window.confirm(isAr ? 'هل أنت متأكد من مسح المحادثة بالكامل؟' : 'Are you sure you want to clear the entire chat?')) return;
        try {
            await api.delete(`/messages/conversation/${selectedUser.id}`);
        } catch (err) {
            toast.error(isAr ? 'فشل مسح المحادثة' : 'Failed to clear chat');
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
        sendTypingStatus(selectedUser.id, false);
        
        setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 10);

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
        } catch (err) {
            toast.error(isAr ? 'فشل العملية' : 'Operation failed');
            setInputText(text);
        }
    };


    // Disable background scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
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

    // Click outside listeners
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            
            // Emoji Picker
            if (showCustomEmojiPicker && customEmojiPickerRef.current && !customEmojiPickerRef.current.contains(target) && !customEmojiButtonRef.current?.contains(target)) {
                setShowCustomEmojiPicker(false);
            }

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
            const isMenuClick = (target as HTMLElement).closest('[role="menu"]'); // Dropdown menu
            const isMoreButtonClick = (target as HTMLElement).closest('.more-options-trigger');
            
            // Use setTimeout to ensure we don't interfere with dropdown open events
            setTimeout(() => {
                if (!isInputClick && !isMenuClick && !isMoreButtonClick) {
                    if (replyingTo || editingMessage) {
                        setReplyingTo(null);
                        setEditingMessage(null);
                        setInputText('');
                    }
                }
            }, 0);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCustomEmojiPicker, showReactionsFor, replyingTo, editingMessage]);

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        return conversations.filter(c => c.other_user?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [conversations, searchQuery]);

    const formatMessageTime = (dateStr: string) => {
        try {
            return format(new Date(dateStr), 'HH:mm');
        } catch {
            return '';
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-white/80 dark:bg-black/80 px-2 pt-2 pb-0 md:p-4 pointer-events-auto backdrop-blur-sm"
            style={{ 
                transform: viewportTop > 0 && window.innerWidth < 768 ? `translateY(${viewportTop}px)` : 'none' 
            }}
            onClick={closeMessagingModal}
        >
            <div 
                style={{ 
                    height: viewportHeight > 0 && window.innerWidth < 768 ? `${viewportHeight - 8}px` : '90vh'
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#111b21] w-full max-w-[900px] max-h-[800px] rounded-t-xl rounded-b-none md:rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative border border-gray-200 dark:border-[#333] animate-in zoom-in-95 duration-200"
            >
                {/* Sidebar - Conversations */}
                <div className={cn(
                    "w-full md:w-[350px] lg:w-[400px] flex flex-col border-gray-100 dark:border-gray-800 min-h-0",
                    isRtl ? "border-l" : "border-r",
                    selectedUser ? "hidden md:flex" : "flex"
                )}>
                    {/* Sidebar Header */}
                    <div className="h-[60px] bg-white dark:bg-[#202c33] shrink-0 flex items-center justify-between px-4 border-b border-gray-100 dark:border-[#2a2a2a]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border border-gray-100 dark:border-[#333]">
                                <img src={getImageUrl(currentUser?.avatar)} alt="Me" className="w-full h-full object-cover" />
                            </div>
                            <h2 className="font-bold text-gray-900 dark:text-white">
                                {isRtl ? 'المراسلات' : 'Messaging'}
                            </h2>
                        </div>
                        <button 
                            onClick={closeMessagingModal}
                            className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[#3a3b3c] rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Search Field */}
                    <div className="p-2 shrink-0 border-b border-gray-50 dark:border-gray-800">
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

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#111b21]">
                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                <p className="text-sm text-gray-500 font-medium">
                                    {isRtl ? 'جاري تحميل المراسلات...' : 'Loading conversations...'}
                                </p>
                            </div>
                        ) : filteredConversations.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredConversations.map((conv) => (
                                    <div
                                        key={conv.other_user?.id}
                                        onClick={() => openMessagingModal(conv.other_user)}
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
                                                <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111b21] rounded-full" />
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
                                                    <span className="text-[11px] text-gray-500">
                                                        {formatMessageTime(conv.last_message?.created_at)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className={cn(
                                                    "text-[14px] truncate text-gray-500 dark:text-[#8696a0] [&_img]:w-4 [&_img]:h-4 [&_img]:inline-block",
                                                    (conv.unread_count || 0) > 0 && "font-bold text-gray-700 dark:text-[#e9edef]"
                                                )}>
                                                    {renderEmojiContent(conv.last_message?.content || '')}
                                                </p>
                                                {(conv.unread_count || 0) > 0 && (
                                                    <span className="bg-green-500 text-white text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold px-1">
                                                        {conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
                                <MessageCircle className="w-12 h-12 opacity-20 mb-4" />
                                <p className="text-sm font-medium">
                                    {isRtl ? 'لا توجد محادثات' : 'No conversations yet'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={cn(
                    "flex-1 flex flex-col bg-[#e5ddd5] dark:bg-[#0b141a] relative min-h-0 min-w-0",
                    !selectedUser ? "hidden md:flex" : "flex"
                )}>
                    {selectedUser ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-[60px] bg-white dark:bg-[#202c33] shrink-0 flex items-center justify-between px-4 sticky top-0 border-b border-gray-200 dark:border-gray-800 z-20 w-full">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => openMessagingModal(null)}
                                        className="md:hidden p-1 text-gray-500"
                                    >
                                        <ArrowRight className={cn("w-6 h-6", !isRtl && "rotate-180")} />
                                    </button>
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shadow-sm border border-black/5">
                                            <img src={getImageUrl(selectedUser.avatar)} alt={selectedUser.name} className="w-full h-full object-cover" />
                                        </div>
                                        {onlineUsers.has(selectedUser.id) && (
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-[#202c33] rounded-full ring-1 ring-white/50" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-[#111b21] dark:text-[#e9edef] truncate">{selectedUser.name}</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            {onlineUsers.has(selectedUser.id) 
                                                ? (isRtl ? 'نشط الآن' : 'Active and online') 
                                                : (isRtl ? 'غير متصل' : 'Offline')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-gray-500">
                                    <Search className="w-5 h-5 cursor-pointer hover:text-gray-700 dark:hover:text-white transition-colors" />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 hover:text-gray-700 dark:hover:text-white transition-colors">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="dark:bg-[#202c33] dark:border-white/5">
                                            <DropdownMenuItem 
                                                onClick={handleClearChat}
                                                className="gap-2 cursor-pointer text-red-500 focus:text-red-500 font-bold"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {isAr ? 'مسح المحادثة' : 'Clear Chat'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <button onClick={closeMessagingModal} className="hidden md:block p-2 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List Area */}
                            <div 
                                ref={scrollContainerRef}
                                onScroll={handleScroll}
                                className="flex-1 overflow-y-auto px-4 pt-6 pb-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-[url('https://raw.githubusercontent.com/Tichif/whatsapp-clone-react/master/public/whatsapp_bg_dark.png')] custom-scrollbar relative overscroll-contain touch-pan-y"
                            >
                                    {isLoadingMessages ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full min-h-[400px]">
                                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                            <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                                                {isRtl ? 'جاري تحميل الرسائل...' : 'Loading messages...'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-full space-y-3 px-2 flex flex-col">
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
                                                        {/* Hover Actions Menu (Messenger style) - Moved to inner side */}
                                                        <div className={cn(
                                                            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-1 rounded-full bg-white dark:bg-[#3e4042] shadow-md border border-gray-100 dark:border-white/10 opacity-0 group-hover:opacity-100 transition-all z-30",
                                                            isMe 
                                                                ? (isRtl ? "left-[calc(100%+8px)]" : "right-[calc(100%+8px)]") 
                                                                : (isRtl ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]")
                                                        )}>
                                                            <button 
                                                                onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-yellow-500 transition-colors smile-button-trigger"
                                                                title={isAr ? 'تفاعل' : 'React'}
                                                            >
                                                                <Smile className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => startReply(msg)}
                                                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-blue-500 transition-colors"
                                                                title={isAr ? 'رد' : 'Reply'}
                                                            >
                                                                <Reply className="w-4 h-4" />
                                                            </button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors more-options-trigger">
                                                                        <MoreHorizontal className="w-4 h-4" />
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent 
                                                                    side={isMe ? (isRtl ? "right" : "left") : (isRtl ? "left" : "right")} 
                                                                    align="center" 
                                                                    sideOffset={12}
                                                                    className="dark:bg-[#242526] dark:border-white/10 min-w-[150px] shadow-2xl p-1.5 z-[9999]"
                                                                >
                                                                    <DropdownMenuItem onClick={() => startReply(msg)} className="gap-2 cursor-pointer dark:text-white text-base">
                                                                        <Reply className="w-4 h-4" /> {isAr ? 'رد' : 'Reply'}
                                                                    </DropdownMenuItem>
                                                                    {isMe && (
                                                                        <DropdownMenuItem onClick={() => startEditing(msg)} className="gap-2 cursor-pointer dark:text-white text-base">
                                                                            <Edit2 className="w-4 h-4" /> {isAr ? 'تعديل' : 'Edit'}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {(isMe || (selectedUser && msg.sender_id === selectedUser.id)) && (
                                                                        <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id)} className="gap-2 cursor-pointer text-red-500 focus:text-red-500 font-bold text-base">
                                                                            <Trash2 className="w-4 h-4" /> {isAr ? 'حذف' : 'Delete'}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>


                                                        <div className={cn(
                                                            "relative min-w-[60px] max-w-full px-4 py-2 transition-all shadow-sm",
                                                            isMe 
                                                                ? "bg-[#0084ff] text-white rounded-[18px] rounded-br-[4px]" 
                                                                : "bg-[#f0f0f0] dark:bg-[#3e4042] text-[#050505] dark:text-[#e4e6eb] rounded-[18px] rounded-bl-[4px]",
                                                            isRtl ? (isMe ? "rounded-br-[18px] rounded-bl-[4px]" : "rounded-bl-[18px] rounded-br-[4px]") : ""
                                                        )}>
                                                            {/* Reaction Picker Popup - Moved INSIDE for precision */}
                                                            {showReactionsFor === msg.id && (
                                                                <div className={cn(
                                                                    "absolute bottom-[calc(100%+8px)] z-[100] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 reaction-picker-container",
                                                                    isMe 
                                                                        ? (isRtl ? "left-0" : "right-0") 
                                                                        : (isRtl ? "right-0" : "left-0")
                                                                )}>
                                                                    <div className="flex bg-white dark:bg-[#242526] rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-white/10 p-1 gap-1 items-center">
                                                                        {REACTIONS.map(r => (
                                                                            <button 
                                                                                key={r.key} 
                                                                                onClick={(e) => { e.stopPropagation(); handleReact(msg.id, r.key); }}
                                                                                className="w-9 h-9 hover:scale-125 transition-transform duration-200 p-1 flex items-center justify-center"
                                                                                title={r.label}
                                                                            >
                                                                                <img src={r.gif} alt={r.label} loading="eager" fetchpriority="high" className="w-7 h-7 object-contain" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Quoted Message (Reply) */}
                                                            {msg.parent && (
                                                                <div className={cn(
                                                                    "mb-2 p-2 rounded-lg border-l-4 text-[13px] opacity-90 cursor-pointer transition-colors",
                                                                    isMe ? "bg-white/10 border-white/40" : "bg-black/5 dark:bg-black/20 border-blue-500"
                                                                )}
                                                                    onClick={() => {
                                                                        const el = document.getElementById(`msg-${msg.parent_id}`);
                                                                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                        el?.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
                                                                        setTimeout(() => el?.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2'), 2000);
                                                                    }}
                                                                >
                                                                    <div className={cn("font-bold text-xs mb-0.5", isMe ? "text-white/80" : "text-blue-600 dark:text-blue-400")}>
                                                                        {msg.parent.sender_id === currentUser?.id ? (isAr ? 'أنت' : 'You') : msg.parent.sender?.name}
                                                                    </div>
                                                                    <div className={cn("truncate italic", isMe ? "text-white/70" : "text-gray-600 dark:text-gray-300")}>
                                                                        {renderEmojiContent(msg.parent.content)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="text-[17px] leading-[1.4] break-words whitespace-pre-wrap [&_img]:w-6 [&_img]:h-6 [&_img]:inline-block font-bold">
                                                                {renderEmojiContent(msg.content)}
                                                                {msg.is_edited && (
                                                                    <span className={cn("text-[10px] italic mx-1 opacity-60", isMe ? "text-white" : "text-gray-400")}>
                                                                        ({isAr ? 'معدلة' : 'edited'})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className={cn("flex justify-end items-center gap-1.5 mt-1", isMe ? "text-white/60" : "text-gray-400")}>
                                                                <span className="text-[10px] font-medium">
                                                                    {formatMessageTime(msg.created_at)}
                                                                </span>
                                                                {isMe && (
                                                                    msg.is_read 
                                                                        ? <CheckCheck className="w-3 h-3 text-white" /> 
                                                                        : <Check className="w-3 h-3 text-white/60" />
                                                                )}
                                                            </div>

                                                            {/* Reactions Display - Refined positioning */}
                                                            {msg.reactions && msg.reactions.length > 0 && (
                                                                <div className={cn(
                                                                    "absolute -bottom-4 flex items-center bg-white dark:bg-[#3e4042] rounded-full py-0.5 px-1.5 shadow-md border border-gray-100 dark:border-white/10 z-[10] cursor-pointer hover:scale-105 transition-transform",
                                                                    isMe ? "left-2" : "right-2"
                                                                )}>
                                                                    <div className="flex -space-x-1 items-center">
                                                                        {Array.from(new Set(msg.reactions.map(r => r.type))).slice(0, 3).map(type => {
                                                                            const reaction = REACTIONS.find(r => r.key === type);
                                                                            return (
                                                                                <img key={type} src={reaction?.gif} alt={type} className="w-4 h-4 rounded-full border border-white dark:border-[#3e4042]" />
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    {msg.reactions.length > 1 && (
                                                                        <span className="text-[11px] text-[#65676b] dark:text-[#b0b3b8] ml-1 font-semibold leading-none">
                                                                            {msg.reactions.length}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Typing Indicator Bubble (Inside Scroll Container) */}
                                    {selectedUser && typingStatus[selectedUser.id] && (
                                        <div className={cn(
                                            "flex gap-2 mt-4 mb-2 opacity-70 animate-in fade-in slide-in-from-bottom-2 duration-300 w-fit max-w-[92%] sm:max-w-[80%]",
                                            isRtl ? "ml-auto" : "mr-auto"
                                        )}>
                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0 shadow-sm mt-auto mb-1">
                                                <img src={getImageUrl(selectedUser.avatar)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="bg-[#f0f0f0]/60 dark:bg-[#3e4042]/60 backdrop-blur-sm px-4 py-2 rounded-[18px] rounded-tl-[4px] shadow-sm flex items-center gap-2">
                                                <div className="flex gap-1.5 h-2 items-center">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                                    {selectedUser.name} {isAr ? 'يكتب...' : 'is typing...'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} className="h-4" />
                                </div>

                             {/* Reply/Edit Indicator */}
                             {(replyingTo || editingMessage) && (
                                 <div className="chat-input-area bg-white dark:bg-[#202c33] px-4 py-2 border-l-4 border-blue-500 animate-in slide-in-from-bottom-4 flex items-center justify-between border-t border-black/5 z-20">
                                     <div className="flex items-center gap-3">
                                         <div className="p-2 bg-blue-500/10 rounded-lg">
                                             {editingMessage ? <Edit2 className="w-4 h-4 text-blue-500" /> : <Reply className="w-4 h-4 text-blue-500" />}
                                         </div>
                                         <div className="min-w-0">
                                             <p className="text-xs font-bold text-blue-500">
                                                 {editingMessage ? (isAr ? 'تعديل الرسالة' : 'Editing Message') : (isAr ? `الرد على ${replyingTo?.sender_id === currentUser?.id ? 'نفسك' : replyingTo?.sender?.name}` : `Replying to ${replyingTo?.sender_id === currentUser?.id ? 'yourself' : replyingTo?.sender?.name}`)}
                                             </p>
                                             <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[400px]">
                                                 {renderEmojiContent((editingMessage || replyingTo)?.content || '')}
                                             </p>
                                         </div>
                                     </div>
                                     <button 
                                        onClick={() => { setReplyingTo(null); setEditingMessage(null); setInputText(''); }}
                                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                                     >
                                         <X className="w-4 h-4 text-gray-500" />
                                     </button>
                                 </div>
                             )}

                            {/* Chat Input */}
                            <div className="chat-input-area bg-white dark:bg-[#202c33] px-3 md:px-4 py-2 flex items-center gap-2 md:gap-4 shrink-0 border-t border-gray-100 dark:border-gray-800 relative z-20">
                                <div className="relative">
                                    <button 
                                        ref={customEmojiButtonRef}
                                        onClick={() => {
                                            setShowCustomEmojiPicker(!showCustomEmojiPicker);
                                            inputRef.current?.focus();
                                        }}
                                        className="text-gray-500 hover:text-blue-500 p-2 shrink-0 transition-colors"
                                    >
                                        <Smile className="w-7 h-7" />
                                    </button>
                                    {showCustomEmojiPicker && (
                                        <div 
                                            ref={customEmojiPickerRef}
                                            className="absolute bottom-full mb-2 z-[100] shadow-2xl"
                                        >
                                            <CustomEmojiPicker 
                                                onEmojiClick={(url) => {
                                                    inputRef.current?.insertEmoji(url);
                                                    inputRef.current?.focus();
                                                }} 
                                                onClose={() => setShowCustomEmojiPicker(false)} 
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <button className="hidden sm:block text-gray-500 hover:text-blue-500 p-2 shrink-0 transition-colors">
                                    <ImageIcon className="w-7 h-7" />
                                </button>
                                
                                <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-xl px-4 py-1.5 flex items-center shadow-inner">
                                    <RichTextInput
                                        ref={inputRef}
                                        value={inputText}
                                        onChange={setInputText}
                                        onEnter={sendMessage}
                                        placeholder={isRtl ? "اكتب رسالة" : "Type a message"}
                                        className="w-full bg-transparent border-none outline-none text-[16px] dark:text-[#e9edef] font-bold"
                                    />
                                </div>

                                <button 
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={sendMessage}
                                    disabled={!inputText.trim()}
                                    className={cn(
                                        "p-2.5 rounded-full transition-all shrink-0",
                                        inputText.trim() 
                                            ? "text-blue-500 hover:bg-blue-50 scale-110" 
                                            : "text-gray-400 cursor-default"
                                    )}
                                >
                                    <Send className={cn("w-6 h-6", isRtl && "rotate-180")} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-[#222e35] text-center p-8">
                            <div className="w-24 h-24 mb-6 text-blue-500 opacity-20">
                                <MessageCircle className="w-full h-full" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-700 dark:text-white uppercase tracking-tighter mb-4">
                                {isRtl ? 'كرانشي رول مراسلات' : 'Crunchyroll Messaging'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm font-medium leading-relaxed">
                                {isRtl 
                                    ? 'تواصل مع أصدقائك في الوقت الفعلي. أرسل نصوصاً، رموزاً تعبيرية مخصصة، والمزيد.' 
                                    : 'Connect with your friends in real-time. Send texts, custom emojis, and more.'}
                            </p>
                            <div className="mt-12 text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] border border-blue-500/20 px-4 py-2 rounded-full">
                                {isRtl ? 'مشفر بأمان' : 'Safely Encrypted'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
