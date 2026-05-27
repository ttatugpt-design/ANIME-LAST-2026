const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import { slugify } from "@/utils/slug";')) {
    content = content.replace(
        'import { cn } from "@/lib/utils";',
        'import { cn } from "@/lib/utils";\nimport { slugify } from "@/utils/slug";'
    );
}

fs.writeFileSync(filePath, content);
console.log("Successfully added slugify import!");
