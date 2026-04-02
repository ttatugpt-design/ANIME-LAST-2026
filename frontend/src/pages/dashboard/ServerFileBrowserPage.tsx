import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
    ArrowLeft, Link as LinkIcon, Search, Server,
    Pencil, Trash2, Info, Copy, RefreshCw, Database, Film, Check, Layers,
} from "lucide-react";

interface DoodFile {
    file_code: string;
    title: string;
    length: number;
    views: number;
    created_at?: string;
    single_img?: string;
    fld_id?: string;
    canLink?: boolean;
    linkedEpisodeId?: number | null;
}

interface DoodFolder {
    fld_id: string;
    name: string;
    fld_id2?: string;
}

export default function ServerFileBrowserPage() {
    const { lang, id: animeId } = useParams<{ lang: string; id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isAr = lang === 'ar';

    const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
    const [selectedFolderId, setSelectedFolderId] = useState<string>("");
    const [selectedServerId, setSelectedServerId] = useState<number | "">("");
    const [fileSearch, setFileSearch] = useState("");
    const [episodeSearch, setEpisodeSearch] = useState("");

    // Link state: episodeId -> fileCode
    const [links, setLinks] = useState<Record<number, string>>({});
    const [isEmbeddingAll, setIsEmbeddingAll] = useState(false);
    const [activeEpisodeId, setActiveEpisodeId] = useState<number | null>(null);

    // Modals
    const [infoModal, setInfoModal] = useState<{ file: DoodFile; embedLink: string; downloadLink: string } | null>(null);
    const [renameModal, setRenameModal] = useState<{ file: DoodFile; title: string } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<DoodFile | null>(null);

    // Fetch anime info
    const { data: anime, isLoading: isAnimeLoading } = useQuery({
        queryKey: ["anime", animeId],
        queryFn: async () => (await api.get(`/animes/${animeId}`)).data,
        enabled: !!animeId,
    });

    // Fetch episodes
    const { data: episodesRes } = useQuery({
        queryKey: ["episodes-browser", animeId],
        queryFn: async () => (await api.get(`/episodes`, { params: { anime_id: animeId } })).data,
        enabled: !!animeId,
    });
    const episodes: any[] = Array.isArray(episodesRes) ? episodesRes : (episodesRes?.data || []);

    // Fetch embed accounts
    const { data: accountsRes } = useQuery({
        queryKey: ["embed-accounts"],
        queryFn: async () => (await api.get(`/embed-accounts`)).data,
    });
    const accounts: any[] = Array.isArray(accountsRes) ? accountsRes : [];

    // Fetch servers
    const { data: serversRes } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => (await api.get(`/servers`)).data,
    });
    const servers: any[] = Array.isArray(serversRes) ? serversRes : (serversRes?.data || []);

    // Fetch folders when account is selected
    const { data: foldersRes, isLoading: isFoldersLoading } = useQuery({
        queryKey: ["dood-folders", selectedAccountId],
        queryFn: async () => (await api.get(`/doodstream/folders?account_id=${selectedAccountId}`)).data,
        enabled: !!selectedAccountId,
    });
    const folders: DoodFolder[] = useMemo(() => {
        if (!foldersRes?.result?.folders) return [];
        return foldersRes.result.folders as DoodFolder[];
    }, [foldersRes]);

    // Auto-select the folder matching the current anime title when folders load
    useEffect(() => {
        if (!anime || !folders.length || selectedFolderId) return;
        const animeName = (anime.title_en || anime.title || '').toLowerCase().trim();
        const animeNameAr = (anime.title || '').toLowerCase().trim();
        const match = folders.find((f) => {
            const fn = f.name.toLowerCase().trim();
            return fn === animeName ||
                   fn === animeNameAr ||
                   animeName.startsWith(fn) ||
                   fn.startsWith(animeName.split(' ')[0]) ||
                   animeNameAr.startsWith(fn) ||
                   fn.startsWith(animeNameAr.split(' ')[0]);
        });
        if (match) {
            setSelectedFolderId(match.fld_id);
        }
    }, [folders, anime]);

    const { data: filesRes, isLoading: isFilesLoading, refetch: refetchFiles } = useQuery({
        queryKey: ["dood-files", selectedAccountId, selectedFolderId],
        queryFn: async () => {
            const params = new URLSearchParams({ account_id: String(selectedAccountId), fld_id: selectedFolderId });
            return (await api.get(`/doodstream/files?${params.toString()}`)).data;
        },
        enabled: !!selectedAccountId && !!selectedFolderId,  // Only load when folder is chosen
    });
    const doodFiles: DoodFile[] = useMemo(() => {
        if (!filesRes?.result?.files) return [];
        return filesRes.result.files;
    }, [filesRes]);

    // Auto-link logic: match number in file title to episode_number
    const autoLink = () => {
        const newLinks: Record<number, string> = {};
        let count = 0;
        doodFiles.forEach((file) => {
            const match = file.title.match(/\d+/);
            if (!match) return;
            const num = parseInt(match[0]);
            const ep = episodes.find((e) => e.episode_number === num);
            if (ep) {
                newLinks[ep.id] = file.file_code;
                count++;
            }
        });
        setLinks(newLinks);
        toast.success(isAr ? `تم ربط ${count} ملف تلقائياً` : `Auto-linked ${count} files`);
    };

    // Embed All: sequentially embed every linked episode
    const embedAll = async () => {
        const entries = Object.entries(links);
        if (!entries.length) {
            toast.info(isAr ? 'لا توجد روابط للتضمين' : 'No links to embed');
            return;
        }
        if (!selectedServerId) {
            toast.error(isAr ? 'اختر اسم السيرفر أولاً' : 'Select a server name first');
            return;
        }
        setIsEmbeddingAll(true);
        let success = 0;
        let failed = 0;
        for (const [epIdStr, fileCode] of entries) {
            try {
                await includeMutation.mutateAsync({ episodeId: Number(epIdStr), fileCode });
                success++;
            } catch {
                failed++;
            }
        }
        setIsEmbeddingAll(false);
        if (failed === 0) {
            toast.success(isAr ? `✅ تم تضمين ${success} حلقة بنجاح` : `✅ Embedded ${success} episodes successfully`);
        } else {
            toast.warning(isAr ? `تم تضمين ${success} وفشل ${failed}` : `Embedded ${success}, failed ${failed}`);
        }
    };

    // Include (embed) mutation
    const includeMutation = useMutation({
        mutationFn: async ({ episodeId, fileCode }: { episodeId: number; fileCode: string }) => {
            if (!selectedServerId) throw new Error(isAr ? "اختر اسم السيرفر أولاً" : "Select a server name first");
            const targetServer = servers.find((s) => s.id === selectedServerId);
            const embedLink = `https://myvidplay.com/e/${fileCode}`;
            const epRes = await api.get(`/episodes/${episodeId}`);
            const ep = epRes.data;
            const newServer = {
                episode_id: episodeId,
                language: "ar",
                name: targetServer?.name_en || targetServer?.name || "Doodstream",
                url: embedLink,
                type: "embed",
            };
            await api.put(`/episodes/${episodeId}`, {
                ...ep,
                servers: [...(ep.servers || []), newServer],
                is_published: true,
            });
            return { episodeId, embedLink };
        },
        onSuccess: ({ episodeId, embedLink }) => {
            queryClient.invalidateQueries({ queryKey: ["episodes-browser", animeId] });
            toast.success(isAr ? `✅ تم تضمين الرابط في الحلقة` : `✅ Embed link added to episode`);
            // Remove this link after success
            setLinks((prev) => {
                const next = { ...prev };
                delete next[episodeId];
                return next;
            });
        },
        onError: (err: any) => toast.error(err.message),
    });

    // Rename mutation
    const renameMutation = useMutation({
        mutationFn: async ({ fileCode, title }: { fileCode: string; title: string }) => {
            const res = await api.post(`/doodstream/file/rename`, {
                account_id: selectedAccountId,
                file_code: fileCode,
                title,
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dood-files", selectedAccountId, selectedFolderId] });
            toast.success(isAr ? "تم إعادة التسمية" : "File renamed");
            setRenameModal(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (fileCode: string) => {
            await api.delete(`/doodstream/file/delete?account_id=${selectedAccountId}&file_code=${fileCode}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dood-files", selectedAccountId, selectedFolderId] });
            toast.success(isAr ? "تم حذف الملف" : "File deleted");
            setDeleteConfirm(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const openInfo = async (file: DoodFile) => {
        const embedLink = `https://myvidplay.com/e/${file.file_code}`;
        const downloadLink = `https://dood.la/d/${file.file_code}`;
        setInfoModal({ file, embedLink, downloadLink });
    };

    const filteredFiles = doodFiles.filter((f) =>
        f.title.toLowerCase().includes(fileSearch.toLowerCase())
    );
    const filteredEpisodes = episodes.filter((ep: any) =>
        String(ep.episode_number).includes(episodeSearch) ||
        (ep.title && ep.title.toLowerCase().includes(episodeSearch.toLowerCase()))
    ).sort((a: any, b: any) => a.episode_number - b.episode_number);

    const formatDuration = (secs: number) => {
        if (!secs) return "--";
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    if (isAnimeLoading) return <PageLoader />;

    return (
        <div className="flex flex-col h-full gap-0">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/${lang}/dashboard/server-files`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Database className="h-5 w-5 text-primary" />
                            {isAr ? 'ملفات السيرفر' : 'Server Files'} —{" "}
                            <span className="text-primary">{isAr ? anime?.title : (anime?.title_en || anime?.title)}</span>
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {isAr ? 'استعرض ملفات Doodstream واربطها بالحلقات' : 'Browse Doodstream files and link them to episodes'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Account Selector */}
                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none min-w-[160px]"
                        value={selectedAccountId}
                        onChange={(e) => { setSelectedAccountId(Number(e.target.value)); setSelectedFolderId(""); }}
                    >
                        <option value="">{isAr ? '-- اختر الحساب --' : '-- Select Account --'}</option>
                        {accounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name || acc.platform}</option>
                        ))}
                    </select>

                    {/* Folder Selector */}
                    {selectedAccountId && (
                        <div className="flex items-center gap-1.5">
                            <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none min-w-[180px]"
                                value={selectedFolderId}
                                onChange={(e) => setSelectedFolderId(e.target.value)}
                                disabled={isFoldersLoading}
                            >
                                <option value="">{isFoldersLoading ? '...' : (isAr ? '-- اختر مجلد الأنمي --' : '-- Select Anime Folder --')}</option>
                                {folders.map((f) => (
                                    <option key={f.fld_id} value={f.fld_id}>{f.name}</option>
                                ))}
                            </select>
                            {isFoldersLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary/50" />}
                        </div>
                    )}

                    {/* Server Selector */}
                    <select
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none min-w-[140px]"
                        value={selectedServerId}
                        onChange={(e) => setSelectedServerId(Number(e.target.value))}
                    >
                        <option value="">{isAr ? '-- اختر السيرفر --' : '-- Select Server --'}</option>
                        {servers.map((s: any) => (
                            <option key={s.id} value={s.id}>{s.name_en || s.name}</option>
                        ))}
                    </select>

                    {selectedAccountId && (
                        <>
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={autoLink} disabled={!doodFiles.length}>
                                <LinkIcon className="h-3.5 w-3.5" />
                                {isAr ? 'ربط تلقائي' : 'Auto Link'}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => refetchFiles()}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 gap-0 overflow-hidden" style={{ height: 'calc(100vh - 5rem)' }}>
                {/* LEFT: Episodes */}
                <div className="w-72 shrink-0 border-r flex flex-col bg-background">
                    <div className="p-3 border-b space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Film className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">
                                    {isAr ? 'حلقات الأنمي' : 'Episodes'}
                                </span>
                                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{episodes.length}</Badge>
                            </div>

                            <Button
                                size="sm"
                                variant={Object.keys(links).length > 0 ? "default" : "outline"}
                                disabled={isEmbeddingAll || !selectedServerId || Object.keys(links).length === 0}
                                onClick={embedAll}
                                className="h-7 px-2 text-[11px] gap-1.5 shadow-sm"
                            >
                                {isEmbeddingAll ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Layers className="h-3 w-3" />
                                )}
                                {isAr ? 'تضمين الكل' : 'Embed All'}
                                {Object.keys(links).length > 0 && (
                                    <span className="bg-primary-foreground/20 px-1 rounded text-[9px] min-w-[14px]">
                                        {Object.keys(links).length}
                                    </span>
                                )}
                            </Button>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input className="pl-8 h-8 text-xs" placeholder={isAr ? 'بحث...' : 'Search...'} value={episodeSearch} onChange={(e) => setEpisodeSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredEpisodes.map((ep: any) => {
                            const linkedFileCode = links[ep.id];
                            const linkedFile = linkedFileCode ? doodFiles.find((f) => f.file_code === linkedFileCode) : null;
                            const alreadyHasServer = ep.servers?.length > 0;
                            return (
                                <div
                                    key={ep.id}
                                    onClick={() => setActiveEpisodeId(activeEpisodeId === ep.id ? null : ep.id)}
                                    className={cn(
                                        "rounded-lg border p-2.5 text-xs transition-all cursor-pointer group",
                                        linkedFileCode ? "border-primary/50 bg-primary/5" : "border-border bg-card",
                                        alreadyHasServer && !linkedFileCode ? "border-green-500/30 bg-green-500/5" : "",
                                        activeEpisodeId === ep.id ? "ring-2 ring-primary border-primary bg-primary/10 shadow-md" : "hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <p className="font-semibold truncate">
                                                    {isAr ? `الحلقة ${ep.episode_number}` : `Episode ${ep.episode_number}`}
                                                </p>
                                                {activeEpisodeId === ep.id && (
                                                    <Badge className="text-[8px] h-3.5 px-1 bg-primary text-primary-foreground animate-pulse">
                                                        {isAr ? 'انتظار الربط...' : 'Linking...'}
                                                    </Badge>
                                                )}
                                            </div>
                                            {ep.title && (
                                                <p className="text-muted-foreground truncate text-[10px] mt-0.5">{ep.title}</p>
                                            )}
                                        </div>
                                        {alreadyHasServer && !linkedFileCode && (
                                            <Badge className="text-[9px] h-4 bg-green-500/15 text-green-600 border-green-500/30 shrink-0">
                                                {isAr ? 'لديه رابط' : 'Has Link'}
                                            </Badge>
                                        )}
                                    </div>

                                    {linkedFile && (
                                        <div className="mt-2 space-y-1.5">
                                            <p className="text-[10px] text-primary font-medium truncate flex items-center gap-1">
                                                <LinkIcon className="h-3 w-3 shrink-0" />
                                                {linkedFile.title}
                                            </p>
                                            <div className="flex gap-1">
                                                <Button
                                                    size="sm"
                                                    className="h-6 text-[10px] flex-1 gap-1"
                                                    disabled={includeMutation.isPending || !selectedServerId}
                                                    onClick={() => includeMutation.mutate({ episodeId: ep.id, fileCode: linkedFileCode })}
                                                >
                                                    <Check className="h-3 w-3" />
                                                    {isAr ? 'تضمين' : 'Include'}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-[10px] px-2"
                                                    onClick={() => setLinks((prev) => { const n = { ...prev }; delete n[ep.id]; return n; })}
                                                >
                                                    ✕
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredEpisodes.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                                {isAr ? 'لا توجد حلقات' : 'No episodes'}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Doodstream Files Table */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {!selectedAccountId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <Server className="h-16 w-16 opacity-20" />
                            <p className="text-sm font-medium">{isAr ? 'اختر حساب Doodstream لعرض الملفات' : 'Select a Doodstream account to view files'}</p>
                        </div>
                    ) : !selectedFolderId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <Database className="h-14 w-14 opacity-15" />
                            <div className="text-center">
                                <p className="text-sm font-medium">{isAr ? 'جاري البحث عن مجلد الأنمي...' : 'Looking for anime folder...'}</p>
                                <p className="text-xs mt-1 text-muted-foreground/70">
                                    {isAr
                                        ? 'إذا لم يتم العثور على المجلد تلقائياً، اختره من القائمة أعلاه'
                                        : 'If not auto-detected, select the folder from the dropdown above'}
                                </p>
                            </div>
                            {isFoldersLoading && <RefreshCw className="h-5 w-5 animate-spin text-primary/50" />}
                        </div>
                    ) : (
                        <>
                            {/* Table Header */}
                            <div className="px-4 py-3 border-b flex items-center gap-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Database className="h-4 w-4 text-primary" />
                                    {isAr ? 'ملفات Doodstream' : 'Doodstream Files'}
                                    <Badge variant="outline">{filteredFiles.length}</Badge>
                                </CardTitle>
                                <div className="ml-auto flex items-center gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input className="pl-8 h-8 text-xs w-56" placeholder={isAr ? 'بحث عن ملف...' : 'Search files...'} value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {isFilesLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-muted/60 backdrop-blur border-b">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-8">#</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{isAr ? 'اسم الملف' : 'File Name'}</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-24">{isAr ? 'المدة' : 'Duration'}</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-20">{isAr ? 'مشاهدات' : 'Views'}</th>
                                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground w-28">{isAr ? 'الربط' : 'Linked To'}</th>
                                                <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground w-32">{isAr ? 'الإجراءات' : 'Actions'}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {filteredFiles.map((file, idx) => {
                                                const linkedEpId = Object.entries(links).find(([, fc]) => fc === file.file_code)?.[0];
                                                const linkedEp = linkedEpId ? episodes.find((e: any) => e.id === Number(linkedEpId)) : null;
                                                return (
                                                    <tr key={file.file_code} className={cn("hover:bg-muted/30 transition-colors", linkedEp && "bg-primary/5")}>
                                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2.5">
                                                                {/* Video Thumbnail placeholder */}
                                                                <div className="w-14 h-9 rounded bg-muted border border-border/50 flex items-center justify-center shrink-0 overflow-hidden">
                                                                    {file.single_img ? (
                                                                        <img src={file.single_img} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Film className="h-4 w-4 text-muted-foreground/40" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium truncate max-w-xs text-sm" title={file.title}>{file.title}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-mono">{file.file_code}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDuration(file.length)}</td>
                                                        <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{(file.views || 0).toLocaleString()}</td>
                                                        <td className="px-4 py-2.5">
                                                            {linkedEp ? (
                                                                <Badge className="text-[10px] h-5 bg-primary/15 text-primary border-primary/30">
                                                                    {isAr ? `ح ${linkedEp.episode_number}` : `Ep ${linkedEp.episode_number}`}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                         <td className="px-4 py-2.5">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {activeEpisodeId && (
                                                                    <Button
                                                                        size="icon"
                                                                        variant="default"
                                                                        className="h-7 w-7 bg-green-600 hover:bg-green-700 text-white shadow-sm animate-in zoom-in-50 duration-200"
                                                                        title={isAr ? 'ربط بهذه الحلقة' : 'Link to this episode'}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setLinks(prev => ({ ...prev, [activeEpisodeId]: file.file_code }));
                                                                            setActiveEpisodeId(null);
                                                                            toast.success(isAr ? 'تم الربط يدوياً' : 'Linked manually');
                                                                        }}
                                                                    >
                                                                        <LinkIcon className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                )}
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" title={isAr ? 'معلومات' : 'Info'} onClick={() => openInfo(file)}>
                                                                    <Info className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" title={isAr ? 'إعادة تسمية' : 'Rename'} onClick={() => setRenameModal({ file, title: file.title })}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" title={isAr ? 'حذف' : 'Delete'} onClick={() => setDeleteConfirm(file)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {filteredFiles.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                                            <Database className="h-12 w-12 opacity-20 mb-3" />
                                            <p className="text-sm">{isAr ? 'لا توجد ملفات' : 'No files found'}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Info Modal */}
            <Dialog open={!!infoModal} onOpenChange={() => setInfoModal(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" /> {isAr ? 'معلومات الملف' : 'File Info'}</DialogTitle>
                    </DialogHeader>
                    {infoModal && (
                        <div className="space-y-4">
                            <p className="font-semibold text-sm">{infoModal.file.title}</p>
                            <div className="space-y-3">
                                <div className="rounded-lg border p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">{isAr ? 'رابط التضمين (Embed)' : 'Embed Link'}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{infoModal.embedLink}</code>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText(infoModal.embedLink); toast.success(isAr ? 'تم النسخ' : 'Copied!'); }}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="rounded-lg border p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">{isAr ? 'رابط التحميل (Download)' : 'Download Link'}</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">{infoModal.downloadLink}</code>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => { navigator.clipboard.writeText(infoModal.downloadLink); toast.success(isAr ? 'تم النسخ' : 'Copied!'); }}>
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-2">
                                    <span>{isAr ? 'الكود:' : 'Code:'} <code className="bg-muted px-1 rounded">{infoModal.file.file_code}</code></span>
                                    <span>{isAr ? 'المدة:' : 'Duration:'} {formatDuration(infoModal.file.length)}</span>
                                    <span>{isAr ? 'المشاهدات:' : 'Views:'} {(infoModal.file.views || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rename Modal */}
            <Dialog open={!!renameModal} onOpenChange={() => setRenameModal(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5 text-amber-500" /> {isAr ? 'إعادة تسمية الملف' : 'Rename File'}</DialogTitle>
                    </DialogHeader>
                    {renameModal && (
                        <div className="space-y-4">
                            <Input
                                value={renameModal.title}
                                onChange={(e) => setRenameModal({ ...renameModal, title: e.target.value })}
                                placeholder={isAr ? 'الاسم الجديد...' : 'New name...'}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') renameMutation.mutate({ fileCode: renameModal.file.file_code, title: renameModal.title });
                                }}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRenameModal(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                        <Button disabled={renameMutation.isPending} onClick={() => renameModal && renameMutation.mutate({ fileCode: renameModal.file.file_code, title: renameModal.title })}>
                            {renameMutation.isPending ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm Modal */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
                        <DialogDescription>
                            {isAr ? `هل أنت متأكد من حذف "${deleteConfirm?.title}"؟ لا يمكن التراجع عن هذا الإجراء.` : `Are you sure you want to delete "${deleteConfirm?.title}"? This cannot be undone.`}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                        <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.file_code)}>
                            {deleteMutation.isPending ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'حذف' : 'Delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
