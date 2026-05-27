import { create } from 'zustand';

interface User {
    id: number;
    name: string;
    avatar?: string;
}

interface MessagingState {
    isOpen: boolean;
    selectedUser: User | null;
    initialMessage: string | null;
    openMessagingModal: (user?: User | null, initialMessage?: string | null) => void;
    closeMessagingModal: () => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
    isOpen: false,
    selectedUser: null,
    initialMessage: null,
    openMessagingModal: (user = null, initialMessage = null) => set({ isOpen: true, selectedUser: user, initialMessage: initialMessage }),
    closeMessagingModal: () => set({ isOpen: false, selectedUser: null, initialMessage: null }),
}));
