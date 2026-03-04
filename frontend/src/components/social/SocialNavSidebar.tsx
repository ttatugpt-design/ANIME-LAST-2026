import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Sparkles, Filter, Monitor, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SocialNavSidebar: React.FC = () => {
    const { i18n } = useTranslation();
    const { pathname } = useLocation();
    const isAr = i18n.language === 'ar';
    const lang = i18n.language;

    const navLinks = [
        {
            label: isAr ? 'المجتمع' : 'Community',
            href: `/${lang}/community`,
            icon: Users,
            activeMatch: '/community'
        },
        {
            label: isAr ? 'تصفح الكل' : 'Browse All',
            href: `/${lang}/browse`,
            icon: LayoutGrid,
            activeMatch: '/browse'
        },
        {
            label: isAr ? 'جديد' : 'New',
            href: `/${lang}/animes`,
            icon: Sparkles,
            activeMatch: '/animes'
        },
        {
            label: isAr ? 'الفئات' : 'Categories',
            href: `/${lang}/categories`,
            icon: Filter,
            activeMatch: '/categories'
        },
        {
            label: isAr ? 'أفلام ومسلسلات أجنبية' : 'Foreign Movies & Series',
            href: `/${lang}/movies-series`,
            icon: Monitor,
            isSeparator: true,
            activeMatch: '/movies-series'
        }
    ];

    const isActive = (link: any) => {
        return pathname === link.href || (link.activeMatch && pathname.includes(link.activeMatch));
    };

    return (
        <div className="flex flex-col gap-2 p-2">
            <div className="space-y-1">
                {navLinks.map((link) => (
                    <React.Fragment key={link.href}>
                        {link.isSeparator && <div className="my-4 h-px bg-gray-200 dark:bg-white/10 mx-2" />}
                        <Link
                            to={link.href}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group hover:bg-gray-100 dark:hover:bg-white/10",
                                isActive(link) && "opacity-100"
                            )}
                        >
                            <link.icon className={cn(
                                "w-6 h-6 shrink-0 transition-colors",
                                isActive(link)
                                    ? "text-black dark:text-white"
                                    : "text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white"
                            )} />
                            <span className={cn(
                                "text-lg font-black tracking-tight leading-none transition-colors",
                                isActive(link)
                                    ? "text-black dark:text-white"
                                    : "text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white"
                            )}>{link.label}</span>
                        </Link>
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
