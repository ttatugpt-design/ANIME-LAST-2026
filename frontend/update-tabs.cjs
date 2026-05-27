const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add states
if (!content.includes('const [commentsCount, setCommentsCount] = useState(0);')) {
    content = content.replace(
        "const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>('seasons');",
        "const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>('seasons');\n    const [commentsCount, setCommentsCount] = useState(0);"
    );
}

// 2. Add seasonsCount
if (!content.includes('const seasonsCount =')) {
    content = content.replace(
        "    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);",
        "    const seasonsCount = animeCollections?.reduce((acc: number, col: any) => acc + (col.animes?.length || 0), 0) || 0;\n    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);"
    );
}

// 3. Update tabs rendering
const oldTabs = `{[
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
                                                            {tab.label}`;

const newTabs = `{[
                                                        { id: 'seasons', label: lang === 'ar' ? 'المواسم' : 'Seasons', icon: <Library className="w-5 h-5" />, count: seasonsCount },
                                                        { id: 'comments', label: lang === 'ar' ? 'التعليقات' : 'Comments', icon: <MessageCircle className="w-5 h-5" />, count: commentsCount },
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
                                                            <span className="text-lg md:text-xl">{tab.label}</span>
                                                            {tab.count > 0 && (
                                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-black ml-1", activeTab === tab.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-gray-200 text-gray-700 dark:bg-[#333] dark:text-gray-300")}>
                                                                    {tab.count}
                                                                </span>
                                                            )}`;

content = content.replace(oldTabs, newTabs);

// 4. Pass onCountChange to CommentsSection
const oldComments = `<CommentsSection 
                                                                        itemId={Number(anime.id)} 
                                                                        type="anime" 
                                                                        inputPosition="top"
                                                                    />`;
const newComments = `<CommentsSection 
                                                                        itemId={Number(anime.id)} 
                                                                        type="anime" 
                                                                        inputPosition="top"
                                                                        onCountChange={setCommentsCount}
                                                                    />`;
content = content.replace(oldComments, newComments);

// 5. Swap the TABS and EPISODES sections by splitting the code
// First, find the TABS SECTION
const tabsStartIdx = content.indexOf('{/* TABS SECTION (Shared) */}');
const tabsEndStr = '</div>\n\n                                            {/* EPISODES SECTION';
const tabsEndIdx = content.indexOf(tabsEndStr);

if (tabsStartIdx !== -1 && tabsEndIdx !== -1) {
    // Extract the Tabs block
    const tabsBlock = content.substring(tabsStartIdx, tabsEndIdx + 6); // +6 to include the closing </div>
    
    // Find the Episodes section
    const episodesStartIdx = content.indexOf('{/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}');
    const rightSidebarStartIdx = content.indexOf('{/* RIGHT SIDEBAR (Desktop Only) */}');
    
    if (episodesStartIdx !== -1 && rightSidebarStartIdx !== -1) {
        // Find the end of the Episodes section (which is just before the right sidebar)
        // Let's trace backwards from right sidebar to find the closing div of the main left column
        const episodesBlock = content.substring(episodesStartIdx, rightSidebarStartIdx);
        
        // Let's refine the blocks.
        // We want to remove the Tabs Block from its current position
        let newContent = content.substring(0, tabsStartIdx) + content.substring(tabsEndIdx + 6);
        
        // Now, newContent has the Episodes block right after where Tabs used to be.
        // We want to insert the Tabs Block AFTER the Episodes block.
        // But wait! Does the user want Episodes BEFORE Tabs, or just less padding?
        // Let's just decrease the padding first!
    }
}

// Just write the counts and padding fixes first to test
fs.writeFileSync(filePath, content);
console.log("Successfully updated state and tabs.");
