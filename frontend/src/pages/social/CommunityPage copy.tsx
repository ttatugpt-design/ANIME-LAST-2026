import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { getImageUrl } from '@/utils/image-utils';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import { FriendsSidebar } from '@/components/social/FriendsSidebar';
import { CreatePostModal } from '@/components/social/CreatePostModal';
import { useAuthStore } from '@/stores/auth-store';

import { PostFeed } from '@/components/social/PostFeed';
import { NewsTicker } from '@/components/common/NewsTicker';

export default function CommunityPage() {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Simulate initial loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const getAvatarUrl = (avatar?: string) => {
        return getImageUrl(avatar);
    };

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-black" dir={isAr ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isAr ? 'المجتمع - AnimeLast' : 'Community - AnimeLast'}</title>
            </Helmet>

            {/* Sticky NewsTicker at top below header (60px) */}
            <div className="sticky top-[60px] z-[40] bg-white dark:bg-black w-full border-b border-gray-100 dark:border-white/5">
                <NewsTicker />
            </div>

            <div className="w-full min-h-screen">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible min-h-screen">
                    {/* Left Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Feed */}
                    <div className="col-span-1 lg:col-span-6 px-0 md:px-6 pb-6 space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center min-h-[60vh]">
                                <div className="relative w-20 h-20">
                                    <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-[580px] mx-auto space-y-4">
                                {/* Status Trigger */}
                                <div className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl p-4 shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a]">
                                    <div className="flex gap-3 items-center">
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-[#333]">
                                            {user?.avatar ? (
                                                <img src={getAvatarUrl(user.avatar)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                                    {user?.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setIsCreateModalOpen(true)}
                                            className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 text-start px-4 py-2.5 rounded-full transition-colors font-medium border-none outline-none"
                                        >
                                            {isAr ? `بماذا تفكر، ${user?.name || ''}؟` : `What's on your mind, ${user?.name || ''}?`}
                                        </button>
                                    </div>
                                </div>

                                {/* Community Feed */}
                                <PostFeed refreshKey={refreshKey} />
                            </div>
                        )}
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent z-30">
                        <FriendsSidebar />
                    </div>
                </div>
            </div>

            <CreatePostModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setRefreshKey(prev => prev + 1);
                }}
            />
        </div>
    );
}
