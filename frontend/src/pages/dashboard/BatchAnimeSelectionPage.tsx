import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Film } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getImageUrl } from "@/utils/image-utils";

export default function BatchAnimeSelectionPage() {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: animesResponse, isLoading } = useQuery({
        queryKey: ["batch-upload-animes"],
        queryFn: async () => (await api.get("/animes", { params: { type: "all_admin", limit: 0 } })).data,
    });

    const animes = Array.isArray(animesResponse) ? animesResponse : (animesResponse?.data || []);

    const filteredAnimes = animes.filter((anime: any) =>
        anime.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (anime.title_en && anime.title_en.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) return <PageLoader />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {lang === 'ar' ? 'اختيار الأنمي للرفع' : 'Select Anime for Upload'}
                    </h1>
                    <p className="text-muted-foreground">
                        {lang === 'ar' ? 'اختر الأنمي الذي تريد رفع حلقات له' : 'Choose an anime to start batch uploading episodes.'}
                    </p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder={lang === 'ar' ? 'بحث عن أنمي...' : 'Search animes...'}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {filteredAnimes.map((anime: any) => (
                    <Card 
                        key={anime.id} 
                        className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary"
                        onClick={() => navigate(`/${lang}/dashboard/batch-upload/${anime.id}`)}
                    >
                        <div className="aspect-[3/4] overflow-hidden">
                            <img
                                src={getImageUrl(anime.image || anime.cover)}
                                alt={anime.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                        <CardContent className="p-4">
                            <h3 className="line-clamp-1 font-bold leading-tight group-hover:text-primary">
                                {lang === 'ar' ? anime.title : (anime.title_en || anime.title)}
                            </h3>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Film className="h-3 w-3" />
                                <span>{anime.type} • {anime.status}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredAnimes.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    <p>{lang === 'ar' ? 'لم يتم العثور على أنميات' : 'No animes found.'}</p>
                </div>
            )}
        </div>
    );
}
