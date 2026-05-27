const fs = require('fs');

const filePath = 'C:/Users/Abdo/Desktop/anime - last/ANIME-GOLANG/frontend/src/pages/animes/AnimeDetailsPage.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Fix activeTab
content = content.replace(
    "const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>(null);",
    "const [activeTab, setActiveTab] = useState<'seasons' | 'comments' | null>('seasons');"
);

// Fix query to add isLoading
content = content.replace(
    "const { data: animeCollections } = useQuery({",
    "const { data: animeCollections, isLoading: isLoadingCollections } = useQuery({"
);

// Add loading state in UI
const oldCondition = "{animeCollections && animeCollections.length > 0 ? (";
const newCondition = "{isLoadingCollections ? (\n    <div className=\"flex justify-center py-20\"><span className=\"ep-loader scale-75\" /></div>\n) : animeCollections && animeCollections.length > 0 ? (";
content = content.replace(oldCondition, newCondition);

fs.writeFileSync(filePath, content);
console.log("Successfully fixed state and loading indicator!");
