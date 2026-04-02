import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Film, Database } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getImageUrl } from "@/utils/image-utils";

export default function ServerFileSelectionPage() {
    const navigate = useNavigate();
    const { lang } = useParams<{ lang: string }>();
    const isAr = lang === 'ar';
    const [searchQuery, setSearchQuery] = useState("");

    const { data: animesResponse, isLoading } = useQuery({
        queryKey: ["server-files-animes"],
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
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {isAr ? 'ملفات السيرفر' : 'Server Files'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isAr
                                ? 'اختر الأنمي لاستعراض ملفاته على Doodstream وربطها بالحلقات'
                                : 'Select an anime to browse its files on Doodstream and link them to episodes.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder={isAr ? 'بحث عن أنمي...' : 'Search animes...'}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {filteredAnimes.map((anime: any) => (
                    <Card
                        key={anime.id}
                        className="group cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary hover:shadow-lg"
                        onClick={() => navigate(`/${lang}/dashboard/server-files/${anime.id}`)}
                    >
                        <div className="aspect-[3/4] overflow-hidden relative">
                            <img
                                src={getImageUrl(anime.image || anime.cover)}
                                alt={anime.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2 text-white">
                                    <Database className="h-8 w-8" />
                                    <span className="text-sm font-semibold">{isAr ? 'عرض الملفات' : 'Browse Files'}</span>
                                </div>
                            </div>
                        </div>
                        <CardContent className="p-3">
                            <h3 className="line-clamp-1 font-bold text-sm leading-tight group-hover:text-primary transition-colors">
                                {isAr ? anime.title : (anime.title_en || anime.title)}
                            </h3>
                            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <Film className="h-3 w-3" />
                                <span>{anime.type} • {anime.status}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredAnimes.length === 0 && (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                    <Database className="h-12 w-12 mb-3 opacity-30" />
                    <p>{isAr ? 'لم يتم العثور على أنميات' : 'No animes found.'}</p>
                </div>
            )}
        </div>
    );
}
