import { create } from 'zustand';
import { useNotificationsStore } from './notifications-store';
import { useAuthStore } from './auth-store';

interface SocketStore {
    socket: WebSocket | null;
    isConnected: boolean;
    connect: (token: string) => void;
    disconnect: () => void;
    subscribe: (topic: string) => void;
    unsubscribe: (topic: string) => void;
    onlineUsers: Set<number>;
    typingStatus: Record<number, boolean>;
    sendTypingStatus: (receiverId: number, isTyping: boolean) => void;
    sendReadReceipt: (senderId: number) => void;
}

export const useSocketStore = create<SocketStore>((set, get) => ({
    socket: null,
    isConnected: false,
    onlineUsers: new Set<number>(),
    typingStatus: {},

    connect: (token: string) => {
        if (get().socket) return;


        // Determine protocol and host based on current environment
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        let backendHost = window.location.host;
        if (import.meta.env.VITE_API_URL) {
            try {
                const url = new URL(import.meta.env.VITE_API_URL);
                backendHost = url.host;
            } catch (e) {
                // If VITE_API_URL is just a path like /api, use current host
                backendHost = window.location.host;
            }
        } else if (window.location.port === '5173' || window.location.port === '3000') {
            // Heuristic for development: if on common dev ports, default to 8080
            backendHost = `${window.location.hostname}:8080`;
        }

        const socketUrl = `${protocol}//${backendHost}/api/ws?token=${encodeURIComponent(token)}`;

        const socket = new WebSocket(socketUrl);

        socket.onopen = () => {
            set({ isConnected: true });
            console.log('[Socket] Connected');
        };

        socket.onmessage = (event) => {
            const rawData = event.data;
            if (typeof rawData !== 'string') return;

            // Split by newline as backend might bundle multiple JSON objects
            const lines = rawData.split('\n').filter(line => line.trim() !== '');

            lines.forEach(line => {
                try {
                    const message = JSON.parse(line);
                    if (message.type === 'notification') {
                        // Update notifications store
                        useNotificationsStore.getState().addNotification(message.data);

                        // Fire a custom event for the popup
                        const customEvent = new CustomEvent('app:notification', {
                            detail: message.data
                        });
                        window.dispatchEvent(customEvent);
                    } else if (['chat_message', 'message_edited', 'message_deleted', 'message_reacted', 'chat_cleared', 'user_blocked', 'comment', 'comment_like'].includes(message.type)) {
                        // Dispatch global events for these notification/sync types
                        const eventName = message.type === 'user_blocked' ? 'app:user_blocked' : `app:${message.type}`;
                        const customEvent = new CustomEvent(eventName, {
                            detail: message.data
                        });
                        window.dispatchEvent(customEvent);
                    } else if (message.type === 'online_list') {
                        set({ onlineUsers: new Set(message.data) });
                    } else if (message.type === 'user_presence') {
                        const { user_id, status } = message.data;
                        set(state => {
                            const newOnline = new Set(state.onlineUsers);
                            if (status === 'online') newOnline.add(user_id);
                            else newOnline.delete(user_id);
                            return { onlineUsers: newOnline };
                        });
                    } else if (message.type === 'typing') {
                        const { sender_id, is_typing } = message.data;
                        set(state => ({
                            typingStatus: { ...state.typingStatus, [sender_id]: is_typing }
                        }));
                    } else if (message.type === 'read_receipt') {
                        // Dispatch global event for ChatPage to update UI
                        const customEvent = new CustomEvent('app:read_receipt', {
                            detail: message.data
                        });
                        window.dispatchEvent(customEvent);
                    }
                } catch (err) {
                    console.error('[Socket] parse error for line:', line, err);
                }
            });
        };

        socket.onclose = () => {
            set({ isConnected: false, socket: null });
            console.log('[Socket] Disconnected');

            // Reconnect logic: check if still authenticated
            setTimeout(() => {
                const currentToken = useAuthStore.getState().accessToken;
                if (currentToken) {
                    console.log('[Socket] Attempting to reconnect...');
                    get().connect(currentToken);
                }
            }, 5000);
        };

        socket.onerror = (err) => {
            console.error('[Socket] error:', err);
            socket.close();
        };

        set({ socket });
    },

    disconnect: () => {
        const { socket } = get();
        if (socket) {
            socket.close();
            set({ isConnected: false, socket: null });
        }
    },

    subscribe: (topic: string) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
            socket.send(JSON.stringify({ type: 'subscribe', topic }));
            console.log(`[Socket] Subscribed to ${topic}`);
        }
    },

    unsubscribe: (topic: string) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
            socket.send(JSON.stringify({ type: 'unsubscribe', topic }));
            console.log(`[Socket] Unsubscribed from ${topic}`);
        }
    },

    sendTypingStatus: (receiverId: number, isTyping: boolean) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
            socket.send(JSON.stringify({
                type: 'typing',
                receiver_id: receiverId,
                is_typing: isTyping
            }));
        }
    },

    sendReadReceipt: (senderId: number) => {
        const { socket, isConnected } = get();
        if (socket && isConnected) {
            socket.send(JSON.stringify({
                type: 'read_receipt',
                sender_id: senderId
            }));
        }
    }
}));
