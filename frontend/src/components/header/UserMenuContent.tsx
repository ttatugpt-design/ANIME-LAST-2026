import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LogOut,
    Settings,
    Crown,
    ArrowRightLeft,
    Bookmark,
    List,
    History,
    Bell,
    MessageCircle,
    Pen,
    User as UserIcon,
    Loader2,
    LayoutDashboard,
    Languages,
    Check,
    ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { getImageUrl } from '@/utils/image-utils';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useMessagingStore } from '@/stores/messaging-store';
import { slugify } from '@/utils/slug';

interface UserMenuContentProps {
    user: any;
    onClose?: () => void;
}

export function UserMenuContent({ user, onClose }: UserMenuContentProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const logout = useAuthStore((state) => state.logout);
    const { unreadCount } = useNotificationsStore();
    const { openMessagingModal } = useMessagingStore();
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        notifications_count: 0,
        messages_count: 0,
        history_count: 0,
        watch_later_count: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/user/stats');
                const data = response.data;
                setStats({
                    notifications_count: data.notifications_count || 0,
                    messages_count: data.messages_count || 0,
                    history_count: data.history_count || 0,
                    watch_later_count: data.watch_later_count || 0
                });
            } catch (error) {
                console.error('Failed to fetch user stats', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const getAvatarUrl = (path: string | undefined) => {
        return getImageUrl(path);
    };

    const handleLogout = () => {
        logout();
        navigate(`/${i18n.language}/auth/login`);
        if (onClose) onClose();
    };

    const handleNavigation = (path: string) => {
        const lang = i18n.language || 'en';
        // Ensure path includes language prefix
        const targetPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
        navigate(targetPath);
        if (onClose) onClose();
    };

    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    const handleLanguageSwitch = (newLang: string) => {
        const currentPath = location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);

        // If path has language prefix, replace it
        if (pathSegments.length > 0 && (pathSegments[0] === 'ar' || pathSegments[0] === 'en')) {
            pathSegments[0] = newLang;
            const newPath = '/' + pathSegments.join('/');
            navigate(newPath);
        } else {
            // If no prefix (shouldn't happen often with strict routing), prepend
            navigate(`/${newLang}${currentPath}`);
        }

        setShowLanguageMenu(false);
        if (onClose) onClose();
    };

    const getPath = (path: string) => {
        const lang = i18n.language || 'en';
        return path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-[300px] gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-[#333] rounded-full"></div>
                    <div className="absolute inset-0 border-4 rounded-full border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-medium text-gray-400">جاري التحميل...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full lg:w-96 max-h-[600px] overflow-y-auto custom-scrollbar min-h-[300px]">
            {/* Profile Header */}
            <div className="p-4 font-normal">
                <div className="flex items-center justify-between">
                    {/* Edit Profile Icon (Left) */}
                    <Link
                        to={getPath(`/u/${user?.id}/dashboard/edit`)}
                        onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                        className="inline-block p-2 text-gray-400 transition-colors rounded-full hover:text-white hover:bg-gray-800"
                    >
                        <Pen className="w-5 h-5" />
                    </Link>


                    {/* User Info (Center/Right) */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{user?.name}</span>
                        </div>

                        {/* Avatar (Right) */}
                        <div className="relative w-14 h-14 overflow-hidden rounded-full ring-2 ring-[#222]">
                            {user?.avatar ? (
                                <img
                                    src={getAvatarUrl(user.avatar)}
                                    alt={user.name}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-xl font-bold text-white bg-black dark:bg-white dark:text-black">
                                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium/Trial Banner */}
            <div className="px-4 mb-2">
                <div className="flex items-center justify-center gap-3 p-3 text-white transition-colors bg-black shadow-lg cursor-pointer dark:bg-white rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 dark:text-black">
                    <Crown className="w-5 h-5 fill-current" />
                    <span className="text-base font-black tracking-wide uppercase">تجربة مجانية لـ 7 يومًا</span>
                </div>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Menu Group 1: Profile, Admin, Settings, Language */}
            <div className="py-1">
                {/* Profile Link (New) */}
                    <Link
                    to={getPath(`/u/${user?.id}/profile`)}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">الصفحة الشخصية</span>
                    <UserIcon className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>

                <Link
                    to={getPath(`/u/${user?.id}/dashboard`)}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">تغيير الملف الشخصي</span>
                    <ArrowRightLeft className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>


                {/* Admin Dashboard Link */}
                {(user?.role?.name?.toLowerCase() === 'admin' || user?.role?.name?.toLowerCase() === 'super_admin') && (
                    <Link
                        to={getPath('/dashboard')}
                        onClick={() => { if(onClose) onClose(); }}
                        className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                    >
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">لوحة التحكم الأدمن</span>
                        <LayoutDashboard className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                    </Link>
                )}

                {/* Personal User Dashboard Link */}
                <Link
                    to={getPath(`/u/${user?.id}/dashboard`)}
                    onClick={() => { if(onClose) onClose(); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">لوحة التحكم</span>
                    <LayoutDashboard className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>

                <button
                    onClick={() => {
                        openMessagingModal();
                        if (onClose) setTimeout(onClose, 50);
                    }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <div className="flex items-center gap-2">
                        {stats.messages_count > 0 && (
                            <span className="min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center px-1">{stats.messages_count}</span>
                        )}
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">{i18n.language === 'ar' ? 'المراسلات' : 'Messages'}</span>
                    </div>
                    <MessageCircle className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </button>


                <Link
                    to={getPath(`/u/${user?.id}/dashboard/settings`)}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">إعدادات</span>
                    <Settings className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>


                {/* Language Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                    >
                        <div className="flex items-center gap-2">
                            <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", showLanguageMenu && "rotate-90")} />
                            <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">
                                {i18n.language === 'ar' ? 'اللغة' : 'Language'}
                            </span>
                        </div>
                        <Languages className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                    </button>

                    {showLanguageMenu && (
                        <div className="bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#333]">
                            <button
                                onClick={() => { handleLanguageSwitch('ar'); if (onClose) setTimeout(onClose, 50); }}
                                className="flex items-center justify-between w-full px-8 py-2 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                <span className="font-medium text-gray-700 dark:text-gray-200">العربية</span>
                                {i18n.language === 'ar' && <Check className="w-4 h-4 text-black dark:text-white" />}
                            </button>
                            <button
                                onClick={() => { handleLanguageSwitch('en'); if (onClose) setTimeout(onClose, 50); }}
                                className="flex items-center justify-between w-full px-8 py-2 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                <span className="font-medium text-gray-700 dark:text-gray-200">English</span>
                                {i18n.language === 'en' && <Check className="w-4 h-4 text-black dark:text-white" />}
                            </button>
                        </div>
                    )}
                </div>

            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Menu Group 2 */}
            <div className="py-1">
                <Link
                    to={getPath('/history')}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <div className="flex items-center gap-2">
                        {stats.history_count > 0 && (
                            <span className="min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center px-1">{stats.history_count}</span>
                        )}
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">السجل</span>
                    </div>
                    <History className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>

                <Link
                    to={getPath('/watchlist')}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <div className="flex items-center gap-2">
                        {stats.watch_later_count > 0 && (
                            <span className="min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center px-1">{stats.watch_later_count}</span>
                        )}
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">قائمة المشاهدة</span>
                    </div>
                    <Bookmark className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>

            
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Menu Group 3 */}
            <div className="py-1">
                <Link
                    to={getPath('/notifications')}
                    onClick={() => { if (onClose) setTimeout(onClose, 50); }}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
                >
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <span className="min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center px-1">{unreadCount}</span>
                        )}
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">إشعارات</span>
                    </div>
                    <Bell className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
                </Link>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Theme Toggle */}
            <div className="py-1">
                <div
                    className="flex items-center justify-between w-full px-5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                    onClick={(e) => {
                        e.preventDefault();
                        setTheme(theme === 'dark' ? 'light' : 'dark');
                    }}
                >
                    {/* Switch */}
                    <div className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ease-in-out border border-gray-200 dark:border-transparent ${theme === 'dark' ? 'bg-white' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full transition duration-200 ease-in-out shadow-sm absolute top-1 ${theme === 'dark' ? 'bg-black left-1' : 'bg-white right-1'}`}></span>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">
                            {theme === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-xl mb-1 flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors mx-2 w-[calc(100%-16px)]"
            >
                <span className="text-base font-medium text-gray-700 transition-colors dark:text-gray-200 group-hover:text-black dark:group-hover:text-white">تسجيل الخروج</span>
                <LogOut className="w-5 h-5 text-gray-500 transition-colors group-hover:text-black dark:group-hover:text-white" />
            </button>
        </div>
    );
}
