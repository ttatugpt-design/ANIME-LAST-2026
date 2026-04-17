import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ThumbsUp, Reply, History as HistoryIcon, Bookmark, Bell } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface UserStats {
    notifications_count: number;
    history_count: number;
    watch_later_count: number;
    comments_count: number;
    replies_count: number;
    likes_count: number;
}

import { UserInteractionsList } from '@/components/user-dashboard/UserInteractionsList';

export default function UserStatsPage() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/user/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch user stats:', error);
                toast.error(isRtl ? 'فشل تحميل الإحصائيات' : 'Failed to load statistics');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [isRtl]);

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <Card className="border-gray-100 dark:border-white/10 bg-white dark:bg-black hover:bg-white dark:hover:bg-white/5 transition-all rounded-none shadow-sm hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-black text-black dark:text-white">{value?.toLocaleString() || 0}</div>
            </CardContent>
        </Card>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-gray-100 dark:border-white/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="text-right">
                <h1 className="text-4xl font-black text-black dark:text-white mb-2 tracking-tight">{isRtl ? 'إحصائياتي' : 'My Statistics'}</h1>
                <p className="text-gray-500 font-bold">{isRtl ? 'نظرة عامة على نشاطك وتفاعلاتك في المنصة' : 'An overview of your activity and interactions on the platform'}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    title={isRtl ? 'التعليقات' : 'Comments'}
                    value={stats?.comments_count}
                    icon={MessageSquare}
                    color="text-blue-500"
                />
                <StatCard
                    title={isRtl ? 'الردود' : 'Replies'}
                    value={stats?.replies_count}
                    icon={Reply}
                    color="text-green-500"
                />
                <StatCard
                    title={isRtl ? 'الإعجابات' : 'Likes'}
                    value={stats?.likes_count}
                    icon={ThumbsUp}
                    color="text-red-500"
                />
                <StatCard
                    title={isRtl ? 'سجل المشاهدة' : 'Watch History'}
                    value={stats?.history_count}
                    icon={HistoryIcon}
                    color="text-purple-500"
                />
                <StatCard
                    title={isRtl ? 'قائمة المشاهدة' : 'Watch Later'}
                    value={stats?.watch_later_count}
                    icon={Bookmark}
                    color="text-black dark:text-white"
                />
                <StatCard
                    title={isRtl ? 'الإشعارات' : 'Notifications'}
                    value={stats?.notifications_count}
                    icon={Bell}
                    color="text-yellow-500"
                />
            </div>

            {/* Detailed Interactions Sections */}
            <div className="space-y-6">
                <div className="text-right border-r-4 border-black dark:border-white pr-4">
                    <h2 className="text-2xl font-black text-black dark:text-white">{isRtl ? 'تفاصيل النشاط' : 'Activity Details'}</h2>
                    <p className="text-sm text-gray-500 font-bold">{isRtl ? 'سجل تعليقاتك وتفاعلاتك الأخيرة' : 'Log of your recent comments and interactions'}</p>
                </div>

                <div className="bg-transparent p-0">
                    <UserInteractionsList />
                </div>
            </div>
        </div>
    );
}
