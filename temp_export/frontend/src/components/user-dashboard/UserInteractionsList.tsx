import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, ThumbsUp, Reply, Clock, ExternalLink, PlayCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { slugify } from '@/utils/slug';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { renderEmojiContent } from '@/utils/render-content';

interface Interaction {
    id: number;
    type: 'comment' | 'reply' | 'like';
    content?: string;
    created_at: string;
    parent_author?: string;
    parent_content?: string;
    episode?: {
        episode_number: number;
        title: string;
        title_en: string;
        anime?: {
            id: number;
            title: string;
            title_en: string;
        };
    };
    comment?: {
        episode?: {
            episode_number: number;
            title: string;
            title_en: string;
            anime?: {
                id: number;
                title: string;
                title_en: string;
            };
        };
    };
}

export const UserInteractionsList = () => {
    const { i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('comment');

    useEffect(() => {
        const fetchInteractions = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/user/interactions', {
                    params: { type: activeTab, limit: 10 }
                });
                setInteractions(response.data.items || []);
            } catch (error) {
                console.error('Failed to fetch interactions:', error);
                toast.error(isRtl ? 'فشل تحميل التفاعلات' : 'Failed to load interactions');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInteractions();
    }, [activeTab, isRtl]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'comment': return <MessageSquare className="w-5 h-5 text-blue-500" />;
            case 'reply': return <Reply className="w-5 h-5 text-green-500" />;
            case 'like': return <ThumbsUp className="w-5 h-5 text-red-500" />;
            default: return <Clock className="w-5 h-5 text-gray-500" />;
        }
    };

    const getLabel = (type: string) => {
        switch (type) {
            case 'comment': return isRtl ? 'تعليقي' : 'My Comment';
            case 'reply': return isRtl ? 'ردي' : 'My Reply';
            case 'like': return isRtl ? 'أعجبني' : 'Liked';
            default: return isRtl ? 'نشاط' : 'Activity';
        }
    };

    const InteractionCard = ({ item }: { item: Interaction }) => {
        const episodeData = item.episode || item.comment?.episode;
        const animeData = episodeData?.anime;
        const animeTitle = animeData ? (isRtl ? animeData.title : animeData.title_en || animeData.title) : '';
        const episodeNum = episodeData?.episode_number;

        const targetLink = animeData ?
            `/${i18n.language}/watch/${animeData.id}/${episodeNum || 1}/${slugify(animeTitle)}?commentId=${item.id}`
            : '#';

        return (
            <div className="bg-card border border-border p-5 flex flex-col gap-4 hover:border-primary/50 transition-all group rounded-none shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-white/5 rounded-none">{getIcon(item.type)}</div>
                        <div>
                            <span className="text-xs font-black text-black dark:text-white uppercase tracking-widest block mb-0.5">{getLabel(item.type)}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: isRtl ? ar : undefined })}
                            </span>
                        </div>
                    </div>
                    {animeData && (
                        <Link
                            to={targetLink}
                            className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-full hover:scale-110 transition-transform shadow-lg shadow-black/10 dark:shadow-white/10"
                        >
                            <PlayCircle className="w-5 h-5" />
                        </Link>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="text-right">
                        {item.type === 'like' ? (
                            <div className="flex flex-col gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">{isRtl ? `أعجبت بتعليق ${item.parent_author}:` : `Liked comment by ${item.parent_author}:`}</span>
                                <div className="text-black dark:text-white text-base font-bold bg-gray-50 dark:bg-white/5 p-3 border-r-4 border-black dark:border-white">
                                    {renderEmojiContent(item.content)}
                                </div>
                            </div>
                        ) : (
                            <Link to={targetLink} className="text-black dark:text-white text-lg font-bold leading-relaxed hover:text-gray-600 dark:hover:text-gray-300 transition-colors block">
                                {renderEmojiContent(item.content)}
                            </Link>
                        )}
                    </div>

                    {item.type === 'reply' && item.parent_content && (
                        <div className="bg-gray-100 dark:bg-white/5 p-4 border-r-4 border-gray-300 dark:border-white/20 space-y-2 mt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{isRtl ? 'التعليق الأصلي' : 'Original Comment'}</span>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{item.parent_author}</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-sm italic">
                                {renderEmojiContent(item.parent_content)}
                            </div>
                        </div>
                    )}

                    {animeData && (
                        <div className="flex items-center justify-end gap-2 text-xs font-bold pt-2 border-t border-gray-100 dark:border-white/10">
                            <span className="text-gray-500 dark:text-gray-400">{isRtl ? 'في:' : 'In:'}</span>
                            <Link
                                to={targetLink}
                                className="text-black dark:text-white hover:underline transition-colors flex items-center gap-1"
                            >
                                {animeTitle}
                                {episodeNum && (isRtl ? ` (الحلقة ${episodeNum})` : ` (EP ${episodeNum})`)}
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Tabs defaultValue="comment" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-black border border-gray-100 dark:border-white/10 p-1 h-12 rounded-none mb-6 shadow-sm">
                <TabsTrigger value="comment" className="rounded-none data-[state=active]:bg-black dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-black font-black text-[10px] uppercase transition-all">
                    {isRtl ? 'تعليقاتي' : 'Comments'}
                </TabsTrigger>
                <TabsTrigger value="reply" className="rounded-none data-[state=active]:bg-black dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-black font-black text-[10px] uppercase transition-all">
                    {isRtl ? 'ردودي' : 'Replies'}
                </TabsTrigger>
                <TabsTrigger value="like" className="rounded-none data-[state=active]:bg-black dark:data-[state=active]:bg-white data-[state=active]:text-white dark:data-[state=active]:text-black font-black text-[10px] uppercase transition-all">
                    {isRtl ? 'أعجبني' : 'Likes'}
                </TabsTrigger>
            </TabsList>

            {['comment', 'reply', 'like'].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-0 outline-none">
                    {isLoading ? (
                        <div className="flex items-center justify-center min-h-[200px]">
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 border-4 border-gray-100 dark:border-white/10 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-t-black dark:border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                            </div>
                        </div>
                    ) : interactions.length === 0 ? (
                        <div className="bg-white dark:bg-black p-10 text-center rounded-none border border-gray-100 dark:border-white/10">
                            <p className="text-gray-500 dark:text-gray-400 font-bold">{isRtl ? 'لا توجد بيانات' : 'Empty'}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                            {interactions.map((item) => (
                                <InteractionCard key={`${item.type}-${item.id}`} item={item} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );
};
