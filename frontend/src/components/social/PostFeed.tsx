import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PostCard } from './PostCard';
import api from '@/lib/api';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { Post } from '@/types/models';

interface PostFeedProps {
    refreshKey?: number;
}

export const PostFeed: React.FC<PostFeedProps> = ({ refreshKey }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '100px',
    });

    const fetchPosts = useCallback(async (pageNum: number, isInitial = false) => {
        if (isInitial) setIsLoading(true);
        else setIsMoreLoading(true);

        try {
            const res = await api.get('/posts', {
                params: {
                    page: pageNum,
                    limit: 10
                }
            });

            const newPosts = res.data.data || [];
            if (isInitial) {
                setPosts(newPosts);
            } else {
                setPosts(prev => [...prev, ...newPosts]);
            }

            setHasMore(res.data.has_more);
        } catch (error) {
            console.error("Failed to fetch posts", error);
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPosts(1, true);
        setPage(1);
    }, [refreshKey, fetchPosts]);

    useEffect(() => {
        if (inView && hasMore && !isMoreLoading && !isLoading) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPosts(nextPage);
        }
    }, [inView, hasMore, isMoreLoading, isLoading, page, fetchPosts]);

    const handleDelete = (id: number) => {
        setPosts(prev => prev.filter(p => p.id !== id));
    };

    if (isLoading) {
        return (
            <div className="space-y-0 md:space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white dark:bg-[#1a1a1a] rounded-none md:rounded-xl shadow-sm border-y md:border border-gray-100 dark:border-[#2a2a2a] animate-pulse overflow-hidden">
                        {/* Skeleton Header */}
                        <div className="p-3 flex justify-between items-start">
                            <div className="flex gap-2">
                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333]" />
                                <div className="space-y-1.5 pt-0.5">
                                    <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-24" />
                                    <div className="h-2 bg-gray-200 dark:bg-[#2a2a2a] rounded w-16" />
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a]" />
                        </div>
                        
                        {/* Skeleton Content */}
                        <div className="px-4 pb-3 space-y-2">
                            <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-full" />
                            <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-5/6" />
                        </div>

                        {/* Skeleton Media area */}
                        <div className="w-full aspect-video bg-gray-100 dark:bg-[#111]" />

                        {/* Skeleton Stats/Actions */}
                        <div className="p-3 border-t border-gray-50 dark:border-[#222] flex justify-between">
                            <div className="flex gap-4">
                                <div className="h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded w-12" />
                                <div className="h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded w-12" />
                            </div>
                            <div className="h-4 bg-gray-200 dark:bg-[#2a2a2a] rounded w-12" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-12 shadow-sm border border-gray-100 dark:border-[#2a2a2a] text-center">
                <div className="w-20 h-20 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <LayoutGrid className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {isAr ? 'لا توجد منشورات حتى الآن' : 'No posts yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                    {isAr ? 'كن أول من ينشر في المجتمع!' : 'Be the first one to post in the community!'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-0 md:space-y-6">
            {posts.map(post => (
                <PostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDelete}
                />
            ))}

            {hasMore && (
                <div ref={ref} className="flex justify-center py-6">
                    <Loader2 className="w-12 h-12 animate-spin text-black dark:text-gray-400" />
                </div>
            )}

            {!hasMore && posts.length > 0 && (
                <div className="text-center py-10 opacity-50 font-bold text-gray-500">
                    {isAr ? 'لقد شاهدت كل شيء!' : "You've caught up!"}
                </div>
            )}
        </div>
    );
};
