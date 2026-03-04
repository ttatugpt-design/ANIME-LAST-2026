import { create } from 'zustand';
import api from '@/lib/api';

export type ActivityType = 'episode_view' | 'anime_view' | 'comment' | 'like' | 'reply';

export interface HistoryItem {
    id: number;
    user_id: number;
    activity_type: ActivityType;
    episode_id?: number;
    episode?: {
        id: number;
        episode_number: number;
        title?: string;
        title_en?: string;
        thumbnail?: string;
        banner?: string;
        anime_id: number;
        anime?: {
            id: number;
            title: string;
            title_en?: string;
            image?: string;
            cover?: string;
            slug?: string;
            slug_en?: string;
        };
    };
    anime_id?: number;
    anime?: {
        id: number;
        title: string;
        title_en?: string;
        image?: string;
        cover?: string;
        slug?: string;
        slug_en?: string;
    };
    comment_id?: number;
    comment?: any;
    image?: string; // Episode or anime image path
    metadata?: string;
    created_at: string;
    updated_at: string;
}

interface HistoryStore {
    history: HistoryItem[];
    isLoading: boolean;
    error: string | null;

    fetchHistory: (limit?: number, offset?: number) => Promise<void>;
    clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
    history: [],
    isLoading: false,
    error: null,

    fetchHistory: async (limit = 50, offset = 0) => {
        set({ isLoading: true, error: null });
        try {
            const response = await api.get('/history', { params: { limit, offset } });
            set({ history: response.data || [], isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
        }
    },

    clearHistory: async () => {
        try {
            await api.delete('/history');
            set({ history: [] });
        } catch (error: any) {
            set({ error: error.message });
        }
    },
}));
