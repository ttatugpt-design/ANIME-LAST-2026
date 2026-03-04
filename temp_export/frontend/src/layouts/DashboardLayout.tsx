import { useNavigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { Sidebar } from '@/features/dashboard/components/sidebar';
import { SearchCommand } from "@/components/search-command";
import { Button } from '@/components/ui/button';
import { LogOut, Languages, Moon, Sun, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTranslation } from 'react-i18next';
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

export function DashboardLayout() {
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const { appName, logoUrl } = useSettingsStore();
    const { t, i18n } = useTranslation();
    const { setTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { lang } = useParams<{ lang: string }>();
    const location = useLocation();

    const currentLang = lang || i18n.language || 'en';

    const handleLogout = () => {
        logout();
        navigate(`/${currentLang}/auth/login`, { replace: true });
    };

    const toggleLanguage = () => {
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        const newPath = location.pathname.replace(`/${currentLang}`, `/${newLang}`);
        navigate(newPath);
    };

    // Ensure dir updates
    if (typeof document !== 'undefined') {
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = currentLang;
    }

    return (
        <div className="flex h-screen bg-background" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
            {/* Desktop Sidebar */}
            <div className="w-[310px] border-r rtl:border-r-0 rtl:border-l bg-background hidden md:flex flex-col">
                <div className="flex h-20 items-center px-6 gap-3 pt-8 cursor-pointer" onClick={() => navigate(`/${currentLang}`)}>
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
                    ) : (
                        <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-2xl">A</span>
                        </div>
                    )}
                    <span className="font-bold text-2xl tracking-tight animate-in fade-in text-primary/90">{appName}</span>
                </div>
                <Sidebar className="flex-1 px-4" lang={currentLang} />
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Mobile Sidebar */}
            <div className={`fixed top-0 ${currentLang === 'ar' ? 'right-0' : 'left-0'} h-full w-[310px] bg-background ${currentLang === 'ar' ? 'border-l' : 'border-r'} z-50 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : currentLang === 'ar' ? 'translate-x-full' : '-translate-x-full'}`}>
                <div className="flex h-20 items-center px-6 gap-3 pt-8 justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/${currentLang}`)}>
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
                        ) : (
                            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-2xl">A</span>
                            </div>
                        )}
                        <span className="font-bold text-2xl tracking-tight text-primary/90">{appName}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <Sidebar className="flex-1 px-4" onNavigate={() => setMobileMenuOpen(false)} lang={currentLang} />
            </div>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-20 items-center gap-4 border-b border-border dark:border-[#333333] bg-background dark:bg-[#06080a] px-8 justify-between">
                    {/* Mobile Menu Button */}
                    <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setMobileMenuOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>

                    <div className="md:hidden">
                        <span className="font-semibold">{appName}</span>
                    </div>
                    <div className="flex flex-1 items-center px-4">
                        <SearchCommand />
                    </div>

                    <div className="flex items-center gap-3">
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                                <span className="sr-only">Toggle theme</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                                Light
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                                Dark
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setTheme("system")}>
                                                System
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Theme</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={toggleLanguage}>
                                        <Languages className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{currentLang === 'en' ? 'Arabic' : 'English'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user?.avatar ? `${user.avatar}` : ""} className="object-cover" />
                                        <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate(`/${currentLang}/dashboard/settings`)}>
                                    <SettingsIcon className="mr-2 h-4 w-4" />
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4 rtl:rotate-180" />
                                    {t('common.logout')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
