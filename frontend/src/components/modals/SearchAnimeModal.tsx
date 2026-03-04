import { useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
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

interface SearchAnimeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SearchAnimeModal({ isOpen, onClose }: SearchAnimeModalProps) {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'ar';
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const response = await api.get('/animes/search', { params: { search: query } });
            setResults(response.data || []);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleAnimeClick = (anime: any) => {
        const lang = i18n.language;
        navigate(`/${lang}/animes/${anime.id}`);
        onClose();
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isRtl ? 'بحث عن أنمي' : 'Search Anime'}>
            {/* Search Input */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isRtl ? 'ابحث عن أنمي...' : 'Search for anime...'}
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-500 outline-none focus:border-black dark:focus:border-white transition-colors"
                        autoFocus
                    />
                    {query && (
                        <button
                            onClick={clearSearch}
                            className="absolute top-1/2 -translate-y-1/2 right-12 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={handleSearch}
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-1 text-black dark:text-white hover:opacity-70 transition-opacity"
                    >
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Results */}
            <div>
                {isSearching ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                ) : results.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {results.map((anime) => (
                            <div
                                key={anime.id}
                                className="cursor-pointer group"
                                onClick={() => handleAnimeClick(anime)}
                            >
                                <div className="aspect-[2/3] w-full overflow-hidden mb-2 relative bg-gray-200 dark:bg-[#1c1c1c]">
                                    <SpinnerImage
                                        src={getImageUrl(anime.image || anime.cover)}
                                        alt={anime.title}
                                        className="w-full h-full"
                                        imageClassName="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    {anime.rating && (
                                        <div className="absolute top-1 left-1 px-2 py-0.5 text-xs font-bold bg-black/60 text-yellow-500">
                                            ⭐ {anime.rating}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-center line-clamp-2 text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                                    {isRtl ? (anime.title || anime.title_en) : (anime.title_en || anime.title)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : query ? (
                    <div className="text-center py-12 text-gray-500">
                        {isRtl ? 'لم يتم العثور على نتائج' : 'No results found'}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        {isRtl ? 'ابحث عن أنمي لعرض النتائج' : 'Search for anime to see results'}
                    </div>
                )}
            </div>
        </Modal>
    );
}
