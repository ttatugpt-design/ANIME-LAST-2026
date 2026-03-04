import { create } from 'zustand';
import api from '@/lib/api';

interface WatchLaterItem {
    id: number;
    user_id: number;
    anime_id?: number;
    episode_id?: number;
    anime?: any; // Define proper type if available
    episode?: any; // Define proper type if available
    created_at: string;
}

interface WatchLaterState {
    items: WatchLaterItem[];
    isLoading: boolean;
    fetchItems: () => Promise<void>;
    toggleItem: (animeId: number | null, episodeId: number | null) => Promise<boolean>;
    isSaved: (animeId: number | null, episodeId: number | null) => boolean;
}

export const useWatchLaterStore = create<WatchLaterState>((set, get) => ({
    items: [],
    isLoading: false,

    fetchItems: async () => {
        set({ isLoading: true });
        try {
            const response = await api.get('/watch-later');
            set({ items: response.data });
        } catch (error) {
            console.error('Failed to fetch watch later items', error);
        } finally {
            set({ isLoading: false });
        }
    },

    toggleItem: async (animeId, episodeId) => {
        try {
            const response = await api.post('/watch-later', {
                anime_id: animeId,
                episode_id: episodeId
            });
            const added = response.data.added;

            // Refresh items to keep state in sync (or optimistically update)
            await get().fetchItems();

            return added;
        } catch (error) {
            console.error('Failed to toggle watch later item', error);
            return false;
        }
    },

    isSaved: (animeId, episodeId) => {
        const { items } = get();
        return items.some(item => {
            if (episodeId) {
                return Number(item.episode_id) === Number(episodeId);
            }
            if (animeId) {
                // If checking for anime, ensure item is for anime (no episode_id)
                return Number(item.anime_id) === Number(animeId) && !item.episode_id;
            }
            return false;
        });
    }
}));
