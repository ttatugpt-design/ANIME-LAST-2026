const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const tabsStartStr = '{/* TABS SECTION (Shared) */}';
const episodesStartStr = '{/* EPISODES SECTION - Browse All List Design (Mobile & Small Tablets Only) */}';
const sidebarStartStr = '{/* RIGHT SIDEBAR (Desktop Only) */}';

const tabsIdx = content.indexOf(tabsStartStr);
const episodesIdx = content.indexOf(episodesStartStr);
const sidebarIdx = content.indexOf(sidebarStartStr);

if (tabsIdx !== -1 && episodesIdx !== -1 && sidebarIdx !== -1) {
    // Extract Tabs block
    // The Tabs block ends right before the Episodes block starts
    const tabsBlockRaw = content.substring(tabsIdx, episodesIdx);
    
    // Extract Episodes block
    // The Episodes block ends right before the Sidebar block starts
    const episodesBlockRaw = content.substring(episodesIdx, sidebarIdx);
    
    // Let's refine the padding/margins before swapping
    // For Tabs:
    let tabsBlock = tabsBlockRaw.replace(
        'className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-8 mb-8"', 
        'className="w-full max-w-5xl mx-auto px-4 md:px-12 mt-2 mb-4"'
    );
    
    // For Episodes:
    let episodesBlock = episodesBlockRaw.replace(
        'className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 py-12 w-full"',
        'className="lg:hidden max-w-6xl mx-auto px-2 md:px-8 py-4 w-full"'
    );
    
    // Reconstruct the file with swapped order: Episodes first, then Tabs
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
