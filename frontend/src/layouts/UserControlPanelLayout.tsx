import { Outlet, NavLink, useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Settings, Lock, Bookmark, History, Bell, BarChart3, Activity, Pen, List, MapPin, Users, MessageCircle, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/header/Header';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth-store';
import { getImageUrl } from '@/utils/image-utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import api from '@/lib/api';

export function UserControlPanelLayout() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const { id } = useParams<{ id: string }>();
    const isRtl = i18n.language === 'ar';
    const lang = i18n.language || 'en';

    // Base path for this user's dashboard
    const baseDashboardPath = `/${lang}/u/${id}/dashboard`;

    const { user } = useAuthStore();
    const isMessagesPage = location.pathname.endsWith('/messages');
    const { unreadCount } = useNotificationsStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [stats, setStats] = useState({
        history_count: 0,
        watch_later_count: 0
    });

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
        fetchStats();
    }, []);

    const getAvatarUrl = (avatar: string | undefined) => {
        return getImageUrl(avatar);
    };

    interface SidebarItem {
        title: string;
        href: string;
        icon: any;
        end?: boolean;
        count?: number;
    }

    interface SidebarGroup {
        group: number;
        items: SidebarItem[];
    }

    const sidebarItems: SidebarGroup[] = [
        {
            group: 1,
            items: [
                {
                    title: isRtl ? 'الإعدادات' : 'Settings',
                    href: `${baseDashboardPath}/settings`,
                    icon: Settings
                },
                {
                    title: isRtl ? 'معلومات الحساب' : 'Account Info',
                    href: baseDashboardPath,
                    icon: User,
                    end: true
                }
            ]
        },
        {
            group: 2,
            items: [
                {
                    title: isRtl ? 'السجل' : 'History',
                    href: `${baseDashboardPath}/history`,
                    icon: History,
                    count: stats.history_count
                },
                {
                    title: isRtl ? 'قائمة المشاهدة' : 'Watchlist',
                    href: `${baseDashboardPath}/library`,
                    icon: Bookmark,
                    count: stats.watch_later_count
                },
                {
                    title: isRtl ? 'قوائم كرانشي' : 'Crunchy Lists',
                    href: `${baseDashboardPath}/library`, // Reuse library or add Lists page
                    icon: List
                }
            ]
        },
        {
            group: 3,
            items: [
                {
                    title: isRtl ? 'إشعارات' : 'Notifications',
                    href: `${baseDashboardPath}/notifications`,
                    icon: Bell,
                    count: unreadCount
                },
                {
                    title: isRtl ? 'المراسلات' : 'Messages',
                    href: `${baseDashboardPath}/messages`,
                    icon: MessageCircle
                },
                {
                    title: isRtl ? 'الأصدقاء' : 'Friends',
                    href: `${baseDashboardPath}/friends`,
                    icon: Users
                },
                {
                    title: isRtl ? 'الإحصائيات' : 'Statistics',
                    href: `${baseDashboardPath}/stats`,
                    icon: BarChart3
                },
                {
                    title: isRtl ? 'التفاعلات' : 'Interactions',
                    href: `${baseDashboardPath}/interactions`,
                    icon: Activity
                }
            ]
        }
    ];


    const SidebarContent = () => (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Profile Header (Matched to UserMenuContent) */}
            <div className="p-4 border-b border-gray-100 dark:border-white/10 shrink-0 mt-4">
                <div className="flex items-center justify-between">
                    <Link
                        to={`${baseDashboardPath}/edit`}
                        onClick={() => setIsMobileMenuOpen(false)}
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
                                key={item.href}
                                to={item.href}
                                end={item.end}
                                onClick={() => setIsMobileMenuOpen(false)}
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

    return (
        <div className={cn(
            "bg-white dark:bg-black flex flex-col transition-colors duration-300",
            isMessagesPage ? "h-[100dvh] overflow-hidden" : "min-h-screen"
        )} dir={isRtl ? 'rtl' : 'ltr'}>
            <Header />

            <div className={cn("flex-1 flex flex-col lg:flex-row", isMessagesPage && "overflow-hidden")}>
                {/* Desktop Sidebar */}
                {!isMessagesPage && (
                    <aside className="hidden lg:block w-72 flex-shrink-0 border-r border-gray-100 dark:border-white/10 bg-white dark:bg-black">
                        <div className="sticky top-[60px] h-[calc(100vh-60px)] shadow-sm">
                            <SidebarContent />
                        </div>
                    </aside>
                )}

                {/* Main Content */}
                <main className={cn(
                    "flex-1 min-w-0 bg-gray-50 dark:bg-[#0a0a0a] flex flex-col",
                    isMessagesPage ? "h-[calc(100dvh-60px)]" : ""
                )}>
                    {/* Mobile Sidebar Toggle */}
                    {!isMessagesPage && (
                        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10 bg-white dark:bg-black sticky top-[60px] z-10 shadow-sm">
                            <span className="font-bold text-lg">{isRtl ? 'لوحة التحكم' : 'Dashboard'}</span>
                            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <button className="p-2 -mx-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">
                                        <Menu className="w-6 h-6" />
                                    </button>
                                </SheetTrigger>
                                <SheetContent side={isRtl ? 'right' : 'left'} className="w-72 p-0 border-gray-100 dark:border-white/10 bg-white dark:bg-black" aria-describedby={undefined}>
                                     <SidebarContent />
                                </SheetContent>
                            </Sheet>
                        </div>
                    )}

                    <div className={cn("flex-1", isMessagesPage ? "h-full" : "p-4 sm:p-8")}>
                        <div className={cn("h-full", !isMessagesPage && "max-w-7xl mx-auto")}>
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
