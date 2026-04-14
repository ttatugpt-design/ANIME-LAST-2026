import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Loader2, Download, Globe, ImageIcon, 
    Type, Hash, Trash2, CheckCircle2, AlertCircle, Sparkles, X,
    FileDown, ExternalLink, Image as ImageIconLucide, Database, List,
    ChevronRight, Send, Zap, RefreshCw, Key, Layers, Link as LinkIcon, Copy, Globe2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AnimeData {
    url: string;
    title: string;
    story: string;
    poster: string;
    genres: string[];
    episodes: string;
    status: string;
    season: string;
    type: string;
    malUrl: string;
    detailUrl: string;
}

interface ScrapeResult {
    success: boolean;
    title: string;
    count: number;
    images: string[];
    data: AnimeData[];
}

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
    totalEpisodes: number;
    episodes: EpisodeResult[];
    data?: AnimeData[];
    error?: string;
}

const Anime3rbScraperPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'discovery' | 'linker'>('discovery');
    const [url, setUrl] = useState('https://anime3rb.com/');
    const [maxImages, setMaxImages] = useState(50);
    const [animeName, setAnimeName] = useState('');
    const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeAnime, setActiveAnime] = useState<AnimeData | null>(null);
    const [autoScrapeServers, setAutoScrapeServers] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
    const [localDetailUrl, setLocalDetailUrl] = useState('');
    const [isDeepImporting, setIsDeepImporting] = useState(false);

    // Linker State
    const [selectedAnimeId, setSelectedAnimeId] = useState<number | "">("");
    const [selectedServerId, setSelectedServerId] = useState<number | "">("");
    const [animeSearch, setAnimeSearch] = useState("");
    const [batchResult, setBatchResult] = useState<BatchScrapeResult | null>(null);
    const [isPublishingAll, setIsPublishingAll] = useState(false);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);
    const [publishedEps, setPublishedEps] = useState<Set<number>>(new Set());

    const inputRef = useRef<HTMLInputElement>(null);

    // Filter animes for selector
    const { data: animesRes, isLoading: isAnimesLoading } = useQuery({
        queryKey: ["animes-search-anime3rb", animeSearch],
        queryFn: async () => (await api.get(`/animes`, { params: { search: animeSearch, limit: 20, paginate: "true" } })).data,
    });
    const animes = useMemo(() => {
        if (!animesRes) return [];
        return Array.isArray(animesRes) ? animesRes : (animesRes.data || []);
    }, [animesRes]);

    // Fetch episodes for selected anime
    const { data: episodesRes } = useQuery({
        queryKey: ["episodes-anime3rb-linker", selectedAnimeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: selectedAnimeId } })).data,
        enabled: !!selectedAnimeId,
    });
    const dbEpisodes: any[] = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.data || []);

    // Fetch servers
    const { data: serversRes } = useQuery({
        queryKey: ["servers-anime3rb-linker"],
        queryFn: async () => (await api.get(`/servers`)).data,
    });
    const servers: any[] = Array.isArray(serversRes) ? serversRes : (serversRes?.data || []);

    const scrapeMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/scraper/images', { url, max_images: maxImages });
            return res.data;
        },
        onSuccess: (data: ScrapeResult) => {
            if (data.success) {
                setScrapeResult(data);
                setSelectedImages(new Set(data.images));
                toast.success(`تم جلب ${data.count} عنصر من انمي العرب بنجاح!`);
                if (!animeName && data.title) {
                    setAnimeName(data.title.split(':')[0].trim());
                }
            } else {
                toast.error('فشل جلب البيانات من انمي العرب');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء الجلب');
        }
    });

    const importToDBMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await api.post('/scraper/import', data);
            return res.data;
        },
        onSuccess: (data, variables) => {
            toast.success(`تمت إضافة "${variables.title}" إلى قاعدة البيانات بنجاح!`);
            if (variables.auto_scrape) {
                setImportingIds(prev => new Set(prev).add(variables.detailUrl));
                toast.info(`بدأ سحب الحلقات والسيرفرات في الخلفية لـ "${variables.title}"`);
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء الإضافة');
        }
    });

    const deepImportMutation = useMutation({
        mutationFn: async (data: any) => {
            setIsDeepImporting(true);
            const res = await api.post('/scraper/deep-import', data);
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(data.message || 'تم السحب العميق من انمي العرب بنجاح!');
            setIsDeepImporting(false);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء السحب العميق');
            setIsDeepImporting(false);
        }
    });

    const batchScrapeMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/anime3rb-batch', { url: targetUrl });
            return res.data;
        },
        onSuccess: (data) => {
            setBatchResult(data);
            if (data.success) {
                toast.success(`تم جلب ${data.totalEpisodes} حلقة وسيرفراتها من انمي العرب بنجاح!`);
                if (data.episodes?.length > 0) {
                    setExpandedEpisode(data.episodes[0].episodeNum);
                }
            } else {
                toast.error('فشل الجلب المتوازي من انمي العرب');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء جلب الحلقات');
        }
    });

    const publishAllMutation = useMutation({
        mutationFn: async () => {
            if (!batchResult || !selectedAnimeId || !selectedServerId) {
                throw new Error("تأكد من اختيار الأنمي والسيرفر");
            }

            setIsPublishingAll(true);
            const targetServer = servers.find(s => s.id === selectedServerId);
            let successCount = 0;

            for (const ep of batchResult.episodes) {
                const dbEp = dbEpisodes.find(de => de.episode_number === ep.episodeNum);
                if (dbEp) {
                    const bestLink = ep.links.find(l => l.embedUrl) || ep.links[0];
                    if (bestLink?.embedUrl) {
                        try {
                            await api.put(`/episodes/${dbEp.id}`, {
                                ...dbEp,
                                source_url: ep.url || dbEp.source_url,
                                servers: [...(dbEp.servers || []), {
                                    episode_id: dbEp.id,
                                    language: "ar",
                                    name: targetServer?.name_en || targetServer?.name || "Anime3rb",
                                    url: bestLink.embedUrl,
                                    type: "embed"
                                }],
                                is_published: true
                            });
                            successCount++;
                            setPublishedEps(prev => new Set(prev).add(dbEp.id));
                        } catch (e) {
                            console.error(`Failed to publish episode ${ep.episodeNum}`, e);
                        }
                    }
                }
            }
            return successCount;
        },
        onSuccess: (count) => {
            toast.success(`تم نشر ${count} حلقة بنجاح!`);
            setIsPublishingAll(false);
            queryClient.invalidateQueries({ queryKey: ["episodes-anime3rb-linker", selectedAnimeId] });
        },
        onError: (error: any) => {
            toast.error(error?.message || 'فشل النشر الجماعي');
            setIsPublishingAll(false);
        }
    });

    const handleScrape = () => {
        if (!url.trim()) {
            toast.error('يرجى إدخال الرابط أولاً');
            inputRef.current?.focus();
            return;
        }
        scrapeMutation.mutate();
    };

    const handleImportToDB = () => {
        if (activeAnime) {
            importToDBMutation.mutate({
                ...activeAnime,
                detailUrl: localDetailUrl || activeAnime.detailUrl,
                auto_scrape: autoScrapeServers
            });
        }
    };

    const handleDeepImport = () => {
        if (activeAnime) {
            deepImportMutation.mutate({
                ...activeAnime,
                detailUrl: localDetailUrl || activeAnime.detailUrl,
                auto_scrape: false
            });
        }
    };

    const toggleImageSelection = (imgUrl: string) => {
        const newSelection = new Set(selectedImages);
        if (newSelection.has(imgUrl)) {
            newSelection.delete(imgUrl);
        } else {
            newSelection.add(imgUrl);
        }
        setSelectedImages(newSelection);
    };

    const handleDownloadAll = async () => {
        if (selectedImages.size === 0) {
            toast.error('اختر صوراً للتحميل أولاً');
            return;
        }

        setIsDownloading(true);
        const namePrefix = animeName || 'anime3rb-images';
        const urls = Array.from(selectedImages);

        try {
            const response = await api.post('/scraper/images-download', { urls, prefix: namePrefix }, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/zip' });
            const objUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objUrl;
            link.setAttribute('download', `${namePrefix}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objUrl);
            toast.success(`تم إعداد ملف الضغط وتحميل ${urls.length} صورة!`);
        } catch (err: any) {
            toast.error('فشل تحميل الصور كملف مضغوط');
        } finally {
            setIsDownloading(false);
        }
    };

    // Accent colors for Anime3rb (green/teal theme)
    const accent = "from-emerald-500 via-teal-500 to-cyan-500";
    const accentSolid = "bg-emerald-600";
    const accentHover = "hover:bg-emerald-700";
    const accentBorder = "border-emerald-500";
    const accentText = "text-emerald-400";
    const accentShadow = "shadow-emerald-900/30";
    const accentRing = "ring-emerald-500/30";
    const accentBg = "bg-emerald-600/20";

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8" dir="rtl">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className={`w-14 h-14 bg-gradient-to-br ${accent} rounded-2xl flex items-center justify-center shadow-2xl ${accentShadow} border border-white/10`}>
                        <Globe2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className={`text-4xl font-black bg-gradient-to-r ${accent} bg-clip-text text-transparent tracking-tight`}>
                            ساحب انمي العرب الذكي
                        </h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">نظام الربط المتوازي واستخراج المحتوى من anime3rb.com</p>
                    </div>
                    <a href="https://anime3rb.com" target="_blank" rel="noreferrer"
                        className="mr-auto flex items-center gap-2 text-xs text-gray-500 hover:text-emerald-400 transition-colors bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                        <ExternalLink className="w-3 h-3" /> anime3rb.com
                    </a>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-[#1a1a1a] border border-white/5 rounded-2xl w-fit mb-8">
                    <button
                        onClick={() => setActiveTab('discovery')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            activeTab === 'discovery' ? `${accentSolid} text-white shadow-lg` : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <ImageIconLucide className="w-4 h-4" />
                        الاكتشاف الذكي
                    </button>
                    <button
                        onClick={() => setActiveTab('linker')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                            activeTab === 'linker' ? `${accentSolid} text-white shadow-lg` : "text-gray-500 hover:text-gray-300"
                        )}
                    >
                        <Zap className="w-4 h-4" />
                        الربط المباشر (Batch)
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'discovery' ? (
                    <>
                        {/* Input Section (Discovery) */}
                        <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accent}`} />
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                                <div className="lg:col-span-6 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                        <Globe className="w-4 h-4" /> رابط انمي العرب المستهدف
                                    </label>
                                    <input
                                        ref={inputRef}
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://anime3rb.com/"
                                        className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 px-6 outline-none focus:border-emerald-500 transition-all shadow-inner"
                                        dir="ltr"
                                    />
                                </div>

                                <div className="lg:col-span-2 space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                        <Hash className="w-4 h-4" /> العدد المطلوب
                                    </label>
                                    <input
                                        type="number"
                                        value={maxImages}
                                        onChange={(e) => setMaxImages(parseInt(e.target.value) || 0)}
                                        className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 px-6 outline-none focus:border-emerald-500 transition-all text-center"
                                    />
                                </div>

                                <div className="lg:col-span-4 flex gap-3">
                                    <button
                                        onClick={handleScrape}
                                        disabled={scrapeMutation.isPending}
                                        className={cn(
                                            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95",
                                            `bg-gradient-to-r ${accent} text-white shadow-xl ${accentShadow}`,
                                            "disabled:opacity-50 disabled:grayscale"
                                        )}
                                    >
                                        {scrapeMutation.isPending ? (
                                            <><Loader2 className="w-6 h-6 animate-spin" /> جاري السحب...</>
                                        ) : (
                                            <><Search className="w-6 h-6" /> ابدأ اكتشاف انمي العرب</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                        <Type className="w-4 h-4" /> اسم العمل (لتسمية الملفات)
                                    </label>
                                    <input
                                        type="text"
                                        value={animeName}
                                        onChange={(e) => setAnimeName(e.target.value)}
                                        placeholder="مثال: Oshi No Ko"
                                        className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-3 px-6 outline-none focus:border-emerald-500 transition-all"
                                    />
                                </div>
                                <div className="flex items-end justify-end gap-3">
                                    {scrapeResult && (
                                        <button
                                            onClick={handleDownloadAll}
                                            disabled={isDownloading || selectedImages.size === 0}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                                        >
                                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                            تحميل الصور المختارة ({selectedImages.size})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        {scrapeMutation.isPending ? (
                            <div className="mt-12 text-center py-20 bg-[#1a1a1a] rounded-[3rem] border border-white/5">
                                <div className="relative w-24 h-24 mx-auto mb-6">
                                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 animate-ping" />
                                    <div className={`relative w-24 h-24 ${accentBg} rounded-full flex items-center justify-center border border-white/10`}>
                                        <Globe2 className="w-10 h-10 text-emerald-500 animate-pulse" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">جاري قراءة انمي العرب...</h3>
                                <p className="text-gray-500">نقوم الآن بتحليل الموقع واكتشاف الأعمال والصور بدقة</p>
                            </div>
                        ) : scrapeResult ? (
                            <div className="mt-12 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        <ImageIcon className={`w-6 h-6 ${accentText}`} />
                                        الأعمال المكتشفة ({scrapeResult.count})
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-white/5 mr-4">
                                            <button
                                                onClick={() => setViewMode('grid')}
                                                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? `${accentSolid} text-white` : "text-gray-500 hover:text-gray-300")}
                                            >
                                                <ImageIconLucide className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setViewMode('list')}
                                                className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? `${accentSolid} text-white` : "text-gray-500 hover:text-gray-300")}
                                            >
                                                <List className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setSelectedImages(new Set(scrapeResult.images))}
                                            className={`text-xs font-bold ${accentBg} hover:bg-emerald-600/40 ${accentText} px-4 py-2 rounded-xl border border-emerald-500/20 transition-all`}
                                        >
                                            تحديد الكل
                                        </button>
                                        <button
                                            onClick={() => setSelectedImages(new Set())}
                                            className="text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl transition-all"
                                        >
                                            إلغاء التحديد
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Gallery */}
                                    <div className={cn(
                                        "grid gap-4 transition-all duration-500",
                                        activeAnime ? "lg:col-span-8 grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "lg:col-span-12 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                                    )}>
                                        {viewMode === 'grid' ? (
                                            scrapeResult.data.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setActiveAnime(item);
                                                        setLocalDetailUrl(item.detailUrl);
                                                        toggleImageSelection(item.url);
                                                    }}
                                                    onMouseEnter={() => !activeAnime && setActiveAnime(item)}
                                                    className={cn(
                                                        "group relative aspect-[2/3] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300",
                                                        selectedImages.has(item.url)
                                                            ? `border-emerald-500 scale-[0.98] shadow-2xl shadow-emerald-500/20`
                                                            : "border-transparent hover:border-white/20",
                                                        activeAnime?.url === item.url && `ring-4 ${accentRing}`
                                                    )}
                                                >
                                                    <img
                                                        src={item.url}
                                                        alt={item.title}
                                                        referrerPolicy="no-referrer"
                                                        className={cn(
                                                            "w-full h-full object-cover transition-transform duration-500 group-hover:scale-110",
                                                            !selectedImages.has(item.url) && "opacity-80 group-hover:opacity-100"
                                                        )}
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 group-hover:translate-y-0 transition-transform">
                                                        <p className="text-[10px] font-bold text-white line-clamp-1">{item.title}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className={`text-[8px] ${accentText} font-medium`}>{item.status}</p>
                                                            {importingIds.has(item.detailUrl) && (
                                                                <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    {selectedImages.has(item.url) && (
                                                        <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white/20">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                    <a
                                                        href={item.detailUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute top-2 left-2 p-1.5 bg-black/40 backdrop-blur-md rounded-lg text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="space-y-4 col-span-full">
                                                {scrapeResult.data.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={() => {
                                                            setActiveAnime(item);
                                                            setLocalDetailUrl(item.detailUrl);
                                                        }}
                                                        className={cn(
                                                            "flex gap-6 bg-[#1a1a1a] p-4 rounded-2xl border transition-all cursor-pointer",
                                                            activeAnime?.url === item.url ? `border-emerald-500 bg-emerald-500/5 shadow-lg` : "border-white/5 hover:border-white/10"
                                                        )}
                                                    >
                                                        <div className="w-24 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-xl relative">
                                                            <img
                                                                src={item.url}
                                                                referrerPolicy="no-referrer"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            {importingIds.has(item.detailUrl) && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                    <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 space-y-3 py-1 text-right">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-lg font-bold text-white">{item.title}</h4>
                                                                <span className="text-xs bg-white/5 px-2 py-1 rounded text-gray-500">{item.status}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{item.story}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {item.genres.slice(0, 4).map((g, i) => (
                                                                    <span key={i} className={`text-[10px] ${accentBg} ${accentText} px-2 py-0.5 rounded border border-emerald-500/20`}>{g}</span>
                                                                ))}
                                                                {item.episodes && <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded">{item.episodes}</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col justify-between py-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleImageSelection(item.url);
                                                                }}
                                                                className={cn(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                                    selectedImages.has(item.url) ? "bg-emerald-600 text-white" : "bg-white/5 text-gray-600 hover:bg-white/10"
                                                                )}
                                                            >
                                                                {selectedImages.has(item.url) ? <CheckCircle2 className="w-5 h-5" /> : <ImageIconLucide className="w-5 h-5" />}
                                                            </button>
                                                            <a href={item.detailUrl} target="_blank" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-600 hover:text-white transition-all">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Panel */}
                                    {activeAnime && (
                                        <div className="lg:col-span-4 sticky top-8 space-y-6 animate-in slide-in-from-left duration-500">
                                            <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/10 p-6 overflow-hidden relative group">
                                                <div className="absolute top-4 right-4 z-10">
                                                    <button
                                                        onClick={() => setActiveAnime(null)}
                                                        className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-600/20 to-transparent`} />
                                                <div className="relative z-0 space-y-6">
                                                    <div className="aspect-[2/3] w-40 mx-auto rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                                                        <img src={activeAnime.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="text-center space-y-1">
                                                        <h3 className="text-xl font-black text-white">{activeAnime.title}</h3>
                                                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                                                            {activeAnime.genres.map((g, i) => (
                                                                <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded-md text-gray-400">{g}</span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 pt-2 border-t border-white/5">
                                                        <div className="space-y-2">
                                                            <label className={`text-[10px] font-bold text-gray-400 flex items-center gap-2`}>
                                                                <ExternalLink className="w-3 h-3 text-emerald-500" /> رابط العمل على انمي العرب (للسحب العميق)
                                                            </label>
                                                            <input
                                                                type="url"
                                                                value={localDetailUrl}
                                                                onChange={(e) => setLocalDetailUrl(e.target.value)}
                                                                dir="ltr"
                                                                placeholder="https://anime3rb.com/titles/..."
                                                                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-xs text-emerald-300 outline-none focus:border-emerald-500/50 transition-all font-mono"
                                                            />
                                                        </div>

                                                        <button
                                                            onClick={handleDeepImport}
                                                            disabled={isDeepImporting || !localDetailUrl}
                                                            className={`w-full flex items-center justify-center gap-3 bg-gradient-to-r ${accent} hover:brightness-110 text-white py-4 rounded-2xl font-bold transition-all shadow-xl ${accentShadow} active:scale-95 disabled:opacity-50`}
                                                        >
                                                            {isDeepImporting ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="w-5 h-5" />
                                                            )}
                                                            تنزيل ذكي (سحب حلقات + السيرفرات)
                                                        </button>

                                                        <p className="text-[9px] text-gray-500 text-center leading-relaxed px-4">
                                                            * سيقوم هذا الخيار بالدخول إلى رابط العمل، اكتشاف جميع الحلقات، وسحب جميع سيرفرات المشاهدة دفعة واحدة قبل إضافتها للنظام.
                                                        </p>

                                                        <button
                                                            onClick={handleImportToDB}
                                                            disabled={importToDBMutation.isPending || isDeepImporting}
                                                            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white py-3 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            {importToDBMutation.isPending ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <Database className="w-5 h-5" />
                                                            )}
                                                            إضافة سريعة (بيانات فقط)
                                                        </button>

                                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10" onClick={() => setAutoScrapeServers(!autoScrapeServers)}>
                                                            <input
                                                                type="checkbox"
                                                                id="auto-scrape-3rb"
                                                                checked={autoScrapeServers}
                                                                onChange={() => {}}
                                                                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                                            />
                                                            <label htmlFor="auto-scrape-3rb" className="text-xs font-bold text-gray-300 cursor-pointer">
                                                                سحب السيرفرات في الخلفية بعد الإضافة
                                                            </label>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase">الحلقات</p>
                                                                <p className={`text-sm font-black ${accentText}`}>{activeAnime.episodes || 'غير معروف'}</p>
                                                            </div>
                                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase">الحالة</p>
                                                                <p className="text-sm font-black text-green-400">{activeAnime.status || 'مستمر'}</p>
                                                            </div>
                                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase">الموسم</p>
                                                                <p className="text-sm font-black text-orange-400">{activeAnime.season || '-'}</p>
                                                            </div>
                                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase">النوع</p>
                                                                <p className="text-sm font-black text-purple-400">{activeAnime.type || '-'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                                                <Sparkles className="w-3 h-3 text-yellow-500" /> القصة
                                                            </p>
                                                            <p className="text-xs text-gray-400 leading-relaxed max-h-40 overflow-y-auto pr-2">
                                                                {activeAnime.story || 'لا يوجد وصف متاح.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-12 text-center py-32 bg-[#1a1a1a] rounded-[3rem] border border-white/5 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accent}`} />
                                <div className="max-w-md mx-auto space-y-6">
                                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                                        <Globe2 className="w-10 h-10 text-gray-700" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-white">ابدأ بسحب انمي العرب الآن</h3>
                                        <p className="text-gray-500 font-medium">
                                            ضع رابط الموقع (anime3rb.com) وسنقوم باستخراج جميع البوسترات والبيانات والحلقات دفعة واحدة بنظام ذكي.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
                        {/* Status/Header Bar for Linker */}
                        <div className="flex flex-col md:flex-row items-center justify-between bg-[#1a1a1a] p-6 rounded-[2rem] border border-white/5 shadow-2xl gap-6">
                            <div className="flex items-center gap-6 flex-1 w-full">
                                <div className="space-y-2 flex-1 relative">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Search className="w-3 h-3 text-emerald-500" /> ابحث عن أنمي للربط
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="اسم الأنمي..."
                                            value={animeSearch}
                                            onChange={(e) => setAnimeSearch(e.target.value)}
                                            className="w-full bg-[#252525] border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-sm outline-none focus:border-emerald-500/50 transition-all font-bold"
                                        />
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none opacity-40">
                                            {isAnimesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 min-w-[200px]">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">السيرفر المستهدف</label>
                                    <select
                                        className="w-full h-12 bg-[#252525] border border-white/10 rounded-2xl px-4 text-sm outline-none focus:border-emerald-500/50 transition-all cursor-pointer font-bold"
                                        value={selectedServerId}
                                        onChange={(e) => setSelectedServerId(Number(e.target.value))}
                                    >
                                        <option value="">-- اختر السيرفر --</option>
                                        {servers.map(s => <option key={s.id} value={s.id}>{s.name_en || s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {batchResult && (
                                <button
                                    onClick={() => publishAllMutation.mutate()}
                                    disabled={!selectedAnimeId || !selectedServerId || isPublishingAll}
                                    className={`px-10 py-4 bg-gradient-to-r ${accent} hover:brightness-110 text-white rounded-2xl font-black text-lg shadow-xl ${accentShadow} transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3`}
                                >
                                    {isPublishingAll ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                    نشر في قاعدة البيانات
                                </button>
                            )}
                        </div>

                        {/* Input Bar */}
                        <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                            <div className="flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-bold text-gray-400 px-1">رابط صفحة الأنمي أو الحلقة على انمي العرب</label>
                                    <input
                                        type="url"
                                        dir="ltr"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="https://anime3rb.com/titles/... أو https://anime3rb.com/episode/..."
                                        className="w-full bg-[#252525] border border-white/10 rounded-2xl py-4 px-6 text-sm text-emerald-400 outline-none focus:border-emerald-500 transition-all font-mono"
                                    />
                                </div>
                                <button
                                    onClick={() => batchScrapeMutation.mutate(url)}
                                    disabled={batchScrapeMutation.isPending || !url}
                                    className={`lg:mt-6 px-12 py-4 bg-gradient-to-r ${accent} hover:brightness-110 text-white rounded-2xl font-black text-lg transition-all shadow-xl ${accentShadow} active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3`}
                                >
                                    {batchScrapeMutation.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <Zap className="w-6 h-6" />}
                                    جلب الحلقات والسيرفرات
                                </button>
                            </div>
                        </div>

                        {/* Split Results View */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[500px]">
                            {/* Anime Selector */}
                            <div className="lg:col-span-4 space-y-4">
                                <div className="flex items-center gap-2 mb-2 px-2">
                                    <Database className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-bold text-gray-400">الأنمي في قاعدة البيانات</span>
                                </div>
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {animes.map((a: any) => (
                                        <button
                                            key={a.id}
                                            onClick={() => setSelectedAnimeId(a.id)}
                                            className={cn(
                                                "w-full flex gap-4 p-3 rounded-2xl border transition-all text-right group",
                                                selectedAnimeId === a.id ? `${accentSolid} border-emerald-500 shadow-xl` : "bg-white/5 border-white/5 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="w-14 h-20 rounded-xl overflow-hidden shadow-lg shrink-0">
                                                <img src={a.image} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 py-1">
                                                <p className={cn("text-xs font-bold line-clamp-2", selectedAnimeId === a.id ? "text-white" : "text-gray-300")}>{a.title}</p>
                                                <p className={cn("text-[10px] mt-1", selectedAnimeId === a.id ? "text-emerald-100" : "text-gray-500")}>{a.status} • {a.type}</p>
                                            </div>
                                            {selectedAnimeId === a.id && <CheckCircle2 className="w-4 h-4 text-white mt-2" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Batch Results */}
                            <div className="lg:col-span-8">
                                {batchScrapeMutation.isPending ? (
                                    <div className="h-full flex flex-col items-center justify-center bg-[#1a1a1a] rounded-[3rem] border border-white/5 space-y-6 py-20">
                                        <div className="relative w-20 h-20">
                                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
                                            <div className={`relative w-20 h-20 ${accentBg} rounded-full flex items-center justify-center border border-white/10`}>
                                                <Zap className="w-10 h-10 text-emerald-500 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-black text-white text-xl">جاري جلب الحلقات...</p>
                                            <p className="text-gray-500 text-sm mt-1">يتم الآن سحب روابط السيرفرات لكل حلقة بشكل متوازي</p>
                                        </div>
                                    </div>
                                ) : !batchResult ? (
                                    <div className="h-full flex flex-col items-center justify-center bg-[#1a1a1a] rounded-[3rem] border border-white/5 text-gray-600 space-y-4 opacity-50">
                                        <LinkIcon className="w-16 h-16" />
                                        <p className="font-bold">قم بوضع الرابط والضغط على "جلب" لعرض النتائج</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between px-4">
                                            <h3 className="font-black text-xl flex items-center gap-3">
                                                <List className={`w-6 h-6 ${accentText}`} />
                                                الحلقات المكتشفة ({batchResult.totalEpisodes})
                                            </h3>
                                            <span className="text-xs text-gray-500 font-mono" dir="ltr">{batchResult.title}</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {batchResult.episodes.map(ep => {
                                                const matchInDB = dbEpisodes.find(de => de.episode_number === ep.episodeNum);
                                                const isPublished = publishedEps.has(matchInDB?.id || -1);

                                                return (
                                                    <div
                                                        key={ep.episodeNum}
                                                        className={cn(
                                                            "bg-[#1a1a1a] rounded-2xl border transition-all overflow-hidden",
                                                            expandedEpisode === ep.episodeNum ? `border-emerald-500 shadow-xl` : "border-white/5"
                                                        )}
                                                    >
                                                        <div
                                                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
                                                            onClick={() => setExpandedEpisode(expandedEpisode === ep.episodeNum ? null : ep.episodeNum)}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-inner",
                                                                    matchInDB ? (isPublished ? "bg-green-600 text-white" : "bg-emerald-600 text-white") : "bg-white/5 text-gray-600"
                                                                )}>
                                                                    {ep.episodeNum}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold">{ep.label}</p>
                                                                    {matchInDB ? (
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                                            <span className="text-[10px] text-green-500 font-bold">تم المطابقة في النظام</span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 mt-0.5 opacity-40">
                                                                            <AlertCircle className="w-3 h-3 text-yellow-500" />
                                                                            <span className="text-[10px] text-yellow-500 font-bold">حلقة غير موجودة في النظام</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className={`${accentBg} ${accentText} px-3 py-1 rounded-full text-[10px] font-black border border-emerald-500/20`}>
                                                                    {ep.links.length} سيرفرات
                                                                </span>
                                                                {ep.error && (
                                                                    <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full text-[10px] font-black border border-red-500/20">
                                                                        خطأ!
                                                                    </span>
                                                                )}
                                                                <ChevronRight className={cn("w-5 h-5 transition-transform", expandedEpisode === ep.episodeNum && "rotate-90")} />
                                                            </div>
                                                        </div>

                                                        {expandedEpisode === ep.episodeNum && (
                                                            <div className="p-6 pt-0 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                                                                {ep.error ? (
                                                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono">{ep.error}</div>
                                                                ) : ep.links.length === 0 ? (
                                                                    <div className="mt-4 text-center text-gray-600 py-4">لم يتم العثور على سيرفرات لهذه الحلقة</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                                                        {ep.links.map((link, idx) => (
                                                                            <div key={idx} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3 group/item">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={`text-[10px] font-black ${accentBg} ${accentText} px-3 py-1 rounded-md border border-emerald-600/20 uppercase`}>
                                                                                        {link.title}
                                                                                    </span>
                                                                                    <a href={link.embedUrl || link.downloadUrl} target="_blank" className="text-gray-600 hover:text-white transition-colors">
                                                                                        <ExternalLink className="w-4 h-4" />
                                                                                    </a>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-lg group-hover/item:border-emerald-500/30 transition-all">
                                                                                    <LinkIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                                                                                    <span className="text-[10px] text-gray-500 truncate flex-1 font-mono" dir="ltr">{link.embedUrl || link.downloadUrl}</span>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            navigator.clipboard.writeText(link.embedUrl || link.downloadUrl!);
                                                                                            toast.success('تم نسخ الرابط');
                                                                                        }}
                                                                                        className="hover:text-emerald-500 transition-colors"
                                                                                    >
                                                                                        <Copy className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Anime3rbScraperPage;
