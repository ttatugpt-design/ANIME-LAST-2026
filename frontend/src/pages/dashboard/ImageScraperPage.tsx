import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
    Search, Loader2, Download, Globe, ImageIcon, 
    Type, Hash, Trash2, CheckCircle2, AlertCircle, Sparkles, X,
    FileDown, ExternalLink, Image as ImageIconLucide, Database, List
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

const ImageScraperPage: React.FC = () => {
    const [url, setUrl] = useState('');
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

    const inputRef = useRef<HTMLInputElement>(null);

    const scrapeMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/scraper/images', { url, max_images: maxImages });
            return res.data;
        },
        onSuccess: (data: ScrapeResult) => {
            if (data.success) {
                setScrapeResult(data);
                setSelectedImages(new Set(data.images));
                toast.success(`تم جلب ${data.count} صورة بنجاح!`);
                if (!animeName && data.title) {
                    setAnimeName(data.title.split(':')[0].trim());
                }
            } else {
                toast.error('فشل جلب الصور');
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
            toast.success(data.message || 'تم السحب العميق بنجاح!');
            setIsDeepImporting(false);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء السحب العميق');
            setIsDeepImporting(false);
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
                auto_scrape: false // Not needed as deep import is synchronous
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
        const namePrefix = animeName || 'images';
        const urls = Array.from(selectedImages);
        
        try {
            const response = await api.post('/scraper/images-download', { urls, prefix: namePrefix }, { responseType: 'blob' });
            
            // Create a link and trigger download
            const blob = new Blob([response.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${namePrefix}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success(`تم إعداد ملف الضغط وتحميل ${urls.length} صورة!`);
        } catch (err: any) {
            console.error('Download failed:', err);
            toast.error('فشل تحميل الصور كملف مضغوط');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8" dir="rtl">
            {/* Header */}
            <div className="max-w-6xl mx-auto mb-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 border border-white/10">
                        <ImageIconLucide className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent tracking-tight">
                            ساحب الصور الذكي
                        </h1>
                        <p className="text-xs text-gray-400 font-medium mt-1">استخراج صور البوسترات بجودة عالية من أي موقع</p>
                    </div>
                </div>

                {/* Input Section */}
                <div className="bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                        <div className="lg:col-span-6 space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                <Globe className="w-4 h-4" /> رابط الصفحة المستهدفة
                            </label>
                            <input
                                ref={inputRef}
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://witanime.life/"
                                className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 px-6 outline-none focus:border-blue-500 transition-all shadow-inner"
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
                                className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-4 px-6 outline-none focus:border-blue-500 transition-all text-center"
                            />
                        </div>

                        <div className="lg:col-span-4 flex gap-3">
                            <button
                                onClick={handleScrape}
                                disabled={scrapeMutation.isPending}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg transition-all active:scale-95",
                                    "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-900/30",
                                    "disabled:opacity-50 disabled:grayscale"
                                )}
                            >
                                {scrapeMutation.isPending ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> جاري السحب...</>
                                ) : (
                                    <><Search className="w-6 h-6" /> ابدأ السحب</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-400 px-1">
                                <Type className="w-4 h-4" /> اسم الأنمي (لتسمية الملفات)
                            </label>
                            <input
                                type="text"
                                value={animeName}
                                onChange={(e) => setAnimeName(e.target.value)}
                                placeholder="مثال: One Piece"
                                className="w-full bg-[#252525] border border-white/10 rounded-2xl text-white py-3 px-6 outline-none focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="flex items-end justify-end gap-3">
                             {scrapeResult && (
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={isDownloading || selectedImages.size === 0}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-green-900/20"
                                >
                                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                                    تحميل الصور المختارة ({selectedImages.size})
                                </button>
                             )}
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {scrapeMutation.isPending ? (
                    <div className="mt-12 text-center py-20 bg-[#1a1a1a] rounded-[3rem] border border-white/5">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 animate-ping" />
                            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-white/10">
                                <ImageIconLucide className="w-10 h-10 text-blue-500 animate-pulse" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">جاري قراءة الصفحة...</h3>
                        <p className="text-gray-500">نقوم الآن بالنزول لأسفل الصفحة وتجاوز أنظمة الحماية لجمع أفضل الصور</p>
                    </div>
                ) : scrapeResult ? (
                    <div className="mt-12 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <ImageIcon className="w-6 h-6 text-blue-500" />
                                الصور المكتشفة ({scrapeResult.count})
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded-xl border border-white/5 mr-4">
                                    <button 
                                        onClick={() => setViewMode('grid')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300")}
                                    >
                                        <ImageIconLucide className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setViewMode('list')}
                                        className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-300")}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setSelectedImages(new Set(scrapeResult.images))}
                                    className="text-xs font-bold bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 transition-all"
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
                                                    ? "border-blue-500 scale-[0.98] shadow-2xl shadow-blue-500/20" 
                                                    : "border-transparent hover:border-white/20",
                                                activeAnime?.url === item.url && "ring-4 ring-blue-500/30"
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
                                                    <p className="text-[8px] text-blue-400 font-medium">{item.episodes} حلقة</p>
                                                    {importingIds.has(item.detailUrl) && (
                                                        <Loader2 className="w-3 h-3 text-yellow-500 animate-spin" />
                                                    )}
                                                </div>
                                            </div>

                                            {selectedImages.has(item.url) && (
                                                <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white/20">
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
                                                    activeAnime?.url === item.url ? "border-blue-500 bg-blue-500/5 shadow-lg" : "border-white/5 hover:border-white/10"
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
                                                            <span key={i} className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{g}</span>
                                                        ))}
                                                        {item.episodes && <span className="text-[10px] bg-white/5 text-gray-500 px-2 py-0.5 rounded">{item.episodes} حلقة</span>}
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
                                                            selectedImages.has(item.url) ? "bg-blue-600 text-white" : "bg-white/5 text-gray-600 hover:bg-white/10"
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

                                        {/* Background Decor */}
                                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-600/20 to-transparent" />

                                        <div className="relative z-0 space-y-6">
                                            <div className="aspect-[2/3] w-40 mx-auto rounded-xl shadow-2xl border border-white/10 overflow-hidden">
                                                <img src={activeAnime.url} className="w-full h-full object-cover" />
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
                                                    <label className="text-[10px] font-bold text-gray-400 flex items-center gap-2">
                                                        <ExternalLink className="w-3 h-3 text-blue-500" /> رابط صفحة الأنمي (للسحب العميق)
                                                    </label>
                                                    <input 
                                                        type="url"
                                                        value={localDetailUrl}
                                                        onChange={(e) => setLocalDetailUrl(e.target.value)}
                                                        dir="ltr"
                                                        placeholder="https://witanime.life/anime/..."
                                                        className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-xs text-blue-300 outline-none focus:border-blue-500/50 transition-all font-mono"
                                                    />
                                                </div>

                                                <button 
                                                    onClick={handleDeepImport}
                                                    disabled={isDeepImporting || !localDetailUrl}
                                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:brightness-110 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-900/30 active:scale-95 disabled:opacity-50"
                                                >
                                                    {isDeepImporting ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-5 h-5" />
                                                    )}
                                                    تنزيل ذكي (سحب الحلقات + السيرفرات)
                                                </button>

                                                <p className="text-[9px] text-gray-500 text-center leading-relaxed px-4">
                                                    * سيقوم هذا الخيار بالدخول إلى رابط الأنمي، اكتشاف الحلقات، وسحب جميع سيرفرات المشاهدة دفعة واحدة قبل إضافتها للنظام.
                                                </p>
                                            </div>

                                            <div className="relative group">
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
                                            </div>

                                            <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10" onClick={() => setAutoScrapeServers(!autoScrapeServers)}>
                                                <input 
                                                    type="checkbox" 
                                                    id="auto-scrape" 
                                                    checked={autoScrapeServers} 
                                                    onChange={() => {}} // handled by div click
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                />
                                                <label htmlFor="auto-scrape" className="text-xs font-bold text-gray-300 cursor-pointer">
                                                    سحب السيرفرات في الخلفية بعد الإضافة
                                                </label>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase">الحلقات</p>
                                                    <p className="text-sm font-black text-blue-400">{activeAnime.episodes || 'غير معروف'}</p>
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
                                                <p className="text-xs text-gray-400 leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                    {activeAnime.story || 'لا يوجد وصف متاح لهذا الأنمي.'}
                                                </p>
                                            </div>

                                            {activeAnime.malUrl && (
                                                <a 
                                                    href={activeAnime.malUrl} 
                                                    target="_blank" 
                                                    className="flex items-center justify-center gap-2 w-full py-3 bg-[#2d54a0] hover:bg-[#3b6ec2] text-white rounded-xl font-bold text-xs transition-all"
                                                >
                                                    <ExternalLink className="w-3 h-3" /> مشاهدة على MAL
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Initial Empty State */
                    <div className="mt-12 text-center py-32 bg-[#1a1a1a] rounded-[3rem] border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-600" />
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                                <ImageIconLucide className="w-10 h-10 text-gray-700" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">ابدأ بسحب الصور الآن</h3>
                                <p className="text-gray-500 font-medium">
                                    ضع رابط الصفحة (مثل Crunchyroll أو أي موقع أنمي) وسنقوم باستخراج جميع الصور والبوسترات دفعة واحدة.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageScraperPage;
