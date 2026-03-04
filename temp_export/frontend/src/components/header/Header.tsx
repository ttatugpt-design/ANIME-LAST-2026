import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bookmark } from 'lucide-react';
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
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-auto h-9 object-contain" />
                        ) : (
                            <div className="h-9 px-2 bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold">
                                A
                            </div>
                        )}
                        <span className="font-bold text-gray-900 dark:text-white hidden sm:block text-xl">{appName || 'ANIME LAST'}</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <DesktopNavigation />

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-2 ml-auto lg:gap-3 rtl:ml-0 rtl:mr-auto">

                        {/* Search Button */}
                        <Link
                            to={`/${i18n.language}/search`}
                            className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                        >
                            <Search className="w-6 h-6" />
                        </Link>

                        {/* Icons Container */}
                        <div className="flex items-center gap-2 lg:gap-3">
                            <ThemeToggle />

                            <MessagesDropdown />

                            <NotificationDropdown />

                            <Link
                                to={`/${i18n.language}/watchlist`}
                                className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                                title={isRtl ? "قائمة المشاهدة" : "My Watchlist"}
                            >
                                <Bookmark className="w-6 h-6" />
                            </Link>

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
