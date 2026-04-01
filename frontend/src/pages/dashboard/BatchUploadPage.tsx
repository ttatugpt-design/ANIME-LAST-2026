import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { 
    Upload, 
    Link as LinkIcon, 
    Trash, 
    CheckCircle2, 
    PlayCircle,
    Search,
    FileVideo,
    RefreshCw,
    Settings,
    Plus,
    Server,
    ArrowLeft,
    XCircle,
    Pause,
    Play
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LocalFile {
    id: string;
    file: File;
    previewUrl: string;
    linkedEpisodeId: number | null;
    status: 'idle' | 'waiting' | 'uploading' | 'completed' | 'error';
    progress: number;
    speed?: number;       // bytes per second
    eta?: number;         // seconds remaining
    loaded?: number;      // bytes uploaded so far
    total?: number;       // total bytes
    error?: string;
    attempt?: number;     // current retry attempt
    isPaused?: boolean;
    uploadId?: string;
    chunksSent?: number;
    totalChunks?: number;
}

export default function BatchUploadPage() {
    const { lang, id: animeId } = useParams<{ lang: string; id: string }>();
    const isAr = lang === 'ar';
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
    const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<number | ''>('');
    const [selectedGlobalServerId, setSelectedGlobalServerId] = useState<number | ''>('');
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);

    const [fileSearch, setFileSearch] = useState('');
    const [fileFilter, setFileFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
    const [episodeSearch, setEpisodeSearch] = useState('');

    // Modals
    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [modalEpisode, setModalEpisode] = useState<any>(null);
    const [newServerForm, setNewServerForm] = useState({ name: '', url: '', language: 'ar', type: 'embed' });

    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    // Context menu
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ep: any } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // Fetch Anime
    const { data: anime, isLoading: isAnimeLoading } = useQuery({
        queryKey: ["anime", animeId],
        queryFn: async () => (await api.get(`/animes/${animeId}`)).data,
    });

    // Fetch Episodes (all - no published filter)
    const { data: episodesResponse, isLoading: isEpisodesLoading } = useQuery({
        queryKey: ["episodes-batch", animeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: animeId } })).data,
        enabled: !!animeId,
    });
    const episodes: any[] = Array.isArray(episodesResponse) ? episodesResponse : (episodesResponse?.data || []);

    // Fetch Embed Accounts
    const { data: accountsRes } = useQuery({
        queryKey: ["embed-accounts"],
        queryFn: async () => (await api.get(`/embed-accounts`)).data,
    });
    const accounts: any[] = Array.isArray(accountsRes) ? accountsRes : [];

    // Fetch System Servers
    const { data: serversRes } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => (await api.get(`/servers`)).data,
    });
    const systemServers: any[] = Array.isArray(serversRes) ? serversRes : (serversRes?.data || []);

    // Update Episode Mutation
    const updateEpisodeMutation = useMutation({
        mutationFn: async (ep: any) => (await api.put(`/episodes/${ep.id}`, ep)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["episodes-batch", animeId] });
            toast.success(lang === 'ar' ? 'تم الحفظ' : 'Saved');
        },
        onError: (err: any) => toast.error(err.message),
    });

    // File handling
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const newFiles: LocalFile[] = files.map(file => {
            const id = Math.random().toString(36).substr(2, 9);
            const match = file.name.match(/(\d+)/);
            const epNum = match ? parseInt(match[0]) : null;
            const matched = episodes.find((ep: any) => ep.episode_number === epNum);
            return { id, file, previewUrl: URL.createObjectURL(file), linkedEpisodeId: matched?.id || null, status: 'idle', progress: 0 };
        });

        setLocalFiles(prev => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";

        const autoCount = newFiles.filter(f => f.linkedEpisodeId).length;
        if (autoCount > 0) toast.success(lang === 'ar' ? `تم ربط ${autoCount} ملفات تلقائياً` : `Auto-linked ${autoCount} files`);
    };

    const linkFileToEpisode = (fileId: string) => {
        if (!selectedEpisodeId) {
            toast.error(lang === 'ar' ? 'اختر حلقة أولاً' : 'Select an episode first');
            return;
        }
        setLocalFiles(prev => prev.map(f => f.id === fileId ? { ...f, linkedEpisodeId: selectedEpisodeId } : f));
    };

    const unlinkFile = (fileId: string) => {
        setLocalFiles(prev => prev.map(f => f.id === fileId ? { ...f, linkedEpisodeId: null } : f));
    };

    const removeFile = (fileId: string) => {
        setLocalFiles(prev => {
            const f = prev.find(f => f.id === fileId);
            if (f) URL.revokeObjectURL(f.previewUrl);
            return prev.filter(f => f.id !== fileId);
        });
    };

    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

    const startBatchUpload = async () => {
        if (!selectedAccountId) { toast.error(lang === 'ar' ? 'اختر حساب الرفع' : 'Select upload account'); return; }
        if (!selectedGlobalServerId) { toast.error(lang === 'ar' ? 'اختر اسم السيرفر' : 'Select server name'); return; }
        
        const filesToUpload = localFiles.filter(f => f.linkedEpisodeId && f.status !== 'completed');
        if (!filesToUpload.length) { toast.error(lang === 'ar' ? 'لا يوجد ملفات مربوطة للرفع' : 'No linked files ready for upload'); return; }

        setIsBatchProcessing(true);
        
        // Initial state: mark all as waiting
        setLocalFiles(prev => prev.map(f => (f.linkedEpisodeId && f.status !== 'completed') ? { ...f, status: 'waiting', progress: 0, attempt: 1, isPaused: false } : f));

        const CONCURRENCY_LIMIT = 2;
        const queue = [...filesToUpload];
        const activeUploads = new Set<string>();

        const processQueue = async (): Promise<void> => {
            if (queue.length === 0 && activeUploads.size === 0) return;
            while (queue.length > 0 && activeUploads.size < CONCURRENCY_LIMIT) {
                const lf = queue.shift()!;
                activeUploads.add(lf.id);
                uploadResumable(lf);
            }
        };

        const uploadResumable = async (lf: LocalFile) => {
            const startTime = Date.now();
            const speedWindow: { time: number; loaded: number }[] = [{ time: startTime, loaded: 0 }];
            let lastUpdate = startTime;

            // Refetch current state to handle reactive changes (like pause)
            const getLatestFile = () => {
                let f: LocalFile | undefined;
                setLocalFiles(prev => {
                    f = prev.find(pf => pf.id === lf.id);
                    return prev;
                });
                return f;
            };

            try {
                // 1. INIT or RESUME
                let uploadId = lf.uploadId;
                let chunksDone: number[] = [];

                if (!uploadId) {
                    const initRes = await api.post(`/upload/init?fileName=${encodeURIComponent(lf.file.name)}&totalSize=${lf.file.size}`);
                    uploadId = initRes.data.uploadId;
                    setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, uploadId, status: 'uploading' } : f));
                } else {
                    const statusRes = await api.get(`/upload/status/${uploadId}`);
                    chunksDone = statusRes.data.uploadedChunks || [];
                    setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, status: 'uploading' } : f));
                }

                const totalChunks = Math.ceil(lf.file.size / CHUNK_SIZE);
                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, totalChunks } : f));

                // 2. Upload Chunks
                for (let i = 0; i < totalChunks; i++) {
                    // Check if paused
                    const latest = getLatestFile();
                    if (latest?.isPaused) {
                        setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, status: 'waiting' } : f));
                        activeUploads.delete(lf.id);
                        processQueue();
                        return; // Stop this worker
                    }

                    if (chunksDone.includes(i)) continue;

                    const start = i * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, lf.file.size);
                    const chunk = lf.file.slice(start, end);

                    const chunkFd = new FormData();
                    chunkFd.append('uploadId', uploadId!);
                    chunkFd.append('chunkIndex', i.toString());
                    chunkFd.append('chunk', chunk);

                    await api.post('/upload/chunk', chunkFd, {
                        onUploadProgress: (pe) => {
                            const now = Date.now();
                            const chunkProgress = (i / totalChunks) * 100;
                            const currentChunkProgress = (pe.loaded / pe.total!) * (100 / totalChunks);
                            const totalPct = Math.min(99, Number((chunkProgress + currentChunkProgress).toFixed(1)));
                            
                            // Real-time speed calculation relative to the whole file
                            const totalLoadedSoFar = (i * CHUNK_SIZE) + pe.loaded;
                            speedWindow.push({ time: now, loaded: totalLoadedSoFar });
                            while (speedWindow.length > 1 && speedWindow[0].time < now - 3000) speedWindow.shift();

                            if (now - lastUpdate >= 500 || totalPct >= 99) {
                                let currentSpeed = 0;
                                if (speedWindow.length > 1) {
                                    const oldest = speedWindow[0];
                                    const newest = speedWindow[speedWindow.length - 1];
                                    const timeDiff = Math.max((newest.time - oldest.time) / 1000, 0.001);
                                    currentSpeed = (newest.loaded - oldest.loaded) / timeDiff;
                                }
                                
                                const remainingBytes = lf.file.size - totalLoadedSoFar;
                                const currentEta = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

                                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { 
                                    ...f, 
                                    progress: totalPct, 
                                    chunksSent: i,
                                    speed: currentSpeed,
                                    eta: currentEta,
                                    loaded: totalLoadedSoFar,
                                    total: lf.file.size
                                } : f));
                                lastUpdate = now;
                            }
                        }
                    });
                    
                    chunksDone.push(i);
                }

                // 3. COMPLETE - Merge all chunks on the server
                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, progress: 99, error: '', chunksSent: totalChunks } : f));
                const compFd = new FormData();
                compFd.append('uploadId', uploadId!);
                compFd.append('fileName', lf.file.name);
                const completeRes = await api.post('/upload/complete', compFd);
                const finalLocalPath = completeRes.data.filePath;

                // 4. PUSH TO DOODSTREAM in background on server
                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, progress: 99.5, error: isAr ? '⬆ جاري الإرسال لـ Doodstream...' : '⬆ Sending to Doodstream...' } : f));
                const pushFd = new FormData();
                pushFd.append('filePath', finalLocalPath);
                // Fire and get 202 Accepted immediately
                await api.post(`/doodstream/push/${lf.linkedEpisodeId}?account_id=${selectedAccountId}&server_id=${selectedGlobalServerId}`, pushFd);

                // 5. POLL until the embed link appears on the episode (max 10 min)
                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, progress: 99.8, error: isAr ? '🔗 انتظار ظهور الرابط...' : '🔗 Waiting for link...' } : f));
                
                const serversBefore = (await api.get(`/episodes/${lf.linkedEpisodeId}`)).data?.servers?.length ?? 0;
                let embedLink = '';
                const POLL_INTERVAL = 8000;    // 8 seconds between checks
                const POLL_TIMEOUT = 10 * 60 * 1000; // 10 minutes max
                const pollStart = Date.now();

                while (!embedLink && Date.now() - pollStart < POLL_TIMEOUT) {
                    await new Promise(r => setTimeout(r, POLL_INTERVAL));
                    try {
                        const epRes = await api.get(`/episodes/${lf.linkedEpisodeId}`);
                        const ep = epRes.data;
                        if (ep?.servers && ep.servers.length > serversBefore) {
                            // New server entry found — this is our Doodstream link
                            const newServer = ep.servers[ep.servers.length - 1];
                            embedLink = newServer?.url || '';
                        }
                    } catch { /* network hiccup, retry on next tick */ }
                }

                if (!embedLink) {
                    // Timeout — still mark as done but warn user
                    setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, status: 'completed', progress: 100, error: isAr ? '⚠ انتهى الرفع لكن لم يتأكد الرابط بعد' : '⚠ Upload done, link pending' } : f));
                } else {
                    // SUCCESS - embed link confirmed!
                    setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, status: 'completed', progress: 100, error: '' } : f));
                    toast.success(isAr ? `✅ تم الرفع والربط بنجاح` : `✅ Uploaded & Linked!`);
                    
                    // Auto-publish the episode
                    if (lf.linkedEpisodeId) {
                        try {
                            const freshEp = (await api.get(`/episodes/${lf.linkedEpisodeId}`)).data;
                            if (freshEp && !freshEp.is_published) {
                                await api.put(`/episodes/${lf.linkedEpisodeId}`, { ...freshEp, is_published: true });
                            }
                        } catch {}
                    }
                }

                activeUploads.delete(lf.id);
                checkFinished();
                processQueue();

            } catch (err: any) {
                setLocalFiles(prev => prev.map(f => f.id === lf.id ? { ...f, status: 'error', error: err.message } : f));
                activeUploads.delete(lf.id);
                checkFinished();
                processQueue();
            }
        };

        const checkFinished = () => {
            setLocalFiles(current => {
                const finished = current.every(f => !f.linkedEpisodeId || f.status === 'completed' || f.status === 'error');
                if (finished) {
                    setIsBatchProcessing(false);
                    finishPublication();
                }
                return current;
            });
        };

        const finishPublication = async () => {
            if (anime && !anime.is_published) {
                try {
                    await api.put(`/animes/${anime.id}?cascade=false`, { ...anime, is_published: true });
                    queryClient.invalidateQueries({ queryKey: ["anime", animeId] });
                } catch {}
            }
            toast.success(isAr ? 'انتهت جميع عمليات الرفع' : 'All uploads completed');
            queryClient.invalidateQueries({ queryKey: ["episodes-batch", animeId] });
        };

        processQueue();
    };

    const togglePause = (fileId: string) => {
        setLocalFiles(prev => prev.map(f => {
            if (f.id === fileId) {
                const newPaused = !f.isPaused;
                if (!newPaused && f.status === 'waiting') {
                    // If resuming, it will be picked up by processQueue or manually triggered
                    // For simplified logic, if isBatchProcessing is true, processQueue will eventually find it
                }
                return { ...f, isPaused: newPaused };
            }
            return f;
        }));
        
        // Re-trigger queue processing in case something was paused and now resumed
        if (isBatchProcessing) {
             // In a real implementation you might need a way to poke the worker loop
        }
    };

    // Server Modal
    const openServerModal = (ep: any) => {
        setModalEpisode({ ...ep, servers: ep.servers || [] });
        setIsServerModalOpen(true);
        setContextMenu(null);
    };

    const addServer = () => {
        if (!newServerForm.url || !newServerForm.name) { toast.error(lang === 'ar' ? 'أكمل الحقول' : 'Fill all fields'); return; }
        const updated = { ...modalEpisode, servers: [...modalEpisode.servers, { episode_id: modalEpisode.id, ...newServerForm }] };
        setModalEpisode(updated);
        updateEpisodeMutation.mutate(updated);
        setNewServerForm({ name: '', url: '', language: 'ar', type: 'embed' });
    };

    const deleteServer = (idx: number) => {
        const updated = { ...modalEpisode, servers: modalEpisode.servers.filter((_: any, i: number) => i !== idx) };
        setModalEpisode(updated);
        updateEpisodeMutation.mutate(updated);
    };

    // Derived
    const filteredFiles = localFiles.filter(f => {
        if (fileFilter === 'linked' && !f.linkedEpisodeId) return false;
        if (fileFilter === 'unlinked' && f.linkedEpisodeId) return false;
        if (fileSearch && !f.file.name.toLowerCase().includes(fileSearch.toLowerCase())) return false;
        return true;
    });

    const filteredEpisodes = episodes.filter(ep => {
        const q = episodeSearch.toLowerCase();
        return ep.title?.toLowerCase().includes(q) || ep.episode_number?.toString().includes(q);
    });

    if (isAnimeLoading || isEpisodesLoading) return <PageLoader />;

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60 px-4 md:px-6 py-3">
                <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    {/* Title */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(`/${lang}/dashboard/batch-upload`)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        {/* Anime Cover */}
                        {anime?.cover_image && (
                            <div className="w-10 h-14 rounded-md overflow-hidden shrink-0 shadow-md border border-border/50">
                                <img src={anime.cover_image} alt={anime.title} className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-base md:text-xl font-bold leading-tight">
                                {lang === 'ar' ? 'الرفع الدفعي:' : 'Batch Upload:'}{' '}
                                <span className="text-primary">{anime?.title}</span>
                            </h1>
                            <p className="text-[11px] text-muted-foreground hidden sm:block">
                                {lang === 'ar' ? 'اختر حساب الرفع وسيرفر المشاهدة ثم ابدأ' : 'Select upload account & server, then start'}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            className="h-9 flex-1 sm:flex-none sm:w-44 rounded-md border border-input bg-background px-3 text-sm outline-none"
                            value={selectedAccountId}
                            onChange={e => setSelectedAccountId(e.target.value ? Number(e.target.value) : '')}
                            disabled={isBatchProcessing}
                        >
                            <option value="">{lang === 'ar' ? 'حساب الرفع...' : 'Upload account...'}</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>

                        <select
                            className="h-9 flex-1 sm:flex-none sm:w-44 rounded-md border border-input bg-background px-3 text-sm outline-none"
                            value={selectedGlobalServerId}
                            onChange={e => setSelectedGlobalServerId(e.target.value ? Number(e.target.value) : '')}
                            disabled={isBatchProcessing}
                        >
                            <option value="">{lang === 'ar' ? 'اسم السيرفر...' : 'Server name...'}</option>
                            {systemServers.map(s => <option key={s.id} value={s.id}>{s.name_ar || s.name_en}</option>)}
                        </select>

                        <Button className="flex-1 sm:flex-none h-9" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isBatchProcessing}>
                            <Upload className="h-4 w-4 mr-1.5" />
                            {lang === 'ar' ? 'إضافة ملفات' : 'Add Files'}
                        </Button>
                        <Button
                            className="flex-1 sm:flex-none h-9 bg-primary hover:bg-primary/90"
                            onClick={startBatchUpload}
                            disabled={isBatchProcessing || !localFiles.some(f => f.linkedEpisodeId && f.status !== 'completed')}
                        >
                            {isBatchProcessing ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
                            {lang === 'ar' ? 'ابدأ الرفع' : 'Start Upload'}
                        </Button>
                        <input ref={fileInputRef} type="file" multiple accept="video/*" className="hidden" onChange={handleFileSelect} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* === LEFT: FILES === */}
                    <div className="flex-1 w-full min-w-0">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="border-b py-3 px-4">
                                <div className="flex items-center justify-between mb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <FileVideo className="h-4 w-4 text-primary" />
                                        {lang === 'ar' ? 'الملفات المختارة' : 'LOCAL FILES'}
                                    </CardTitle>
                                    <Badge variant="outline">{filteredFiles.length}</Badge>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input className="pl-8 h-8 text-sm" placeholder={lang === 'ar' ? 'بحث...' : 'Search...'} value={fileSearch} onChange={e => setFileSearch(e.target.value)} />
                                    </div>
                                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none" value={fileFilter} onChange={e => setFileFilter(e.target.value as any)}>
                                        <option value="all">{lang === 'ar' ? 'الكل' : 'All'}</option>
                                        <option value="linked">{lang === 'ar' ? 'مربوط' : 'Linked'}</option>
                                        <option value="unlinked">{lang === 'ar' ? 'غير مربوط' : 'Unlinked'}</option>
                                    </select>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                {filteredFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground opacity-40">
                                        <Upload className="h-10 w-10 mb-3" />
                                        <p className="text-sm">{lang === 'ar' ? 'لا توجد ملفات' : 'No files yet'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredFiles.map(file => {
                                            const linkedEp = episodes.find(ep => ep.id === file.linkedEpisodeId);
                                            return (
                                                <div key={file.id} className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                                    file.linkedEpisodeId ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                                                    file.status === 'uploading' && "ring-2 ring-primary",
                                                    file.status === 'waiting' && "border-amber-500/40 bg-amber-500/5 animate-pulse",
                                                    file.status === 'completed' && "border-green-500/40 bg-green-500/5",
                                                    file.status === 'error' && "border-destructive/40 bg-destructive/5",
                                                )}>
                                                    {/* Thumbnail */}
                                                    <div
                                                        className="w-20 shrink-0 aspect-video bg-black rounded overflow-hidden relative cursor-pointer group"
                                                        onClick={() => { setSelectedVideo(file.previewUrl); setIsVideoModalOpen(true); }}
                                                    >
                                                        <video src={file.previewUrl} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <PlayCircle className="h-6 w-6 text-white" />
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate" dir="ltr">{file.file.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {file.linkedEpisodeId ? (
                                                                <span className="text-xs text-primary flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    {lang === 'ar' ? 'حلقة' : 'Ep.'} {linkedEp?.episode_number}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">{lang === 'ar' ? 'غير مربوط' : 'Unlinked'}</span>
                                                            )}
                                                            <span className="text-[10px] text-muted-foreground">{(file.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                                            {file.status === 'waiting' && (
                                                                <Badge variant="outline" className="text-[10px] h-4 text-amber-600 border-amber-500/30">
                                                                    {lang === 'ar' ? `محاولة ${file.attempt || 1}` : `Attempt ${file.attempt || 1}`}
                                                                </Badge>
                                                            )}
                                                            {file.status === 'uploading' && (
                                                                <Badge className="text-[10px] h-4 bg-primary/10 text-primary border-primary/20">
                                                                    {lang === 'ar' ? `رفع (محاولة ${file.attempt || 1})` : `Sending (Try ${file.attempt || 1})`}
                                                                </Badge>
                                                            )}
                                                            {file.status === 'completed' && <Badge className="text-[10px] h-4 bg-green-500/15 text-green-600 border-green-500/30">Done</Badge>}
                                                            {file.status === 'error' && <Badge variant="destructive" className="text-[10px] h-4">Failed</Badge>}
                                                        </div>
                                                        {file.status === 'error' && file.error && (
                                                            <p className="text-[10px] text-destructive mt-1 truncate max-w-full">
                                                                {file.error}
                                                            </p>
                                                        )}
                                                        {(file.status === 'uploading' || file.uploadId) && (
                                                            <div className="mt-2 space-y-1.5">
                                                                <div className="h-1.5 w-full bg-border/20 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-primary transition-all duration-300 relative overflow-hidden group/bar" style={{ width: `${file.progress}%` }}>
                                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center mt-1 px-0.5">
                                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                                        {file.status === 'uploading' && (
                                                                            <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                                                                                <div className="flex items-center gap-1 animate-in fade-in duration-300">
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                                                    <span className="text-[10px] font-medium text-primary">
                                                                                        {isAr ? 'يجري الرفع...' : 'Uploading...'}
                                                                                    </span>
                                                                                    {file.totalChunks && (
                                                                                        <span className="text-[9px] text-muted-foreground ml-1">
                                                                                            ({file.chunksSent || 0}/{file.totalChunks} Chunks)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {file.speed && file.speed > 0 && (
                                                                                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                                                                        <span className="text-primary/70 font-semibold">{((file.speed || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                                                                        <span>•</span>
                                                                                        <span>{Math.floor((file.eta || 0) / 60)}m {(file.eta || 0) % 60}s {isAr ? 'متبقي' : 'left'}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {file.status === 'waiting' && file.uploadId && (
                                                                            <span className="text-[10px] font-medium text-amber-600">
                                                                                {file.isPaused ? (isAr ? 'متوقف مؤقتاً' : 'Paused') : (isAr ? 'في الانتظار...' : 'Queued...')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold tabular-nums text-primary">
                                                                        {file.progress.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex flex-col gap-1.5 shrink-0">
                                                        {(file.status === 'uploading' || (file.status === 'waiting' && file.uploadId)) && (
                                                            <Button 
                                                                size="icon" 
                                                                variant="outline" 
                                                                className="h-7 w-7 text-amber-500" 
                                                                onClick={() => togglePause(file.id)}
                                                                title={file.isPaused ? (isAr ? 'استئناف' : 'Resume') : (isAr ? 'إيقاف مؤقت' : 'Pause')}
                                                            >
                                                                {file.isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="secondary" className="h-7 w-7" title={isAr ? 'ربط بالحلقة المحددة' : 'Link to selected episode'} onClick={() => linkFileToEpisode(file.id)} disabled={isBatchProcessing || file.status === 'completed'}>
                                                            <LinkIcon className="h-3.5 w-3.5" />
                                                        </Button>
                                                        {file.linkedEpisodeId && (
                                                            <Button size="icon" variant="outline" className="h-7 w-7" title={lang === 'ar' ? 'إلغاء الربط' : 'Unlink'} onClick={() => unlinkFile(file.id)} disabled={isBatchProcessing || file.status === 'completed'}>
                                                                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                                            </Button>
                                                        )}
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeFile(file.id)} disabled={isBatchProcessing}>
                                                            <Trash className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* === RIGHT: EPISODES (sticky on desktop) === */}
                    <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-20">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="border-b py-3 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 mb-3">
                                    <PlayCircle className="h-4 w-4 text-primary" />
                                    {lang === 'ar' ? 'حلقات الأنمي' : 'EPISODES'}
                                    <Badge variant="secondary" className="ml-auto">{filteredEpisodes.length}</Badge>
                                </CardTitle>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input className="pl-8 h-8 text-sm" placeholder={lang === 'ar' ? 'بحث بالرقم أو الاسم...' : 'Search...'} value={episodeSearch} onChange={e => setEpisodeSearch(e.target.value)} />
                                </div>
                                {selectedEpisodeId && (
                                    <p className="text-[11px] text-primary mt-2 text-center">
                                        ✓ {lang === 'ar' ? `محدد: حلقة ${episodes.find(e => e.id === selectedEpisodeId)?.episode_number}` : `Selected: Ep.${episodes.find(e => e.id === selectedEpisodeId)?.episode_number}`}
                                    </p>
                                )}
                            </CardHeader>
                            <CardContent className="p-3">
                                <div className="space-y-1.5">
                                    {filteredEpisodes.map(ep => {
                                        const isLinked = localFiles.some(f => f.linkedEpisodeId === ep.id);
                                        const isDone = localFiles.some(f => f.linkedEpisodeId === ep.id && f.status === 'completed');
                                        const isSelected = selectedEpisodeId === ep.id;
                                        return (
                                            <div
                                                key={ep.id}
                                                onClick={() => setSelectedEpisodeId(ep.id)}
                                                onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, ep }); }}
                                                className={cn(
                                                    "flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-all select-none",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground border-primary shadow"
                                                        : isLinked
                                                            ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                                                            : "border-transparent bg-muted/50 hover:bg-muted"
                                                )}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={cn(
                                                        "w-7 h-7 rounded text-xs font-bold flex items-center justify-center shrink-0",
                                                        isSelected ? "bg-white/20" : "bg-background text-muted-foreground"
                                                    )}>
                                                        {ep.episode_number}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold truncate leading-tight">{ep.title}</p>
                                                        <p className={cn("text-[10px]", isSelected ? "opacity-70" : "text-muted-foreground")}>
                                                            {ep.servers?.length || 0} {lang === 'ar' ? 'سيرفر' : 'servers'}
                                                            {isDone && <span className="text-green-500 ml-1">• Done ✓</span>}
                                                            {isLinked && !isDone && <span className="text-primary ml-1">• Ready</span>}
                                                            {!ep.is_published && !isDone && <span className="text-amber-500 ml-1">• Draft</span>}
                                                            {ep.is_published && !isDone && !isLinked && <span className="text-green-500/70 ml-1">• Published</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={cn("h-6 w-6 shrink-0", isSelected ? "hover:bg-white/20" : "")}
                                                    onClick={e => { e.stopPropagation(); openServerModal(ep); }}
                                                >
                                                    <Settings className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed z-[200] bg-popover border border-border shadow-xl rounded-lg py-1 w-52 animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium border-b mb-1">
                        {lang === 'ar' ? `حلقة ${contextMenu.ep.episode_number}` : `Episode ${contextMenu.ep.episode_number}`}
                    </div>
                    <button
                        className="w-full text-right rtl:text-right ltr:text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        onClick={() => openServerModal(contextMenu.ep)}
                    >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        {lang === 'ar' ? 'تعديل وإضافة سيرفر' : 'Edit / Add Server'}
                    </button>
                    <button
                        className="w-full text-right rtl:text-right ltr:text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        onClick={() => { setSelectedEpisodeId(contextMenu.ep.id); setContextMenu(null); }}
                    >
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        {lang === 'ar' ? 'تحديد للربط' : 'Select for linking'}
                    </button>
                </div>
            )}

            {/* Server Manager Modal */}
            <Dialog open={isServerModalOpen} onOpenChange={setIsServerModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5 text-primary" />
                            {lang === 'ar' ? `سيرفرات حلقة ${modalEpisode?.episode_number}` : `Episode ${modalEpisode?.episode_number} — Servers`}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        {/* Existing Servers */}
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {(!modalEpisode?.servers || modalEpisode.servers.length === 0) ? (
                                <p className="text-sm text-center text-muted-foreground py-5">{lang === 'ar' ? 'لا يوجد سيرفرات' : 'No servers yet'}</p>
                            ) : modalEpisode.servers.map((sv: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{sv.name || 'Unnamed'}</span>
                                            <Badge variant="outline" className="text-[10px] px-1">{sv.language}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate mt-0.5" dir="ltr">{sv.url}</p>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteServer(i)}>
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-3">{lang === 'ar' ? 'إضافة رابط يدوي' : 'Add Manual Link'}</p>
                            <div className="space-y-2">
                                <div>
                                    <Label className="text-xs mb-1 block">{lang === 'ar' ? 'الرابط' : 'URL'}</Label>
                                    <Input className="h-8 text-xs" dir="ltr" placeholder="https://..." value={newServerForm.url} onChange={e => setNewServerForm({ ...newServerForm, url: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-xs mb-1 block">{lang === 'ar' ? 'اسم السيرفر' : 'Server'}</Label>
                                        <select className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none" value={newServerForm.name} onChange={e => setNewServerForm({ ...newServerForm, name: e.target.value })}>
                                            <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                                            {systemServers.map(s => <option key={s.id} value={s.name_en}>{s.name_ar} ({s.name_en})</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-1 block">{lang === 'ar' ? 'اللغة' : 'Language'}</Label>
                                        <select className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs outline-none" value={newServerForm.language} onChange={e => setNewServerForm({ ...newServerForm, language: e.target.value })}>
                                            <option value="ar">عربي (Sub)</option>
                                            <option value="en">English (Dub)</option>
                                            <option value="raw">Raw</option>
                                        </select>
                                    </div>
                                </div>
                                <Button className="w-full h-8 mt-1" size="sm" onClick={addServer}>
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    {lang === 'ar' ? 'إضافة السيرفر' : 'Add Server'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Video Preview Modal */}
            <Dialog open={isVideoModalOpen} onOpenChange={v => { setIsVideoModalOpen(v); if (!v) setSelectedVideo(null); }}>
                <DialogContent className="max-w-4xl p-0 border-none bg-black overflow-hidden">
                    {selectedVideo && (
                        <video src={selectedVideo} controls autoPlay className="w-full max-h-[90vh]" />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
