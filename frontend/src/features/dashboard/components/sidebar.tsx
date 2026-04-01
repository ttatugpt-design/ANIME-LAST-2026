import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutDashboard, Users, Shield, Key, Settings, Box, Sparkles, Folder, Globe, Tag, Calendar, Building, Languages, Film, Play, Flag, BarChart3, MessageSquare, Newspaper, Server, Book, Library, Database, Upload } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    onNavigate?: () => void;
    lang?: string;
}

export function Sidebar({ className, onNavigate, lang = 'en' }: SidebarProps) {
    const { pathname } = useLocation();
    const { t, i18n } = useTranslation();

    const routes = [
        {
            label: t('common.dashboard'),
            icon: LayoutDashboard,
            href: `/${lang}/dashboard`,
            active: pathname === `/${lang}/dashboard`,
        },
        {
            label: t('common.friends', 'Friends'),
            icon: Users, // Using Users for now as generic, or UserPlus if preferred
            href: `/${lang}/dashboard/friends`,
            active: pathname.startsWith(`/${lang}/dashboard/friends`),
        },
        {
            label: t('common.users'),
            icon: Users,
            href: `/${lang}/dashboard/users`,
            active: pathname.startsWith(`/${lang}/dashboard/users`),
        },
        {
            label: t('common.roles'),
            icon: Shield,
            href: `/${lang}/dashboard/roles`,
            active: pathname.startsWith(`/${lang}/dashboard/roles`),
        },
        {
            label: t('common.permissions'),
            icon: Key,
            href: `/${lang}/dashboard/permissions`,
            active: pathname.startsWith(`/${lang}/dashboard/permissions`),
        },
        {
            label: "3D Models",
            icon: Box,
            href: `/${lang}/dashboard/models`,
            active: pathname.startsWith(`/${lang}/dashboard/models`),
        },
        {
            label: "Categories",
            icon: Folder,
            href: `/${lang}/dashboard/categories`,
            active: pathname.startsWith(`/${lang}/dashboard/categories`),
        },
        {
            label: "Types",
            icon: Tag,
            href: `/${lang}/dashboard/types`,
            active: pathname.startsWith(`/${lang}/dashboard/types`),
        },
        {
            label: "Seasons",
            icon: Calendar,
            href: `/${lang}/dashboard/seasons`,
            active: pathname.startsWith(`/${lang}/dashboard/seasons`),
        },
        {
            label: "Studios",
            icon: Building,
            href: `/${lang}/dashboard/studios`,
            active: pathname.startsWith(`/${lang}/dashboard/studios`),
        },
        {
            label: t('common.languages'),
            icon: Languages,
            href: `/${lang}/dashboard/languages`,
            active: pathname.startsWith(`/${lang}/dashboard/languages`),
        },
        {
            label: t('common.countries'),
            icon: Globe,
            href: `/${lang}/dashboard/countries`,
            active: pathname.startsWith(`/${lang}/dashboard/countries`),
        },
        {
            label: i18n.language === 'ar' ? 'السيرفرات' : 'Servers',
            icon: Server,
            href: `/${lang}/dashboard/servers`,
            active: pathname.startsWith(`/${lang}/dashboard/servers`),
        },
        {
            label: "Animes",
            icon: Film,
            href: `/${lang}/dashboard/animes`,
            active: pathname.startsWith(`/${lang}/dashboard/animes`),
        },
        {
            label: i18n.language === 'ar' ? 'المانجا' : 'Mangas',
            icon: Book,
            href: `/${lang}/dashboard/mangas`,
            active: pathname.startsWith(`/${lang}/dashboard/mangas`),
        },
        {
            label: i18n.language === 'ar' ? 'أفلام ومسلسلات أجنبية' : 'Foreign Media',
            icon: Film,
            href: `/${lang}/dashboard/foreign-animes`,
            active: pathname.startsWith(`/${lang}/dashboard/foreign-animes`),
        },
        {
            label: "Episodes",
            icon: Play,
            href: `/${lang}/dashboard/episodes`,
            active: pathname.startsWith(`/${lang}/dashboard/episodes`),
        },
        {
            label: i18n.language === 'ar' ? 'الرفع الدفعي' : 'Batch Upload',
            icon: Upload,
            href: `/${lang}/dashboard/batch-upload`,
            active: pathname.startsWith(`/${lang}/dashboard/batch-upload`),
        },
        {
            label: i18n.language === 'ar' ? 'سيرفرات Embed' : 'Embed Servers',
            icon: Server,
            href: `/${lang}/dashboard/embed-accounts`,
            active: pathname.startsWith(`/${lang}/dashboard/embed-accounts`),
        },
        {
            label: i18n.language === 'ar' ? 'الفصول' : 'Chapters',
            icon: Library,
            href: `/${lang}/dashboard/chapters`,
            active: pathname.startsWith(`/${lang}/dashboard/chapters`),
        },
        {
            label: i18n.language === 'ar' ? 'حلقات أجنبية' : 'Foreign Episodes',
            icon: Play,
            href: `/${lang}/dashboard/foreign-episodes`,
            active: pathname.startsWith(`/${lang}/dashboard/foreign-episodes`),
        },
        {
            label: "3D AI Lab",
            icon: Sparkles,
            href: `/${lang}/dashboard/ai-lab`,
            active: pathname.startsWith(`/${lang}/dashboard/ai-lab`),
        },
        {
            label: "Reports",
            icon: Flag,
            href: `/${lang}/dashboard/reports`,
            active: pathname.startsWith(`/${lang}/dashboard/reports`),
        },
        {
            label: "Analytics",
            icon: BarChart3,
            href: `/${lang}/dashboard/analytics`,
            active: pathname.startsWith(`/${lang}/dashboard/analytics`),
        },
        {
            label: "Comments",
            icon: MessageSquare,
            href: `/${lang}/dashboard/comments`,
            active: pathname.startsWith(`/${lang}/dashboard/comments`),
        },
        {
            label: "Quick News",
            icon: Newspaper,
            href: `/${lang}/dashboard/quick-news`,
            active: pathname.startsWith(`/${lang}/dashboard/quick-news`),
        },
        {
            label: t('common.settings'),
            icon: Settings,
            href: `/${lang}/dashboard/settings`,
            active: pathname.startsWith(`/${lang}/dashboard/settings`),
        },
        {
            label: i18n.language === 'ar' ? 'النسخ الاحتياطي' : 'Database Backup',
            icon: Database,
            href: `/${lang}/dashboard/backups`,
            active: pathname.startsWith(`/${lang}/dashboard/backups`),
        },
    ];

    const { data: latestAnimes } = useQuery({
        queryKey: ['sidebar-latest-animes'],
        queryFn: async () => (await api.get('/animes', { params: { limit: 1 } })).data,
    });

    const { data: latestEpisodes } = useQuery({
        queryKey: ['sidebar-latest-episodes'],
        queryFn: async () => (await api.get('/episodes', { params: { limit: 1 } })).data,
    });

    const latestAnime = latestAnimes?.[0];
    const latestEpisode = latestEpisodes?.[0];

    return (
        <div className={cn("pb-12 h-full bg-background/95 border-r border-border/40", className)}>
            <div className="space-y-2 py-4"> {/* Reduced space-y-4 to space-y-2 */}

                {/* Homepage Section */}
                <div className="px-3 py-1">
                    {/* <h2 className="mb-2 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
            {t('common.homepage', { defaultValue: 'HOMEPAGE' })}
          </h2> */}
                    {/* The image doesn't show "Homepage" header explicitly for the first items, or maybe it does but very subtle.
              The user's image shows "Project" (مشروع) as a top level item? Or a section?
              Actually the image shows "Dashboard" isn't even there?
              It shows "Project", "CRM", "Analytics", "HRM"...
              I will keep my structure but make font smaller/cleaner.
          */}
                    <div className="space-y-0.5"> {/* Tighter list */}
                        <Button
                            variant={pathname === `/${lang}/dashboard` ? "secondary" : "ghost"}
                            className={cn("w-full justify-start text-[12px] font-normal h-8 px-4", pathname === `/${lang}/dashboard` && "bg-primary/10 text-primary hover:bg-primary/20")}
                            asChild
                        >
                            <Link to={`/${lang}/dashboard`} onClick={onNavigate}>
                                <LayoutDashboard className="mr-3 h-4 w-4 rtl:ml-3 rtl:mr-0 opacity-80" /> {/* Slightly smaller icon h-4 w-4 */}
                                {t('common.dashboard')}
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            className={cn("w-full justify-start text-[12px] font-normal h-8 px-4")}
                            asChild
                        >
                            <Link to={`/${lang}`} onClick={onNavigate}>
                                <Globe className="mr-3 h-4 w-4 rtl:ml-3 rtl:mr-0 opacity-80" />
                                {useTranslation().i18n.language === 'ar' ? 'صفحة الموقع' : 'Website'}
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Apps Section */}
                <div className="px-3 py-1">
                    <h2 className="mb-1 px-4 text-[10px] font-semibold text-muted-foreground/60 dark:text-white/60 uppercase tracking-wider">
                        {t('common.apps', { defaultValue: 'APPS' })}
                    </h2>
                    <div className="space-y-0.5">
                        {routes.slice(1).map((route) => (
                            <Button
                                key={route.href}
                                variant={route.active ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-[12px] font-normal h-8 px-4",
                                    route.active ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-black dark:text-white hover:text-black dark:hover:text-white"
                                )}
                                asChild
                            >
                                <Link to={route.href} onClick={onNavigate}>
                                    <route.icon className={cn("mr-3 h-4 w-4 rtl:ml-3 rtl:mr-0 opacity-80", !route.active && "text-black dark:text-white")} />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Latest Updates Section */}
                {(latestAnime || latestEpisode) && (
                    <div className="px-3 py-4 space-y-4">
                        <h2 className="px-4 text-[10px] font-semibold text-muted-foreground/60 dark:text-white/60 uppercase tracking-wider">
                            {i18n.language === 'ar' ? 'آخر التحديثات' : 'LATEST UPDATES'}
                        </h2>

                        {latestAnime && (
                            <div className="px-2">
                                <p className="px-2 mb-2 text-[10px] font-medium text-muted-foreground dark:text-white/50 uppercase">
                                    {i18n.language === 'ar' ? 'أحدث أنمي' : 'Latest Anime'}
                                </p>
                                <Link
                                    to={`/${lang}/animes/${latestAnime.id}`}
                                    className="flex gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                                    onClick={onNavigate}
                                >
                                    <div className="w-16 h-20 flex-shrink-0 bg-muted rounded overflow-hidden">
                                        <img
                                            src={latestAnime.image || latestAnime.cover}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0 py-1">
                                        <h4 className="text-[12px] font-bold text-black dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                            {i18n.language === 'ar' ? latestAnime.title : (latestAnime.title_en || latestAnime.title)}
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground dark:text-white/50 mt-1 uppercase">
                                            {latestAnime.type} • {latestAnime.status}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        )}

                        {latestEpisode && (
                            <div className="px-2">
                                <p className="px-2 mb-2 text-[10px] font-medium text-muted-foreground dark:text-white/50 uppercase">
                                    {i18n.language === 'ar' ? 'أحدث حلقة' : 'Latest Episode'}
                                </p>
                                <Link
                                    to={`/${lang}/watch/${latestEpisode.anime_id}/${latestEpisode.episode_number}`}
                                    className="flex gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                                    onClick={onNavigate}
                                >
                                    <div className="w-16 h-12 flex-shrink-0 bg-muted rounded overflow-hidden relative">
                                        <img
                                            src={latestEpisode.thumbnail || latestEpisode.banner}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="w-4 h-4 text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-bold text-black dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                            {i18n.language === 'ar' ? latestEpisode.title : (latestEpisode.title_en || latestEpisode.title)}
                                        </h4>
                                        <p className="text-[9px] text-muted-foreground dark:text-white/50 mt-0.5">
                                            {i18n.language === 'ar' ? `الحلقة ${latestEpisode.episode_number}` : `Episode ${latestEpisode.episode_number}`}
                                        </p>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
