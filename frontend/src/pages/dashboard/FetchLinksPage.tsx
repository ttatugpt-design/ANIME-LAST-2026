import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, Link as LinkIcon, Search, AlertCircle, CheckCircle2, 
    Copy, ExternalLink, Database, Film, Layers, RefreshCw, Check, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const FetchLinksPage = () => {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const isArabic = i18n.language === 'ar';
    
    // Scraper state
    const [url, setUrl] = useState('');
    const [seriesName, setSeriesName] = useState('');
    const [results, setResults] = useState<{ episode: string; link: string }[]>([]);

    // Selection state
    const [selectedAnimeId, setSelectedAnimeId] = useState<number | "">("");
    const [selectedServerId, setSelectedServerId] = useState<number | "">("");
    const [animeSearch, setAnimeSearch] = useState("");
    const [episodeSearch, setEpisodeSearch] = useState("");
    
    // Link state: episodeId -> scrapedLink
    const [links, setLinks] = useState<Record<number, string>>({});
    const [isEmbeddingAll, setIsEmbeddingAll] = useState(false);
    const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);

    // Fetch animes for selector (show latest by default if no search)
    const { data: animesRes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ["animes-search", animeSearch],
        queryFn: async () => (await api.get(`/animes`, { params: { search: animeSearch, limit: 50, paginate: "true" } })).data,
    });
    const animes = useMemo(() => {
        if (!animesRes) return [];
        return Array.isArray(animesRes) ? animesRes : (animesRes.data || []);
    }, [animesRes]);

    // Fetch selected anime details
    const { data: anime } = useQuery({
        queryKey: ["anime", selectedAnimeId],
        queryFn: async () => (await api.get(`/animes/${selectedAnimeId}`)).data,
        enabled: !!selectedAnimeId,
    });

    // Fetch episodes for selected anime
    const { data: episodesRes } = useQuery({
        queryKey: ["episodes-fetch", selectedAnimeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: selectedAnimeId } })).data,
        enabled: !!selectedAnimeId,
    });
    const episodes: any[] = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.data || []);

    // Fetch system servers
    const { data: serversRes } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => (await api.get(`/servers`)).data,
    });
    const servers: any[] = Array.isArray(serversRes) ? serversRes : (serversRes?.data || []);

    // Scraper mutation
    const fetchMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/test-fetch', { url: targetUrl, series_name: seriesName });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.links && data.links.length > 0) {
                setResults(data.links);
                toast.success(isArabic ? 'تم جلب الروابط بنجاح!' : 'Links fetched successfully!');
                setLinks({});
            }
        },
        onError: (error: any) => {
            console.error(error);
            const data = error.response?.data;
            const msg = data?.error || data?.message || (isArabic ? 'حدث خطأ في الخادم' : 'Server Error');
            const details = data?.details ? `\nDetails: ${data.details.substring(0, 100)}...` : '';
            toast.error(msg + details);
            setResults([]);
        }
    });

    // Single episode retry mutation
    const [retryingIndices, setRetryingIndices] = useState<Set<number>>(new Set());
    const fetchSingleMutation = useMutation({
        mutationFn: async ({ episodeName, index }: { episodeName: string, index: number }) => {
            setRetryingIndices(prev => new Set(prev).add(index));
            const res = await api.post('/scraper/test-fetch', { 
                url: url, 
                series_name: seriesName,
                episode_name: episodeName 
            });
            return { data: res.data, index };
        },
        onSuccess: ({ data, index }) => {
            if (data.links && data.links.length > 0) {
                const newLink = data.links[0].link;
                setResults(prev => {
                    const next = [...prev];
                    next[index] = { ...next[index], link: newLink };
                    return next;
                });
                toast.success(isArabic ? `تم تحديث ${data.links[0].episode}` : `Updated ${data.links[0].episode}`);
            }
        },
        onError: (error: any) => {
            console.error(error);
            const data = error.response?.data;
            const msg = data?.error || data?.message || (isArabic ? 'فشل التحديث' : 'Retry Failed');
            toast.error(msg);
        },
        onSettled: (_, __, { index }) => {
            setRetryingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    });

    // Auto-link: match "Episode 12" or "12" in result.episode with ep.episode_number
    const autoLink = () => {
        const newLinks: Record<number, string> = {};
        let count = 0;
        results.forEach((res) => {
            const match = res.episode.match(/\d+/);
            if (!match) return;
            const num = parseInt(match[0]);
            const ep = episodes.find((e) => e.episode_number === num);
            if (ep) {
                newLinks[ep.id] = res.link;
                count++;
            }
        });
        setLinks(newLinks);
        toast.success(isArabic ? `تم ربط ${count} حلقة تلقاًياً` : `Auto-linked ${count} episodes`);
    };

    // Embed mutation (Include)
    const includeMutation = useMutation({
        mutationFn: async ({ episodeId, embedLink }: { episodeId: number; embedLink: string }) => {
            if (!selectedServerId) throw new Error(isArabic ? "اختر اسم السيرفر أولاً" : "Select a server name first");
            const targetServer = servers.find((s) => s.id === selectedServerId);
            
            const epRes = await api.get(`/episodes/${episodeId}`);
            const ep = epRes.data;
            
            const newServer = {
                episode_id: episodeId,
                language: "ar",
                name: targetServer?.name_en || targetServer?.name || "Embed",
                url: embedLink,
                type: "embed",
            };
            
            await api.put(`/episodes/${episodeId}`, {
                ...ep,
                servers: [...(ep.servers || []), newServer],
                is_published: true,
            });
            return { episodeId };
        },
        onSuccess: ({ episodeId }) => {
            queryClient.invalidateQueries({ queryKey: ["episodes-fetch", selectedAnimeId] });
            // Remove from temporary links after success
            setLinks((prev) => {
                const next = { ...prev };
                delete next[episodeId];
                return next;
            });
        },
    });

    const embedAll = async () => {
        const entries = Object.entries(links);
        if (!entries.length) return;
        if (!selectedServerId) {
            toast.error(isArabic ? 'اختر اسم السيرفر أولاً' : 'Select a server name first');
            return;
        }
        setIsEmbeddingAll(true);
        let success = 0;
        for (const [epIdStr, embedLink] of entries) {
            try {
                await includeMutation.mutateAsync({ episodeId: Number(epIdStr), embedLink });
                success++;
            } catch (err: any) {
                console.error(err);
            }
        }
        setIsEmbeddingAll(false);
        toast.success(isArabic ? `✅ تم تضمين ${success} حلقة بنجاح` : `✅ Embedded ${success} episodes successfully`);
    };

    const handleFetch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) {
            toast.error(isArabic ? 'الرجاء إدخال رابط صالح' : 'Please enter a valid URL');
            return;
        }
        setResults([]);
        fetchMutation.mutate(url);
    };

    const filteredEpisodes = episodes.filter((ep: any) =>
        String(ep.episode_number).includes(episodeSearch) ||
        (ep.title && ep.title.toLowerCase().includes(episodeSearch.toLowerCase()))
    ).sort((a: any, b: any) => a.episode_number - b.episode_number);

    return (
        <div className="flex flex-col h-full gap-0 overflow-hidden">
            {/* Header / Top Controls */}
            <div className="px-6 py-4 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <LinkIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">
                                {isArabic ? 'جلب الروابط المتعدد' : 'Batch Link Fetcher'}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {isArabic ? 'استخراج وربط الروابط بالحلقات مباشرة' : 'Extract and link URLs directly to episodes'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap md:justify-end">
                        {/* Anime Selector */}
                        <div className="relative min-w-[220px]">
                            <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none appearance-none focus:ring-2 focus:ring-primary/20"
                                value={selectedAnimeId}
                                onChange={(e) => {
                                    setSelectedAnimeId(Number(e.target.value));
                                }}
                            >
                                <option value="">{isArabic ? '-- اختر الأنمي --' : '-- Select Anime --'}</option>
                                {anime && !animes.some((a: any) => a.id === anime.id) && (
                                    <option value={anime.id}>{anime.title}</option>
                                )}
                                {animes.map((a: any) => (
                                    <option key={a.id} value={a.id}>{a.title}</option>
                                ))}
                            </select>
                            {/* Simple loader if list is fetching */}
                            <div className="absolute right-8 top-3 pointer-events-none">
                                {isAnimesLoading && <RefreshCw className="h-4 w-4 animate-spin opacity-40 text-primary" />}
                            </div>
                            {/* Simple search overlay for anime */}
                            <div className="absolute right-2 top-2.5 pointer-events-none opacity-40">
                                <Search className="h-4 w-4" />
                            </div>
                        </div>

                        {/* Search input for anime (as a separate trigger if needed, but for now we just allow re-search) */}
                        <Input 
                            className="w-40 h-10 text-xs" 
                            placeholder={isArabic ? 'بحث عن أنمي...' : 'Search anime...'} 
                            value={animeSearch} 
                            onChange={(e) => setAnimeSearch(e.target.value)} 
                        />

                        {/* Server Selector */}
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none min-w-[140px] focus:ring-2 focus:ring-primary/20"
                            value={selectedServerId}
                            onChange={(e) => setSelectedServerId(Number(e.target.value))}
                        >
                            <option value="">{isArabic ? '-- اختر السيرفر --' : '-- Select Server --'}</option>
                            {servers.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name_en || s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <form onSubmit={handleFetch} className="mt-4 flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Input 
                            placeholder="https://zeta.animerco.org/..." 
                            className="w-full bg-background/50 border-primary/10 focus:border-primary/40 font-mono text-sm pl-10"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            dir="ltr"
                        />
                        <ExternalLink className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={fetchMutation.isPending || !url}
                        className="h-10 px-8 font-bold shadow-sm"
                    >
                        {fetchMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />
                                {isArabic ? 'جاري الجلب...' : 'Fetching...'}
                            </>
                        ) : (
                            isArabic ? 'جلب الحلقات' : 'Fetch Batch'
                        )}
                    </Button>
                    {results.length > 0 && (
                        <Button variant="outline" className="h-10 gap-2 border-primary/20 hover:bg-primary/5" onClick={autoLink}>
                            <LinkIcon className="h-4 w-4 text-primary" />
                            {isArabic ? 'ربط تلقائي' : 'Auto Link'}
                        </Button>
                    )}
                </form>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 10rem)' }}>
                
                {/* LEFT: Scraped Results */}
                <div className="flex-1 flex flex-col border-r bg-muted/5">
                    <div className="px-4 py-3 border-b flex items-center justify-between bg-background">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-primary" />
                            <h3 className="text-sm font-bold">{isArabic ? 'النتائج المستخرجة' : 'Extracted Results'}</h3>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{results.length}</Badge>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {results.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground opacity-30">
                                <Search className="h-16 w-16 mb-4" />
                                <p className="text-sm font-medium">{isArabic ? 'لا توجد نتائج حتى الآن' : 'No results yet'}</p>
                            </div>
                        ) : (
                            results.map((res, index) => {
                                // Check if this link is already mapped to an episode
                                const linkedEpId = Object.entries(links).find(([, url]) => url === res.link)?.[0];
                                const linkedEp = linkedEpId ? episodes.find((e: any) => e.id === Number(linkedEpId)) : null;

                                return (
                                    <div 
                                        key={index} 
                                        className={cn(
                                            "p-3 rounded-xl border-2 transition-all group relative",
                                            linkedEp ? "border-primary/40 bg-primary/5" : "border-primary/10 bg-card hover:bg-muted/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                                                        {res.episode}
                                                    </span>
                                                    {linkedEp && (
                                                        <Badge className="text-[8px] h-3.5 px-1 bg-primary text-primary-foreground">
                                                            {isArabic ? `ح ${linkedEp.episode_number}` : `Ep ${linkedEp.episode_number}`}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs font-mono truncate mt-1 text-foreground/60" dir="ltr">
                                                    {res.link}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-1">
                                                {activeEpisodeId && (
                                                    <Button 
                                                        size="icon" 
                                                        variant="default"
                                                        className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white shadow-sm animate-in zoom-in-50"
                                                        onClick={() => {
                                                            setLinks(prev => ({ ...prev, [activeEpisodeId]: res.link }));
                                                            setActiveEpisodeId(null);
                                                            toast.success(isArabic ? 'تم الربط' : 'Linked');
                                                        }}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    disabled={retryingIndices.has(index)}
                                                    onClick={() => fetchSingleMutation.mutate({ episodeName: res.episode, index })}
                                                >
                                                    {retryingIndices.has(index) ? (
                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(res.link);
                                                        toast.success(isArabic ? 'تم نسخ الرابط' : 'Link copied');
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT: Episodes List */}
                <div className="w-80 shrink-0 flex flex-col bg-background">
                    <div className="p-3 border-b space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Film className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{isArabic ? 'حلقات الأنمي' : 'Episodes'}</span>
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{episodes.length}</Badge>
                            </div>

                            <Button 
                                size="sm" 
                                variant={Object.keys(links).length > 0 ? "default" : "outline"}
                                disabled={isEmbeddingAll || !selectedServerId || Object.keys(links).length === 0}
                                onClick={embedAll}
                                className="h-8 px-2 text-[11px] gap-1.5"
                            >
                                {isEmbeddingAll ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Layers className="h-3.5 w-3.5" />
                                )}
                                {isArabic ? 'تضمين الكل' : 'Embed All'}
                                {Object.keys(links).length > 0 && (
                                    <span className="bg-primary-foreground/20 px-1 rounded text-[9px]">
                                        {Object.keys(links).length}
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                className="pl-8 h-8 text-xs bg-muted/40" 
                                placeholder={isArabic ? 'بحث في الحلقات...' : 'Search episodes...'} 
                                value={episodeSearch} 
                                onChange={(e) => setEpisodeSearch(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {!selectedAnimeId ? (
                            <div className="text-center py-20 text-muted-foreground/50 text-xs px-4">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>{isArabic ? 'اختر الأنمي لعرض الحلقات' : 'Select an anime to view episodes'}</p>
                            </div>
                        ) : filteredEpisodes.map((ep: any) => {
                            const linkedEmbed = links[ep.id];
                            const alreadyHasServer = ep.servers?.length > 0;
                            
                            return (
                                <div 
                                    key={ep.id}
                                    onClick={() => setActiveEpisodeId(activeEpisodeId === ep.id ? null : ep.id)}
                                    className={cn(
                                        "rounded-lg border p-2.5 text-xs transition-all cursor-pointer group",
                                        linkedEmbed ? "border-primary/50 bg-primary/5" : "border-border bg-card",
                                        alreadyHasServer && !linkedEmbed ? "border-green-500/30 bg-green-500/5" : "",
                                        activeEpisodeId === ep.id ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm" : "hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-semibold truncate">
                                                    {isArabic ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                </p>
                                                {activeEpisodeId === ep.id && (
                                                    <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </div>
                                            {ep.title && <p className="text-muted-foreground truncate text-[10px] mt-0.5">{ep.title}</p>}
                                        </div>
                                        {alreadyHasServer && !linkedEmbed && (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 opacity-60" />
                                        )}
                                    </div>

                                    {linkedEmbed && (
                                        <div className="mt-2 pt-2 border-t border-primary/20 flex gap-1">
                                            <Button 
                                                size="sm" 
                                                className="h-6 text-[10px] flex-1 gap-1"
                                                disabled={includeMutation.isPending || !selectedServerId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    includeMutation.mutate({ episodeId: ep.id, embedLink: linkedEmbed });
                                                }}
                                            >
                                                <Check className="h-3 w-3" />
                                                {isArabic ? 'تضمين' : 'Include'}
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 text-[10px] px-1 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLinks((prev) => { const n = { ...prev }; delete n[ep.id]; return n; });
                                                }}
                                            >
                                                <XCircle className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {selectedAnimeId && filteredEpisodes.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                                {isArabic ? 'لا توجد حلقات' : 'No episodes'}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FetchLinksPage;
