import React, { useState, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Loader2, Download, Globe, ImageIcon, 
    Type, Hash, Trash2, CheckCircle2, AlertCircle, Sparkles, X,
    FileDown, ExternalLink, Image as ImageIconLucide, Database, List,
    ChevronRight, Send, Zap, RefreshCw, Key, Layers, Link as LinkIcon, Copy, Globe2, ClipboardList,
    UploadCloud, Plus, CloudCog
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface DoodAccount {
    name: string;
    apiKey: string;
}

interface TapeAccount {
    name: string;
    login: string;
    key: string;
}

interface UploadState {
    [episodeNum: number]: { status: 'idle' | 'uploading' | 'success' | 'error', message?: string };
}

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

const Anime3rbDirectLinksPage: React.FC = () => {
    const [url, setUrl] = useState('');
    const [batchResult, setBatchResult] = useState<BatchScrapeResult | null>(null);
    const [expandedEpisode, setExpandedEpisode] = useState<number | null>(null);

    // Doodstream States
    const [doodAccounts, setDoodAccounts] = useState<DoodAccount[]>([]);
    const [streamHGAccounts, setStreamHGAccounts] = useState<DoodAccount[]>([]);
    const [streamtapeAccounts, setStreamtapeAccounts] = useState<TapeAccount[]>([]);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'dood' | 'streamhg' | 'streamtape'>('dood');
    const [newAccName, setNewAccName] = useState('');
    const [newAccKey, setNewAccKey] = useState('');
    const [newAccLogin, setNewAccLogin] = useState('');
    const [selectedDoodAcc, setSelectedDoodAcc] = useState<string>('');
    const [selectedStreamHGAcc, setSelectedStreamHGAcc] = useState<string>('');
    const [selectedStreamtapeAcc, setSelectedStreamtapeAcc] = useState<string>('');
    const [uploadStates, setUploadStates] = useState<UploadState>({});
    const [isUploadingDood, setIsUploadingDood] = useState(false);
    const [isUploadingSHG, setIsUploadingSHG] = useState(false);
    const [isUploadingTape, setIsUploadingTape] = useState(false);
    
    // Quality selection for uploads
    const [selectedQualityDood, setSelectedQualityDood] = useState<'480p' | '720p' | '1080p'>('720p');
    const [selectedQualitySHG, setSelectedQualitySHG] = useState<'480p' | '720p' | '1080p'>('720p');
    const [selectedQualityTape, setSelectedQualityTape] = useState<'480p' | '720p' | '1080p'>('720p');

    // Load accounts on mount
    React.useEffect(() => {
        const savedDood = localStorage.getItem('doodstreamAccounts');
        if (savedDood) {
            try {
                const parsed = JSON.parse(savedDood);
                setDoodAccounts(parsed);
                if (parsed.length > 0) setSelectedDoodAcc(parsed[0].apiKey);
            } catch (e) {}
        }

        const savedSHG = localStorage.getItem('streamhgAccounts');
        if (savedSHG) {
            try {
                const parsed = JSON.parse(savedSHG);
                setStreamHGAccounts(parsed);
                if (parsed.length > 0) setSelectedStreamHGAcc(parsed[0].apiKey);
            } catch (e) {}
        }

        const savedTape = localStorage.getItem('streamtapeAccounts');
        if (savedTape) {
            try {
                const parsed = JSON.parse(savedTape);
                setStreamtapeAccounts(parsed);
                if (parsed.length > 0) setSelectedStreamtapeAcc(`${parsed[0].login}:${parsed[0].key}`);
            } catch (e) {}
        }
    }, []);

    const saveAccount = () => {
        if (!newAccName || !newAccKey) return toast.error('يرجى تعبئة كافة الحقول');
        if (activeTab === 'streamtape' && !newAccLogin) return toast.error('يرجى إدخال اسم المستخدم (API Login)');
        
        if (activeTab === 'dood') {
            const updated = [...doodAccounts, { name: newAccName, apiKey: newAccKey }];
            setDoodAccounts(updated);
            localStorage.setItem('doodstreamAccounts', JSON.stringify(updated));
            setSelectedDoodAcc(newAccKey);
            toast.success('تم حفظ حساب Doodstream بنجاح');
        } else if (activeTab === 'streamhg') {
            const updated = [...streamHGAccounts, { name: newAccName, apiKey: newAccKey }];
            setStreamHGAccounts(updated);
            localStorage.setItem('streamhgAccounts', JSON.stringify(updated));
            setSelectedStreamHGAcc(newAccKey);
            toast.success('تم حفظ حساب StreamHG بنجاح');
        } else {
            const updated = [...streamtapeAccounts, { name: newAccName, login: newAccLogin, key: newAccKey }];
            setStreamtapeAccounts(updated);
            localStorage.setItem('streamtapeAccounts', JSON.stringify(updated));
            setSelectedStreamtapeAcc(`${newAccLogin}:${newAccKey}`);
            toast.success('تم حفظ حساب Streamtape بنجاح');
        }

        setIsAccountModalOpen(false);
        setNewAccName('');
        setNewAccKey('');
        setNewAccLogin('');
    };

    const deleteAccount = (provider: 'dood' | 'streamhg' | 'streamtape', index: number) => {
        if (provider === 'dood') {
            const updated = doodAccounts.filter((_, i) => i !== index);
            setDoodAccounts(updated);
            localStorage.setItem('doodstreamAccounts', JSON.stringify(updated));
            if (updated.length === 0) setSelectedDoodAcc('');
        } else if (provider === 'streamhg') {
            const updated = streamHGAccounts.filter((_, i) => i !== index);
            setStreamHGAccounts(updated);
            localStorage.setItem('streamhgAccounts', JSON.stringify(updated));
            if (updated.length === 0) setSelectedStreamHGAcc('');
        } else {
            const updated = streamtapeAccounts.filter((_, i) => i !== index);
            setStreamtapeAccounts(updated);
            localStorage.setItem('streamtapeAccounts', JSON.stringify(updated));
            if (updated.length === 0) setSelectedStreamtapeAcc('');
        }
    };

    const handleRemoteUpload = async () => {
        if (!selectedDoodAcc) return toast.error('يرجى إضافة واختيار حساب Doodstream أولاً');
        if (!batchResult) return;
        
        setIsUploadingDood(true);
        const states: UploadState = {};
        setUploadStates({});
        
        try {
            // 1. Create Folder -> GET https://doodapi.co/api/folder/create via backend proxy
            toast.info('جاري إنشاء المجلد على Doodstream...');
            const folderName = `${batchResult.title} ${selectedQualityDood}`;
            const fldRes = await api.post('/scraper/doodstream-proxy', { 
                url: `https://doodapi.co/api/folder/create?key=${selectedDoodAcc}&name=${encodeURIComponent(folderName)}` 
            });
            const fldData = fldRes.data;
            if (fldData.status !== 200) throw new Error('فشل إنشاء المجلد في Doodstream. تأكد من صحة المفتاح.');
            const fld_id = fldData.result.fld_id;
            toast.success('تم إنشاء المجلد، جاري إرسال طلبات الرفع...');

            // 2. Loop through episodes
            for (const ep of batchResult.episodes) {
                const directLink = ep.links.find(l => l.title?.toLowerCase().includes(selectedQualityDood.toLowerCase())) || 
                                 ep.links.find(l => 
                                     l.title === 'Direct link' || 
                                     l.downloadUrl?.toLowerCase().includes('.mp4') ||
                                     l.embedUrl?.toLowerCase().includes('.mp4')
                                 );
                const dlUrl = directLink?.downloadUrl || directLink?.embedUrl;
                
                if (!dlUrl) {
                    states[ep.episodeNum] = { status: 'error', message: 'No MP4 Link' };
                    setUploadStates({...states});
                    continue;
                }
                
                states[ep.episodeNum] = { status: 'uploading' };
                setUploadStates({...states});
                
                const formattedNum = ep.episodeNum.toString().padStart(2, '0'); // e.g. "01"
                
                // 3. Remote Upload API -> GET upload/url via backend proxy
                const uploadAPI = `https://doodapi.co/api/upload/url?key=${selectedDoodAcc}&url=${encodeURIComponent(dlUrl)}&fld_id=${fld_id}&new_title=${formattedNum}`;
                const upRes = await api.post('/scraper/doodstream-proxy', { url: uploadAPI });
                const upData = upRes.data;
                
                if (upData.status === 200) {
                    states[ep.episodeNum] = { status: 'success' };
                } else {
                    states[ep.episodeNum] = { status: 'error', message: upData.msg || 'فشل الرفع' };
                }
                setUploadStates({...states});
                
                // delay to avoid API limits
                await new Promise(r => setTimeout(r, 200));
            }
            toast.success('تم تسليم جميع الحلقات لخوادم Doodstream للرفع عن بُعد!');
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء الاتصال بـ Doodstream');
        } finally {
            setIsUploadingDood(false);
        }
    };

    const handleStreamHGUpload = async () => {
        if (!selectedStreamHGAcc) return toast.error('يرجى إضافة واختيار حساب StreamHG أولاً');
        if (!batchResult) return;
        
        setIsUploadingSHG(true);
        const states: UploadState = {};
        setUploadStates({});
        
        try {
            toast.info('جاري إرسال طلب الرفع المجمع لـ StreamHG...');

            // 1. Prepare files with formatted titles
            const filesToUpload = batchResult.episodes.map(ep => {
                const directLink = ep.links.find(l => l.title?.toLowerCase().includes(selectedQualitySHG.toLowerCase())) || 
                                 ep.links.find(l => 
                                     l.title === 'Direct link' || 
                                     l.downloadUrl?.toLowerCase().includes('.mp4') ||
                                     l.embedUrl?.toLowerCase().includes('.mp4')
                                 );
                const dlUrl = directLink?.downloadUrl || directLink?.embedUrl;
                const formattedNum = ep.episodeNum.toString().padStart(2, '0');

                if (dlUrl) {
                    return { url: dlUrl, title: formattedNum, episodeNum: ep.episodeNum };
                }
                return null;
            }).filter(f => f !== null) as { url: string; title: string; episodeNum: number }[];

            if (filesToUpload.length === 0) {
                throw new Error('لم يتم العثور على روابط صالحة للرفع');
            }

            // 2. Call backend StreamHG RemoteUpload (which handles everything)
            const response = await api.post('/streamhg/remote-upload', {
                api_key: selectedStreamHGAcc,
                folder_name: `${batchResult.title} ${selectedQualitySHG}`,
                files: filesToUpload.map(f => ({ url: f.url, title: f.title }))
            });

            if (response.status === 200) {
                // Update UI state to success for all attempted files
                filesToUpload.forEach(f => {
                    states[f.episodeNum] = { status: 'success' };
                });
                setUploadStates({ ...states });
                toast.success(`تم تسليم ${response.data.files_queued} ملف للخوادم بنجاح!`);
            } else {
                throw new Error(response.data.error || 'فشل الرفع المجمع');
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || e.message || 'حدث خطأ في StreamHG');
        } finally {
            setIsUploadingSHG(false);
        }
    };

    const handleStreamtapeUpload = async () => {
        if (!selectedStreamtapeAcc) return toast.error('يرجى إضافة واختيار حساب Streamtape أولاً');
        if (!batchResult) return;
        
        setIsUploadingTape(true);
        const states: UploadState = {};
        setUploadStates({});
        
        try {
            toast.info('جاري إرسال طلب الرفع المجمع لـ Streamtape...');
            const [login, key] = selectedStreamtapeAcc.split(':');

            // 1. Prepare files with formatted titles
            const filesToUpload = batchResult.episodes.map(ep => {
                const directLink = ep.links.find(l => l.title?.toLowerCase().includes(selectedQualityTape.toLowerCase())) || 
                                 ep.links.find(l => 
                                     l.title === 'Direct link' || 
                                     l.downloadUrl?.toLowerCase().includes('.mp4') ||
                                     l.embedUrl?.toLowerCase().includes('.mp4')
                                 );
                const dlUrl = directLink?.downloadUrl || directLink?.embedUrl;
                const formattedNum = ep.episodeNum.toString().padStart(2, '0');

                if (dlUrl) {
                    return { url: dlUrl, title: formattedNum, episodeNum: ep.episodeNum };
                }
                return null;
            }).filter(f => f !== null) as { url: string; title: string; episodeNum: number }[];

            if (filesToUpload.length === 0) {
                throw new Error('لم يتم العثور على روابط صالحة للرفع');
            }

            // 2. Call backend Streamtape RemoteUpload
            const response = await api.post('/streamtape/remote-upload', {
                login,
                key,
                folder_name: `${batchResult.title} ${selectedQualityTape}`,
                files: filesToUpload.map(f => ({ url: f.url, title: f.title }))
            });

            if (response.status === 200) {
                filesToUpload.forEach(f => {
                    states[f.episodeNum] = { status: 'success' };
                });
                setUploadStates({ ...states });
                toast.success(`تم تسليم ${response.data.files_queued} ملف لـ Streamtape بنجاح!`);
            } else {
                throw new Error(response.data.error || 'فشل الرفع المجمع');
            }
        } catch (e: any) {
            toast.error(e.response?.data?.error || e.message || 'حدث خطأ في Streamtape');
        } finally {
            setIsUploadingTape(false);
        }
    };

    const batchScrapeMutation = useMutation({
        mutationFn: async (targetUrl: string) => {
            const res = await api.post('/scraper/anime3rb-batch', { url: targetUrl });
            return res.data;
        },
        onSuccess: (data) => {
            setBatchResult(data);
            if (data.success) {
                toast.success(`تم جلب ${data.totalEpisodes} حلقة بنجاح!`);
                if (data.episodes?.length > 0) {
                    setExpandedEpisode(data.episodes[0].episodeNum);
                }
            } else {
                toast.error('فشل الجلب من انمي العرب');
            }
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.error || 'حدث خطأ أثناء جلب الحلقات');
        }
    });

    const qualityLinks = useMemo(() => {
        if (!batchResult) return { '480p': '', '720p': '', '1080p': '' };
        
        const getLinksForQuality = (q: string) => {
            return batchResult.episodes
                .map(ep => {
                    const link = ep.links.find(l => l.title?.toLowerCase().includes(q.toLowerCase()));
                    return link?.downloadUrl || link?.embedUrl;
                })
                .filter(Boolean)
                .join('\n');
        };

        return {
            '480p': getLinksForQuality('480p'),
            '720p': getLinksForQuality('720p'),
            '1080p': getLinksForQuality('1080p'),
        };
    }, [batchResult]);

    const handleCopyQuality = (q: '480p' | '720p' | '1080p') => {
        navigator.clipboard.writeText(qualityLinks[q]);
        toast.success(`تم نسخ جميع روابط جودة ${q}`);
    };

    const accent = "from-emerald-500 via-teal-500 to-cyan-500";
    const accentSolid = "bg-emerald-600";
    const accentText = "text-emerald-400";
    const accentShadow = "shadow-emerald-900/30";
    const accentBg = "bg-emerald-600/20";

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white p-4 md:p-8" dir="rtl">
            <div className="max-w-6xl mx-auto mb-10">
                    <div className="flex justify-between items-start w-full">
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`w-14 h-14 bg-gradient-to-br ${accent} rounded-2xl flex items-center justify-center shadow-2xl ${accentShadow} border border-white/10`}>
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className={`text-4xl font-black bg-gradient-to-r ${accent} bg-clip-text text-transparent tracking-tight`}>
                                    روابط العرب المباشرة (Direct Links)
                                </h1>
                                <p className="text-xs text-gray-400 font-medium mt-1">استخراج روابط MP4 المباشرة بجميع الجودات (480p, 720p, 1080p)</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsAccountModalOpen(true)}
                            className="bg-[#252525] border border-white/10 hover:bg-[#303030] px-4 py-2 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 transition-colors"
                        >
                            <CloudCog className="w-4 h-4 text-emerald-500" />
                            حسابات Doodstream
                        </button>
                    </div>

                    {/* Doodstream Account Modal */}
                                <div className="flex gap-4 mb-8 p-1 bg-black/40 rounded-2xl border border-white/5">
                                    <button 
                                        onClick={() => setActiveTab('dood')}
                                        className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", activeTab === 'dood' ? "bg-emerald-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}
                                    >
                                        Doodstream
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('streamhg')}
                                        className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", activeTab === 'streamhg' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}
                                    >
                                        StreamHG
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('streamtape')}
                                        className={cn("flex-1 py-3 rounded-xl text-xs font-bold transition-all", activeTab === 'streamtape' ? "bg-emerald-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-300")}
                                    >
                                        Streamtape
                                    </button>
                                </div>

                                <h2 className={cn("text-2xl font-bold mb-6 flex items-center gap-2", 
                                    activeTab === 'dood' ? "text-emerald-400" : 
                                    activeTab === 'streamhg' ? "text-indigo-400" : 
                                    "text-emerald-400")}>
                                    <CloudCog className="w-6 h-6" />
                                    {activeTab === 'dood' ? 'إضافة حساب Doodstream' : 
                                     activeTab === 'streamhg' ? 'إضافة حساب StreamHG' : 
                                     'إضافة حساب Streamtape'}
                                </h2>
                                
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400">اسم الحساب (للتمييز فقط)</label>
                                        <input
                                            type="text"
                                            value={newAccName}
                                            onChange={e => setNewAccName(e.target.value)}
                                            placeholder="مثال: الحساب الأول"
                                            className="w-full bg-[#252525] border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-white/20"
                                        />
                                    </div>
                                    {activeTab === 'streamtape' && (
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400">API Login / Username</label>
                                            <input
                                                type="text"
                                                dir="ltr"
                                                value={newAccLogin}
                                                onChange={e => setNewAccLogin(e.target.value)}
                                                placeholder="ضع API Login هنا"
                                                className="w-full bg-[#252525] border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-white/20 font-mono"
                                            />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400">{activeTab === 'streamtape' ? 'API Key / API Password' : 'مفتاح API (API Key)'}</label>
                                        <input
                                            type="text"
                                            dir="ltr"
                                            value={newAccKey}
                                            onChange={e => setNewAccKey(e.target.value)}
                                            placeholder={
                                                activeTab === 'dood' ? "ضع مفتاح Doodstream API هنا" : 
                                                activeTab === 'streamhg' ? "ضع مفتاح StreamHG API هنا" :
                                                "ضع API Key هنا"
                                            }
                                            className="w-full bg-[#252525] border border-white/10 rounded-xl py-3 px-4 text-sm outline-none focus:border-white/20 font-mono"
                                        />
                                    </div>
                                    <button
                                        onClick={saveAccount}
                                        className={cn("w-full mt-4 py-3 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2", activeTab === 'dood' ? "bg-emerald-600 shadow-emerald-900/30" : "bg-indigo-600 shadow-indigo-900/30")}
                                    >
                                        <Key className="w-4 h-4" />
                                        حفظ الحساب في المتصفح
                                    </button>
                                </div>

                                {/* List existing accounts */}
                                <div className="mt-8 pt-8 border-t border-white/5 space-y-3">
                                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">الحسابات المحفوظة</h3>
                                    {(activeTab === 'dood' ? doodAccounts : activeTab === 'streamhg' ? streamHGAccounts : streamtapeAccounts).map((acc, i) => (
                                        <div key={i} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 group">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate">{acc.name}</p>
                                                <p className="text-[10px] text-gray-500 font-mono truncate">
                                                    {activeTab === 'streamtape' ? (acc as TapeAccount).login : acc.apiKey.substring(0, 10)}***
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => deleteAccount(activeTab, i)}
                                                className="p-2 opacity-0 group-hover:opacity-100 text-red-500/50 hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(activeTab === 'dood' ? doodAccounts : activeTab === 'streamhg' ? streamHGAccounts : streamtapeAccounts).length === 0 && (
                                        <p className="text-center text-[10px] text-gray-600 py-4 italic">لا توجد حسابات مضافة حالياً</p>
                                    )}
                                </div>

                <div className="bg-[#1a1a1a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl mb-8">
                    <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-gray-400 px-1">رابط صفحة الأنمي على انمي العرب</label>
                            <input
                                type="url"
                                dir="ltr"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://anime3rb.com/titles/..."
                                className="w-full bg-[#252525] border border-white/10 rounded-2xl py-4 px-6 text-sm text-emerald-400 outline-none focus:border-emerald-500 transition-all font-mono"
                            />
                        </div>
                        <button
                            onClick={() => batchScrapeMutation.mutate(url)}
                            disabled={batchScrapeMutation.isPending || !url}
                            className={`lg:mt-6 px-12 py-4 bg-gradient-to-r ${accent} hover:brightness-110 text-white rounded-2xl font-black text-lg transition-all shadow-xl ${accentShadow} active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3`}
                        >
                            {batchScrapeMutation.isPending ? <Loader2 className="animate-spin w-6 h-6" /> : <Zap className="w-6 h-6" />}
                            جلب الروابط المباشرة
                        </button>
                    </div>
                </div>

                {batchResult && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Summary Card */}
                        <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${accentBg} rounded-xl flex items-center justify-center`}>
                                    <List className={`w-6 h-6 ${accentText}`} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{batchResult.title}</h3>
                                    <p className="text-xs text-gray-500">تم العثور على {batchResult.totalEpisodes} حلقة</p>
                                </div>
                            </div>
                        </div>

                        {/* Three Textareas for each quality */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(['480p', '720p', '1080p'] as const).map(q => (
                                <div key={q} className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-6 relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold flex items-center gap-2">
                                            <ClipboardList className={`w-4 h-4 ${q === '1080p' ? 'text-emerald-400' : q === '720p' ? 'text-teal-400' : 'text-blue-400'}`} />
                                            روابط جودة {q}
                                        </h3>
                                        <button 
                                            onClick={() => handleCopyQuality(q)}
                                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <textarea
                                        readOnly
                                        value={qualityLinks[q]}
                                        dir="ltr"
                                        placeholder={`لا توجد روابط ${q}...`}
                                        className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-[10px] text-gray-300 font-mono resize-none focus:outline-none"
                                    />
                                    <div className="mt-2 text-[9px] text-gray-500 flex justify-between px-1">
                                        <span>عدد الروابط: {qualityLinks[q].split('\n').filter(Boolean).length}</span>
                                    </div>
                                </div>
                            ))}
                        </div>


                        {/* Integration Panels */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Doodstream Integration Panel */}
                            <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-8 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-blue-400">
                                        <UploadCloud className="w-5 h-5" />
                                        الرفع التلقائي إلى Doodstream
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الحساب</label>
                                            {doodAccounts.length > 0 ? (
                                                <select
                                                    value={selectedDoodAcc}
                                                    onChange={e => setSelectedDoodAcc(e.target.value)}
                                                    className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                                >
                                                    {doodAccounts.map((acc, i) => (
                                                        <option key={i} value={acc.apiKey}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="w-full h-[48px] bg-[#252525] border border-white/10 border-dashed rounded-xl px-4 flex items-center text-[10px] text-gray-500">
                                                    لا يوجد حسابات
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الجودة المطلوبة للرفع</label>
                                            <select
                                                value={selectedQualityDood}
                                                onChange={e => setSelectedQualityDood(e.target.value as any)}
                                                className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-blue-500 appearance-none cursor-pointer"
                                            >
                                                <option value="480p">480p</option>
                                                <option value="720p">720p</option>
                                                <option value="1080p">1080p</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoteUpload}
                                    disabled={isUploadingDood || isUploadingSHG || isUploadingTape || doodAccounts.length === 0}
                                    className={`h-[52px] px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 w-full`}
                                >
                                    {isUploadingDood ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                                    بدء الرفع وبناء الملفات (Dood)
                                </button>
                            </div>

                            {/* StreamHG Integration Panel */}
                            <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-8 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-indigo-400">
                                        <Sparkles className="w-5 h-5" />
                                        الرفع التلقائي إلى StreamHG
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الحساب</label>
                                            {streamHGAccounts.length > 0 ? (
                                                <select
                                                    value={selectedStreamHGAcc}
                                                    onChange={e => setSelectedStreamHGAcc(e.target.value)}
                                                    className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                                >
                                                    {streamHGAccounts.map((acc, i) => (
                                                        <option key={i} value={acc.apiKey}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="w-full h-[48px] bg-[#252525] border border-white/10 border-dashed rounded-xl px-4 flex items-center text-[10px] text-gray-500">
                                                    لا يوجد حسابات
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الجودة المطلوبة للرفع</label>
                                            <select
                                                value={selectedQualitySHG}
                                                onChange={e => setSelectedQualitySHG(e.target.value as any)}
                                                className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                                            >
                                                <option value="480p">480p</option>
                                                <option value="720p">720p</option>
                                                <option value="1080p">1080p</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleStreamHGUpload}
                                    disabled={isUploadingDood || isUploadingSHG || isUploadingTape || streamHGAccounts.length === 0}
                                    className={`h-[52px] px-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 w-full`}
                                >
                                    {isUploadingSHG ? <Loader2 className="animate-spin w-5 h-5" /> : <Zap className="w-5 h-5" />}
                                    بدء الرفع وبناء الملفات (SHG)
                                </button>
                            </div>

                            {/* Streamtape Integration Panel */}
                            <div className="bg-[#1a1a1a] rounded-[2rem] border border-white/5 p-8 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-emerald-400">
                                        <CloudCog className="w-5 h-5" />
                                        الرفع التلقائي إلى Streamtape
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الحساب</label>
                                            {streamtapeAccounts.length > 0 ? (
                                                <select
                                                    value={selectedStreamtapeAcc}
                                                    onChange={e => setSelectedStreamtapeAcc(e.target.value)}
                                                    className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                                                >
                                                    {streamtapeAccounts.map((acc, i) => (
                                                        <option key={i} value={`${acc.login}:${acc.key}`}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="w-full h-[48px] bg-[#252525] border border-white/10 border-dashed rounded-xl px-4 flex items-center text-[10px] text-gray-500">
                                                    لا يوجد حسابات
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase px-1">الجودة المطلوبة للرفع</label>
                                            <select
                                                value={selectedQualityTape}
                                                onChange={e => setSelectedQualityTape(e.target.value as any)}
                                                className="w-full h-[48px] bg-[#252525] border border-white/10 rounded-xl px-4 text-xs text-white outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                                            >
                                                <option value="480p">480p</option>
                                                <option value="720p">720p</option>
                                                <option value="1080p">1080p</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={handleStreamtapeUpload}
                                    disabled={isUploadingDood || isUploadingSHG || isUploadingTape || streamtapeAccounts.length === 0}
                                    className={`h-[52px] px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 w-full`}
                                >
                                    {isUploadingTape ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                                    بدء الرفع وبناء الملفات (Tape)
                                </button>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        <div className="grid gap-4">
                            <h3 className="text-lg font-bold px-2">تفاصيل الحلقات</h3>
                            {batchResult.episodes.map(ep => {
                                const directLink = ep.links.find(l => l.title?.toLowerCase().includes('720')) || 
                                                 ep.links.find(l => 
                                                     l.title === 'Direct link' || 
                                                     l.downloadUrl?.toLowerCase().includes('.mp4') ||
                                                     l.embedUrl?.toLowerCase().includes('.mp4')
                                                 );

                                return (
                                    <div key={ep.episodeNum} className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden">
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center font-bold">
                                                    {ep.episodeNum}
                                                </div>
                                                <p className="font-bold text-sm">{ep.label}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {directLink ? (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        <span className="text-[10px] text-emerald-500 font-bold truncate max-w-[200px] font-mono">
                                                            {directLink.downloadUrl || directLink.embedUrl}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                        <span className="text-[10px] text-red-500 font-bold">لم يتم العثور على رابط مباشر</span>
                                                    </div>
                                                )}
                                                
                                                {/* Upload State Indicator */}
                                                {uploadStates[ep.episodeNum] && (
                                                    <div className={`flex items-center justify-center px-3 py-1 rounded-full border ${
                                                        uploadStates[ep.episodeNum].status === 'uploading' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                                        uploadStates[ep.episodeNum].status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                        'bg-red-500/10 border-red-500/20 text-red-500'
                                                    }`}>
                                                        {uploadStates[ep.episodeNum].status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                                        {uploadStates[ep.episodeNum].status === 'success' && <CheckCircle2 className="w-3 h-3 ml-1" />}
                                                        {uploadStates[ep.episodeNum].status === 'error' && <AlertCircle className="w-3 h-3 ml-1" />}
                                                        <span className="text-[10px] font-bold">
                                                            {uploadStates[ep.episodeNum].status === 'uploading' ? 'جاري الإرسال...' :
                                                             uploadStates[ep.episodeNum].status === 'success' ? 'قيد الرفع (شغال)' :
                                                             'فشل الإرسال'}
                                                        </span>
                                                    </div>
                                                )}

                                                <button 
                                                    onClick={() => setExpandedEpisode(expandedEpisode === ep.episodeNum ? null : ep.episodeNum)}
                                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                                >
                                                    <ChevronRight className={cn("w-4 h-4 transition-transform", expandedEpisode === ep.episodeNum && "rotate-90")} />
                                                </button>
                                            </div>
                                        </div>
                                        {expandedEpisode === ep.episodeNum && (
                                            <div className="p-6 pt-0 border-t border-white/5 bg-black/20">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                    {ep.links.map((link, idx) => (
                                                        <div key={idx} className="bg-[#1a1a1a] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-[10px] font-bold text-gray-500 block mb-1 uppercase">{link.title}</span>
                                                                <p className="text-[10px] text-emerald-300 truncate font-mono">{link.downloadUrl || link.embedUrl}</p>
                                                            </div>
                                                            <a href={link.downloadUrl || link.embedUrl || ""} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-white">
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!batchResult && !batchScrapeMutation.isPending && (
                    <div className="mt-12 text-center py-32 bg-[#1a1a1a] rounded-[3rem] border border-white/5 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${accent}`} />
                        <div className="max-w-md mx-auto space-y-6">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/5">
                                <LinkIcon className="w-10 h-10 text-gray-700" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-white">استخرج الروابط المباشرة لـ Anime3rb</h3>
                                <p className="text-gray-500 font-medium">
                                    ضع رابط صفحة الأنمي أو قائمة الحلقات وسنقوم باستخراج روابط الـ mp4 المباشرة دفعة واحدة لسهولة النشر.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {batchScrapeMutation.isPending && (
                    <div className="mt-12 text-center py-32 bg-[#1a1a1a] rounded-[3rem] border border-white/5">
                        <div className="relative w-24 h-24 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 animate-ping" />
                            <div className={`relative w-24 h-24 ${accentBg} rounded-full flex items-center justify-center border border-white/10`}>
                                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">جاري فحص الحلقات واستخراج الروابط...</h3>
                        <p className="text-gray-500">نقوم بالدخول لكل حلقة واكتشاف روابط الـ MP4 المباشرة بجودة 720p</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Anime3rbDirectLinksPage;
