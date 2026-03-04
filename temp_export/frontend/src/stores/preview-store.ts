import { create } from 'zustand';

interface PreviewStore {
    previewItem: any | null;
    showPreview: (item: any) => void;
    closePreview: () => void;
}

export const usePreviewStore = create<PreviewStore>((set) => ({
    previewItem: null,
    showPreview: (item) => set({ previewItem: item }),
    closePreview: () => set({ previewItem: null }),
}));
