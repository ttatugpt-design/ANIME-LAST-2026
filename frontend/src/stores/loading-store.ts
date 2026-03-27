import { create } from 'zustand';

interface LoadingState {
    isHomeInitialLoading: boolean;
    setHomeInitialLoading: (isLoading: boolean) => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
    isHomeInitialLoading: true, // Default to true so it starts loading immediately
    setHomeInitialLoading: (isLoading) => set({ isHomeInitialLoading: isLoading }),
}));
