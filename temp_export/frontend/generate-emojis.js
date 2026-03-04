import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const emojiDir = path.join(__dirname, 'public', 'custom-emojis');
const outputFile = path.join(__dirname, 'src', 'lib', 'customEmojis.ts');

const files = fs.readdirSync(emojiDir).filter(file => file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg'));

// Sort files: standard emojis (emoji_u...) first, then others
const sortedFiles = files.sort((a, b) => {
    const aIsStandard = a.startsWith('emoji_u');
    const bIsStandard = b.startsWith('emoji_u');

    if (aIsStandard && !bIsStandard) return -1;
    if (!aIsStandard && bIsStandard) return 1;
    return a.localeCompare(b);
});

const emojis = sortedFiles.map((file, index) => {
    const id = file.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_');
    return {
        id: id,
        names: [id],
        imgUrl: `/custom-emojis/${file}`
    };
});

const content = `export const customEmojis = ${JSON.stringify(emojis, null, 4)};`;

fs.writeFileSync(outputFile, content);
console.log(`Generated ${emojis.length} custom emojis (standard emojis first) in ${outputFile}`);
