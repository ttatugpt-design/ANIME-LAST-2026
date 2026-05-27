import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
    Search, Loader2, Globe, ImageIcon, 
    Trash2, CheckCircle2, AlertCircle, Sparkles, X,
    FileDown, ExternalLink, Image as ImageIconLucide, Database, List,
    ChevronRight, Layers, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface SeasonItem {
    title: string;
    url: string;
    poster: string;
}

interface BaseInfo {
    success: boolean;
    title: string;
    mainBanner: string;
    seasons: SeasonItem[];
}

interface EpisodeItem {
    number: number;
    title: string;
    url: string;
    thumbnail: string;
    servers: { name: string; url: string }[];
}

interface SeasonDetails {
    success: boolean;
    title: string;
    dvdPoster: string;
    story: string;
    genres: string[];
    episodesCount: string;
    status: string;
    season: string;
    type: string;
    episodes: EpisodeItem[];
}

const AnimercoScraperPage: React.FC = () => {
    const [url, setUrl] = useState('');
    const [baseInfo, setBaseInfo] = useState<BaseInfo | null>(null);
    const [seasonDetails, setSeasonDetails] = useState<SeasonDetails | null>(null);
    const [selectedSeasonUrl, setSelectedSeasonUrl] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const fetchInfoMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/animerco/info', { url: targetUrl });
            return res.data;
        },
        onSuccess: (data: BaseInfo) => {
            if (data.success) {
                setBaseInfo(data);
                setSeasonDetails(null);
                setSelectedSeasonUrl(null);
                toast.success('تم جلب معلومات الأنمي والمواسم!');
            } else {
                toast.error('فشل جلب المعلومات');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء الجلب');
        }
    });

    const fetchSeasonDetailsMutation = useMutation({
        mutationFn: async ({ seasonUrl, withServers }: { seasonUrl: string; withServers: boolean }) => {
            const res = await api.post('/scraper/animerco/season-details', { 
                url: seasonUrl,
                with_servers: withServers 
            });
            return res.data;
        },
        onSuccess: (data: SeasonDetails) => {
            if (data.success) {
                setSeasonDetails(data);
                toast.success(`تم جلب تفاصيل ${data.title} بنجاح!`);
            } else {
                toast.error('فشل جلب تفاصيل الموسم');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء جلب التفاصيل');
        }
    });

    const handleImportToDB = async () => {
        if (!seasonDetails) return;
        setIsImporting(true);
        try {
            const importData = {
                title: seasonDetails.title,
                story: seasonDetails.story,
                poster: seasonDetails.dvdPoster,
                anime_banner: baseInfo?.mainBanner || '', // إرسال البانر الرئيسي
                episodes_count: seasonDetails.episodesCount,
                type: seasonDetails.type,
                genres: seasonDetails.genres,
                status: seasonDetails.status,
                season: seasonDetails.season,
                episodes: seasonDetails.episodes.map(ep => ({
                    number: ep.number,
                    title: ep.title,
                    thumbnail: ep.thumbnail,
                    servers: ep.servers || []
                }))
            };
            
            const res = await api.post('/scraper/animerco/import-full', importData);
            toast.success(res.data.message || "تم استيراد الموسم بنجاح!");
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'حدث خطأ أثناء الاستيراد');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadThumbnails = async () => {
        if (!seasonDetails || seasonDetails.episodes.length === 0) return;
        setIsDownloading(true);
        try {
            const urls = seasonDetails.episodes.map(ep => ep.thumbnail).filter(Boolean);
            const prefix = seasonDetails.title.replace(/\s+/g, '_');
            const response = await api.post('/scraper/images-download', { urls, prefix }, { responseType: 'blob' });
            
            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${prefix}_episodes.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('تم تحميل صور الحلقات بنجاح!');
        } catch (err) {
            toast.error('فشل تحميل الصور');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8" dir="rtl">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-900/40 border border-white/10">
                        <Layers className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tight">
                            ساحب Animerco المتطور
                        </h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">استخراج كامل للمواسم، البوسترات، وتفاصيل الحلقات</p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden mb-12">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                <Globe className="w-4 h-4" /> رابط الأنمي (eta.animerco.org)
                            </label>
                            <input
                                ref={inputRef}
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://eta.animerco.org/animes/dr-stone/"
                                className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 px-6 outline-none focus:border-indigo-500 transition-all shadow-inner"
                                dir="ltr"
                            />
                        </div>
                        
                        <button
                            onClick={() => fetchInfoMutation.mutate(url)}
                            disabled={fetchInfoMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-900/30 flex items-center gap-3"
                        >
                            {fetchInfoMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                            اكتشاف المواسم
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Side: Base Info & Seasons */}
                    <div className="lg:col-span-4 space-y-8">
                        {baseInfo && (
                            <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                                <div className="aspect-video relative group">
                                    <img 
                                        src={baseInfo.mainBanner} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                        alt="Banner"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                                    <div className="absolute bottom-4 right-4">
                                        <h2 className="text-xl font-black text-white shadow-lg">{baseInfo.title}</h2>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-indigo-500" /> المواسم المكتشفة ({baseInfo.seasons.length})
                                    </h3>
                                    <div className="space-y-3">
                                        {baseInfo.seasons.map((season, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <button
                                                    onClick={() => setSelectedSeasonUrl(season.url)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right group",
                                                        selectedSeasonUrl === season.url 
                                                            ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-400" 
                                                            : "bg-white/5 border-transparent hover:border-white/10 text-gray-400 hover:text-white"
                                                    )}
                                                >
                                                    <div className="w-12 h-16 bg-black rounded-lg overflow-hidden shrink-0">
                                                        {season.poster ? (
                                                            <img src={season.poster} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-900/20">
                                                                <ImageIconLucide className="w-4 h-4 opacity-20" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-xs">
                                                        <p className="font-bold truncate">{season.title}</p>
                                                        <p className="opacity-50 mt-1 truncate" dir="ltr">{season.url}</p>
                                                    </div>
                                                    <ChevronRight className={cn("w-4 h-4 transition-transform", selectedSeasonUrl === season.url && "rotate-90")} />
                                                </button>

                                                {selectedSeasonUrl === season.url && (
                                                    <div className="grid grid-cols-2 gap-2 px-1">
                                                        <button 
                                                            onClick={() => fetchSeasonDetailsMutation.mutate({ seasonUrl: season.url, withServers: false })}
                                                            disabled={fetchSeasonDetailsMutation.isPending}
                                                            className="bg-white/5 hover:bg-white/10 text-[10px] py-2 rounded-lg border border-white/5 transition-all"
                                                        >
                                                            جلب سريع (بدون سيرفرات)
                                                        </button>
                                                        <button 
                                                            onClick={() => fetchSeasonDetailsMutation.mutate({ seasonUrl: season.url, withServers: true })}
                                                            disabled={fetchSeasonDetailsMutation.isPending}
                                                            className="bg-indigo-600/20 hover:bg-indigo-600/40 text-[10px] py-2 rounded-lg border border-indigo-500/30 text-indigo-400 transition-all"
                                                        >
                                                            جلب عميق (بالسيرفرات)
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Season Details & Episodes */}
                    <div className="lg:col-span-8 space-y-8">
                        {fetchSeasonDetailsMutation.isPending ? (
                            <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 p-20 text-center shadow-2xl">
                                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold">جاري سحب تفاصيل الموسم...</h3>
                                <p className="text-gray-500 mt-2">نقوم بجلب القصة وصور الحلقات بالتوازي</p>
                            </div>
                        ) : seasonDetails ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Season Metadata Card */}
                                <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 mx-auto md:mx-0">
                                            <img src={seasonDetails.dvdPoster} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 space-y-6">
                                            <div>
                                                <h2 className="text-3xl font-black text-white">{seasonDetails.title}</h2>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {seasonDetails.genres.map((g, i) => (
                                                        <span key={i} className="bg-indigo-600/10 text-indigo-400 text-[10px] px-3 py-1 rounded-full border border-indigo-500/20">{g}</span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold">الحلقات</p>
                                                    <p className="text-sm font-black text-indigo-400">{seasonDetails.episodesCount}</p>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold">الحالة</p>
                                                    <p className="text-sm font-black text-green-400">{seasonDetails.status}</p>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold">النوع</p>
                                                    <p className="text-sm font-black text-purple-400">{seasonDetails.type}</p>
                                                </div>
                                                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold">الموسم</p>
                                                    <p className="text-sm font-black text-orange-400">{seasonDetails.season}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                                    <Info className="w-3 h-3 text-indigo-500" /> القصة
                                                </p>
                                                <p className="text-sm text-gray-400 leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                                                    {seasonDetails.story}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-4 pt-4">
                                                <button 
                                                    onClick={handleImportToDB}
                                                    disabled={isImporting}
                                                    className="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-900/30 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                                    إضافة الموسم للقاعدة
                                                </button>
                                                <button 
                                                    onClick={handleDownloadThumbnails}
                                                    disabled={isDownloading}
                                                    className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                                    تحميل صور الحلقات
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Episodes Grid */}
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-3">
                                        <ImageIcon className="w-6 h-6 text-indigo-500" /> صور الحلقات ({seasonDetails.episodes.length})
                                    </h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {seasonDetails.episodes.map((ep) => (
                                            <div key={ep.number} className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-[#1a1a1a]">
                                                {ep.thumbnail ? (
                                                    <img src={ep.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={`Ep ${ep.number}`} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-900/10">
                                                        <ImageIconLucide className="w-8 h-8 opacity-10" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-2 right-2 left-2 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-white truncate">{ep.title}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        {ep.servers?.length > 0 && (
                                                            <span className="bg-green-600/80 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                <Globe className="w-2 h-2" /> {ep.servers.length}
                                                            </span>
                                                        )}
                                                        <span className="bg-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded">EP {ep.number}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 p-32 text-center shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500" />
                                <Layers className="w-16 h-16 text-gray-800 mx-auto mb-6" />
                                <h3 className="text-2xl font-bold text-gray-500">اختر موسماً من القائمة الجانبية لبدء السحب</h3>
                                <p className="text-gray-600 mt-2 max-w-sm mx-auto font-medium">سحب ذكي للملصقات (DVD) وقصص الأنمي وصور الحلقات بدقة عالية</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AnimercoScraperPage;
