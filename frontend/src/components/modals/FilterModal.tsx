import { useState, useEffect } from 'react';
import { Filter as FilterIcon, Calendar, Type, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import SpinnerImage from '@/components/ui/SpinnerImage';

const BASE_URL = '';
const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleanPath}`;
};

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FilterModal({ isOpen, onClose }: FilterModalProps) {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'ar';

    const [categories, setCategories] = useState<any[]>([]);
    const [allEpisodes, setAllEpisodes] = useState<any[]>([]);
    const [filteredEpisodes, setFilteredEpisodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
    const [selectedLetter, setSelectedLetter] = useState<string>('');
    const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    // Fetch categories on mount
    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    // Fetch filtered episodes whenever filters change
    useEffect(() => {
        if (isOpen) {
            fetchFilteredEpisodes();
        }
    }, [isOpen, selectedCategory, selectedLetter, sortBy]);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const fetchFilteredEpisodes = async () => {
        setIsLoading(true);
        try {
            const params: any = {
                order: sortBy,
            };
            if (selectedCategory) params.category_id = selectedCategory;
            if (selectedLetter) params.letter = selectedLetter;

            const response = await api.get('/episodes', { params });
            setFilteredEpisodes(response.data || []);
        } catch (error) {
            console.error('Failed to fetch episodes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEpisodeClick = (episode: any) => {
        const animeId = episode.anime_id || episode.series?.id || episode.series_id;
        navigate(`/${i18n.language}/watch/${animeId}/${episode.episode_number}`);
        onClose();
    };

    const resetFilters = () => {
        setSelectedCategory('');
        setSelectedLetter('');
        setSortBy('latest');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isRtl ? 'تصفية الحلقات' : 'Filter Episodes'}>
            {/* Filter Options */}
            <div className="space-y-6 mb-6">
                {/* Date Sort */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-4 h-4 text-black dark:text-white" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isRtl ? 'الترتيب حسب التاريخ' : 'Sort by Date'}
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSortBy('latest')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${sortBy === 'latest'
                                ? 'bg-black dark:bg-white text-white dark:text-black'
                                : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                }`}
                        >
                            {isRtl ? 'الأحدث' : 'Latest'}
                        </button>
                        <button
                            onClick={() => setSortBy('oldest')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${sortBy === 'oldest'
                                ? 'bg-black dark:bg-white text-white dark:text-black'
                                : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                }`}
                        >
                            {isRtl ? 'الأقدم' : 'Oldest'}
                        </button>
                    </div>
                </div>

                {/* Alphabet Filter */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Type className="w-4 h-4 text-black dark:text-white" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                            {isRtl ? 'الحرف الأول' : 'First Letter'}
                        </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedLetter('')}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${selectedLetter === ''
                                ? 'bg-black dark:bg-white text-white dark:text-black'
                                : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                }`}
                        >
                            {isRtl ? 'الكل' : 'All'}
                        </button>
                        {alphabet.map((letter) => (
                            <button
                                key={letter}
                                onClick={() => setSelectedLetter(letter)}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${selectedLetter === letter
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                    }`}
                            >
                                {letter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categories Filter */}
                {categories.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Tag className="w-4 h-4 text-black dark:text-white" />
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                {isRtl ? 'التصنيفات' : 'Categories'}
                            </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedCategory('')}
                                className={`px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === ''
                                    ? 'bg-black dark:bg-white text-white dark:text-black'
                                    : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                    }`}
                            >
                                {isRtl ? 'الكل' : 'All'}
                            </button>
                            {categories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === category.id
                                        ? 'bg-black dark:bg-white text-white dark:text-black'
                                        : 'bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
                                        }`}
                                >
                                    {isRtl ? category.name : category.name_en || category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Reset Button */}
                <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-[#0a0a0a] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                >
                    {isRtl ? 'إعادة تعيين' : 'Reset Filters'}
                </button>
            </div>

            {/* Results */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
                    {isRtl ? `النتائج (${filteredEpisodes.length})` : `Results (${filteredEpisodes.length})`}
                </h3>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : filteredEpisodes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto">
                        {filteredEpisodes.map((episode) => (
                            <div
                                key={episode.id}
                                className="cursor-pointer group"
                                onClick={() => handleEpisodeClick(episode)}
                            >
                                <div className="aspect-video w-full overflow-hidden mb-2 relative bg-gray-200 dark:bg-[#1c1c1c]">
                                    <SpinnerImage
                                        src={getImageUrl(episode.thumbnail || episode.banner || episode.image)}
                                        alt={episode.title}
                                        className="w-full h-full"
                                        imageClassName="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold bg-black dark:bg-white text-white dark:text-black">
                                        {isRtl ? `حلقة ${episode.episode_number}` : `EP ${episode.episode_number}`}
                                    </div>
                                </div>
                                <p className="text-xs font-medium text-center line-clamp-2 text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {isRtl ? (episode.anime_title || episode.title) : (episode.anime_title_en || episode.title)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {isRtl ? 'لم يتم العثور على نتائج' : 'No results found'}
                    </div>
                )}
            </div>
        </Modal>
    );
}
