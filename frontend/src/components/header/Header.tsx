import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bookmark, Home, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';

// Components
import { MobileMenu } from './MobileMenu';
import { DesktopNavigation } from './DesktopNavigation';
import { ThemeToggle } from './ThemeToggle';
import { WatchLaterDropdown } from './WatchLaterDropdown';
import { HistoryDropdown } from './HistoryDropdown';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { MessagesDropdown } from './MessagesDropdown';
import { UserDropdown } from './UserDropdown';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Header() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { appName, logoUrl } = useSettingsStore();
    const { user } = useAuthStore();
    const isRtl = i18n.language === 'ar';

    // Menu state management - coordinate mobile menu and user menu
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [messagesMenuOpen, setMessagesMenuOpen] = useState(false);
    const [notificationsMenuOpen, setNotificationsMenuOpen] = useState(false);

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Wait for translation initialization and settings store (logo) hydration to complete
        // During SPA navigation this component doesn't unmount so this only masks the hard refresh FOUC
        const timer = setTimeout(() => {
            setIsReady(true);
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    // When one menu opens, close the others
    const handleMobileMenuChange = (open: boolean) => {
        setMobileMenuOpen(open);
        if (open) {
            setUserMenuOpen(false);
            setMessagesMenuOpen(false);
            setNotificationsMenuOpen(false);
        }
    };

    const handleUserMenuChange = (open: boolean) => {
        setUserMenuOpen(open);
        if (open) {
            setMobileMenuOpen(false);
            setMessagesMenuOpen(false);
            setNotificationsMenuOpen(false);
        }
    };

    // Scroll Effect (Optional, currently using simple sticky)
    // You can add logic to change background opacity on scroll if needed

    if (!isReady) {
        return (
            <div dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="fixed top-0 left-0 z-50 w-full transition-colors duration-300 border-b bg-white dark:bg-[#312F2E] border-gray-100 dark:border-[#312F2E]">
                    <div className="relative flex items-center h-[60px] px-4 mx-auto w-full max-w-[1800px]">
                        
                        {/* Mobile Menu Skeleton */}
                        <div className="w-8 h-8 rounded-md bg-gray-200 dark:bg-white/10 animate-pulse lg:hidden mr-4 rtl:ml-4 rtl:mr-0 shrink-0" />
                        
                        {/* Logo Skeleton */}
                        <div className="w-28 h-9 rounded-md bg-gray-200 dark:bg-white/10 animate-pulse mr-4 rtl:ml-4 rtl:mr-0 shrink-0" />

                        {/* Desktop Nav Skeleton */}
                        <div className="hidden lg:flex items-center gap-6 mx-4">
                            <div className="w-20 h-4 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
                            <div className="w-24 h-4 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
                            <div className="w-16 h-4 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
                        </div>

                        {/* Right Side Icons Skeleton */}
                        <div className="flex items-center gap-2 lg:gap-3 ml-auto rtl:ml-0 rtl:mr-auto">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse hidden sm:block" />
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
                        </div>
                    </div>
                </div>
                {/* Spacer for fixed header */}
                <div className="pt-[60px]"></div>
            </div>
        );
    }

    return (
        <div dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="fixed top-0 left-0 z-50 w-full transition-colors duration-300 border-b bg-white dark:bg-[#312F2E] border-gray-100 dark:border-[#312F2E]">
                <div className="relative flex items-center h-[60px] px-4 mx-auto w-full max-w-[1800px]">

                    {/* Mobile Menu */}
                    <MobileMenu
                        isOpen={mobileMenuOpen}
                        onOpenChange={handleMobileMenuChange}
                    />

                    {/* Logo */}
                    <Link to={`/${i18n.language}`} className="flex items-center mr-4 transition-transform gap-x-2 hover:scale-105 rtl:ml-4 rtl:mr-0">
                        <img 
                            src="/uploads/settings/logo_8d118394-7aaa-469a-8e03-3fa43420fadd.png" 
                            alt="Logo" 
                            className="w-auto h-9 object-contain" 
                        />
                        <span className="font-bold text-gray-900 dark:text-white hidden sm:block text-xl uppercase">ANIME LAST</span>
                    </Link>

                    {/* Mobile Home & Community Icons - Placed immediately after logo */}
                    <div className="flex items-center gap-1 sm:hidden">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={`/${i18n.language}`}
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            setUserMenuOpen(false);
                                        }}
                                        className="p-2 text-black dark:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                    >
                                        <Home className="w-[26px] h-[26px] stroke-[2.5px]" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{isRtl ? "الرئيسية" : "Home"}</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={`/${i18n.language}/community`}
                                        onClick={() => {
                                            setMobileMenuOpen(false);
                                            setUserMenuOpen(false);
                                        }}
                                        className="p-2 text-black dark:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                                    >
                                        <Globe className="w-[26px] h-[26px] stroke-[2.5px]" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{isRtl ? "المجتمع" : "Community"}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {/* Desktop Navigation */}
                    <DesktopNavigation />

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-2 ml-auto lg:gap-3 rtl:ml-0 rtl:mr-auto">

                        {/* Search Button */}
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        to={`/${i18n.language}/search`}
                                        className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                                    >
                                        <Search className="w-6 h-6" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>{isRtl ? 'بحث' : 'Search'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Icons Container */}
                        <div className="flex items-center gap-2 lg:gap-3">
                            <div className="hidden sm:flex items-center">
                                <ThemeToggle />
                            </div>



                            <MessagesDropdown onOpenChange={(open) => {
                                if (open) {
                                    setMobileMenuOpen(false);
                                    setUserMenuOpen(false);
                                }
                            }} />

                            <NotificationDropdown onOpenChange={(open) => {
                                if (open) {
                                    setMobileMenuOpen(false);
                                    setUserMenuOpen(false);
                                }
                            }} />

                            <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        {user ? (
                                            <Link
                                                to={`/${i18n.language}/watchlist`}
                                                onClick={() => {
                                                    setMobileMenuOpen(false);
                                                    setUserMenuOpen(false);
                                                }}
                                                className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                                            >
                                                <Bookmark className="w-6 h-6" />
                                            </Link>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    toast.error(isRtl ? 'يجب تسجيل الدخول أولاً' : 'You must log in first');
                                                }}
                                                className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 hover:text-black dark:hover:text-white focus:outline-none"
                                            >
                                                <Bookmark className="w-6 h-6" />
                                            </button>
                                        )}
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>{isRtl ? "قائمة المشاهدة" : "My Watchlist"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {/* User Menu containing Notifications, History, etc. */}
                            <UserDropdown
                                isOpen={userMenuOpen}
                                onOpenChange={handleUserMenuChange}
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="pt-[60px]"></div>
        </div>
    );
}
