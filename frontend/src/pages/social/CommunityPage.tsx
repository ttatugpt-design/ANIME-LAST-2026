import React, { useState } from 'react';
import { getImageUrl } from '@/utils/image-utils';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { FriendsSidebar } from '@/components/social/FriendsSidebar';
import { DashboardSidebar } from '@/components/social/DashboardSidebar';
import { CreatePostModal } from '@/components/social/CreatePostModal';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';

import { PostFeed } from '@/components/social/PostFeed';


export default function CommunityPage() {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const getAvatarUrl = (avatar?: string) => {
        return getImageUrl(avatar);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black" dir={isAr ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isAr ? 'المجتمع - AnimeLast' : 'Community - AnimeLast'}</title>
            </Helmet>

            <div className="w-full min-h-screen">
                <div className="flex flex-col flex-1 lg:flex-row">
                    {/* Left Sidebar - Dashboard Style */}
                    <aside className="flex-shrink-0 hidden bg-white border-l border-gray-100 lg:block w-72 dark:border-white/10 dark:bg-black">
                        <div className="sticky top-[60px] h-[calc(100vh-60px)] shadow-sm">
                            <DashboardSidebar />
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 min-w-0">
                        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-9 gap-0 min-h-screen">
                            {/* Main Feed */}
                            <div className="col-span-1 px-0 pb-6 space-y-2 lg:col-span-6 md:px-6 md:space-y-4">
                                <div className="max-w-[580px] mx-auto space-y-2 md:space-y-4">
                                    {/* Status Trigger */}
                                    <div className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl p-4 shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a]">
                                        <div className="flex items-center justify-center gap-3">
                                            {user && (
                                                <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 overflow-hidden border border-gray-100 dark:border-[#333]">
                                                    {user.avatar ? (
                                                        <img src={getAvatarUrl(user.avatar)} alt="" className="object-cover w-full h-full" />
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full font-bold text-white">
                                                            {user.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (user) {
                                                        setIsCreateModalOpen(true);
                                                    } else {
                                                        navigate(`/${i18n.language || 'ar'}/auth/login`);
                                                    }
                                                }}
                                                className={`flex-1 bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 dark:text-gray-400 text-center px-4 py-2.5 rounded-full transition-colors font-medium border-none outline-none cursor-pointer shadow-sm`}
                                            >
                                                {user 
                                                    ? (isAr ? `بماذا تفكر، ${user.name}؟` : `What's on your mind, ${user.name}?`)
                                                    : (isAr ? 'يجب تسجيل الدخول لكي تستطيع النشر على الموقع' : 'You must log in to post on the site')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Community Feed */}
                                    <PostFeed refreshKey={refreshKey} />
                                </div>
                            </div>

                            {/* Right Sidebar */}
                            <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-white dark:bg-black z-30">
                                <FriendsSidebar />
                            </div>
                        </div>
                    </main>
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
