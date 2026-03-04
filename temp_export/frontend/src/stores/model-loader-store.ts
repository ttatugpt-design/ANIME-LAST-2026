import { create } from 'zustand';

interface ModelLoaderState {
    queue: string[];
    currentLoadingId: string | null;
    loadedIds: Set<string>;
    addToQueue: (id: string) => void;
    removeFromQueue: (id: string) => void;
    finishLoading: (id: string) => void;
}

export const useModelLoaderStore = create<ModelLoaderState>((set, get) => ({
    queue: [],
    currentLoadingId: null,
    loadedIds: new Set(),

    addToQueue: (id) => {
        const { loadedIds, queue, currentLoadingId } = get();
        if (loadedIds.has(id)) return; // Already loaded
        if (queue.includes(id)) return; // Already in queue
        if (currentLoadingId === id) return; // Currently loading

        // Add to queue
        set((state) => {
            const newQueue = [...state.queue, id];
            // If nothing is loading, start this one immediately
            if (!state.currentLoadingId) {
                return { queue: newQueue.slice(1), currentLoadingId: newQueue[0] };
            }
            return { queue: newQueue };
        });
    },

    removeFromQueue: (id) => {
        set((state) => ({
            queue: state.queue.filter((itemId) => itemId !== id),
        }));
    },

    finishLoading: (id) => {
        set((state) => {
            const newLoaded = new Set(state.loadedIds);
            newLoaded.add(id);

            // Process next in queue
            const nextId = state.queue.length > 0 ? state.queue[0] : null;
            const remainingQueue = state.queue.length > 0 ? state.queue.slice(1) : [];

            return {
                loadedIds: newLoaded,
                currentLoadingId: nextId,
                queue: remainingQueue,
            };
        });
    },
}));
