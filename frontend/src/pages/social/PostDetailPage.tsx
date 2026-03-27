import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SocialNavSidebar } from '@/components/social/SocialNavSidebar';
import { FriendsSidebar } from '@/components/social/FriendsSidebar';
import { PostCard } from '@/components/social/PostCard';
import { NewsTicker } from '@/components/common/NewsTicker';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function PostDetailPage() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const [post, setPost] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPost = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/posts/${postId}`);
                setPost(res.data);
            } catch (err: any) {
                console.error("Failed to fetch post", err);
                setError(isAr ? 'لم يتم العثور على المنشور' : 'Post not found');
            } finally {
                setIsLoading(false);
            }
        };

        if (postId) {
            fetchPost();
        }
    }, [postId, isAr]);

    return (
        <div className="min-h-screen bg-[#f0f2f5] dark:bg-black" dir={isAr ? 'rtl' : 'ltr'}>
            <Helmet>
                <title>{isAr ? 'عرض المنشور - AnimeLast' : 'View Post - AnimeLast'}</title>
            </Helmet>

            <NewsTicker />

            <div className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-visible">
                    {/* Left Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent">
                        <SocialNavSidebar />
                    </div>

                    {/* Main Content */}
                    <div className="col-span-1 lg:col-span-6 px-0 md:px-6 pb-6 space-y-4">
                        <div className="max-w-[580px] mx-auto space-y-4">
                             {isLoading ? (
                                <div className="flex items-center justify-center min-h-[40vh]">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                </div>
                            ) : error ? (
                                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 text-center shadow-sm border border-gray-100 dark:border-[#2a2a2a]">
                                    <p className="text-red-500 font-bold">{error}</p>
                                </div>
                            ) : post ? (
                                <PostCard
                                    post={post}
                                    initialShowComments={true}
                                />
                            ) : null}
                        </div>
                    </div>

                    {/* Right Sidebar */}
                    <div className="hidden lg:block lg:col-span-3 sticky top-[105px] h-[calc(100vh-105px)] overflow-y-auto custom-scrollbar bg-transparent">
                        <FriendsSidebar />
                    </div>
                </div>
            </div>
        </div>
    );
}
