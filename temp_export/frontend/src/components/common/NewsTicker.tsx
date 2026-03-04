import React from 'react';

import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { Newspaper } from 'lucide-react';
import { renderEmojiContent } from '@/utils/render-content';


interface QuickNews {
    id: number;
    description: string;
    description_en: string;
}

export const NewsTicker: React.FC = () => {
    const { i18n } = useTranslation();
    const isAr = i18n.language === 'ar';

    const { data: newsItems } = useQuery<QuickNews[]>({
        queryKey: ['quick-news'],
        queryFn: async () => (await api.get('/quick-news')).data,
        staleTime: 5 * 60 * 1000,
    });

    if (!newsItems || newsItems.length === 0) return null;



    return (
        <div className="w-full bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-200 dark:border-[#2a2a2a] overflow-hidden py-2 sticky top-[60px] z-[40] group shadow-sm">
            <div className="max-w-[1800px] mx-auto flex items-center px-4">
                {/* Fixed Label */}
                <div className="flex items-center gap-2 bg-white dark:bg-black px-3 py-1 rounded-full border border-gray-200 dark:border-[#333] z-10 shadow-sm flex-shrink-0">
                    <Newspaper className="w-4 h-4 text-black dark:text-white" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {isAr ? 'آخر الأخبار' : 'Breaking News'}
                    </span>
                </div>

                {/* Marquee Container */}
                <div className="flex-1 overflow-hidden relative mx-4 mask-fade">
                    <div className={`flex whitespace-nowrap animate-marquee group-hover:pause-animation ${isAr ? 'flex-row-reverse animate-marquee-reverse' : 'flex-row'}`}>
                        {newsItems.map((news) => (
                            <div key={news.id} className="flex items-center mx-8">
                                <div className="text-sm font-bold text-gray-950 dark:text-white flex items-center">
                                    {renderEmojiContent(isAr ? news.description : (news.description_en || news.description))}
                                </div>
                                <div className="w-2 h-2 rounded-full bg-black/50 dark:bg-white/50 mx-8 flex-shrink-0"></div>
                            </div>
                        ))}
                        {/* Duplicate for seamless loop */}
                        {newsItems.map((news) => (
                            <div key={`dup-${news.id}`} className="flex items-center mx-8">
                                <div className="text-sm font-bold text-gray-950 dark:text-white flex items-center">
                                    {renderEmojiContent(isAr ? news.description : (news.description_en || news.description))}
                                </div>
                                <div className="w-2 h-2 rounded-full bg-black/50 dark:bg-white/50 mx-8 flex-shrink-0"></div>
                            </div>
                        ))}

                    </div>
                </div>
            </div>

            <style>{`
                .animate-marquee {
                    animation: marquee 10s linear infinite;
                }
                .animate-marquee-reverse {
                    animation: marquee-reverse 10s linear infinite;
                }
                .pause-animation {
                    animation-play-state: paused;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marquee-reverse {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(50%); }
                }
                .mask-fade {
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
            `}</style>
        </div>
    );
};
