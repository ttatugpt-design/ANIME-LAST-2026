import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Users, MessageCircle, UserPlus, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSocketStore } from '@/stores/socket-store';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Friend {
    id: number;
    name: string;
    avatar?: string;
}

const getImageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath;
};

export const FriendsSidebar: React.FC = () => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();

    const { data: friends, isLoading } = useQuery({
        queryKey: ['friends-sidebar', user?.id],
        queryFn: async () => {
            if (!user) return [];
            const res = await api.get(`/friends/list/${user.id}`);
            return res.data.friends || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    if (!user) {
        return (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-sm border border-gray-100 dark:border-[#2a2a2a] text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    {isAr ? 'سجل الدخول لرؤية أصدقائك' : 'Login to see friends'}
                </h3>
                <Link
                    to={`/${i18n.language}/auth/login`}
                    className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold transition-colors"
                >
                    {isAr ? 'تسجيل الدخول' : 'Login'}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-sm">
                        {isAr ? 'الأصدقاء' : 'Friends'}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <button className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate(`/${i18n.language}/u/${user.id}/dashboard/friends`)}
                        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-gray-500 transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                    <div className="space-y-4 p-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#2a2a2a]" />
                                <div className="h-3 bg-gray-200 dark:bg-[#2a2a2a] rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : friends && friends.length > 0 ? (
                    <div className="space-y-1">
                        {friends.map((friend: Friend) => {
                            const isOnline = onlineUsers.has(friend.id);
                            return (
                                <div
                                    key={friend.id}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => navigate(`/${i18n.language}/u/${user.id}/dashboard/messages?userId=${friend.id}`)}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-[#222]">
                                            {friend.avatar ? (
                                                <img src={getImageUrl(friend.avatar)} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-[#333] text-gray-500 font-bold">
                                                    {friend.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {isOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1a1a1a] rounded-full" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                            {friend.name}
                                        </p>
                                        <p className={cn(
                                            "text-[10px] font-medium",
                                            isOnline ? "text-green-500" : "text-gray-500"
                                        )}>
                                            {isOnline ? (isAr ? 'نشط الآن' : 'Active now') : (isAr ? 'غير متصل' : 'Offline')}
                                        </p>
                                    </div>
                                    <button
                                        className="p-2 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all"
                                        title={isAr ? 'مراسلة' : 'Message'}
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-[#252525] rounded-full flex items-center justify-center mx-auto mb-3">
                            <Users className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-500">
                            {isAr ? 'لا يوجد أصدقاء بعد. ابدأ بإضافة البعض!' : 'No friends yet. Start adding some!'}
                        </p>
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-white/5">
                <button
                    onClick={() => navigate(`/${i18n.language}/u/${user.id}/dashboard/friends`)}
                    className="w-full py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                >
                    {isAr ? 'عرض جميع الأصدقاء' : 'View all friends'}
                </button>
            </div>
        </div>
    );
};
