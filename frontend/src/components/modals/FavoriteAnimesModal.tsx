import { useState, useEffect } from 'react';
import { Search as SearchIcon, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import SpinnerImage from '@/components/ui/SpinnerImage';
import { getImageUrl } from '@/utils/image-utils';

interface Anime {
    id: number;
    title: string;
    title_en: string;
    image: string;
    cover: string;
    is_published: boolean;
}

interface FavoriteAnimesModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    currentFavorites: Anime[];
    onSaved: (newFavorites: Anime[]) => void;
}

export default function FavoriteAnimesModal({ isOpen, onClose, userId, currentFavorites, onSaved }: FavoriteAnimesModalProps) {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    
    const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initial load and sync selected IDs
    useEffect(() => {
        if (isOpen) {
            fetchAllAnimes();
            setSelectedIds(currentFavorites.map(a => a.id));
        }
    }, [isOpen, currentFavorites]);

    const fetchAllAnimes = async () => {
        setIsLoading(true);
        try {
            // Using all_admin type to fetch both published and unpublished animes as requested
            const response = await api.get('/animes', { 
                params: { 
                    type: 'all_admin',
                    limit: 1000 // Large limit to show everything or implement simple pagination if needed
                } 
            });
            setAllAnimes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch animes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (animeId: number) => {
        setSelectedIds(prev => 
            prev.includes(animeId) 
                ? prev.filter(id => id !== animeId)
                : [...prev, animeId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put(`/users/${userId}/favorites`, { anime_ids: selectedIds });
            
            // Map IDs back to full objects for immediate UI update
            const newFavorites = allAnimes.filter(a => selectedIds.includes(a.id));
            onSaved(newFavorites);
            onClose();
        } catch (error) {
            console.error('Failed to save favorites:', error);
            alert(isRtl ? 'فشل حفظ التفضيلات' : 'Failed to save favorites');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredAnimes = allAnimes.filter(anime => {
        const titleMatch = anime.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const titleEnMatch = anime.title_en?.toLowerCase().includes(searchQuery.toLowerCase());
        return titleMatch || titleEnMatch;
    });

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isRtl ? 'إدارة الأنميات المفضلة' : 'Manage Favorite Animes'}
            size="xl"
        >
            {/* Search Input */}
            <div className="mb-6 sticky top-0 bg-white dark:bg-[#18191a] z-10 py-2">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={isRtl ? 'ابحث في كافة الأنميات...' : 'Search all animes...'}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-black dark:focus:border-white transition-colors pr-12"
                    />
                    <SearchIcon className="absolute top-1/2 -translate-y-1/2 right-4 w-5 h-5 text-gray-400" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    {isRtl ? `تم تحديد ${selectedIds.length} أنمي` : `${selectedIds.length} animes selected`}
                </p>
            </div>

            {/* Anime Grid */}
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : filteredAnimes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredAnimes.map((anime) => {
                            const isSelected = selectedIds.includes(anime.id);
                            return (
                                <div
                                    key={anime.id}
                                    className="relative cursor-pointer group"
                                    onClick={() => toggleSelection(anime.id)}
                                >
                                    <div className={`aspect-[2/3] w-full overflow-hidden mb-2 relative transition-all duration-200 ${
                                        isSelected ? 'ring-4 ring-black dark:ring-white scale-[0.98]' : 'hover:scale-[1.02]'
                                    }`}>
                                        <SpinnerImage
                                            src={getImageUrl(anime.image || anime.cover)}
                                            alt={anime.title}
                                            className="w-full h-full"
                                            imageClassName="object-cover"
                                        />
                                        
                                        {/* Overlay when selected */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                <div className="bg-white text-black rounded-full p-2">
                                                    <Check className="w-6 h-6" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Tag if unpublished */}
                                        {!anime.is_published && (
                                            <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                {isRtl ? 'مسودة' : 'Draft'}
                                            </div>
                                        )}
                                    </div>
                                    <p className={`text-xs font-medium text-center line-clamp-1 transition-colors ${
                                        isSelected ? 'text-black dark:text-white font-bold' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                        {isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        {isRtl ? 'لا يوجد أنميات بهذا الاسم' : 'No animes found with this name'}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-[#2a2a2a] flex justify-end gap-4">
                <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-md font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                    {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-8 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md font-bold hover:opacity-80 transition-all flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>{isRtl ? 'جاري الحفظ...' : 'Saving...'}</span>
                        </>
                    ) : (
                        <span>{isRtl ? 'حفظ المفضلات' : 'Save Favorites'}</span>
                    )}
                </button>
            </div>
        </Modal>
    );
}
