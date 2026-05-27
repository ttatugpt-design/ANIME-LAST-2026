const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// The block to replace
const oldDescriptionBlock = `{/* Description Section - Full width below the header */}
                                                <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-6 rounded-none border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
                                                    <p className="text-gray-800 dark:text-gray-300 text-base lg:text-lg leading-relaxed font-medium">
                                                        {renderEmojiContent(animeDescription || 'No description available.')}
                                                    </p>
                                                </div>`;

const newDescriptionBlock = ``;

// Where to insert
const insertTarget = `{/* Actions Buttons */}`;
const insertContent = `{/* Description Section */}
                                                        <div className="mb-8">
                                                            <p className="text-gray-900 dark:text-gray-100 text-lg lg:text-xl xl:text-2xl font-bold leading-relaxed drop-shadow-sm">
                                                                {renderEmojiContent(animeDescription || 'No description available.')}
                                                            </p>
                                                        </div>

                                                        {/* Actions Buttons */}`;

if (content.includes(oldDescriptionBlock) && content.includes(insertTarget)) {
    content = content.replace(oldDescriptionBlock, newDescriptionBlock);
    content = content.replace(insertTarget, insertContent);
    fs.writeFileSync(filePath, content);
    console.log("Successfully moved description.");
} else {
    console.log("Could not find the target strings.");
}
