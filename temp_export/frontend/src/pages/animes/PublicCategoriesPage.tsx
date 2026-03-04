import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutGrid, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '@/lib/api';
import { NewsTicker } from '@/components/common/NewsTicker';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import Footer from '@/components/common/Footer';
import { PageLoader } from '@/components/ui/page-loader';

export default function PublicCategoriesPage() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const isRtl = i18n.language === 'ar';
    const [searchQuery, setSearchQuery] = useState('');

    const { data: categories, isLoading } = useQuery({
        queryKey: ['public-categories'],
        queryFn: async () => (await api.get('/categories')).data,
    });

    const filteredCategories = categories?.filter((cat: any) => {
        const name = cat.name?.toLowerCase() || '';
        const nameEn = cat.name_en?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return name.includes(query) || nameEn.includes(query);
    });

    const handleCategoryClick = (categoryId: number) => {
        navigate(`/${i18n.language}/browse?categoryId=${categoryId}`);
    };

    if (isLoading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col font-sans">
            <Helmet>
                <title>{isRtl ? 'تصفح التصنيفات - AnimeLast' : 'Browse Categories - AnimeLast'}</title>
            </Helmet>

            <NewsTicker />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible max-w-[1400px] mx-auto w-full">
                {/* Left Sidebar */}
                <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent">
                    <SocialNavSidebar />
                </div>

                {/* Main Content */}
                <div className="col-span-1 lg:col-span-9 flex flex-col min-h-screen">
                    {/* Hero & Search Section */}
                 

                    {/* Categories Grid */}
                    <div className="container -mt-8 mx-auto px-4 max-w-7xl py-16 flex-1">
                        <div className="flex items-center gap-3 mb-8">
                            <LayoutGrid className="w-6 h-6 text-black dark:text-white" />
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {isRtl ? 'جميع التصنيفات' : 'All Categories'}
                            </h2>
                            <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-1 rounded-sm font-mono">
                                {filteredCategories?.length || 0}
                            </span>
                        </div>

                        {filteredCategories?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredCategories.map((category: any) => (
                                    <button
                                        key={category.id}
                                        onClick={() => handleCategoryClick(category.id)}
                                        className="group relative overflow-hidden bg-white dark:bg-[#111] border border-gray-200 dark:border-[#222] hover:border-black dark:hover:border-white transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                    >
                                        {/* Category Image */}
                                        {category.image && (
                                            <div className="w-full h-32 overflow-hidden bg-gray-100 dark:bg-[#252525]">
                                                <img
                                                    src={category.image}
                                                    alt={isRtl ? category.name : (category.name_en || category.name)}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="p-6 text-start">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-black dark:group-hover:text-white transition-colors mb-2">
                                                        {isRtl ? category.name : (category.name_en || category.name)}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                        {category.description || (isRtl ? 'استكشف أنميات هذا التصنيف' : 'Explore anime in this category')}
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-[#252525] flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white transition-colors">
                                                    <ArrowRight className={`w-4 h-4 text-gray-400 group-hover:text-white dark:group-hover:text-black transition-colors ${isRtl ? 'rotate-180' : ''}`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-black dark:bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-24 text-gray-500 dark:text-gray-400">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg">{isRtl ? 'لا توجد تصنيفات مطابقة لبحثك' : 'No categories found matching your search'}</p>
                            </div>
                        )}
                    </div>
                    <Footer />
                </div>
            </div>
        </div>
    );
}
