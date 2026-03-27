import { useNavigate, useLocation } from 'react-router-dom';
import { User, LogIn, UserPlus, Home, Check, ChevronRight, Languages, Sun, Moon } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from './UserMenuContent';
import { useAuthStore } from '@/stores/auth-store';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import { getImageUrl } from '@/utils/image-utils';

interface GuestMenuContentProps {
    onClose?: () => void;
}

function GuestMenuContent({ onClose }: GuestMenuContentProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);

    const handleNavigation = (path: string) => {
        const lang = i18n.language || 'en';
        const targetPath = path.startsWith('/') ? `/${lang}${path}` : `/${lang}/${path}`;
        navigate(targetPath);
        if (onClose) onClose();
    };

    const handleLanguageSwitch = (newLang: string) => {
        const currentPath = location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);

        if (pathSegments.length > 0 && (pathSegments[0] === 'ar' || pathSegments[0] === 'en')) {
            pathSegments[0] = newLang;
            const newPath = '/' + pathSegments.join('/');
            navigate(newPath);
        } else {
            navigate(`/${newLang}${currentPath}`);
        }

        setShowLanguageMenu(false);
        if (onClose) onClose();
    };

    return (
        <div className="flex flex-col w-full lg:w-96 min-h-[300px]">
            {/* Header Section (Similar to Profile Header but for Guest) */}
            <div className="p-4 font-normal">
                <div className="flex items-center justify-end gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">زائر</span>
                        <span className="text-sm text-gray-500">يرجى تسجيل الدخول</span>
                    </div>
                    <div className="relative w-14 h-14 overflow-hidden rounded-full ring-2 ring-[#222] bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                    </div>
                </div>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Main Actions */}
            <div className="py-1">
                {/* Login */}
                <button
                    onClick={() => handleNavigation('/auth/login')}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">تسجيل الدخول</span>
                    <LogIn className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>

                {/* Register */}
                <button
                    onClick={() => handleNavigation('/auth/register')}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">تسجيل حساب جديد</span>
                    <UserPlus className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Home Link */}
            <div className="py-1">
                <button
                    onClick={() => handleNavigation('/')}
                    className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                >
                    <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">العودة إلى الصفحة الرئيسية</span>
                    <Home className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                </button>
            </div>

            <div className="h-[1px] bg-gray-200 dark:bg-[#333] mx-1 my-1" />

            {/* Settings Group: Theme & Language */}
            <div className="py-1">
                {/* Language Switcher */}
                <div className="relative">
                    <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        className="focus:bg-gray-100 dark:focus:bg-[#1a1a1a] cursor-pointer rounded-none flex items-center justify-end w-full px-5 py-2.5 gap-4 group hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform", showLanguageMenu && "rotate-90")} />
                            <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                                {i18n.language === 'ar' ? 'اللغة' : 'Language'}
                            </span>
                        </div>
                        <Languages className="w-5 h-5 text-gray-500 group-hover:text-black dark:group-hover:text-white transition-colors" />
                    </button>

                    {showLanguageMenu && (
                        <div className="bg-gray-50 dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-[#333]">
                            <button
                                onClick={() => handleLanguageSwitch('ar')}
                                className="flex items-center justify-between w-full px-8 py-2 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                <span className="font-medium text-gray-700 dark:text-gray-200">العربية</span>
                                {i18n.language === 'ar' && <Check className="w-4 h-4 text-black dark:text-white" />}
                            </button>
                            <button
                                onClick={() => handleLanguageSwitch('en')}
                                className="flex items-center justify-between w-full px-8 py-2 hover:bg-gray-100 dark:hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                <span className="font-medium text-gray-700 dark:text-gray-200">English</span>
                                {i18n.language === 'en' && <Check className="w-4 h-4 text-black dark:text-white" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Theme Toggle */}
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
                        <span className="text-base font-medium text-gray-700 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white transition-colors">
                            {theme === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function UserDropdown({ isOpen: controlledIsOpen, onOpenChange: controlledOnOpenChange }: { isOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
    const user = useAuthStore((state) => state.user);
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const { unreadCount } = useNotificationsStore();
    const [stats, setStats] = useState<any>(null);

    // Fetch total stats count
    const fetchTotalCount = async () => {
        if (!user) return;
        try {
            const response = await api.get('/user/stats');
            const data = response.data;
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch total stats', error);
        }
    };

    useEffect(() => {
        fetchTotalCount();
        const interval = setInterval(fetchTotalCount, 60000);

        const handleNewNotif = () => fetchTotalCount();
        window.addEventListener('app:notification', handleNewNotif);

        return () => {
            clearInterval(interval);
            window.removeEventListener('app:notification', handleNewNotif);
        };
    }, [user]);

    useEffect(() => {
        const total = unreadCount + (stats?.history_count || 0) + (stats?.watch_later_count || 0);
        setTotalCount(total);
    }, [unreadCount, stats]);

    // Use controlled state if provided, otherwise use internal state
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
    const setIsOpen = controlledOnOpenChange || setInternalIsOpen;

    // Check for mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getAvatarUrl = (avatar: string | undefined) => {
        return getImageUrl(avatar);
    };

    // Close on navigation
    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
    };

    // Prevent scroll and handle back button when menu is open on mobile
    useEffect(() => {
        if (isOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            window.history.pushState({ menuOpen: true }, '');
            const handlePopState = () => {
                setIsOpen(false);
            };
            window.addEventListener('popstate', handlePopState);
            return () => {
                document.body.style.overflow = '';
                window.removeEventListener('popstate', handlePopState);
            };
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen, isMobile, setIsOpen]);

    // Desktop Trigger
    const DesktopTrigger = (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "relative w-10 h-10 overflow-hidden transition-all rounded-full ring-2 ring-transparent hover:ring-indigo-500/20",
                !user && "bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-gray-200 dark:ring-neutral-800"
            )}
        >
            {user && totalCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold flex items-center justify-center rounded-full z-10 border border-white dark:border-black">
                    {totalCount > 99 ? '99+' : totalCount}
                </span>
            )}
            {user ? (
                user.avatar ? (
                    <img
                        src={getAvatarUrl(user.avatar)}
                        alt={user.name}
                        className="object-cover w-full h-full rounded-full"
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-lg font-bold text-white bg-indigo-600">
                        <span>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                    </div>
                )
            ) : (
                <User className="w-5 h-5 text-black dark:text-white" />
            )}
        </Button>
    );

    // Desktop Menu
    if (!isMobile) {
        return (
            <div className="relative">
                <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
                    <DropdownMenuTrigger asChild>
                        {DesktopTrigger}
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-96 mt-2 border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#111] rounded-none p-0">
                        {user ? (
                            <UserMenuContent user={user} onClose={() => setIsOpen(false)} />
                        ) : (
                            <GuestMenuContent onClose={() => setIsOpen(false)} />
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    }

    // Mobile Menu
    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => handleOpenChange(!isOpen)}
                className={cn(
                    "relative w-10 h-10 overflow-hidden transition-all rounded-full ring-2 ring-transparent hover:ring-indigo-500/20",
                    !user && "bg-white dark:bg-neutral-900 shadow-sm ring-1 ring-gray-200 dark:ring-neutral-800"
                )}
            >
                {user && totalCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full z-10 border border-white dark:border-black">
                        {totalCount > 99 ? '99+' : totalCount}
                    </span>
                )}
                {user ? (
                    user.avatar ? (
                        <img
                            src={getAvatarUrl(user.avatar)}
                            alt={user.name}
                            className="object-cover w-full h-full rounded-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-lg font-bold text-white bg-indigo-600">
                            <span>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
                        </div>
                    )
                ) : (
                    <User className="w-5 h-5 text-black dark:text-white" />
                )}
            </Button>

            {/* Mobile Full Screen Portal */}
            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999]"
                    style={{ top: '60px' }}
                >
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => handleOpenChange(false)}
                    />
                    <div className="absolute inset-x-0 top-0 bottom-0 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-neutral-800 overflow-y-auto custom-scrollbar">
                        {user ? (
                            <UserMenuContent user={user} onClose={() => handleOpenChange(false)} />
                        ) : (
                            <GuestMenuContent onClose={() => handleOpenChange(false)} />
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
