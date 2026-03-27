import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { History, Users, Sparkles, Clock, Star } from 'lucide-react';
import api from '@/lib/api';
import { slugify } from '@/utils/slug';
import SpinnerImage from '@/components/ui/SpinnerImage';

interface RecentItem {
    id: number;
    title: string;
    title_ar?: string;
    image: string;
    timestamp: number;
}

import { getImageUrl } from '@/utils/image-utils';

export const SocialSidebar: React.FC = () => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const navigate = useNavigate();
    const [recentLinks, setRecentLinks] = useState<RecentItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('recent_visited_anime');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRecentLinks(parsed.slice(0, 5));
            } catch (e) {
                console.error("Failed to parse recent links", e);
            }
        }
    }, []);

    const { data: latestMembers, isLoading: membersLoading } = useQuery({
        queryKey: ['latest-members'],
        queryFn: async () => {
            const res = await api.get('/users', { params: { limit: 5 } });
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data: recentUploads } = useQuery({
        queryKey: ['recent-uploads-sidebar'],
        queryFn: async () => {
            const [animeRes, episodeRes] = await Promise.all([
                api.get('/animes/latest', { params: { limit: 1 } }),
                api.get('/episodes/latest', { params: { limit: 1 } })
            ]);
            return {
                anime: animeRes.data?.[0],
                episode: episodeRes.data?.[0]
            };
        },
        staleTime: 2 * 60 * 1000,
    });

    return (
        <div className="flex flex-col h-full font-sans">
            {/* Recent Links Section */}
            <div className="overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold font-sans text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                        {isAr ? 'روابط سريعة' : 'Recent Links'}
                    </h3>
                </div>
                <div className="p-2">
                    {recentLinks.length > 0 ? (
                        <div className="space-y-1">
                            {recentLinks.map((item) => (
                                <Link
                                    key={item.id}
                                    to={`/${i18n.language}/animes/${item.id}/${slugify(item.title)}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#222]">
                                        <img src={getImageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold font-sans text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                            {isAr ? item.title_ar || item.title : item.title}
                                        </p>
                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(item.timestamp, isAr)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-center py-6 text-gray-500 italic">
                            {isAr ? 'لا يوجد سجل تصفح حالياً' : 'No browsing history yet'}
                        </p>
                    )}
                </div>
            </div>

            {/* Latest Members Section */}
            <div className="overflow-hidden border-t border-gray-100 dark:border-white/5">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold font-sans text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                        {isAr ? 'أحدث الأعضاء' : 'Recent Members'}
                    </h3>
                </div>
                <div className="p-2">
                    {membersLoading ? (
                        <div className="space-y-3 p-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2a2a2a]" />
                                    <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-2/3" />
                                </div>
                            ))}
                        </div>
                    ) : latestMembers && latestMembers.length > 0 ? (
                        <div className="space-y-1">
                            {latestMembers.map((member: any) => (
                                <Link
                                    key={member.id}
                                    to={`/${i18n.language}/u/${member.id}/profile`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-[#222]">
                                        {member.avatar ? (
                                            <img src={getImageUrl(member.avatar)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#333] text-gray-500 font-bold font-sans">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold font-sans text-gray-900 dark:text-white truncate">
                                            {member.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500">
                                            {isAr ? 'انضم حديثاً' : 'Joined recently'}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-center py-6 text-gray-500 italic">
                            {isAr ? 'لا يوجد أعضاء جدد' : 'No new members'}
                        </p>
                    )}
                </div>
            </div>

            {/* Latest Uploads Section */}
            <div className="overflow-hidden border-t border-gray-100 dark:border-white/5">
                <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-bold font-sans text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                        {isAr ? 'آخر الرفع' : 'Latest Uploads'}
                    </h3>
                </div>
                <div className="p-3 space-y-4">
                    {/* Latest Anime */}
                    {recentUploads?.anime && (
                        <Link
                            to={`/${i18n.language}/animes/${recentUploads.anime.id}/${slugify(recentUploads.anime.title || recentUploads.anime.title_en)}`}
                            className="block group"
                        >
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
                                {isAr ? 'أحدث أنمي مضاف' : 'Latest Added Anime'}
                            </p>
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
                                <SpinnerImage
                                    src={getImageUrl(recentUploads.anime.cover || recentUploads.anime.image)}
                                    alt=""
                                    className="w-full h-full"
                                    imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2">
                                    <p className="text-xs font-bold text-white truncate">
                                        {isAr ? recentUploads.anime.title : recentUploads.anime.title_en || recentUploads.anime.title}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    )}

                    {/* Latest Episode */}
                    {recentUploads?.episode && (
                        <Link
                            to={`/${i18n.language}/watch/${recentUploads.episode.anime?.id || recentUploads.episode.anime_id}/${recentUploads.episode.episode_number}/${slugify(recentUploads.episode.anime?.title || recentUploads.episode.anime?.title_en || recentUploads.episode.title)}`}
                            className="block group"
                        >
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">
                                {isAr ? 'أحدث حلقة مضافة' : 'Latest Added Episode'}
                            </p>
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
                                <SpinnerImage
                                    src={getImageUrl(recentUploads.episode.thumbnail || recentUploads.episode.anime?.cover)}
                                    alt=""
                                    className="w-full h-full"
                                    imageClassName="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2 flex justify-between items-center">
                                    <p className="text-xs font-bold text-white truncate flex-1">
                                        {isAr ? (recentUploads.episode.anime?.title || recentUploads.episode.title) : (recentUploads.episode.anime?.title_en || recentUploads.episode.title_en || recentUploads.episode.title)}
                                    </p>
                                    <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded text-white font-black">
                                        EP {recentUploads.episode.episode_number}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

// Simple helper for time distance
function formatDistanceToNow(timestamp: number, isAr: boolean) {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000); // in seconds

    if (diff < 60) return isAr ? 'منذ ثوانٍ' : 'Just now';
    if (diff < 3600) return isAr ? `منذ ${Math.floor(diff / 60)} دقيقة` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return isAr ? `منذ ${Math.floor(diff / 3600)} ساعة` : `${Math.floor(diff / 3600)}h ago`;
    return isAr ? `منذ ${Math.floor(diff / 86400)} يوم` : `${Math.floor(diff / 86400)}d ago`;
}
