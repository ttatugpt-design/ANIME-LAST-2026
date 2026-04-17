import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Loader2, Copy, Check, ExternalLink, Globe, Download, 
    Film, Link2, AlertCircle, Sparkles, ChevronRight, RefreshCw, X,
    Layers, List, Database, CheckCircle2, Send, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface LinkResult {
    title: string;
    downloadUrl?: string;
    embedUrl?: string | null;
    host: string;
}

interface EpisodeResult {
    episodeNum: number;
    label: string;
    url: string;
    title: string;
    links: LinkResult[];
    error?: string;
}

interface BatchScrapeResult {
    success: boolean;
    title: string;
    poster?: string;
    totalEpisodes: number;
    episodes: EpisodeResult[];
    error?: string;
}

// Custom Colors for Animerco Theme (Cyan/Blue Focus)
const HOST_COLORS: Record<string, string> = {
    videa: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    megamax: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    vk: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    yourupload: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    michidraw: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    mega: 'bg-red-500/20 text-red-400 border-red-500/30',
    download: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    embed: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

interface AnimeItem {
    id: number;
    title: string;
    image?: string;
}

const AnimercoScraperPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [url, setUrl] = useState('');
    const [batchResult, setBatchResult] = useState<BatchScrapeResult | null>(null);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    
    // Selection state
    const [selectedAnimeId, setSelectedAnimeId] = useState<number | "">("");
    const [animeSearch, setAnimeSearch] = useState("");
    const [isPublishingAll, setIsPublishingAll] = useState(false);
    const [publishedEps, setPublishedEps] = useState<Set<number>>(new Set());

    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch animes for selector
    const { data: animesRes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ["animes-scraper-search-animerco", animeSearch],
        queryFn: async () => (await api.get(`/animes`, { params: { search: animeSearch, limit: 20, paginate: "true" } })).data,
    });
    const animes = useMemo(() => {
        if (!animesRes) return [];
        return Array.isArray(animesRes) ? animesRes : (animesRes.data || []);
    }, [animesRes]);

    // Fetch episodes for selected anime
    const { data: episodesRes } = useQuery({
        queryKey: ["episodes-scraper-animerco", selectedAnimeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: selectedAnimeId } })).data,
        enabled: !!selectedAnimeId,
    });
    const dbEpisodes: any[] = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.data || []);

    const scrapeMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/animerco-batch', { url: targetUrl });
            return res.data;
        },
        onSuccess: (data) => {
            setBatchResult(data);
            if (data.episodes?.length > 0) {
                setExpandedEpisode(data.episodes[0].episodeNum);
            }
            
            if (data.success) {
                toast.success(`تم جلب ${data.totalEpisodes} حلقة من Animerco بنجاح!`);
            } else {
                toast.error('حدث خطأ أثناء الجلب أو لم يتم العثور على روابط');
            }
        },
        onError: (error: any) => {
            const msg = error?.response?.data?.error || 'حدث خطأ أثناء الجلب';
            toast.error(msg);
            setBatchResult(null);
        }
    });

    const handleScrape = () => {
        if (!url.trim()) {
            toast.error('يرجى إدخال رابط الأنمي من Animerco أولاً');
            inputRef.current?.focus();
            return;
        }
        scrapeMutation.mutate(url.trim());
    };

    const handlePublishAll = async () => {
        if (!batchResult || !selectedAnimeId) {
            toast.error("تأكد من اختيار الأنمي أولاً");
            return;
        }

        setIsPublishingAll(true);
        let successCount = 0;

        for (const ep of batchResult.episodes) {
            const match = dbEpisodes.find(de => de.episode_number === ep.episodeNum);
            if (!match) continue;

            const bestLink = ep.links.find(l => !!l.embedUrl);
            if (bestLink?.embedUrl) {
                try {
                    await api.put(`/episodes/${match.id}`, {
                        ...match,
                        servers: [...(match.servers || []), {
                            episode_id: match.id,
                            language: "ar",
                            name: bestLink.title || "Animerco",
                            url: bestLink.embedUrl,
                            type: "embed"
                        }],
                        is_published: true
                    });
                    successCount++;
                    setPublishedEps(prev => new Set(prev).add(match.id));
                } catch (e) { console.error(e); }
            }
        }

        setIsPublishingAll(false);
        
        // Also update anime poster if we have a better one and it's missing or requested
        if (batchResult.poster && selectedAnimeId) {
            const anime = animes.find(a => a.id === selectedAnimeId);
            if (anime && (!anime.image || anime.image.includes('placeholder'))) {
                 try {
                     await api.put(`/animes/${anime.id}`, { ...anime, image: batchResult.poster, cover: batchResult.poster });
                     toast.success("تم تحديث صورة الغلاف للأنمي");
                 } catch (e) {
                     console.error("Failed to update anime poster:", e);
                 }
            }
        }

        toast.success(`تم نشر جيع الحلقات بنجاح! (تم معالجة ${successCount} حلقة)`);
        queryClient.invalidateQueries({ queryKey: ["episodes-scraper-animerco", selectedAnimeId] });
        queryClient.invalidateQueries({ queryKey: ["animes-scraper-search-animerco"] });
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8" dir="rtl">
            <div className="max-w-5xl mx-auto mb-10 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 via-cyan-500 to-blue-600 rounded-[1.2rem] flex items-center justify-center shadow-2xl shadow-cyan-900/40 border border-white/10">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                                ساحب Animerco الخارق
                            </h1>
                            <p className="text-xs text-gray-400 font-medium mt-1">نظام استخراج السيرفرات المتطور لموقع Animerco</p>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-cyan-500 transition-colors">
                            <Search className="w-4 h-4" />
                        </div>
                        <input 
                            type="text"
                            placeholder="اربط النتائج بالأنمي..."
                            value={animeSearch}
                            onChange={(e) => setAnimeSearch(e.target.value)}
                            className="bg-[#1a1a1a] border border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm w-64 outline-none focus:border-cyan-500/50 transition-all text-gray-300 shadow-lg"
                        />
                    </div>
                </div>

                <div className="relative">
                    <div className="flex items-center gap-4 overflow-x-auto pb-4 px-2 no-scrollbar scroll-smooth">
                        {isAnimesLoading ? (
                            <div className="flex gap-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="w-36 h-52 bg-white/5 rounded-2xl animate-pulse shrink-0" />
                                ))}
                            </div>
                        ) : (
                            animes.map((a: AnimeItem) => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAnimeId(a.id)}
                                    className={cn(
                                        "group flex-shrink-0 w-36 h-52 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                                        selectedAnimeId === a.id 
                                            ? "border-cyan-500 bg-cyan-500/10 shadow-2xl scale-105" 
                                            : "border-white/5 bg-[#1a1a1a] hover:border-white/20"
                                    )}
                                >
                                    <img src={a.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3 text-center">
                                        <p className="text-[11px] font-bold line-clamp-2">{a.title}</p>
                                    </div>
                                    {selectedAnimeId === a.id && (
                                        <div className="absolute top-2 right-2 bg-cyan-500 text-white rounded-full p-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400 px-1">
                            رابط الأنمي أو الحلقة من موقع zeta.animerco.org
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                                <input
                                    ref={inputRef}
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://zeta.animerco.org/animes/..."
                                    className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 pr-12 pl-6 outline-none focus:border-cyan-500 transition-all shadow-inner"
                                    dir="ltr"
                                />
                            </div>
                            <button
                                onClick={handleScrape}
                                disabled={scrapeMutation.isPending}
                                className="flex items-center justify-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-xl shadow-cyan-900/30 transition-all disabled:opacity-50"
                            >
                                {scrapeMutation.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <Search className="w-6 h-6" />}
                                ابدأ السحب الآن
                            </button>
                        </div>
                    </div>
                </div>

                {scrapeMutation.isPending && (
                    <div className="bg-[#1a1a1a] rounded-3xl p-20 text-center border border-white/5 shadow-2xl">
                        <div className="relative w-24 h-24 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 animate-ping" />
                            <Loader2 className="w-24 h-24 text-cyan-500 animate-spin" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">جاري فحص الحلقات...</h3>
                        <p className="text-gray-500">يقوم النظام الآن بفك تشفير مشغل Animerco وجلب روابط السيرفرات</p>
                    </div>
                )}

                {batchResult && !scrapeMutation.isPending && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 shadow-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-600/20 rounded-xl">
                                    <List className="w-6 h-6 text-cyan-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">وجدنا {batchResult.totalEpisodes} حلقة</h2>
                                    <p className="text-xs text-gray-500" dir="ltr">{batchResult.title}</p>
                                </div>
                            </div>
                            {selectedAnimeId && (
                                <button
                                    onClick={handlePublishAll}
                                    disabled={isPublishingAll}
                                    className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/40 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {isPublishingAll ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                                    نشر السيرفرات لجميع الحلقات
                                </button>
                            )}
                        </div>

                        <div className="grid gap-4">
                            {batchResult.episodes.map((ep) => (
                                <div 
                                    key={ep.episodeNum}
                                    className={cn(
                                        "bg-[#1a1a1a] rounded-2xl border transition-all overflow-hidden",
                                        expandedEpisode === ep.episodeNum ? "border-cyan-500/50 shadow-2xl" : "border-white/5"
                                    )}
                                >
                                    <div 
                                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/3 transition-colors"
                                        onClick={() => setExpandedEpisode(expandedEpisode === ep.episodeNum ? null : ep.episodeNum)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center font-bold">
                                                {ep.episodeNum}
                                            </div>
                                            <h4 className="font-bold">{ep.label}</h4>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 font-mono">{ep.links.length} سيرفرات</span>
                                            <ChevronRight className={cn("w-5 h-5 transition-transform", expandedEpisode === ep.episodeNum && "rotate-90")} />
                                        </div>
                                    </div>

                                    {expandedEpisode === ep.episodeNum && (
                                        <div className="p-6 pt-0 border-t border-white/5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                                {ep.links.map((link, idx) => (
                                                    <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md border uppercase", HOST_COLORS[link.host] || HOST_COLORS.unknown)}>
                                                                {link.title}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/10 p-2 rounded-lg">
                                                            <Link2 className="w-3 h-3 text-cyan-500 shrink-0" />
                                                            <span className="text-[10px] text-gray-500 truncate flex-1" dir="ltr">{link.embedUrl}</span>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(link.embedUrl!);
                                                                    toast.success('تم نسخ الرابط');
                                                                }}
                                                                className="hover:text-cyan-500"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnimercoScraperPage;
