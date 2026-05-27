const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace lucide-react import
content = content.replace(
    'import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck, X } from "lucide-react";',
    'import { Search, Play, Plus, Share2, Star, Filter, ArrowUpDown, LayoutGrid, ChevronLeft, Loader2, Bookmark, BookmarkCheck, X, Library, MessageCircle } from "lucide-react";'
);

fs.writeFileSync(filePath, content);
console.log("Successfully fixed lucide-react imports!");
