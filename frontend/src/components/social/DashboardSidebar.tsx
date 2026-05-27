import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Settings, Bookmark, History, Bell, BarChart3, Activity, Pen, List, Users, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { getImageUrl } from '@/utils/image-utils';
import api from '@/lib/api';

export const DashboardSidebar: React.FC<{ noTopSpace?: boolean }> = ({ noTopSpace }) => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';
    const lang = i18n.language;
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { unreadCount } = useNotificationsStore();
    const [stats, setStats] = useState({ history_count: 0, watch_later_count: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/user/stats');
                setStats({
                    history_count: response.data.history_count || 0,
                    watch_later_count: response.data.watch_later_count || 0
                });
            } catch (error) {
                console.error('Failed to fetch user stats', error);
            }
        };
        if (user) fetchStats();
    }, [user]);

    const getAvatarUrl = (avatar?: string) => getImageUrl(avatar);

    const baseDashboardPath = `/${lang}/u/${user?.id}/dashboard`;

    interface SidebarItem {
        title: string;
        href: string;
        icon: React.ElementType<{ className?: string }>;
        end?: boolean;
        count?: number;
    }

    const sidebarItems: { group: number; items: SidebarItem[] }[] = [
        {
            group: 1,
            items: [
                { title: isAr ? 'الإعدادات' : 'Settings', href: `${baseDashboardPath}/settings`, icon: Settings },
                { title: isAr ? 'معلومات الحساب' : 'Account Info', href: baseDashboardPath, icon: User, end: true }
            ]
        },
        {
            group: 2,
            items: [
                { title: isAr ? 'السجل' : 'History', href: `${baseDashboardPath}/history`, icon: History, count: stats.history_count },
                { title: isAr ? 'قائمة المشاهدة' : 'Watchlist', href: `${baseDashboardPath}/library`, icon: Bookmark, count: stats.watch_later_count },
                { title: isAr ? 'قوائم كرانشي' : 'Crunchy Lists', href: `${baseDashboardPath}/library`, icon: List }
            ]
        },
        {
            group: 3,
            items: [
                { title: isAr ? 'إشعارات' : 'Notifications', href: `${baseDashboardPath}/notifications`, icon: Bell, count: unreadCount },
                { title: isAr ? 'المراسلات' : 'Messages', href: `${baseDashboardPath}/messages`, icon: MessageCircle },
                { title: isAr ? 'الأصدقاء' : 'Friends', href: `${baseDashboardPath}/friends`, icon: Users },
                { title: isAr ? 'الإحصائيات' : 'Statistics', href: `${baseDashboardPath}/stats`, icon: BarChart3 },
                { title: isAr ? 'التفاعلات' : 'Interactions', href: `${baseDashboardPath}/interactions`, icon: Activity }
            ]
        }
    ];

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-4">
                    {isAr ? 'سجل دخولك للوصول إلى لوحة التحكم' : 'Log in to access your dashboard'}
                </p>
                <button
                    onClick={() => navigate(`/${lang}/auth/login`)}
                    className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:opacity-80 transition-opacity"
                >
                    {isAr ? 'تسجيل الدخول' : 'Log In'}
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Profile Header */}
            <div className={cn("border-b border-gray-100 dark:border-white/10 shrink-0", noTopSpace ? "p-4 pt-0 mt-0" : "p-4 mt-4")}>
                <div className="flex items-center justify-between">
                    <Link
                        to={`${baseDashboardPath}/edit`}
                        className="p-2 text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <Pen className="w-5 h-5" />
                    </Link>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{user?.name}</span>
                        </div>
                        <div className="relative w-12 h-12 overflow-hidden rounded-full ring-2 ring-gray-100 dark:ring-white/10">
                            {user?.avatar ? (
                                <img
                                    src={getAvatarUrl(user.avatar)}
                                    alt={user.name}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full bg-black dark:bg-white text-white dark:text-black font-bold text-lg">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <nav className="divide-y divide-gray-100 dark:divide-white/10 flex-1">
                {sidebarItems.map((group, gIndex) => (
                    <div key={gIndex} className="py-2">
                        {group.items.map((item) => (
                            <NavLink
                                key={item.href + item.title}
                                to={item.href}
                                end={item.end}
                                className={({ isActive }) => cn(
                                    "flex items-center justify-end w-full px-5 py-2.5 gap-4 group transition-colors rounded-xl mx-2 my-0.5",
                                    isActive
                                        ? "bg-gray-50 dark:bg-white/5"
                                        : "hover:bg-gray-50 dark:hover:bg-white/5"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {item.count !== undefined && item.count > 0 && (
                                        <span className="text-[10px] font-bold text-white dark:text-black bg-black dark:bg-white px-1.5 py-0.5 rounded-full">
                                            {item.count}
                                        </span>
                                    )}
                                    <span className={cn(
                                        "text-sm font-medium transition-colors",
                                        "text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white"
                                    )}>
                                        {item.title}
                                    </span>
                                </div>
                                <item.icon className={cn(
                                    "w-4 h-4 transition-colors",
                                    "text-gray-500 group-hover:text-black dark:group-hover:text-white"
                                )} />
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>
        </div>
    );
};
