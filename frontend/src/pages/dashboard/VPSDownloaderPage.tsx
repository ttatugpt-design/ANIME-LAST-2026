import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Download, 
    Upload, 
    Plus, 
    Trash2, 
    CheckCircle, 
    Clock, 
    AlertCircle, 
    Loader2, 
    Server,
    Cloud,
    ExternalLink,
    Sparkles,
    Zap,
    Link as LinkIcon,
    ImageIcon,
    X,
    Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

interface DownloadItem {
    index: number;
    link: string;
    status: "pending" | "downloading" | "completed" | "error" | "deleted";
    progress: number;
    eta: string;
}

interface TaskStatus {
    anime_name: string;
    items: DownloadItem[];
    is_uploading: boolean;
    upload_status: string;
}

export default function VPSDownloaderPage() {
    const { lang } = useParams<{ lang: string }>();
    const isAr = lang === "ar";

    const [animeName, setAnimeName] = useState("");
    const [linksText, setLinksText] = useState("");
    const [status, setStatus] = useState<TaskStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Scraper State
    const [scraperUrl, setScraperUrl] = useState("");
    const [isScraping, setIsScraping] = useState(false);
    const [scrapedData, setScrapedData] = useState<{
        title: string;
        poster: string;
        links: string[];
    } | null>(null);

    // Discovery State
    const [discoveredAnimes, setDiscoveredAnimes] = useState<any[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);

    // Polling for status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status && !status.items.every(i => i.status === "completed" || i.status === "error")) {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/dashboard/vps-downloader/status?anime_name=${encodeURIComponent(status.anime_name)}`);
                    setStatus(res.data);
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 2000);
        } else if (status?.is_uploading && status.upload_status === "uploading") {
            interval = setInterval(async () => {
                try {
                    const res = await api.get(`/dashboard/vps-downloader/status?anime_name=${encodeURIComponent(status.anime_name)}`);
                    setStatus(res.data);
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [status]);

    const handleStartDownload = async () => {
        if (!animeName.trim()) {
            toast.error(isAr ? "يرجى إدخال اسم الأنمي" : "Please enter anime name");
            return;
        }
        const links = linksText.split("\n").map(l => l.trim()).filter(l => l !== "");
        if (links.length === 0) {
            toast.error(isAr ? "يرجى إضافة روابط التحميل" : "Please add download links");
            return;
        }

        setIsLoading(true);
        try {
            await api.post("/dashboard/vps-downloader/download", {
                anime_name: animeName,
                links: links
            });
            setStatus({
                anime_name: animeName,
                items: links.map((l, i) => ({ index: i + 1, link: l, status: "pending", progress: 0, eta: "" })),
                is_uploading: false,
                upload_status: ""
            });
            toast.success(isAr ? "بدأ التحميل بنجاح" : "Download started successfully");
        } catch (err) {
            toast.error(isAr ? "فشل بدء التحميل" : "Failed to start download");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscover = async () => {
        if (!scraperUrl.trim()) {
            toast.error(isAr ? "يرجى إدخال الرابط" : "Please enter URL");
            return;
        }
        setIsDiscovering(true);
        setDiscoveredAnimes([]);
        setScrapedData(null);
        try {
            // Reusing the images scraper which discovers items
            const res = await api.post("/scraper/images", { url: scraperUrl, max_images: 50 });
            if (res.data.success) {
                setDiscoveredAnimes(res.data.data || []);
                toast.success(isAr ? `تم اكتشاف ${res.data.data?.length || 0} عمل` : `Discovered ${res.data.data?.length || 0} items`);
            } else {
                toast.error(isAr ? "فشل الاكتشاف" : "Discovery failed");
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || (isAr ? "حدث خطأ" : "Error"));
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleDeepScrape = async (targetUrl: string) => {
        setIsScraping(true);
        setScrapedData(null);
        try {
            const res = await api.post("/dashboard/vps-downloader/deep-scrape", { url: targetUrl });
            if (res.data.success) {
                setScrapedData(res.data);
                toast.success(isAr ? "تم جلب الروابط بنجاح" : "Links scraped successfully");
            } else {
                toast.error(res.data.error || (isAr ? "فشل جلب الروابط" : "Failed to scrape links"));
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.error || (isAr ? "حدث خطأ أثناء السحب" : "Error during scraping"));
        } finally {
            setIsScraping(false);
        }
    };

    const handlePopulate = () => {
        if (!scrapedData) return;
        setAnimeName(scrapedData.title);
        setLinksText(scrapedData.links.join("\n"));
        toast.info(isAr ? "تم ملء البيانات في النموذج" : "Data populated in the form");
    };

    const handleStartUpload = async () => {
        if (!status) return;
        setIsUploading(true);
        try {
            await api.post("/dashboard/vps-downloader/upload", {
                anime_name: status.anime_name
            });
            setStatus(prev => prev ? { ...prev, is_uploading: true, upload_status: "uploading" } : prev);
            toast.success(isAr ? "بدأ الرفع إلى السحابة" : "Cloud upload started");
        } catch (err: any) {
            toast.error(err?.response?.data?.error || (isAr ? "فشل بدء الرفع" : "Failed to start upload"));
            setIsUploading(false);
        }
    };

    const handleDeleteLink = async (index: number) => {
        if (!status) return;
        try {
            await api.delete(`/dashboard/vps-downloader/link?anime_name=${encodeURIComponent(status.anime_name)}&index=${index}`);
            toast.success(isAr ? "تم حذف الرابط بنجاح" : "Link deleted successfully");
            // The polling interval will automatically fetch the updated status and update the UI
        } catch (err: any) {
            toast.error(err?.response?.data?.error || (isAr ? "فشل حذف الرابط" : "Failed to delete link"));
        }
    };

    const allFinished = status?.items.every(i => i.status === "completed" || i.status === "deleted") ?? true;

    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-primary">
                        {isAr ? "تحميل ورفع علي VPS" : "VPS Downloader & Uploader"}
                    </h1>
                    <p className="text-muted-foreground">
                        {isAr ? "تحميل الحلقات مباشرة إلى السيرفر ثم نقلها للسحابة" : "Download episodes directly to VPS then transfer to Cloud"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 bg-primary/5 border-primary/20 text-primary">
                        <Server className="w-3.5 h-3.5 mr-1.5 inline" />
                        VPS Online
                    </Badge>
                </div>
            </header>

            {/* Auto-Scraper Section */}
            <Card className="border-primary/20 bg-primary/5 backdrop-blur-md shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 opacity-70" />
                <CardHeader className="pb-4">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                        {isAr ? "ساحب الروابط المباشر (EgyDead)" : "EgyDead Deep Scraper"}
                    </CardTitle>
                    <CardDescription>
                        {isAr ? "أدخل رابط الأنمي أو الحلقة لسحب روابط التحميل المباشرة (.mp4) تلقائياً" : "Enter series or episode URL to automatically extract direct .mp4 download links"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Input 
                                placeholder="https://tv8.egydead.live/..." 
                                value={scraperUrl}
                                onChange={(e) => setScraperUrl(e.target.value)}
                                className="h-12 bg-background/50 border-primary/20 pl-10 font-mono text-sm"
                                dir="ltr"
                            />
                            <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground opacity-50" />
                        </div>
                        <Button 
                            onClick={handleDiscover}
                            disabled={isDiscovering}
                            className="h-12 px-8 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 font-bold shadow-lg shadow-red-900/20"
                        >
                            {isDiscovering ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
                            {isAr ? "اكتشاف المحتوى" : "Discover Content"}
                        </Button>
                    </div>

                    {/* Discovered Items Grid */}
                    {discoveredAnimes.length > 0 && !scrapedData && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {discoveredAnimes.map((anime, idx) => (
                                <div 
                                    key={idx}
                                    className="group relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-background/20 hover:border-primary/50 transition-all cursor-pointer shadow-lg"
                                    onClick={() => handleDeepScrape(anime.detailUrl)}
                                >
                                    <img 
                                        src={anime.url} 
                                        alt={anime.title} 
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                                    <div className="absolute bottom-0 left-0 right-0 p-2 text-center translate-y-2 group-hover:translate-y-0 transition-transform">
                                        <p className="text-[10px] font-bold line-clamp-1">{anime.title}</p>
                                        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full">
                                                {isAr ? "سحب الروابط" : "Fetch Links"}
                                            </span>
                                        </div>
                                    </div>
                                    {isScraping && (
                                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {scrapedData && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row gap-6 p-4 bg-background/40 rounded-2xl border border-primary/10"
                        >
                            <div className="w-32 aspect-[2/3] rounded-xl overflow-hidden shadow-xl border border-white/10 shrink-0">
                                {scrapedData.poster ? (
                                    <img src={scrapedData.poster} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                        <ImageIcon className="w-8 h-8 opacity-20" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-1">{scrapedData.title}</h3>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        {isAr ? `تم العثور على ${scrapedData.links.length} رابط مباشر` : `Found ${scrapedData.links.length} direct links`}
                                    </p>
                                </div>
                                <Button 
                                    onClick={handlePopulate}
                                    variant="outline"
                                    className="w-fit mt-4 border-primary/30 hover:bg-primary/10 font-bold"
                                >
                                    <Sparkles className="w-4 h-4 mr-2 text-yellow-500" />
                                    {isAr ? "تعبئة البيانات في الأسفل" : "Populate Form Below"}
                                </Button>
                            </div>
                            <button 
                                onClick={() => setScrapedData(null)}
                                className="absolute top-4 right-4 text-muted-foreground hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Input Form */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="border-border/40 bg-card/50 backdrop-blur-sm shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" />
                                {isAr ? "إضافة مهمة جديدة" : "New Task"}
                            </CardTitle>
                            <CardDescription>
                                {isAr ? "أدخل تفاصيل الأنمي والروابط" : "Enter anime details and links"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{isAr ? "اسم الأنمي" : "Anime Name"}</label>
                                <Input 
                                    placeholder={isAr ? "مثال: One Piece" : "e.g. One Piece"} 
                                    value={animeName}
                                    onChange={(e) => setAnimeName(e.target.value)}
                                    className="bg-background/50 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{isAr ? "روابط التحميل (واحد في كل سطر)" : "Download Links (one per line)"}</label>
                                <Textarea 
                                    placeholder="https://..." 
                                    rows={10}
                                    value={linksText}
                                    onChange={(e) => setLinksText(e.target.value)}
                                    className="bg-background/50 border-border/50 font-mono text-sm"
                                />
                            </div>
                            <Button 
                                className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20"
                                onClick={handleStartDownload}
                                disabled={isLoading || (!!status && !allFinished)}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
                                {isAr ? "بدأ التحميل" : "Start Download"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Tracking */}
                <div className="lg:col-span-7 space-y-6">
                    <AnimatePresence mode="wait">
                        {!status ? (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="h-full min-h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-border/50 rounded-xl bg-muted/20 text-muted-foreground text-center p-8"
                            >
                                <Download className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-xl font-semibold mb-2">{isAr ? "لا توجد مهام نشطة" : "No Active Tasks"}</h3>
                                <p className="max-w-xs">{isAr ? "ابدأ بإضافة روابط التحميل لتظهر حالة التقدم هنا" : "Start by adding download links to see progress here"}</p>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <Card className="border-primary/20 bg-primary/5 shadow-inner">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                                    {status.items.filter(i => i.status === "completed").length} / {status.items.length}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg leading-tight">{status.anime_name}</h3>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{isAr ? "جاري المعالجة" : "IN PROGRESS"}</p>
                                                </div>
                                            </div>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => setStatus(null)}
                                                className="text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                {isAr ? "إلغاء" : "Clear"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {status.items.map((item, idx) => {
                                        if (item.status === "deleted") return null;
                                        
                                        return (
                                        <motion.div 
                                            key={idx}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group relative"
                                        >
                                            <Card className={`border-l-4 transition-all duration-300 ${
                                                item.status === "completed" ? "border-l-green-500 bg-green-500/5" : 
                                                item.status === "downloading" ? "border-l-primary bg-primary/5" : 
                                                item.status === "error" ? "border-l-destructive bg-destructive/5" : "border-l-muted bg-card/50"
                                            }`}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                                                {String(item.index).padStart(2, '0')}
                                                            </span>
                                                            <span className="text-sm font-medium truncate max-w-[250px] opacity-70">
                                                                {item.link}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {item.status === "downloading" && (
                                                                <div className="flex items-center text-xs text-primary font-bold">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    ETA: {item.eta || "--"}
                                                                </div>
                                                            )}
                                                            {item.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                                                            {item.status === "error" && <AlertCircle className="w-5 h-5 text-destructive" />}
                                                            {item.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-muted" />}
                                                            
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-2"
                                                                onClick={() => handleDeleteLink(item.index)}
                                                                title={isAr ? "حذف الرابط" : "Delete Link"}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                                            <span>{item.status}</span>
                                                            <span>{Math.round(item.progress)}%</span>
                                                        </div>
                                                        <Progress value={item.progress} className="h-1.5" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Upload Button Section */}
                                <div className="pt-4">
                                    <Button 
                                        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20 disabled:opacity-50 transition-all active:scale-95"
                                        disabled={!allFinished || status.upload_status === "uploading" || isUploading}
                                        onClick={handleStartUpload}
                                    >
                                        {status.upload_status === "uploading" || isUploading ? (
                                            <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                                        ) : status.upload_status === "completed" ? (
                                            <CheckCircle className="w-6 h-6 mr-2" />
                                        ) : (
                                            <Cloud className="w-6 h-6 mr-2" />
                                        )}
                                        
                                        {status.upload_status === "uploading" ? (isAr ? "جاري الرفع لـ pCloud..." : "Uploading to pCloud...") :
                                         status.upload_status === "completed" ? (isAr ? "تم الرفع بنجاح" : "Successfully Uploaded") :
                                         status.upload_status === "error" ? (isAr ? "فشل الرفع - إعادة المحاولة" : "Upload Failed - Retry") :
                                         (isAr ? "رفع الملف الكامل إلى pCloud" : "Upload Entire Folder to pCloud")}
                                    </Button>
                                    
                                    {status.upload_status === "uploading" && (
                                        <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">
                                            {isAr ? "هذا قد يستغرق بعض الوقت حسب حجم الملفات..." : "This may take a while depending on total size..."}
                                        </p>
                                    ) || status.upload_status === "completed" && (
                                        <p className="text-center text-xs text-green-500 mt-2 flex items-center justify-center gap-1">
                                            <ExternalLink className="w-3 h-3" />
                                            {isAr ? "الملفات متاحة الآن في pCloud: Public Folder/Anime" : "Files are now available in pCloud: Public Folder/Anime"}
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
