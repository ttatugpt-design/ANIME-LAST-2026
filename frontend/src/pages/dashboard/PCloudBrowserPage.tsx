import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File as FileIcon, ExternalLink, RefreshCw, ChevronLeft, Copy, Settings, Trash2, Plus, UserCircle, Search, Zap, Share2, ArrowRightLeft, CheckCircle2, LayoutGrid, List, Pencil, Move, UploadCloud, Link, Database, FolderPlus, ArrowLeft, Tv2, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface HostingAccount {
    name: string;
    key: string;
}

interface Anime {
    id: number;
    title: string;
    image: string;
}

interface QueueItem {
    filename: string;
    code: string;
    pcloud_url: string;
}

interface HostingFile {
    file_code: string;
    title: string;
    folder_id: string;
    size?: string;
    is_folder?: boolean;
    fld_id?: string;
    name?: string;
}

export default function PCloudBrowserPage() {
    const defaultUrl = "https://filedn.com/lJUEBA5pmBFQE8D6sNtPvem/";
    const [currentUrl, setCurrentUrl] = useState(localStorage.getItem("pcloud_public_url") || defaultUrl);
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

    // Queues for manual sync
    const [hgQueue, setHgQueue] = useState<QueueItem[]>([]);
    const [doodQueue, setDoodQueue] = useState<QueueItem[]>([]);

    // Browser States
    const [hgCurrentFld, setHgCurrentFld] = useState("0");
    const [doodCurrentFld, setDoodCurrentFld] = useState("0");
    const [hgBrowserFiles, setHgBrowserFiles] = useState<HostingFile[]>([]);
    const [doodBrowserFiles, setDoodBrowserFiles] = useState<HostingFile[]>([]);
    const [hgLoading, setHgLoading] = useState(false);
    const [doodLoading, setDoodLoading] = useState(false);

    // Browser Selections
    const [hgSelected, setHgSelected] = useState<Record<string, boolean>>({});
    const [doodSelected, setDoodSelected] = useState<Record<string, boolean>>({});

    // Manual Upload States
    const [hgManualLinks, setHgManualLinks] = useState("");
    const [doodManualLinks, setDoodManualLinks] = useState("");

    // Animes State
    const [animes, setAnimes] = useState<Anime[]>([]);
    const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
    const [animeSearch, setAnimeSearch] = useState("");
    const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);

    // Accounts
    const [hgAccounts, setHgAccounts] = useState<HostingAccount[]>(() => JSON.parse(localStorage.getItem("streamhg_accounts") || "[]"));
    const [doodAccounts, setDoodAccounts] = useState<HostingAccount[]>(() => JSON.parse(localStorage.getItem("doodstream_accounts") || "[]"));
    const [selectedHgIdx, setSelectedHgIdx] = useState<string>(localStorage.getItem("streamhg_selected_idx") || "");
    const [selectedDoodIdx, setSelectedDoodIdx] = useState<string>(localStorage.getItem("doodstream_selected_idx") || "");

    const [newAccName, setNewAccName] = useState("");
    const [newAccKey, setNewAccKey] = useState("");
    const [isHgModalOpen, setIsHgModalOpen] = useState(false);
    const [isDoodModalOpen, setIsDoodModalOpen] = useState(false);

    // Editing & Folder Creation
    const [editItem, setEditItem] = useState<{code: string, name: string, type: 'hg' | 'dood'} | null>(null);
    const [newFolderName, setNewFolderName] = useState("");
    const [showFolderDialog, setShowFolderDialog] = useState<'hg'|'dood'|null>(null);

    useEffect(() => {
        localStorage.setItem("streamhg_accounts", JSON.stringify(hgAccounts));
        localStorage.setItem("doodstream_accounts", JSON.stringify(doodAccounts));
        localStorage.setItem("streamhg_selected_idx", selectedHgIdx);
        localStorage.setItem("doodstream_selected_idx", selectedDoodIdx);
    }, [hgAccounts, doodAccounts, selectedHgIdx, selectedDoodIdx]);

    useEffect(() => {
        handleFetch(currentUrl, false);
        fetchAnimes();
    }, []);

    const fetchAnimes = async () => {
        try {
            const res = await api.get("/animes?limit=1000");
            setAnimes(res.data);
        } catch (error) {
            console.error("Failed to fetch animes", error);
        }
    };

    const handleFetch = async (targetUrl = currentUrl, pushToHistory = true) => {
        setLoading(true);
        
        // Update history if it's a new navigation
        if (pushToHistory && targetUrl !== currentUrl) {
            setHistory(prev => [...prev, currentUrl]);
        }

        localStorage.setItem("pcloud_public_url", targetUrl);
        setCurrentUrl(targetUrl);
        setSelectedItems({});

        try {
            const res = await api.get(`/pcloud/public-drive?url=${encodeURIComponent(targetUrl)}`);
            if (res.data.result === 0 && res.data.metadata) {
                setFiles(res.data.metadata.contents || []);
            } else {
                setFiles([]);
            }
        } catch (error: any) {
            toast.error("Error: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (history.length > 0) {
            const prevUrl = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            handleFetch(prevUrl, false); // Fetch without pushing to history again
        } else {
            toast.info("أنت في المجلد الرئيسي");
        }
    };

    const copyAllSelected = () => {
        const selectedUrls = files.filter(f => selectedItems[f.url] && !f.isfolder).map(f => f.url);
        if (selectedUrls.length === 0) return toast.error("حدد ملفات أولاً");
        navigator.clipboard.writeText(selectedUrls.join('\n'));
        toast.success(`تم نسخ ${selectedUrls.length} رابط`);
    };

    const handleRemoteUpload = async (service: 'streamhg' | 'doodstream', manualUrls?: string[]) => {
        const selectedFiles = files.filter(f => selectedItems[f.url] && !f.isfolder);
        const finalUrls = manualUrls || selectedFiles.map(f => f.url);
        
        if (finalUrls.length === 0) return toast.error("يرجى تحديد ملفات أو وضع روابط أولاً");

        const accounts = service === 'streamhg' ? hgAccounts : doodAccounts;
        const index = service === 'streamhg' ? selectedHgIdx : selectedDoodIdx;
        const activeAccount = accounts[parseInt(index)];

        if (!activeAccount) return toast.error(`يرجى اختيار حساب ${service} أولاً`);

        const pcloudToken = "lJUEBA5pmBFQE8D6sNtPvem";
        const urlSegments = currentUrl.split('/').filter(s => s && !s.startsWith('http') && s !== pcloudToken);
        const folderName = urlSegments.length > 0 ? decodeURIComponent(urlSegments[urlSegments.length - 1]) : "Root";

        setLoading(true);
        try {
            const res = await api.post(`/${service}/remote-upload`, {
                api_key: activeAccount.key,
                folder_name: folderName,
                urls: finalUrls
            });

            if (res.data.file_codes) {
                const newItems: QueueItem[] = res.data.file_codes.map((code: string, i: number) => {
                    const url = finalUrls[i];
                    const filename = manualUrls ? `Manual_Upload_${i+1}.mp4` : selectedFiles[i].name;
                    return { filename, code, pcloud_url: url };
                });

                if (service === 'streamhg') {
                    setHgQueue([...hgQueue, ...newItems]);
                    setHgManualLinks("");
                } else {
                    setDoodQueue([...doodQueue, ...newItems]);
                    setDoodManualLinks("");
                }

                toast.success(`تم استلام أكواد ${service.toUpperCase()}`);
                setSelectedItems({});
            }
        } catch (error: any) {
            toast.error("فشل الرفع: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchHostingBrowser = async (service: 'hg' | 'dood', fldId?: string) => {
        const accounts = service === 'hg' ? hgAccounts : doodAccounts;
        const idx = service === 'hg' ? selectedHgIdx : selectedDoodIdx;
        const activeAcc = accounts[parseInt(idx)];
        const targetFld = fldId !== undefined ? fldId : (service === 'hg' ? hgCurrentFld : doodCurrentFld);

        if (!activeAcc) return toast.error("يرجى اختيار حساب");

        if (service === 'hg') { setHgLoading(true); setHgCurrentFld(targetFld); setHgSelected({}); } 
        else { setDoodLoading(true); setDoodCurrentFld(targetFld); setDoodSelected({}); }

        try {
            const endpoint = service === 'hg' ? '/streamhg/files-by-key' : '/doodstream/files-by-key';
            const res = await api.get(`${endpoint}?key=${activeAcc.key}&fld_id=${targetFld}`);
            
            console.log(`[Hosting Browser] ${service} Response:`, res.data);

            if (Number(res.data.status) === 200) {
                const result = res.data.result;
                let merged = [];
                if (Array.isArray(result)) {
                    merged = result;
                } else if (result && typeof result === 'object') {
                    const files = result.files || result.file_list || [];
                    const folders = result.folders || result.folder_list || [];
                    merged = [
                        ...(folders.map((f: any) => ({ ...f, is_folder: true, title: f.name || f.title, fld_id: f.fld_id || f.folder_id })) || []),
                        ...(files.map((f: any) => ({ ...f, title: f.title || f.name })))
                    ];
                }
                
                const final = merged.map((item: any) => ({
                    ...item,
                    title: item.title || item.name || "Unknown File"
                }));

                if (service === 'hg') setHgBrowserFiles(final);
                else setDoodBrowserFiles(final);
            }
        } catch (error) {
            toast.error("فشل الجلب");
        } finally {
            if (service === 'hg') setHgLoading(false); else setDoodLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!showFolderDialog || !newFolderName) return;
        const service = showFolderDialog;
        const accounts = service === 'hg' ? hgAccounts : doodAccounts;
        const idx = service === 'hg' ? selectedHgIdx : selectedDoodIdx;
        const activeAcc = accounts[parseInt(idx)];

        try {
            const endpoint = service === 'hg' ? '/streamhg/folder/create' : '/doodstream/folder/create';
            await api.post(`${endpoint}?key=${activeAcc.key}&name=${encodeURIComponent(newFolderName)}`);
            toast.success("تم إنشاء المجلد");
            setNewFolderName("");
            setShowFolderDialog(null);
            fetchHostingBrowser(service);
        } catch (error) {
            toast.error("فشل الإنشاء");
        }
    };

    const deleteHostingFiles = async (service: 'hg' | 'dood', codes: string[]) => {
        const accounts = service === 'hg' ? hgAccounts : doodAccounts;
        const idx = service === 'hg' ? selectedHgIdx : selectedDoodIdx;
        const activeAcc = accounts[parseInt(idx)];
        const targetCodes = codes.length > 0 ? codes : Object.keys(service === 'hg' ? hgSelected : doodSelected).filter(k => (service === 'hg' ? hgSelected : doodSelected)[k]);

        if (targetCodes.length === 0) return toast.error("حدد ملفات أولاً");

        try {
            const endpoint = service === 'hg' ? '/streamhg/files-delete-by-key' : '/doodstream/files-delete-by-key';
            await api.post(endpoint, { key: activeAcc.key, codes: targetCodes });
            toast.success("تم الحذف بنجاح");
            fetchHostingBrowser(service);
        } catch (error) {
            toast.error("فشل الحذف");
        }
    };

    const addToSyncQueue = (service: 'hg' | 'dood') => {
        const selectedMap = service === 'hg' ? hgSelected : doodSelected;
        const browserFiles = service === 'hg' ? hgBrowserFiles : doodBrowserFiles;
        
        const toAdd = browserFiles.filter(f => selectedMap[f.file_code] && !f.is_folder);
        if (toAdd.length === 0) return toast.error("حدد ملفات (وليس مجلدات) للإضافة");

        const newItems: QueueItem[] = toAdd.map(f => ({
            filename: f.title,
            code: f.file_code,
            pcloud_url: ""
        }));

        if (service === 'hg') {
            setHgQueue([...hgQueue, ...newItems]);
            setHgSelected({});
        } else {
            setDoodQueue([...doodQueue, ...newItems]);
            setDoodSelected({});
        }
        toast.success(`تم إضافة ${toAdd.length} ملف لجدول المزامنة`);
    };

    const renameHostingFile = async () => {
        if (!editItem) return;
        const { service, code, name } = { service: editItem.type, code: editItem.code, name: editItem.name };
        const accounts = service === 'hg' ? hgAccounts : doodAccounts;
        const idx = service === 'hg' ? selectedHgIdx : selectedDoodIdx;
        const activeAcc = accounts[parseInt(idx)];

        try {
            const endpoint = service === 'hg' ? '/streamhg/files-rename-by-key' : '/doodstream/files-rename-by-key';
            await api.post(`${endpoint}?key=${activeAcc.key}&code=${code}&name=${encodeURIComponent(name)}`);
            toast.success("تم تغيير الاسم");
            setEditItem(null);
            fetchHostingBrowser(service);
        } catch (error) {
            toast.error("فشل التغيير");
        }
    };

    const handleFinalSync = async () => {
        if (!selectedAnime) return toast.error("يرجى اختيار أنمي أولاً");
        if (hgQueue.length === 0 && doodQueue.length === 0) return toast.error("جداول الانتظار فارغة! ارفع ملفات أولاً.");

        const mapping: Record<string, any> = {};
        [...hgQueue, ...doodQueue].forEach(item => {
            if (!mapping[item.filename]) mapping[item.filename] = { filename: item.filename, pcloud_url: item.pcloud_url };
        });

        hgQueue.forEach(item => mapping[item.filename].hg_code = item.code);
        doodQueue.forEach(item => mapping[item.filename].dood_code = item.code);

        setLoading(true);
        try {
            const res = await api.post("/automation/sync", {
                anime_id: selectedAnime.id,
                items: Object.values(mapping)
            });
            toast.success(res.data.message);
            setHgQueue([]);
            setDoodQueue([]);
        } catch (error: any) {
            toast.error("فشل المزامنة: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const addAccount = (type: 'hg' | 'dood') => {
        if (!newAccName || !newAccKey) return;
        const newAcc = { name: newAccName, key: newAccKey };
        if (type === 'hg') setHgAccounts([...hgAccounts, newAcc]);
        else setDoodAccounts([...doodAccounts, newAcc]);
        setNewAccName(""); setNewAccKey("");
        toast.success("تم الإضافة");
    };

    const filteredAnimes = animes.filter(a => a.title.toLowerCase().includes(animeSearch.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex bg-background/50 border rounded-xl overflow-hidden shadow-xl min-h-[600px] flex-col">
                {/* Main Browser Toolbar */}
                <div className="p-4 border-b flex flex-wrap items-center justify-between bg-muted/5 gap-4">
                    <div className="flex items-center gap-3">
                        <Badge className="bg-blue-600 font-mono text-[10px] px-2 py-0.5">pCloud Interface</Badge>
                        <h2 className="font-black tracking-tight text-lg text-indigo-900 italic">متصفح الملفات السحابي</h2>
                        <div className="h-6 w-[2px] bg-indigo-200/50 mx-2 hidden md:block" />
                        <Button 
                            variant={selectedAnime ? "default" : "outline"} 
                            className={`h-10 gap-2 rounded-xl transition-all ${selectedAnime ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20" : "border-indigo-200 text-indigo-600"}`}
                            onClick={() => setIsAnimeModalOpen(true)}
                        >
                            {selectedAnime ? <CheckCircle2 className="h-5 w-5"/> : <Tv2 className="h-5 w-5" />}
                            {selectedAnime ? selectedAnime.title : "اختيار الأنمي"}
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                         <Button size="sm" variant="outline" className="h-10 gap-2 text-indigo-600 border-indigo-200 rounded-xl" onClick={copyAllSelected} title="نسخ روابط الملفات المحددة"><Copy className="h-4 w-4"/> نسخ الروابط</Button>
                         
                         <div className="flex items-center bg-orange-500/5 border border-orange-200 rounded-xl p-1 gap-1">
                            <Select value={selectedHgIdx} onValueChange={setSelectedHgIdx}>
                                <SelectTrigger className="w-[110px] h-8 border-none bg-transparent focus:ring-0"><SelectValue placeholder="HG Acc" /></SelectTrigger>
                                <SelectContent>{hgAccounts.map((acc, i) => <SelectItem key={i} value={i.toString()}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8 gap-2 rounded-lg" onClick={() => handleRemoteUpload('streamhg')} disabled={loading}><UploadCloud className="h-4 w-4"/> HG</Button>
                         </div>

                         <div className="flex items-center bg-cyan-500/5 border border-cyan-200 rounded-xl p-1 gap-1">
                            <Select value={selectedDoodIdx} onValueChange={setSelectedDoodIdx}>
                                <SelectTrigger className="w-[110px] h-8 border-none bg-transparent focus:ring-0"><SelectValue placeholder="Dood Acc" /></SelectTrigger>
                                <SelectContent>{doodAccounts.map((acc, i) => <SelectItem key={i} value={i.toString()}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-8 gap-2 rounded-lg" onClick={() => handleRemoteUpload('doodstream')} disabled={loading}><UploadCloud className="h-4 w-4"/> Dood</Button>
                         </div>
                    </div>
                </div>

                {/* Path Toolbar */}
                <div className="p-2 px-4 border-b flex gap-2 items-center bg-muted/10">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-indigo-600 hover:bg-indigo-50" 
                        onClick={handleBack} 
                        disabled={history.length === 0}
                        title="الرجوع للمجلد السابق"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Input value={currentUrl} onChange={e => setCurrentUrl(e.target.value)} className="h-8 text-[11px] font-mono flex-1 bg-background border-indigo-100 rounded-lg" />
                    <Button size="sm" className="h-8 px-4 bg-indigo-600 rounded-lg font-bold" onClick={() => handleFetch(currentUrl)}>انتقال</Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-indigo-600 border-indigo-100" onClick={() => handleFetch()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
                </div>

                {/* Data Table */}
                <ScrollArea className="flex-1 max-h-[600px]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-20 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[40px] pl-6">
                                    <input type="checkbox" className="rounded border-gray-300 h-4 w-4" onChange={(e) => {
                                        const urls = files.filter(f => !f.isfolder).map(f => f.url);
                                        const newS = { ...selectedItems };
                                        urls.forEach(u => newS[u] = e.target.checked);
                                        setSelectedItems(newS);
                                    }} />
                                </TableHead>
                                <TableHead className="text-indigo-900 font-bold">اسم الملف / المجلد</TableHead>
                                <TableHead className="text-right pr-6 text-indigo-900 font-bold">إجـراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && files.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-32 text-muted-foreground"><RefreshCw className="h-10 w-10 animate-spin mx-auto mb-4 opacity-20"/> جاري جلب محتويات pCloud...</TableCell></TableRow> :
                            files.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-32 text-muted-foreground italic opacity-50">المجلد فارغ أو الرابط غير صالح</TableCell></TableRow> :
                            files.map((item, i) => (
                                <TableRow key={i} className="hover:bg-indigo-50/40 transition-colors group cursor-default">
                                    <TableCell className="pl-6">{!item.isfolder && <input type="checkbox" className="rounded h-4 w-4" checked={!!selectedItems[item.url]} onChange={() => setSelectedItems(p=>({...p, [item.url]: !p[item.url]}))}/>}</TableCell>
                                    <TableCell onClick={() => item.isfolder && handleFetch(item.url)} className={`transition-all ${item.isfolder ? "font-black text-indigo-700 cursor-pointer hover:text-indigo-900" : "font-medium text-gray-700"}`}>
                                        <div className="flex items-center gap-4">
                                            {item.isfolder ? <Folder className="fill-indigo-500 text-indigo-500 h-6 w-6" /> : <FileIcon className="h-6 w-6 text-indigo-200" />}
                                            <span className="text-[13px] truncate max-w-2xl">{item.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        {!item.isfolder && (
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-xl" onClick={() => window.open(item.url, "_blank")}><ExternalLink className="h-5 w-5"/></Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>

            {/* SYNC & MANAGEMENT DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ---------------- STREAM HG CARD ---------------- */}
                <Card className="border-orange-500/20 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
                    <CardHeader className="py-4 bg-gradient-to-r from-orange-600 to-orange-400 text-white flex flex-row items-center justify-between shadow-lg">
                        <CardTitle className="text-lg font-black italic tracking-tighter flex items-center gap-2"><Zap className="h-5 w-5 fill-white" /> STREAM-HG MANAGER</CardTitle>
                        <Badge variant="outline" className="text-white border-white/50 bg-white/10">{hgQueue.length} Pending</Badge>
                    </CardHeader>
                    <Tabs defaultValue="queue" className="flex-1 flex flex-col">
                        <TabsList className="grid grid-cols-3 rounded-none bg-orange-500/10 h-12 p-1 border-b">
                            <TabsTrigger value="queue" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white gap-2 font-bold"><List className="h-4 w-4"/> المزامنة</TabsTrigger>
                            <TabsTrigger value="browser" onClick={() => fetchHostingBrowser('hg')} className="data-[state=active]:bg-orange-600 data-[state=active]:text-white gap-2 font-bold"><LayoutGrid className="h-4 w-4"/> متصفح API</TabsTrigger>
                            <TabsTrigger value="manual" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white gap-2 font-bold"><Link className="h-4 w-4"/> رفع يدوي</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="queue" className="flex-1 m-0 p-0">
                            <ScrollArea className="h-[350px]">
                                <Table>
                                    <TableBody>
                                        {hgQueue.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">قائمة الانتظار فارغة...</TableCell></TableRow> :
                                        hgQueue.map((item, i) => (
                                            <TableRow key={i} className="group hover:bg-orange-50/30">
                                                <TableCell className="text-[11px] font-bold max-w-[200px] truncate pl-4">{item.filename}</TableCell>
                                                <TableCell className="font-mono text-orange-600 text-[10px]">{item.code}</TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => setHgQueue(hgQueue.filter((_, idx)=>idx!==i))}><Trash2 className="h-3 w-3"/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="browser" className="flex-1 m-0 p-0">
                            <div className="p-2 border-b bg-muted/5 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => fetchHostingBrowser('hg', '0')}><ArrowLeft className="h-3 w-3 mr-1"/> Root</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600" onClick={() => fetchHostingBrowser('hg')} disabled={hgLoading}><RefreshCw className={`h-3 w-3 ${hgLoading? "animate-spin":""}`}/></Button>
                                    <div className="h-4 w-[1px] bg-border mx-1" />
                                    <Button size="sm" className="h-8 text-[11px] bg-orange-600 text-white font-bold gap-2 shadow-lg shadow-orange-600/20 rounded-lg" onClick={() => addToSyncQueue('hg')}><Plus className="h-4 w-4" /> إضافة للمزامنة</Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-[11px] text-red-600 font-bold" onClick={() => deleteHostingFiles('hg', [])}><Trash2 className="h-3 w-3 mr-1"/> حذف المختار</Button>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 text-orange-600 border-orange-200 rounded-lg hover:bg-orange-50" onClick={() => setShowFolderDialog('hg')}><FolderPlus className="h-3 w-3"/> مجلد جديد</Button>
                            </div>
                            <ScrollArea className="h-[350px]">
                                 <Table>
                                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                        <TableRow className="h-8">
                                            <TableHead className="w-[30px] pl-6"><input type="checkbox" className="rounded" onChange={(e)=>{
                                                const res:Record<string,boolean> = {};
                                                hgBrowserFiles.filter(f=>!f.is_folder).forEach(f=> res[f.file_code] = e.target.checked);
                                                setHgSelected(res);
                                            }}/></TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">الملف / المجلد</TableHead>
                                            <TableHead className="text-right text-[10px] pr-6 font-bold uppercase tracking-wider">إجـراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {hgLoading ? <TableRow><TableCell colSpan={3} className="text-center py-24 text-muted-foreground"><RefreshCw className="h-10 w-10 animate-spin mx-auto mb-2 opacity-20"/> جاري الجلب...</TableCell></TableRow> :
                                        (!Array.isArray(hgBrowserFiles) || hgBrowserFiles.length === 0) ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">لا توجد ملفات حالياً</TableCell></TableRow> :
                                        hgBrowserFiles.map((file, i) => (
                                            <TableRow key={i} className="group h-10 hover:bg-orange-50/20 transition-all">
                                                <TableCell className="pl-6">{!file.is_folder && <input type="checkbox" className="rounded h-4 w-4" checked={!!hgSelected[file.file_code]} onChange={()=>setHgSelected(p=>({...p, [file.file_code]: !p[file.file_code]}))}/>}</TableCell>
                                                <TableCell className={file.is_folder ? "text-[11px] font-black text-orange-700 cursor-pointer hover:underline" : "text-[11px] font-medium"} 
                                                           onClick={() => file.is_folder && fetchHostingBrowser('hg', file.fld_id)}>
                                                    <div className="flex items-center gap-3 truncate max-w-[200px]">
                                                        {file.is_folder ? <Folder className="h-4 w-4 fill-orange-500 text-orange-500"/> : <FileIcon className="h-4 w-4 text-orange-200"/>}
                                                        {file.title}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => setEditItem({code: file.file_code, name: file.title, type: 'hg'})}><Pencil className="h-4 w-4"/></Button>
                                                        {!file.is_folder && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => deleteHostingFiles('hg', [file.file_code])}><Trash2 className="h-4 w-4"/></Button>}
                                                        {!file.is_folder && <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50 font-bold" onClick={() => setHgQueue([...hgQueue, { filename: file.title, code: file.file_code, pcloud_url: "" }])}><Plus className="h-4 w-4"/></Button>}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                 </Table>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="manual" className="flex-1 p-6 space-y-4">
                            <label className="text-xs font-black text-orange-600 flex items-center gap-2"><Link className="h-4 w-4" /> روابط مباشـرة من pCloud</label>
                            <Textarea placeholder="انسخ الروابط هنا (رابط واحد في كل سطر)..." className="min-h-[220px] font-mono text-[11px] rounded-xl border-orange-100" value={hgManualLinks} onChange={e => setHgManualLinks(e.target.value)} />
                            <Button className="w-full bg-orange-600 hover:bg-orange-700 h-12 font-black text-lg shadow-xl shadow-orange-600/30 rounded-xl transition-all hover:scale-[1.01]" onClick={() => handleRemoteUpload('streamhg', hgManualLinks.split('\n').filter(l => l.trim()))}>بدء الرفــــع الآن</Button>
                        </TabsContent>
                    </Tabs>
                </Card>

                {/* ---------------- DOOD STREAM CARD ---------------- */}
                <Card className="border-cyan-500/20 shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
                    <CardHeader className="py-4 bg-gradient-to-r from-cyan-600 to-cyan-400 text-white flex flex-row items-center justify-between shadow-lg">
                        <CardTitle className="text-lg font-black italic tracking-tighter flex items-center gap-2"><Database className="h-5 w-5 fill-white" /> DOOD-STREAM MANAGER</CardTitle>
                        <Badge variant="outline" className="text-white border-white/50 bg-white/10">{doodQueue.length} Pending</Badge>
                    </CardHeader>
                    <Tabs defaultValue="queue" className="flex-1 flex flex-col">
                        <TabsList className="grid grid-cols-3 rounded-none bg-cyan-500/10 h-12 p-1 border-b">
                            <TabsTrigger value="queue" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white gap-2 font-bold"><List className="h-4 w-4"/> المزامنة</TabsTrigger>
                            <TabsTrigger value="browser" onClick={() => fetchHostingBrowser('dood')} className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white gap-2 font-bold"><LayoutGrid className="h-4 w-4"/> متصفح API</TabsTrigger>
                            <TabsTrigger value="manual" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white gap-2 font-bold"><Link className="h-4 w-4"/> رفع يدوي</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="queue" className="flex-1 m-0 p-0">
                            <ScrollArea className="h-[350px]">
                                <Table>
                                    <TableBody>
                                        {doodQueue.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">قائمة الانتظار فارغة...</TableCell></TableRow> :
                                        doodQueue.map((item, i) => (
                                            <TableRow key={i} className="group hover:bg-cyan-50/30">
                                                <TableCell className="text-[11px] font-bold max-w-[200px] truncate pl-4">{item.filename}</TableCell>
                                                <TableCell className="font-mono text-cyan-600 text-[10px]">{item.code}</TableCell>
                                                <TableCell className="text-right pr-4">
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => setDoodQueue(doodQueue.filter((_, idx)=>idx!==i))}><Trash2 className="h-3 w-3"/></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="browser" className="flex-1 m-0 p-0">
                             <div className="p-2 border-b bg-muted/5 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-lg" onClick={() => fetchHostingBrowser('dood', '0')}><ArrowLeft className="h-3 w-3 mr-1"/> Root</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600" onClick={() => fetchHostingBrowser('dood')} disabled={doodLoading}><RefreshCw className={`h-3 w-3 ${doodLoading? "animate-spin":""}`}/></Button>
                                    <div className="h-4 w-[1px] bg-border mx-1" />
                                    <Button size="sm" className="h-8 text-[11px] bg-cyan-600 text-white font-bold gap-2 shadow-lg shadow-cyan-600/20 rounded-lg" onClick={() => addToSyncQueue('dood')}><Plus className="h-4 w-4" /> إضافة للمزامنة</Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-[11px] text-red-600 font-bold" onClick={() => deleteHostingFiles('dood', [])}><Trash2 className="h-3 w-3 mr-1"/> حذف المختار</Button>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 text-cyan-600 border-cyan-200 rounded-lg hover:bg-cyan-50" onClick={() => setShowFolderDialog('dood')}><FolderPlus className="h-3 w-3"/> مجلد جديد</Button>
                            </div>
                            <ScrollArea className="h-[350px]">
                                 <Table>
                                    <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                        <TableRow className="h-8">
                                            <TableHead className="w-[30px] pl-6"><input type="checkbox" className="rounded" onChange={(e)=>{
                                                const res:Record<string,boolean> = {};
                                                doodBrowserFiles.filter(f=>!f.is_folder).forEach(f=> res[f.file_code] = e.target.checked);
                                                setDoodSelected(res);
                                            }}/></TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-wider">الملف / المجلد</TableHead>
                                            <TableHead className="text-right text-[10px] pr-6 font-bold uppercase tracking-wider">إجـراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {doodLoading ? <TableRow><TableCell colSpan={3} className="text-center py-24 text-muted-foreground"><RefreshCw className="h-10 w-10 animate-spin mx-auto mb-2 opacity-20"/> جاري الجلب...</TableCell></TableRow> :
                                        (!Array.isArray(doodBrowserFiles) || doodBrowserFiles.length === 0) ? <TableRow><TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">لا توجد ملفات حالياً</TableCell></TableRow> :
                                        doodBrowserFiles.map((file, i) => (
                                            <TableRow key={i} className="group h-10 hover:bg-cyan-50/20 transition-all">
                                                <TableCell className="pl-6">{!file.is_folder && <input type="checkbox" className="rounded h-4 w-4" checked={!!doodSelected[file.file_code]} onChange={()=>setDoodSelected(p=>({...p, [file.file_code]: !p[file.file_code]}))}/>}</TableCell>
                                                <TableCell className={file.is_folder ? "text-[11px] font-black text-cyan-700 cursor-pointer hover:underline" : "text-[11px] font-medium"} 
                                                           onClick={() => file.is_folder && fetchHostingBrowser('dood', file.fld_id)}>
                                                    <div className="flex items-center gap-3 truncate max-w-[200px]">
                                                        {file.is_folder ? <Folder className="h-4 w-4 fill-cyan-500 text-cyan-500"/> : <FileIcon className="h-4 w-4 text-cyan-200"/>}
                                                        {file.title}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => setEditItem({code: file.file_code, name: file.title, type: 'dood'})}><Pencil className="h-4 w-4"/></Button>
                                                        {!file.is_folder && <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => deleteHostingFiles('dood', [file.file_code])}><Trash2 className="h-4 w-4"/></Button>}
                                                        {!file.is_folder && <Button variant="ghost" size="icon" className="h-8 w-8 text-cyan-600 hover:bg-cyan-50 font-bold" onClick={() => setDoodQueue([...doodQueue, { filename: file.title, code: file.file_code, pcloud_url: "" }])}><Plus className="h-4 w-4"/></Button>}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                 </Table>
                            </ScrollArea>
                        </TabsContent>

                        <TabsContent value="manual" className="flex-1 p-6 space-y-4">
                             <label className="text-xs font-black text-cyan-600 flex items-center gap-2"><Link className="h-4 w-4" /> روابط مباشـرة من pCloud</label>
                             <Textarea placeholder="انسخ الروابط هنا (رابط واحد في كل سطر)..." className="min-h-[220px] font-mono text-[11px] rounded-xl border-cyan-100" value={doodManualLinks} onChange={e => setDoodManualLinks(e.target.value)} />
                             <Button className="w-full bg-cyan-600 hover:bg-cyan-700 h-12 font-black text-lg shadow-xl shadow-cyan-600/30 rounded-xl transition-all hover:scale-[1.01]" onClick={() => handleRemoteUpload('doodstream', doodManualLinks.split('\n').filter(l => l.trim()))}>بدء الرفــــع الآن</Button>
                        </TabsContent>
                    </Tabs>
                </Card>

                {/* ---------------- MASTER SYNC CONTROL ---------------- */}
                <div className="lg:col-span-2 bg-gradient-to-br from-indigo-700 to-indigo-950 rounded-3xl p-8 shadow-2xl relative border border-white/10 overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><Zap className="h-64 w-64 text-white rotate-12" /></div>
                    <div className="absolute -bottom-24 -left-24 h-64 w-64 bg-indigo-500/20 rounded-full blur-3xl" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="bg-white/10 p-6 rounded-3xl border border-white/20 backdrop-blur-2xl shrink-0 shadow-2xl ring-1 ring-white/10 group cursor-pointer" onClick={() => setIsAnimeModalOpen(true)}>
                             {selectedAnime ? <img src={selectedAnime.image} className="h-60 w-40 object-cover rounded-2xl shadow-inner animate-in fade-in zoom-in duration-700" /> : <div className="h-60 w-40 bg-black/20 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20"><Plus className="h-12 w-12 animate-pulse"/></div>}
                             <div className="mt-4 text-center">
                                <Badge className="bg-indigo-600/50 text-white border-white/20 px-4">تغيير الأنمي</Badge>
                             </div>
                        </div>

                        <div className="flex-1 space-y-8 text-center md:text-right">
                             <div className="space-y-4">
                                <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-l from-white to-white/60">الربــــــط النهائــــــي للأتمتــــــة</h3>
                                <p className="text-indigo-200/60 text-base font-bold max-w-2xl ml-auto leading-relaxed">سيقوم النظام بدمج كافة الأكواد المضافة أعلاه وتوزيعها ذكياً على حلقات الأنمي المختار بناءاً على أسمائها. هذه العملية تضمن مزامنة 100% بين السيرفرات.</p>
                             </div>

                             <div className="flex flex-wrap justify-center md:justify-end gap-4">
                                 <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/30 px-4 py-2 text-sm font-black ring-1 ring-orange-500/20 transition-all hover:bg-orange-600/30">{hgQueue.length} روابط HG جاهزة</Badge>
                                 <Badge className="bg-cyan-600/20 text-cyan-400 border-cyan-500/30 px-4 py-2 text-sm font-black ring-1 ring-cyan-500/20 transition-all hover:bg-cyan-600/30">{doodQueue.length} روابط Dood جاهزة</Badge>
                             </div>

                             <Button 
                                className="w-full md:w-auto px-20 h-20 bg-white text-indigo-900 hover:bg-indigo-50 rounded-2xl shadow-2xl font-black text-2xl gap-6 transition-all hover:scale-[1.02] active:scale-95 border-b-8 border-indigo-200"
                                onClick={handleFinalSync}
                                disabled={loading || !selectedAnime || (hgQueue.length === 0 && doodQueue.length === 0)}
                             >
                                <RefreshCw className={`h-8 w-8 ${loading ? "animate-spin" : ""}`} />
                                مـــــزامـــــنــــــــة الـكُــــــــل الآن
                             </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Anime Selection Dialog */}
            <Dialog open={isAnimeModalOpen} onOpenChange={setIsAnimeModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col rounded-3xl p-0 overflow-hidden shadow-2xl border-indigo-500/20">
                    <DialogHeader className="p-6 bg-gradient-to-r from-indigo-800 to-indigo-600 text-white flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">اختيار الأنمي المستهدف</DialogTitle>
                            <p className="opacity-60 text-xs font-bold">حدد الأنمي الذي تريد ربط الحلقات به حالياً</p>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-white/40" />
                            <Input 
                                placeholder="ابحث عن أنمي..." 
                                className="h-10 pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:ring-1 ring-white/30" 
                                value={animeSearch} 
                                onChange={e => setAnimeSearch(e.target.value)} 
                            />
                        </div>
                    </DialogHeader>
                    <ScrollArea className="flex-1 p-6 bg-muted/10">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredAnimes.map(anime => (
                                <div 
                                    key={anime.id} 
                                    onClick={() => { setSelectedAnime(anime); setIsAnimeModalOpen(false); toast.success(`تم اختيار: ${anime.title}`); }}
                                    className={`relative group cursor-pointer transition-all ${selectedAnime?.id === anime.id ? "ring-4 ring-indigo-600" : "hover:scale-[1.05]"}`}
                                >
                                    <img src={anime.image} className="h-48 w-full object-cover rounded-xl shadow-lg border border-white/10" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-end p-3">
                                        <p className="text-[10px] text-white font-black leading-tight">{anime.title}</p>
                                    </div>
                                    {selectedAnime?.id === anime.id && (
                                        <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}
                                    <p className="mt-2 text-[11px] font-bold text-center truncate px-1 opacity-70 group-hover:opacity-100">{anime.title}</p>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-4 bg-muted/20 border-t flex justify-center">
                        <Button variant="ghost" className="font-bold text-indigo-600" onClick={() => setIsAnimeModalOpen(false)}>إلغاء الإجراء</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Folder Creation & Settings Modals */}
            <Dialog open={!!showFolderDialog} onOpenChange={() => setShowFolderDialog(null)}>
                <DialogContent className="rounded-3xl border-indigo-500/20 shadow-2xl p-8">
                    <DialogHeader><DialogTitle className="text-2xl font-black italic">إنشاء مجلد جديد</DialogTitle></DialogHeader>
                    <div className="py-6 space-y-4">
                        <Input placeholder="أدخل اسم المجلد الجديد هنا..." className="h-14 text-xl rounded-2xl border-indigo-100 shadow-inner" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
                        <p className="text-xs opacity-40 text-center font-bold">سيتم إنشاء المجلد في المسار الرئيسي لـ API الحساب المختار.</p>
                    </div>
                    <DialogFooter><Button className="w-full h-14 rounded-2xl text-xl font-black bg-indigo-600 shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02]" onClick={handleCreateFolder}>تأكيد لإنشاء المجلد</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
                <DialogContent className="rounded-3xl border-indigo-500/20 shadow-2xl p-8">
                     <DialogHeader><DialogTitle className="text-2xl font-black italic">تغيير اسم الملف</DialogTitle></DialogHeader>
                     <div className="py-6 space-y-4">
                        <label className="text-sm font-black opacity-50 block mr-2">الاسم الجديد للملف:</label>
                        <Input value={editItem?.name || ""} className="h-14 rounded-2xl border-indigo-100 shadow-inner text-lg font-bold" onChange={e => setEditItem(p => p ? {...p, name: e.target.value} : null)} />
                     </div>
                     <DialogFooter><Button className="w-full h-14 rounded-2xl text-xl font-black bg-indigo-600 shadow-xl shadow-indigo-600/20" onClick={renameHostingFile}>تحديث اسم الملف</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Account Settings Float Buttons */}
            <div className="fixed bottom-6 left-6 flex gap-4 z-50">
                <Button size="icon" className="h-16 w-16 rounded-2xl bg-orange-600 shadow-2xl shadow-orange-600/40 text-white hover:scale-110 active:scale-95 transition-all border-2 border-white/20" onClick={() => setIsHgModalOpen(true)} title="إعدادات حسابات StreamHG"><Settings className="h-7 w-7" /></Button>
                <Button size="icon" className="h-16 w-16 rounded-2xl bg-cyan-600 shadow-2xl shadow-cyan-600/40 text-white hover:scale-110 active:scale-95 transition-all border-2 border-white/20" onClick={() => setIsDoodModalOpen(true)} title="إعدادات حسابات DoodStream"><Settings className="h-7 w-7" /></Button>
            </div>

            {/* Account Settings Dialogs */}
            <Dialog open={isHgModalOpen} onOpenChange={setIsHgModalOpen}>
                <DialogContent className="rounded-3xl shadow-2xl p-8 border-orange-500/20"><DialogHeader><DialogTitle className="text-3xl font-black italic">حسابات StreamHG</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="grid grid-cols-2 gap-3 p-4 bg-orange-500/5 rounded-3xl border border-orange-200">
                            <Input placeholder="اسم الحساب" value={newAccName} className="rounded-xl h-12" onChange={e=>setNewAccName(e.target.value)}/>
                            <Input placeholder="API Key" value={newAccKey} className="rounded-xl h-12" onChange={e=>setNewAccKey(e.target.value)}/>
                            <Button className="col-span-2 bg-orange-600 text-lg font-black h-12 rounded-xl" onClick={()=>addAccount('hg')}>+ إضافة حساب جديد</Button>
                        </div>
                        <ScrollArea className="h-[250px] border border-orange-100 rounded-3xl p-3 bg-white/50">
                            {hgAccounts.length === 0 ? <p className="text-center py-20 text-muted-foreground italic">لا توجد حسابات مضافة</p> :
                            hgAccounts.map((acc, i)=><div key={i} className="flex justify-between items-center p-4 mb-3 bg-white border border-orange-50 border-r-4 border-r-orange-500 rounded-2xl shadow-sm hover:shadow-md transition-all group"><div><p className="font-black text-orange-950">{acc.name}</p><p className="text-[10px] opacity-40 font-mono tracking-tighter">{acc.key.substring(0,15)}...</p></div><Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl" onClick={()=>{setHgAccounts(hgAccounts.filter((_, idx)=>idx!==i)); toast.success("تم حذف الحساب")}}><Trash2 className="h-5"/></Button></div>)}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isDoodModalOpen} onOpenChange={setIsDoodModalOpen}>
                <DialogContent className="rounded-3xl shadow-2xl p-8 border-cyan-500/20"><DialogHeader><DialogTitle className="text-3xl font-black italic">حسابات DoodStream</DialogTitle></DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="grid grid-cols-2 gap-3 p-4 bg-cyan-500/5 rounded-3xl border border-cyan-200">
                            <Input placeholder="اسم الحساب" value={newAccName} className="rounded-xl h-12" onChange={e=>setNewAccName(e.target.value)}/>
                            <Input placeholder="API Key" value={newAccKey} className="rounded-xl h-12" onChange={e=>setNewAccKey(e.target.value)}/>
                            <Button className="col-span-2 bg-cyan-600 text-lg font-black h-12 rounded-xl" onClick={()=>addAccount('dood')}>+ إضافة حساب جديد</Button>
                        </div>
                        <ScrollArea className="h-[250px] border border-cyan-100 rounded-3xl p-3 bg-white/50">
                            {doodAccounts.length === 0 ? <p className="text-center py-20 text-muted-foreground italic">لا توجد حسابات مضافة</p> :
                            doodAccounts.map((acc, i)=><div key={i} className="flex justify-between items-center p-4 mb-3 bg-white border border-cyan-50 border-r-4 border-r-cyan-500 rounded-2xl shadow-sm hover:shadow-md transition-all group"><div><p className="font-black text-cyan-950">{acc.name}</p><p className="text-[10px] opacity-40 font-mono tracking-tighter">{acc.key.substring(0,15)}...</p></div><Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 h-10 w-10 rounded-xl" onClick={()=>{setDoodAccounts(doodAccounts.filter((_, idx)=>idx!==i)); toast.success("تم حذف الحساب")}}><Trash2 className="h-5"/></Button></div>)}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
