import { create } from 'zustand';

interface User {
    id: number;
    name: string;
    avatar?: string;
}

interface MessagingState {
    isOpen: boolean;
    selectedUser: User | null;
    openMessagingModal: (user?: User | null) => void;
    closeMessagingModal: () => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
    isOpen: false,
    selectedUser: null,
    openMessagingModal: (user = null) => set({ isOpen: true, selectedUser: user }),
    closeMessagingModal: () => set({ isOpen: false, selectedUser: null }),
}));
