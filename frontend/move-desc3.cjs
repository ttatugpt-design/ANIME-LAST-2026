const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Move Description
const descRegex = /\{\/\* Description Section - Full width below the header \*\/\}\s*<div className="bg-white dark:bg-\[#1a1a1a\] p-4 md:p-6 rounded-none border border-gray-100 dark:border-\[#2a2a2a\] shadow-sm">\s*<p className="text-gray-800 dark:text-gray-300 text-base lg:text-lg leading-relaxed font-medium">\s*\{renderEmojiContent\(animeDescription \|\| 'No description available\.'\)\}\s*<\/p>\s*<\/div>/;

if (descRegex.test(content)) {
    content = content.replace(descRegex, '');
    
    const targetRegex = /\{\/\* Actions Buttons \*\/\}\s*<div className="flex flex-wrap items-center gap-4 mt-auto min-h-\[64px\]">/;
    
    const insertContent = `{/* Description Section */}
                                                        <div className="mb-6 mt-2">
                                                            <p className="text-gray-900 dark:text-gray-100 text-base md:text-lg lg:text-xl font-bold leading-relaxed drop-shadow-sm">
                                                                {renderEmojiContent(animeDescription || 'No description available.')}
                                                            </p>
                                                        </div>

                                                        {/* Actions Buttons */}
                                                        <div className="flex flex-wrap items-center gap-4 mt-auto min-h-[64px]">`;
    
    if (targetRegex.test(content)) {
        content = content.replace(targetRegex, insertContent);
        fs.writeFileSync(filePath, content);
        console.log("Successfully moved description.");
    } else {
        console.log("Could not find insert target.");
    }
} else {
    console.log("Could not find old description block via regex.");
}
