import React, { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
    Search, Loader2, Globe, ExternalLink,
    Sparkles, CheckCircle2, Zap, Layers,
    Film, Database, Download, List, Info, Layout, ArrowLeft, RefreshCw,
    Edit2, ChevronDown, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ───────────────── Types ─────────────────
interface DiscoveryItem {
    title: string;
    link: string;
    img: string | null;
}

interface EpisodeData {
    title: string;
    number: number;
    thumbnail: string;
    link: string;
}

interface SeriesData {
    isDiscovery: false;
    title: string;
    description: string;
    poster: string | null;
    banner: string | null;
    genres: string[];
    episodes: EpisodeData[];
}

// ─────────────────────────────────────────
type ViewMode = 'empty' | 'discovery' | 'preview' | 'importing' | 'done';

const CrunchyrollImporterPage: React.FC = () => {
    const [url, setUrl] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('empty');
    const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
    const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
    const [importResult, setImportResult] = useState<{ title: string; count: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedAnimeId, setSelectedAnimeId] = useState<number | null>(null);
    const [animeSearch, setAnimeSearch] = useState('');
    const [animeDropdownOpen, setAnimeDropdownOpen] = useState(false);
    const [updateResult, setUpdateResult] = useState<{ title: string; updated: number; added: number } | null>(null);

    // ── Fetch Mutation (Discovery or Preview) ──
    const fetchMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/crunchyroll/deep-import', {
                url: targetUrl,
                preview_only: true
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.isDiscovery) {
                const items: DiscoveryItem[] = data.results || [];
                if (items.length === 0) {
                    toast.error('لم يتم العثور على أنميات في هذه الصفحة');
                    return;
                }
                setDiscoveryItems(items);
                setViewMode('discovery');
                toast.success(`تم اكتشاف ${items.length} أنمي!`);
            } else {
                setSeriesData(data as SeriesData);
                setViewMode('preview');
                toast.success('تم جلب بيانات الأنمي بنجاح!');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'فشل جلب البيانات');
        }
    });

    // ── Import Mutation (Full Deep Import) ──
    const importMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/crunchyroll/deep-import', { url: targetUrl });
            return res.data;
        },
        onSuccess: (data) => {
            setImportResult({ title: data.title, count: data.import_count });
            setViewMode('done');
            toast.success(`✅ تم استيراد "${data.title}" مع ${data.import_count} حلقة!`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'فشل الاستيراد');
            setViewMode('preview');
        }
    });

    // ── Animes List Query (for update selector) ──
    const { data: animesList } = useQuery({
        queryKey: ['animes-list-for-update'],
        queryFn: async () => {
            const res = await api.get('/animes?limit=500');
            return res.data as Array<{ id: number; title: string; image: string }>;
        },
    });

    // ── Update Mutation ──
    const updateMutation = useMutation({
        mutationFn: async (payload: { anime_id: number; description: string; banner: string | null; episodes: EpisodeData[] }) => {
            const res = await api.post('/scraper/crunchyroll/update-anime', payload);
            return res.data;
        },
        onSuccess: (data) => {
            setUpdateResult({ title: data.title, updated: data.updated_count, added: data.added_count });
            toast.success(`✅ تم تحديث "${data.title}" — ${data.updated_count} حلقة مُحدَّثة${data.added_count > 0 ? ` + ${data.added_count} جديدة` : ''}`);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'فشل تحديث الأنمي');
        }
    });

    const handleFetch = () => {
        const target = url.trim();
        if (!target) { inputRef.current?.focus(); return; }
        setDiscoveryItems([]);
        setSeriesData(null);
        setViewMode('empty');
        fetchMutation.mutate(target);
    };

    const handleSelectAnime = (item: DiscoveryItem) => {
        setUrl(item.link);
        fetchMutation.mutate(item.link);
        setViewMode('empty'); // show loading
    };

    const handleDeepImport = () => {
        const target = url.trim();
        if (!target) return;
        setViewMode('importing');
        importMutation.mutate(target);
    };

    const handleReset = () => {
        setViewMode('empty');
        setDiscoveryItems([]);
        setSeriesData(null);
        setImportResult(null);
        setUpdateResult(null);
        setSelectedAnimeId(null);
        setUrl('');
    };

    const handleUpdateAnime = () => {
        if (!selectedAnimeId || !seriesData) return;
        updateMutation.mutate({
            anime_id: selectedAnimeId,
            description: seriesData.description,
            banner: seriesData.banner,
            episodes: seriesData.episodes,
        });
    };

    return (
        <div className="min-h-screen bg-[#0b0b0b] text-white" dir="rtl">
            {/* BG Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[15%] -right-[10%] w-[50%] h-[50%] bg-orange-600/8 blur-[140px] rounded-full" />
                <div className="absolute -bottom-[15%] -left-[10%] w-[40%] h-[40%] bg-orange-900/8 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-orange-600/25 border border-white/10">
                            <Zap className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-orange-400 to-white bg-clip-text text-transparent">
                                مستورد Crunchyroll
                            </h1>
                            <p className="text-gray-400 text-sm flex items-center gap-2 mt-0.5">
                                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                                اكتشف، اختر، واستورد بضغطة واحدة
                            </p>
                        </div>
                    </div>
                    {viewMode !== 'empty' && (
                        <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition-all">
                            <RefreshCw className="w-4 h-4" />
                            بداية جديدة
                        </button>
                    )}
                </div>

                {/* ── Search Bar ── */}
                <div className={cn(
                    "bg-[#141414] border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl transition-all duration-500 mb-8",
                    (viewMode !== 'empty') && "opacity-80 scale-[0.99]"
                )}>
                    <p className="text-center text-gray-400 text-sm mb-4">
                        ضع رابط صفحة "الفيديوهات الجديدة" أو رابط مسلسل مباشر
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <input
                                ref={inputRef}
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                                placeholder="https://www.crunchyroll.com/ar/videos/new"
                                className="w-full bg-black/40 border border-white/8 rounded-2xl py-4 pr-12 pl-5 outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all"
                                dir="ltr"
                            />
                        </div>
                        <button
                            onClick={handleFetch}
                            disabled={fetchMutation.isPending || importMutation.isPending}
                            className="px-8 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-orange-600/20 transition-all active:scale-[0.98] flex items-center gap-2 whitespace-nowrap"
                        >
                            {fetchMutation.isPending
                                ? <Loader2 className="animate-spin w-5 h-5" />
                                : <Search className="w-5 h-5" />}
                            استكشاف
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-[11px] text-gray-600 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-orange-600" /> صور البوستر</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-orange-600" /> صور الغلاف</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-orange-600" /> صور الحلقات</span>
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-orange-600" /> القصة والتفاصيل</span>
                    </div>
                </div>

                {/* ── Empty State ── */}
                {viewMode === 'empty' && !fetchMutation.isPending && (
                    <div className="mt-16 text-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 bg-white/3 rounded-3xl border border-white/8 flex items-center justify-center mx-auto mb-6">
                            <Layers className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-2xl font-black mb-2">جاهز للاستكشاف</h3>
                        <p className="text-gray-500 max-w-md mx-auto">ابدأ باستخدام رابط "الفيديوهات الجديدة" لرؤية كل أنميات Crunchyroll الحالية، ثم اختر ما تريد استيراده.</p>
                    </div>
                )}

                {/* ── Loading State ── */}
                {fetchMutation.isPending && (
                    <div className="text-center py-24 animate-in fade-in duration-300">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">جاري استكشاف Crunchyroll...</p>
                        <p className="text-gray-600 text-sm mt-1">قد يستغرق هذا 15-30 ثانية</p>
                    </div>
                )}

                {/* ── Discovery Grid ── */}
                {viewMode === 'discovery' && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-3 mb-6 px-2">
                            <Layers className="w-5 h-5 text-orange-500" />
                            <h2 className="text-xl font-bold">{discoveryItems.length} أنمي مكتشف</h2>
                            <span className="text-gray-500 text-sm">— اضغط على أي أنمي لاستيراده</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {discoveryItems.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectAnime(item)}
                                    className="group relative bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:border-orange-500/40 transition-all duration-300 shadow-lg text-right"
                                >
                                    <div className="aspect-[2/3] relative overflow-hidden bg-white/3">
                                        {item.img ? (
                                            <img
                                                src={item.img}
                                                alt={item.title}
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Film className="w-8 h-8 text-gray-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-orange-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                            <div className="bg-orange-600 rounded-full p-3 shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                                <Download className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-bold leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors">{item.title}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Series Preview ── */}
                {viewMode === 'preview' && seriesData && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
                        {/* Back to discovery */}
                        {discoveryItems.length > 0 && (
                            <button onClick={() => setViewMode('discovery')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                                <ArrowLeft className="w-4 h-4" />
                                العودة لقائمة الاكتشاف
                            </button>
                        )}

                        {/* Anime Info Card */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Poster */}
                            <div className="lg:col-span-1">
                                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/8 shadow-2xl bg-white/3">
                                    {seriesData.poster ? (
                                        <img src={seriesData.poster} alt={seriesData.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Film className="w-16 h-16 text-gray-700" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="lg:col-span-2">
                                <div className="h-full bg-[#141414] rounded-2xl border border-white/5 p-6 md:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-600 via-orange-400 to-transparent" />

                                    <div className="flex items-center gap-2 text-orange-500 text-xs font-bold uppercase tracking-widest mb-3">
                                        <Info className="w-4 h-4" />
                                        تم استخراج البيانات بنجاح
                                    </div>

                                    <h2 className="text-3xl font-black mb-4">{seriesData.title}</h2>

                                    {seriesData.genres?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-5">
                                            {seriesData.genres.map((g, i) => (
                                                <span key={i} className="bg-orange-600/10 text-orange-400 border border-orange-600/20 px-3 py-1 rounded-full text-xs font-bold">
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {seriesData.description && (
                                        <div className="mb-6">
                                            <h4 className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">
                                                <List className="w-3.5 h-3.5" /> القصة
                                            </h4>
                                            <p className="text-gray-300 leading-relaxed">{seriesData.description}</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={handleDeepImport}
                                            className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-lg shadow-xl shadow-orange-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <Database className="w-5 h-5" />
                                            استيراد إلى قاعدة البيانات
                                        </button>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-5 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all flex items-center gap-2 text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Banner Preview */}
                        {seriesData.banner && (
                            <div className="relative h-56 rounded-2xl overflow-hidden border border-white/5">
                                <img src={seriesData.banner} alt="Banner" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/30 to-transparent" />
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 text-orange-400 text-xs font-bold">
                                    <Layout className="w-4 h-4" /> صورة الغلاف (Hero Banner)
                                </div>
                            </div>
                        )}

                        {/* Episodes */}
                        {seriesData.episodes?.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-4 px-1">
                                    <Film className="w-5 h-5 text-orange-500" />
                                    <h3 className="text-xl font-bold">{seriesData.episodes.length} حلقة جاهزة للاستيراد</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {seriesData.episodes.map((ep, idx) => (
                                        <div key={idx} className="bg-[#141414] rounded-2xl overflow-hidden border border-white/5 group">
                                            <div className="aspect-video relative overflow-hidden bg-white/3">
                                                {ep.thumbnail ? (
                                                    <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Film className="w-6 h-6 text-gray-700" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-lg text-[10px] font-bold">
                                                    ح {ep.number || idx + 1}
                                                </div>
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs font-bold text-gray-300 line-clamp-2">{ep.title}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Update Existing Anime Panel ── */}
                        <div className="bg-[#141414] border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-600 via-orange-400 to-transparent" />

                            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-widest mb-5">
                                <Edit2 className="w-4 h-4" />
                                تحديث أنمي موجود في النظام
                            </div>

                            {/* Anime Selector Dropdown */}
                            <div className="mb-5 relative">
                                <p className="text-gray-400 text-sm mb-2">اختر الأنمي المراد تحديثه:</p>
                                <button
                                    onClick={() => setAnimeDropdownOpen(v => !v)}
                                    className="w-full flex items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-right hover:border-orange-500/40 transition-all"
                                >
                                    <span className="text-sm truncate">
                                        {selectedAnimeId
                                            ? (animesList?.find(a => a.id === selectedAnimeId)?.title || 'أنمي مختار')
                                            : <span className="text-gray-500">ابحث عن أنمي في النظام...</span>
                                        }
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200", animeDropdownOpen && "rotate-180")} />
                                </button>

                                {animeDropdownOpen && (
                                    <div className="absolute top-full right-0 left-0 z-50 mt-1 bg-[#1c1c1c] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                        {/* Search Input */}
                                        <div className="p-2 border-b border-white/5">
                                            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2">
                                                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                                                <input
                                                    type="text"
                                                    value={animeSearch}
                                                    onChange={e => setAnimeSearch(e.target.value)}
                                                    placeholder="ابحث عن اسم الأنمي..."
                                                    className="flex-1 bg-transparent outline-none text-sm placeholder-gray-600"
                                                    autoFocus
                                                />
                                                {animeSearch && (
                                                    <button onClick={() => setAnimeSearch('')} className="text-gray-500 hover:text-white transition-colors">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* Anime List */}
                                        <div className="max-h-60 overflow-y-auto">
                                            {(animesList || [])
                                                .filter(a => a.title.toLowerCase().includes(animeSearch.toLowerCase()))
                                                .slice(0, 50)
                                                .map(anime => (
                                                    <button
                                                        key={anime.id}
                                                        onClick={() => {
                                                            setSelectedAnimeId(anime.id);
                                                            setAnimeDropdownOpen(false);
                                                            setAnimeSearch('');
                                                        }}
                                                        className={cn(
                                                            "w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-white/5 transition-colors text-sm",
                                                            selectedAnimeId === anime.id && "bg-orange-600/10 text-orange-400"
                                                        )}
                                                    >
                                                        {anime.image && (
                                                            <img src={anime.image} alt={anime.title} className="w-8 h-10 rounded-md object-cover shrink-0" onError={e => (e.currentTarget.style.display = 'none')} />
                                                        )}
                                                        <span className="truncate">{anime.title}</span>
                                                        {selectedAnimeId === anime.id && <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mr-auto" />}
                                                    </button>
                                                ))
                                            }
                                            {(animesList || []).filter(a => a.title.toLowerCase().includes(animeSearch.toLowerCase())).length === 0 && (
                                                <p className="text-center text-gray-600 text-sm py-6">لا توجد نتائج</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info badges */}
                            <div className="flex flex-wrap gap-2 mb-5 text-[11px]">
                                <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" /> صورة الأنمي (Poster) تبقى كما هي
                                </span>
                                <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" /> السيرفرات القديمة تبقى
                                </span>
                                <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full">
                                    <RefreshCw className="w-3 h-3" /> القصة، صورة الغلاف (Banner)، صور الحلقات، العناوين تتحدث
                                </span>
                                <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full">
                                    <Layers className="w-3 h-3" /> حلقات جديدة تُضاف تلقائياً
                                </span>
                            </div>

                            {/* Success result */}
                            {updateResult && (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold">تم التحديث بنجاح!</p>
                                        <p className="text-green-500/70 text-xs mt-0.5">
                                            {updateResult.updated} حلقة مُحدَّثة
                                            {updateResult.added > 0 ? ` · ${updateResult.added} حلقة جديدة أُضيفت` : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Update Button */}
                            <button
                                onClick={handleUpdateAnime}
                                disabled={!selectedAnimeId || updateMutation.isPending}
                                className="w-full py-3.5 bg-orange-600/15 hover:bg-orange-600/25 disabled:opacity-40 disabled:cursor-not-allowed border border-orange-500/30 hover:border-orange-500/60 text-orange-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                {updateMutation.isPending
                                    ? <><Loader2 className="animate-spin w-5 h-5" /> جاري التحديث والتنزيل...</>
                                    : <><Edit2 className="w-5 h-5" /> تعديل الأنمي المختار</>
                                }
                            </button>
                        </div>
                    </div>
                )}


                {/* ── Importing State ── */}
                {viewMode === 'importing' && (
                    <div className="text-center py-24 animate-in fade-in duration-300">
                        <div className="relative w-28 h-28 mx-auto mb-8">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500/10 animate-ping scale-110" />
                            <div className="absolute inset-0 rounded-full border-t-4 border-orange-500 animate-spin" />
                            <div className="absolute inset-3 rounded-full bg-orange-500/5 flex items-center justify-center">
                                <Database className="w-10 h-10 text-orange-500" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black mb-2">جاري الاستيراد العميق...</h3>
                        <p className="text-gray-400">نقوم بتحميل كل الصور وحفظ الأنمي والحلقات في قاعدة البيانات</p>
                        <p className="text-gray-600 text-sm mt-2">قد يستغرق هذا 1-3 دقائق حسب عدد الحلقات</p>
                    </div>
                )}

                {/* ── Done State ── */}
                {viewMode === 'done' && importResult && (
                    <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-green-500" />
                        </div>
                        <h3 className="text-3xl font-black mb-2">تم الاستيراد بنجاح! 🎉</h3>
                        <p className="text-xl text-gray-300 mb-1">{importResult.title}</p>
                        <p className="text-gray-500 mb-8">{importResult.count} حلقة مع كامل الصور والتفاصيل</p>
                        <div className="flex gap-4 justify-center">
                            <button onClick={handleReset} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-all">
                                استيراد أنمي آخر
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CrunchyrollImporterPage;
