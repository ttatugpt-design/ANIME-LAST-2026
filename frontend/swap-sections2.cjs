const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const tabsStartStr = '{/* TABS SECTION (Shared) */}';
const episodesStartStr = '{/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}';
const sidebarStartStr = '{/* Right Sidebar - Episodes List (Desktop Only) */}';

const tabsIdx = content.indexOf(tabsStartStr);
const episodesIdx = content.indexOf(episodesStartStr);
const sidebarIdx = content.indexOf(sidebarStartStr);

if (tabsIdx !== -1 && episodesIdx !== -1 && sidebarIdx !== -1) {
    const tabsBlockRaw = content.substring(tabsIdx, episodesIdx);
    const episodesBlockRaw = content.substring(episodesIdx, sidebarIdx);
    
    // Reduce padding
    let tabsBlock = tabsBlockRaw.replace(
        'className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-8 mb-8"', 
        'className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-4 mb-4"'
    );
    
    let episodesBlock = episodesBlockRaw.replace(
        'className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 py-12 w-full"',
        'className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 pt-4 pb-8 w-full"'
    );
    
    const beforeTabs = content.substring(0, tabsIdx);
    const afterEpisodes = content.substring(sidebarIdx);
    
    const newContent = beforeTabs + episodesBlock + tabsBlock + afterEpisodes;
    
    fs.writeFileSync(filePath, newContent);
    console.log("Successfully swapped Episodes and Tabs, and reduced spacing!");
} else {
    console.error("Could not find the necessary markers in the file.", {
        tabsFound: tabsIdx !== -1,
        episodesFound: episodesIdx !== -1,
        sidebarFound: sidebarIdx !== -1
    });
}
