const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Imports
if (!content.includes('MessageCircle')) {
    content = content.replace(
        'import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck, X, Library } from "lucide-react";',
        'import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck, X, Library, MessageCircle } from "lucide-react";'
    );
}
if (!content.includes('CommentsSection')) {
    content = content.replace(
        'import { WatchLaterButton } from \'@/components/common/WatchLaterButton\';',
        'import { WatchLaterButton } from \'@/components/common/WatchLaterButton\';\nimport { CommentsSection } from "@/components/comments/CommentsSection";'
    );
}

// 2. Add State
const stateToAdd = `    const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>(null);

    // Fetch Collections for this anime
    const { data: animeCollections } = useQuery({
        queryKey: ["anime-collections-by-anime", id],
        queryFn: async () => (await api.get(\`/anime-collections/anime/\${id}\`)).data,
        enabled: !!id,
    });`;

if (!content.includes('activeTab')) {
    content = content.replace(
        'const [searchQuery, setSearchQuery] = useState("");',
        `const [searchQuery, setSearchQuery] = useState("");\n${stateToAdd}`
    );
}

// 3. Add SeasonListItem Component at the end of the file
const seasonListItemComp = `
function SeasonListItem({ anime, lang, currentId }: { anime: any; lang: string; currentId: number }) {
    const isRtl = lang === 'ar';
    const isCurrent = Number(anime.id) === currentId;
    const title = isRtl ? anime.title : (anime.title_en || anime.title);
    const description = isRtl
        ? (anime.description || anime.description_en || 'لا يوجد وصف متاح لهذا الأنمي.')
        : (anime.description_en || anime.description || 'No description available for this anime.');
    const image = anime.image || anime.cover;

    return (
        <Link
            to={isCurrent ? "#" : \`/\${lang}/animes/\${anime.id}/\${slugify(title)}\`}
            className={cn(
                "group relative flex flex-row gap-4 md:gap-8 bg-transparent hover:bg-white dark:hover:bg-neutral-900/40 transition-all duration-300 p-2 md:p-4 rounded-2xl border border-transparent hover:border-gray-100 dark:hover:border-white/5 hover:shadow-2xl overflow-hidden",
                isCurrent && "border-primary/30 bg-primary/5 dark:bg-primary/5 pointer-events-none"
            )}
        >
            {/* Image Section */}
            <div className="w-[100px] md:w-[180px] aspect-[2/3] flex-shrink-0 relative overflow-hidden shadow-2xl rounded-xl">
                <SpinnerImage
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-full"
                    imageClassName="object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {isCurrent && (
                    <div className="absolute top-2 left-2 right-2 flex justify-center">
                        <div className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg border border-white/20 uppercase tracking-tighter animate-pulse">
                            {isRtl ? 'الموسم الحالي' : 'Current Season'}
                        </div>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className={\`flex-1 flex flex-col justify-center \${isRtl ? 'text-right' : 'text-left'} py-2\`}>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <h3 className={cn(
                        "text-lg md:text-2xl font-black transition-colors leading-tight font-cairo",
                        isCurrent ? "text-primary" : "text-gray-900 dark:text-white group-hover:text-primary"
                    )}>
                        {title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">{anime.type}</span>
                        <span>•</span>
                        <span className="text-primary">{anime.status}</span>
                        {anime.rating && (
                            <>
                                <span>•</span>
                                <div className="flex items-center gap-1 text-yellow-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{anime.rating}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <p className="text-xs md:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-3 mb-4">
                    {description}
                </p>

                <div className="mt-auto flex items-center gap-4">
                    <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                        {isRtl ? 'عرض التفاصيل' : 'View Details'}
                        <ChevronLeft className={\`w-4 h-4 \${isRtl ? '' : 'rotate-180'}\`} />
                    </span>
                </div>
            </div>
        </Link>
    );
}`;

if (!content.includes('function SeasonListItem')) {
    content += '\n' + seasonListItemComp;
}

// 4. Inject Tabs UI between Desktop Hero and Mobile Episodes
const tabsUI = `
                                            {/* TABS SECTION (Shared) */}
                                            <div className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-8 mb-8">
                                                <div className="flex justify-center md:justify-start gap-4 border-b border-gray-100 dark:border-[#2a2a2a] pb-2">
                                                    {[
                                                        { id: 'seasons', label: lang === 'ar' ? 'المواسم' : 'Seasons', icon: <Library className="w-4 h-4" /> },
                                                        { id: 'comments', label: lang === 'ar' ? 'التعليقات' : 'Comments', icon: <MessageCircle className="w-4 h-4" /> },
                                                    ].map((tab) => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id as any)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-6 py-3 rounded-t-xl font-black uppercase tracking-widest transition-all relative",
                                                                activeTab === tab.id
                                                                    ? "text-black dark:text-white"
                                                                    : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                                            )}
                                                        >
                                                            {tab.icon}
                                                            {tab.label}
                                                            {activeTab === tab.id && (
                                                                <motion.div
                                                                    layoutId="activeTabIndicator"
                                                                    className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white rounded-t-full translate-y-2"
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {activeTab && (
                                                        <motion.div
                                                            key={activeTab}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="mt-8 pt-4 min-h-[200px]"
                                                        >
                                                            {activeTab === 'seasons' && (
                                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                    {animeCollections && animeCollections.length > 0 ? (
                                                                        <div className="flex flex-col gap-10">
                                                                            {animeCollections.map((col: any) => (
                                                                                <div key={col.id || col.ID} className="space-y-6">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="h-6 w-1.5 bg-black dark:bg-white rounded-full"></div>
                                                                                        <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                                                            {lang === 'ar' ? col.title_ar : col.title_en}
                                                                                        </h3>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-4">
                                                                                        {col.animes?.map((relatedAnime: any) => (
                                                                                            <SeasonListItem 
                                                                                                key={relatedAnime.id}
                                                                                                anime={relatedAnime}
                                                                                                lang={lang}
                                                                                                currentId={Number(id)}
                                                                                            />
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-center py-20 bg-gray-50/50 dark:bg-[#1a1a1a] rounded-2xl border border-dashed border-gray-200 dark:border-[#2a2a2a]">
                                                                            <Library className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4 opacity-50" />
                                                                            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">
                                                                                {lang === 'ar' ? 'لا توجد مواسم مرتبطة حالياً' : 'No related seasons found'}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {activeTab === 'comments' && (
                                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                                    <CommentsSection 
                                                                        itemId={Number(anime.id)} 
                                                                        type="anime" 
                                                                        inputPosition="top"
                                                                    />
                                                                </div>
                                                            )}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
`;

if (!content.includes('TABS SECTION (Shared)')) {
    // Inject right before the mobile episodes section
    content = content.replace(
        '{/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}',
        tabsUI + '\n                                            {/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}'
    );
}

fs.writeFileSync(filePath, content);
console.log("Successfully injected tabs, state, and components into AnimeDetailsPage!");
