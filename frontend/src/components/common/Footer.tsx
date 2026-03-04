import { Facebook, Twitter, Instagram, Youtube, Home, LayoutGrid, Sparkles, Monitor, Film, PlayCircle, LogIn, UserPlus, Globe, Moon, Sun, ShieldAlert, Mail, ArrowUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme-provider";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useSettingsStore } from "@/stores/settings-store";

export default function Footer() {
    const { i18n } = useTranslation();
    const { theme, setTheme } = useTheme();
    const navigate = useNavigate();
    const { appName, logoUrl } = useSettingsStore();
    const isRtl = i18n.language === 'ar';

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLanguageSelect = (lang: string) => {
        if (i18n.language === lang) return;
        const currentPath = window.location.pathname;
        const pathSegments = currentPath.split('/').filter(Boolean);

        // Check if first segment is a language code
        if (pathSegments.length > 0 && (pathSegments[0] === 'ar' || pathSegments[0] === 'en')) {
            pathSegments[0] = lang;
            navigate(`/${pathSegments.join('/')}`);
        } else {
            navigate(`/${lang}${currentPath}`);
        }
    };

    return (
        <footer dir={isRtl ? 'rtl' : 'ltr'} className="w-full bg-white dark:bg-black border-t border-gray-200 dark:border-[#2a2a2a] pt-16 pb-8 transition-colors duration-300 mt-12">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-16 text-start">
                    {/* Column 1: Brand & Social */}
                    <div className="flex flex-col gap-6">
                        <Link to={`/${i18n.language}`} className="flex items-center gap-2 group">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-auto h-10 object-contain" />
                            ) : (
                                <div className="h-10 w-10 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-black text-xl group-hover:bg-neutral-800 dark:group-hover:bg-neutral-200 transition-colors rounded-none">A</div>
                            )}
                            <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">{appName || 'ANIME LAST'}</span>
                        </Link>
                        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                            {isRtl ? 'افضل موقع لمشاهدة الانمي المترجم بجودة عالية' : 'The best place to watch anime online in high quality.'}
                        </p>
                        <div className="flex items-center gap-4">
                            {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                                <a key={i} href="#" className="p-2 bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 rounded-none">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Navigation */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 uppercase tracking-wider border-b-2 border-black dark:border-white w-fit pb-1">
                            {isRtl ? 'تصفح' : 'Browse'}
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { to: `/${i18n.language}`, text: isRtl ? 'الرئيسية' : 'Home', icon: Home },
                                { to: `/${i18n.language}/browse`, text: isRtl ? 'تصفح الكل' : 'Browse All', icon: LayoutGrid },
                                { to: `/${i18n.language}/animes`, text: isRtl ? 'جديد' : 'New', icon: Sparkles },
                                { to: `/${i18n.language}/coming-soon`, text: isRtl ? 'أنمي القادم' : 'Coming Soon', icon: Sparkles }
                            ].map((link, i) => (
                                <li key={i}>
                                    <Link to={link.to} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-bold">
                                        <div className="w-1.5 h-1.5 bg-black dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        {link.text}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Categories */}
                    <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 uppercase tracking-wider border-b-2 border-black dark:border-white w-fit pb-1">
                            {isRtl ? 'التصنيفات' : 'Categories'}
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { to: `/${i18n.language}/tv-series`, text: isRtl ? 'مسلسلات' : 'TV Series', icon: Monitor },
                                { to: `/${i18n.language}/movies`, text: isRtl ? 'أفلام' : 'Movies', icon: Film },
                                { to: `/${i18n.language}/episodes-list`, text: isRtl ? 'الحلقات' : 'Episodes', icon: PlayCircle }
                            ].map((link, i) => (
                                <li key={i}>
                                    <Link to={link.to} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors text-sm font-bold">
                                        {link.text}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Actions & Legal */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 uppercase tracking-wider border-b-2 border-black dark:border-white w-fit pb-1">
                            {isRtl ? 'حسابي' : 'My Account'}
                        </h3>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Link to={`/${i18n.language}/auth/login`} className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white py-3 px-4 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-bold text-sm rounded-none border border-transparent">
                                <LogIn className="w-4 h-4" />
                                <span>{isRtl ? 'دخول' : 'Login'}</span>
                            </Link>
                            <Link to={`/${i18n.language}/auth/register`} className="flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-3 px-4 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-bold text-sm rounded-none border border-transparent">
                                <UserPlus className="w-4 h-4" />
                                <span>{isRtl ? 'تسجيل' : 'Join'}</span>
                            </Link>
                        </div>

                        {/* Language Switch */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center justify-between w-full bg-white dark:bg-black border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white py-3 px-4 hover:border-black dark:hover:border-white transition-colors text-sm font-bold rounded-none outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        <span>{isRtl ? 'اللغة' : 'Language'}</span>
                                    </div>
                                    <span className="uppercase text-black dark:text-white font-black">{i18n.language === 'ar' ? 'العربية' : 'English'}</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333] rounded-none">
                                <DropdownMenuItem onClick={() => handleLanguageSelect('ar')} className="cursor-pointer flex justify-between">
                                    <span>العربية</span>
                                    {i18n.language === 'ar' && <span className="text-black dark:text-white">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleLanguageSelect('en')} className="cursor-pointer flex justify-between">
                                    <span>English</span>
                                    {i18n.language === 'en' && <span className="text-black dark:text-white">✓</span>}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Theme Switcher */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="flex items-center justify-between w-full bg-white dark:bg-black border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white py-3 px-4 hover:border-black dark:hover:border-white transition-colors text-sm font-bold rounded-none outline-none"
                                >
                                    <div className="flex items-center gap-2">
                                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                        <span>{isRtl ? 'المظهر' : 'Theme'}</span>
                                    </div>
                                    <span className="uppercase text-black dark:text-white font-black">{theme === 'dark' ? (isRtl ? 'ليلي' : 'Dark') : (isRtl ? 'نهاري' : 'Light')}</span>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-[var(--radix-dropdown-menu-trigger-width)] bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-[#333] rounded-none">
                                <DropdownMenuItem onClick={() => setTheme('light')} className="cursor-pointer flex justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sun className="w-4 h-4" />
                                        <span>{isRtl ? 'الوضع النهاري' : 'Light Mode'}</span>
                                    </div>
                                    {theme === 'light' && <span className="text-black dark:text-white">✓</span>}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')} className="cursor-pointer flex justify-between">
                                    <div className="flex items-center gap-2">
                                        <Moon className="w-4 h-4" />
                                        <span>{isRtl ? 'الوضع الليلي' : 'Dark Mode'}</span>
                                    </div>
                                    {theme === 'dark' && <span className="text-black dark:text-white">✓</span>}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* DMCA Button - Large */}
                        <Link to={`/${i18n.language}/dmca`} className="flex items-center justify-center gap-2 w-full bg-black dark:bg-white text-white dark:text-black py-4 px-4 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-black text-lg mt-2 rounded-none shadow-lg shadow-black/10 dark:shadow-white/5">
                            <ShieldAlert className="w-6 h-6" />
                            <span>DMCA PROTECTED</span>
                        </Link>

                        {/* Contact Us - White/Black Logic */}
                        <Link to={`/${i18n.language}/contact`} className="flex items-center justify-center gap-2 w-full bg-white dark:bg-black border-2 border-gray-200 dark:border-[#333] text-gray-900 dark:text-white py-3 px-4 hover:border-black hover:text-gray-900 dark:hover:border-white dark:hover:text-white transition-colors font-bold text-sm mt-2 rounded-none">
                            <Mail className="w-4 h-4" />
                            <span>{isRtl ? 'تواصل معنا' : 'Contact Us'}</span>
                        </Link>

                    </div>
                </div>

                {/* Copyright */}
                <div className="mt-16 pt-8 border-t border-gray-100 dark:border-neutral-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-500 dark:text-gray-500 font-medium">
                        © {new Date().getFullYear()} <span className="text-black dark:text-white font-bold tracking-tight">THE LAST</span>. {isRtl ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}
                    </p>
                    <div className="flex gap-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                        <Link to={`/${i18n.language}/privacy`} className="hover:text-black dark:hover:text-white transition-colors">{isRtl ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
                        <span>•</span>
                        <Link to={`/${i18n.language}/terms`} className="hover:text-black dark:hover:text-white transition-colors">{isRtl ? 'الشروط والأحكام' : 'Terms of Service'}</Link>
                    </div>

                    {/* Scroll To Top Button */}
                    <button
                        onClick={scrollToTop}
                        className="absolute left-1/2 -translate-x-1/2 -top-6 md:-top-6 bg-black dark:bg-white text-white dark:text-black p-3 rounded-none shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors group"
                        title="Scroll to Top"
                    >
                        <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                    </button>
                </div>
            </div>
        </footer>
    );
}
