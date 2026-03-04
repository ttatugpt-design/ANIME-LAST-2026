import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, BarChart3, Users, PlayCircle, Film, Flag, Eye } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface GlobalStats {
    total_views: number;
    total_animes: number;
    total_episodes: number;
    total_reports: number;
    total_users: number;
}

interface TopContent {
    top_animes: Array<{
        id: number;
        title: string;
        title_en: string;
        image: string;
        total_views: number;
    }>;
    top_episodes: Array<{
        id: number;
        anime: { title: string; title_en: string };
        episode_number: number;
        views_count: number;
    }>;
}

export default function DashboardAnalyticsPage() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [topContent, setTopContent] = useState<TopContent | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, topRes] = await Promise.all([
                api.get('/dashboard/analytics/stats'),
                api.get('/dashboard/analytics/top')
            ]);
            setStats(statsRes.data);
            setTopContent(topRes.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to fetch analytics data');
        } finally {
            setIsLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, description, color }: any) => (
        <Card className="border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value?.toLocaleString() || 0}</div>
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">{t('Analytics')}</h1>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title={t('Total Views')}
                    value={stats?.total_views}
                    icon={Eye}
                    color="text-green-500"
                    description="All time episode views"
                />
                <StatCard
                    title={t('Total Animes')}
                    value={stats?.total_animes}
                    icon={Film}
                    color="text-purple-500"
                />
                <StatCard
                    title={t('Total Episodes')}
                    value={stats?.total_episodes}
                    icon={PlayCircle}
                    color="text-blue-500"
                />
                <StatCard
                    title={t('Total Reports')}
                    value={stats?.total_reports}
                    icon={Flag}
                    color="text-red-500"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Top Animes */}
                <Card className="col-span-4 border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            {t('Top Viewed Animes')}
                        </CardTitle>
                        <CardDescription>Most popular animes by total episode views</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">Image</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="text-right">Views</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topContent?.top_animes?.map((anime) => (
                                    <TableRow key={anime.id}>
                                        <TableCell>
                                            <div className="w-10 h-14 rounded overflow-hidden bg-muted">
                                                <img
                                                    src={anime.image}
                                                    alt={anime.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {anime.title}
                                            <span className="block text-xs text-muted-foreground">{anime.title_en}</span>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-500">
                                            {anime.total_views.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Top Episodes */}
                <Card className="col-span-3 border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            {t('Top Episodes')}
                        </CardTitle>
                        <CardDescription>Most watched individual episodes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Anime</TableHead>
                                    <TableHead className="w-[80px]">Episode</TableHead>
                                    <TableHead className="text-right">Views</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topContent?.top_episodes?.map((ep) => (
                                    <TableRow key={ep.id}>
                                        <TableCell className="font-medium text-sm">
                                            {ep.anime?.title || 'Unknown'}
                                        </TableCell>
                                        <TableCell>EP {ep.episode_number}</TableCell>
                                        <TableCell className="text-right font-bold text-green-500">
                                            {ep.views_count.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
