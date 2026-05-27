import React, { useState, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Search, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image-utils";
import { useInView } from "react-intersection-observer";

interface AnimeGridSelectionProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    language: string;
}

export function AnimeGridSelection({ selectedIds, onChange, language }: AnimeGridSelectionProps) {
    const [search, setSearch] = useState("");
    const { ref: loadMoreRef, inView } = useInView();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ["animes-grid-selection", search],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await api.get("/animes", {
                params: {
                    search: search || undefined,
                    paginate: true,
                    limit: 20,
                    page: pageParam,
                    type: 'all_admin_anime',
                }
            });
            return response.data;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.page < lastPage.last_page) {
                return lastPage.page + 1;
            }
            return undefined;
        },
        initialPageParam: 1,
    });

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    const toggleSelection = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(i => i !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const animes = data?.pages.flatMap(page => page.data) || [];

    return (
        <div className="flex flex-col gap-4 border rounded-xl p-4 bg-muted/30">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={language === 'ar' ? "ابحث عن أنمي..." : "Search anime..."}
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : animes.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        {language === 'ar' ? "لا توجد نتائج" : "No results found"}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {animes.map((anime: any) => {
                            const isSelected = selectedIds.includes(anime.id.toString());
                            const title = language === 'ar' ? anime.title : (anime.title_en || anime.title);
                            
                            return (
                                <div
                                    key={anime.id}
                                    onClick={() => toggleSelection(anime.id.toString())}
                                    className={cn(
                                        "group relative flex flex-col gap-1 cursor-pointer transition-all duration-200",
                                        isSelected ? "scale-95" : "hover:scale-[1.02]"
                                    )}
                                >
                                    <div className={cn(
                                        "aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all",
                                        isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent group-hover:border-primary/50"
                                    )}>
                                        <img
                                            src={getImageUrl(anime.image || anime.cover)}
                                            alt={title}
                                            className="w-full h-full object-cover"
                                        />
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                <div className="bg-primary text-white rounded-full p-1 shadow-lg">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold line-clamp-1 transition-colors",
                                        isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}>
                                        {title}
                                    </span>
                                </div>
                            );
                        })}
                        {/* Load more trigger */}
                        <div ref={loadMoreRef} className="col-span-full h-10 flex items-center justify-center">
                            {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="text-[10px] text-muted-foreground flex justify-between items-center border-t pt-2">
                <span>{language === 'ar' ? `تم اختيار ${selectedIds.length}` : `${selectedIds.length} selected`}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => onChange([])}>
                    {language === 'ar' ? "إلغاء الكل" : "Clear all"}
                </Button>
            </div>
        </div>
    );
}
