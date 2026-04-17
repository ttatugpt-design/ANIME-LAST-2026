import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Loader2, Copy, Check, ExternalLink, Globe, Download, 
    Film, Link2, AlertCircle, Sparkles, ChevronRight, RefreshCw, X,
    Layers, List, Database, CheckCircle2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface LinkResult {
    title: string;
    downloadUrl: string;
    embedUrl: string | null;
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
    totalEpisodes: number;
    episodes: EpisodeResult[];
    error?: string;
}

// Custom Colors for RistoAnime Theme (Rose/Crimson Focus)
const HOST_COLORS: Record<string, string> = {
    dood: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    streamruby: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    mixdrop: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    hgcloud: 'bg-green-500/20 text-green-400 border-green-500/30',
    uqload: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    streamtape: 'bg-red-500/20 text-red-400 border-red-500/30',
    filemoon: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    earnvids: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    mp4upload: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    download: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    embed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    turbovidhls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    sendvid: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'mega.nz': 'bg-red-600/20 text-red-500 border-red-600/30',
    vidmoly: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const RistoAnimeScraperPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [url, setUrl] = useState('');
    const [mode, setMode] = useState<'single' | 'batch'>('single');
    const [batchResult, setBatchResult] = useState<BatchScrapeResult | null>(null);
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    
    // Selection state
    const [selectedAnimeId, setSelectedAnimeId] = useState<number | "">("");
    const [selectedServerId, setSelectedServerId] = useState<number | "">("");
    const [animeSearch, setAnimeSearch] = useState("");
    const [isPublishingAll, setIsPublishingAll] = useState(false);
    const [publishedEps, setPublishedEps] = useState<Set<number>>(new Set());

    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch animes for selector
    const { data: animesRes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ["animes-scraper-search-risto", animeSearch],
        queryFn: async () => (await api.get(`/animes`, { params: { search: animeSearch, limit: 20, paginate: "true" } })).data,
    });
    const animes = useMemo(() => {
        if (!animesRes) return [];
        return Array.isArray(animesRes) ? animesRes : (animesRes.data || []);
    }, [animesRes]);

    // Fetch episodes for selected anime
    const { data: episodesRes } = useQuery({
        queryKey: ["episodes-scraper-risto", selectedAnimeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: selectedAnimeId } })).data,
        enabled: !!selectedAnimeId,
    });
    const dbEpisodes: any[] = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.data || []);

    // Fetch servers
    const { data: serversRes } = useQuery({
        queryKey: ["servers-scraper-risto"],
        queryFn: async () => (await api.get(`/servers`)).data,
    });
    const servers: any[] = Array.isArray(serversRes) ? serversRes : (serversRes?.data || []);

    const scrapeMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const endpoint = mode === 'single' ? '/scraper/ristoanime' : '/scraper/ristoanime-batch';
            const res = await api.post(endpoint, { url: targetUrl });
            return res.data;
        },
        onSuccess: (data) => {
            if (mode === 'single') {
                setBatchResult({
                    success: data.success,
                    totalEpisodes: 1,
                    episodes: [{
                        episodeNum: 1,
                        label: 'الحلقة المختارة',
                        url: data.url,
                        title: data.title || 'نتائج الحلقة',
                        links: data.links || []
                    }]
                });
                setExpandedEpisode(1);
            } else {
                setBatchResult(data);
                if (data.episodes?.length > 0) {
                    setExpandedEpisode(data.episodes[0].episodeNum);
                }
            }
            
            if (data.success) {
                toast.success(mode === 'single' ? 'تم جلب الروابط بنجاح!' : `تم جلب ${data.totalEpisodes} حلقة بنجاح!`);
            } else {
                toast.warning('لم يتم العثور على روابط');
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
            toast.error('يرجى إدخال رابط الحلقة أو المسلسل أولاً');
            inputRef.current?.focus();
            return;
        }
        scrapeMutation.mutate(url.trim());
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedUrl(text);
            toast.success('تم نسخ الرابط!');
            setTimeout(() => setCopiedUrl(null), 2000);
        });
    };

    // Publishing Mutation
    const publishMutation = useMutation({
        mutationFn: async ({ dbEpisodeId, embedUrl, serverName }: { dbEpisodeId: number; embedUrl: string; serverName?: string }) => {
            let finalServerName = serverName;
            
            if (!finalServerName) {
                if (!selectedServerId) throw new Error("اختر اسم السيرفر أولاً");
                const targetServer = servers.find((s) => s.id === selectedServerId);
                finalServerName = targetServer?.name_en || targetServer?.name || "RistoAnime";
            }
            
            const epRes = await api.get(`/episodes/${dbEpisodeId}`);
            const ep = epRes.data;
            
            if (ep.servers?.some((s: any) => s.url === embedUrl)) {
                return { dbEpisodeId, skipped: true };
            }

            const newServer = {
                episode_id: dbEpisodeId,
                language: "ar",
                name: finalServerName,
                url: embedUrl,
                type: "embed",
            };
            
            await api.put(`/episodes/${dbEpisodeId}`, {
                ...ep,
                servers: [...(ep.servers || []), newServer],
                is_published: true,
            });
            return { dbEpisodeId, skipped: false };
        },
        onSuccess: ({ dbEpisodeId }) => {
            setPublishedEps(prev => new Set(prev).add(dbEpisodeId));
            queryClient.invalidateQueries({ queryKey: ["episodes-scraper-risto", selectedAnimeId] });
        }
    });

    const handlePublishAll = async () => {
        if (!batchResult || !selectedAnimeId) {
            toast.error("تأكد من اختيار الأنمي أولاً");
            return;
        }

        setIsPublishingAll(true);
        let successCount = 0;
        let totalAttempted = 0;

        for (const ep of batchResult.episodes) {
            const match = dbEpisodes.find(de => de.episode_number === ep.episodeNum);
            if (!match) continue;

            const targets = [
                { host: 'hgcloud', name: 'HGCloud' },
                { host: 'dood', name: 'DoodStream' },
                { host: 'mp4upload', name: 'Mp4Upload' },
                { host: 'filemoon', name: 'Filemoon' },
                { host: 'uqload', name: 'Uqload' },
                { host: 'vidbom', name: 'Vidbom' },
                { host: 'streamruby', name: 'StreamRuby' },
                { host: 'mixdrop', name: 'Mixdrop' },
                { host: 'earnvids', name: 'EarnVids' },
                { host: 'streamtape', name: 'Streamtape' },
                { host: 'vidmoly', name: 'Vidmoly' },
                { host: 'mega.nz', name: 'Mega' },
                { host: 'turbovidhls', name: 'TurboVid' },
                { host: 'sendvid', name: 'SendVid' },
            ];

            let publishedForEpisode = 0;

            for (const target of targets) {
                if (publishedForEpisode >= 4) break;

                const link = ep.links.find(l => {
                    const h = l.host.toLowerCase();
                    const isTarget = (target.host === 'dood' && (h === 'dood' || h === 'dsvplay' || h === 'dooood')) ||
                                    h.includes(target.host.replace('.nz', ''));
                    return isTarget && !!l.embedUrl;
                });

                if (link?.embedUrl) {
                    totalAttempted++;
                    try {
                        const result = await publishMutation.mutateAsync({ 
                            dbEpisodeId: match.id, 
                            embedUrl: link.embedUrl,
                            serverName: target.name 
                        });
                        if (result && !result.skipped) {
                            successCount++;
                            publishedForEpisode++;
                        } else if (result && result.skipped) {
                             publishedForEpisode++;
                        }
                    } catch (e) { 
                        console.error(`Failed to publish ${target.name} for Ep ${ep.episodeNum}`, e); 
                    }
                }
            }
        }

        setIsPublishingAll(false);
        if (totalAttempted === 0) {
            toast.warning("\u0644\u0645 \u064a\u062a\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u062d\u0644\u0642\u0627\u062a \u0628\u0639\u062f. \u0644\u0627 \u062a\u0648\u062c\u062f \u0631\u0648\u0627\u0628\u0637 \u0644\u0644\u0646\u0634\u0631");
            return;
        }
        toast.success(`\u062a\u0645 \u0646\u0634\u0631 ${successCount} \u0633\u064a\u0631\u0641\u0631 \u0628\u0646\u062c\u0627\u062d!`);
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white p-4 md:p-8 transition-colors duration-300" dir="rtl">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-10 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-rose-600 via-pink-500 to-orange-500 rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-rose-500/20 border border-white/10">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black bg-gradient-to-r from-rose-600 via-pink-600 to-orange-600 bg-clip-text text-transparent tracking-tight">
                                ساحب RistoAnime الخارق
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">نظام الأتمتة الذكي لربط الحلقات بقاعدة البيانات</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500 group-focus-within:text-rose-500 transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input 
                                type="text"
                                placeholder="ابحث في الأنميات..."
                                value={animeSearch}
                                onChange={(e) => setAnimeSearch(e.target.value)}
                                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl py-2.5 pr-10 pl-4 text-sm w-64 outline-none focus:border-rose-500/50 transition-all text-gray-700 dark:text-gray-300 shadow-sm"
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={selectedServerId}
                                onChange={(e) => setSelectedServerId(Number(e.target.value))}
                                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-rose-500/50 transition-all text-gray-700 dark:text-gray-300 min-w-[140px] appearance-none shadow-sm"
                            >
                                <option value="">-- اسم السيرفر --</option>
                                {servers.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name_en || s.name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-500">
                                <ChevronRight className="w-4 h-4 rotate-90" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Anime Ribbon */}
                <div className="relative">
                    <div className="absolute -left-1 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-black to-transparent z-10 pointer-events-none" />
                    <div className="absolute -right-1 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-black to-transparent z-10 pointer-events-none" />
                    
                    <div className="flex items-center gap-4 overflow-x-auto pb-4 px-2 scrollbar-hide snap-x scroll-smooth no-scrollbar">
                        {isAnimesLoading ? (
                            <div className="flex gap-4">
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="w-36 h-48 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse shrink-0" />
                                ))}
                            </div>
                        ) : (
                            animes.map((a: any) => (
                                <button
                                    key={a.id}
                                    onClick={() => setSelectedAnimeId(a.id)}
                                    className={cn(
                                        "group flex-shrink-0 w-36 h-52 rounded-2xl border transition-all duration-300 snap-start overflow-hidden relative",
                                        selectedAnimeId === a.id 
                                            ? "border-rose-500 bg-rose-500/10 shadow-lg scale-105 z-20" 
                                            : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1a1a1a] hover:border-rose-200 dark:hover:border-white/20 hover:scale-[1.02] shadow-sm"
                                    )}
                                >
                                    <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
                                        {a.image ? (
                                            <img src={a.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                                <Database className="w-8 h-8 text-black/10 dark:text-white/10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                    
                                    <div className="absolute bottom-3 left-3 right-3 text-center">
                                        <p className={cn(
                                            "text-[11px] font-bold leading-tight line-clamp-2 transition-colors",
                                            selectedAnimeId === a.id ? "text-white" : "text-gray-300 group-hover:text-gray-100"
                                        )}>
                                            {a.title}
                                        </p>
                                    </div>

                                    {selectedAnimeId === a.id && (
                                        <div className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg shadow-black/50">
                                            <CheckCircle2 className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                        {!isAnimesLoading && animes.length === 0 && (
                            <div className="w-full text-center py-8 text-gray-500 bg-gray-50 dark:bg-white/3 rounded-3xl border border-dashed border-gray-200 dark:border-white/5">
                                لا توجد أنميات تطابق بحثك
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Input Section */}
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-8 shadow-sm relative overflow-hidden">
                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-[#0f0f0f] p-1 rounded-xl w-fit mb-6 border border-gray-100 dark:border-white/5 shadow-inner">
                        <button
                            onClick={() => setMode('single')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                mode === 'single' ? "bg-rose-600 text-white shadow-md shadow-rose-500/20" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <Film className="w-4 h-4" /> حلقة واحدة
                        </button>
                        <button
                            onClick={() => setMode('batch')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                                mode === 'batch' ? "bg-pink-600 text-white shadow-md shadow-pink-500/20" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            )}
                        >
                            <Layers className="w-4 h-4" /> مسلسل كامل (Batch)
                        </button>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-400 px-1">
                            ضع رابط RistoAnime هنا (رابط حلقة أو مسار الأنمي)
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Globe className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    ref={inputRef}
                                    type="url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                                    placeholder="https://ristoanime.co/episode/..."
                                    className="w-full bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 text-base py-4 pr-12 pl-6 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all shadow-inner"
                                    dir="ltr"
                                />
                            </div>
                            <button
                                onClick={handleScrape}
                                disabled={scrapeMutation.isPending}
                                className={cn(
                                    "flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95",
                                    "bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 bg-[length:200%_auto] hover:bg-right",
                                    "text-white shadow-xl shadow-rose-500/30",
                                    "disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                )}
                            >
                                {scrapeMutation.isPending ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> جاري الجلب...</>
                                ) : (
                                    <><Search className="w-6 h-6" /> ابدأ السحر الآن</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading / Progress */}
                {scrapeMutation.isPending && (
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-gray-100 dark:border-white/5 p-12 text-center shadow-sm">
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="relative w-24 h-24 mx-auto">
                                <div className="absolute inset-0 rounded-full border-4 border-rose-500/10 animate-ping" />
                                <div className="absolute inset-2 rounded-full border-4 border-pink-500/20 animate-pulse" />
                                <div className="relative w-24 h-24 bg-gradient-to-br from-rose-600/20 to-pink-500/20 rounded-full flex items-center justify-center border border-gray-100 dark:border-white/10">
                                    <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {mode === 'batch' ? 'جاري اكتشاف وجلب الحلقات من RistoAnime...' : 'جاري تحليل الحلقة واستخراج الروابط...'}
                                </h3>
                                <p className="text-gray-500 text-sm">
                                    {mode === 'batch' 
                                        ? 'سيقوم النظام بفتح كل حلقة على حدة واستخراج السيرفرات. الرجاء الانتظار...'
                                        : 'يتم الآن استخراج السيرفرات المختبئة والخاصة...'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Batch Results */}
                {batchResult && !scrapeMutation.isPending && (
                    <div className="space-y-6">
                        {/* Summary Header */}
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/5 p-4 px-6 shadow-sm">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-500/20 rounded-lg">
                                        <List className="w-5 h-5 text-green-500" />
                                    </div>
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">
                                        تم استخراج {batchResult.totalEpisodes} حلقة
                                    </span>
                                </div>
                                <div className="h-6 w-px bg-gray-200 dark:bg-white/10 hidden md:block" />
                                <div className="text-sm text-gray-500">
                                    المصدر: <span className="font-mono text-[10px] opacity-60" dir="ltr">{url}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {selectedAnimeId && selectedServerId && (
                                    <button
                                        onClick={handlePublishAll}
                                        disabled={isPublishingAll}
                                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                                    >
                                        {isPublishingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        نشر الكل للحلقات
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Episodes List */}
                        <div className="grid gap-4">
                            {batchResult.episodes.map((ep) => (
                                <div 
                                    key={ep.episodeNum}
                                    className={cn(
                                        "bg-white dark:bg-[#1a1a1a] rounded-2xl border transition-all duration-300 overflow-hidden",
                                        expandedEpisode === ep.episodeNum 
                                            ? "border-rose-500/40 shadow-md" 
                                            : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 shadow-sm"
                                    )}
                                >
                                    {/* Episode Header */}
                                    <div className="flex items-center justify-between p-5 px-6 text-right w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-white/3" onClick={() => setExpandedEpisode(expandedEpisode === ep.episodeNum ? null : ep.episodeNum)}>
                                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                                            <div className={cn(
                                                "w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg",
                                                expandedEpisode === ep.episodeNum ? "bg-rose-600 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                                            )}>
                                                {ep.episodeNum}
                                            </div>
                                            <div className="text-right overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <h4 className={cn(
                                                        "font-bold truncate transition-colors",
                                                        expandedEpisode === ep.episodeNum ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                                                    )}>
                                                        {ep.title || ep.label}
                                                    </h4>
                                                    {dbEpisodes.find(de => de.episode_number === ep.episodeNum) && (
                                                        <div className="flex items-center gap-1 bg-green-500/10 text-green-500 text-[10px] px-2 py-0.5 rounded-full border border-green-500/20">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            تم الربط
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5 truncate">{ep.url}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 shrink-0 mr-4">
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const dbEp = dbEpisodes.find(de => de.episode_number === ep.episodeNum);
                                                    const bestLink = ep.links.find(l => l.host === 'hgcloud' && l.embedUrl) || ep.links.find(l => l.embedUrl);
                                                    
                                                    if (dbEp && bestLink?.embedUrl) {
                                                        const isPub = publishedEps.has(dbEp.id) || (dbEp.servers?.some((s: any) => s.url === bestLink.embedUrl));
                                                        return (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    publishMutation.mutate({ dbEpisodeId: dbEp.id, embedUrl: bestLink.embedUrl! });
                                                                }}
                                                                disabled={publishMutation.isPending || isPub || !selectedServerId}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-all",
                                                                    isPub 
                                                                        ? "bg-green-500/20 text-green-500" 
                                                                        : "bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white"
                                                                )}
                                                            >
                                                                {isPub ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md text-gray-500 font-mono">
                                                    {ep.links.length} روابط
                                                </span>
                                                <ChevronRight className={cn(
                                                    "w-5 h-5 text-gray-400 transition-transform duration-300",
                                                    expandedEpisode === ep.episodeNum ? "rotate-90 text-rose-500" : ""
                                                )} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Episode Links Content */}
                                    {expandedEpisode === ep.episodeNum && (
                                        <div className="p-6 pt-0 border-t border-gray-100 dark:border-white/5 animate-in slide-in-from-top-4 duration-300">
                                            {ep.links.length > 0 ? (
                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
                                                    {ep.links.map((link, lidx) => (
                                                        <div key={lidx} className="bg-gray-50 dark:bg-[#0f0f0f] rounded-xl border border-gray-100 dark:border-white/5 p-4 space-y-3 shadow-sm hover:shadow-md transition-all">
                                                            <div className="flex items-center justify-between">
                                                                <span className={cn(
                                                                    "text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                                                    HOST_COLORS[link.host] || HOST_COLORS.unknown
                                                                )}>
                                                                    {link.title || link.host}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-mono">#{lidx + 1}</span>
                                                            </div>
                                                            
                                                            <div className="space-y-2">
                                                                {link.embedUrl && (
                                                                    <div className="group relative">
                                                                        <div className="flex items-center gap-2 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5">
                                                                            <Film className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                                            <span className="text-xs text-rose-500/80 font-bold shrink-0">Embed:</span>
                                                                            <span className="text-[11px] text-gray-500 truncate font-mono flex-1 mr-1" dir="ltr">
                                                                                {link.embedUrl}
                                                                            </span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button 
                                                                                    onClick={() => handleCopy(link.embedUrl!)}
                                                                                    className="p-1.5 rounded-md bg-white/50 dark:bg-white/5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 transition-all border border-gray-100 dark:border-transparent"
                                                                                >
                                                                                    {copiedUrl === link.embedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                                </button>
                                                                                <a href={link.embedUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-md bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all border border-gray-100 dark:border-transparent">
                                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                
                                                                {link.downloadUrl && !link.embedUrl && (
                                                                    <div className="flex items-center gap-2 bg-white/50 dark:bg-white/3 rounded-lg p-2.5 border border-gray-100 dark:border-transparent">
                                                                        <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                                        <span className="text-xs text-gray-500 font-bold shrink-0">رابط:</span>
                                                                        <span className="text-[11px] text-gray-500 truncate font-mono flex-1 mr-1" dir="ltr">
                                                                            {link.downloadUrl}
                                                                        </span>
                                                                        <button 
                                                                            onClick={() => handleCopy(link.downloadUrl)}
                                                                            className="p-1.5 rounded-md hover:bg-white text-gray-500 hover:text-gray-900 transition-all shadow-sm border border-transparent hover:border-gray-100"
                                                                        >
                                                                            {copiedUrl === link.downloadUrl ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-gray-400">
                                                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                                    <p>لم يتم العثور على روابط لهذه الحلقة</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!batchResult && !scrapeMutation.isPending && (
                    <div className="bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] border border-gray-100 dark:border-white/5 p-16 text-center shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 via-pink-500 to-orange-600" />
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-gray-100 dark:border-white/5 relative shadow-inner">
                                <Search className="w-10 h-10 text-gray-400" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 rounded-full animate-ping" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">بانتظار الرابط الخاص بك</h3>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                    أدخل رابط أنمي من RistoAnime، وسيقوم النظام باكتشاف بقية الحلقات وسحب روابط السيرفرات دفعة واحدة.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 pt-4">
                                {['سيرفرات المشاهدة', 'سحب ذكي', 'نشر مباشر'].map((tag, i) => (
                                    <span key={i} className="px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-xl text-xs font-bold text-gray-500 border border-gray-100 dark:border-white/5 shadow-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RistoAnimeScraperPage;
